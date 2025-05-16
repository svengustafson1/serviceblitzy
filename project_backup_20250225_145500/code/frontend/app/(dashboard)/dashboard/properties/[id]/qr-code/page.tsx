import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Download, Share2, Printer } from 'lucide-react';

export default function PropertyQRCodePage({ params }: { params: { id: string } }) {
  // This would be fetched from API using params.id in production
  const property = {
    id: 1,
    address: '123 Main St',
    city: 'Lake Tahoe',
    state: 'CA',
    zipCode: '96150',
    qrCodeUrl: '/images/qr-codes/property-1.png', // This would be dynamically generated
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/dashboard/properties/${params.id}`}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Property</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b">
          <h1 className="text-2xl font-bold">Property QR Code</h1>
          <p className="text-gray-600 mt-1">{property.address}, {property.city}, {property.state}</p>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center text-center max-w-md mx-auto">
            <div className="bg-white p-4 border rounded-lg shadow-sm mb-6">
              {/* Placeholder for QR code image - in production this would be a real QR code */}
              <div className="w-64 h-64 bg-gray-200 flex items-center justify-center mb-2">
                <span className="text-gray-500">QR Code Preview</span>
              </div>
              <p className="text-sm text-gray-600">Scan to manage services for this property</p>
            </div>

            <div className="space-y-4 w-full">
              <h2 className="text-lg font-semibold">About Property QR Codes</h2>
              <p className="text-gray-600 text-sm">
                This unique QR code provides quick access to manage services for this property without 
                logging in. Anyone with this QR code can:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>View service history and upcoming appointments</li>
                <li>Request new services for this property</li>
                <li>Provide access to service providers</li>
              </ul>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <strong>Important:</strong> Keep this QR code secure or share it only with people you 
                trust to manage services for this property.
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-8 w-full border-t pt-6">
              <button 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
              <button 
                className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              <button 
                className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Usage Instructions</h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-medium mb-2">Print or Save</h3>
              <p className="text-sm text-gray-600">
                Download and print this QR code or save it to your mobile device
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-medium mb-2">Display It</h3>
              <p className="text-sm text-gray-600">
                Place the printed QR code in a convenient location at your property
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="font-bold text-blue-600">3</span>
              </div>
              <h3 className="font-medium mb-2">Scan & Manage</h3>
              <p className="text-sm text-gray-600">
                Scan the code with any smartphone camera to quickly access and manage services
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 