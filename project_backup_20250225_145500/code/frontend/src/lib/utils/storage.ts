/**
 * Safe Storage Utility
 * 
 * Provides a consistent API for accessing localStorage with fallback
 * to in-memory storage when localStorage is not accessible.
 */

// In-memory fallback storage when localStorage is not available
const memoryStorage: Record<string, string> = {};

// Flag to track if we're using persistent localStorage or fallback
let usingPersistentStorage = false;

/**
 * Check if localStorage is accessible
 */
const isLocalStorageAccessible = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    usingPersistentStorage = true;
    return true;
  } catch (e) {
    usingPersistentStorage = false;
    return false;
  }
};

// Initialize storage accessibility check
const hasLocalStorage = isLocalStorageAccessible();

/**
 * Safe storage API that works regardless of localStorage access
 */
export const safeStorage = {
  /**
   * Get an item from storage
   */
  getItem: (key: string): string | null => {
    try {
      if (hasLocalStorage) {
        return localStorage.getItem(key);
      }
      return memoryStorage[key] || null;
    } catch (e) {
      console.warn(`Error accessing storage for key "${key}"`, e);
      return memoryStorage[key] || null;
    }
  },

  /**
   * Set an item in storage
   */
  setItem: (key: string, value: string): void => {
    try {
      // Always keep a copy in memory storage as backup
      memoryStorage[key] = value;
      if (hasLocalStorage) {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`Error setting storage for key "${key}"`, e);
    }
  },

  /**
   * Remove an item from storage
   */
  removeItem: (key: string): void => {
    try {
      delete memoryStorage[key];
      if (hasLocalStorage) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`Error removing storage for key "${key}"`, e);
    }
  },

  /**
   * Clear all storage
   */
  clear: (): void => {
    try {
      Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
      if (hasLocalStorage) {
        localStorage.clear();
      }
    } catch (e) {
      console.warn('Error clearing storage', e);
    }
  },

  /**
   * Check if persistent localStorage is being used
   */
  isPersistentStorage: (): boolean => {
    return usingPersistentStorage;
  }
};

export default safeStorage; 