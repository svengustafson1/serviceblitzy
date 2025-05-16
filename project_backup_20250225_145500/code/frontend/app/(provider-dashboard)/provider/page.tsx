import React from 'react';
import Link from 'next/link';
import { Briefcase, DollarSign, Clock, CheckCircle, ArrowRight, Calendar, FileText, Award, Map } from 'lucide-react';

export default function ProviderDashboardPage() {
  // This would be fetched from API in production
  const dashboardData = {
    pendingBidRequests: 5,
    activeJobs: 3,
    completedJobs: 12,
    thisMonthEarnings: 1240.00,
    totalEarnings: 5680.00,
    upcomingJobs: [
      {
        id: 1,
        service: 'Lawn Mowing',
        address: '123 Main St, Lake Tahoe, CA',
        scheduledDate: '2023-07-05',
        scheduledTime: '10:00 AM',
        customer: 'John Smith'
      },
      {
        id: 2,
        service: 'Lawn Mowing',
        address: '456 Elm St, Lake Tahoe, CA',
        scheduledDate: '2023-07-06',
        scheduledTime: '2:00 PM',
        customer: 'Sarah Johnson'
      }
    ],
    recentActivities: [
      {
        id: 1,
        type: 'new_bid_request',
        service: 'Window Cleaning',
        timestamp: '2023-06-25 14:30',
        address: '789 Pine St, Lake Tahoe, CA'
      },
      {
        id: 2,
        type: 'bid_accepted',
        service: 'Lawn Mowing',
        timestamp: '2023-06-24 10:15',
        address: '123 Main St, Lake Tahoe, CA'
      },
      {
        id: 3,
        type: 'payment_received',
        service: 'Gutter Cleaning',
        timestamp: '2023-06-22 16:45',
        amount: 95.00
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Metrics/Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Pending Bid Requests" 
          value={dashboardData.pendingBidRequests} 
          icon={<FileText className="h-10 w-10 text-indigo-500" />} 
          linkText="View Requests"
          linkHref="/provider/bid-requests"
        />
        <StatCard 
          title="Active Jobs" 
          value={dashboardData.activeJobs} 
          icon={<Briefcase className="h-10 w-10 text-blue-500" />} 
          linkText="Manage Jobs"
          linkHref="/provider/jobs"
        />
        <StatCard 
          title="This Month" 
          value={`$${dashboardData.thisMonthEarnings.toFixed(2)}`} 
          icon={<DollarSign className="h-10 w-10 text-green-500" />} 
          linkText="View Earnings"
          linkHref="/provider/earnings"
        />
        <StatCard 
          title="Total Earnings" 
          value={`$${dashboardData.totalEarnings.toFixed(2)}`} 
          icon={<Award className="h-10 w-10 text-yellow-500" />} 
          linkText="All Time"
          linkHref="/provider/earnings/history"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Jobs */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Upcoming Jobs</h2>
            <Link 
              href="/provider/jobs" 
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          <div className="divide-y">
            {dashboardData.upcomingJobs.length > 0 ? (
              dashboardData.upcomingJobs.map((job) => (
                <div key={job.id} className="p-6">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{job.service}</h3>
                      <p className="text-gray-600 text-sm">{job.address}</p>
                      <p className="text-gray-600 text-sm mt-1">Customer: {job.customer}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-blue-600 mb-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span className="text-sm">{job.scheduledDate}</span>
                      </div>
                      <div className="flex items-center text-blue-600">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-sm">{job.scheduledTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Link
                      href={`/provider/jobs/${job.id}`}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-500">No upcoming jobs scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          
          <div className="p-6">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
              
              <div className="space-y-6">
                {dashboardData.recentActivities.map((activity) => (
                  <div key={activity.id} className="relative flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center z-10">
                      {activity.type === 'new_bid_request' && <FileText className="h-4 w-4 text-indigo-600" />}
                      {activity.type === 'bid_accepted' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {activity.type === 'payment_received' && <DollarSign className="h-4 w-4 text-green-600" />}
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{activity.timestamp}</div>
                      <div className="font-medium mt-1">
                        {activity.type === 'new_bid_request' && 'New Bid Request'}
                        {activity.type === 'bid_accepted' && 'Bid Accepted'}
                        {activity.type === 'payment_received' && 'Payment Received'}
                      </div>
                      <div className="text-gray-600 text-sm">
                        {activity.type === 'payment_received' ? (
                          <>Amount: ${activity.amount?.toFixed(2)} for {activity.service}</>
                        ) : (
                          <>{activity.service} at {activity.address}</>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/provider/bid-requests"
            className="flex flex-col items-center justify-center p-4 border rounded-xl hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-indigo-600 mb-2" />
            <span className="font-medium">View Bid Requests</span>
          </Link>
          <Link
            href="/provider/schedule"
            className="flex flex-col items-center justify-center p-4 border rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-8 w-8 text-indigo-600 mb-2" />
            <span className="font-medium">Manage Schedule</span>
          </Link>
          <Link
            href="/provider/earnings"
            className="flex flex-col items-center justify-center p-4 border rounded-xl hover:bg-gray-50 transition-colors"
          >
            <DollarSign className="h-8 w-8 text-indigo-600 mb-2" />
            <span className="font-medium">View Earnings</span>
          </Link>
          <Link
            href="/provider/map"
            className="flex flex-col items-center justify-center p-4 border rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Map className="h-8 w-8 text-indigo-600 mb-2" />
            <span className="font-medium">Map View</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, linkText, linkHref }: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  linkText: string;
  linkHref: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        {icon}
      </div>
      <div className="mt-4 pt-4 border-t">
        <Link
          href={linkHref}
          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          {linkText} <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  );
} 