import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import Image from 'next/image';

export default function EditPropertyPage({ params }: { params: { id: string } }) {
  // In a real application, this would fetch the property data from an API
  // For now, we'll use mock data
  const propertyId = parseInt(params.id);
  
  // Mock property data lookup - in production this would be an API call
  const property = {
    id: propertyId,
    address: '123 Main Street',
    city: 'Minneapolis',
    state: 'MN',
    zipCode: '55401',
    propertyType: 'Residential',
    propertySize: 2500,
    image: '/images/property-placeholder-1.jpg',
    notes: 'Two-story home with attached garage.'
  };

  // If property not found, show 404
  if (!property) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link 
          href={`/dashboard/properties/${propertyId}`} 
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Property Details
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-6">Edit Property</h1>
        
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Address */}
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                defaultValue={property.address}
                required
              />
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                defaultValue={property.city}
                required
              />
            </div>

            {/* State */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  id="state"
                  name="state"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  defaultValue={property.state}
                  required
                >
                  <option value="">Select State</option>
                  <option value="MN">Minnesota</option>
                  <option value="WI">Wisconsin</option>
                  <option value="IA">Iowa</option>
                  <option value="ND">North Dakota</option>
                  <option value="SD">South Dakota</option>
                  {/* Add more states as needed */}
                </select>
              </div>

              {/* Zip Code */}
              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  defaultValue={property.zipCode}
                  required
                />
              </div>
            </div>

            {/* Property Type */}
            <div>
              <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">
                Property Type
              </label>
              <select
                id="propertyType"
                name="propertyType"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                defaultValue={property.propertyType}
                required
              >
                <option value="">Select Type</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Vacation Rental">Vacation Rental</option>
                <option value="Multi-Family">Multi-Family</option>
              </select>
            </div>

            {/* Property Size */}
            <div>
              <label htmlFor="propertySize" className="block text-sm font-medium text-gray-700 mb-1">
                Property Size (sq. ft.)
              </label>
              <input
                type="number"
                id="propertySize"
                name="propertySize"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                defaultValue={property.propertySize}
              />
            </div>

            {/* Current Property Image */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Property Image
              </label>
              <div className="mt-1 relative h-48 w-full rounded-md overflow-hidden">
                <Image
                  src={property.image}
                  alt={property.address}
                  fill
                  sizes="(max-width: 768px) 100vw, 100%"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Property Image Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Update Property Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a new image</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                defaultValue={property.notes}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Link
              href={`/dashboard/properties/${propertyId}`}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 