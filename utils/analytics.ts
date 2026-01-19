
import { TimeBlock, Category, CategoryStat } from '../types';

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/**
 * Merges TimeBlocks with Categories to produce aggregated stats.
 */
export const calculateCategoryStats = (
  blocks: TimeBlock[], 
  categories: Category[]
): CategoryStat[] => {
  
  // 1. Initialize map
  const statsMap = new Map<string, { minutes: number; category: Category }>();
  let totalMinutes = 0;

  // Initialize all categories with 0 minutes to ensure they appear
  categories.forEach(cat => {
    statsMap.set(cat.id, { minutes: 0, category: cat });
  });

  // 2. Aggregate minutes from blocks
  blocks.forEach(block => {
    totalMinutes += block.durationMinutes;
    const stat = statsMap.get(block.categoryId);
    if (stat) {
      stat.minutes += block.durationMinutes;
    } else {
      // Handle case where block has an unknown category ID (optional fallback)
    }
  });

  if (totalMinutes === 0) return [];

  // 3. Transform to view model
  const results: CategoryStat[] = Array.from(statsMap.values())
    .map(({ minutes, category }) => ({
      id: category.id,
      label: category.name,
      type: category.type,
      percentage: Math.round((minutes / totalMinutes) * 100),
      timeSpent: formatDuration(minutes)
    }))
    .filter(stat => stat.percentage > 0) // Only show active categories
    .sort((a, b) => b.percentage - a.percentage); // Sort by usage

  return results;
};

/**
 * Calculates the hour of the day with the most 'focus' type activity.
 */
export const getPeakFocusHour = (blocks: TimeBlock[]): string => {
  const focusBlocks = blocks.filter(b => b.type === 'focus');
  if (focusBlocks.length === 0) return 'N/A';

  // Array representing 24 hours of the day
  const hourCounts = new Array(24).fill(0);

  focusBlocks.forEach(block => {
    const startHour = parseInt(block.startTime.split(':')[0], 10);
    // Simple heuristic: attribute duration to the start hour
    // A more complex version would distribute minutes across crossing hours
    hourCounts[startHour] += block.durationMinutes;
  });

  const maxMinutes = Math.max(...hourCounts);
  if (maxMinutes === 0) return 'N/A';
  
  const peakHour = hourCounts.indexOf(maxMinutes);
  
  // Format to 12h AM/PM
  const ampm = peakHour >= 12 ? 'PM' : 'AM';
  const displayHour = peakHour % 12 || 12; // Convert 0 to 12
  return `${displayHour}:00 ${ampm}`;
};

/**
 * Calculates total minutes spent on 'focus' type blocks.
 */
export const getTotalFocusMinutes = (blocks: TimeBlock[]): number => {
    return blocks.filter(b => b.type === 'focus').reduce((acc, b) => acc + b.durationMinutes, 0);
};
