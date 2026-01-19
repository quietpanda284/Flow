
import { TimeBlock, Category, CategoryStat } from '../types';

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0 && h === 0) return `0m`;
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
 * Calculates the hour of the day with the most 'productive' (non-break) type activity.
 */
export const getPeakProductiveHour = (blocks: TimeBlock[]): string => {
  const productiveBlocks = blocks.filter(b => b.type !== 'break');
  if (productiveBlocks.length === 0) return 'N/A';

  // Array representing 24 hours of the day
  const hourCounts = new Array(24).fill(0);

  productiveBlocks.forEach(block => {
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
 * Calculates total minutes spent on productive (non-break) blocks.
 */
export const getTotalProductiveMinutes = (blocks: TimeBlock[]): number => {
    return blocks.filter(b => b.type !== 'break').reduce((acc, b) => acc + b.durationMinutes, 0);
};

/**
 * Helper to convert "HH:MM" to minutes from start of day.
 */
const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

/**
 * Calculates high-fidelity metrics comparing Planned vs Actual time blocks.
 * Uses a bitmask approach to handle overlaps correctly.
 * Excludes 'break' type blocks from all calculations.
 */
export const calculateScheduleMetrics = (planned: TimeBlock[], actual: TimeBlock[]) => {
    // Filter out breaks from the calculation source
    const workPlanned = planned.filter(b => b.type !== 'break');
    const workActual = actual.filter(b => b.type !== 'break');

    const MINUTES_IN_DAY = 24 * 60;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const planMap = new Uint8Array(MINUTES_IN_DAY); // 0 or 1
    const actMap = new Uint8Array(MINUTES_IN_DAY);  // 0 or 1
    
    // Helper to fill map
    const fill = (blocks: TimeBlock[], map: Uint8Array) => {
       blocks.forEach(b => {
           const start = timeToMinutes(b.startTime);
           const end = start + b.durationMinutes;
           for(let i=start; i<end && i<MINUTES_IN_DAY; i++) {
               map[i] = 1;
           }
       });
    };

    fill(workPlanned, planMap);
    fill(workActual, actMap);

    let totalOverlapCount = 0;
    let totalPlanCount = 0;
    let totalActCount = 0;

    let pastPlanCount = 0;
    let pastOverlapCount = 0;

    for(let i=0; i<MINUTES_IN_DAY; i++) {
        const isPlanned = planMap[i] === 1;
        const isActual = actMap[i] === 1;
        const isPast = i <= currentMinutes;

        if (isPlanned) totalPlanCount++;
        if (isActual) totalActCount++;
        if (isPlanned && isActual) totalOverlapCount++;

        if (isPast) {
            if (isPlanned) pastPlanCount++;
            if (isPlanned && isActual) pastOverlapCount++;
        }
    }

    // Missed = Planned minutes in the PAST that were NOT covered by actual
    const missedMinutes = pastPlanCount - pastOverlapCount;
    
    // Unplanned = Total Actual - Total Overlap (Work done that wasn't in plan)
    // We use total here because "unplanned" usually refers to any deviation added, 
    // and actuals are typically in the past anyway.
    const unplannedMinutes = totalActCount - totalOverlapCount;
    
    // Strict Adherence = % of Past Plan that was actually executed
    // If no plan in the past, default to 0%
    const adherenceRate = pastPlanCount > 0 ? Math.round((pastOverlapCount / pastPlanCount) * 100) : 0;
    
    return {
        missedMinutes,
        unplannedMinutes,
        adherenceRate,
        totalPlannedMinutes: totalPlanCount,
        totalActualMinutes: totalActCount
    };
};
