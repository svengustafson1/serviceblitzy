/**
 * Safe Storage Utility
 * 
 * This utility provides a safe way to interact with browser storage
 * while handling various edge cases:
 * - Detects if we're in a browser context
 * - Handles iframe access restrictions
 * - Falls back to memory storage when localStorage is not available
 * - Handles cross-origin and permission issues
 */

// In-memory fallback storage for contexts where localStorage is restricted
const memoryStorage: Record<string, string> = {};

// Check if we're in a browser context
const isBrowser = typeof window !== 'undefined';

// Test if localStorage is actually accessible
const isLocalStorageAvailable = (): boolean => {
  if (!isBrowser) return false;
  
  try {
    // Try to use localStorage with a test key
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    const value = window.localStorage.getItem(testKey);
    window.localStorage.removeItem(testKey);
    
    // Additional verification that the value was actually set and retrieved
    return value === testKey;
  } catch (e) {
    console.warn('localStorage not available:', e);
    return false;
  }
};

// Determine if localStorage can be used
let canUseLocalStorage = isLocalStorageAvailable();

// If we're in an iframe, we need to be more careful with storage
if (isBrowser && window.self !== window.top) {
  console.log('Detected running in iframe, using memory storage for safety');
  canUseLocalStorage = false;
}

// Print status for debugging
if (isBrowser) {
  console.log(`Storage status: using ${canUseLocalStorage ? 'localStorage' : 'memory storage'}`);
}

// Create safe storage methods
export const safeStorage = {
  /**
   * Gets an item from storage
   */
  getItem: (key: string): string | null => {
    try {
      if (canUseLocalStorage) {
        return localStorage.getItem(key);
      } else {
        // Fall back to memory storage
        return memoryStorage[key] || null;
      }
    } catch (error) {
      console.warn('Error accessing storage:', error);
      // Fall back to memory storage
      return memoryStorage[key] || null;
    }
  },

  /**
   * Sets an item in storage
   */
  setItem: (key: string, value: string): boolean => {
    try {
      // Always store in memory as backup
      memoryStorage[key] = value;
      
      if (canUseLocalStorage) {
        localStorage.setItem(key, value);
      }
      return true;
    } catch (error) {
      console.warn('Error setting storage:', error);
      // We've already stored in memory
      return false;
    }
  },

  /**
   * Removes an item from storage
   */
  removeItem: (key: string): boolean => {
    try {
      // Always remove from memory
      delete memoryStorage[key];
      
      if (canUseLocalStorage) {
        localStorage.removeItem(key);
      }
      return true;
    } catch (error) {
      console.warn('Error removing from storage:', error);
      return false;
    }
  },

  /**
   * Clears all items from storage
   */
  clear: (): boolean => {
    try {
      // Always clear memory storage
      Object.keys(memoryStorage).forEach(key => {
        delete memoryStorage[key];
      });
      
      if (canUseLocalStorage) {
        localStorage.clear();
      }
      return true;
    } catch (error) {
      console.warn('Error clearing storage:', error);
      return false;
    }
  },

  /**
   * Indicates whether persistent localStorage is being used
   * or if we're falling back to in-memory storage
   */
  isPersistent: canUseLocalStorage
};

export default safeStorage; 