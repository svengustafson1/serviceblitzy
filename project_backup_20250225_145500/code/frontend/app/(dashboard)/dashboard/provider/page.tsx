import Link from 'next/link';
import { Calendar, DollarSign, BarChart2, Clock, ArrowRight, Award, Tool } from 'lucide-react';

export default function ProviderDashboardPage() {
  // This would be fetched from API in production
  const providerData = {
    availableBids: 8,
    activeJobs: 3,
    completedThisMonth: 12,
    revenue: {
      thisMonth: 5820,
      lastMonth: 4250,
      percentChange: 36.9
    },
    recentBidRequests: [
      { 
        id: 1, 
        service: 'Lawn Mowing', 
        location: 'Springfield, IL', 
        requestDate: '2023-06-15', 
        dueDate: '2023-06-18',
        status: 'open',
        competitors: 2
      },
      { 
        id: 2, 
        service: 'Window Cleaning', 
        location: 'Springfield, IL', 
        requestDate: '2023-06-14', 
        dueDate: '2023-06-17',
        status: 'open',
        competitors: 3
      },
      { 
        id: 3, 
        service: 'Gutter Cleaning', 
        location: 'Springfield, IL', 
        requestDate: '2023-06-10', 
        dueDate: '2023-06-13',
        status: 'open',
        competitors: 1
      },
    ],
    activeProjects: [
      {
        id: 1,
        service: 'HVAC Maintenance',
        property: '123 Oak Lane, Springfield, IL',
        scheduledDate: '2023-06-20',
        scheduledTime: '10:00 AM',
        status: 'scheduled'
      },
      {
        id: 2,
        service: 'Exterior Painting',
        property: '789 Pine Road, Springfield, IL',
        scheduledDate: '2023-06-25',
        scheduledTime: '09:00 AM',
        status: 'confirmed'
      },
      {
        id: 3,
        service: 'Lawn Fertilization',
        property: '456 Elm Street, Springfield, IL',
        scheduledDate: '2023-06-22',
        scheduledTime: '3:00 PM',
        status: 'in_progress'
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Available Bid Requests" 
          value={providerData.availableBids} 
          icon={<Award className="h-6 w-6 text-purple-500" />} 
          linkHref="/dashboard/provider/bids"
        />
        <DashboardCard 
          title="Active Jobs" 
          value={providerData.activeJobs} 
          icon={<Tool className="h-6 w-6 text-blue-500" />} 
          linkHref="/dashboard/provider/jobs"
        />
        <DashboardCard 
          title="Completed This Month" 
          value={providerData.completedThisMonth} 
          icon={<Calendar className="h-6 w-6 text-green-500" />} 
          linkHref="/dashboard/provider/history"
        />
        <DashboardCard 
          title={`Revenue (${new Date().toLocaleString('default', { month: 'short' })})`} 
          value={`$${providerData.revenue.thisMonth}`} 
          icon={<DollarSign className="h-6 w-6 text-yellow-500" />} 
          trend={providerData.revenue.percentChange > 0 ? `+${providerData.revenue.percentChange}%` : `${providerData.revenue.percentChange}%`}
          trendUp={providerData.revenue.percentChange > 0}
          linkHref="/dashboard/provider/earnings"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bid Requests */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">New Bid Requests</h3>
            <Link 
              href="/dashboard/provider/bids" 
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {providerData.recentBidRequests.length > 0 ? (
            <div className="divide-y">
              {providerData.recentBidRequests.map((request) => (
                <div key={request.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium">{request.service}</h4>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{request.competitors} competitors</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{request.location}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Requested: {request.requestDate}
                    </span>
                    <span className="text-orange-600 font-medium">
                      Due: {request.dueDate}
                    </span>
                  </div>
                  <div className="mt-3">
                    <Link 
                      href={`/dashboard/provider/bids/${request.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Submit Bid
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No new bid requests</p>
          )}
        </div>

        {/* Active Projects */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Active Projects</h3>
            <Link 
              href="/dashboard/provider/jobs" 
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {providerData.activeProjects.length > 0 ? (
            <div className="divide-y">
              {providerData.activeProjects.map((project) => (
                <div key={project.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium">{project.service}</h4>
                    <JobStatusBadge status={project.status} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{project.property}</p>
                  <div className="text-sm text-gray-500">
                    {project.scheduledDate} at {project.scheduledTime}
                  </div>
                  <div className="mt-3 flex space-x-3">
                    <Link 
                      href={`/dashboard/provider/jobs/${project.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details
                    </Link>
                    <Link 
                      href={`/dashboard/provider/jobs/${project.id}/update`}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Update Status
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No active projects</p>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Your Performance</h3>
          <div className="flex items-center">
            <label htmlFor="time-period" className="sr-only">Select time period</label>
            <select 
              id="time-period"
              name="time-period"
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              aria-label="Select time period"
            >
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>This year</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <BarChart2 className="h-5 w-5 text-blue-500 mr-2" />
              <h4 className="text-gray-600 font-medium">Bid Win Rate</h4>
            </div>
            <div className="text-3xl font-bold">76%</div>
            <div className="text-sm text-green-600">+8% from last month</div>
          </div>
          
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-blue-500 mr-2" />
              <h4 className="text-gray-600 font-medium">On-time Completion</h4>
            </div>
            <div className="text-3xl font-bold">92%</div>
            <div className="text-sm text-green-600">+3% from last month</div>
          </div>
          
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <StarIcon className="h-5 w-5 text-blue-500 mr-2" />
              <h4 className="text-gray-600 font-medium">Customer Rating</h4>
            </div>
            <div className="text-3xl font-bold">4.8</div>
            <div className="flex items-center text-sm mt-1">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="h-4 w-4" fill={i < 4 || i < 5 * 0.8 ? 'currentColor' : 'none'} />
                ))}
              </div>
              <span className="text-gray-600 ml-2">based on 32 reviews</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  linkHref 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  linkHref: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <Link href={linkHref} className="flex flex-col h-full">
        <div className="flex justify-between items-start">
          <div className="font-medium text-gray-600">{title}</div>
          {icon}
        </div>
        <div className="text-3xl font-bold mt-3">{value}</div>
        {trend && (
          <div className={`mt-2 text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend} {trendUp ? '↑' : '↓'} from last month
          </div>
        )}
      </Link>
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  let bgColor = '';
  let textColor = '';
  let label = '';

  switch (status) {
    case 'confirmed':
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      label = 'Confirmed';
      break;
    case 'scheduled':
      bgColor = 'bg-purple-100';
      textColor = 'text-purple-800';
      label = 'Scheduled';
      break;
    case 'in_progress':
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      label = 'In Progress';
      break;
    default:
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-800';
      label = status;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
}

function StarIcon(props: React.SVGProps<SVGSVGElement>) {
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