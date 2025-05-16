import React from 'react';
import Link from 'next/link';
import { LogOut, Menu, User, Home, FileText, Bell, Settings, X, Briefcase, DollarSign, Calendar, MessageSquare, Map } from 'lucide-react';

export default function ProviderDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <span className="font-semibold text-xl">Provider Portal</span>
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
          <h1 className="font-semibold text-xl">Provider Portal</h1>
        </div>
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b shadow-sm">
          <div className="px-4 py-3 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Provider Dashboard</h2>
            <div className="flex items-center space-x-4">
              <button className="relative" aria-label="Notifications">
                <Bell className="h-6 w-6 text-gray-600" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                  <User className="h-5 w-5" />
                </div>
                <span className="hidden md:inline text-sm font-medium">Green Lawns LLC</span>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent() {
  return (
    <div className="py-4 flex flex-col justify-between h-full">
      <nav className="px-2 space-y-1">
        <SidebarLink href="/provider" icon={<Home className="h-5 w-5" />} text="Dashboard" />
        <SidebarLink href="/provider/bid-requests" icon={<FileText className="h-5 w-5" />} text="Bid Requests" />
        <SidebarLink href="/provider/jobs" icon={<Briefcase className="h-5 w-5" />} text="My Jobs" />
        <SidebarLink href="/provider/schedule" icon={<Calendar className="h-5 w-5" />} text="Schedule" />
        <SidebarLink href="/provider/map" icon={<Map className="h-5 w-5" />} text="Map View" />
        <SidebarLink href="/provider/earnings" icon={<DollarSign className="h-5 w-5" />} text="Earnings" />
        <SidebarLink href="/provider/messages" icon={<MessageSquare className="h-5 w-5" />} text="Messages" />
        <SidebarLink href="/provider/settings" icon={<Settings className="h-5 w-5" />} text="Account Settings" />
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

function SidebarLink({ href, icon, text }: { href: string; icon: React.ReactNode; text: string }) {
  return (
    <Link href={href} className="flex items-center space-x-2 px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100">
      {icon}
      <span>{text}</span>
    </Link>
  );
} 