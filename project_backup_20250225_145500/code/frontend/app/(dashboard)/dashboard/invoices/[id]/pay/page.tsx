import React from 'react';
import Link from 'next/link';
import { ChevronLeft, CreditCard, Calendar, Lock } from 'lucide-react';

export default function InvoicePaymentPage({ params }: { params: { id: string } }) {
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

  if (invoice.status === 'paid') {
    return (
      <div className="px-6 py-8">
        <Link href={`/dashboard/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-800 flex items-center mb-6">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Invoice
        </Link>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invoice Already Paid</h2>
          <p className="text-gray-600">This invoice has already been paid on {invoice.paymentDate}.</p>
          <Link href="/dashboard/invoices" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Return to All Invoices
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <Link href={`/dashboard/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-800 flex items-center mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Invoice
      </Link>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Payment for Invoice #{invoice.id}</h1>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6 border-b">
            <h2 className="font-medium mb-4">Payment Summary</h2>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">{invoice.service}</span>
              <span>${invoice.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 font-medium">
              <span>Total Amount</span>
              <span>${invoice.amount.toFixed(2)}</span>
            </div>
          </div>
          
          <form className="p-6">
            <h2 className="font-medium mb-4">Payment Method</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name on Card
                </label>
                <input
                  type="text"
                  id="cardName"
                  name="cardName"
                  placeholder="John Smith"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="cardNumber"
                    name="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    className="w-full p-2 pl-10 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <CreditCard className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="expiryDate"
                      name="expiryDate"
                      placeholder="MM/YY"
                      className="w-full p-2 pl-10 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <Calendar className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>
                <div>
                  <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                    CVV
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="cvv"
                      name="cvv"
                      placeholder="123"
                      className="w-full p-2 pl-10 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Link
                href={`/dashboard/invoices`}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium w-full text-center"
              >
                Pay ${invoice.amount.toFixed(2)} Now
              </Link>
            </div>
            
            <p className="text-xs text-center text-gray-500 mt-4">
              Your payment information is encrypted and secure. We do not store your card details.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
} 