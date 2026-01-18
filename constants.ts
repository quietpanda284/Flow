import { TimeBlock, CategoryStat } from './types';
import { 
  Briefcase, 
  Coffee, 
  MessageSquare, 
  Zap, 
  Layout, 
  Calendar 
} from 'lucide-react';

export const MOCK_TIME_BLOCKS: TimeBlock[] = [
  {
    id: '1',
    title: 'Daily Standup',
    app: 'Zoom',
    startTime: '09:00',
    endTime: '09:30',
    durationMinutes: 30,
    type: 'meeting',
    description: 'Team sync for sprint updates.'
  },
  {
    id: '2',
    title: 'Email Triage',
    app: 'Gmail',
    startTime: '09:30',
    endTime: '10:00',
    durationMinutes: 30,
    type: 'communication',
    description: 'Clearing inbox.'
  },
  {
    id: '3',
    title: 'Deep Work: Backend API',
    app: 'VS Code',
    startTime: '10:00',
    endTime: '12:00',
    durationMinutes: 120,
    type: 'focus',
    description: 'Implementing auth middleware.'
  },
  {
    id: '4',
    title: 'Lunch Break',
    app: 'Offline',
    startTime: '12:00',
    endTime: '12:45',
    durationMinutes: 45,
    type: 'break',
    description: 'AFK'
  },
  {
    id: '5',
    title: 'Code Review',
    app: 'GitHub',
    startTime: '12:45',
    endTime: '13:30',
    durationMinutes: 45,
    type: 'focus',
    description: 'Reviewing PRs from team.'
  },
  {
    id: '6',
    title: 'Product Sync',
    app: 'Google Meet',
    startTime: '13:30',
    endTime: '14:30',
    durationMinutes: 60,
    type: 'meeting'
  },
  {
    id: '7',
    title: 'Frontend Refactor',
    app: 'VS Code',
    startTime: '14:30',
    endTime: '16:00',
    durationMinutes: 90,
    type: 'focus'
  },
  {
    id: '8',
    title: 'Slack Catch-up',
    app: 'Slack',
    startTime: '16:00',
    endTime: '16:30',
    durationMinutes: 30,
    type: 'communication'
  },
   {
    id: '9',
    title: 'Wrap up',
    app: 'Notion',
    startTime: '16:30',
    endTime: '17:00',
    durationMinutes: 30,
    type: 'other'
  }
];

export const MOCK_CATEGORIES: CategoryStat[] = [
  { id: '1', label: 'Focus', percentage: 65, type: 'focus', timeSpent: '4h 15m' },
  { id: '2', label: 'Meetings', percentage: 20, type: 'meeting', timeSpent: '1h 30m' },
  { id: '3', label: 'Communication', percentage: 10, type: 'communication', timeSpent: '45m' },
  { id: '4', label: 'Breaks', percentage: 5, type: 'break', timeSpent: '45m' },
];

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
  { label: 'Settings', icon: Coffee }, // Using Coffee as a placeholder or generic icon if Settings cog isn't desired
];