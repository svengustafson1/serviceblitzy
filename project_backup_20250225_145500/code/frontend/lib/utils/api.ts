import axios from 'axios';
import { 
  User, 
  AuthResponse, 
  Property, 
  ServiceRequest, 
  Bid, 
  Provider, 
  Review, 
  Notification, 
  Payment, 
  ApiResponse,
  Service
} from './types';
import safeStorage from './storage';

// Base API client configuration
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout to prevent hanging requests
  timeout: 10000,
});

// Flag to enable bypass mode (should match the value in AuthContext.tsx)
const BYPASS_AUTH = true;

// Track if we're already handling a redirect to prevent loops
let isRedirecting = false;

// Request interceptor to attach auth token if exists
apiClient.interceptors.request.use((config) => {
  try {
    // In bypass mode, we might want to prevent actual API calls
    if (BYPASS_AUTH) {
      console.log(`API BYPASS: Intercepted request to ${config.url}`);
      
      // For GET requests in bypass mode, we can return mock data instead of making the API call
      if (config.method?.toLowerCase() === 'get') {
        // This will cause the request to be canceled, and our response interceptor
        // will catch it and handle it specially
        throw new axios.Cancel('Bypassed API call in development mode');
      }
    }
    
    const token = safeStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    if (axios.isCancel(error)) {
      // This is our intentional cancellation, throw it to be caught by response interceptor
      throw error;
    }
    console.error('Error accessing token:', error);
    // Continue with the request even without the token
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle intentional cancellations in bypass mode
    if (axios.isCancel(error) && BYPASS_AUTH) {
      console.log('API BYPASS: Returning mock response for', error.message);
      
      // Return a fake successful response with empty data
      return Promise.resolve({ 
        data: {
          success: true,
          message: "API call bypassed in development mode",
          data: []
        } 
      });
    }
    
    // Check if we're already handling a redirect to prevent loops
    if (isRedirecting) {
      return Promise.reject(error);
    }
    
    // Check if it's a network error (no response)
    if (!error.response) {
      console.error('Network error or CORS issue:', error);
      
      // Only redirect if we're in the browser and not already redirecting
      if (typeof window !== 'undefined' && !isRedirecting) {
        try {
          // Get current URL path
          const currentPath = window.location.pathname;
          
          // Only redirect if not already on the login page
          if (!currentPath.includes('/login')) {
            isRedirecting = true;
            console.log('Redirecting to login due to network error');
            window.location.href = '/login?error=network';
            
            // Reset the redirect flag after a delay
            setTimeout(() => {
              isRedirecting = false;
            }, 3000);
          }
        } catch (redirectError) {
          console.error('Error during redirect:', redirectError);
        }
      }
      return Promise.reject(error);
    }
    
    // Handle 401 Unauthorized errors (token expired, etc.)
    if (error.response && error.response.status === 401) {
      // Only handle if not already redirecting
      if (typeof window !== 'undefined' && !isRedirecting) {
        try {
          // Clear stored auth data
          safeStorage.removeItem('authToken');
          safeStorage.removeItem('user');
          
          // Get current URL path
          const currentPath = window.location.pathname;
          
          // Only redirect if not already on the login page
          if (!currentPath.includes('/login')) {
            isRedirecting = true;
            console.log('Redirecting to login due to unauthorized error');
            window.location.href = '/login?session=expired';
            
            // Reset the redirect flag after a delay
            setTimeout(() => {
              isRedirecting = false;
            }, 3000);
          }
        } catch (storageError) {
          console.error('Error during logout:', storageError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Generic API methods
export const api = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) => {
      // Log login attempt for debugging
      console.log(`Login attempt with email: ${email}`);
      
      // If using the provider demo account, ensure the role is set correctly
      if (email === 'provider@example.com') {
        console.log('Provider login detected, ensuring provider role is applied');
        // This is just for logging, the actual role setting happens in the AuthContext
      }
      
      return apiClient.post<ApiResponse<AuthResponse>>('/auth/login', { email, password });
    },
    register: (userData: Partial<User>) => 
      apiClient.post<ApiResponse<AuthResponse>>('/auth/register', userData),
    getCurrentUser: () => 
      apiClient.get<ApiResponse<User>>('/auth/me'),
    updateProfile: (userData: Partial<User>) => 
      apiClient.put<ApiResponse<User>>('/auth/profile', userData),
  },
  
  // Homeowner endpoints
  homeowner: {
    getProperties: () => {
      // Add debugging for 403 errors
      try {
        const token = safeStorage.getItem('authToken');
        const userStr = safeStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        console.log('getProperties debug info:');
        console.log(`- Auth token exists: ${!!token}`);
        console.log(`- User exists: ${!!user}`);
        if (user) {
          console.log(`- User role: ${user.role}`);
          console.log(`- User ID: ${user.id}`);
          
          // Return the correct endpoint with user ID
          return apiClient.get<ApiResponse<Property[]>>(`/homeowners/${user.id}/properties`);
        }
        
        throw new Error('User information not found');
      } catch (error) {
        console.error('Error accessing auth data:', error);
        return apiClient.get<ApiResponse<Property[]>>('/homeowners/properties');
      }
    },
    getPropertyById: (id: string) => 
      apiClient.get<ApiResponse<Property>>(`/properties/${id}`),
    createProperty: (propertyData: Partial<Property>) => {
      try {
        const userStr = safeStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        if (!user || !user.id) {
          throw new Error('User information not found');
        }
        
        return apiClient.post<ApiResponse<Property>>('/properties', propertyData);
      } catch (error) {
        console.error('Error creating property:', error);
        return Promise.reject(error instanceof Error ? error : new Error('An unknown error occurred'));
      }
    },
    updateProperty: (id: string, propertyData: Partial<Property>) => 
      apiClient.put<ApiResponse<Property>>(`/properties/${id}`, propertyData),
    deleteProperty: (id: string) => 
      apiClient.delete<ApiResponse<null>>(`/properties/${id}`),
    getServiceRequests: (status?: string) => 
      apiClient.get<ApiResponse<ServiceRequest[]>>('/homeowners/service-requests', { params: { status } }),
  },
  
  // Service request endpoints
  serviceRequests: {
    getAll: () => 
      apiClient.get<ApiResponse<ServiceRequest[]>>('/service-requests'),
    getById: (id: string) => 
      apiClient.get<ApiResponse<ServiceRequest>>(`/service-requests/${id}`),
    create: (requestData: Partial<ServiceRequest>) => 
      apiClient.post<ApiResponse<ServiceRequest>>('/service-requests', requestData),
    update: (id: string, requestData: Partial<ServiceRequest>) => 
      apiClient.put<ApiResponse<ServiceRequest>>(`/service-requests/${id}`, requestData),
    delete: (id: string) => 
      apiClient.delete<ApiResponse<null>>(`/service-requests/${id}`),
    // Bids for a service request
    getBids: (requestId: string) => 
      apiClient.get<ApiResponse<Bid[]>>(`/service-requests/${requestId}/bids`),
    acceptBid: (requestId: string, bidId: string) => 
      apiClient.post<ApiResponse<ServiceRequest>>(`/service-requests/${requestId}/bids/${bidId}/accept`, {}),
  },
  
  // Provider endpoints
  provider: {
    getProfile: () => 
      apiClient.get<ApiResponse<Provider>>('/providers/profile'),
    updateProfile: (profileData: Partial<Provider>) => 
      apiClient.put<ApiResponse<Provider>>('/providers/profile', profileData),
    getJobs: (status?: string) => 
      apiClient.get<ApiResponse<ServiceRequest[]>>('/providers/jobs', { params: { status } }),
    getJobById: (id: string) => 
      apiClient.get<ApiResponse<ServiceRequest>>(`/providers/jobs/${id}`),
    updateJobStatus: (id: string, status: string) => 
      apiClient.put<ApiResponse<ServiceRequest>>(`/providers/jobs/${id}/status`, { status }),
    getAvailableRequests: () => 
      apiClient.get<ApiResponse<ServiceRequest[]>>('/providers/service-requests/available'),
    submitBid: (requestId: string, bidData: Partial<Bid>) => 
      apiClient.post<ApiResponse<Bid>>(`/service-requests/${requestId}/bids`, bidData),
    getEarnings: (period?: string) => 
      apiClient.get<ApiResponse<any>>('/providers/earnings', { params: { period } }),
  },
  
  // Service endpoints
  services: {
    getAll: () => 
      apiClient.get<ApiResponse<Service[]>>('/services'),
    getByCategory: (category: string) => 
      apiClient.get<ApiResponse<Service[]>>('/services', { params: { category } }),
    getById: (id: string) => 
      apiClient.get<ApiResponse<Service>>(`/services/${id}`),
  },
  
  // Review endpoints
  reviews: {
    getByProvider: (providerId: string) => 
      apiClient.get<ApiResponse<Review[]>>(`/providers/${providerId}/reviews`),
    createReview: (reviewData: Partial<Review>) => 
      apiClient.post<ApiResponse<Review>>('/reviews', reviewData),
    respondToReview: (reviewId: string, response: string) => 
      apiClient.post<ApiResponse<Review>>(`/reviews/${reviewId}/respond`, { response }),
  },
  
  // Notification endpoints
  notifications: {
    getAll: () => 
      apiClient.get<ApiResponse<Notification[]>>('/notifications'),
    markAsRead: (id: string) => 
      apiClient.put<ApiResponse<Notification>>(`/notifications/${id}/read`, {}),
    markAllAsRead: () => 
      apiClient.put<ApiResponse<null>>('/notifications/read-all', {}),
  },
  
  // Payment endpoints
  payments: {
    getByUser: () => 
      apiClient.get<ApiResponse<Payment[]>>('/payments'),
    getById: (id: string) => 
      apiClient.get<ApiResponse<Payment>>(`/payments/${id}`),
    createPaymentIntent: (amount: number, serviceRequestId: string) => 
      apiClient.post<ApiResponse<{ clientSecret: string }>>('/payments/create-intent', { amount, serviceRequestId }),
    confirmPayment: (paymentIntentId: string) => 
      apiClient.post<ApiResponse<Payment>>('/payments/confirm', { paymentIntentId }),
  },
};

export default api; 