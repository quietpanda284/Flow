
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

// 1. Define the Master Categories
export const MASTER_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Development', type: 'focus' },
  { id: 'cat_2', name: 'Collaboration', type: 'meeting' },
  { id: 'cat_3', name: 'Communication', type: 'communication' },
  { id: 'cat_4', name: 'Breaks', type: 'break' },
  { id: 'cat_5', name: 'Admin', type: 'other' },
];

// 2. The Plan (Intent)
export const MOCK_PLANNED_BLOCKS: TimeBlock[] = [
    {
        id: 'p1',
        title: 'Morning Deep Work',
        app: 'VS Code',
        startTime: '09:00',
        endTime: '11:00',
        durationMinutes: 120,
        type: 'focus',
        categoryId: 'cat_1',
        description: 'Planned: Auth Middleware Implementation'
    },
    {
        id: 'p2',
        title: 'Team Standup',
        app: 'Zoom',
        startTime: '11:00',
        endTime: '11:30',
        durationMinutes: 30,
        type: 'meeting',
        categoryId: 'cat_2',
        description: 'Daily Sync'
    },
    {
        id: 'p3',
        title: 'Email & Comms',
        app: 'Slack',
        startTime: '11:30',
        endTime: '12:00',
        durationMinutes: 30,
        type: 'communication',
        categoryId: 'cat_3'
    },
    {
        id: 'p4',
        title: 'Lunch',
        app: 'Offline',
        startTime: '12:00',
        endTime: '13:00',
        durationMinutes: 60,
        type: 'break',
        categoryId: 'cat_4'
    },
    {
        id: 'p5',
        title: 'Project Review',
        app: 'GitHub',
        startTime: '13:00',
        endTime: '14:30',
        durationMinutes: 90,
        type: 'focus',
        categoryId: 'cat_1'
    },
    {
        id: 'p6',
        title: 'Client Meeting',
        app: 'Zoom',
        startTime: '15:00',
        endTime: '16:00',
        durationMinutes: 60,
        type: 'meeting',
        categoryId: 'cat_2'
    }
];

// 3. The Execution (Actual) - Overlaps and Gaps
export const MOCK_ACTUAL_BLOCKS: TimeBlock[] = [
  {
    id: '1',
    title: 'Deep Work: Backend API',
    app: 'VS Code',
    startTime: '09:15', // Started late
    endTime: '11:00',
    durationMinutes: 105,
    type: 'focus',
    categoryId: 'cat_1',
    description: 'Implementing auth middleware.'
  },
  {
    id: '2',
    title: 'Daily Standup',
    app: 'Zoom',
    startTime: '11:00',
    endTime: '11:35', // Overran
    durationMinutes: 35,
    type: 'meeting',
    categoryId: 'cat_2',
    description: 'Team sync.'
  },
  {
    id: '3',
    title: 'Urgent Bug Fix',
    app: 'VS Code',
    startTime: '11:40',
    endTime: '12:10', // Ate into lunch
    durationMinutes: 30,
    type: 'focus', // Unplanned focus
    categoryId: 'cat_1'
  },
  {
    id: '4',
    title: 'Lunch',
    app: 'Offline',
    startTime: '12:10',
    endTime: '13:00',
    durationMinutes: 50,
    type: 'break',
    categoryId: 'cat_4'
  },
  {
    id: '5',
    title: 'Code Review',
    app: 'GitHub',
    startTime: '13:00',
    endTime: '14:00', // Stopped early
    durationMinutes: 60,
    type: 'focus',
    categoryId: 'cat_1'
  },
  // Gap here: 14:00 - 15:00 (Planned focus/break missing)
  {
    id: '6',
    title: 'Client Meeting',
    app: 'Zoom',
    startTime: '15:00',
    endTime: '16:00',
    durationMinutes: 60,
    type: 'meeting',
    categoryId: 'cat_2'
  }
];

// Alias for backward compatibility if needed, though we will update usages
export const MOCK_TIME_BLOCKS = MOCK_ACTUAL_BLOCKS;

export const CATEGORY_COLORS = {
  focus: 'bg-accent-focus',
  meeting: 'bg-accent-meeting',
  break: 'bg-accent-break',
  communication: 'bg-purple-400',
  other: 'bg-accent-other'
};

export const CATEGORY_TEXT_COLORS = {
  focus: 'text-accent-focus',
  meeting: 'text-accent-meeting',
  break: 'text-accent-break',
  communication: 'text-purple-400',
  other: 'text-accent-other'
};

export const NAV_ITEMS = [
  { label: 'Home', icon: Layout },
  { label: 'Timeline', icon: Calendar },
  { label: 'Trends', icon: Zap },
  { label: 'Projects', icon: Briefcase },
  { label: 'Settings', icon: Coffee }, 
];
