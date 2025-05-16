# Home Services Platform - Project Requirements

This document provides a comprehensive guide to setting up the Home Services Platform project for local or remote deployment.

## Project Overview

The Home Services Platform is a comprehensive web application connecting homeowners with service providers, featuring service requests, bidding, scheduling, and secure payments.

## System Requirements

### Development Environment
- Node.js v14+ (recommended: v18.x or latest LTS)
- PostgreSQL v12+ (recommended: v14.x)
- npm v7+ or yarn v1.22+
- Git

### Production Environment
- Node.js v14+ (recommended: v18.x or latest LTS)
- PostgreSQL v12+ (recommended: v14.x)
- PM2 or similar process manager for Node.js applications
- Nginx or similar web server for reverse proxy
- SSL certificate for HTTPS

## Project Structure

The project follows a monorepo structure with separate frontend and backend directories:

```
project-root/
├── frontend/         # Next.js application
├── backend/          # Express.js API server
├── setup-and-run.sh  # Setup script
├── dev.sh            # Development script
└── README.md         # Project documentation
```

## Dependencies

### Frontend Dependencies
```json
{
  "dependencies": {
    "@hookform/resolvers": "^4.1.2",
    "@radix-ui/react-accordion": "^1.2.3",
    "@radix-ui/react-alert-dialog": "^1.1.6",
    "@radix-ui/react-aspect-ratio": "^1.1.2",
    "@radix-ui/react-avatar": "^1.1.3",
    "@radix-ui/react-slot": "^1.1.2",
    "@stripe/react-stripe-js": "^3.1.1",
    "@stripe/stripe-js": "^5.7.0",
    "@types/uuid": "^10.0.0",
    "axios": "^1.7.9",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cookies-next": "^5.1.0",
    "date-fns": "^4.1.0",
    "firebase": "^11.3.1",
    "lucide-react": "^0.475.0",
    "mapbox-gl": "^2.15.0",
    "next": "15.1.7",
    "react": "^19.0.0",
    "react-day-picker": "^9.5.1",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.2",
    "react-map-gl": "^7.1.9",
    "react-qr-code": "^2.0.15",
    "tailwind-merge": "^3.0.2",
    "uuid": "^11.1.0",
    "zod": "^3.24.2",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@shadcn/ui": "^0.0.4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "15.1.7",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

### Backend Dependencies
```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "firebase-admin": "^13.1.0",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.13.3",
    "stripe": "^17.7.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

## Setup Instructions

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd home-services-platform
   ```

2. **Set up environment variables**
   
   Frontend (.env.local in frontend directory):
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   ```
   
   Backend (.env in backend directory):
   ```
   PORT=5000
   NODE_ENV=development
   DATABASE_URL=postgres://username:password@localhost:5432/homeservices
   JWT_SECRET=your_jwt_secret
   STRIPE_SECRET_KEY=sk_test_your_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_client_email
   ```

3. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../backend
   npm install
   ```

4. **Create required api-hooks file**
   
   The project references `@/lib/utils/api-hooks` which needs to be created:
   
   ```bash
   # Create the api-hooks.ts file in the correct location
   cd ../frontend/src/lib/utils
   touch api-hooks.ts
   ```
   
   Then add the following content to api-hooks.ts:
   ```typescript
   // Frontend API Hooks - src/lib/utils/api-hooks.ts
   import { useState, useEffect } from 'react';
   import axios from 'axios';
   import { API_BASE_URL } from './api';
   
   // Interfaces for service requests and properties
   interface ServiceRequest {
     id: string;
     title: string;
     description: string;
     status: string;
     created_at: string;
     property_id: string;
     // Add other fields as needed
   }
   
   interface Property {
     id: string;
     name: string;
     address: string;
     // Add other fields as needed
   }
   
   // Hook for fetching service requests
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
   
   // Hook for fetching properties
   export const useProperties = () => {
     const [properties, setProperties] = useState<Property[]>([]);
     const [loading, setLoading] = useState<boolean>(true);
     const [error, setError] = useState<string | null>(null);
   
     const fetchProperties = async () => {
       try {
         setLoading(true);
         const response = await axios.get(`${API_BASE_URL}/properties`);
         setProperties(response.data);
         setError(null);
       } catch (err) {
         setError('Failed to fetch properties');
         console.error(err);
       } finally {
         setLoading(false);
       }
     };
   
     useEffect(() => {
       fetchProperties();
     }, []);
   
     return { properties, loading, error, refetch: fetchProperties };
   };
   ```

5. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb homeservices
   
   # Run database migrations
   cd ../backend
   npm run migrate
   ```

6. **Start development servers**
   
   Option 1: Use the provided script
   ```bash
   cd ..
   chmod +x dev.sh
   ./dev.sh
   ```
   
   Option 2: Start servers individually
   ```bash
   # Terminal 1 - Start backend
   cd backend
   npm run dev
   
   # Terminal 2 - Start frontend
   cd frontend
   npm run dev
   ```

### Production Deployment

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Set up environment variables for production**
   - Follow the same structure as local development but use production URLs and API keys
   - Set NODE_ENV=production in the backend .env file

3. **Database setup**
   ```bash
   # Run migrations on production database
   cd backend
   npm run migrate
   ```

4. **Start the services**
   ```bash
   # Start backend with PM2
   cd backend
   pm2 start src/index.js --name home-services-api
   
   # Start frontend
   cd ../frontend
   npm run start
   ```

5. **Set up Nginx (example configuration)**
   ```nginx
   server {
     listen 80;
     server_name yourdomain.com;
     
     location / {
       proxy_pass http://localhost:3000;  # Next.js frontend
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
     
     location /api {
       proxy_pass http://localhost:5000;  # Express backend
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```

## Common Issues and Troubleshooting

### Path Alias Issues

The project uses TypeScript path aliases to simplify imports. If you encounter errors with imports not being resolved:

1. Verify that your tsconfig.json has the correct path mappings:
   ```json
   "paths": {
     "@/*": ["./src/*"]
   }
   ```

2. Ensure that any referenced files or directories actually exist in the project structure
   - If you see errors about missing files like `@/lib/utils/api-hooks`, check that these files exist in the correct location
   - Create any missing utility files as shown in the setup instructions

### Database Connection Issues

If you encounter database connection issues:

1. Ensure PostgreSQL is running:
   ```bash
   sudo service postgresql status  # Linux
   brew services list              # macOS
   ```

2. Verify your database credentials in the .env file
3. Make sure the database exists:
   ```bash
   psql -l  # List all databases
   ```

### Stripe Integration Issues

If you're having issues with Stripe payments:

1. Ensure you have set up the correct Stripe API keys
2. For local testing, use Stripe test mode keys
3. To test webhooks locally, use the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Firebase Documentation](https://firebase.google.com/docs) 