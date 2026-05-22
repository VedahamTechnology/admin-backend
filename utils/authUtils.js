/**
 * Auth utilities for client-side token management
 * This file provides functions to handle token refresh and storage
 */

/**
 * Store tokens in localStorage
 * @param {string} accessToken - JWT access token
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 */
export const storeTokens = (accessToken, userId, userRole) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('userId', userId);
  localStorage.setItem('userRole', userRole);
  localStorage.setItem('tokenTimestamp', Date.now().toString());
};

/**
 * Get stored access token
 * @returns {string|null} - Access token or null
 */
export const getAccessToken = () => {
  return localStorage.getItem('accessToken');
};

/**
 * Get stored user ID
 * @returns {string|null} - User ID or null
 */
export const getUserId = () => {
  return localStorage.getItem('userId');
};

/**
 * Get stored user role
 * @returns {string|null} - User role or null
 */
export const getUserRole = () => {
  return localStorage.getItem('userRole');
};

/**
 * Clear all stored tokens
 */
export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('userRole');
  localStorage.removeItem('tokenTimestamp');
};

/**
 * Check if token is about to expire (within 5 minutes)
 * @param {number} expiresIn - Token expiration time in seconds
 * @returns {boolean} - True if token is about to expire
 */
export const isTokenExpiring = (expiresIn = 3600) => {
  const tokenTimestamp = localStorage.getItem('tokenTimestamp');
  if (!tokenTimestamp) return true;
  
  const timeSinceCreation = (Date.now() - parseInt(tokenTimestamp)) / 1000;
  const timeUntilExpiry = expiresIn - timeSinceCreation;
  
  // Refresh if less than 5 minutes left
  return timeUntilExpiry < 300;
};

/**
 * Refresh access token using the refresh token (via HTTP-only cookie)
 * @param {string} apiUrl - API base URL (e.g., 'http://localhost:5000/api')
 * @returns {Promise<{success: boolean, accessToken?: string, error?: string}>}
 */
export const refreshAccessToken = async (apiUrl) => {
  try {
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: Include cookies (refresh token)
    });

    const data = await response.json();

    if (data.success && data.accessToken) {
      // Update the access token in localStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      return { success: true, accessToken: data.accessToken };
    } else {
      // Refresh failed, need to re-login
      clearTokens();
      return { success: false, error: data.message || 'Token refresh failed' };
    }
  } catch (error) {
    clearTokens();
    return { success: false, error: error.message };
  }
};

/**
 * Setup automatic token refresh interceptor for fetch requests
 * Usage: setupTokenRefresh('http://localhost:5000/api')
 * @param {string} apiUrl - API base URL
 */
export const setupTokenRefresh = (apiUrl) => {
  // Store original fetch
  const originalFetch = window.fetch;

  // Override fetch to intercept requests
  window.fetch = async function(...args) {
    let response = await originalFetch.apply(this, args);

    // If 401, try to refresh token
    if (response.status === 401) {
      const refreshResult = await refreshAccessToken(apiUrl);
      
      if (refreshResult.success) {
        // Retry the original request with new token
        const [resource, config] = args;
        const newConfig = {
          ...config,
          headers: {
            ...config?.headers,
            'Authorization': `Bearer ${refreshResult.accessToken}`,
          },
        };
        response = await originalFetch.apply(this, [resource, newConfig]);
      } else {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      }
    }

    return response;
  };
};

/**
 * Create axios interceptor for automatic token refresh
 * Usage for axios:
 * import axios from 'axios';
 * import { setupAxiosInterceptor } from './utils/authUtils';
 * setupAxiosInterceptor(axios, 'http://localhost:5000/api');
 */
export const setupAxiosInterceptor = (axios, apiUrl) => {
  // Response interceptor to handle 401
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshResult = await refreshAccessToken(apiUrl);
          
          if (refreshResult.success) {
            // Update the original request with new token
            originalRequest.headers.Authorization = `Bearer ${refreshResult.accessToken}`;
            return axios(originalRequest);
          } else {
            // Refresh failed, redirect to login
            window.location.href = '/login';
            return Promise.reject(error);
          }
        } catch (refreshError) {
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};

export default {
  storeTokens,
  getAccessToken,
  getUserId,
  getUserRole,
  clearTokens,
  isTokenExpiring,
  refreshAccessToken,
  setupTokenRefresh,
  setupAxiosInterceptor,
};
