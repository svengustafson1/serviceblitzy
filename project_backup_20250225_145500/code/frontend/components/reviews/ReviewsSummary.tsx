'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface ReviewsSummaryProps {
  averageRating: number;
  totalReviews: number;
  ratingCounts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recommendPercentage?: number;
  className?: string;
}

export const ReviewsSummary: React.FC<ReviewsSummaryProps> = ({
  averageRating,
  totalReviews,
  ratingCounts,
  recommendPercentage,
  className = '',
}) => {
  // Calculate percentages for the rating bars
  const getPercentage = (count: number) => {
    if (totalReviews === 0) return 0;
    return (count / totalReviews) * 100;
  };

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-gray-800 mb-2">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(averageRating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <div className="text-gray-600 mb-1">
            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </div>
          {recommendPercentage !== undefined && (
            <div className="text-gray-600 text-sm mt-2">
              {recommendPercentage}% of customers recommend this provider
            </div>
          )}
        </div>

        <div>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center">
                <div className="flex items-center w-12">
                  <span className="mr-1">{rating}</span>
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mx-2 flex-grow">
                  <div
                    className="bg-yellow-400 h-2.5 rounded-full"
                    style={{ width: `${getPercentage(ratingCounts[rating as keyof typeof ratingCounts])}%` }}
                  ></div>
                </div>
                <div className="w-10 text-right text-sm text-gray-600">
                  {ratingCounts[rating as keyof typeof ratingCounts]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewsSummary; 