
import { CategoryStat, TimeBlock, CategoryType, Category } from '../types';

const API_URL = 'http://127.0.0.1:3006/api';

/**
 * Helper to handle fetch with timeout and JSON parsing.
 */
async function fetchWithTimeout(resource: string, options: RequestInit = {}) {
  const { timeout = 5000 } = options as any;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(`${API_URL}${resource}`, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    if (!response.ok) throw new Error('API Error');
    return await response.json();
  } catch (error) {
    clearTimeout(id);
    // console.error(`API Call Failed: ${resource}`, error); 
    // Rethrow so App.tsx handles the error state
    throw error;
  }
}

// --- Categories Service ---

export const getCategories = async (): Promise<Category[]> => {
  // No fallback: let App handle the error
  return await fetchWithTimeout('/categories');
};

export const addCategory = async (name: string, type: CategoryType = 'focus'): Promise<Category> => {
  return await fetchWithTimeout('/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type })
  });
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  await fetchWithTimeout(`/categories/${id}`, {
    method: 'DELETE',
  });
  return true;
};

// --- Time Blocks Service ---

export const getPlannedBlocks = async (date?: string): Promise<TimeBlock[]> => {
    const query = date ? `&date=${date}` : '';
    return await fetchWithTimeout(`/blocks?type=planned${query}`);
};

export const getActualBlocks = async (date?: string): Promise<TimeBlock[]> => {
    const query = date ? `&date=${date}` : '';
    return await fetchWithTimeout(`/blocks?type=actual${query}`);
};

export const getFocusHistory = async (): Promise<{ date: string, totalMinutes: number }[]> => {
    return await fetchWithTimeout('/history');
};

export const addTimeBlock = async (block: TimeBlock, isPlanned: boolean): Promise<TimeBlock> => {
    // Ensure backend knows it's planned
    const payload = { ...block, isPlanned, id: undefined }; 
    return await fetchWithTimeout('/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
};

export const updateTimeBlock = async (block: TimeBlock): Promise<boolean> => {
    await fetchWithTimeout(`/blocks/${block.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block)
    });
    return true;
};

export const deleteTimeBlock = async (blockId: string): Promise<boolean> => {
    await fetchWithTimeout(`/blocks/${blockId}`, {
        method: 'DELETE'
    });
    return true;
};

// --- Test/Admin Service ---

export const resetDatabase = async (): Promise<boolean> => {
    await fetchWithTimeout('/reset', { method: 'POST' });
    return true;
};

export const seedDatabase = async (): Promise<boolean> => {
    await fetchWithTimeout('/seed', { method: 'POST' });
    return true;
};
