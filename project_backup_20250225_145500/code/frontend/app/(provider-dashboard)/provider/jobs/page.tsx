import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, Clock, MapPin, CheckCircle, RotateCw, AlertCircle, Truck, FileText } from 'lucide-react';

export default function ProviderJobsPage() {
  // This would be fetched from API in production
  const jobs = [
    {
      id: 1,
      service: 'Lawn Mowing',
      status: 'scheduled', // 'scheduled', 'in_progress', 'completed', 'cancelled'
      scheduledDate: '2023-07-05',
      scheduledTime: '10:00 AM - 12:00 PM',
      property: {
        address: '123 Main St',
        city: 'Lake Tahoe',
        state: 'CA',
        zipCode: '96150'
      },
      customer: 'John Smith',
      phone: '(555) 123-4567',
      amount: 65.00,
      isPaid: false,
      isRecurring: true,
      frequency: 'weekly',
      notes: 'Gate code is 1234. Please mow the backyard as well.'
    },
    {
      id: 2,
      service: 'Window Cleaning',
      status: 'scheduled',
      scheduledDate: '2023-07-06',
      scheduledTime: '2:00 PM - 4:00 PM',
      property: {
        address: '456 Elm St',
        city: 'Lake Tahoe',
        state: 'CA',
        zipCode: '96150'
      },
      customer: 'Sarah Johnson',
      phone: '(555) 987-6543',
      amount: 120.00,
      isPaid: false,
      isRecurring: false,
      notes: 'Please clean all exterior windows including screens.'
    },
    {
      id: 3,
      service: 'Gutter Cleaning',
      status: 'in_progress',
      scheduledDate: '2023-06-30',
      scheduledTime: '9:00 AM - 11:00 AM',
      property: {
        address: '789 Pine St',
        city: 'Lake Tahoe',
        state: 'CA',
        zipCode: '96150'
      },
      customer: 'Michael Wilson',
      phone: '(555) 456-7890',
      amount: 95.00,
      isPaid: false,
      isRecurring: false,
      notes: 'Single-story home, approximately 180 linear feet of gutters.'
    },
    {
      id: 4,
      service: 'Lawn Mowing',
      status: 'completed',
      scheduledDate: '2023-06-28',
      completedDate: '2023-06-28',
      scheduledTime: '1:00 PM - 3:00 PM',
      property: {
        address: '101 Cedar Ln',
        city: 'Lake Tahoe',
        state: 'CA',
        zipCode: '96150'
      },
      customer: 'Jennifer Brown',
      phone: '(555) 234-5678',
      amount: 65.00,
      isPaid: true,
      paymentDate: '2023-06-29',
      isRecurring: true,
      frequency: 'bi-weekly',
      notes: 'Front yard only, backyard is fenced and has a dog.'
    }
  ];

  // Filter jobs by status
  const scheduledJobs = jobs.filter(job => job.status === 'scheduled');
  const inProgressJobs = jobs.filter(job => job.status === 'in_progress');
  const completedJobs = jobs.filter(job => job.status === 'completed');

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
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <div className="flex space-x-4">
          <select 
            className="rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 text-sm"
            aria-label="Filter jobs by status"
            title="Filter jobs by status"
            id="job-status-filter"
            name="job-status-filter"
          >
            <option value="all">All Jobs</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* In Progress Jobs */}
      {inProgressJobs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <RotateCw className="h-5 w-5 text-blue-600 mr-2" />
            In Progress Jobs
          </h2>
          <div className="space-y-4">
            {inProgressJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Jobs */}
      {scheduledJobs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="h-5 w-5 text-green-600 mr-2" />
            Upcoming Scheduled Jobs
          </h2>
          <div className="space-y-4">
            {scheduledJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-gray-600 mr-2" />
            Recently Completed Jobs
          </h2>
          <div className="space-y-4">
            {completedJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Job {
  id: number;
  service: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  completedDate?: string;
  property: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  customer: string;
  phone: string;
  amount: number;
  isPaid: boolean;
  paymentDate?: string;
  isRecurring: boolean;
  frequency?: string;
  notes?: string;
}

function JobCard({ job }: { job: Job }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{job.service}</h3>
          <div className="text-gray-600 flex items-center gap-1 mt-1">
            <MapPin className="h-4 w-4" />
            <span>{job.property.address}, {job.property.city}, {job.property.state}</span>
          </div>
        </div>
        <div className="flex items-center">
          <JobStatusBadge status={job.status} />
          <Link
            href={`/provider/jobs/${job.id}`}
            className="ml-4 flex items-center gap-1 text-blue-600 hover:text-blue-800"
          >
            <span className="text-sm font-medium">Details</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-gray-600 text-sm">Scheduled Date</div>
                <div className="font-medium">{job.scheduledDate}</div>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Clock className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-gray-600 text-sm">Time</div>
                <div className="font-medium">{job.scheduledTime}</div>
              </div>
            </div>
            {job.isRecurring && job.frequency && (
              <div className="flex gap-2 items-center">
                <RotateCw className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-gray-600 text-sm">Frequency</div>
                  <div className="font-medium capitalize">{job.frequency}</div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-gray-600 text-sm">Customer</div>
              <div className="font-medium">{job.customer}</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">Contact</div>
              <div className="font-medium">{job.phone}</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">Payment</div>
              <div className="font-medium">
                ${job.amount.toFixed(2)}
                {job.isPaid ? (
                  <span className="text-green-600 ml-2">• Paid</span>
                ) : (
                  <span className="text-yellow-600 ml-2">• Pending</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="space-y-3">
              {job.status === 'scheduled' && (
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2 flex items-center justify-center gap-1">
                  <Truck className="h-4 w-4" />
                  <span>Start Job</span>
                </button>
              )}
              
              {job.status === 'in_progress' && (
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg px-4 py-2 flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>Mark Complete</span>
                </button>
              )}
              
              {job.status === 'completed' && !job.isPaid && (
                <div className="flex items-center text-yellow-600 mb-2">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">Payment Pending</span>
                </div>
              )}
              
              <Link
                href={`/provider/jobs/${job.id}`}
                className="w-full text-center block border border-gray-300 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 font-medium"
              >
                View Details
              </Link>
              
              {(job.status === 'scheduled' || job.status === 'in_progress') && (
                <button className="w-full flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 mt-2">
                  <FileText className="h-4 w-4" />
                  <span>Add Notes</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'scheduled':
      return (
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
          Scheduled
        </span>
      );
    case 'in_progress':
      return (
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
          In Progress
        </span>
      );
    case 'completed':
      return (
        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
          Completed
        </span>
      );
    case 'cancelled':
      return (
        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
          Cancelled
        </span>
      );
    default:
      return null;
  }
} 