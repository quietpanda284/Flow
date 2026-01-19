
import { TimeBlock, Category } from './types';
import { 
  Briefcase, 
  Coffee, 
  MessageSquare, 
  Zap, 
  Layout, 
  Calendar,
  Map
} from 'lucide-react';

// 1. Define the Master Categories (Used for defaults/seeds, but not fallback display)
export const MASTER_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Development', type: 'focus' },
  { id: 'cat_2', name: 'Collaboration', type: 'meeting' },
  { id: 'cat_4', name: 'Breaks', type: 'break' },
  { id: 'cat_5', name: 'Admin', type: 'other' },
];

// 2. The Plan (Intent) - CLEARED
export const MOCK_PLANNED_BLOCKS: TimeBlock[] = [];

// 3. The Execution (Actual) - CLEARED
export const MOCK_ACTUAL_BLOCKS: TimeBlock[] = [];

// Alias for backward compatibility if needed, though we will update usages
export const MOCK_TIME_BLOCKS = MOCK_ACTUAL_BLOCKS;

export const CATEGORY_COLORS = {
  focus: 'bg-accent-focus',
  meeting: 'bg-accent-meeting',
  break: 'bg-accent-break',
  other: 'bg-accent-other'
};

export const CATEGORY_TEXT_COLORS = {
  focus: 'text-accent-focus',
  meeting: 'text-accent-meeting',
  break: 'text-accent-break',
  other: 'text-accent-other'
};

export const NAV_ITEMS = [
  { label: 'Home', icon: Layout },
  { label: 'Timeline', icon: Calendar },
  { label: 'Trends', icon: Zap },
  { label: 'Projects', icon: Briefcase },
  { label: 'Settings', icon: Coffee }, 
];
