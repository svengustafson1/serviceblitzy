'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import safeStorage from './utils/storage';

// Mock users are defined in AuthContext, but we need them here too
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

export const BypassAuthHook = () => {
  const pathname = usePathname();

  useEffect(() => {
    // Only run this effect on the client side
    if (typeof window === 'undefined') return;

    // Helper function to set user type in storage
    const setUserTypeInStorage = (userType: string) => {
      try {
        console.log(`BypassAuthHook: Setting user type to ${userType}`);
        safeStorage.setItem('bypassAuthUser', userType);
      } catch (e) {
        console.error('BypassAuthHook: Error setting bypass auth user:', e);
      }
    };

    // Handle direct dashboard access
    if (pathname === '/dashboard') {
      console.log('BypassAuthHook: Detected direct access to homeowner dashboard');
      setUserTypeInStorage('homeowner');
    } else if (pathname === '/provider') {
      console.log('BypassAuthHook: Detected direct access to provider dashboard');
      setUserTypeInStorage('provider');
    }

    // Inject a script to add path-based detection that runs before React
    try {
      // Only add the script once
      if (!document.getElementById('bypass-auth-script')) {
        const script = document.createElement('script');
        script.id = 'bypass-auth-script';
        script.innerHTML = `
          // Simple script to detect dashboard routes and set user type
          (function() {
            const path = window.location.pathname;
            console.log('Bypass Auth Script: Running initial path check on:', path);
            
            if (path === '/dashboard') {
              console.log('Bypass Auth Script: Setting homeowner in localStorage');
              try {
                localStorage.setItem('bypassAuthUser', 'homeowner');
              } catch (e) {
                console.error('Bypass Auth Script: Storage error', e);
              }
            } else if (path === '/provider') {
              console.log('Bypass Auth Script: Setting provider in localStorage');
              try {
                localStorage.setItem('bypassAuthUser', 'provider');
              } catch (e) {
                console.error('Bypass Auth Script: Storage error', e);
              }
            }
          })();
        `;
        document.head.appendChild(script);
      }
    } catch (e) {
      console.error('BypassAuthHook: Error adding script:', e);
    }
  }, [pathname]);

  // This component doesn't render anything
  return null;
};

export default BypassAuthHook; 