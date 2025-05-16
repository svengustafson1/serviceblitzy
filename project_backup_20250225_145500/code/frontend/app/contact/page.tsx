import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="flex items-center text-blue-600 hover:text-blue-800">
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back to Home
          </Link>
        </div>
        
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Get in touch</h2>
            <p className="mt-4 text-lg text-gray-500">
              Have questions about our services or need help getting started? We're here to help. Reach out to us through any of these channels.
            </p>
            <div className="mt-8 space-y-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3 text-base text-gray-500">
                  <p>support@homeservices.example.com</p>
                  <p className="mt-1">For general inquiries and support</p>
                </div>
              </div>
              <div className="flex">
                <div className="flex-shrink-0">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3 text-base text-gray-500">
                  <p>+1 (555) 123-4567</p>
                  <p className="mt-1">Mon-Fri 9am to 6pm EST</p>
                </div>
              </div>
              <div className="flex">
                <div className="flex-shrink-0">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3 text-base text-gray-500">
                  <p>123 Main Street</p>
                  <p className="mt-1">Minneapolis, MN 55401</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12 lg:mt-0 lg:col-span-2">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Contact us</h3>
                <div className="mt-6">
                  <form className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
                    <div>
                      <label htmlFor="first-name" className="block text-sm font-medium text-gray-700">
                        First name
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="first-name"
                          id="first-name"
                          autoComplete="given-name"
                          className="py-3 px-4 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="last-name" className="block text-sm font-medium text-gray-700">
                        Last name
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="last-name"
                          id="last-name"
                          autoComplete="family-name"
                          className="py-3 px-4 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="mt-1">
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          className="py-3 px-4 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="phone"
                          id="phone"
                          autoComplete="tel"
                          className="py-3 px-4 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                        Subject
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="subject"
                          id="subject"
                          className="py-3 px-4 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                        Message
                      </label>
                      <div className="mt-1">
                        <textarea
                          id="message"
                          name="message"
                          rows={4}
                          className="py-3 px-4 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 border border-gray-300 rounded-md"
                        ></textarea>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <Link
                        href="/"
                        className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Submit
                      </Link>
                      <p className="mt-3 text-sm text-gray-500">
                        For demo purposes only. Form submissions are not processed.
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 