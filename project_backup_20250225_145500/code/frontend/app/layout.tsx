import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/AuthContext';
import { BypassClientComponent } from '../lib/components/BypassClientComponent';

// Import our Next.js polyfill early
import '../lib/nextjs-polyfill';
// Import StoragePolyfill component
import StoragePolyfill from '../lib/components/StoragePolyfill';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Home Services Platform',
  description: 'Connect with trusted service providers for all your home maintenance needs in one easy-to-use platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Apply storage polyfill in a client component to avoid hydration issues */}
        <StoragePolyfill />
        {/* Add bypass authentication component */}
        <BypassClientComponent />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
} 