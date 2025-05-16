/**
 * NextJS Storage Polyfill
 * 
 * This script specifically targets Next.js hot-reloader client and other framework components
 * that might be directly accessing localStorage.
 * 
 * Instead of directly overriding the localStorage object immediately,
 * we monitor access and handle errors.
 */

// Only execute in browser environment
if (typeof window !== 'undefined') {
  // If already polyfilled, don't apply again
  if (window.localStorage && window.localStorage.__polyfilled) {
    console.log('Next.js polyfill: Storage already polyfilled, skipping');
  } else {
    console.log('Setting up Next.js polyfill for hot-reloader client');
    
    try {
      // Create a reference to the original localStorage methods
      const originalLocalStorage = {
        getItem: window.localStorage.getItem.bind(window.localStorage),
        setItem: window.localStorage.setItem.bind(window.localStorage),
        removeItem: window.localStorage.removeItem.bind(window.localStorage),
        clear: window.localStorage.clear.bind(window.localStorage),
        key: window.localStorage.key.bind(window.localStorage),
        length: window.localStorage.length
      };
      
      // Memory backup storage
      const memStorage = {};
      
      // Create wrapped versions of localStorage methods
      const safeGetItem = function(key) {
        try {
          return originalLocalStorage.getItem(key);
        } catch (e) {
          console.warn(`Next.js Safe localStorage: Error in getItem for ${key}, using fallback`);
          return memStorage[key] || null;
        }
      };
      
      const safeSetItem = function(key, value) {
        try {
          memStorage[key] = String(value); // Always back up to memory
          return originalLocalStorage.setItem(key, value);
        } catch (e) {
          console.warn(`Next.js Safe localStorage: Error in setItem for ${key}, using fallback`);
          return value;
        }
      };
      
      const safeRemoveItem = function(key) {
        try {
          delete memStorage[key];
          return originalLocalStorage.removeItem(key);
        } catch (e) {
          console.warn(`Next.js Safe localStorage: Error in removeItem for ${key}, using fallback`);
          return null;
        }
      };
      
      const safeClear = function() {
        try {
          Object.keys(memStorage).forEach(key => delete memStorage[key]);
          return originalLocalStorage.clear();
        } catch (e) {
          console.warn(`Next.js Safe localStorage: Error in clear, using fallback`);
          return null;
        }
      };
      
      const safeKey = function(index) {
        try {
          return originalLocalStorage.key(index);
        } catch (e) {
          console.warn(`Next.js Safe localStorage: Error in key(${index}), using fallback`);
          return Object.keys(memStorage)[index] || null;
        }
      };
      
      // First we test if localStorage is accessible in current context
      let storageIsAccessible = false;
      try {
        // Try a simple storage test
        const testKey = '__next_polyfill_test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        storageIsAccessible = true;
      } catch (e) {
        console.warn('Next.js polyfill: localStorage is not accessible, using full in-memory fallback');
        storageIsAccessible = false;
      }
      
      if (storageIsAccessible) {
        // Safely override the localStorage methods
        try {
          // Don't directly override the entire localStorage object (which would break hydration)
          // Instead, replace each method individually to maintain the object reference
          window.localStorage.getItem = safeGetItem;
          window.localStorage.setItem = safeSetItem;
          window.localStorage.removeItem = safeRemoveItem;
          window.localStorage.clear = safeClear;
          window.localStorage.key = safeKey;
          
          // Mark as polyfilled
          Object.defineProperty(window.localStorage, '__polyfilled', {
            value: true,
            writable: false,
            configurable: true
          });
          
          console.log('Next.js storage polyfill successfully applied individual methods');
        } catch (e) {
          console.error('Failed to apply Next.js polyfill methods:', e);
        }
      } else {
        // If localStorage isn't accessible at all, create a complete in-memory version
        const memoryStorage = {
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
        
        try {
          // Attempt to replace localStorage completely
          Object.defineProperty(window, 'localStorage', {
            value: memoryStorage,
            writable: false,
            configurable: true
          });
          
          // Also patch sessionStorage
          Object.defineProperty(window, 'sessionStorage', {
            value: {...memoryStorage},
            writable: false,
            configurable: true
          });
          
          console.log('Next.js polyfill installed complete in-memory storage replacement');
        } catch (e) {
          console.error('Failed to apply complete Next.js polyfill replacement:', e);
        }
      }
    } catch (e) {
      console.error('Error initializing Next.js polyfill:', e);
    }
  }
}

// Export a dummy object to make this importable
export default {
  installed: true
}; 