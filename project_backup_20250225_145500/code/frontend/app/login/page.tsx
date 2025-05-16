'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  // Add client-side state for the user type toggle
  const [userType, setUserType] = useState('homeowner');
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('session') === 'expired';
  const networkError = searchParams.get('error') === 'network';
  
  // Effect to show detailed error information when there's a network error
  useEffect(() => {
    if (networkError) {
      setError('Unable to connect to the server. Please check your connection or try again later.');
      
      // Check storage availability for debugging but with try/catch
      let storageStatus = 'unknown';
      try {
        localStorage.getItem('test');
        storageStatus = 'localStorage available';
      } catch (storageError) {
        storageStatus = `localStorage error: ${storageError.message || 'Unknown error'}`;
      }
      
      // Check if we're in bypass mode, if so, don't show network error
      const BYPASS_AUTH = true;
      if (BYPASS_AUTH) {
        console.log('In bypass auth mode - network errors will be ignored');
        setError('');
        // Redirect to the appropriate dashboard after a short delay
        setTimeout(() => {
          const route = userType === 'provider' ? '/provider' : '/dashboard';
          router.push(route);
        }, 100);
      } else {
        setDebugInfo(`Storage status: ${storageStatus}`);
      }
    }
  }, [networkError, userType, router]);

  // Update email when switching user types
  const handleUserTypeChange = (type) => {
    setUserType(type);
    // Set appropriate demo credentials based on selected user type
    if (type === 'provider') {
      setEmail('provider@example.com');
    } else {
      setEmail('demo@example.com');
    }
  };
  
  // Handle form submission to authenticate using our API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDebugInfo('');
    setIsLoading(true);
    
    // Log the attempt
    console.log(`Attempting to login with ${email} as ${userType}`);
    setDebugInfo(`Login attempt: ${email} as ${userType}`);
    
    try {
      await login(email, password, userType);
      // If we get here in bypass mode, the redirect should have already happened
      // This is mostly for non-bypass mode
      console.log('Login function completed');
    } catch (err) {
      console.error('Login error:', err);
      
      // In bypass mode, ignore errors and proceed to dashboard
      const BYPASS_AUTH = true;
      if (BYPASS_AUTH) {
        console.log('In bypass auth mode - login errors will be ignored');
        // Redirect to appropriate dashboard
        const route = userType === 'provider' ? '/provider' : '/dashboard';
        router.push(route);
      } else {
        // Display full error for debugging
        setDebugInfo(`Error: ${err?.message || 'Unknown error'}`);
        setError('Login failed. Please see debug info for details.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen">
      {/* Left side - login form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 sm:p-12 lg:p-24">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-gray-600">Please sign in to continue to HomeServices</p>
          
          {/* Auth Bypass Notice */}
          <div className="mt-4 p-4 bg-green-100 border border-green-300 text-green-800 rounded">
            <p className="font-bold text-lg">🔓 Development Mode: Direct Dashboard Access</p>
            <p className="text-sm mt-2 mb-3">Skip login completely by using these direct links:</p>
            <div className="flex flex-col gap-3">
              <a 
                href="/dashboard" 
                className="w-full py-3 px-4 bg-blue-600 text-white rounded text-center font-bold hover:bg-blue-700 transition-colors flex items-center justify-center"
                onClick={() => {
                  try {
                    localStorage.setItem('bypassAuthUser', 'homeowner');
                  } catch (e) {
                    console.error('Error setting auth bypass:', e);
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Open Homeowner Dashboard →
              </a>
              <a 
                href="/provider" 
                className="w-full py-3 px-4 bg-purple-600 text-white rounded text-center font-bold hover:bg-purple-700 transition-colors flex items-center justify-center"
                onClick={() => {
                  try {
                    localStorage.setItem('bypassAuthUser', 'provider');
                  } catch (e) {
                    console.error('Error setting auth bypass:', e);
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                Open Provider Dashboard →
              </a>
            </div>
            <p className="text-xs mt-3 italic">Note: These links will automatically set you as a mock user in development mode.</p>
          </div>
          
          {sessionExpired && (
            <div className="mt-4 p-2 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">
              Your session has expired. Please sign in again.
            </div>
          )}
          
          {networkError && (
            <div className="mt-4 p-2 bg-orange-100 border border-orange-300 text-orange-800 rounded">
              Network connection issue detected. The server may be down or unreachable.
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-2 bg-red-100 border border-red-300 text-red-800 rounded">
              {error}
            </div>
          )}
          
          {debugInfo && (
            <div className="mt-4 p-2 bg-gray-100 border border-gray-300 text-gray-800 rounded text-sm">
              Debug: {debugInfo}
            </div>
          )}
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* User type toggle */}
          <div className="flex bg-gray-100 rounded-md p-1 mb-6">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md ${
                userType === 'homeowner'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleUserTypeChange('homeowner')}
            >
              Homeowner
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md ${
                userType === 'provider'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleUserTypeChange('provider')}
            >
              Service Provider
            </button>
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember_me"
                name="remember_me"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              Sign in as {userType === 'provider' ? 'Provider' : 'Homeowner'}
            </button>
          </div>

          <div className="mt-4 text-center">
            <div className="text-sm">
              Don't have an account?{' '}
              <Link 
                href={userType === 'provider' ? '/register?type=provider' : '/register'} 
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-label="Sign in with GitHub"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.166 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.532 1.03 1.532 1.03.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.09.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0110 2.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.203 2.394.1 2.647.64.699 1.028 1.593 1.028 2.683 0 3.842-2.339 4.687-4.566 4.933.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.14 18.163 20 14.418 20 10c0-5.523-4.477-10-10-10z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Sign in with Google"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.477 0 10c0 5.523 4.477 10 10 10 5.523 0 10-4.477 10-10C20 4.477 15.523 0 10 0zm.908 12.971a.92.92 0 01-.529-.168l-3.76-2.561a.92.92 0 01-.38-.743v-5a.92.92 0 111.84 0v4.56l3.302 2.245a.92.92 0 01-.473 1.667z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Demo Access: <span className="font-semibold">demo@example.com</span> / <span className="font-semibold">password</span>
            {userType === 'provider' && (
              <span className="block mt-1">Provider Demo: <span className="font-semibold">provider@example.com</span> / <span className="font-semibold">password</span></span>
            )}
          </p>
        </div>
      </div>

      {/* Right side - image and info */}
      <div className="hidden lg:block lg:w-1/2 bg-blue-600 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-indigo-700/90 flex flex-col justify-center p-12 text-white">
          <h2 className="text-4xl font-bold mb-6">
            {userType === 'provider' 
              ? 'Grow your service business with us' 
              : 'Manage your home services with ease'}
          </h2>
          <ul className="space-y-4 text-lg">
            {userType === 'provider' ? (
              <>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Receive job requests from local customers
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Submit competitive bids for service requests
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Manage your schedule and client communications
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Get paid securely and track your earnings
                </li>
              </>
            ) : (
              <>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Request services from trusted providers
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Compare bids with AI-powered recommendations
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Schedule and pay for services securely
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Manage all your properties in one place
                </li>
              </>
            )}
          </ul>
        </div>
        <Image
          src="/images/hero-image.jpg"
          alt="Login"
          fill
          sizes="100vw"
          className="object-cover mix-blend-overlay"
        />
      </div>
    </div>
  );
} 