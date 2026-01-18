export type CategoryType = 'focus' | 'meeting' | 'break' | 'communication' | 'other';

export interface TimeBlock {
  id: string;
  title: string;
  app: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  type: CategoryType;
  description?: string;
}

export interface CategoryStat {
  id: string;
  label: string;
  percentage: number;
  type: CategoryType;
  timeSpent: string;
}

export interface Metric {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export enum TimerState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED'
}