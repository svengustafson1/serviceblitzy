"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Home, Calendar, ClipboardList, ArrowRight, MapPin, Building, Ruler } from 'lucide-react';
import axios from 'axios';

// Define types
interface Property {
  id: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_size: number;
  property_type: string;
  notes: string;
  qr_code_url: string;
  access_hash: string;
}

export default function PublicPropertyPage() {
  const params = useParams();
  const hash = params.hash as string;
  
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPropertyByHash = async () => {
      setIsLoading(true);
      try {
        // Call the backend API to get property details by hash
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3009/api'}/properties/access/${hash}`);
        
        if (response.data.success) {
          setProperty(response.data.data);
        } else {
          setError('Property not found');
        }
      } catch (err) {
        console.error('Error fetching property by hash:', err);
        setError('Failed to load property details. This QR code may be invalid or expired.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (hash) {
      fetchPropertyByHash();
    }
  }, [hash]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
          <h2 className="text-xl font-semibold mt-4">Loading Property Details</h2>
          <p className="text-gray-500 mt-2">Please wait while we retrieve the information...</p>
        </div>
      </div>
    );
  }
  
  if (error || !property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="bg-red-100 text-red-600 p-3 rounded-full inline-flex mb-4">
            <Building className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Property Not Found</h2>
          <p className="text-gray-600 mt-2">{error || 'The property you are looking for could not be found.'}</p>
          <p className="text-gray-500 mt-4 text-sm">This QR code may be invalid or expired.</p>
          <Link href="/" className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Property Access
              </h1>
              <p className="text-gray-600">
                Quick access to property services
              </p>
            </div>
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              Home
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-5 border-b">
            <h2 className="text-xl font-bold">Property Details</h2>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="bg-gray-100 rounded-lg p-6 flex-1">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Home className="h-6 w-6 text-blue-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium">{property.address}</h3>
                    <p className="text-gray-600">{property.city}, {property.state} {property.zip_code}</p>
                    
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{property.property_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Ruler className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{property.property_size} sq ft</span>
                      </div>
                    </div>
                    
                    {property.notes && (
                      <div className="mt-4 bg-yellow-50 p-3 rounded text-sm">
                        <p className="font-medium mb-1">Notes:</p>
                        <p className="text-gray-600">{property.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden h-full">
            <div className="px-6 py-5 border-b">
              <h2 className="text-xl font-semibold">Request a Service</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Need maintenance or repairs? Request a new service for this property.
              </p>
              <Link 
                href={`/p/${hash}/request-service`}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Request Service <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm overflow-hidden h-full">
            <div className="px-6 py-5 border-b">
              <h2 className="text-xl font-semibold">Service History</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                View all past and upcoming services for this property.
              </p>
              <Link 
                href={`/p/${hash}/service-history`}
                className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
              >
                View Services <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 