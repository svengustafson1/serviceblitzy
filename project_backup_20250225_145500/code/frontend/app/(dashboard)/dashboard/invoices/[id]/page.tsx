import React from 'react';
import Link from 'next/link';
import { ChevronLeft, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoiceId = parseInt(params.id);
  
  // In a real app, this would be fetched from an API
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
      paymentDate: '2023-06-28',
      description: 'Weekly lawn maintenance service including mowing, edging, and cleanup.',
      lineItems: [
        { description: 'Lawn Mowing Service', amount: 55.00 },
        { description: 'Edging', amount: 10.00 }
      ]
    },
    {
      id: 2,
      service: 'Window Cleaning',
      property: '123 Main St, Lake Tahoe, CA',
      provider: 'Crystal Clear Windows',
      amount: 120.00,
      date: '2023-06-20',
      dueDate: '2023-07-05',
      status: 'pending',
      description: 'Complete window cleaning service for all exterior windows.',
      lineItems: [
        { description: 'First Floor Windows (8)', amount: 64.00 },
        { description: 'Second Floor Windows (7)', amount: 56.00 }
      ]
    },
    {
      id: 3,
      service: 'HVAC Maintenance',
      property: '123 Main St, Lake Tahoe, CA',
      provider: 'AC Experts',
      amount: 89.00,
      date: '2023-06-15',
      dueDate: '2023-06-30',
      status: 'overdue',
      description: 'Annual HVAC system maintenance and filter replacement.',
      lineItems: [
        { description: 'System Inspection', amount: 49.00 },
        { description: 'Filter Replacement', amount: 25.00 },
        { description: 'Duct Cleaning', amount: 15.00 }
      ]
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
      paymentDate: '2023-05-25',
      description: 'Complete gutter cleaning and inspection.',
      lineItems: [
        { description: 'Gutter Cleaning', amount: 80.00 },
        { description: 'Downspout Inspection', amount: 15.00 }
      ]
    }
  ];

  const invoice = invoices.find(inv => inv.id === invoiceId);

  if (!invoice) {
    return (
      <div className="px-6 py-8">
        <Link href="/dashboard/invoices" className="text-blue-600 hover:text-blue-800 flex items-center mb-6">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Invoices
        </Link>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600">The invoice you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <Link href="/dashboard/invoices" className="text-blue-600 hover:text-blue-800 flex items-center mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Invoices
      </Link>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Invoice #{invoice.id}</h1>
              <p className="text-gray-600">{invoice.service}</p>
              <p className="text-gray-600">{invoice.property}</p>
            </div>
            <div>
              {invoice.status === 'paid' && (
                <div className="flex items-center text-green-600 px-3 py-1 rounded-full bg-green-100">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>Paid</span>
                </div>
              )}
              {invoice.status === 'pending' && (
                <div className="flex items-center text-blue-600 px-3 py-1 rounded-full bg-blue-100">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Pending</span>
                </div>
              )}
              {invoice.status === 'overdue' && (
                <div className="flex items-center text-red-600 px-3 py-1 rounded-full bg-red-100">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>Overdue</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Invoice Date</p>
              <p className="font-medium">{invoice.date}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Due Date</p>
              <p className="font-medium">{invoice.dueDate}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Provider</p>
              <p className="font-medium">{invoice.provider}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Total Amount</p>
              <p className="font-medium">${invoice.amount.toFixed(2)}</p>
            </div>
            {invoice.status === 'paid' && (
              <div>
                <p className="text-gray-500 mb-1">Payment Date</p>
                <p className="font-medium">{invoice.paymentDate}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <h3 className="font-medium mb-4">Invoice Details</h3>
          <p className="text-gray-600 mb-4">{invoice.description}</p>
          
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Description</th>
                <th className="text-right py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-3">{item.description}</td>
                  <td className="text-right py-3">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td className="py-3">Total</td>
                <td className="text-right py-3">${invoice.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {(invoice.status === 'pending' || invoice.status === 'overdue') && (
            <div className="flex justify-end">
              <Link
                href={`/dashboard/invoices/${invoice.id}/pay`}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium"
              >
                Pay Now
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 