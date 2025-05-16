'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from './utils/api';
import { User, AuthResponse } from './utils/types';
import safeStorage from './utils/storage';
import axios from 'axios';

// Define the context shape
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'homeowner' | 'provider') => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updateUser: () => {},
});

// Export the hook to use the context
export const useAuth = () => useContext(AuthContext);

// Provider component that wraps the app
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = () => {
      const storedToken = safeStorage.getItem('token');
      const storedUser = safeStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse stored user data', e);
          safeStorage.removeItem('user');
          safeStorage.removeItem('token');
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Demo login bypass for specific test accounts
      if (email.includes('@demo') && password === 'demo123') {
        let demoUser: User;
        
        if (email === 'homeowner@demo.com') {
          demoUser = {
            id: 'demo-homeowner-1',
            name: 'Alex Johnson',
            email: 'homeowner@demo.com',
            role: 'homeowner',
            profileImage: '/assets/users/user-1.jpg'
          };
        } else if (email === 'provider@demo.com') {
          demoUser = {
            id: 'demo-provider-1',
            name: 'Taylor Services LLC',
            email: 'provider@demo.com',
            role: 'provider',
            profileImage: '/assets/users/provider-1.jpg'
          };
        } else {
          throw new Error('Unknown demo account');
        }
        
        const demoToken = 'demo-token-' + Math.random().toString(36).substring(2, 15);
        
        // Save to storage and state
        safeStorage.setItem('token', demoToken);
        safeStorage.setItem('user', JSON.stringify(demoUser));
        
        setUser(demoUser);
        setToken(demoToken);
        
        // Redirect based on role
        if (demoUser.role === 'homeowner') {
          router.push('/dashboard');
        } else {
          router.push('/provider');
        }
        
        return;
      }
      
      // Real login API call would happen here
      const response = await axios.post('/api/auth/login', { email, password });
      
      if (response.data.user && response.data.token) {
        safeStorage.setItem('token', response.data.token);
        safeStorage.setItem('user', JSON.stringify(response.data.user));
        
        setUser(response.data.user);
        setToken(response.data.token);
        
        if (response.data.user.role === 'homeowner') {
          router.push('/dashboard');
        } else {
          router.push('/provider');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string, role: 'homeowner' | 'provider') => {
    setLoading(true);
    try {
      // Demo registration bypass
      if (email.includes('@demo')) {
        const demoUser: User = {
          id: 'demo-' + role + '-' + Math.random().toString(36).substring(2, 9),
          name,
          email,
          role,
          profileImage: role === 'homeowner' ? '/assets/users/user-3.jpg' : '/assets/users/provider-3.jpg'
        };
        
        const demoToken = 'demo-token-' + Math.random().toString(36).substring(2, 15);
        
        // Save to storage and state
        safeStorage.setItem('token', demoToken);
        safeStorage.setItem('user', JSON.stringify(demoUser));
        
        setUser(demoUser);
        setToken(demoToken);
        
        // Redirect based on role
        if (role === 'homeowner') {
          router.push('/dashboard');
        } else {
          router.push('/provider');
        }
        
        return;
      }
      
      // Real registration API call would happen here
      const response = await axios.post('/api/auth/register', { name, email, password, role });
      
      if (response.data.user && response.data.token) {
        safeStorage.setItem('token', response.data.token);
        safeStorage.setItem('user', JSON.stringify(response.data.user));
        
        setUser(response.data.user);
        setToken(response.data.token);
        
        if (response.data.user.role === 'homeowner') {
          router.push('/dashboard');
        } else {
          router.push('/provider');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    safeStorage.removeItem('token');
    safeStorage.removeItem('user');
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  // Update user function
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      safeStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
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