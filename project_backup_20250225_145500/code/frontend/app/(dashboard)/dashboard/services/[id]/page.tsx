import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, AlertCircle, CheckCircle, MessageSquare, FileText, Home, DollarSign } from 'lucide-react';

export default function ServiceDetailsPage({ params }: { params: { id: string } }) {
  // This would be fetched from API using params.id in production
  const serviceRequest = {
    id: 1,
    service: 'Lawn Mowing',
    property: {
      id: 1,
      address: '123 Main St',
      city: 'Lake Tahoe',
      state: 'CA',
      zipCode: '96150'
    },
    status: 'bidding', // 'bidding', 'scheduled', 'in_progress', 'completed', 'cancelled'
    requestDate: '2023-06-20',
    preferredDate: '2023-07-05',
    description: 'Weekly lawn mowing service including edging. The lawn area is approximately 2,500 sq ft.',
    isRecurring: true,
    frequency: 'weekly',
    bids: 3,
    provider: null,
    scheduledDate: null,
    scheduledTime: null,
    completedDate: null,
    invoice: null
  };

  // This would be the timeline of events for this service request
  const timeline = [
    {
      id: 1,
      date: '2023-06-20',
      time: '10:32 AM',
      event: 'Service Requested',
      description: 'You requested lawn mowing service'
    },
    {
      id: 2,
      date: '2023-06-20',
      time: '11:45 AM',
      event: 'First Bid Received',
      description: 'Budget Lawn Care submitted a bid'
    },
    {
      id: 3,
      date: '2023-06-21',
      time: '09:15 AM',
      event: 'Bid Received',
      description: 'Green Lawns LLC submitted a bid'
    },
    {
      id: 4,
      date: '2023-06-22',
      time: '02:30 PM',
      event: 'Bid Received',
      description: 'Premium Landscaping submitted a bid'
    },
    {
      id: 5,
      date: '2023-06-22',
      time: '03:00 PM',
      event: 'AI Recommendation',
      description: 'Our AI analyzed all bids and recommended Green Lawns LLC'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/services"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Services</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-5 border-b flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{serviceRequest.service}</h1>
            <p className="text-gray-600 mt-1">
              {serviceRequest.property.address}, {serviceRequest.property.city}, {serviceRequest.property.state}
            </p>
          </div>
          <ServiceStatusBadge status={serviceRequest.status} />
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Service Details</h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Preferred Date</div>
                    <div className="text-gray-600">{serviceRequest.preferredDate}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Clock className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Requested On</div>
                    <div className="text-gray-600">{serviceRequest.requestDate}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Home className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Property</div>
                    <div className="text-gray-600">
                      <Link 
                        href={`/dashboard/properties/${serviceRequest.property.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Property
                      </Link>
                    </div>
                  </div>
                </div>
                {serviceRequest.isRecurring && (
                  <div className="flex gap-2">
                    <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Frequency</div>
                      <div className="text-gray-600 capitalize">{serviceRequest.frequency}</div>
                    </div>
                  </div>
                )}
                {serviceRequest.description && (
                  <div className="pt-4 border-t">
                    <div className="font-medium mb-1">Service Description</div>
                    <p className="text-gray-600">{serviceRequest.description}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Status & Actions</h2>
              <div className="space-y-4">
                {/* Different UI based on status */}
                {serviceRequest.status === 'bidding' && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex items-center text-yellow-800 font-medium mb-2">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>Waiting for you to select a bid</span>
                    </div>
                    <p className="text-sm text-yellow-700 mb-3">
                      You've received {serviceRequest.bids} bids for this service. Compare and select one to schedule the service.
                    </p>
                    <Link 
                      href={`/dashboard/services/${serviceRequest.id}/bids`}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg inline-block text-sm"
                    >
                      Review Bids
                    </Link>
                  </div>
                )}

                {serviceRequest.status === 'scheduled' && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center text-blue-800 font-medium mb-2">
                      <Clock className="h-5 w-5 mr-2" />
                      <span>Service Scheduled</span>
                    </div>
                    <p className="text-sm text-blue-700 mb-1">
                      Your service is scheduled for {serviceRequest.scheduledDate} at {serviceRequest.scheduledTime}.
                    </p>
                    <p className="text-sm text-blue-700 mb-3">
                      Provider: {serviceRequest.provider}
                    </p>
                    <Link
                      href={`/dashboard/messages?service=${serviceRequest.id}`}
                      className="text-blue-700 hover:text-blue-900 text-sm font-medium inline-flex items-center"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message Provider
                    </Link>
                  </div>
                )}

                {serviceRequest.status === 'completed' && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center text-green-800 font-medium mb-2">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span>Service Completed</span>
                    </div>
                    <p className="text-sm text-green-700 mb-1">
                      This service was completed on {serviceRequest.completedDate}.
                    </p>
                    <p className="text-sm text-green-700 mb-3">
                      Provider: {serviceRequest.provider}
                    </p>
                    <div className="flex space-x-4">
                      <Link
                        href={`/dashboard/invoices/${serviceRequest.invoice}`}
                        className="text-green-700 hover:text-green-900 text-sm font-medium inline-flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View Invoice
                      </Link>
                      <Link
                        href={`/dashboard/services/${serviceRequest.id}/review`}
                        className="text-green-700 hover:text-green-900 text-sm font-medium inline-flex items-center"
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Leave Review
                      </Link>
                    </div>
                  </div>
                )}

                {/* Button group */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm"
                  >
                    Cancel Request
                  </button>
                  <button
                    className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm"
                  >
                    Edit Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Timeline</h2>
        </div>
        
        <div className="p-6">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
            
            <div className="space-y-6">
              {timeline.map((event, index) => (
                <div key={event.id} className="relative flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center z-10">
                    {event.event.includes('Requested') && <Clock className="h-4 w-4 text-blue-600" />}
                    {event.event.includes('Bid') && <DollarSign className="h-4 w-4 text-blue-600" />}
                    {event.event.includes('AI') && <Sparkles className="h-4 w-4 text-blue-600" />}
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      {event.date} at {event.time}
                    </div>
                    <div className="font-medium">{event.event}</div>
                    <div className="text-gray-600 text-sm">{event.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'bidding':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Awaiting Bids
        </span>
      );
    case 'scheduled':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="h-3 w-3 mr-1" />
          Scheduled
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <PlayCircle className="h-3 w-3 mr-1" />
          In Progress
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>
      );
  }
}

// Additional icons needed
function Star(props: React.SVGProps<SVGSVGElement>) {
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
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function Sparkles(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M12 3v18" />
      <path d="M18.7 8.7l-9.4 9.4" />
      <path d="M5.3 14.3l9.4-9.4" />
      <path d="M12 20.8l-9.4-9.4" />
      <path d="M20.8 12L12 3.2" />
    </svg>
  );
}

function PlayCircle(props: React.SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  );
}

function XCircle(props: React.SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
} 