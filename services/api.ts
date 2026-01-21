
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
    
    // Attempt to parse JSON response
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        try {
            data = await response.json();
        } catch (e) {
            // Ignore parse errors if body is empty or not JSON
        }
    }

    // Handle Auth failure globally
    if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
        // Prefer server-provided error message, fallback to status text
        const errorMessage = data?.error || `Request failed: ${response.statusText} (${response.status})`;
        throw new Error(errorMessage);
    }

    return data;
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

export const registerUser = async (username: string, password: string): Promise<any> => {
    return await fetchWithTimeout('/auth/register', {
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

export const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    await fetchWithTimeout('/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
    });
    return true;
};

export const deleteAccount = async (): Promise<boolean> => {
    await fetchWithTimeout('/auth/account', {
        method: 'DELETE'
    });
    return true;
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

export const getPlannedBlocks = async (date?: string, endDate?: string): Promise<TimeBlock[]> => {
    let query = '?type=planned';
    if (date) query += `&date=${date}`;
    if (endDate) query = `?type=planned&startDate=${date}&endDate=${endDate}`; // Override if range is present
    
    return await fetchWithTimeout(`/blocks${query}`);
};

export const getActualBlocks = async (date?: string, endDate?: string): Promise<TimeBlock[]> => {
    let query = '?type=actual';
    if (date) query += `&date=${date}`;
    if (endDate) query = `?type=actual&startDate=${date}&endDate=${endDate}`;
    
    return await fetchWithTimeout(`/blocks${query}`);
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

export const seedDatabase = async (date?: string): Promise<boolean> => {
    await fetchWithTimeout('/seed', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }) 
    });
    return true;
};
