
import { CategoryStat, TimeBlock, CategoryType, Category } from '../types';
import { MASTER_CATEGORIES, MOCK_TIME_BLOCKS } from '../constants';

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
    console.error(`API Call Failed: ${resource}`, error);
    throw error;
  }
}

// --- Categories Service ---

export const getCategories = async (): Promise<Category[]> => {
  try {
    return await fetchWithTimeout('/categories');
  } catch (e) {
    console.warn('Backend unavailable, using fallback categories.');
    return MASTER_CATEGORIES;
  }
};

export const addCategory = async (name: string, type: CategoryType = 'focus'): Promise<Category> => {
  try {
    return await fetchWithTimeout('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type })
    });
  } catch (e) {
    throw e;
  }
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  try {
    await fetchWithTimeout(`/categories/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (e) {
    throw e;
  }
};

// --- Time Blocks Service ---

export const getPlannedBlocks = async (): Promise<TimeBlock[]> => {
    try {
        return await fetchWithTimeout('/blocks?type=planned');
    } catch (e) {
        return [];
    }
};

export const getActualBlocks = async (): Promise<TimeBlock[]> => {
    try {
        return await fetchWithTimeout('/blocks?type=actual');
    } catch (e) {
        return MOCK_TIME_BLOCKS; // Fallback for demo if server down
    }
};

export const addTimeBlock = async (block: TimeBlock, isPlanned: boolean): Promise<TimeBlock> => {
    try {
        // Ensure backend knows it's planned
        const payload = { ...block, isPlanned, id: undefined }; 
        return await fetchWithTimeout('/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        throw e;
    }
};

export const updateTimeBlock = async (block: TimeBlock): Promise<boolean> => {
    try {
        await fetchWithTimeout(`/blocks/${block.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(block)
        });
        return true;
    } catch (e) {
        return false;
    }
};

export const deleteTimeBlock = async (blockId: string): Promise<boolean> => {
    try {
        await fetchWithTimeout(`/blocks/${blockId}`, {
            method: 'DELETE'
        });
        return true;
    } catch (e) {
        return false;
    }
};

// --- Test/Admin Service ---

export const resetDatabase = async (): Promise<boolean> => {
    try {
        await fetchWithTimeout('/reset', { method: 'POST' });
        return true;
    } catch (e) {
        return false;
    }
};

export const seedDatabase = async (): Promise<boolean> => {
    try {
        await fetchWithTimeout('/seed', { method: 'POST' });
        return true;
    } catch (e) {
        return false;
    }
};
