
export type CategoryType = 'focus' | 'meeting' | 'break' | 'other';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color?: string; // Optional override
}

export interface TimeBlock {
  id: string;
  title: string;
  app: string;
  date?: string; // Format: YYYY-MM-DD. Optional for backward compatibility, but required for DB.
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  type: CategoryType; // Kept for easy access, but ideally derived from categoryId
  categoryId: string; // The Foreign Key
  description?: string;
  isPlanned?: boolean; // New field for DB differentiation
}

// View Model for the UI
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
