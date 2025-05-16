import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Clock, ArrowRight, Check } from 'lucide-react';

// Service categories data - in a real app this would be fetched from an API
const serviceCategories = [
  {
    id: 1,
    name: 'Lawn Care',
    description: 'Keep your lawn looking beautiful with our professional lawn care services.',
    slug: 'lawn-care',
    longDescription: 'Our lawn care professionals provide comprehensive services to keep your lawn healthy and beautiful year-round. From regular mowing to specialized treatments, we offer customized solutions for lawns of all sizes.',
    services: [
      { id: 101, name: 'Lawn Mowing', price: 'from $40', time: '1-2 hours', description: 'Regular lawn mowing service including edging and cleanup.' },
      { id: 102, name: 'Fertilization', price: 'from $80', time: '1 hour', description: 'Specialized fertilization treatment to keep your lawn lush and green.' },
      { id: 103, name: 'Weed Control', price: 'from $60', time: '1 hour', description: 'Targeted treatment to eliminate weeds without harming your lawn.' },
      { id: 104, name: 'Lawn Aeration', price: 'from $120', time: '2-3 hours', description: 'Core aeration to improve soil drainage and promote healthy root growth.' },
    ],
    benefits: [
      'Professionally maintained lawn enhances curb appeal',
      'Regular maintenance prevents costly problems',
      'Environmentally responsible products and methods',
      'Customized care plans for your specific lawn type',
    ]
  },
  {
    id: 2,
    name: 'Cleaning',
    description: 'Professional cleaning services for your home, from regular maintenance to deep cleaning.',
    slug: 'cleaning',
    longDescription: 'Our cleaning services are designed to keep your home spotless and healthy. Whether you need regular maintenance cleaning or a one-time deep clean, our professional cleaners use premium products and methods to ensure exceptional results.',
    services: [
      { id: 201, name: 'House Cleaning', price: 'from $120', time: '2-4 hours', description: 'Comprehensive cleaning of your entire home, including kitchens, bathrooms, and living areas.' },
      { id: 202, name: 'Window Cleaning', price: 'from $80', time: '1-3 hours', description: 'Interior and exterior window cleaning for crystal clear views.' },
      { id: 203, name: 'Carpet Cleaning', price: 'from $100', time: '2-3 hours', description: 'Deep cleaning of carpets to remove stains, allergens, and odors.' },
      { id: 204, name: 'Deep Cleaning', price: 'from $200', time: '4-6 hours', description: 'Intensive cleaning of your entire home, including hard-to-reach areas and detailed attention.' },
    ],
    benefits: [
      'Save time and energy with professional cleaning',
      'Improve indoor air quality and reduce allergens',
      'Eco-friendly cleaning products available upon request',
      'Flexible scheduling options to fit your lifestyle',
    ]
  },
  {
    id: 3,
    name: 'Exterior Maintenance',
    description: "Keep your home's exterior in top condition with our maintenance services.",
    slug: 'exterior-maintenance',
    longDescription: "Protect your investment with our comprehensive exterior maintenance services. From gutters to siding, our professionals will keep your home's exterior in excellent condition, preventing costly damage and maintaining curb appeal.",
    services: [
      { id: 301, name: 'Gutter Cleaning', price: 'from $100', time: '1-2 hours', description: 'Remove debris from gutters to prevent water damage and maintain proper drainage.' },
      { id: 302, name: 'Power Washing', price: 'from $150', time: '2-3 hours', description: 'High-pressure cleaning of exterior surfaces to remove dirt, mold, and mildew.' },
      { id: 303, name: 'Siding Repair', price: 'from $200', time: '3-6 hours', description: "Repair damaged siding to maintain your home's appearance and weather resistance." },
      { id: 304, name: 'Roof Inspection', price: 'from $120', time: '1-2 hours', description: 'Professional inspection to identify potential roof issues before they become major problems.' },
    ],
    benefits: [
      'Prevent costly water damage and structural issues',
      "Extend the life of your home's exterior components",
      'Enhance curb appeal and property value',
      'Regular maintenance is more cost-effective than emergency repairs',
    ]
  },
  {
    id: 4,
    name: 'HVAC',
    description: 'Heating, ventilation, and air conditioning services to keep your home comfortable year-round.',
    slug: 'hvac',
    longDescription: 'Our HVAC services ensure your home stays comfortable in every season. From routine maintenance to emergency repairs, our certified technicians provide reliable service for all your heating and cooling needs.',
    services: [
      { id: 401, name: 'AC Maintenance', price: 'from $100', time: '1-2 hours', description: 'Regular maintenance to keep your air conditioning system running efficiently.' },
      { id: 402, name: 'Furnace Repair', price: 'from $150', time: '1-3 hours', description: 'Diagnostic and repair services for all types of heating systems.' },
      { id: 403, name: 'Duct Cleaning', price: 'from $200', time: '3-4 hours', description: 'Remove dust, allergens, and debris from your ductwork for better air quality.' },
      { id: 404, name: 'Thermostat Installation', price: 'from $80', time: '1 hour', description: 'Install or upgrade to a programmable or smart thermostat for better control and efficiency.' },
    ],
    benefits: [
      'Improve energy efficiency and reduce utility bills',
      'Extend the lifespan of your HVAC equipment',
      'Enhance indoor air quality and comfort',
      'Prevent unexpected breakdowns with regular maintenance',
    ]
  },
  {
    id: 5,
    name: 'Gardening',
    description: 'Professional gardening services to make your outdoor spaces beautiful and thriving.',
    slug: 'gardening',
    longDescription: 'Transform your outdoor spaces with our professional gardening services. Whether you need help with planting, maintenance, or landscape design, our experienced gardeners can help create and maintain beautiful gardens that enhance your property.',
    services: [
      { id: 501, name: 'Garden Planting', price: 'from $120', time: '2-4 hours', description: 'Design and plant new garden areas with flowers, shrubs, and other plants.' },
      { id: 502, name: 'Tree Trimming', price: 'from $150', time: '2-3 hours', description: 'Professional trimming and pruning to maintain tree health and appearance.' },
      { id: 503, name: 'Flower Bed Maintenance', price: 'from $80', time: '1-2 hours', description: 'Regular maintenance of flower beds, including weeding, mulching, and plant care.' },
      { id: 504, name: 'Mulching', price: 'from $100', time: '1-2 hours', description: 'Apply fresh mulch to garden beds to improve appearance, retain moisture, and reduce weeds.' },
    ],
    benefits: [
      "Enhance your property's curb appeal and value",
      'Create healthy, vibrant outdoor spaces for enjoyment',
      'Save time with professional garden maintenance',
      'Get expert advice on plant selection and care',
    ]
  },
  {
    id: 6,
    name: 'Waterfront',
    description: 'Specialized maintenance services for waterfront properties and features.',
    slug: 'waterfront',
    longDescription: 'Our waterfront services address the unique maintenance needs of lakefront, riverfront, and oceanfront properties. From dock maintenance to erosion control, our specialists help protect and enhance your waterfront investment.',
    services: [
      { id: 601, name: 'Dock Maintenance', price: 'from $200', time: '2-4 hours', description: 'Inspection and maintenance of docks, including repairs, cleaning, and preservation treatments.' },
      { id: 602, name: 'Seawall Inspection', price: 'from $150', time: '1-2 hours', description: 'Professional inspection of seawalls and bulkheads to identify potential issues.' },
      { id: 603, name: 'Beach Cleanup', price: 'from $120', time: '2-3 hours', description: 'Cleaning and maintenance of private beach areas, including debris removal and sand grooming.' },
      { id: 604, name: 'Waterfront Landscaping', price: 'from $180', time: '3-6 hours', description: 'Specialized landscaping designed for waterfront properties, including erosion control and water-friendly plants.' },
    ],
    benefits: [
      'Protect your waterfront investment from erosion and damage',
      'Improve safety and usability of waterfront features',
      'Environmentally responsible maintenance practices',
      'Enhance enjoyment of your waterfront property',
    ]
  },
];

export default function ServiceCategoryPage({ params }: { params: { slug: string } }) {
  // Find the service category based on the slug
  const category = serviceCategories.find(cat => cat.slug === params.slug);

  // If category doesn't exist, could handle with a 404 page
  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Service category not found</h1>
          <p className="mt-2 text-lg text-gray-600">The requested service category does not exist.</p>
          <Link href="/services" className="mt-6 inline-block text-blue-600 hover:text-blue-800">
            View all services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Background Image */}
      <div className="relative bg-blue-600 text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src={`/images/${category.slug}.jpg`}
            alt={category.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
          <div className="mb-8">
            <Link href="/services" className="flex items-center text-white hover:text-blue-100">
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back to All Services
            </Link>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">{category.name}</h1>
          <p className="mt-4 text-xl max-w-3xl">{category.longDescription}</p>
        </div>
      </div>
      
      {/* Services List */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Available Services</h2>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-12">
          <ul className="divide-y divide-gray-200">
            {category.services.map((service) => (
              <li key={service.id}>
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between flex-wrap sm:flex-nowrap">
                    <div>
                      <h3 className="text-lg font-medium text-blue-600">{service.name}</h3>
                      <p className="mt-1 text-sm text-gray-600">{service.description}</p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row items-end sm:items-center sm:space-x-4">
                      <div className="flex items-center text-sm text-gray-500 mr-4">
                        <Clock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {service.time}
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {service.price}
                      </div>
                      <Link
                        href={`/login?redirect=/dashboard/services/new`}
                        className="ml-3 mt-2 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Request Service
                        <ArrowRight className="ml-2 -mr-1 h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Benefits Section */}
        <div className="bg-blue-50 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Benefits</h2>
          <ul className="space-y-3">
            {category.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start">
                <div className="flex-shrink-0">
                  <Check className="h-6 w-6 text-green-500" />
                </div>
                <p className="ml-3 text-base text-gray-700">{benefit}</p>
              </li>
            ))}
          </ul>
        </div>
        
        {/* CTA Section */}
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Ready to get started?</h2>
          <p className="mt-2 text-lg text-gray-600 max-w-3xl mx-auto">
            Log in or create an account to request service, compare bids, and manage your home's maintenance needs.
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
  );
} 