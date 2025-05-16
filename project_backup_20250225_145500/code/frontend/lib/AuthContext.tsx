'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from './utils/api';
import { User, AuthResponse } from './utils/types';
import safeStorage from './utils/storage';

// Define the context shape
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, userType?: string) => Promise<void>;
  register: (userData: Partial<User> & { password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updateUser: async () => {},
});

// Export the hook to use the context
export const useAuth = () => useContext(AuthContext);

// Mock users for development (bypassing authentication)
const MOCK_USERS = {
  homeowner: {
    id: 'mock-user-1',
    email: 'demo@example.com',
    firstName: 'Demo',
    lastName: 'User',
    role: 'homeowner',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profileComplete: true,
  },
  provider: {
    id: 'mock-provider-1',
    email: 'provider@example.com',
    firstName: 'Service',
    lastName: 'Provider',
    role: 'provider',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profileComplete: true,
    services: ['cleaning', 'plumbing', 'electrical'],
    businessName: 'Mock Service Co.',
  }
};

// Flag to bypass real authentication
const BYPASS_AUTH = true;

// Provider component that wraps the app
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Check for existing auth on component mount
  useEffect(() => {
    const initAuth = async () => {
      // For development bypass
      if (BYPASS_AUTH) {
        console.log('AUTH BYPASS: Using development mode with mock authentication');
        
        // Check for direct link bypass (from localStorage)
        try {
          const bypassUserType = localStorage.getItem('bypassAuthUser');
          if (bypassUserType) {
            console.log(`AUTH BYPASS: Found bypass user from direct link: ${bypassUserType}`);
            if (bypassUserType === 'provider') {
              setUser(MOCK_USERS.provider);
              console.log('AUTH BYPASS: Set provider user from direct link');
            } else if (bypassUserType === 'homeowner') {
              setUser(MOCK_USERS.homeowner);
              console.log('AUTH BYPASS: Set homeowner user from direct link');
            }
          }
        } catch (e) {
          console.warn('AUTH BYPASS: Could not check for bypass user in storage', e);
        }
        
        setIsLoading(false);
        return;
      }

      // Normal authentication flow (when not bypassing)
      try {
        safeStorage.setItem('authTest', 'test');
        safeStorage.removeItem('authTest');
      } catch (e) {
        console.error('Storage test failed during auth initialization:', e);
        setIsLoading(false);
        return;
      }

      const token = safeStorage.getItem('authToken');
      if (token) {
        try {
          console.log('Found existing token, attempting to fetch user profile');
          const response = await api.auth.getCurrentUser();
          setUser(response.data.data || null);
          console.log('User profile loaded successfully');
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          // Clear any invalid auth data
          safeStorage.removeItem('authToken');
          safeStorage.removeItem('user');
        }
      } else {
        console.log('No auth token found in storage');
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string, userType?: string) => {
    console.log(`Login attempt initiated for ${email} as ${userType || 'homeowner'}`);
    
    // For development bypass
    if (BYPASS_AUTH) {
      console.log(`AUTH BYPASS: Mocking login for ${email} as ${userType || 'homeowner'}`);
      
      // Set mock user based on email/type - NO storage access
      const mockUser = (email === 'provider@example.com' || userType === 'provider') 
        ? MOCK_USERS.provider 
        : MOCK_USERS.homeowner;
      
      console.log(`AUTH BYPASS: Setting user as ${mockUser.role}`);
      
      // Set user directly with NO storage dependency
      setUser(mockUser);
      setIsLoading(false);
      
      // Use direct redirect instead of router to avoid any potential issues
      console.log(`AUTH BYPASS: Redirecting to ${mockUser.role === 'provider' ? '/provider' : '/dashboard'}`);
      window.location.href = mockUser.role === 'provider' ? '/provider' : '/dashboard';
      return;
    }
    
    try {
      console.log(`Login attempt for ${email}`);
      
      // Check if storage is working first
      let storageWorking = true;
      try {
        safeStorage.setItem('loginTest', 'test');
        if (safeStorage.getItem('loginTest') !== 'test') {
          storageWorking = false;
          console.warn('Storage test failed: could not retrieve test value');
        }
        safeStorage.removeItem('loginTest');
      } catch (e) {
        storageWorking = false;
        console.error('Storage access error during login:', e);
      }
      
      if (!storageWorking) {
        console.error('Storage not working properly, login may fail');
      }
      
      const response = await api.auth.login(email, password);
      const authData = response.data.data;
      
      if (!authData) {
        throw new Error('Invalid response from server: no auth data returned');
      }
      
      console.log('Login successful, received auth data');
      
      // Store auth data
      try {
        safeStorage.setItem('authToken', authData.token);
        safeStorage.setItem('user', JSON.stringify(authData.user));
        
        // Verify the data was actually stored
        const storedToken = safeStorage.getItem('authToken');
        if (!storedToken) {
          console.warn('Warning: Failed to store auth token, may be using memory fallback');
        }
      } catch (storageError) {
        console.error('Error storing auth data:', storageError);
      }
      
      // Set user state
      setUser(authData.user);
      
      // Redirect to appropriate dashboard based on explicit userType or user role from server
      if (userType === 'provider' || authData.user.role === 'provider') {
        router.push('/provider');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: Partial<User> & { password: string }) => {
    console.log(`Registration attempt for ${userData.email}`);
    
    // For development bypass
    if (BYPASS_AUTH) {
      console.log('AUTH BYPASS: Mocking registration');
      
      // Create mock user based on registration data
      const mockUser = {
        id: 'mock-user-' + Math.floor(Math.random() * 1000),
        email: userData.email || 'user@example.com',
        firstName: userData.firstName || 'New',
        lastName: userData.lastName || 'User',
        role: userData.role || 'homeowner',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileComplete: false,
        // Add any other fields from userData
        ...userData,
        // But remove password
        password: undefined
      };
      
      console.log(`AUTH BYPASS: Created mock user with role ${mockUser.role}`);
      
      // Set user directly with NO storage dependency
      setUser(mockUser as User);
      setIsLoading(false);
      
      // Direct redirect to avoid any issues
      console.log(`AUTH BYPASS: Redirecting to ${mockUser.role === 'provider' ? '/provider' : '/dashboard'}`);
      window.location.href = mockUser.role === 'provider' ? '/provider' : '/dashboard';
      return;
    }
    
    try {
      const response = await api.auth.register(userData);
      const authData = response.data.data;
      if (authData) {
        safeStorage.setItem('authToken', authData.token);
        safeStorage.setItem('user', JSON.stringify(authData.user));
        setUser(authData.user);
        
        // Redirect to appropriate dashboard
        if (authData.user.role === 'provider') {
          router.push('/provider');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // For development bypass
    if (BYPASS_AUTH) {
      console.log('AUTH BYPASS: Performing mock logout');
      setUser(null);
      
      // Direct redirect to avoid any issues
      console.log('AUTH BYPASS: Redirecting to login page');
      window.location.href = '/login';
      return;
    }
    
    safeStorage.removeItem('authToken');
    safeStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  // Update user function
  const updateUser = async (userData: Partial<User>) => {
    // For development bypass
    if (BYPASS_AUTH) {
      console.log('AUTH BYPASS: Updating mock user profile');
      
      if (user) {
        const updatedUser = { ...user, ...userData, updatedAt: new Date().toISOString() };
        setUser(updatedUser);
      }
      
      return;
    }
    
    try {
      const response = await api.auth.updateProfile(userData);
      if (response.data.data) {
        setUser({ ...user, ...response.data.data });
        if (user) {
          safeStorage.setItem('user', JSON.stringify({ ...user, ...response.data.data }));
        }
      }
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 