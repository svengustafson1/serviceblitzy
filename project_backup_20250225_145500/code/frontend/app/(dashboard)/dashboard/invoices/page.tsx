import React from 'react';
import Link from 'next/link';
import { Filter, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function InvoicesPage() {
  // This would be fetched from API in production
  const invoices = [
    {
      id: 1,
      service: 'Lawn Mowing',
      property: '123 Main St, Lake Tahoe, CA',
      provider: 'Green Lawns LLC',
      amount: 65.00,
      date: '2023-06-25',
      dueDate: '2023-07-10',
      status: 'paid',
      paymentDate: '2023-06-28'
    },
    {
      id: 2,
      service: 'Window Cleaning',
      property: '123 Main St, Lake Tahoe, CA',
      provider: 'Crystal Clear Windows',
      amount: 120.00,
      date: '2023-06-20',
      dueDate: '2023-07-05',
      status: 'pending'
    },
    {
      id: 3,
      service: 'HVAC Maintenance',
      property: '123 Main St, Lake Tahoe, CA',
      provider: 'AC Experts',
      amount: 89.00,
      date: '2023-06-15',
      dueDate: '2023-06-30',
      status: 'overdue'
    },
    {
      id: 4,
      service: 'Gutter Cleaning',
      property: '456 Elm St, Lake Tahoe, CA',
      provider: 'Gutter Pros',
      amount: 95.00,
      date: '2023-05-20',
      dueDate: '2023-06-05',
      status: 'paid',
      paymentDate: '2023-05-25'
    }
  ];

  // Group invoices by status
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');

  // Calculate total due
  const totalDue = [...pendingInvoices, ...overdueInvoices]
    .reduce((total, invoice) => total + invoice.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <div className="flex gap-3">
          <button
            className="border border-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50"
          >
            <Filter className="h-5 w-5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600">Total Due</p>
              <p className="text-2xl font-bold mt-1">${totalDue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {pendingInvoices.length} pending, {overdueInvoices.length} overdue
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600">Invoices This Month</p>
              <p className="text-2xl font-bold mt-1">{invoices.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {paidInvoices.length} paid, {pendingInvoices.length + overdueInvoices.length} unpaid
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600">Next Payment Due</p>
              <p className="text-2xl font-bold mt-1">
                {pendingInvoices.length > 0 
                  ? pendingInvoices.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0].dueDate
                  : 'No upcoming payments'
                }
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </div>
          {pendingInvoices.length > 0 && (
            <div className="text-sm text-gray-600 mt-2">
              For: {pendingInvoices.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0].service}
            </div>
          )}
        </div>
      </div>

      {/* Unpaid Invoices Section */}
      {(pendingInvoices.length > 0 || overdueInvoices.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Unpaid Invoices</h2>
          </div>
          <div className="divide-y">
            {[...overdueInvoices, ...pendingInvoices].map((invoice) => (
              <InvoiceItem 
                key={invoice.id} 
                invoice={invoice} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Paid Invoices Section */}
      {paidInvoices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Payment History</h2>
          </div>
          <div className="divide-y">
            {paidInvoices.map((invoice) => (
              <InvoiceItem 
                key={invoice.id} 
                invoice={invoice} 
              />
            ))}
          </div>
        </div>
      )}

      {invoices.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-medium mb-2">No Invoices Yet</h3>
          <p className="text-gray-600 mb-6">Once you receive services, invoices will appear here</p>
        </div>
      )}
    </div>
  );
}

function InvoiceItem({ invoice }: { invoice: any }) {
  return (
    <div className="px-6 py-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold">{invoice.service}</h3>
          <p className="text-sm text-gray-600">{invoice.property}</p>
        </div>
        <div className="flex items-center">
          {invoice.status === 'paid' && (
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>Paid</span>
            </div>
          )}
          {invoice.status === 'pending' && (
            <div className="flex items-center text-blue-600 text-sm">
              <Clock className="h-4 w-4 mr-1" />
              <span>Pending</span>
            </div>
          )}
          {invoice.status === 'overdue' && (
            <div className="flex items-center text-red-600 text-sm">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span>Overdue</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mt-3">
        <div className="text-sm text-gray-500">
          {invoice.status === 'paid' 
            ? `Paid on: ${invoice.paymentDate}` 
            : `Due by: ${invoice.dueDate}`
          } • Provider: {invoice.provider}
        </div>
        <div className="flex space-x-3 items-center">
          <div className="font-medium">${invoice.amount.toFixed(2)}</div>
          <Link
            href={`/dashboard/invoices/${invoice.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            View
          </Link>
          {(invoice.status === 'pending' || invoice.status === 'overdue') && (
            <Link
              href={`/dashboard/invoices/${invoice.id}/pay`}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded text-sm"
            >
              Pay Now
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Calendar(props: React.SVGProps<SVGSVGElement>) {
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
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
} 