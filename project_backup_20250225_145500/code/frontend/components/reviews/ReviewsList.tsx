'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, SortDesc, SortAsc } from 'lucide-react';
import ReviewCard from './ReviewCard';

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

interface ReviewsListProps {
  reviews: Review[];
  showServiceTypes?: boolean;
  showProviderResponses?: boolean;
  className?: string;
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'most-relevant';
type FilterOption = 'all' | '5' | '4' | '3' | '2' | '1' | 'with-photos' | 'with-responses';

export const ReviewsList: React.FC<ReviewsListProps> = ({
  reviews,
  showServiceTypes = true,
  showProviderResponses = true,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredAndSortedReviews = useMemo(() => {
    // First apply filters
    let result = [...reviews];
    
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      result = result.filter(review => 
        review.reviewText.toLowerCase().includes(lowercasedTerm) ||
        review.authorName.toLowerCase().includes(lowercasedTerm) ||
        (review.serviceType && review.serviceType.toLowerCase().includes(lowercasedTerm))
      );
    }
    
    // Apply star rating filter
    if (['5', '4', '3', '2', '1'].includes(filterBy)) {
      const ratingFilter = parseInt(filterBy, 10);
      result = result.filter(review => review.rating === ratingFilter);
    }
    
    // Filter by photos
    if (filterBy === 'with-photos') {
      result = result.filter(review => review.images && review.images.length > 0);
    }
    
    // Filter by provider responses
    if (filterBy === 'with-responses') {
      result = result.filter(review => review.providerResponse);
    }
    
    // Then sort
    switch (sortBy) {
      case 'newest':
        return result.sort((a, b) => b.date.getTime() - a.date.getTime());
      case 'oldest':
        return result.sort((a, b) => a.date.getTime() - b.date.getTime());
      case 'highest':
        return result.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return result.sort((a, b) => a.rating - b.rating);
      case 'most-relevant':
        // Most relevant could be a complex algorithm considering likes, recency, etc.
        // This is a simple implementation prioritizing verified reviews, likes, and recency
        return result.sort((a, b) => {
          const scoreA = (a.isVerified ? 10 : 0) + (a.likes || 0) - ((new Date().getTime() - a.date.getTime()) / 86400000 / 30);
          const scoreB = (b.isVerified ? 10 : 0) + (b.likes || 0) - ((new Date().getTime() - b.date.getTime()) / 86400000 / 30);
          return scoreB - scoreA;
        });
      default:
        return result;
    }
  }, [reviews, searchTerm, sortBy, filterBy]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortOption);
  };

  const handleFilterChange = (filter: FilterOption) => {
    setFilterBy(filter);
    setIsFilterOpen(false);
  };

  const toggleFilterMenu = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search reviews"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={toggleFilterMenu}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md"
                aria-label="Filter reviews"
              >
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </button>
              
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                  <div className="py-1">
                    <button
                      onClick={() => handleFilterChange('all')}
                      className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 ${filterBy === 'all' ? 'bg-blue-50 text-blue-600' : ''}`}
                    >
                      All Reviews
                    </button>
                    <button
                      onClick={() => handleFilterChange('5')}
                      className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 ${filterBy === '5' ? 'bg-blue-50 text-blue-600' : ''}`}
                    >
                      5 Star Reviews
                    </button>
                    <button
                      onClick={() => handleFilterChange('4')}
                      className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 ${filterBy === '4' ? 'bg-blue-50 text-blue-600' : ''}`}
                    >
                      4 Star Reviews
                    </button>
                    <button
                      onClick={() => handleFilterChange('3')}
                      className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 ${filterBy === '3' ? 'bg-blue-50 text-blue-600' : ''}`}
                    >
                      3 Star Reviews
                    </button>
                    <button
                      onClick={() => handleFilterChange('2')}
                      className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 ${filterBy === '2' ? 'bg-blue-50 text-blue-600' : ''}`}
                    >
                      2 Star Reviews
                    </button>
                    <button
                      onClick={() => handleFilterChange('1')}
                      className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 ${filterBy === '1' ? 'bg-blue-50 text-blue-600' : ''}`}
                    >
                      1 Star Reviews
                    </button>
                    <button
                      onClick={() => handleFilterChange('with-photos')}
                      className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 ${filterBy === 'with-photos' ? 'bg-blue-50 text-blue-600' : ''}`}
                    >
                      With Photos
                    </button>
                    <button
                      onClick={() => handleFilterChange('with-responses')}
                      className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 ${filterBy === 'with-responses' ? 'bg-blue-50 text-blue-600' : ''}`}
                    >
                      With Responses
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative">
              <div className="flex items-center space-x-1">
                {sortBy === 'newest' || sortBy === 'highest' ? (
                  <SortDesc className="h-4 w-4 text-gray-500" />
                ) : (
                  <SortAsc className="h-4 w-4 text-gray-500" />
                )}
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="block appearance-none bg-white border border-gray-300 rounded-md pl-2 pr-8 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Sort reviews"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Highest Rated</option>
                  <option value="lowest">Lowest Rated</option>
                  <option value="most-relevant">Most Relevant</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          {filteredAndSortedReviews.length} {filteredAndSortedReviews.length === 1 ? 'review' : 'reviews'}
          {filterBy !== 'all' && ' (filtered)'}
        </div>
      </div>
      
      {filteredAndSortedReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredAndSortedReviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              showServiceType={showServiceTypes}
              showProviderResponse={showProviderResponses}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">No reviews match your criteria</p>
          {(searchTerm || filterBy !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterBy('all');
              }}
              className="text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewsList; 