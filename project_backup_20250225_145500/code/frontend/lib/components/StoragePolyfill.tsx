'use client';

import { useEffect } from 'react';

/**
 * Component that applies localStorage polyfill on the client side
 * to avoid hydration mismatches with SSR and handle restricted contexts
 */
export default function StoragePolyfill() {
  useEffect(() => {
    // Only run on client-side to prevent hydration mismatches
    if (typeof window !== 'undefined') {
      // If localStorage and sessionStorage are already polyfilled, don't try to apply the polyfill again
      if (window.localStorage.__polyfilled) {
        console.log('StoragePolyfill already applied, skipping');
        return;
      }

      try {
        // Test if localStorage is accessible
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        console.log('localStorage is accessible, monitoring for errors');
        
        // Even though storage is working now, we should patch it to handle potential errors
        // in different contexts (iframes, cross-origin, etc.)
        patchStorageWithErrorHandling();
      } catch (e) {
        // If localStorage is not accessible, create an in-memory polyfill
        console.warn('localStorage access restricted, applying in-memory polyfill');
        applyInMemoryPolyfill();
      }
    }
  }, []);
  
  function patchStorageWithErrorHandling() {
    const memStorage = {};
    
    // Store original methods
    const originalLocalStorage = {
      getItem: window.localStorage.getItem.bind(window.localStorage),
      setItem: window.localStorage.setItem.bind(window.localStorage),
      removeItem: window.localStorage.removeItem.bind(window.localStorage),
      clear: window.localStorage.clear.bind(window.localStorage),
      key: window.localStorage.key.bind(window.localStorage)
    };
    
    // Create safe versions that catch errors
    window.localStorage.getItem = function(key) {
      try {
        return originalLocalStorage.getItem(key);
      } catch (e) {
        console.warn(`Error accessing localStorage.getItem, using in-memory fallback for: ${key}`);
        return memStorage[key] || null;
      }
    };
    
    window.localStorage.setItem = function(key, value) {
      try {
        // Also store in memory for backup
        memStorage[key] = String(value);
        return originalLocalStorage.setItem(key, value);
      } catch (e) {
        console.warn(`Error accessing localStorage.setItem, using in-memory fallback for: ${key}`);
      }
    };
    
    window.localStorage.removeItem = function(key) {
      try {
        delete memStorage[key];
        return originalLocalStorage.removeItem(key);
      } catch (e) {
        console.warn(`Error accessing localStorage.removeItem for: ${key}`);
      }
    };
    
    window.localStorage.clear = function() {
      try {
        Object.keys(memStorage).forEach(key => delete memStorage[key]);
        return originalLocalStorage.clear();
      } catch (e) {
        console.warn('Error accessing localStorage.clear');
      }
    };
    
    // Mark as polyfilled to prevent duplicate application
    window.localStorage.__polyfilled = true;
    console.log('StoragePolyfill: Applied error handling wrapper');
  }
  
  function applyInMemoryPolyfill() {
    const memStorage = {};
    
    const localStoragePolyfill = {
      getItem: function(key) {
        return memStorage[key] || null;
      },
      setItem: function(key, value) {
        memStorage[key] = String(value);
      },
      removeItem: function(key) {
        delete memStorage[key];
      },
      clear: function() {
        Object.keys(memStorage).forEach(key => delete memStorage[key]);
      },
      key: function(index) {
        return Object.keys(memStorage)[index] || null;
      },
      get length() {
        return Object.keys(memStorage).length;
      },
      __polyfilled: true
    };
    
    // Override the localStorage object
    try {
      Object.defineProperty(window, 'localStorage', {
        value: localStoragePolyfill,
        writable: false,
        configurable: true
      });
      
      // Also patch sessionStorage for completeness
      Object.defineProperty(window, 'sessionStorage', {
        value: {...localStoragePolyfill, __polyfilled: true},
        writable: false,
        configurable: true
      });
      
      console.log('In-memory storage polyfill installed successfully');
    } catch (e) {
      console.error('Failed to apply storage polyfill:', e);
    }
  }
  
  // This component doesn't render anything
  return null;
} 