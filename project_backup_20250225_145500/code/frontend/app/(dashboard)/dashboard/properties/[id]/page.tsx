import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, QrCode, Home, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function PropertyDetailsPage({ params }: { params: { id: string } }) {
  // This would be fetched from API using params.id in production
  const property = {
    id: 1,
    address: '123 Main St',
    city: 'Lake Tahoe',
    state: 'CA',
    zipCode: '96150',
    propertyType: 'Residential',
    propertySize: 2500,
    notes: 'Two-story home with attached garage. The snow removal service should include the driveway and front walkway.',
    qrCodeUrl: '/qr-codes/property-1.png',
    createdAt: '2023-05-15',
  };

  // Service history would be fetched from API
  const serviceHistory = [
    {
      id: 1,
      service: 'Lawn Mowing',
      status: 'completed',
      completedDate: '2023-06-15',
      provider: 'Green Lawns LLC',
      cost: 75.00
    },
    {
      id: 2,
      service: 'Window Cleaning',
      status: 'completed',
      completedDate: '2023-06-01',
      provider: 'Crystal Clear Windows',
      cost: 120.00
    },
    {
      id: 3,
      service: 'Gutter Cleaning',
      status: 'scheduled',
      scheduledDate: '2023-07-10',
      provider: 'Gutter Pros',
      cost: 95.00
    },
    {
      id: 4,
      service: 'HVAC Maintenance',
      status: 'pending',
      requestDate: '2023-06-20',
      bids: 2
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/properties"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Properties</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-5 border-b flex justify-between items-center">
          <h1 className="text-2xl font-bold">{property.address}</h1>
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/properties/${property.id}/edit`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-gray-100"
            >
              <Edit className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Edit</span>
            </Link>
            <Link
              href={`/dashboard/properties/${property.id}/qr-code`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-gray-100"
            >
              <QrCode className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">View QR Code</span>
            </Link>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Property Details</h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <MapPin className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{property.address}</div>
                    <div className="text-gray-600">
                      {property.city}, {property.state} {property.zipCode}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Home className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Property Information</div>
                    <div className="text-gray-600">
                      {property.propertyType} • {property.propertySize} sq ft
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="font-medium mb-1">Additional Notes</div>
                  <p className="text-gray-600">{property.notes}</p>
                </div>
              </div>
            </div>

            <div className="md:border-l md:pl-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link 
                  href={`/dashboard/services/new?propertyId=${property.id}`}
                  className="flex justify-between items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  <span className="font-medium">Request New Service</span>
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                </Link>
                <Link 
                  href={`/dashboard/properties/${property.id}/services`}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span className="font-medium">View All Services</span>
                  <ArrowRight className="h-5 w-5 text-gray-600" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Service History</h2>
        </div>
        
        <div className="divide-y">
          {serviceHistory.length > 0 ? (
            serviceHistory.map((service) => (
              <div key={service.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{service.service}</div>
                  <div className="text-sm text-gray-600">
                    {service.status === 'completed' && (
                      <>Completed on {service.completedDate} by {service.provider}</>
                    )}
                    {service.status === 'scheduled' && (
                      <>Scheduled for {service.scheduledDate} with {service.provider}</>
                    )}
                    {service.status === 'pending' && (
                      <>Requested on {service.requestDate} • {service.bids} bids received</>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  {service.status === 'completed' && (
                    <div className="flex items-center text-green-600 mr-4">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span>Completed</span>
                    </div>
                  )}
                  {service.status === 'scheduled' && (
                    <div className="flex items-center text-blue-600 mr-4">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Scheduled</span>
                    </div>
                  )}
                  {service.status === 'pending' && (
                    <div className="flex items-center text-yellow-600 mr-4">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>Pending</span>
                    </div>
                  )}
                  {service.cost && (
                    <div className="text-gray-700 font-medium">${service.cost.toFixed(2)}</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">No service history available for this property</p>
              <Link 
                href={`/dashboard/services/new?propertyId=${property.id}`}
                className="mt-3 inline-block text-blue-600 hover:text-blue-800"
              >
                Request your first service
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
} 