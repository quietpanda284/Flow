
import React, { useRef, useEffect, useState } from 'react';
import { CATEGORY_COLORS } from '../constants';
import { TimeBlock, CategoryType, Category } from '../types';
import { X, Brain, Coffee, Briefcase, Trash2, Edit2, Plus, ChevronDown, Check, Folder, GripHorizontal } from 'lucide-react';

interface VerticalTimelineProps {
  plannedBlocks: TimeBlock[];
  actualBlocks: TimeBlock[];
  categories?: Category[]; // List of available categories for selection
  onAddBlock: (block: TimeBlock) => void;
  onDeleteBlock?: (blockId: string) => void;
  onUpdateBlock?: (block: TimeBlock) => void;
  isInteractive?: boolean;
  viewMode?: 'plan' | 'review'; // 'plan' shows planned as solid, 'review' shows planned as ghost vs actual
}

// Config
const startHour = 7; 
const endHour = 24; 
const hourHeight = 80; 
const gridOffset = 20; // Top padding to prevent label clipping
// Add some bottom padding too
const totalHeight = (endHour - startHour) * hourHeight + gridOffset + 50;

// Helper to convert Y pixels to minutes from start of grid (0 = 7:00 AM)
const pixelsToMinutes = (px: number, hourHeight: number) => {
  return ((px - gridOffset) / hourHeight) * 60;
};

// Helper to convert minutes to HH:MM string (relative to startHour)
const minutesToTimeStr = (minutesFromStart: number, startHour: number) => {
  let totalMinutes = startHour * 60 + minutesFromStart;
  // Clamp to 24h
  totalMinutes = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
  
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Helper to parse HH:MM to minutes relative to startHour (e.g. 7:00 = 0)
const timeStrToMinutes = (timeStr: string, startHour: number) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60 + m) - (startHour * 60);
};

// Helper to snap minutes to nearest 15
const snapToGrid = (minutes: number) => {
  return Math.round(minutes / 15) * 15;
};

export const VerticalTimeline: React.FC<VerticalTimelineProps> = ({ 
  plannedBlocks, 
  actualBlocks, 
  categories = [], // Default to empty if not provided
  onAddBlock,
  onDeleteBlock,
  onUpdateBlock,
  isInteractive = false,
  viewMode = 'review'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [interactionMode, setInteractionMode] = useState<'none' | 'create' | 'move' | 'resize'>('none');
  
  // Creation State
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragEndY, setDragEndY] = useState<number | null>(null);

  // Move/Resize State
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [dragOffsetMinutes, setDragOffsetMinutes] = useState(0); // For moving: offset from block top
  
  // Temporary state for the block being moved/resized (live preview)
  const [temporaryBlockState, setTemporaryBlockState] = useState<{ startTime: string; duration: number } | null>(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockId: string } | null>(null);

  // Popover State
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [draftBlock, setDraftBlock] = useState<{ start: string; end: string; duration: number } | null>(null);
  
  // Form State
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockTitle, setBlockTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  
  // NEW: Mode for creating blocks (Work vs Break)
  const [isBreakMode, setIsBreakMode] = useState(false);

  // Current Time State
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (containerRef.current) {
        // Scroll to around 8:00 or 9:00 initially (adjusting for offset)
        containerRef.current.scrollTop = hourHeight * 1.5; 
    }
  }, []);

  // Close context menu on global click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // --- Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
    // 1. Check if we are interacting with existing blocks or context menus
    if (contextMenu) return;
    if (!isInteractive) return;
    if ((e.target as HTMLElement).closest('.create-popover')) return;

    // If we clicked a block handle, that logic is handled in handleBlockMouseDown/Resize
    // We only proceed here if we are clicking the empty grid
    if ((e.target as HTMLElement).closest('.time-block')) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scrollTop = containerRef.current?.scrollTop || 0;
    const clientY = e.clientY - rect.top; 
    const absoluteY = clientY + scrollTop;

    setInteractionMode('create');
    setDragStartY(absoluteY);
    setDragEndY(absoluteY);
    
    setIsPopoverOpen(false); // Close popover if open
    setEditingBlockId(null); 
    setBlockTitle('');
    setSelectedCategoryId('');
    setIsCategoryDropdownOpen(false);
  };

  const handleBlockMouseDown = (e: React.MouseEvent, block: TimeBlock) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (!isInteractive || viewMode !== 'plan') return;

      const rect = containerRef.current!.getBoundingClientRect();
      const scrollTop = containerRef.current!.scrollTop;
      const clickY = e.clientY - rect.top + scrollTop;
      
      const clickMinutes = pixelsToMinutes(clickY, hourHeight);
      const blockStartMinutes = timeStrToMinutes(block.startTime, startHour);

      setInteractionMode('move');
      setActiveBlockId(block.id);
      setDragOffsetMinutes(clickMinutes - blockStartMinutes);
      setTemporaryBlockState({ startTime: block.startTime, duration: block.durationMinutes });
      setIsPopoverOpen(false);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, block: TimeBlock) => {
      e.stopPropagation();
      e.preventDefault();

      if (!isInteractive || viewMode !== 'plan') return;

      setInteractionMode('resize');
      setActiveBlockId(block.id);
      setTemporaryBlockState({ startTime: block.startTime, duration: block.durationMinutes });
      setIsPopoverOpen(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isInteractive || interactionMode === 'none' || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = containerRef.current.scrollTop;
    const clientY = e.clientY - rect.top;
    let absoluteY = clientY + scrollTop;

    // Constrain to grid bounds
    if (absoluteY < 0) absoluteY = 0;
    if (absoluteY > totalHeight) absoluteY = totalHeight;

    if (interactionMode === 'create') {
        if (dragStartY !== null) setDragEndY(absoluteY);
    } 
    else if (interactionMode === 'move' && temporaryBlockState) {
        const mouseMinutes = pixelsToMinutes(absoluteY, hourHeight);
        let newStartMinutes = snapToGrid(mouseMinutes - dragOffsetMinutes);
        
        // Boundaries
        if (newStartMinutes < 0) newStartMinutes = 0;
        // Don't let block go past end of day
        const maxStart = (endHour - startHour) * 60 - temporaryBlockState.duration;
        if (newStartMinutes > maxStart) newStartMinutes = maxStart;

        const newStartTime = minutesToTimeStr(newStartMinutes, startHour);
        setTemporaryBlockState(prev => ({ ...prev!, startTime: newStartTime }));
    }
    else if (interactionMode === 'resize' && temporaryBlockState) {
        const mouseMinutes = pixelsToMinutes(absoluteY, hourHeight);
        const startMinutes = timeStrToMinutes(temporaryBlockState.startTime, startHour);
        
        let newEndMinutes = snapToGrid(mouseMinutes);
        let newDuration = newEndMinutes - startMinutes;

        // Minimum duration 15m
        if (newDuration < 15) newDuration = 15;
        
        setTemporaryBlockState(prev => ({ ...prev!, duration: newDuration }));
    }
  };

  const handleMouseUp = () => {
    if (!isInteractive || interactionMode === 'none') return;

    // --- CREATE MODE ---
    if (interactionMode === 'create' && dragStartY !== null && dragEndY !== null) {
        // Calculate Start and End Times
        let startPx = Math.min(dragStartY, dragEndY);
        let endPx = Math.max(dragStartY, dragEndY);

        // Filter out accidental clicks (must drag at least 10px)
        if (endPx - startPx < 10) {
            setInteractionMode('none');
            setDragStartY(null);
            setDragEndY(null);
            return;
        }

        // Snap to 15m
        let startMins = snapToGrid(pixelsToMinutes(startPx, hourHeight));
        let endMins = snapToGrid(pixelsToMinutes(endPx, hourHeight));
        
        if (startMins < 0) startMins = 0;
        if (endMins <= startMins) endMins = startMins + 15;

        const startTime = minutesToTimeStr(startMins, startHour);
        const endTime = minutesToTimeStr(endMins, startHour);
        const duration = endMins - startMins;

        // Prepare Draft
        setDraftBlock({ start: startTime, end: endTime, duration });
        setEditingBlockId(null);
        setBlockTitle('');
        setSelectedCategoryId('');
        setIsBreakMode(false); 
        
        setPopoverPosition({ 
            top: (startMins / 60) * hourHeight + gridOffset, 
            left: 200 
        });
        
        setIsPopoverOpen(true);
    } 
    
    // --- MOVE / RESIZE MODE ---
    else if ((interactionMode === 'move' || interactionMode === 'resize') && activeBlockId && temporaryBlockState && onUpdateBlock) {
        // Commit changes
        const originalBlock = plannedBlocks.find(b => b.id === activeBlockId);
        if (originalBlock) {
            const startMins = timeStrToMinutes(temporaryBlockState.startTime, startHour);
            const endMins = startMins + temporaryBlockState.duration;
            const endTimeStr = minutesToTimeStr(endMins, startHour);

            onUpdateBlock({
                ...originalBlock,
                startTime: temporaryBlockState.startTime,
                endTime: endTimeStr,
                durationMinutes: temporaryBlockState.duration
            });
        }
    }

    // Reset State
    setInteractionMode('none');
    setDragStartY(null);
    setDragEndY(null);
    setActiveBlockId(null);
    setTemporaryBlockState(null);
  };

  const handleBlockContextMenu = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isInteractive || viewMode !== 'plan') return;
    
    setContextMenu({
        x: e.clientX,
        y: e.clientY,
        blockId
    });
  };

  const handleDeleteClick = () => {
    if (contextMenu && onDeleteBlock) {
        onDeleteBlock(contextMenu.blockId);
        setContextMenu(null);
    }
  };

  const handleEditClick = () => {
    if (contextMenu) {
        const block = plannedBlocks.find(b => b.id === contextMenu.blockId);
        if (block) {
            setEditingBlockId(block.id);
            setBlockTitle(block.title);
            setSelectedCategoryId(block.categoryId);
            
            // Determine mode
            const cat = categories.find(c => c.id === block.categoryId);
            const isBreak = cat ? cat.type === 'break' : block.type === 'break';
            setIsBreakMode(isBreak);

            setDraftBlock({
                start: block.startTime,
                end: block.endTime,
                duration: block.durationMinutes
            });
            
            const startMins = timeStrToMinutes(block.startTime, startHour);
            
            setPopoverPosition({ 
                top: (startMins / 60) * hourHeight + gridOffset, 
                left: 200 
            });
            setIsPopoverOpen(true);
        }
        setContextMenu(null);
    }
  };

  const handleManualAdd = () => {
    // Default to 9:00 - 10:00 (1 hour block)
    const defaultStartHour = 9;
    const startMins = (defaultStartHour - startHour) * 60;
    
    setDraftBlock({
        start: '09:00',
        end: '10:00',
        duration: 60
    });
    setEditingBlockId(null);
    setBlockTitle('');
    setSelectedCategoryId('');
    setIsBreakMode(false);
    
    setPopoverPosition({
        top: (startMins / 60) * hourHeight + gridOffset,
        left: 0 
    });
    setIsPopoverOpen(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBlockTitle(e.target.value);
  };

  // Toggle handlers
  const switchToCategory = () => {
    setIsBreakMode(false);
    setSelectedCategoryId(''); 
  };

  const switchToBreak = () => {
    setIsBreakMode(true);
    // Automatically select the 'break' category (assuming it exists, e.g. from seed)
    const breakCat = categories.find(c => c.type === 'break');
    if (breakCat) {
        setSelectedCategoryId(breakCat.id);
    }
  };

  const saveBlock = () => {
    if (!draftBlock || !blockTitle.trim() || !selectedCategoryId) return;

    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    const blockType = selectedCategory ? selectedCategory.type : 'focus';

    if (editingBlockId && onUpdateBlock) {
        // Update existing
        const updatedBlock: TimeBlock = {
            id: editingBlockId,
            title: blockTitle,
            app: 'Scheduled',
            startTime: draftBlock.start,
            endTime: draftBlock.end,
            durationMinutes: draftBlock.duration,
            type: blockType,
            categoryId: selectedCategoryId, 
        };
        onUpdateBlock(updatedBlock);
    } else {
        // Create new
        const newBlock: TimeBlock = {
            id: `temp-${Date.now()}`,
            title: blockTitle,
            app: 'Scheduled',
            startTime: draftBlock.start,
            endTime: draftBlock.end,
            durationMinutes: draftBlock.duration,
            type: blockType,
            categoryId: selectedCategoryId, 
        };
        onAddBlock(newBlock);
    }

    setIsPopoverOpen(false);
    setBlockTitle('');
    setSelectedCategoryId('');
    setEditingBlockId(null);
  };

  // --- Render Helpers ---

  const getPosition = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = (h - startHour) * 60 + m;
    return (totalMinutes / 60) * hourHeight + gridOffset;
  };

  const getHeight = (minutes: number) => {
    return (minutes / 60) * hourHeight;
  };

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  // Render Drag Ghost for Creation
  const renderCreationGhost = () => {
    if (interactionMode !== 'create' || dragStartY === null || dragEndY === null) return null;

    let startPx = Math.min(dragStartY, dragEndY);
    let endPx = Math.max(dragStartY, dragEndY);
    
    // Don't render ghost if drag is too small
    if (endPx - startPx < 10) return null;

    // Snap visuals for better feedback
    let startMins = snapToGrid(pixelsToMinutes(startPx, hourHeight));
    let endMins = snapToGrid(pixelsToMinutes(endPx, hourHeight));
    
    if (startMins < 0) startMins = 0;
    if (endMins <= startMins) endMins = startMins + 15;

    const top = (startMins / 60) * hourHeight + gridOffset;
    const height = ((endMins - startMins) / 60) * hourHeight;
    const startTime = minutesToTimeStr(startMins, startHour);
    const endTime = minutesToTimeStr(endMins, startHour);

    return (
        <div 
            className="absolute left-20 right-4 rounded-lg bg-accent-focus/10 border-2 border-dashed border-accent-focus/50 z-30 pointer-events-none flex items-center justify-center"
            style={{ top: `${top}px`, height: `${height}px` }}
        >
            <div className="bg-background/80 backdrop-blur px-2 py-1 rounded text-xs text-accent-focus font-mono">
                {startTime} - {endTime}
            </div>
        </div>
    );
  };

  // Get selected category object for display
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  // Filter only NON-break categories for the dropdown in "Category" mode
  const workCategories = categories.filter(c => c.type !== 'break');

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col h-full relative overflow-hidden">
      <div className="flex justify-between items-center p-6 border-b border-border bg-card z-20 shadow-sm">
        <h2 className="text-lg font-semibold text-white">Timeline <span className="text-gray-500 font-normal text-sm ml-2">{viewMode === 'plan' ? 'Planning Mode' : 'Plan vs Actual'}</span></h2>
        
        {viewMode === 'plan' && (
             <button 
                onClick={handleManualAdd}
                className="md:hidden p-2 bg-accent-focus text-black rounded-lg hover:bg-accent-focus/80 transition-colors shadow-lg"
            >
                <Plus size={18} />
            </button>
        )}

        {viewMode === 'review' && (
          <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border-2 border-dashed border-gray-500 bg-gray-500/20"></div>
                  <span className="text-gray-400">Planned</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-accent-focus"></div>
                  <span className="text-white">Actual</span>
              </div>
          </div>
        )}
      </div>

      <div 
        ref={containerRef}
        className={`relative flex-1 overflow-y-auto custom-scrollbar bg-[#0f1117] ${isInteractive ? 'cursor-default' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
            if (interactionMode !== 'none') {
                // Cancel drag if leaving container
                setInteractionMode('none');
                setDragStartY(null);
                setDragEndY(null);
                setActiveBlockId(null);
            }
        }}
      >
        <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
            
            {/* Grid Lines & Time Labels */}
            {hours.map((hour) => (
                <div 
                    key={hour} 
                    className="absolute w-full border-t border-[#2a2d36]/50 flex items-start pointer-events-none"
                    style={{ top: `${(hour - startHour) * hourHeight + gridOffset}px` }}
                >
                    <span className="text-xs text-gray-500 w-16 text-right pr-4 -mt-2.5 font-mono select-none">
                        {hour === 24 ? '00:00' : `${hour.toString().padStart(2, '0')}:00`}
                    </span>
                    <div className="flex-1"></div>
                </div>
            ))}

            {/* Current Time Indicator */}
            <div 
                className="absolute w-full border-t-2 border-red-500 z-30 pointer-events-none"
                style={{ top: `${getPosition(currentTime)}px` }}
            >
                <div className="absolute left-16 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,1)]"></div>
            </div>

            {/* PLANNED BLOCKS */}
            {plannedBlocks.map((block) => {
                const isMoving = activeBlockId === block.id && temporaryBlockState;
                
                // Use temporary state if moving/resizing, else block state
                const startTime = isMoving ? temporaryBlockState.startTime : block.startTime;
                const duration = isMoving ? temporaryBlockState.duration : block.durationMinutes;

                return (
                    <div
                        key={`plan-${block.id}`}
                        onMouseDown={(e) => handleBlockMouseDown(e, block)}
                        onContextMenu={(e) => handleBlockContextMenu(e, block.id)}
                        className={`time-block absolute left-20 right-4 rounded-lg flex flex-col justify-center px-3 z-10 transition-colors select-none group
                          ${viewMode === 'plan' 
                            ? `${CATEGORY_COLORS[block.type]} bg-opacity-20 border-l-4 border-opacity-100 hover:bg-opacity-30` 
                            : 'border-2 border-dashed border-gray-600 bg-gray-800/30 opacity-70'
                          }
                          ${isMoving ? 'shadow-2xl opacity-90 scale-[1.01] z-50 cursor-move ring-1 ring-white/50' : 'cursor-pointer'}
                        `}
                        style={{
                            top: `${getPosition(startTime)}px`,
                            height: `${getHeight(duration)}px`,
                            borderColor: viewMode === 'plan' 
                              ? (block.type === 'focus' ? '#00FF94' : block.type === 'meeting' ? '#4D96FF' : block.type === 'break' ? '#FFB347' : '#A0A0A0') 
                              : '#6b7280',
                            transition: isMoving ? 'none' : 'top 0.2s, height 0.2s', // Smooth snap only when not dragging
                        }}
                    >
                        <div className="flex justify-between items-center pointer-events-none">
                            <span className={`text-[10px] uppercase tracking-wider font-semibold truncate ${viewMode === 'plan' ? 'text-white' : 'text-gray-500'}`}>
                                {block.title}
                            </span>
                            {/* Time hint while dragging */}
                            {isMoving && (
                                <span className="text-[10px] font-mono bg-black/50 px-1 rounded text-white">
                                    {startTime}
                                </span>
                            )}
                        </div>

                        {/* Resize Handle (Bottom) */}
                        {viewMode === 'plan' && !isMoving && (
                            <div 
                                className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                onMouseDown={(e) => handleResizeMouseDown(e, block)}
                            >
                                <div className="w-8 h-1 bg-white/30 rounded-full mb-0.5"></div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* ACTUAL BLOCKS (Review Mode Only) */}
            {viewMode === 'review' && actualBlocks.map((block) => (
                <div
                    key={`actual-${block.id}`}
                    className={`time-block absolute left-24 right-8 rounded-md shadow-lg flex flex-col justify-center px-3 z-20 border-l-4 transition-all hover:scale-[1.01] cursor-pointer group ${CATEGORY_COLORS[block.type]} bg-opacity-20 border-opacity-100 backdrop-blur-sm select-none`}
                    style={{
                        top: `${getPosition(block.startTime)}px`,
                        height: `${getHeight(block.durationMinutes)}px`,
                        borderColor: block.type === 'focus' ? '#00FF94' : block.type === 'meeting' ? '#4D96FF' : block.type === 'break' ? '#FFB347' : '#A0A0A0'
                    }}
                >
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white truncate shadow-black drop-shadow-md">
                            {block.title}
                        </span>
                    </div>
                    {getHeight(block.durationMinutes) > 40 && (
                         <span className="text-[10px] text-gray-300 truncate opacity-80">
                            {block.app}
                        </span>
                    )}
                </div>
            ))}

            {renderCreationGhost()}

            {/* CREATE/EDIT POPOVER */}
            {isPopoverOpen && (
                <div 
                    className="create-popover absolute z-50 w-80 bg-[#1a1d24]/95 backdrop-blur-md border border-[#2a2d36] rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200"
                    style={{ top: `${popoverPosition.top + 10}px`, left: '100px', right: '16px' }}
                    onClick={(e) => e.stopPropagation()} 
                >
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-mono text-accent-focus">
                            {draftBlock?.start} - {draftBlock?.end}
                        </span>
                        <button onClick={() => setIsPopoverOpen(false)} className="text-gray-500 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Title Input */}
                        <div>
                            <input
                                autoFocus
                                type="text"
                                placeholder={isBreakMode ? "Break details..." : "What are you planning?"}
                                className="w-full bg-transparent border-b border-gray-700 pb-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent-focus transition-colors"
                                value={blockTitle}
                                onChange={handleTitleChange}
                                onKeyDown={(e) => e.key === 'Enter' && saveBlock()}
                            />
                        </div>

                        {/* Category Select */}
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-1.5">
                                 <button
                                    onClick={switchToCategory}
                                    className={`text-[10px] uppercase font-bold tracking-wider transition-colors ${!isBreakMode ? 'text-accent-focus' : 'text-gray-600 hover:text-gray-400'}`}
                                 >
                                    Category
                                 </button>
                                 <span className="text-gray-700 text-[10px] font-bold">/</span>
                                 <button
                                    onClick={switchToBreak}
                                    className={`text-[10px] uppercase font-bold tracking-wider transition-colors ${isBreakMode ? 'text-accent-break' : 'text-gray-600 hover:text-gray-400'}`}
                                 >
                                    Break
                                 </button>
                            </div>
                            
                            {!isBreakMode ? (
                                <>
                                    <button 
                                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                        className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${selectedCategory ? 'bg-[#2a2d36] border-[#3f434e] text-white' : 'bg-[#15171e] border-[#2a2d36] text-gray-400 hover:border-gray-500'}`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            {selectedCategory ? (
                                                <>
                                                    <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[selectedCategory.type]}`} />
                                                    <span>{selectedCategory.name}</span>
                                                </>
                                            ) : (
                                                <span className="italic">Select a category...</span>
                                            )}
                                        </div>
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isCategoryDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d24] border border-[#3f434e] rounded-lg shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                            {workCategories.length > 0 ? (
                                                workCategories.map((cat) => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => {
                                                            setSelectedCategoryId(cat.id);
                                                            setIsCategoryDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#2a2d36] hover:text-white flex items-center gap-2 border-b border-[#2a2d36] last:border-0"
                                                    >
                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_COLORS[cat.type]}`} />
                                                        <span className="truncate">{cat.name}</span>
                                                        {selectedCategoryId === cat.id && <Check size={12} className="ml-auto text-accent-focus" />}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-3 text-center text-xs text-gray-500">
                                                    No categories found.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="w-full p-2 rounded-lg border border-[#2a2d36] bg-[#2a2d36] text-white text-xs flex items-center gap-2 cursor-default select-none">
                                    <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS['break']}`} />
                                    <span className="font-medium">Break</span>
                                </div>
                            )}
                        </div>

                        {/* Action Button */}
                        <button 
                            onClick={saveBlock}
                            disabled={!blockTitle.trim() || !selectedCategoryId}
                            className="w-full py-2 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {editingBlockId ? 'Update Plan' : 'Save Plan'}
                        </button>
                    </div>
                </div>
            )}
            
            {/* CONTEXT MENU */}
            {contextMenu && (
                <div 
                    className="fixed z-[100] w-32 bg-[#1a1d24] border border-[#2a2d36] rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing immediately
                >
                    <button 
                        onClick={handleEditClick}
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#2a2d36] hover:text-white flex items-center gap-2"
                    >
                        <Edit2 size={12} /> Edit
                    </button>
                    <button 
                        onClick={handleDeleteClick}
                        className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-[#2a2d36] hover:text-red-300 flex items-center gap-2"
                    >
                        <Trash2 size={12} /> Delete
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
