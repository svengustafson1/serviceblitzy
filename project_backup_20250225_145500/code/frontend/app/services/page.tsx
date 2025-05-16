import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Search } from 'lucide-react';

export default function ServicesPage() {
  // This would be fetched from the API in a real implementation
  const serviceCategories = [
    {
      id: 1,
      name: 'Lawn Care',
      description: 'Keep your lawn looking beautiful with our professional lawn care services.',
      slug: 'lawn-care',
      services: [
        { id: 101, name: 'Lawn Mowing', price: 'from $40' },
        { id: 102, name: 'Fertilization', price: 'from $80' },
        { id: 103, name: 'Weed Control', price: 'from $60' },
        { id: 104, name: 'Lawn Aeration', price: 'from $120' },
      ]
    },
    {
      id: 2,
      name: 'Cleaning',
      description: 'Professional cleaning services for your home, from regular maintenance to deep cleaning.',
      slug: 'cleaning',
      services: [
        { id: 201, name: 'House Cleaning', price: 'from $120' },
        { id: 202, name: 'Window Cleaning', price: 'from $80' },
        { id: 203, name: 'Carpet Cleaning', price: 'from $100' },
        { id: 204, name: 'Deep Cleaning', price: 'from $200' },
      ]
    },
    {
      id: 3,
      name: 'Exterior Maintenance',
      description: "Keep your home's exterior in top condition with our maintenance services.",
      slug: 'exterior-maintenance',
      services: [
        { id: 301, name: 'Gutter Cleaning', price: 'from $100' },
        { id: 302, name: 'Power Washing', price: 'from $150' },
        { id: 303, name: 'Siding Repair', price: 'from $200' },
        { id: 304, name: 'Roof Inspection', price: 'from $120' },
      ]
    },
    {
      id: 4,
      name: 'HVAC',
      description: 'Heating, ventilation, and air conditioning services to keep your home comfortable year-round.',
      slug: 'hvac',
      services: [
        { id: 401, name: 'AC Maintenance', price: 'from $100' },
        { id: 402, name: 'Furnace Repair', price: 'from $150' },
        { id: 403, name: 'Duct Cleaning', price: 'from $200' },
        { id: 404, name: 'Thermostat Installation', price: 'from $80' },
      ]
    },
    {
      id: 5,
      name: 'Gardening',
      description: 'Professional gardening services to make your outdoor spaces beautiful and thriving.',
      slug: 'gardening',
      services: [
        { id: 501, name: 'Garden Planting', price: 'from $120' },
        { id: 502, name: 'Tree Trimming', price: 'from $150' },
        { id: 503, name: 'Flower Bed Maintenance', price: 'from $80' },
        { id: 504, name: 'Mulching', price: 'from $100' },
      ]
    },
    {
      id: 6,
      name: 'Waterfront',
      description: 'Specialized maintenance services for waterfront properties and features.',
      slug: 'waterfront',
      services: [
        { id: 601, name: 'Dock Maintenance', price: 'from $200' },
        { id: 602, name: 'Seawall Inspection', price: 'from $150' },
        { id: 603, name: 'Beach Cleanup', price: 'from $120' },
        { id: 604, name: 'Waterfront Landscaping', price: 'from $180' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
          <div className="mb-8">
            <Link href="/" className="flex items-center text-white hover:text-blue-100">
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back to Home
            </Link>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Our Services</h1>
          <p className="mt-4 text-xl">
            Browse our comprehensive range of home services, all provided by trusted professionals.
          </p>

          <div className="mt-10 max-w-xl">
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-12 py-3 sm:text-sm border-gray-300 rounded-md text-gray-900"
                placeholder="Search for services..."
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <select
                  id="category"
                  name="category"
                  className="focus:ring-blue-500 focus:border-blue-500 h-full py-0 pl-2 pr-7 border-transparent bg-transparent text-gray-500 sm:text-sm rounded-md"
                >
                  <option>All Categories</option>
                  {serviceCategories.map(category => (
                    <option key={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="space-y-16">
          {serviceCategories.map((category) => (
            <div key={category.id} id={category.slug} className="scroll-mt-16">
              <div className="flex items-center mb-8">
                <div className="w-16 h-16 relative mr-4 overflow-hidden rounded-lg">
                  <Image
                    src={`/images/${category.slug}.jpg`}
                    alt={category.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 64px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{category.name}</h2>
                  <p className="text-gray-600 max-w-3xl mt-1">{category.description}</p>
                </div>
              </div>
              
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {category.services.map((service) => (
                    <li key={service.id}>
                      <Link 
                        href={`/login?redirect=/dashboard/services/new`} 
                        className="block hover:bg-gray-50"
                      >
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-medium text-blue-600 truncate">{service.name}</p>
                            <div className="ml-2 flex-shrink-0 flex">
                              <p className="px-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {service.price}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex justify-between">
                            <div className="sm:flex">
                              <p className="flex items-center text-sm text-gray-500">
                                Request this service by logging in or creating an account
                              </p>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                              <span className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium">
                                Request
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-blue-50 border-t border-blue-100">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Ready to get started?</h2>
            <p className="mt-4 text-lg text-gray-500">
              Create an account to request services, compare bids, and manage your home's maintenance needs.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/register"
                className="bg-blue-600 text-white px-5 py-3 rounded-md font-medium hover:bg-blue-700"
              >
                Sign up for free
              </Link>
              <Link
                href="/login"
                className="ml-4 bg-white text-blue-600 border border-blue-300 px-5 py-3 rounded-md font-medium hover:bg-blue-50"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 