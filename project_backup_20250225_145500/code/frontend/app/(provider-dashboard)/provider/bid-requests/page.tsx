import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, MapPin, Home, ChevronRight, Filter, Search } from 'lucide-react';

export default function ProviderBidRequestsPage() {
  // This would be fetched from API in production
  const bidRequests = [
    {
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
      description: 'Weekly lawn mowing service including edging. The lawn area is approximately 2,500 sq ft.',
      frequency: 'weekly',
      bidsReceived: 2,
      bidDueBy: '2023-07-01'
    },
    {
      id: 2,
      service: 'Window Cleaning',
      requestedDate: '2023-07-15',
      requestedOn: '2023-06-26',
      property: {
        address: '456 Elm St',
        city: 'Lake Tahoe',
        state: 'CA',
        zipCode: '96150',
        type: 'Residential',
        size: 3200
      },
      description: 'All exterior windows need cleaning, including screens. Two-story home with 18 windows total.',
      frequency: 'one-time',
      bidsReceived: 3,
      bidDueBy: '2023-07-03'
    },
    {
      id: 3,
      service: 'Gutter Cleaning',
      requestedDate: '2023-07-20',
      requestedOn: '2023-06-25',
      property: {
        address: '789 Pine St',
        city: 'Lake Tahoe',
        state: 'CA',
        zipCode: '96150',
        type: 'Residential',
        size: 2800
      },
      description: 'Gutter cleaning for a single-story home, approximately 180 linear feet of gutters.',
      frequency: 'one-time',
      bidsReceived: 1,
      bidDueBy: '2023-07-02'
    },
    {
      id: 4,
      service: 'HVAC Maintenance',
      requestedDate: '2023-08-05',
      requestedOn: '2023-06-24',
      property: {
        address: '101 Cedar Ln',
        city: 'Lake Tahoe',
        state: 'CA',
        zipCode: '96150',
        type: 'Residential',
        size: 3500
      },
      description: 'Annual HVAC maintenance and filter replacement. System is a Trane XR90 installed in 2018.',
      frequency: 'yearly',
      bidsReceived: 0,
      bidDueBy: '2023-07-08'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link 
          href="/provider" 
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bid Requests</h1>
        <div className="flex space-x-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search requests..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {bidRequests.map((request) => (
          <div key={request.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">{request.service}</h2>
                <div className="text-gray-600 flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>{request.property.address}, {request.property.city}, {request.property.state}</span>
                </div>
              </div>
              <Link
                href={`/provider/bid-requests/${request.id}`}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                <span className="text-sm font-medium">View Details</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div>
                    <div className="text-gray-600 text-sm">Service Type</div>
                    <div className="font-medium">{request.service}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-sm">Property Type</div>
                    <div className="font-medium">{request.property.type} • {request.property.size} sq ft</div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-sm">Frequency</div>
                    <div className="font-medium capitalize">{request.frequency}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <div>
                      <div className="text-gray-600 text-sm">Requested Date</div>
                      <div className="font-medium">{request.requestedDate}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <div>
                      <div className="text-gray-600 text-sm">Bids Due By</div>
                      <div className="font-medium">{request.bidDueBy}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Home className="h-5 w-5 text-gray-500" />
                    <div>
                      <div className="text-gray-600 text-sm">Bids Received</div>
                      <div className="font-medium">{request.bidsReceived}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-gray-600 text-sm mb-2">Service Details</div>
                  <p className="text-gray-800 text-sm line-clamp-3">{request.description}</p>
                  
                  <div className="mt-4">
                    <Link
                      href={`/provider/bid-requests/${request.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-block"
                    >
                      Submit Bid
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 