'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Star, MapPin, Award, VerifiedIcon } from 'lucide-react';
import { ReviewsSummary, ReviewsList } from '@/components/reviews';

interface Review {
  id: string;
  authorName: string;
  authorImage?: string;
  authorType: 'homeowner' | 'provider';
  rating: number;
  date: Date;
  reviewText: string;
  images?: string[];
  serviceType?: string;
  providerResponse?: {
    text: string;
    date: Date;
  };
  likes?: number;
  isVerified?: boolean;
}

interface Provider {
  id: string;
  name: string;
  image: string;
  rating: number;
  totalReviews: number;
  serviceArea: string;
  joinDate: string;
  isVerified: boolean;
  services: string[];
  ratingCounts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recommendPercentage: number;
}

export default function ProviderReviewsPage({ params }: { params: { id: string } }) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would be an API call to fetch the provider data and reviews
    const fetchProviderData = async () => {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Mock provider data
        const mockProvider: Provider = {
          id: params.id,
          name: 'Green Lawns LLC',
          image: '/images/avatar-placeholder.jpg',
          rating: 4.7,
          totalReviews: 183,
          serviceArea: 'Anytown, CA and surrounding areas',
          joinDate: 'June 2021',
          isVerified: true,
          services: ['Lawn Mowing', 'Hedge Trimming', 'Garden Cleanup', 'Landscaping'],
          ratingCounts: {
            5: 123,
            4: 42,
            3: 10,
            2: 5,
            1: 3
          },
          recommendPercentage: 94
        };

        // Mock reviews data
        const mockReviews: Review[] = [
          {
            id: 'review1',
            authorName: 'John Smith',
            authorImage: '/images/avatar-placeholder.jpg',
            authorType: 'homeowner',
            rating: 5,
            date: new Date(2023, 5, 15),
            reviewText: 'Green Lawns LLC did an amazing job on our yard. They were professional, punctual, and the quality of their work exceeded my expectations. The lawn looks better than it ever has, and they cleaned up everything meticulously before they left. I highly recommend their services to anyone looking for top-notch lawn care.',
            serviceType: 'Lawn Mowing',
            likes: 8,
            isVerified: true
          },
          {
            id: 'review2',
            authorName: 'Sarah Johnson',
            authorType: 'homeowner',
            rating: 5,
            date: new Date(2023, 4, 22),
            reviewText: 'I hired Green Lawns to trim our overgrown hedges and they did a fantastic job. They shaped everything perfectly and our yard looks so much more polished now. Their attention to detail is impressive.',
            serviceType: 'Hedge Trimming',
            likes: 5,
            isVerified: true,
            images: ['/images/avatar-placeholder.jpg', '/images/avatar-placeholder.jpg']
          },
          {
            id: 'review3',
            authorName: 'Michael Lee',
            authorType: 'homeowner',
            rating: 4,
            date: new Date(2023, 3, 10),
            reviewText: 'Good service overall. They did a thorough job on the garden cleanup and were respectful of our property. The only reason I'm not giving 5 stars is that they were about 30 minutes late to our appointment. Otherwise, the quality of work was excellent.',
            serviceType: 'Garden Cleanup',
            likes: 2,
            providerResponse: {
              text: 'Thank you for your feedback, Michael. We apologize for being late to your appointment. We got delayed at our previous job due to unexpected complications. We're working on improving our scheduling to ensure we're always on time for our valued customers.',
              date: new Date(2023, 3, 11)
            }
          },
          {
            id: 'review4',
            authorName: 'Emily Wilson',
            authorType: 'homeowner',
            rating: 3,
            date: new Date(2023, 2, 5),
            reviewText: 'The lawn mowing service was average. They did the job quickly but missed a few spots that I had to point out. They did come back and fix it, which I appreciated, but it would have been better if they had been more thorough from the start.',
            serviceType: 'Lawn Mowing',
            likes: 1
          },
          {
            id: 'review5',
            authorName: 'David Thompson',
            authorType: 'homeowner',
            rating: 5,
            date: new Date(2023, 1, 20),
            reviewText: 'I've used Green Lawns LLC for landscaping and lawn care for the past year and they've consistently provided excellent service. Their team is knowledgeable, friendly, and they always go above and beyond. My yard has never looked better!',
            serviceType: 'Landscaping',
            likes: 12,
            isVerified: true,
            images: ['/images/avatar-placeholder.jpg', '/images/avatar-placeholder.jpg', '/images/avatar-placeholder.jpg']
          }
        ];

        setProvider(mockProvider);
        setReviews(mockReviews);
      } catch (error) {
        console.error('Error fetching provider data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProviderData();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-6"></div>
          <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
          <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-center">
        <p className="text-gray-600">Provider not found</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link 
          href="/dashboard/services" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Back to Services</span>
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="relative w-16 h-16 mr-4 rounded-full overflow-hidden">
            <Image
              src={provider.image}
              alt={provider.name}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              {provider.name}
              {provider.isVerified && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <VerifiedIcon className="h-3 w-3 mr-1" /> Verified
                </span>
              )}
            </h1>
            <div className="flex items-center text-gray-600 text-sm">
              <div className="flex items-center mr-4">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                <span>{provider.rating} ({provider.totalReviews} reviews)</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{provider.serviceArea}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {provider.services.map((service, index) => (
            <span key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
              {service}
            </span>
          ))}
        </div>

        <div className="text-sm text-gray-600 mb-6">
          <div className="flex items-center">
            <Award className="h-4 w-4 mr-1" />
            <span>Member since {provider.joinDate}</span>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Reviews & Ratings</h2>
        <ReviewsSummary
          averageRating={provider.rating}
          totalReviews={provider.totalReviews}
          ratingCounts={provider.ratingCounts}
          recommendPercentage={provider.recommendPercentage}
          className="p-6 border rounded-lg shadow-sm mb-8"
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Customer Reviews</h2>
        <ReviewsList 
          reviews={reviews}
          className="mb-8"
        />
      </div>

      <div className="text-center mt-8">
        <Link 
          href={`/dashboard/services/reviews/new?providerId=${provider.id}`}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block"
        >
          Write a Review
        </Link>
      </div>
    </div>
  );
} 