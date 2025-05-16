// Simple middleware to log dashboard access

import { NextResponse } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request) {
  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Only log for dashboard paths
  if (path === '/dashboard') {
    console.log('MIDDLEWARE: Handling direct access to /dashboard - user will be set as homeowner in bypass mode');
  } else if (path === '/provider') {
    console.log('MIDDLEWARE: Handling direct access to /provider - user will be set as provider in bypass mode');
  }
  
  return NextResponse.next();
}

// Match only dashboard and provider routes
export const config = {
  matcher: ['/dashboard', '/provider'],
}; 