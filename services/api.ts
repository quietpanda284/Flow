import { CategoryStat, TimeBlock, CategoryType } from '../types';
import { MASTER_CATEGORIES, MOCK_TIME_BLOCKS } from '../constants';

const API_URL = 'http://localhost:3001/api';

/**
 * Helper to handle fetch with timeout and JSON parsing.
 * If the server is down (timeout/error), it throws so we can catch and use mocks.
 */
async function fetchWithTimeout(resource: string, options: RequestInit = {}) {
  const { timeout = 2000 } = options as any;
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
    throw error;
  }
}

// --- Categories Service ---

export const getCategories = async (): Promise<string[]> => {
  try {
    const data = await fetchWithTimeout('/categories');
    return data.map((cat: any) => cat.name);
  } catch (e) {
    console.warn('Backend unavailable, using mock categories.');
    // Fallback to MASTER_CATEGORIES labels
    return MASTER_CATEGORIES.map(c => c.name);
  }
};

export const addCategory = async (name: string, type: CategoryType = 'focus'): Promise<string> => {
  try {
    const data = await fetchWithTimeout('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type })
    });
    return data.name;
  } catch (e) {
    console.warn('Backend unavailable, simulating add category.');
    return name;
  }
};

export const deleteCategory = async (name: string): Promise<boolean> => {
  try {
    // Assuming backend deletes by name or you'd map name to ID here
    await fetchWithTimeout(`/categories/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    return true;
  } catch (e) {
    console.warn('Backend unavailable, simulating delete category.');
    return true;
  }
};

// --- Time Blocks Service (Future Implementation) ---

export const getTimeBlocks = async (): Promise<TimeBlock[]> => {
  try {
    const data = await fetchWithTimeout('/time-entries');
    return data;
  } catch (e) {
    return MOCK_TIME_BLOCKS;
  }
};