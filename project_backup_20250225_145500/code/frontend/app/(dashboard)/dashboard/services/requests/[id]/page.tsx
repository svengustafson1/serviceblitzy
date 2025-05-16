import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Clock, Star, Info, Shield, Award, Zap } from 'lucide-react';

export default function ViewBidsPage({ params }: { params: { id: string } }) {
  // Mock data - in a real app, this would be fetched from an API
  const serviceRequest = {
    id: params.id,
    service: 'Lawn Mowing',
    property: '123 Main Street, Minneapolis, MN 55401',
    requestDate: '2023-06-10',
    preferredDate: '2023-06-25',
    description: 'Need front and back lawn mowed. Back yard has some steep sections.',
    frequency: 'Weekly',
    status: 'awaiting_selection',
  };

  const bids = [
    {
      id: 101,
      providerId: 201,
      provider: 'Green Thumb Lawn Care',
      providerRating: 4.9,
      completedJobs: 245,
      memberSince: 'Jan 2020',
      avatar: '/images/providers/provider-1.jpg',
      amount: 55.00,
      estimatedDuration: '1.5 hours',
      availability: ['2023-06-24', '2023-06-25', '2023-06-26'],
      message: 'I can take care of your lawn mowing needs. I have experience with steep terrain and bring professional-grade equipment. I offer a 10% discount for recurring service.',
      isAIRecommended: true,
    },
    {
      id: 102,
      providerId: 202,
      provider: 'Precision Lawn Services',
      providerRating: 4.7,
      completedJobs: 178,
      memberSince: 'Apr 2021',
      avatar: '/images/providers/provider-2.jpg',
      amount: 48.00,
      estimatedDuration: '1 hour',
      availability: ['2023-06-25', '2023-06-27', '2023-06-28'],
      message: 'We offer quality lawn care at affordable rates. Our team can handle your mowing needs efficiently and professionally.',
      isAIRecommended: false,
    },
    {
      id: 103,
      providerId: 203,
      provider: 'Premier Yard Maintenance',
      providerRating: 4.8,
      completedJobs: 312,
      memberSince: 'May 2019',
      avatar: '/images/providers/provider-3.jpg',
      amount: 65.00,
      estimatedDuration: '2 hours',
      availability: ['2023-06-24', '2023-06-25', '2023-06-26', '2023-06-27'],
      message: 'Our premium service includes mowing, edging, and cleanup. We take extra care with difficult terrain and ensure a perfect cut every time. We also offer seasonal lawn treatment packages.',
      isAIRecommended: false,
    },
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

      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold">{serviceRequest.service} - Service Request</h1>
          <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
            Awaiting Selection
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-1">Property</h2>
            <p className="text-gray-900">{serviceRequest.property}</p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-1">Request Date</h2>
            <p className="text-gray-900">{serviceRequest.requestDate}</p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-1">Preferred Date</h2>
            <p className="text-gray-900">{serviceRequest.preferredDate}</p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-1">Service Frequency</h2>
            <p className="text-gray-900">{serviceRequest.frequency}</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-1">Service Description</h2>
          <p className="text-gray-900">{serviceRequest.description}</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-1">Selecting a Service Provider</h3>
              <p className="text-sm text-blue-700">
                Review each bid carefully. Our AI has analyzed the bids and highlighted the best value based on price, provider rating, and response time.
                You can message providers directly if you have questions before accepting a bid.
              </p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Available Bids ({bids.length})</h2>

      <div className="space-y-6">
        {bids.map((bid) => (
          <div 
            key={bid.id} 
            className={`bg-white rounded-xl shadow-sm border ${bid.isAIRecommended ? 'border-green-300' : 'border-gray-200'} overflow-hidden`}
          >
            {bid.isAIRecommended && (
              <div className="bg-green-100 text-green-800 text-sm font-medium px-4 py-2 flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                AI Recommended – Best value based on price, rating, and availability
              </div>
            )}
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Provider Info */}
                <div className="flex-shrink-0 flex flex-col items-center md:w-48">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden mb-3">
                    <Image
                      src={bid.avatar}
                      alt={bid.provider}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h3 className="font-medium text-center">{bid.provider}</h3>
                  <div className="flex items-center text-sm mb-1">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span>{bid.providerRating}/5</span>
                    <span className="text-gray-500 ml-1">({bid.completedJobs} jobs)</span>
                  </div>
                  <span className="text-xs text-gray-500 mb-3">Member since {bid.memberSince}</span>
                  <Link 
                    href={`/dashboard/providers/${bid.providerId}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Profile
                  </Link>
                </div>

                {/* Bid Details */}
                <div className="flex-grow">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Price</h4>
                      <p className="text-lg font-semibold">${bid.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Est. Duration</h4>
                      <p className="font-medium">{bid.estimatedDuration}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Availability</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {bid.availability.map((date, index) => (
                          <div key={index} className="flex items-center text-xs">
                            <Calendar className="h-3 w-3 mr-1 text-gray-500" />
                            {date}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Message</h4>
                    <p className="text-sm text-gray-700">{bid.message}</p>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-4">
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">
                      Accept Bid
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">
                      Message Provider
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4">Need More Options?</h3>
        <div className="flex flex-col items-stretch gap-4 md:flex-row">
          <div className="flex-1 border border-gray-200 rounded-lg p-4 hover:border-gray-300">
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-blue-500 mr-2" />
              <h4 className="font-medium">Extend Bidding Period</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">Allow more time for service providers to submit bids for your request.</p>
            <button className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
              Extend by 3 Days
            </button>
          </div>
          <div className="flex-1 border border-gray-200 rounded-lg p-4 hover:border-gray-300">
            <div className="flex items-center mb-2">
              <Shield className="h-5 w-5 text-blue-500 mr-2" />
              <h4 className="font-medium">Get Premium Match</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">Our team will personally find top-rated providers for your specific needs.</p>
            <button className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
              Request Premium Match
            </button>
          </div>
          <div className="flex-1 border border-gray-200 rounded-lg p-4 hover:border-gray-300">
            <div className="flex items-center mb-2">
              <Award className="h-5 w-5 text-blue-500 mr-2" />
              <h4 className="font-medium">Modify Request</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">Change your service details to attract different providers or bids.</p>
            <Link 
              href={`/dashboard/services/edit/${params.id}`}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 text-center"
            >
              Edit Request
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 