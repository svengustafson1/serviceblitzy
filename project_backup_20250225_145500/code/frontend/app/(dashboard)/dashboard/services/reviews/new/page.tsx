'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { ReviewForm, ReviewFormData } from '@/components/reviews';
import Link from 'next/link';

export default function NewReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('serviceId');
  const providerId = searchParams.get('providerId');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // In a real application, this data would be fetched from an API
  // based on the serviceId and providerId parameters
  const serviceData = {
    id: serviceId || 'service123',
    type: 'Lawn Mowing',
    date: new Date(2023, 6, 8), // July 8, 2023
    provider: {
      id: providerId || 'provider123',
      name: 'Green Lawns LLC',
      image: '/images/avatar-placeholder.jpg',
    }
  };

  const handleSubmit = async (formData: ReviewFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // In a real application, this would be an API call to submit the review
      console.log('Submitting review:', formData);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, we're simulating a successful submission
      setSubmitSuccess(true);
      
      // In a real application, we would handle the form submission here
      // await fetch('/api/reviews', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     serviceId: serviceData.id,
      //     providerId: serviceData.provider.id,
      //     ...formData
      //   })
      // });
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmitError('There was an error submitting your review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleReturnToServices = () => {
    router.push('/dashboard/services');
  };

  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Thank You for Your Review!</h1>
          <p className="text-gray-600 mb-6">
            Your feedback helps other homeowners find quality service providers and helps providers improve their services.
          </p>
          <button
            onClick={handleReturnToServices}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-6">
        <Link 
          href="/dashboard/services" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Back to Services</span>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-6">Write a Review</h1>
        
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p>{submitError}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <div className="flex items-center">
            <div className="relative w-12 h-12 mr-4 rounded-full overflow-hidden">
              <Image
                src={serviceData.provider.image}
                alt={serviceData.provider.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-medium">{serviceData.provider.name}</p>
              <p className="text-sm text-gray-600">
                {serviceData.type} • {serviceData.date.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <ReviewForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          serviceType={serviceData.type}
          providerName={serviceData.provider.name}
          className="mt-6"
        />
      </div>
    </div>
  );
} 