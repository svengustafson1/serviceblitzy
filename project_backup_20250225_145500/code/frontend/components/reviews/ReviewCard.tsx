'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ThumbsUp, Flag } from 'lucide-react';
import StarRating from './StarRating';

interface ReviewCardProps {
  review: {
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
  };
  showActions?: boolean;
  showServiceType?: boolean;
  showProviderResponse?: boolean;
  className?: string;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  showActions = true,
  showServiceType = true,
  showProviderResponse = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(review.likes || 0);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLike = () => {
    if (!isLiked) {
      setLikeCount(likeCount + 1);
      setIsLiked(true);
    } else {
      setLikeCount(likeCount - 1);
      setIsLiked(false);
    }
  };

  const hasLongText = review.reviewText.length > 250;
  const displayText = isExpanded || !hasLongText 
    ? review.reviewText 
    : `${review.reviewText.substring(0, 250)}...`;

  return (
    <div className={`border rounded-lg p-4 mb-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="relative w-10 h-10 mr-3 rounded-full overflow-hidden bg-gray-200">
            {review.authorImage ? (
              <Image
                src={review.authorImage}
                alt={review.authorName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600">
                {review.authorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center">
              <h3 className="font-medium">{review.authorName}</h3>
              {review.isVerified && (
                <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                  Verified
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {formatDistanceToNow(review.date, { addSuffix: true })}
              {showServiceType && review.serviceType && (
                <span className="ml-2">• {review.serviceType}</span>
              )}
            </div>
          </div>
        </div>
        <StarRating initialRating={review.rating} readOnly size="sm" />
      </div>

      <div className="mb-3">
        <p className="text-gray-700">
          {displayText}
          {hasLongText && (
            <button 
              onClick={toggleExpanded} 
              className="ml-1 text-blue-600 hover:underline text-sm font-medium"
            >
              {isExpanded ? 'Read less' : 'Read more'}
            </button>
          )}
        </p>
      </div>

      {review.images && review.images.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {(showAllImages ? review.images : review.images.slice(0, 3)).map((image, index) => (
              <div key={index} className="relative h-20 w-20 rounded-md overflow-hidden">
                <Image
                  src={image}
                  alt={`Review photo ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
            {!showAllImages && review.images.length > 3 && (
              <button
                onClick={() => setShowAllImages(true)}
                className="h-20 w-20 bg-gray-100 rounded-md flex items-center justify-center text-gray-700 font-medium"
              >
                +{review.images.length - 3} more
              </button>
            )}
          </div>
        </div>
      )}

      {showProviderResponse && review.providerResponse && (
        <div className="bg-gray-50 p-3 rounded-md mb-3">
          <div className="text-sm font-medium mb-1">Provider Response</div>
          <p className="text-sm text-gray-700">{review.providerResponse.text}</p>
          <div className="text-xs text-gray-500 mt-1">
            {formatDistanceToNow(review.providerResponse.date, { addSuffix: true })}
          </div>
        </div>
      )}

      {showActions && (
        <div className="flex items-center pt-2 text-sm">
          <button 
            onClick={handleLike}
            className={`flex items-center mr-4 ${isLiked ? 'text-blue-600' : 'text-gray-500'} hover:text-blue-600`}
            aria-label={isLiked ? "Unlike this review" : "Like this review"}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            <span>{likeCount > 0 ? likeCount : ''} Helpful</span>
          </button>
          <button 
            className="flex items-center mr-4 text-gray-500 hover:text-blue-600"
            aria-label="Reply to this review"
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            <span>Reply</span>
          </button>
          <button 
            className="flex items-center text-gray-500 hover:text-red-600"
            aria-label="Report this review"
          >
            <Flag className="h-4 w-4 mr-1" />
            <span>Report</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewCard; 