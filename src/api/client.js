const API_BASE_URL = 'http://localhost:8000/api/v1';

export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || `HTTP Error ${response.status}`);
    }

    const resJson = await response.json();
    if (resJson && typeof resJson === 'object' && 'data' in resJson && resJson.success !== undefined) {
      return resJson.data;
    }
    return resJson;
  } catch (error) {
    console.warn(`[VajraNet Citizen Mobile API] Offline / fallback for ${url}:`, error.message);
    throw error;
  }
}
