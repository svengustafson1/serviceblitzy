import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, DollarSign, BarChart3, TrendingUp, Clock, Calendar, Download, Filter, CreditCard } from 'lucide-react';

export default function ProviderEarningsPage() {
  // This would be fetched from API in production
  const earningsData = {
    currentMonth: {
      totalEarned: 1240.00,
      completed: 12,
      pending: 540.00,
      projected: 1780.00,
    },
    ytd: {
      totalEarned: 5680.00,
      completed: 50,
    },
    recentPayments: [
      {
        id: 1,
        date: '2023-06-29',
        amount: 65.00,
        service: 'Lawn Mowing',
        customer: 'Jennifer Brown',
        property: '101 Cedar Ln, Lake Tahoe, CA',
        status: 'paid'
      },
      {
        id: 2,
        date: '2023-06-25',
        amount: 120.00,
        service: 'Window Cleaning',
        customer: 'Michael Wilson',
        property: '789 Pine St, Lake Tahoe, CA',
        status: 'paid'
      },
      {
        id: 3,
        date: '2023-06-22',
        amount: 95.00,
        service: 'Gutter Cleaning',
        customer: 'Sarah Johnson',
        property: '456 Elm St, Lake Tahoe, CA',
        status: 'paid'
      }
    ],
    pendingPayments: [
      {
        id: 4,
        date: '2023-06-30',
        amount: 95.00,
        service: 'Gutter Cleaning',
        customer: 'Michael Wilson',
        property: '789 Pine St, Lake Tahoe, CA',
        status: 'pending',
        completedDate: '2023-06-30'
      },
      {
        id: 5,
        scheduledDate: '2023-07-05',
        amount: 65.00,
        service: 'Lawn Mowing',
        customer: 'John Smith',
        property: '123 Main St, Lake Tahoe, CA',
        status: 'scheduled'
      },
      {
        id: 6,
        scheduledDate: '2023-07-06',
        amount: 120.00,
        service: 'Window Cleaning',
        customer: 'Sarah Johnson',
        property: '456 Elm St, Lake Tahoe, CA',
        status: 'scheduled'
      },
      {
        id: 7,
        scheduledDate: '2023-07-10',
        amount: 160.00,
        service: 'Pressure Washing',
        customer: 'David Miller',
        property: '555 Oak Dr, Lake Tahoe, CA',
        status: 'scheduled'
      },
      {
        id: 8,
        scheduledDate: '2023-07-12',
        amount: 100.00,
        service: 'Lawn Mowing',
        customer: 'Jennifer Brown',
        property: '101 Cedar Ln, Lake Tahoe, CA',
        status: 'scheduled'
      }
    ],
    monthlyEarnings: [
      { month: 'Jan', amount: 420.00 },
      { month: 'Feb', amount: 560.00 },
      { month: 'Mar', amount: 680.00 },
      { month: 'Apr', amount: 820.00 },
      { month: 'May', amount: 960.00 },
      { month: 'Jun', amount: 1240.00 },
      { month: 'Jul', amount: 0 },
      { month: 'Aug', amount: 0 },
      { month: 'Sep', amount: 0 },
      { month: 'Oct', amount: 0 },
      { month: 'Nov', amount: 0 },
      { month: 'Dec', amount: 0 }
    ]
  };

  // Calculate the max value for the chart
  const maxMonthlyAmount = Math.max(...earningsData.monthlyEarnings.map(m => m.amount));

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
        <h1 className="text-2xl font-bold">My Earnings</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select 
              className="pl-3 pr-10 py-2 border border-gray-300 rounded-lg appearance-none bg-white text-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Select time period"
              defaultValue="this-month"
            >
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="last-3-months">Last 3 Months</option>
              <option value="year-to-date">Year to Date</option>
              <option value="last-year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <ChevronRight className="h-4 w-4 rotate-90" />
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">This Month</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">${earningsData.currentMonth.totalEarned.toFixed(2)}</h2>
          <p className="text-gray-500 mt-1">Total Earned</p>
          <div className="mt-2 text-sm text-blue-600">{earningsData.currentMonth.completed} jobs completed</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">This Month</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">${earningsData.currentMonth.pending.toFixed(2)}</h2>
          <p className="text-gray-500 mt-1">Pending Payments</p>
          <div className="mt-2 text-sm text-purple-600">{earningsData.pendingPayments.length} payments pending</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">This Month</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">${earningsData.currentMonth.projected.toFixed(2)}</h2>
          <p className="text-gray-500 mt-1">Projected Earnings</p>
          <div className="mt-2 text-sm text-green-600">Including upcoming jobs</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Year to Date</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">${earningsData.ytd.totalEarned.toFixed(2)}</h2>
          <p className="text-gray-500 mt-1">Total Earned (YTD)</p>
          <div className="mt-2 text-sm text-yellow-600">{earningsData.ytd.completed} jobs completed</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Monthly Earnings</h2>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </button>
            </div>
          </div>
          
          <div className="h-64">
            <div className="h-full flex items-end">
              {earningsData.monthlyEarnings.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div 
                    className={`w-10 rounded-t-md ${
                      item.amount > 0 ? 'bg-blue-500' : 'bg-gray-200'
                    }`} 
                    style={{ 
                      height: `${item.amount > 0 ? (item.amount / maxMonthlyAmount) * 80 : 5}%`
                    }}
                  ></div>
                  <div className="mt-2 text-xs text-gray-600">{item.month}</div>
                  {item.amount > 0 && (
                    <div className="mt-1 text-xs font-medium">${item.amount.toFixed(0)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">Payment Methods</h2>
          
          <div className="border rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded">
                  <CreditCard className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <div className="font-medium">Direct Deposit</div>
                  <div className="text-gray-500 text-sm">****1234 (Bank of America)</div>
                </div>
              </div>
              <span className="text-green-600 text-sm font-medium">Default</span>
            </div>
          </div>

          <Link 
            href="/provider/earnings/payment-methods" 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center gap-1 mt-4"
          >
            <span>Manage Payment Methods</span>
            <ChevronRight className="h-4 w-4" />
          </Link>

          <div className="mt-8">
            <h3 className="font-medium mb-2">Payment Schedule</h3>
            <p className="text-gray-600 text-sm">
              Payments are processed every Monday for the previous week's completed jobs.
              Funds typically appear in your account within 1-3 business days.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Recent & Upcoming Payments</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...earningsData.recentPayments, ...earningsData.pendingPayments]
                  .sort((a, b) => {
                    const dateA = a.date || a.scheduledDate || '';
                    const dateB = b.date || b.scheduledDate || '';
                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                  })
                  .slice(0, 10)
                  .map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{payment.service}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{payment.property}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payment.customer}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {payment.date || payment.scheduledDate}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.status === 'paid' ? 'Payment date' : 
                           payment.status === 'pending' ? 'Completed on ' + payment.completedDate :
                           'Scheduled'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">${payment.amount.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${payment.status === 'paid' ? 'bg-green-100 text-green-800' : 
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-blue-100 text-blue-800'}
                        `}>
                          {payment.status === 'paid' ? 'Paid' : 
                           payment.status === 'pending' ? 'Pending' : 
                           'Scheduled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link 
                          href={payment.status === 'scheduled' ? 
                            `/provider/jobs/${payment.id}` : 
                            `/provider/earnings/payments/${payment.id}`
                          }
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {payment.status === 'scheduled' ? 'View Job' : 'View Details'}
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 border-t">
            <Link 
              href="/provider/earnings/history" 
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
            >
              <span>View Full Payment History</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 