const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vajranet-backend.onrender.com/api/v1';

export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const token = localStorage.getItem('vajranet_token') || localStorage.getItem('token');
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
    console.warn(`[VajraNet Citizen Mobile API] Offline fallback for ${url}:`, error.message);
    throw error;
  }
}
