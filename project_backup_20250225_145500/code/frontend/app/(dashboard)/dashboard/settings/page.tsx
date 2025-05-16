'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  User, 
  Mail, 
  Phone, 
  Home, 
  MapPin, 
  Calendar, 
  Lock, 
  Bell, 
  CreditCard, 
  Trash2, 
  AlertCircle,
  UserCog,
  ShieldCheck,
  BellRing,
  Wallet,
  Settings as SettingsIcon
} from 'lucide-react';

// Demo user data (would be fetched from API/context in a real app)
const demoUser = {
  id: 'user123',
  name: 'John Smith',
  email: 'john.smith@example.com',
  phone: '(555) 123-4567',
  address: '123 Main St, Anytown, CA 12345',
  profileImage: '/images/avatar-placeholder.jpg',
  joinDate: 'August 2022',
  paymentMethods: [
    {
      id: 'pm1',
      type: 'credit',
      last4: '4242',
      brand: 'Visa',
      expiry: '04/25',
      isDefault: true
    },
    {
      id: 'pm2',
      type: 'credit',
      last4: '5555',
      brand: 'Mastercard',
      expiry: '07/26',
      isDefault: false
    }
  ],
  notificationPrefs: {
    email: {
      serviceUpdates: true,
      promotions: false,
      bidAlerts: true
    },
    push: {
      serviceUpdates: true,
      messages: true,
      bidAlerts: true,
      promotions: false
    }
  }
};

// Tab definitions
const tabs = [
  { id: 'profile', label: 'Profile Information', icon: <UserCog className="h-5 w-5" /> },
  { id: 'security', label: 'Password & Security', icon: <ShieldCheck className="h-5 w-5" /> },
  { id: 'notifications', label: 'Notification Preferences', icon: <BellRing className="h-5 w-5" /> },
  { id: 'payment', label: 'Payment Methods', icon: <Wallet className="h-5 w-5" /> },
  { id: 'account', label: 'Account Management', icon: <SettingsIcon className="h-5 w-5" /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(demoUser);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
  });

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUser(prev => ({ ...prev, ...formData }));
    setIsEditing(false);
    // Show success message or notification
    alert('Profile updated successfully!');
  };

  // Add notification preference change handler
  const handleNotificationChange = (category: 'email' | 'push', type: string) => {
    // In a real app, this would update the state and eventually save to backend
    console.log(`Changed ${category} notification for ${type}`);
    // For now we're just logging the change, in a real app you would update state
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-gray-600">Manage your profile and account preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <nav className="space-y-1 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-md ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden p-6">
            {/* Profile Information Tab */}
            {activeTab === 'profile' && (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-semibold">Profile Information</h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </button>
                </div>

                {isEditing ? (
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Profile Picture
                        </label>
                        <div className="flex items-center space-x-4">
                          <div className="relative w-16 h-16 rounded-full overflow-hidden">
                            <Image
                              src={user.profileImage}
                              alt={user.name}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                          >
                            Change Photo
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden">
                        <Image
                          src={user.profileImage}
                          alt={user.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{user.name}</h3>
                        <p className="text-gray-600">Member since {user.joinDate}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex space-x-3 items-start">
                        <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Email Address</p>
                          <p className="font-medium">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex space-x-3 items-start">
                        <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Phone Number</p>
                          <p className="font-medium">{user.phone}</p>
                        </div>
                      </div>

                      <div className="flex space-x-3 items-start">
                        <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium">{user.address}</p>
                        </div>
                      </div>

                      <div className="flex space-x-3 items-start">
                        <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Member Since</p>
                          <p className="font-medium">{user.joinDate}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Password & Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Password & Security</h2>

                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-500">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-medium">Your account is secure</h3>
                        <p className="text-sm text-gray-600">
                          Your password was last changed 3 months ago
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-4">Change Password</h3>
                    <form className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Update Password
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-4">Two-Factor Authentication</h3>
                    <p className="text-gray-600 mb-4">
                      Add an extra layer of security to your account by requiring both
                      your password and access to your phone to sign in.
                    </p>
                    <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                      Enable Two-Factor Authentication
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Preferences Tab */}
            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3">Email Notifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Service Updates</p>
                          <p className="text-sm text-gray-600">
                            Notifications about your service appointments
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={user.notificationPrefs.email.serviceUpdates}
                            onChange={() => handleNotificationChange('email', 'serviceUpdates')}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Bid Alerts</p>
                          <p className="text-sm text-gray-600">
                            Notifications when you receive new bids
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={user.notificationPrefs.email.bidAlerts}
                            onChange={() => handleNotificationChange('email', 'bidAlerts')}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Promotions & News</p>
                          <p className="text-sm text-gray-600">
                            Marketing communications and platform updates
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={user.notificationPrefs.email.promotions}
                            onChange={() => handleNotificationChange('email', 'promotions')}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Push Notifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Service Updates</p>
                          <p className="text-sm text-gray-600">
                            Notifications about your service appointments
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={user.notificationPrefs.push.serviceUpdates}
                            onChange={() => handleNotificationChange('push', 'serviceUpdates')}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Messages</p>
                          <p className="text-sm text-gray-600">
                            Notifications when you receive new messages
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={user.notificationPrefs.push.messages}
                            onChange={() => handleNotificationChange('push', 'messages')}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Bid Alerts</p>
                          <p className="text-sm text-gray-600">
                            Notifications when you receive new bids
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={user.notificationPrefs.push.bidAlerts}
                            onChange={() => handleNotificationChange('push', 'bidAlerts')}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Promotions & News</p>
                          <p className="text-sm text-gray-600">
                            Marketing communications and platform updates
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={user.notificationPrefs.push.promotions}
                            onChange={() => handleNotificationChange('push', 'promotions')}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Methods Tab */}
            {activeTab === 'payment' && (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-semibold">Payment Methods</h2>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Payment Method
                  </button>
                </div>

                <div className="space-y-4">
                  {user.paymentMethods.map((method) => (
                    <div key={method.id} className="border rounded-lg p-4 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                          <CreditCard className={`h-6 w-6 ${method.brand === 'Visa' ? 'text-blue-600' : 'text-red-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium">
                            {method.brand} •••• {method.last4}
                            {method.isDefault && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">Expires {method.expiry}</p>
                        </div>
                      </div>
                      <div>
                        <button className="text-gray-600 hover:text-gray-800">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-medium mb-2">Billing Address</h3>
                    <p className="text-gray-600 mb-4">
                      Your payment method's billing address is the same as your profile address.
                    </p>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Use a different billing address
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Account Management Tab */}
            {activeTab === 'account' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Account Management</h2>

                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Download Your Data</h3>
                    <p className="text-gray-600 mb-4">
                      You can request a copy of your personal data, including your account information,
                      service history, and messages.
                    </p>
                    <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                      Request Data Export
                    </button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Deactivate Account</h3>
                    <p className="text-gray-600 mb-4">
                      Temporarily deactivate your account. You can reactivate at any time by logging in.
                    </p>
                    <button className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200">
                      Deactivate Account
                    </button>
                  </div>

                  <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-red-600 mt-1">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-red-800">Delete Account</h3>
                        <p className="text-gray-700 mb-4">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 