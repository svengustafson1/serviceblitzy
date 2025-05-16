'use client';

import React, { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import StarRating from './StarRating';

interface ReviewFormProps {
  onSubmit: (reviewData: ReviewFormData) => void;
  onCancel?: () => void;
  initialData?: Partial<ReviewFormData>;
  className?: string;
  serviceType?: string;
  providerName?: string;
}

export interface ReviewFormData {
  rating: number;
  reviewText: string;
  images: File[];
  serviceType?: string;
  recommend: boolean;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  className = '',
  serviceType,
  providerName,
}) => {
  const [formData, setFormData] = useState<ReviewFormData>({
    rating: initialData?.rating || 0,
    reviewText: initialData?.reviewText || '',
    images: initialData?.images || [],
    serviceType: initialData?.serviceType || serviceType,
    recommend: initialData?.recommend || true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ReviewFormData, string>>>({});
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
    if (errors.rating) {
      setErrors(prev => ({ ...prev, rating: undefined }));
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const reviewText = e.target.value;
    setFormData(prev => ({ ...prev, reviewText }));
    if (errors.reviewText && reviewText.trim().length >= 10) {
      setErrors(prev => ({ ...prev, reviewText: undefined }));
    }
  };

  const handleRecommendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, recommend: e.target.checked }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Limit to 5 images total
      const combinedFiles = [...formData.images, ...newFiles].slice(0, 5);
      
      setFormData(prev => ({ ...prev, images: combinedFiles }));
      
      // Generate preview URLs
      const newPreviewUrls = [...imagePreviewUrls];
      newFiles.forEach(file => {
        const url = URL.createObjectURL(file);
        newPreviewUrls.push(url);
      });
      
      setImagePreviewUrls(newPreviewUrls.slice(0, 5));
    }
  };

  const handleImageRemove = (index: number) => {
    const updatedImages = [...formData.images];
    updatedImages.splice(index, 1);
    setFormData(prev => ({ ...prev, images: updatedImages }));

    const updatedUrls = [...imagePreviewUrls];
    URL.revokeObjectURL(updatedUrls[index]);
    updatedUrls.splice(index, 1);
    setImagePreviewUrls(updatedUrls);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        file => file.type.startsWith('image/')
      );
      
      // Limit to 5 images total
      const combinedFiles = [...formData.images, ...droppedFiles].slice(0, 5);
      
      setFormData(prev => ({ ...prev, images: combinedFiles }));
      
      // Generate preview URLs
      const newPreviewUrls = [...imagePreviewUrls];
      droppedFiles.forEach(file => {
        const url = URL.createObjectURL(file);
        newPreviewUrls.push(url);
      });
      
      setImagePreviewUrls(newPreviewUrls.slice(0, 5));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ReviewFormData, string>> = {};
    
    if (formData.rating === 0) {
      newErrors.rating = 'Please provide a rating';
    }
    
    if (formData.reviewText.trim().length < 10) {
      newErrors.reviewText = 'Review must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">
            {providerName 
              ? `Rate your experience with ${providerName}` 
              : 'Rate your experience'}
          </h3>
          {serviceType && (
            <p className="text-gray-600 text-sm mb-3">Service: {serviceType}</p>
          )}
          
          <div className="mb-1">Your rating</div>
          <StarRating 
            initialRating={formData.rating} 
            size="lg"
            onRatingChange={handleRatingChange} 
          />
          {errors.rating && (
            <div className="mt-1 text-red-500 text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.rating}
            </div>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="reviewText" className="block mb-2 font-medium">
            Write your review
          </label>
          <textarea
            id="reviewText"
            rows={4}
            className="w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="What did you like or dislike? What was the quality of the service?"
            value={formData.reviewText}
            onChange={handleTextChange}
          ></textarea>
          <div className="flex justify-between mt-1">
            {errors.reviewText ? (
              <div className="text-red-500 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.reviewText}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">
                {formData.reviewText.length} characters
                (min 10)
              </div>
            )}
            <div className="text-gray-500 text-sm">
              {4000 - formData.reviewText.length} characters remaining
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-medium">
            Add photos (optional)
          </label>
          <div
            className={`border-2 border-dashed rounded-md p-4 text-center ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500 mb-1">
              Drag & drop images here or click to browse
            </p>
            <p className="text-xs text-gray-400">
              JPEG, PNG • Max 5 images • Max 5MB each
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id="image-upload"
              onChange={handleImageUpload}
              disabled={formData.images.length >= 5}
            />
            <label
              htmlFor="image-upload"
              className={`mt-2 inline-block px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 ${
                formData.images.length >= 5 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              Browse files
            </label>
          </div>

          {imagePreviewUrls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <div className="relative h-20 w-20 rounded-md overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleImageRemove(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3">
            <p className="text-sm text-gray-500">
              {5 - formData.images.length} more photos can be added
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center">
            <input
              id="recommend"
              type="checkbox"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={formData.recommend}
              onChange={handleRecommendChange}
            />
            <label htmlFor="recommend" className="ml-2 block text-gray-700">
              I would recommend this service provider
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Submit Review
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm; 