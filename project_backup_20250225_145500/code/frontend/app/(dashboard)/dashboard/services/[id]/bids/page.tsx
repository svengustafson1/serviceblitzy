import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, ThumbsUp, Award, Calendar, Clock, DollarSign, CheckCircle } from 'lucide-react';

export default function ServiceBidsPage({ params }: { params: { id: string } }) {
  // This would be fetched from API using params.id in production
  const serviceRequest = {
    id: 1,
    service: 'Lawn Mowing',
    property: '123 Main St, Lake Tahoe, CA',
    requestDate: '2023-06-20',
    preferredDate: '2023-07-05',
    description: 'Weekly lawn mowing service including edging. The lawn area is approximately 2,500 sq ft.',
    status: 'bidding'
  };

  // Bids would be fetched from API
  const bids = [
    {
      id: 1,
      providerId: 101,
      providerName: 'Green Lawns LLC',
      providerRating: 4.8,
      totalReviews: 45,
      price: 65.00,
      estimatedHours: 1.5,
      description: 'Complete lawn mowing service including edging and cleanup. We use eco-friendly equipment and remove all clippings.',
      availability: ['2023-07-05', '2023-07-06', '2023-07-07'],
      isAIRecommended: true,
      recommendationReason: 'Best value considering rating and price'
    },
    {
      id: 2,
      providerId: 102,
      providerName: 'Premium Landscaping',
      providerRating: 4.9,
      totalReviews: 78,
      price: 85.00,
      estimatedHours: 2,
      description: "Professional lawn care using commercial-grade equipment. We'll edge, mow, and clean up. All our technicians are certified landscapers.",
      availability: ['2023-07-05', '2023-07-08'],
      isAIRecommended: false
    },
    {
      id: 3,
      providerId: 103,
      providerName: 'Budget Lawn Care',
      providerRating: 4.2,
      totalReviews: 23,
      price: 50.00,
      estimatedHours: 1,
      description: "Basic lawn mowing service at an affordable price. We'll get the job done quickly and efficiently.",
      availability: ['2023-07-06', '2023-07-07', '2023-07-09'],
      isAIRecommended: false
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/dashboard/services/${params.id}`}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Service Details</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-5 border-b">
          <h1 className="text-2xl font-bold">{serviceRequest.service} Bids</h1>
          <p className="text-gray-600 mt-1">{serviceRequest.property}</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Service Request Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Preferred Date</div>
                    <div className="text-gray-600">{serviceRequest.preferredDate}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Requested On</div>
                    <div className="text-gray-600">{serviceRequest.requestDate}</div>
                  </div>
                </div>
                {serviceRequest.description && (
                  <div className="border-t pt-3 mt-3">
                    <div className="font-medium mb-1">Description</div>
                    <p className="text-gray-600">{serviceRequest.description}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="md:border-l md:pl-6">
              <h2 className="text-lg font-semibold mb-3">About This Process</h2>
              <div className="text-sm text-gray-600 space-y-3">
                <p>You have received {bids.length} bids for this service. Our AI has analyzed them based on provider ratings, price, and availability to recommend the best option.</p>
                <p>You can accept a bid to schedule the service, or request more information from any provider.</p>
                <p className="font-medium">What happens after you accept a bid:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>The provider will be notified</li>
                  <li>You'll be able to communicate directly with them</li>
                  <li>Your card will be charged only after the service is completed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Compare Bids</h2>
        
        {bids.map((bid) => (
          <div 
            key={bid.id} 
            className={`bg-white rounded-xl shadow-sm overflow-hidden ${
              bid.isAIRecommended ? 'border-2 border-green-500' : ''
            }`}
          >
            {bid.isAIRecommended && (
              <div className="bg-green-500 text-white px-6 py-2 flex items-center justify-center">
                <Award className="h-5 w-5 mr-2" />
                <span className="font-medium">AI Recommended</span>
                {bid.recommendationReason && (
                  <span className="ml-2 text-sm">• {bid.recommendationReason}</span>
                )}
              </div>
            )}
            
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{bid.providerName}</h3>
                  <div className="flex items-center mt-1">
                    <div className="flex text-yellow-400">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="ml-1 text-gray-800">{bid.providerRating}</span>
                    </div>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-gray-600 text-sm">{bid.totalReviews} reviews</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">${bid.price.toFixed(2)}</div>
                  <div className="text-gray-600 text-sm">Est. {bid.estimatedHours} {bid.estimatedHours === 1 ? 'hour' : 'hours'}</div>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-1">Bid Description</h4>
                <p className="text-gray-600 text-sm">{bid.description}</p>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-1">Available Dates</h4>
                <div className="flex flex-wrap gap-2">
                  {bid.availability.map((date, index) => (
                    <span 
                      key={index} 
                      className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full"
                    >
                      {date}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 flex justify-between">
                <div>
                  <Link
                    href={`/dashboard/providers/${bid.providerId}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View Provider Profile
                  </Link>
                </div>
                <div className="flex gap-3">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-50">
                    Ask a Question
                  </button>
                  <button className="bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg px-4 py-2 text-sm flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accept Bid
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 