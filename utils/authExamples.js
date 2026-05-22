/**
 * Simple example of how to use the token refresh system
 * This demonstrates both axios and fetch approaches
 */

// ============================================
// EXAMPLE 1: Using Axios (RECOMMENDED)
// ============================================

// Step 1: Install axios
// npm install axios

import axios from 'axios';
import {
  storeTokens,
  clearTokens,
  setupAxiosInterceptor,
  getAccessToken
} from './utils/authUtils';

const API_URL = 'http://localhost:5000/api';

// Step 2: Setup the interceptor (do this once when app starts)
setupAxiosInterceptor(axios, API_URL);
axios.defaults.baseURL = API_URL;

// Step 3: Login function
async function loginWithAxios() {
  try {
    const response = await axios.post('/auth/login', {
      email: 'admin@homster.com',
      password: 'admin@123',
      role: 'admin'
    });

    if (response.data.success) {
      // Store tokens locally
      storeTokens(
        response.data.accessToken,
        response.data.user.id,
        response.data.user.role
      );

      // Set auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;

      console.log('✅ Logged in successfully!');
      console.log('User:', response.data.user);
      return response.data.user;
    }
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message);
  }
}

// Step 4: Make API requests (auto-refresh happens automatically!)
async function getCategories() {
  try {
    const response = await axios.get('/admin/categories');
    console.log('✅ Got categories:', response.data);
    return response.data.categories;
  } catch (error) {
    console.error('❌ Failed to get categories:', error.response?.data?.message);
  }
}

// Step 5: Logout function
async function logoutWithAxios() {
  try {
    await axios.post('/auth/logout');
    clearTokens();
    delete axios.defaults.headers.common['Authorization'];
    console.log('✅ Logged out successfully!');
  } catch (error) {
    console.error('⚠️ Logout error (still clearing local tokens):', error);
    clearTokens();
  }
}

// Usage example:
// await loginWithAxios();
// await getCategories();
// await logoutWithAxios();


// ============================================
// EXAMPLE 2: Using Fetch API
// ============================================

import {
  storeTokens as storeTokensFetch,
  clearTokens as clearTokensFetch,
  getAccessToken as getAccessTokenFetch,
  setupTokenRefresh
} from './utils/authUtils';

// Step 1: Setup automatic refresh
setupTokenRefresh(API_URL);

// Step 2: Login function
async function loginWithFetch() {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: to send cookies
      body: JSON.stringify({
        email: 'admin@homster.com',
        password: 'admin@123',
        role: 'admin'
      })
    });

    const data = await response.json();

    if (data.success) {
      storeTokensFetch(
        data.accessToken,
        data.user.id,
        data.user.role
      );
      console.log('✅ Logged in successfully!');
      return data.user;
    } else {
      console.error('❌ Login failed:', data.message);
    }
  } catch (error) {
    console.error('❌ Login error:', error);
  }
}

// Step 3: Make requests (auto-refresh works automatically!)
async function getCategoriesWithFetch() {
  try {
    const token = getAccessTokenFetch();
    const response = await fetch(`${API_URL}/admin/categories`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Got categories:', data.categories);
      return data.categories;
    }
  } catch (error) {
    console.error('❌ Failed to get categories:', error);
  }
}

// Step 4: Logout
async function logoutWithFetch() {
  try {
    const token = getAccessTokenFetch();
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });
    clearTokensFetch();
    console.log('✅ Logged out successfully!');
  } catch (error) {
    console.error('⚠️ Logout error (still clearing local tokens):', error);
    clearTokensFetch();
  }
}


// ============================================
// EXAMPLE 3: React Component
// ============================================

/*
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { setupAxiosInterceptor, storeTokens, clearTokens } from './utils/authUtils';

function AdminDashboard() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Setup interceptor on mount
  useEffect(() => {
    setupAxiosInterceptor(axios, 'http://localhost:5000/api');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post('/auth/login', {
        email: 'admin@homster.com',
        password: 'admin@123',
        role: 'admin'
      });

      storeTokens(
        response.data.accessToken,
        response.data.user.id,
        response.data.user.role
      );
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/categories');
      setCategories(response.data.categories);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout');
    } finally {
      clearTokens();
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  return (
    <div>
      <button onClick={handleLogin} disabled={loading}>
        Login
      </button>
      <button onClick={fetchCategories} disabled={loading}>
        Load Categories
      </button>
      <button onClick={handleLogout}>
        Logout
      </button>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {loading && <p>Loading...</p>}

      <ul>
        {categories.map(cat => (
          <li key={cat._id}>{cat.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default AdminDashboard;
*/


// ============================================
// TEST SCENARIOS
// ============================================

/*
SCENARIO 1: Fresh Login
1. Call loginWithAxios()
2. Get accessToken and refreshToken (in cookie)
3. Make request immediately - uses accessToken
4. Request succeeds

SCENARIO 2: Token Near Expiry
1. Call loginWithAxios()
2. Wait 50+ minutes
3. Call getCategories()
4. Interceptor detects expiry time approaching
5. Automatically calls /auth/refresh
6. Gets new accessToken
7. Retries getCategories() with new token
8. User doesn't see any interruption

SCENARIO 3: Token Expired
1. Call loginWithAxios()
2. Wait 61+ minutes
3. Call getCategories()
4. Gets 401 Unauthorized
5. Interceptor calls /auth/refresh
6. Gets new accessToken
7. Retries getCategories()
8. Request succeeds

SCENARIO 4: Refresh Token Expired (After 7 days)
1. User makes request
2. Access token is expired
3. Attempt to refresh fails
4. Redirect to login page
5. User must login again

SCENARIO 5: Logout
1. Call logoutWithAxios()
2. refreshToken is deleted from DB
3. refreshToken cookie is cleared
4. accessToken is removed from localStorage
5. User cannot make authenticated requests

*/

export {
  loginWithAxios,
  getCategories,
  logoutWithAxios,
  loginWithFetch,
  getCategoriesWithFetch,
  logoutWithFetch
};
