# Home Services Platform - Technical Style Guide

This document serves as a comprehensive reference for the technologies, styling approaches, and component structures used in the Home Services Platform. Use this guide when creating new applications to ensure consistency in look, feel, and functionality.

## Technology Stack

### Frontend

#### Core Technologies
- **Next.js 15.1.7**: React framework for building the user interface with server-side rendering and static site generation capabilities
- **React 19.0.0**: UI library for building component-based interfaces
- **TypeScript 5+**: Type-safe JavaScript superset for improved developer experience and code quality

#### State Management
- **React Context API**: Used for global state management (AuthContext)
- **Zustand 5.0.3**: Lightweight state management solution for local component state
- **React Hook Form 7.54.2**: Form state management and validation

#### Styling
- **Tailwind CSS 3.4.1**: Utility-first CSS framework for styling components
- **class-variance-authority 0.7.1**: For creating variant-based component styling
- **tailwind-merge 3.0.2**: For merging Tailwind CSS classes conditionally
- **clsx 2.1.1**: Utility for conditionally joining class names

#### UI Component Libraries
- **Radix UI**: Unstyled, accessible UI components
  - Accordion, Alert Dialog, Aspect Ratio, Avatar, Slot
- **Lucide React 0.475.0**: Icon library

#### Authentication
- **Firebase 11.3.1**: Used for authentication services
- **JWT**: Token-based authentication for API requests

#### API Communication
- **Axios 1.7.9**: HTTP client for making API requests
- **Socket.IO Client 4.7.2**: Real-time bidirectional event-based communication

#### Form Validation
- **Zod 3.24.2**: Schema validation library
- **@hookform/resolvers 4.1.2**: For connecting Zod with React Hook Form

#### Date/Time Handling
- **date-fns 4.1.0**: Library for date manipulation and formatting
- **rrule 2.8.1**: RFC5545 compliant library for recurring date patterns

#### Mapping
- **Mapbox GL 2.15.0**: Map visualization
- **React Map GL 7.1.9**: React wrapper for Mapbox GL

#### Payments
- **Stripe (@stripe/react-stripe-js 3.1.1, @stripe/stripe-js 5.7.0)**: Payment processing
- **@stripe/connect-js 3.0.0**: Stripe Connect integration for provider onboarding and payouts

#### File Upload
- **react-dropzone 14.2.3**: Drag and drop file upload component
- **@uppy/core 3.8.0**: Modular file upload library
- **@uppy/react 3.2.1**: React components for Uppy

### Backend

#### Core Technologies
- **Node.js**: JavaScript runtime for the backend
- **Express 4.21.2**: Web framework for building the API
- **PostgreSQL**: Relational database for data storage

#### Authentication & Security
- **bcrypt 5.1.1**: Password hashing library
- **jsonwebtoken 9.0.2**: JWT generation and validation
- **Firebase Admin 13.1.0**: Admin SDK for Firebase integration

#### Database
- **pg 8.13.3**: PostgreSQL client for Node.js

#### Real-time Communication
- **Socket.IO 4.7.2**: Server-side WebSocket implementation with fallbacks
- **Socket.IO Redis Adapter 8.2.1**: Redis adapter for Socket.IO clustering

#### File Storage
- **AWS SDK 3.0.0**: Official SDK for AWS services
- **multer 1.4.5-lts.1**: Middleware for handling multipart/form-data
- **multer-s3 3.0.1**: Multer storage engine for AWS S3

#### Payment Processing
- **Stripe 17.7.0**: Payment processing API
- **Stripe Connect**: Provider onboarding and payout management

#### Scheduling
- **rrule 2.8.1**: RFC5545 compliant library for recurring date patterns
- **Bull 4.12.2**: Redis-based queue for job scheduling

#### AI Services
- **TensorFlow.js 4.17.0**: Machine learning library for recommendation engine
- **natural 6.10.4**: Natural language processing for text analysis

#### Development Tools
- **nodemon 3.0.1**: Development server with auto-reload

## Design System

### Color Palette

The application uses a system of CSS variables for consistent theming:

```css
:root {
  --foreground-rgb: 0, 0, 0;
  --background-rgb: 255, 255, 255;
}
```

The Tailwind configuration extends these colors:

```typescript
theme: {
  extend: {
    colors: {
      background: "var(--background)",
      foreground: "var(--foreground)",
    },
  },
}
```

### UI Components Structure

The UI components follow a modular structure based on the shadcn/ui approach:

#### Button Component
```tsx
// Example of button component with variants
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### Common UI Components

The platform uses the following UI components with consistent styling:

1. **Accordion**: Collapsible content sections
2. **Alert**: Contextual feedback messages
3. **Alert Dialog**: Modal dialogs for confirmations
4. **Aspect Ratio**: Container with a defined aspect ratio
5. **Avatar**: User profile images
6. **Badge**: Small status indicators
7. **Button**: Interactive elements with variants
8. **Calendar**: Date picking component
9. **Notification**: Toast-style notification system
10. **Messaging**: Chat interface components
11. **File Upload**: Components for uploading files with preview and progress
12. **Recommendation Card**: Components for displaying AI-powered recommendations

#### File Upload Component

```tsx
// Example of file upload component with drag and drop
const FileUpload = ({ onUpload, maxFiles = 5, acceptedFileTypes = ['image/*', 'application/pdf'] }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  
  const onDrop = useCallback(acceptedFiles => {
    setFiles(prev => [...prev, ...acceptedFiles.map(file => 
      Object.assign(file, { preview: URL.createObjectURL(file) })
    )]);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
  });
  
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      const response = await axios.post('/api/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });
      
      onUpload(response.data);
      setFiles([]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      setProgress({});
    }
  };
  
  return (
    <div className="w-full">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          <UploadIcon className="h-8 w-8 text-gray-400" />
          {isDragActive ? (
            <p>Drop the files here...</p>
          ) : (
            <p>Drag & drop files here, or click to select files</p>
          )}
          <p className="text-xs text-gray-500">
            {`Up to ${maxFiles} files. ${acceptedFileTypes.join(', ')} accepted.`}
          </p>
        </div>
      </div>
      
      {files.length > 0 && (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center space-x-2">
                  <FileIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm truncate max-w-xs">{file.name}</span>
                  <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  onClick={() => setFiles(files.filter((_, i) => i !== index))}
                  className="text-red-500 hover:text-red-700"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
          
          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

#### WebSocket Notification Component

```tsx
// Example of WebSocket notification component
const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const { user, getToken } = useAuth();
  
  useEffect(() => {
    if (user) {
      // Initialize Socket.IO connection with authentication
      const socketInstance = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL, {
        auth: {
          token: getToken()
        },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5
      });
      
      socketInstance.on('connect', () => {
        console.log('WebSocket connected');
      });
      
      socketInstance.on('notification', (data) => {
        setNotifications(prev => [data, ...prev]);
        // Trigger toast notification
        toast({
          title: data.title,
          description: data.message,
          variant: data.type || 'default',
        });
      });
      
      socketInstance.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });
      
      setSocket(socketInstance);
      
      return () => {
        socketInstance.disconnect();
      };
    }
  }, [user, getToken]);
  
  const markAsRead = useCallback((notificationId) => {
    if (socket) {
      socket.emit('notification:read', { notificationId }, (response) => {
        if (response.success) {
          setNotifications(prev => 
            prev.map(notification => 
              notification.id === notificationId 
                ? { ...notification, read: true } 
                : notification
            )
          );
        }
      });
    }
  }, [socket]);
  
  const clearNotifications = useCallback(() => {
    if (socket) {
      socket.emit('notifications:clear', {}, (response) => {
        if (response.success) {
          setNotifications([]);
        }
      });
    }
  }, [socket]);
  
  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      markAsRead, 
      clearNotifications,
      socket
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
```

### Page Layout

The application follows a specific layout structure:

```
app/
├── (auth)/          # Authentication-related pages
├── (dashboard)/     # Dashboard pages for homeowners
├── (provider-dashboard)/ # Dashboard pages for service providers
├── api/             # API routes
├── contact/         # Contact page
├── login/           # Login page
├── p/               # Public pages
├── register/        # Registration page
├── services/        # Services-related pages
├── globals.css      # Global styles
├── layout.tsx       # Root layout
└── page.tsx         # Home page
```

### Form Handling Patterns

Forms are built using React Hook Form with Zod validation:

```typescript
// Example pattern for form creation
const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function LoginForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Form submission logic
}
```

### API Integration Pattern

The application uses custom hooks for API integration:

```typescript
// Example of an API hook
export const useServiceRequests = () => {
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/service-requests`);
      setServiceRequests(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch service requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceRequests();
  }, []);

  return { serviceRequests, loading, error, refetch: fetchServiceRequests };
};
```

### WebSocket Integration Pattern

```typescript
// Example of WebSocket hook for real-time updates
export const useWebSocketEvents = (eventType, callback) => {
  const { socket } = useContext(NotificationContext);
  
  useEffect(() => {
    if (!socket) return;
    
    // Subscribe to specific event type
    socket.on(eventType, callback);
    
    // Cleanup subscription on unmount
    return () => {
      socket.off(eventType, callback);
    };
  }, [socket, eventType, callback]);
  
  // Function to emit events
  const emitEvent = useCallback((event, data, ack) => {
    if (socket) {
      socket.emit(event, data, ack);
    }
  }, [socket]);
  
  return { emitEvent, connected: !!socket && socket.connected };
};

// Usage example for service status updates
const ServiceStatusMonitor = ({ serviceRequestId }) => {
  const [status, setStatus] = useState('pending');
  
  const handleStatusUpdate = useCallback((data) => {
    if (data.serviceRequestId === serviceRequestId) {
      setStatus(data.status);
      // Show notification or update UI
    }
  }, [serviceRequestId]);
  
  const { emitEvent } = useWebSocketEvents('service:status', handleStatusUpdate);
  
  // Subscribe to specific service updates
  useEffect(() => {
    emitEvent('subscribe:service', { serviceRequestId });
    
    return () => {
      emitEvent('unsubscribe:service', { serviceRequestId });
    };
  }, [emitEvent, serviceRequestId]);
  
  return (
    <div className="service-status">
      <StatusBadge status={status} />
    </div>
  );
};
```

### File Upload Integration Pattern

```typescript
// Example of file upload hook
export const useFileUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  const uploadFiles = async (files, options = {}) => {
    const {
      relatedTo = null,
      relatedId = null,
      description = '',
      tags = [],
    } = options;
    
    if (!files || files.length === 0) return [];
    
    setUploading(true);
    setProgress(0);
    setError(null);
    
    const formData = new FormData();
    
    // Append each file to form data
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    
    // Add metadata
    if (relatedTo) formData.append('relatedTo', relatedTo);
    if (relatedId) formData.append('relatedId', relatedId);
    if (description) formData.append('description', description);
    if (tags.length) formData.append('tags', JSON.stringify(tags));
    
    try {
      const response = await axios.post('/api/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });
      
      setFiles(response.data.data);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
    }
  };
  
  return { 
    files, 
    uploading, 
    progress, 
    error, 
    uploadFiles,
    reset: () => {
      setFiles([]);
      setProgress(0);
      setError(null);
    }
  };
};
```

### AWS S3 Integration Pattern

```javascript
// Backend implementation for S3 file storage
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const crypto = require('crypto');
const path = require('path');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// Configure multer for S3 uploads
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'private',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      // Generate unique filename with original extension
      const uniqueFilename = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
      
      // Determine folder based on related entity
      let folder = 'uploads';
      if (req.body.relatedTo === 'PROPERTY') {
        folder = `properties/${req.body.relatedId}`;
      } else if (req.body.relatedTo === 'SERVICE_REQUEST') {
        folder = `service-requests/${req.body.relatedId}`;
      } else if (req.body.relatedTo === 'USER') {
        folder = `users/${req.body.relatedId}`;
      }
      
      cb(null, `${folder}/${uniqueFilename}`);
    },
    metadata: (req, file, cb) => {
      cb(null, {
        'originalname': file.originalname,
        'content-type': file.mimetype,
        'related-to': req.body.relatedTo || '',
        'related-id': req.body.relatedId || '',
        'description': req.body.description || ''
      });
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Validate file types
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and office documents are allowed.'), false);
    }
  }
});

// Generate pre-signed URL for secure access
const getSignedUrl = (key, expires = 3600) => {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Expires: expires // URL expires in 1 hour
  });
};

module.exports = { upload, getSignedUrl, s3 };
```

### Recurring Schedule Pattern with RRule

```javascript
// Example of recurring schedule implementation
const { RRule, RRuleSet, rrulestr } = require('rrule');
const moment = require('moment-timezone');

class RecurringScheduleService {
  // Create a recurring schedule from user input
  createSchedulePattern(options) {
    const {
      frequency,      // 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'
      interval = 1,   // Every X days/weeks/months/years
      startDate,      // First occurrence date
      endDate = null, // Optional end date
      count = null,   // Optional number of occurrences
      byWeekday = [], // For weekly: ['MO', 'WE', 'FR']
      byMonthDay = [], // For monthly: [1, 15] (1st and 15th)
      byMonth = [],   // For yearly: [1, 6] (Jan and Jun)
      timezone = 'America/New_York'
    } = options;
    
    // Convert frequency string to RRule constant
    const freqMap = {
      'DAILY': RRule.DAILY,
      'WEEKLY': RRule.WEEKLY,
      'MONTHLY': RRule.MONTHLY,
      'YEARLY': RRule.YEARLY
    };
    
    // Convert weekday strings to RRule constants if provided
    const weekdayMap = {
      'MO': RRule.MO,
      'TU': RRule.TU,
      'WE': RRule.WE,
      'TH': RRule.TH,
      'FR': RRule.FR,
      'SA': RRule.SA,
      'SU': RRule.SU
    };
    
    const ruleOptions = {
      freq: freqMap[frequency],
      interval: interval,
      dtstart: moment.tz(startDate, timezone).toDate(),
      tzid: timezone
    };
    
    // Add end conditions if provided
    if (endDate) {
      ruleOptions.until = moment.tz(endDate, timezone).toDate();
    } else if (count) {
      ruleOptions.count = count;
    }
    
    // Add byweekday if provided for weekly frequency
    if (frequency === 'WEEKLY' && byWeekday.length > 0) {
      ruleOptions.byweekday = byWeekday.map(day => weekdayMap[day]);
    }
    
    // Add bymonthday if provided for monthly frequency
    if (frequency === 'MONTHLY' && byMonthDay.length > 0) {
      ruleOptions.bymonthday = byMonthDay;
    }
    
    // Add bymonth if provided for yearly frequency
    if (frequency === 'YEARLY' && byMonth.length > 0) {
      ruleOptions.bymonth = byMonth;
    }
    
    // Create the rule
    const rule = new RRule(ruleOptions);
    
    return {
      rrule: rule.toString(),
      readableText: rule.toText(),
      nextOccurrences: rule.all((date, i) => i < 5) // Get next 5 occurrences
    };
  }
  
  // Generate occurrences between dates
  getOccurrencesBetween(rruleString, startDate, endDate) {
    const rule = rrulestr(rruleString);
    return rule.between(
      moment(startDate).toDate(),
      moment(endDate).toDate(),
      true // Include start and end dates
    );
  }
  
  // Get next N occurrences from now
  getNextOccurrences(rruleString, count = 5) {
    const rule = rrulestr(rruleString);
    const now = new Date();
    
    return rule.all((date, i) => {
      return date >= now && i < count;
    });
  }
  
  // Check if a date is an occurrence
  isOccurrence(rruleString, date) {
    const rule = rrulestr(rruleString);
    const checkDate = moment(date).startOf('day').toDate();
    
    // Get occurrences on the same day
    const occurrences = rule.between(
      moment(checkDate).startOf('day').toDate(),
      moment(checkDate).endOf('day').toDate(),
      true
    );
    
    return occurrences.length > 0;
  }
}

module.exports = new RecurringScheduleService();
```

### Stripe Connect Integration Pattern

```javascript
// Example of Stripe Connect integration for provider payouts
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeConnectService {
  // Create onboarding link for service providers
  async createAccountLink(providerId, accountId) {
    try {
      // If no account ID, create a new Connect account
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          metadata: {
            providerId
          }
        });
        
        accountId = account.id;
        
        // Store the account ID in your database
        await db.query(
          'UPDATE service_providers SET stripe_account_id = $1 WHERE id = $2',
          [accountId, providerId]
        );
      }
      
      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.FRONTEND_URL}/dashboard/provider/connect/refresh`,
        return_url: `${process.env.FRONTEND_URL}/dashboard/provider/connect/complete`,
        type: 'account_onboarding',
      });
      
      return { url: accountLink.url, accountId };
    } catch (error) {
      console.error('Error creating account link:', error);
      throw error;
    }
  }
  
  // Process payment with automatic provider payout
  async processPaymentWithPayout(amount, customerId, providerId, serviceRequestId) {
    try {
      // Get provider's Stripe account ID
      const providerResult = await db.query(
        'SELECT stripe_account_id FROM service_providers WHERE id = $1',
        [providerId]
      );
      
      if (providerResult.rows.length === 0 || !providerResult.rows[0].stripe_account_id) {
        throw new Error('Provider not connected to Stripe');
      }
      
      const stripeAccountId = providerResult.rows[0].stripe_account_id;
      
      // Calculate platform fee (e.g., 10%)
      const platformFeePercent = 10;
      const platformFeeAmount = Math.round(amount * (platformFeePercent / 100));
      
      // Create a payment intent with application fee
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        customer: customerId,
        payment_method_types: ['card'],
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          serviceRequestId,
          providerId
        }
      });
      
      return paymentIntent;
    } catch (error) {
      console.error('Error processing payment with payout:', error);
      throw error;
    }
  }
  
  // Get provider's balance
  async getProviderBalance(stripeAccountId) {
    try {
      const balance = await stripe.balance.retrieve({
        stripeAccount: stripeAccountId
      });
      
      return balance;
    } catch (error) {
      console.error('Error getting provider balance:', error);
      throw error;
    }
  }
  
  // Create instant payout for provider
  async createInstantPayout(stripeAccountId, amount) {
    try {
      // Get the provider's default external account
      const accounts = await stripe.accounts.listExternalAccounts(
        stripeAccountId,
        { object: 'bank_account', limit: 1 }
      );
      
      if (accounts.data.length === 0) {
        throw new Error('No bank account found for provider');
      }
      
      const bankAccountId = accounts.data[0].id;
      
      // Create the payout
      const payout = await stripe.payouts.create({
        amount,
        currency: 'usd',
        method: 'instant',
        destination: bankAccountId,
      }, {
        stripeAccount: stripeAccountId
      });
      
      return payout;
    } catch (error) {
      console.error('Error creating instant payout:', error);
      throw error;
    }
  }
}

module.exports = new StripeConnectService();
```

### AI Recommendation Engine Pattern

```javascript
// Example of AI recommendation engine implementation
const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');

class AIRecommendationService {
  constructor() {
    this.model = null;
    this.initialized = false;
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    
    // Initialize the service
    this.initialize();
  }
  
  async initialize() {
    try {
      // Load pre-trained model or create a new one
      try {
        this.model = await tf.loadLayersModel('file://./models/recommendation_model/model.json');
      } catch (e) {
        // If model doesn't exist, create a basic one
        this.model = this.createBaseModel();
      }
      
      this.initialized = true;
      console.log('AI Recommendation Service initialized');
    } catch (error) {
      console.error('Failed to initialize AI Recommendation Service:', error);
    }
  }
  
  createBaseModel() {
    // Create a simple recommendation model
    const model = tf.sequential();
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [20] // Input features
    }));
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));
    
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }
  
  // Preprocess text for NLP features
  preprocessText(text) {
    if (!text) return [];
    
    // Tokenize, lowercase, and stem
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    return tokens.map(token => this.stemmer.stem(token));
  }
  
  // Extract features from bid and service request
  extractFeatures(bid, serviceRequest, providerData) {
    // Create feature vector
    const features = [
      bid.amount / serviceRequest.estimated_budget, // Normalized bid amount
      providerData.rating || 0, // Provider rating
      providerData.completion_rate || 0, // Job completion rate
      providerData.response_time || 0, // Average response time
      providerData.jobs_completed || 0, // Number of jobs completed
      // Distance feature
      this.calculateDistance(
        serviceRequest.property_lat,
        serviceRequest.property_lng,
        providerData.lat,
        providerData.lng
      ),
      // Text similarity between request description and bid proposal
      this.calculateTextSimilarity(
        serviceRequest.description,
        bid.proposal
      ),
      // More features...
    ];
    
    // Pad or truncate to expected input size
    while (features.length < 20) {
      features.push(0);
    }
    
    return features.slice(0, 20);
  }
  
  // Calculate distance between coordinates
  calculateDistance(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
    
    // Haversine formula for distance calculation
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Normalize distance (0-1 scale, where 1 is close and 0 is far)
    return Math.exp(-distance / 50); // Exponential decay
  }
  
  // Calculate text similarity
  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const tokens1 = this.preprocessText(text1);
    const tokens2 = this.preprocessText(text2);
    
    // Use Jaccard similarity
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
  
  // Generate recommendation score
  async generateRecommendation(bid, serviceRequest, providerData) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Extract features
      const features = this.extractFeatures(bid, serviceRequest, providerData);
      
      // Convert to tensor
      const inputTensor = tf.tensor2d([features]);
      
      // Get prediction
      const prediction = this.model.predict(inputTensor);
      const score = prediction.dataSync()[0];
      
      // Generate explanation factors
      const factors = this.generateExplanationFactors(features, score);
      
      return {
        score: parseFloat(score.toFixed(2)),
        confidence: this.calculateConfidence(features),
        factors,
        isRecommended: score > 0.7 // Threshold for recommendation
      };
    } catch (error) {
      console.error('Error generating recommendation:', error);
      
      // Fallback to deterministic scoring
      return this.generateFallbackRecommendation(bid, serviceRequest, providerData);
    }
  }
  
  // Generate explanation factors
  generateExplanationFactors(features, score) {
    // Simplified explanation generation
    const factors = [];
    
    if (features[0] < 0.9) {
      factors.push('Competitive pricing');
    }
    
    if (features[1] > 0.8) {
      factors.push('High provider rating');
    }
    
    if (features[2] > 0.9) {
      factors.push('Excellent completion rate');
    }
    
    if (features[5] > 0.7) {
      factors.push('Provider is nearby');
    }
    
    if (features[6] > 0.5) {
      factors.push('Proposal matches your requirements');
    }
    
    return factors;
  }
  
  // Calculate confidence in recommendation
  calculateConfidence(features) {
    // Simplified confidence calculation based on feature quality
    const nonZeroFeatures = features.filter(f => f > 0).length;
    return Math.min(1, nonZeroFeatures / 10);
  }
  
  // Fallback recommendation when AI fails
  generateFallbackRecommendation(bid, serviceRequest, providerData) {
    // Simple deterministic scoring
    let score = 0.5; // Base score
    
    // Adjust based on provider rating (0-5 scale)
    if (providerData.rating) {
      score += (providerData.rating / 5) * 0.2;
    }
    
    // Adjust based on price
    if (serviceRequest.estimated_budget && bid.amount) {
      const priceRatio = bid.amount / serviceRequest.estimated_budget;
      if (priceRatio <= 1) {
        score += (1 - priceRatio) * 0.15; // Lower price is better
      } else {
        score -= Math.min(0.15, (priceRatio - 1) * 0.1); // Higher price reduces score
      }
    }
    
    // Adjust based on completion rate
    if (providerData.completion_rate) {
      score += providerData.completion_rate * 0.15;
    }
    
    // Cap score between 0 and 1
    score = Math.max(0, Math.min(1, score));
    
    return {
      score: parseFloat(score.toFixed(2)),
      confidence: 0.6, // Lower confidence for fallback
      factors: ['Based on provider rating', 'Based on price comparison'],
      isRecommended: score > 0.7
    };
  }
}

module.exports = new AIRecommendationService();
```

## Best Practices

### Component Structure

1. **Atomic Design Principles**: Components are organized in a hierarchy from atoms to organisms
2. **Separation of Concerns**: UI components are separated from business logic
3. **Consistent Naming**: CamelCase for components, kebab-case for files

### CSS/Styling Approach

1. **Utility-First**: Prefer Tailwind utility classes for styling
2. **Component Variants**: Use class-variance-authority for component variants
3. **Global Variables**: Use CSS variables for global theme values
4. **Responsive Design**: Mobile-first approach with responsive utility classes

### State Management

1. **Local State**: Use React's useState for component-level state
2. **Form State**: Use React Hook Form for form state management
3. **Global State**: Use Context API for authentication and theme
4. **Complex State**: Use Zustand for more complex state management needs

### Authentication Flow

1. **Firebase Authentication**: For user authentication
2. **JWT Tokens**: For API authorization
3. **Auth Context**: For sharing authentication state across the application

### API Communication

1. **Custom Hooks**: Use custom hooks for API calls
2. **Loading States**: Always include loading, data, and error states
3. **Refetch Capabilities**: Include refetch functions for data refreshing

### WebSocket Communication

1. **Connection Management**: Handle connection, reconnection, and disconnection gracefully
2. **Room-Based Subscriptions**: Subscribe to specific topics or resources
3. **Event Standardization**: Use consistent event naming and payload structures
4. **Fallback Mechanisms**: Implement HTTP polling fallback when WebSockets are unavailable
5. **Authentication**: Secure WebSocket connections with the same authentication as REST APIs

### File Upload Handling

1. **Client-Side Validation**: Validate file types, sizes, and content before upload
2. **Progress Tracking**: Show upload progress to improve user experience
3. **Chunked Uploads**: Use chunked uploads for large files to improve reliability
4. **Secure Storage**: Store files in secure cloud storage with appropriate access controls
5. **Metadata Management**: Track file metadata in the database for efficient querying

### Secure File Handling

1. **Pre-signed URLs**: Use time-limited pre-signed URLs for file access
2. **Content Validation**: Validate file content and scan for malware
3. **Access Control**: Implement permission-based access to files
4. **Encryption**: Encrypt sensitive files at rest and in transit
5. **Expiration Policies**: Implement automatic expiration for temporary files

### Recurring Schedule Implementation

1. **Pattern Definition**: Use RFC5545 (iCalendar) RRULE format for schedule patterns
2. **Occurrence Generation**: Generate individual occurrences from patterns
3. **Exception Handling**: Support for skipped dates and schedule modifications
4. **Time Zone Awareness**: Handle time zones correctly for consistent scheduling
5. **User-Friendly Interface**: Provide intuitive UI for creating and managing recurring schedules

### Payment Processing

1. **Secure Handling**: Never store sensitive payment information
2. **Stripe Elements**: Use Stripe Elements for PCI-compliant payment forms
3. **Idempotent Requests**: Use idempotency keys for payment operations
4. **Webhook Verification**: Verify webhook signatures for secure event handling
5. **Error Handling**: Implement comprehensive error handling for payment failures

### Provider Payout Management

1. **Connect Onboarding**: Streamline the Stripe Connect onboarding process
2. **Fee Transparency**: Clearly communicate platform fees and payout schedules
3. **Automatic Disbursement**: Implement automatic payouts based on service completion
4. **Balance Tracking**: Provide real-time balance information to providers
5. **Payout History**: Maintain detailed payout history for accounting purposes

### AI Recommendation Implementation

1. **Feature Engineering**: Extract relevant features from bids and provider data
2. **Explainable Results**: Provide clear explanations for recommendations
3. **Fallback Mechanisms**: Implement deterministic fallbacks when AI services fail
4. **Continuous Improvement**: Collect feedback to improve recommendation quality
5. **Performance Optimization**: Optimize inference performance for real-time recommendations

### Error Handling

1. **User-Friendly Errors**: Display user-friendly error messages
2. **Logging**: Log technical errors to the console
3. **Error Boundaries**: Use React error boundaries for component errors
4. **Retry Mechanisms**: Implement automatic retry for transient failures
5. **Circuit Breakers**: Use circuit breakers to prevent cascading failures

## Project Organization

### Directory Structure

```
frontend/
├── app/                # Next.js app directory
├── components/         # UI components
│   ├── dashboard/      # Dashboard-specific components
│   ├── forms/          # Form components
│   ├── reviews/        # Review-related components
│   ├── uploads/        # File upload components
│   ├── scheduling/     # Scheduling components
│   └── ui/             # Core UI components
├── lib/                # Utility functions and hooks
│   ├── utils/          # General utilities
│   ├── hooks/          # Custom hooks
│   └── contexts/       # React contexts
├── public/             # Static assets
└── src/                # Source code
    ├── app/            # Application pages
    └── lib/            # Library code
        └── utils/      # Utility functions
            ├── api.ts  # API utilities
            ├── api-hooks.ts # API custom hooks
            ├── socket.ts # WebSocket utilities
            ├── storage.ts # Storage utilities
            └── types.ts # TypeScript types
```

### Code Organization Best Practices

1. **Feature-Based Organization**: Group code by feature rather than type
2. **Shared Components**: Place shared components in the ui directory
3. **Custom Hooks**: Group related functionality into custom hooks
4. **Type Definitions**: Centralize type definitions in types.ts
5. **Context Providers**: Organize context providers for global state
6. **Service Modules**: Create dedicated service modules for external integrations

## Conclusion

This technical style guide provides a comprehensive overview of the technologies, components, and patterns used in the Home Services Platform. By following these guidelines when creating new applications, you can ensure consistency in look, feel, and functionality across your projects. The guide now includes standards for WebSocket communication, file uploads, AWS S3 integration, recurring schedules with RRule, Stripe Connect integration, and AI recommendation engine implementation to support the platform's enhanced capabilities.