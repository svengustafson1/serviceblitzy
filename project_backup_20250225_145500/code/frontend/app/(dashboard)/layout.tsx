'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LogOut, Menu, User, Home, FileText, Bell, Settings, X, Wrench, Building, CreditCard, PlusCircle, MessageSquare } from 'lucide-react';
import { NotificationProvider, useNotifications } from '../../lib/NotificationContext';
import { NotificationCenter } from '../../components/ui/Notification';
import { MessagingProvider, useMessaging } from '../../lib/MessagingContext';

// Mock user data for messaging context
const currentUser = {
  id: 'user-1',
  name: 'John Doe',
  avatar: '/images/avatar-placeholder.jpg',
  type: 'homeowner' as const
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <MessagingProvider
        currentUserId={currentUser.id}
        currentUserName={currentUser.name}
        currentUserAvatar={currentUser.avatar}
        currentUserType={currentUser.type}
      >
        <DashboardContent>
          {children}
        </DashboardContent>
      </MessagingProvider>
    </NotificationProvider>
  );
}

// This is a client component that uses hooks
function DashboardContent({ children }: { children: React.ReactNode }) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { notifications, unreadCount, removeNotification, markAsRead, clearAllNotifications } = useNotifications();

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    // Mark all as read when opening
    if (!isNotificationsOpen) {
      notifications.forEach(notification => {
        if (!notification.read) {
          markAsRead(notification.id);
        }
      });
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    markAsRead(notification.id);
    
    // Handle navigation if link is provided
    if (notification.link) {
      // In a real app, you'd use router.push here
      window.location.href = notification.link;
    }
    
    // Close notification center
    setIsNotificationsOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile navigation drawer */}
      <div className="md:hidden">
        <input type="checkbox" id="drawer-toggle" className="hidden peer" aria-label="Toggle navigation menu" />
        <label htmlFor="drawer-toggle" className="fixed top-4 left-4 z-40 p-2 bg-white rounded-md shadow-md cursor-pointer">
          <Menu className="h-6 w-6" />
        </label>
        <label htmlFor="drawer-toggle" className="fixed inset-0 bg-gray-900 bg-opacity-30 z-30 hidden peer-checked:block cursor-pointer"></label>
        <div className="fixed top-0 left-0 h-screen w-64 bg-white shadow-lg transform -translate-x-full peer-checked:translate-x-0 transition-transform duration-300 ease-in-out z-30">
          <div className="flex justify-between items-center p-4 border-b">
            <span className="font-semibold text-xl">HomeServices</span>
            <label htmlFor="drawer-toggle" className="cursor-pointer">
              <X className="h-6 w-6" />
            </label>
          </div>
          <SidebarContent />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col md:w-64 md:bg-white md:border-r">
        <div className="p-4 border-b">
          <h1 className="font-semibold text-xl">HomeServices</h1>
        </div>
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b shadow-sm">
          <div className="px-4 py-3 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
            <div className="flex items-center space-x-4">
              <button 
                className="relative" 
                aria-label="Notifications"
                onClick={toggleNotifications}
              >
                <Bell className="h-6 w-6 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  <User className="h-5 w-5" />
                </div>
                <span className="hidden md:inline text-sm font-medium">John Doe</span>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
        
        {/* Notification Center */}
        <NotificationCenter
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={notifications}
          onClearAll={clearAllNotifications}
          onNotificationClose={removeNotification}
          onNotificationClick={handleNotificationClick}
        />
      </div>
    </div>
  );
}

// This component is used in both mobile and desktop sidebars
function SidebarContent() {
  return (
    <div className="py-4 flex flex-col justify-between h-full">
      <nav className="px-2 space-y-1">
        <SidebarLink href="/dashboard" icon={<Home className="h-5 w-5" />} text="Dashboard" />
        
        {/* Properties Section */}
        <div className="mt-6 mb-2">
          <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Properties
          </h3>
        </div>
        <SidebarLink href="/dashboard/properties" icon={<Building className="h-5 w-5" />} text="My Properties" />
        
        {/* Services Section */}
        <div className="mt-6 mb-2">
          <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Services
          </h3>
        </div>
        <SidebarLink href="/dashboard/services" icon={<Wrench className="h-5 w-5" />} text="My Services" />
        <SidebarLink href="/dashboard/services/new" icon={<PlusCircle className="h-5 w-5" />} text="Request Service" />
        
        {/* Messages Section */}
        <div className="mt-6 mb-2">
          <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Communication
          </h3>
        </div>
        <MessagesLink />
        
        {/* Billing Section */}
        <div className="mt-6 mb-2">
          <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Billing
          </h3>
        </div>
        <SidebarLink href="/dashboard/invoices" icon={<CreditCard className="h-5 w-5" />} text="Invoices & Payments" />
        
        {/* Settings */}
        <div className="mt-6 mb-2">
          <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Account
          </h3>
        </div>
        <SidebarLink href="/dashboard/settings" icon={<Settings className="h-5 w-5" />} text="Settings" />
      </nav>
      <div className="px-2 mt-6">
        <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100 w-full">
          <LogOut className="h-5 w-5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}

// Updated SidebarLink component to use the useMessaging hook properly
function SidebarLink({ 
  href, 
  icon, 
  text, 
  showUnreadIndicator = false 
}: { 
  href: string; 
  icon: React.ReactNode; 
  text: string; 
  showUnreadIndicator?: boolean;
}) {
  // Now we actually use the useMessaging hook if showUnreadIndicator is true
  // Messages context is only used when needed for links that show message indicators
  const messaging = showUnreadIndicator && href.includes('messages') ? useMessaging() : null;
  
  // Only show indicator if it's explicitly enabled and we have unread messages
  const hasUnread = showUnreadIndicator && 
    (href.includes('messages') ? messaging?.hasUnreadMessages : false);
  
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100 group">
      <div className="flex items-center">
        {icon}
        <span className="ml-3">{text}</span>
      </div>
      {hasUnread && (
        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
      )}
    </Link>
  );
}

// Special client component just for the Messages link
function MessagesLink() {
  const messaging = useMessaging();
  const hasUnreadMessages = messaging?.hasUnreadMessages || false;
  
  return (
    <Link href="/dashboard/messages" className="flex items-center justify-between px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100 group">
      <div className="flex items-center">
        <MessageSquare className="h-5 w-5" />
        <span className="ml-3">Messages</span>
      </div>
      {hasUnreadMessages && (
        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
      )}
    </Link>
  );
} 