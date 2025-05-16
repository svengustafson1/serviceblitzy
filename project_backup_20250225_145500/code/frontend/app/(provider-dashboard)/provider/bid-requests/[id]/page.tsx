'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, MapPin, Home, Info, CheckCircle, DollarSign } from 'lucide-react';

export default function BidSubmissionPage({ params }: { params: { id: string } }) {
  // This would be fetched from API using params.id in production
  const bidRequest = {
    id: 1,
    service: 'Lawn Mowing',
    requestedDate: '2023-07-10',
    requestedOn: '2023-06-27',
    property: {
      address: '123 Main St',
      city: 'Lake Tahoe',
      state: 'CA',
      zipCode: '96150',
      type: 'Residential',
      size: 2500
    },
    description: 'Weekly lawn mowing service including edging. The lawn area is approximately 2,500 sq ft. Please include leaf removal and cleanup in the service.',
    frequency: 'weekly',
    bidsReceived: 2,
    bidDueBy: '2023-07-01',
    customerNotes: 'I prefer service in the afternoon, if possible. The gate code is 1234.'
  };

  // Add state for tracking availability selections
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  
  // Handler for checkbox changes
  const handleAvailabilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (e.target.checked) {
      // Add the date to the selected dates
      setSelectedDates(prev => [...prev, value]);
    } else {
      // Remove the date from selected dates
      setSelectedDates(prev => prev.filter(date => date !== value));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link 
          href="/provider/bid-requests" 
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bid Requests
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-5 border-b">
          <h1 className="text-2xl font-bold">{bidRequest.service} Request</h1>
          <div className="text-gray-600 flex items-center gap-1 mt-1">
            <MapPin className="h-4 w-4" />
            <span>{bidRequest.property.address}, {bidRequest.property.city}, {bidRequest.property.state}</span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Service Details</h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Requested Date</div>
                    <div className="text-gray-600">{bidRequest.requestedDate}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Clock className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Bids Due By</div>
                    <div className="text-gray-600">{bidRequest.bidDueBy}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Home className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Property Info</div>
                    <div className="text-gray-600">
                      {bidRequest.property.type} • {bidRequest.property.size} sq ft
                    </div>
                  </div>
                </div>
                {bidRequest.description && (
                  <div className="pt-4 border-t">
                    <div className="font-medium mb-1">Service Description</div>
                    <p className="text-gray-600">{bidRequest.description}</p>
                  </div>
                )}
                {bidRequest.customerNotes && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="font-medium mb-1 flex items-center gap-1">
                      <Info className="h-4 w-4 text-yellow-600" />
                      <span>Customer Notes</span>
                    </div>
                    <p className="text-gray-600">{bidRequest.customerNotes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="md:border-l md:pl-6">
              <h2 className="text-lg font-semibold mb-4">Bid Information</h2>
              <div className="text-sm text-gray-600 space-y-2 mb-6">
                <p>You are submitting a bid for {bidRequest.service}. Your bid should include all costs, materials, and labor required to complete the job.</p>
                <p>The homeowner has requested {bidRequest.frequency} service. Pricing should reflect this frequency.</p>
                <p>Bids must be submitted by {bidRequest.bidDueBy}.</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="font-medium text-blue-800 mb-2">Bidding Tips:</div>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Be clear and detailed in your description</li>
                  <li>Specify what is included in your price</li>
                  <li>Mention your availability</li>
                  <li>Highlight relevant experience or skills</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b">
          <h2 className="text-xl font-semibold">Submit Your Bid</h2>
        </div>

        <div className="p-6">
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Bid Amount ($)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="bidAmount"
                    name="bidAmount"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  id="estimatedHours"
                  name="estimatedHours"
                  step="0.5"
                  placeholder="1.5"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Bid Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Describe the services you'll provide, including any materials or special equipment. Highlight any value-added services or guarantees."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Availability
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                  <input 
                    type="checkbox" 
                    name="availability" 
                    value="2023-07-10" 
                    checked={selectedDates.includes('2023-07-10')}
                    onChange={handleAvailabilityChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 mr-2" 
                  />
                  <span className="text-sm">July 10, 2023</span>
                </label>
                <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                  <input 
                    type="checkbox" 
                    name="availability" 
                    value="2023-07-11" 
                    checked={selectedDates.includes('2023-07-11')}
                    onChange={handleAvailabilityChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 mr-2" 
                  />
                  <span className="text-sm">July 11, 2023</span>
                </label>
                <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                  <input 
                    type="checkbox" 
                    name="availability" 
                    value="2023-07-12" 
                    checked={selectedDates.includes('2023-07-12')}
                    onChange={handleAvailabilityChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 mr-2" 
                  />
                  <span className="text-sm">July 12, 2023</span>
                </label>
                <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                  <input 
                    type="checkbox" 
                    name="availability" 
                    value="2023-07-13" 
                    checked={selectedDates.includes('2023-07-13')}
                    onChange={handleAvailabilityChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 mr-2" 
                  />
                  <span className="text-sm">July 13, 2023</span>
                </label>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end gap-4">
              <Link
                href="/provider/bid-requests"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <CheckCircle className="h-4 w-4" />
                Submit Bid
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 