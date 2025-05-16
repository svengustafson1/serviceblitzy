import React from 'react';
import Link from 'next/link';
import { PlusCircle, Clock, Calendar, CheckCircle } from 'lucide-react';

export default function ServicesPage() {
  // Mock data - in a real app, this would come from an API
  const pendingRequests = [
    {
      id: 1,
      service: 'Lawn Mowing',
      property: '123 Main Street, Minneapolis, MN',
      requestDate: '2023-06-10',
      status: 'awaiting_bids',
      bids: 3,
    },
    {
      id: 2,
      service: 'Window Cleaning',
      property: '123 Main Street, Minneapolis, MN',
      requestDate: '2023-06-12',
      status: 'awaiting_bids',
      bids: 2,
    },
  ];

  const scheduledServices = [
    {
      id: 3,
      service: 'House Cleaning',
      property: '456 Elm Avenue, St. Paul, MN',
      provider: 'Clean Home Pros',
      scheduledDate: '2023-06-20',
      time: '10:00 AM - 12:00 PM',
    },
  ];

  const completedServices = [
    {
      id: 4,
      service: 'Gutter Cleaning',
      property: '123 Main Street, Minneapolis, MN',
      provider: 'Minneapolis Exteriors',
      completedDate: '2023-05-15',
      amount: 125.00,
      rated: true,
      rating: 4,
    },
    {
      id: 5,
      service: 'HVAC Maintenance',
      property: '456 Elm Avenue, St. Paul, MN',
      provider: 'Twin Cities HVAC',
      completedDate: '2023-05-05',
      amount: 95.00,
      rated: false,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Services</h1>
        <Link 
          href="/dashboard/services/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <PlusCircle className="h-5 w-5" />
          Request New Service
        </Link>
      </div>

      {/* Pending Requests */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-yellow-500" />
          Pending Requests
        </h2>
        
        {pendingRequests.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{request.service}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.property}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.requestDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {request.bids} bids available
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/dashboard/services/requests/${request.id}`} className="text-blue-600 hover:text-blue-900">
                        View Bids
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
            You don't have any pending service requests.
          </div>
        )}
      </div>

      {/* Scheduled Services */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-blue-500" />
          Scheduled Services
        </h2>
        
        {scheduledServices.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scheduledServices.map((service) => (
                  <tr key={service.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{service.service}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.property}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.scheduledDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/dashboard/services/${service.id}`} className="text-blue-600 hover:text-blue-900">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
            You don't have any scheduled services.
          </div>
        )}
      </div>

      {/* Completed Services */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
          Service History
        </h2>
        
        {completedServices.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {completedServices.map((service) => (
                  <tr key={service.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{service.service}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.property}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.completedDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${service.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {service.rated ? (
                        <span className="text-green-600">Rated ★{service.rating}/5</span>
                      ) : (
                        <Link href={`/dashboard/services/${service.id}/rate`} className="text-blue-600 hover:text-blue-900">
                          Leave Review
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
            You don't have any completed services.
          </div>
        )}
      </div>
    </div>
  );
} 