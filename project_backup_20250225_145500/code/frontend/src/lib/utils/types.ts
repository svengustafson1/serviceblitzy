// User related types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'homeowner' | 'provider' | 'admin';
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Property related types
export interface Property {
  id: string;
  homeownerId: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  propertySize: number;
  notes?: string;
  qrCodeUrl?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Service related types
export interface Service {
  id: string;
  name: string;
  category: string;
  description?: string;
  imageUrl?: string;
}

export interface ServiceRequest {
  id: string;
  homeownerId: string;
  propertyId: string;
  serviceId: string;
  status: 'draft' | 'pending' | 'bidding' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  description?: string;
  requestDate: string;
  preferredDate?: string;
  preferredTime?: string;
  frequency?: 'one_time' | 'weekly' | 'bi_weekly' | 'monthly';
  property?: Property;
  service?: Service;
  bids?: Bid[];
  createdAt?: string;
  updatedAt?: string;
}

// Bid related types
export interface Bid {
  id: string;
  serviceRequestId: string;
  providerId: string;
  price: number;
  estimatedHours: number;
  description: string;
  status: 'pending' | 'accepted' | 'declined';
  availability: string[];
  provider?: Provider;
  createdAt?: string;
  updatedAt?: string;
}

// Provider related types
export interface Provider {
  id: string;
  userId: string;
  companyName: string;
  businessAddress?: string;
  businessPhone?: string;
  bio?: string;
  avgRating?: number;
  totalReviews?: number;
  profileImage?: string;
  serviceAreas?: string[];
  services?: Service[];
  createdAt?: string;
  updatedAt?: string;
}

// Review related types
export interface Review {
  id: string;
  serviceRequestId: string;
  homeownerId: string;
  providerId: string;
  rating: number;
  comment: string;
  isRecommended: boolean;
  providerResponse?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Notification related types
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: any;
  createdAt?: string;
}

// Payment related types
export interface Payment {
  id: string;
  serviceRequestId: string;
  homeownerId: string;
  providerId: string;
  amount: number;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  paymentMethod?: string;
  paymentDate?: string;
  stripePaymentIntentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
} 