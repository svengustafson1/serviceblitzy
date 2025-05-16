'use client';

import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle,
  ChevronUp,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { ReviewCard, ReviewsSummary } from '@/components/reviews';

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
  hasResponse: boolean;
  likes?: number;
  isVerified?: boolean;
}

interface ProviderStats {
  rating: number;
  totalReviews: number;
  ratingCounts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recommendPercentage: number;
  pendingResponses: number;
}

export default function ProviderReviewsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'responded'>('all');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRespondingTo, setIsRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch mock data
  useEffect(() => {
    const fetchReviewsData = async () => {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Mock stats data
        const mockStats: ProviderStats = {
          rating: 4.7,
          totalReviews: 183,
          ratingCounts: {
            5: 123,
            4: 42,
            3: 10,
            2: 5,
            1: 3
          },
          recommendPercentage: 94,
          pendingResponses: 3
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
            reviewText: 'They did an amazing job on our yard. Professional, punctual, and the quality of their work exceeded my expectations. The lawn looks better than it ever has, and they cleaned up everything meticulously before they left.',
            serviceType: 'Lawn Mowing',
            likes: 8,
            isVerified: true,
            hasResponse: false
          },
          {
            id: 'review2',
            authorName: 'Sarah Johnson',
            authorType: 'homeowner',
            rating: 5,
            date: new Date(2023, 4, 22),
            reviewText: 'I hired them to trim our overgrown hedges and they did a fantastic job. They shaped everything perfectly and our yard looks so much more polished now. Their attention to detail is impressive.',
            serviceType: 'Hedge Trimming',
            likes: 5,
            isVerified: true,
            images: ['/images/avatar-placeholder.jpg', '/images/avatar-placeholder.jpg'],
            hasResponse: false
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
            hasResponse: true,
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
            likes: 1,
            hasResponse: false
          },
          {
            id: 'review5',
            authorName: 'David Thompson',
            authorType: 'homeowner',
            rating: 5,
            date: new Date(2023, 1, 20),
            reviewText: 'I've used their services for landscaping and lawn care for the past year and they've consistently provided excellent service. Their team is knowledgeable, friendly, and they always go above and beyond. My yard has never looked better!',
            serviceType: 'Landscaping',
            likes: 12,
            isVerified: true,
            images: ['/images/avatar-placeholder.jpg', '/images/avatar-placeholder.jpg', '/images/avatar-placeholder.jpg'],
            hasResponse: true,
            providerResponse: {
              text: 'Thank you so much for your continued trust, David! We're thrilled to hear that you're happy with our services. We pride ourselves on our consistency and attention to detail, and it's wonderful to know that it shows in our work. Looking forward to maintaining your beautiful yard for years to come!',
              date: new Date(2023, 1, 21)
            }
          }
        ];

        setStats(mockStats);
        setReviews(mockReviews);

        // Initial filter based on active tab
        filterReviewsByTab(mockReviews, 'all');
      } catch (error) {
        console.error('Error fetching reviews data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviewsData();
  }, []);

  // Filter reviews based on active tab
  const filterReviewsByTab = (reviewsData: Review[], tab: 'all' | 'pending' | 'responded') => {
    let filtered = [...reviewsData];
    
    if (tab === 'pending') {
      filtered = filtered.filter(review => !review.hasResponse);
    } else if (tab === 'responded') {
      filtered = filtered.filter(review => review.hasResponse);
    }
    
    setFilteredReviews(filtered);
  };

  // Handle tab change
  const handleTabChange = (tab: 'all' | 'pending' | 'responded') => {
    setActiveTab(tab);
    filterReviewsByTab(reviews, tab);
  };

  // Handle responding to a review
  const toggleResponseForm = (reviewId: string) => {
    if (isRespondingTo === reviewId) {
      setIsRespondingTo(null);
      setResponseText('');
    } else {
      setIsRespondingTo(reviewId);
      setResponseText('');
      setSubmitSuccess(false);
    }
  };

  const handleResponseSubmit = async (reviewId: string) => {
    if (!responseText.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the review with the new response
      const updatedReviews = reviews.map(review => {
        if (review.id === reviewId) {
          return {
            ...review,
            hasResponse: true,
            providerResponse: {
              text: responseText,
              date: new Date()
            }
          };
        }
        return review;
      });
      
      setReviews(updatedReviews);
      filterReviewsByTab(updatedReviews, activeTab);
      setSubmitSuccess(true);
      
      // Reset form after a delay
      setTimeout(() => {
        setIsRespondingTo(null);
        setResponseText('');
        setSubmitSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-6"></div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Reviews & Ratings</h1>

      {/* Stats Overview */}
      {stats && (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <Star className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold">{stats.rating.toFixed(1)}</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Reviews</p>
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600 mr-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Responses</p>
                <p className="text-2xl font-bold">{stats.pendingResponses}</p>
              </div>
            </div>
          </div>
          
          <ReviewsSummary
            averageRating={stats.rating}
            totalReviews={stats.totalReviews}
            ratingCounts={stats.ratingCounts}
            recommendPercentage={stats.recommendPercentage}
            className="p-6 border rounded-lg shadow-sm"
          />
        </div>
      )}

      {/* Reviews Section */}
      <div>
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => handleTabChange('all')}
          >
            All Reviews
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'pending'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => handleTabChange('pending')}
          >
            Pending Response
            {stats && stats.pendingResponses > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {stats.pendingResponses}
              </span>
            )}
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'responded'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => handleTabChange('responded')}
          >
            Responded
          </button>
        </div>

        {filteredReviews.length === 0 ? (
          <div className="text-center py-8 border rounded-lg">
            <p className="text-gray-600">No reviews to display</p>
            {activeTab === 'pending' && (
              <p className="text-sm text-gray-500 mt-2">You've responded to all reviews!</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReviews.map((review) => (
              <div key={review.id} className="border rounded-lg shadow-sm">
                <ReviewCard
                  review={review}
                  showActions={false}
                />
                
                {review.hasResponse && review.providerResponse ? (
                  <div className="px-4 pb-4">
                    <div className="bg-blue-50 p-4 rounded-md">
                      <div className="flex justify-between">
                        <p className="font-medium text-blue-800 mb-2">Your Response</p>
                        <p className="text-xs text-gray-500">
                          {review.providerResponse.date.toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-gray-700">{review.providerResponse.text}</p>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 pb-4">
                    {isRespondingTo === review.id ? (
                      <div>
                        {submitSuccess ? (
                          <div className="bg-green-50 p-4 rounded-md flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                            <p className="text-green-700">Your response has been submitted!</p>
                          </div>
                        ) : (
                          <div>
                            <textarea
                              className="w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                              placeholder="Write your response to this review..."
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              disabled={isSubmitting}
                            ></textarea>
                            <div className="flex justify-between mt-3">
                              <p className="text-xs text-gray-500">
                                Responding publicly as Green Lawns LLC
                              </p>
                              <div className="space-x-2">
                                <button
                                  className="px-3 py-1 border rounded-md text-gray-600 hover:bg-gray-50"
                                  onClick={() => toggleResponseForm(review.id)}
                                  disabled={isSubmitting}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                                  onClick={() => handleResponseSubmit(review.id)}
                                  disabled={isSubmitting || !responseText.trim()}
                                >
                                  {isSubmitting ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                      Submitting...
                                    </>
                                  ) : (
                                    'Submit Response'
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        className="text-blue-600 hover:text-blue-800 font-medium"
                        onClick={() => toggleResponseForm(review.id)}
                      >
                        Respond to this review
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 mt-10">
        <div className="flex">
          <div className="text-blue-500 mr-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-medium text-blue-800 mb-2">Tips for Responding to Reviews</h3>
            <ul className="text-gray-700 space-y-2 text-sm">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Thank the customer for their feedback, whether positive or negative</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Address specific points mentioned in the review</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>For negative reviews, apologize for any issues and explain how you'll address them</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Keep responses professional and concise</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Respond promptly, especially to negative reviews</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 