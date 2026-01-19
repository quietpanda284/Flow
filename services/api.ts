
import { CategoryStat, TimeBlock, CategoryType, Category } from '../types';

const API_URL = '/api';

/**
 * Helper to handle fetch with timeout and JSON parsing.
 */
async function fetchWithTimeout(resource: string, options: RequestInit = {}) {
  const { timeout = 15000 } = options as any;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(`${API_URL}${resource}`, {
      ...options,
      credentials: 'include', // IMPORTANT: Send/Receive Cookies
      headers: {
        ...options.headers,
        'ngrok-skip-browser-warning': 'true', 
      },
      signal: controller.signal
    });
    clearTimeout(id);
    
    // Handle Auth failure globally if needed, though often better handled in context
    if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) throw new Error('API Error');
    return await response.json();
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// --- Auth Service ---

export const loginUser = async (username: string, password: string): Promise<any> => {
    return await fetchWithTimeout('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
};

export const logoutUser = async (): Promise<boolean> => {
    await fetchWithTimeout('/auth/logout', { method: 'POST' });
    return true;
};

export const checkAuthStatus = async (): Promise<any> => {
    return await fetchWithTimeout('/auth/me');
};

// --- Categories Service ---

export const getCategories = async (): Promise<Category[]> => {
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
