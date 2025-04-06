// src/context/auth.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';

// Create context
const AuthContext = createContext();

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false
      };
    case 'LOADING':
      return {
        ...state,
        loading: true
      };
    case 'LOADED':
      return {
        ...state,
        loading: false
      };
    default:
      return state;
  }
}

// Check if email is in admin list
function isAdminEmail(email) {
  if (typeof window === 'undefined') return false;
  
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
  return adminEmails.includes(email.toLowerCase());
}

// Provider
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();
  
  // Check authentication status on load
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      dispatch({ type: 'LOADED' });
      return;
    }
    
    try {
      const token = localStorage.getItem('rahootAuthToken');
      const user = localStorage.getItem('rahootUser');
      
      if (token && user) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { 
            user: JSON.parse(user),
            token 
          }
        });
      } else {
        dispatch({ type: 'LOADED' });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      dispatch({ type: 'LOADED' });
    }
  }, []);
  
  // Register function
  const register = async (userData) => {
    if (typeof window === 'undefined') return false;
    
    try {
      dispatch({ type: 'LOADING' });
      
      if (userData.password !== userData.confirmPassword) {
        toast.error('Passwords do not match');
        dispatch({ type: 'LOADED' });
        return false;
      }
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.message || 'Registration failed');
        dispatch({ type: 'LOADED' });
        return false;
      }
      
      // Store in localStorage
      localStorage.setItem('rahootAuthToken', data.token);
      localStorage.setItem('rahootUser', JSON.stringify(data.user));
      
      // Update state
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token: data.token }
      });
      
      toast.success('Account created successfully!');
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Error creating account. Please try again.');
      dispatch({ type: 'LOADED' });
      return false;
    }
  };
  
  // Login function
  const login = async (email, password) => {
    if (typeof window === 'undefined') return false;
    
    try {
      dispatch({ type: 'LOADING' });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.message || 'Login failed');
        dispatch({ type: 'LOADED' });
        return false;
      }
      
      // Store in localStorage
      localStorage.setItem('rahootAuthToken', data.token);
      localStorage.setItem('rahootUser', JSON.stringify(data.user));
      
      // Update state
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token: data.token }
      });
      
      toast.success('Logged in successfully!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Error logging in. Please try again.');
      dispatch({ type: 'LOADED' });
      return false;
    }
  };
  
  // Google login
  const googleLogin = async (response) => {
    if (typeof window === 'undefined') return false;
    
    try {
      dispatch({ type: 'LOADING' });
      
      // Get token from Google response
      const { tokenId } = response;
      
      // Send to backend for verification
      const apiResponse = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenId }),
      });
      
      const data = await apiResponse.json();
      
      if (!apiResponse.ok) {
        toast.error(data.message || 'Google login failed');
        dispatch({ type: 'LOADED' });
        return false;
      }
      
      // Store in localStorage
      localStorage.setItem('rahootAuthToken', data.token);
      localStorage.setItem('rahootUser', JSON.stringify(data.user));
      
      // Update state
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token: data.token }
      });
      
      toast.success('Logged in successfully with Google!');
      return true;
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Error logging in with Google. Please try again.');
      dispatch({ type: 'LOADED' });
      return false;
    }
  };
  
  // Logout function
  const logout = () => {
    if (typeof window === 'undefined') return;
    
    try {
      // Clear localStorage
      localStorage.removeItem('rahootAuthToken');
      localStorage.removeItem('rahootUser');
      
      // Update state
      dispatch({ type: 'LOGOUT' });
      
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out. Please try again.');
    }
  };
  
  const value = {
    ...state,
    register,
    login,
    googleLogin,
    logout,
    isAdmin: state.user?.role === 'admin'
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}