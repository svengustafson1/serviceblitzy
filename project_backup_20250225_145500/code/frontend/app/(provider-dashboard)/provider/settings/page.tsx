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
  Settings as SettingsIcon,
  Briefcase,
  FileCheck
} from 'lucide-react';

// Demo provider data (would be fetched from API/context in a real app)
const demoProvider = {
  id: 'provider123',
  name: 'Green Lawns LLC',
  email: 'contact@greenlawns.example.com',
  phone: '(555) 987-6543',
  address: '456 Business Ave, Anytown, CA 12345',
  profileImage: '/images/avatar-placeholder.jpg',
  joinDate: 'June 2021',
  serviceAreas: [
    'Anytown, CA',
    'Riverside, CA',
    'Lakeside, CA'
  ],
  businessHours: {
    monday: { start: '8:00 AM', end: '5:00 PM' },
    tuesday: { start: '8:00 AM', end: '5:00 PM' },
    wednesday: { start: '8:00 AM', end: '5:00 PM' },
    thursday: { start: '8:00 AM', end: '5:00 PM' },
    friday: { start: '8:00 AM', end: '5:00 PM' },
    saturday: { start: '9:00 AM', end: '2:00 PM' },
    sunday: { start: '', end: '' }
  },
  services: [
    { id: 1, name: 'Lawn Mowing', price: '45.00', priceType: 'per hour' },
    { id: 2, name: 'Hedge Trimming', price: '60.00', priceType: 'per hour' },
    { id: 3, name: 'Garden Cleanup', price: '200.00', priceType: 'flat rate' }
  ],
  paymentMethods: [
    {
      id: 'pm1',
      type: 'bank',
      accountLast4: '4567',
      bankName: 'Chase',
      isDefault: true
    },
    {
      id: 'pm2',
      type: 'credit',
      last4: '7890',
      brand: 'Visa',
      expiry: '09/24',
      isDefault: false
    }
  ],
  notificationPrefs: {
    email: {
      bidRequests: true,
      jobUpdates: true,
      paymentNotifications: true,
      promotions: false
    },
    push: {
      bidRequests: true,
      jobUpdates: true,
      messages: true,
      paymentNotifications: true,
      promotions: false
    }
  }
};

// Tab definitions
const tabs = [
  { id: 'profile', label: 'Business Profile', icon: <UserCog className="h-5 w-5" /> },
  { id: 'services', label: 'Service Offerings', icon: <Briefcase className="h-5 w-5" /> },
  { id: 'security', label: 'Password & Security', icon: <ShieldCheck className="h-5 w-5" /> },
  { id: 'notifications', label: 'Notification Preferences', icon: <BellRing className="h-5 w-5" /> },
  { id: 'payment', label: 'Payment Methods', icon: <Wallet className="h-5 w-5" /> },
  { id: 'account', label: 'Account Management', icon: <SettingsIcon className="h-5 w-5" /> },
];

export default function ProviderSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [provider, setProvider] = useState(demoProvider);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: provider.name,
    email: provider.email,
    phone: provider.phone,
    address: provider.address,
  });

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Add a new handler for toggle switches
  const handleToggleChange = (category: 'email' | 'push', setting: string) => {
    setProvider(prev => ({
      ...prev,
      notificationPrefs: {
        ...prev.notificationPrefs,
        [category]: {
          ...prev.notificationPrefs[category],
          [setting]: !prev.notificationPrefs[category][setting]
        }
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProvider(prev => ({ ...prev, ...formData }));
    setIsEditing(false);
    // Show success message or notification
    alert('Profile updated successfully!');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Provider Settings</h1>
        <p className="text-gray-600">Manage your business profile and account preferences</p>
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
                  aria-label={`Switch to ${tab.label} tab`}
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
            {/* Business Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-semibold">Business Profile</h2>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
                          Business Name
                        </label>
                        <input
                          id="name"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                          placeholder="Your business name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                          Email Address
                        </label>
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                          placeholder="contact@yourbusiness.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">
                          Phone Number
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="(555) 123-4567"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="address">
                          Business Address
                        </label>
                        <input
                          id="address"
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="123 Main St, City, State ZIP"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Business Logo
                        </label>
                        <div className="flex items-center space-x-4">
                          <div className="relative w-16 h-16 rounded-full overflow-hidden">
                            <Image
                              src={provider.profileImage}
                              alt={provider.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                            aria-label="Change business logo"
                          >
                            Change Logo
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
                          src={provider.profileImage}
                          alt={provider.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{provider.name}</h3>
                        <p className="text-gray-600">Member since {provider.joinDate}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex space-x-3 items-start">
                        <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Email Address</p>
                          <p className="font-medium">{provider.email}</p>
                        </div>
                      </div>

                      <div className="flex space-x-3 items-start">
                        <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Phone Number</p>
                          <p className="font-medium">{provider.phone}</p>
                        </div>
                      </div>

                      <div className="flex space-x-3 items-start">
                        <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Business Address</p>
                          <p className="font-medium">{provider.address}</p>
                        </div>
                      </div>

                      <div className="flex space-x-3 items-start">
                        <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Member Since</p>
                          <p className="font-medium">{provider.joinDate}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-3">Service Areas</h3>
                      <div className="flex flex-wrap gap-2">
                        {provider.serviceAreas.map((area, index) => (
                          <span key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                            {area}
                          </span>
                        ))}
                        <button className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1" aria-label="Add service area">
                          <span>+</span>
                          <span>Add Area</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-3">Business Hours</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(provider.businessHours).map(([day, hours]) => (
                          <div key={day} className="flex justify-between items-center border-b pb-2">
                            <span className="capitalize">{day}</span>
                            <span>
                              {hours.start && hours.end 
                                ? `${hours.start} - ${hours.end}` 
                                : 'Closed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Service Offerings Tab */}
            {activeTab === 'services' && (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-semibold">Service Offerings</h2>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    aria-label="Add new service offering"
                  >
                    Add Service
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Service
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price Type
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {provider.services.map((service) => (
                          <tr key={service.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{service.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              ${service.price}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="capitalize">{service.priceType}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button className="text-blue-600 hover:text-blue-900 mr-3" aria-label={`Edit ${service.name} service`}>
                                Edit
                              </button>
                              <button className="text-red-600 hover:text-red-900" aria-label={`Delete ${service.name} service`}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-500">
                        <FileCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-medium text-blue-800">Pro Tip: Service Descriptions</h3>
                        <p className="text-gray-600 mt-1">
                          Detailed service descriptions and transparent pricing help homeowners make
                          informed decisions and can lead to more service requests.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="current-password">
                          Current Password
                        </label>
                        <input
                          id="current-password"
                          type="password"
                          className="w-full p-2 border border-gray-300 rounded-md"
                          aria-label="Current password"
                          placeholder="Enter your current password"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="new-password">
                          New Password
                        </label>
                        <input
                          id="new-password"
                          type="password"
                          className="w-full p-2 border border-gray-300 rounded-md"
                          aria-label="New password"
                          placeholder="Enter new password"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirm-password">
                          Confirm New Password
                        </label>
                        <input
                          id="confirm-password"
                          type="password"
                          className="w-full p-2 border border-gray-300 rounded-md"
                          aria-label="Confirm new password"
                          placeholder="Confirm new password"
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
                          <p className="font-medium">Bid Requests</p>
                          <p className="text-sm text-gray-600">
                            Notifications about new service requests in your area
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={provider.notificationPrefs.email.bidRequests}
                            onChange={() => handleToggleChange('email', 'bidRequests')}
                            aria-label="Toggle bid request email notifications"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Job Updates</p>
                          <p className="text-sm text-gray-600">
                            Notifications about your scheduled and in-progress jobs
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={provider.notificationPrefs.email.jobUpdates}
                            onChange={() => handleToggleChange('email', 'jobUpdates')}
                            aria-label="Toggle job updates email notifications"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Payment Notifications</p>
                          <p className="text-sm text-gray-600">
                            Notifications about payments received or processed
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={provider.notificationPrefs.email.paymentNotifications}
                            onChange={() => handleToggleChange('email', 'paymentNotifications')}
                            aria-label="Toggle payment email notifications"
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
                            checked={provider.notificationPrefs.email.promotions}
                            onChange={() => handleToggleChange('email', 'promotions')}
                            aria-label="Toggle promotions email notifications"
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
                          <p className="font-medium">Bid Requests</p>
                          <p className="text-sm text-gray-600">
                            Notifications about new service requests in your area
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={provider.notificationPrefs.push.bidRequests}
                            onChange={() => handleToggleChange('push', 'bidRequests')}
                            aria-label="Toggle bid request push notifications"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Job Updates</p>
                          <p className="text-sm text-gray-600">
                            Notifications about your scheduled and in-progress jobs
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={provider.notificationPrefs.push.jobUpdates}
                            onChange={() => handleToggleChange('push', 'jobUpdates')}
                            aria-label="Toggle job updates push notifications"
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
                            checked={provider.notificationPrefs.push.messages}
                            onChange={() => handleToggleChange('push', 'messages')}
                            aria-label="Toggle message push notifications"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Payment Notifications</p>
                          <p className="text-sm text-gray-600">
                            Notifications about payments received or processed
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={provider.notificationPrefs.push.paymentNotifications}
                            onChange={() => handleToggleChange('push', 'paymentNotifications')}
                            aria-label="Toggle payment push notifications"
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
                    aria-label="Add a new payment method"
                  >
                    Add Payment Method
                  </button>
                </div>

                <div className="space-y-4">
                  {provider.paymentMethods.map((method) => (
                    <div key={method.id} className="border rounded-lg p-4 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                          {method.type === 'bank' ? (
                            <Home className="h-6 w-6 text-blue-600" />
                          ) : (
                            <CreditCard className={`h-6 w-6 ${method.brand === 'Visa' ? 'text-blue-600' : 'text-red-600'}`} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {method.type === 'bank' 
                              ? `${method.bankName} Bank •••• ${method.accountLast4}`
                              : `${method.brand} •••• ${method.last4}`
                            }
                            {method.isDefault && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            {method.type === 'bank' 
                              ? 'Direct Deposit'
                              : `Expires ${method.expiry}`
                            }
                          </p>
                        </div>
                      </div>
                      <div>
                        <button className="text-gray-600 hover:text-gray-800" aria-label={`Remove payment method ending in ${method.type === 'bank' ? method.accountLast4 : method.last4}`}>
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-medium mb-2">Payout Schedule</h3>
                    <p className="text-gray-600 mb-4">
                      You are currently set up for weekly payouts. Funds are typically deposited within 1-2 business days after the end of each week.
                    </p>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Change Payout Schedule
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
                      service history, and business records.
                    </p>
                    <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                      Request Data Export
                    </button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Deactivate Account</h3>
                    <p className="text-gray-600 mb-4">
                      Temporarily deactivate your account. Your profile will be hidden from homeowners,
                      and you won't receive any service requests. You can reactivate at any time by logging in.
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
                          Any pending jobs will be cancelled.
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