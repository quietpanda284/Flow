
import React, { useRef, useEffect, useState } from 'react';
import { CATEGORY_COLORS, MASTER_CATEGORIES } from '../constants';
import { TimeBlock, CategoryType, Category } from '../types';
import { X, Brain, Coffee, Briefcase, Trash2, Edit2, Plus } from 'lucide-react';

interface VerticalTimelineProps {
  plannedBlocks: TimeBlock[];
  actualBlocks: TimeBlock[];
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

// Helper to convert Y pixels to minutes from start of day (startHour)
const pixelsToMinutes = (px: number, hourHeight: number) => {
  return ((px - gridOffset) / hourHeight) * 60;
};

// Helper to convert minutes to HH:MM string
const minutesToTimeStr = (minutesFromStart: number, startHour: number) => {
  const totalMinutes = startHour * 60 + minutesFromStart;
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Helper to snap minutes to nearest 15
const snapToGrid = (minutes: number) => {
  return Math.round(minutes / 15) * 15;
};

export const VerticalTimeline: React.FC<VerticalTimelineProps> = ({ 
  plannedBlocks, 
  actualBlocks, 
  onAddBlock,
  onDeleteBlock,
  onUpdateBlock,
  isInteractive = false,
  viewMode = 'review'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragEndY, setDragEndY] = useState<number | null>(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockId: string } | null>(null);

  // Popover State
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [draftBlock, setDraftBlock] = useState<{ start: string; end: string; duration: number } | null>(null);
  
  // Form State
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockType, setBlockType] = useState<CategoryType>('focus');
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);

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
    // If context menu is open, clicking anywhere closes it (handled by global listener), 
    // but we also want to prevent drag start if we just clicked to close menu.
    if (contextMenu) return;

    if (!isInteractive) return;

    // Prevent drag start if clicking inside the popover
    if ((e.target as HTMLElement).closest('.create-popover')) return;

    // Only trigger if clicking on the background grid, not existing blocks
    if ((e.target as HTMLElement).closest('.time-block')) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate Y relative to the scrolling container content
    const scrollTop = containerRef.current?.scrollTop || 0;
    const clientY = e.clientY - rect.top; // Relative to viewport
    const absoluteY = clientY + scrollTop; // Relative to total content height

    setDragStartY(absoluteY);
    setDragEndY(absoluteY);
    setIsDragging(true);
    setIsPopoverOpen(false); // Close popover if open
    setEditingBlockId(null); // Clear editing state
    setBlockTitle('');
    setFilteredCategories([]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isInteractive || !isDragging || dragStartY === null || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = containerRef.current.scrollTop;
    const clientY = e.clientY - rect.top;
    let absoluteY = clientY + scrollTop;

    // Constrain to grid bounds
    if (absoluteY < 0) absoluteY = 0;
    if (absoluteY > totalHeight) absoluteY = totalHeight;

    setDragEndY(absoluteY);
  };

  const handleMouseUp = () => {
    if (!isInteractive || !isDragging || dragStartY === null || dragEndY === null) return;

    setIsDragging(false);

    // Calculate Start and End Times
    let startPx = Math.min(dragStartY, dragEndY);
    let endPx = Math.max(dragStartY, dragEndY);

    // Filter out accidental clicks (must drag at least 10px)
    if (endPx - startPx < 10) {
        setDragStartY(null);
        setDragEndY(null);
        return;
    }

    // Snap to 15m
    let startMins = snapToGrid(pixelsToMinutes(startPx, hourHeight));
    let endMins = snapToGrid(pixelsToMinutes(endPx, hourHeight));
    
    // Clamp negative values if user drags above the first line
    if (startMins < 0) startMins = 0;

    // Ensure at least 15 mins
    if (endMins <= startMins) endMins = startMins + 15;

    const startTime = minutesToTimeStr(startMins, startHour);
    const endTime = minutesToTimeStr(endMins, startHour);
    const duration = endMins - startMins;

    // Prepare Draft
    setDraftBlock({ start: startTime, end: endTime, duration });
    setEditingBlockId(null);
    setBlockTitle('');
    
    // Position Popover
    setPopoverPosition({ 
        top: (startMins / 60) * hourHeight + gridOffset, 
        left: 200 
    });
    
    setIsPopoverOpen(true);
    setDragStartY(null);
    setDragEndY(null);
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
            setBlockType(block.type);
            setDraftBlock({
                start: block.startTime,
                end: block.endTime,
                duration: block.durationMinutes
            });
            // Calculate top position for the popover based on block start time
            const [h, m] = block.startTime.split(':').map(Number);
            const startMins = (h - startHour) * 60 + m;
            
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
    setBlockType('focus');
    
    setPopoverPosition({
        top: (startMins / 60) * hourHeight + gridOffset,
        left: 0 
    });
    setIsPopoverOpen(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBlockTitle(val);
    if (val.trim().length > 0) {
        const matches = MASTER_CATEGORIES.filter(c => 
            c.name.toLowerCase().includes(val.toLowerCase())
        );
        setFilteredCategories(matches);
    } else {
        setFilteredCategories([]);
    }
  };

  const selectCategory = (cat: Category) => {
    setBlockTitle(cat.name);
    setBlockType(cat.type);
    setFilteredCategories([]);
  };

  const saveBlock = () => {
    if (!draftBlock || !blockTitle.trim()) return;

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
            categoryId: 'custom', 
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
            categoryId: 'custom', 
        };
        onAddBlock(newBlock);
    }

    setIsPopoverOpen(false);
    setBlockTitle('');
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

  // Render Drag Ghost
  const renderGhostBlock = () => {
    if (!isDragging || dragStartY === null || dragEndY === null) return null;

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
        className={`relative flex-1 overflow-y-auto custom-scrollbar bg-[#0f1117] ${isInteractive ? 'cursor-crosshair' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => isDragging && setIsDragging(false)}
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
            {plannedBlocks.map((block) => (
                <div
                    key={`plan-${block.id}`}
                    onContextMenu={(e) => handleBlockContextMenu(e, block.id)}
                    className={`time-block absolute left-20 right-4 rounded-lg flex flex-col justify-center px-3 z-10 transition-colors cursor-pointer select-none
                      ${viewMode === 'plan' 
                        ? `${CATEGORY_COLORS[block.type]} bg-opacity-20 border-l-4 border-opacity-100 hover:bg-opacity-30` 
                        : 'border-2 border-dashed border-gray-600 bg-gray-800/30 opacity-70'
                      }`}
                    style={{
                        top: `${getPosition(block.startTime)}px`,
                        height: `${getHeight(block.durationMinutes)}px`,
                        borderColor: viewMode === 'plan' 
                          ? (block.type === 'focus' ? '#00FF94' : block.type === 'meeting' ? '#4D96FF' : '#A0A0A0') 
                          : '#6b7280'
                    }}
                >
                    <div className="flex justify-between items-center">
                        <span className={`text-[10px] uppercase tracking-wider font-semibold truncate ${viewMode === 'plan' ? 'text-white' : 'text-gray-500'}`}>
                            {block.title}
                        </span>
                    </div>
                </div>
            ))}

            {/* ACTUAL BLOCKS (Review Mode Only) */}
            {viewMode === 'review' && actualBlocks.map((block) => (
                <div
                    key={`actual-${block.id}`}
                    className={`time-block absolute left-24 right-8 rounded-md shadow-lg flex flex-col justify-center px-3 z-20 border-l-4 transition-all hover:scale-[1.01] cursor-pointer group ${CATEGORY_COLORS[block.type]} bg-opacity-20 border-opacity-100 backdrop-blur-sm select-none`}
                    style={{
                        top: `${getPosition(block.startTime)}px`,
                        height: `${getHeight(block.durationMinutes)}px`,
                        borderColor: block.type === 'focus' ? '#00FF94' : block.type === 'meeting' ? '#4D96FF' : '#A0A0A0'
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

            {renderGhostBlock()}

            {/* CREATE/EDIT POPOVER */}
            {isPopoverOpen && (
                <div 
                    className="create-popover absolute z-50 w-72 bg-[#1a1d24]/95 backdrop-blur-md border border-[#2a2d36] rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200"
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

                    {/* Type Selector */}
                    <div className="flex gap-1 mb-3 bg-black/20 p-1 rounded-lg">
                        {(['focus', 'meeting', 'break'] as const).map((t) => {
                             const Icon = t === 'focus' ? Brain : t === 'meeting' ? Briefcase : Coffee;
                             return (
                                <button
                                    key={t}
                                    onClick={() => setBlockType(t)}
                                    className={`flex-1 py-1.5 rounded flex items-center justify-center transition-all ${
                                        blockType === t 
                                        ? 'bg-[#2a2d36] text-white shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-400'
                                    }`}
                                    title={t}
                                >
                                    <Icon size={14} />
                                </button>
                             );
                        })}
                    </div>

                    <div className="relative mb-4">
                        <input
                            autoFocus
                            type="text"
                            placeholder="What are you planning?"
                            className="w-full bg-transparent border-b border-gray-700 pb-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent-focus transition-colors"
                            value={blockTitle}
                            onChange={handleTitleChange}
                            onKeyDown={(e) => e.key === 'Enter' && saveBlock()}
                        />
                        
                        {filteredCategories.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f1117] border border-[#2a2d36] rounded-lg shadow-xl overflow-hidden max-h-32 overflow-y-auto z-50">
                                {filteredCategories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => selectCategory(cat)}
                                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#1a1d24] hover:text-white flex items-center gap-2"
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${CATEGORY_COLORS[cat.type]}`} />
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={saveBlock}
                        className="w-full py-2 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        {editingBlockId ? 'Update Plan' : 'Save Plan'}
                    </button>
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
