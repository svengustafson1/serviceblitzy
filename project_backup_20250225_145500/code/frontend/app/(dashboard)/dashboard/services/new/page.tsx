import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function NewServiceRequestPage() {
  // This would be fetched from API in production
  const properties = [
    { id: 1, address: '123 Main Street, Minneapolis, MN 55401' },
    { id: 2, address: '456 Elm Avenue, St. Paul, MN 55102' }
  ];

  const serviceCategories = [
    {
      id: 1, 
      name: 'Lawn Care',
      description: 'Lawn mowing, fertilization, and more.',
      slug: 'lawn-care',
      services: [
        { id: 101, name: 'Lawn Mowing', price: '$40-80' },
        { id: 102, name: 'Lawn Fertilization', price: '$80-150' },
        { id: 103, name: 'Weed Control', price: '$60-120' }
      ]
    },
    {
      id: 2, 
      name: 'Cleaning',
      description: 'House cleaning, window washing, and more.',
      slug: 'cleaning',
      services: [
        { id: 201, name: 'House Cleaning', price: '$120-250' },
        { id: 202, name: 'Window Cleaning', price: '$80-200' },
        { id: 203, name: 'Carpet Cleaning', price: '$100-300' }
      ]
    },
    {
      id: 3, 
      name: 'Exterior Maintenance',
      description: 'Gutter cleaning, power washing, and repairs.',
      slug: 'exterior-maintenance',
      services: [
        { id: 301, name: 'Gutter Cleaning', price: '$100-200' },
        { id: 302, name: 'Power Washing', price: '$150-300' },
        { id: 303, name: 'Siding Repair', price: '$200-500' }
      ]
    },
    {
      id: 4, 
      name: 'HVAC',
      description: 'Heating, cooling, and ventilation services.',
      slug: 'hvac',
      services: [
        { id: 401, name: 'HVAC Maintenance', price: '$100-200' },
        { id: 402, name: 'AC Repair', price: '$150-400' },
        { id: 403, name: 'Furnace Cleaning', price: '$120-300' }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link 
          href="/dashboard/services" 
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Services
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-6">Request a Service</h1>
        
        <form className="space-y-8">
          {/* Property Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">1. Select a Property</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {properties.map((property) => (
                <label 
                  key={property.id} 
                  className="border rounded-lg p-4 cursor-pointer hover:border-blue-500 flex items-center space-x-3"
                >
                  <input
                    type="radio"
                    name="property"
                    value={property.id}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{property.address}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">2. Select a Service</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {serviceCategories.map((category) => (
                <div key={category.id} className="border rounded-lg overflow-hidden">
                  <div className="h-40 relative">
                    <Image
                      src={`/images/${category.slug}.jpg`}
                      alt={category.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/60 flex items-end">
                      <h3 className="text-white font-bold text-lg p-4">{category.name}</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-600 text-sm mb-4">{category.description}</p>
                    
                    <div className="space-y-2">
                      {category.services.map((service) => (
                        <label key={service.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="service"
                              value={service.id}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 mr-3"
                            />
                            <span>{service.name}</span>
                          </div>
                          <span className="text-sm text-gray-500">{service.price}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">3. Service Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="preferredDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Date
                </label>
                <input
                  type="date"
                  id="preferredDate"
                  name="preferredDate"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="isRecurring" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Frequency
                </label>
                <select
                  id="isRecurring"
                  name="isRecurring"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="one-time">One-time Service</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Description & Special Instructions
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Please provide any specific details or instructions for the service provider..."
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">How it works:</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Submit your service request</li>
              <li>Service providers will send you bids</li>
              <li>Our AI will help recommend the best bid for you</li>
              <li>You select a provider and schedule the service</li>
              <li>Pay securely through our platform after the job is complete</li>
            </ol>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Link
              href="/dashboard/services"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add some CSS for the toggle switch
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Request Service - HomeServices',
};

// This would normally be in a separate CSS file or styled component
const styles = `
  .toggle-bg:after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    background: white;
    border-radius: 50%;
    height: 16px;
    width: 16px;
    transition: transform 0.2s ease;
  }

  input:checked + .toggle-bg {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }

  input:checked + .toggle-bg:after {
    transform: translateX(100%);
  }
`;

// Note: In a real implementation, you would use client-side JavaScript
// to enable/disable the recurrence_frequency field based on the toggle state 