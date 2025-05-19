# ServiceBlitzy

A home services platform for connecting homeowners with service providers.

## Project Structure

- **Frontend**: Next.js application (port 3000)
- **Backend**: Node.js API server (port 3001)
- **WebSocket Server**: Socket.IO server for real-time notifications (port 3002)
- **Database**: PostgreSQL (database name: home_services)

## Quick Start

1. Ensure PostgreSQL is running
2. Clone the repository
3. Run the setup script:
   ```
   ./setup-and-run.sh
   ```
   
4. Or start each server manually:
   ```
   # Start the backend
   cd backend && npm run dev
   
   # Start the WebSocket server
   cd backend && npm run socket
   
   # Start the frontend (in a separate terminal)
   cd frontend && npm run dev
   ```

5. For local development with file uploads, start the S3 emulator:
   ```
   # Start the S3 emulator (requires Docker)
   docker run -p 4566:4566 localstack/localstack
   ```

6. Access the application at http://localhost:3000

## Database Backup

The repository includes a SQL dump of the database in `db_backup.sql`.
To restore the database:

```
createdb home_services
psql home_services < db_backup.sql
```

## Features

- User authentication (homeowners and service providers)
- Service listings and bookings
- Dashboard for managing services and appointments
- Real-time notifications via WebSockets
- File upload capabilities for property images and service documentation
- AI-powered bid recommendations for homeowners
- Automated provider payouts via Stripe Connect
- Recurring service scheduling for regular maintenance

## Development Scripts

- `dev.sh` - Start both frontend and backend servers
- `setup-and-run.sh` - Setup the project and run servers
- Various backup scripts for database management

## Technology Stack

### Frontend
- Next.js with React
- Tailwind CSS for styling
- Context API for state management
- Socket.IO client for real-time notifications
- Responsive design for all devices

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- Firebase integration
- Stripe payment processing
- Stripe Connect for provider payouts
- Socket.IO for real-time communication
- AWS S3 for file storage
- AI recommendation engine for bid evaluation

## Getting Started

### Prerequisites
- Node.js (v14+)
- PostgreSQL (v12+)
- Stripe account for payments
- AWS account for S3 storage (or use local emulator for development)
- Docker (for running S3 emulator locally)

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/home-services-platform.git
cd home-services-platform
```

2. Run the setup script:
```
chmod +x setup-and-run.sh
./setup-and-run.sh
```

3. Set up environment variables:
   - Copy `.env.sample` to `.env` in the backend directory
   - Fill in your database credentials, JWT secret, and Stripe API keys
   - Add AWS credentials or S3 emulator configuration
   - Configure WebSocket server settings

4. Run migrations:
```
cd backend
npm run migrate
```

5. Start the development servers:
```
chmod +x dev.sh
./dev.sh
```

This will start the backend, WebSocket server, and frontend servers in development mode.

## Environment Variables

The following environment variables are required in your `.env` file:

```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=home_services
DB_USER=postgres
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your_jwt_secret
FIREBASE_API_KEY=your_firebase_api_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_CONNECT_CLIENT_ID=your_stripe_connect_client_id

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# For local development with S3 emulator
S3_ENDPOINT=http://localhost:4566
S3_FORCE_PATH_STYLE=true

# WebSocket
WEBSOCKET_PORT=3002
WEBSOCKET_CLIENT_URL=http://localhost:3000
```

## WebSocket Server

The WebSocket server provides real-time notifications for various events in the system:

- New service requests
- Bid submissions and updates
- Service status changes
- Payment confirmations
- File upload completions
- Provider payout notifications

To run the WebSocket server separately:

```
cd backend
npm run socket
```

The WebSocket server uses Socket.IO and automatically reconnects if the connection is lost. It authenticates users using the same JWT tokens as the REST API.

## File Upload System

The platform supports file uploads for:

- Property images and documentation
- Service request attachments
- Provider credentials and verification documents

Files are stored in AWS S3 with secure access controls. For local development, you can use the LocalStack S3 emulator.

Supported file types:
- Images: JPEG, PNG, GIF
- Documents: PDF, DOCX
- Spreadsheets: XLSX, CSV

Maximum file size: 10MB

## Payment System

The platform uses Stripe for secure payment processing. The payment flow works as follows:

1. After a homeowner accepts a bid, they can initiate payment
2. A Stripe Payment Intent is created on the backend
3. The frontend uses Stripe Elements to securely collect payment information
4. After successful payment, the service request status is updated
5. Service providers can track their earnings and pending payouts

### Provider Payouts

The platform now uses Stripe Connect for automated provider payouts:

1. Service providers complete an onboarding process to connect their Stripe account
2. When a service is completed and payment is confirmed, funds are automatically transferred
3. The platform fee is retained during the transfer process
4. Providers can view their payout history and upcoming payouts in their dashboard

### Setting Up Stripe

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Add the keys to your `.env` file:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET`: Secret for validating webhook events
   - `STRIPE_CONNECT_CLIENT_ID`: Client ID for Stripe Connect integration

4. To test Stripe webhook functionality locally:
   - Install the Stripe CLI: https://stripe.com/docs/stripe-cli
   - Run `stripe listen --forward-to localhost:5000/api/payments/webhook`

## AI Recommendation Engine

The platform includes an AI-powered recommendation engine that helps homeowners evaluate service provider bids:

1. When providers submit bids, the AI engine analyzes them based on:
   - Provider rating and history
   - Price relative to market rates
   - Response time and availability
   - Service quality indicators

2. Bids are scored and ranked with explanations for the homeowner
3. Recommended bids are highlighted in the UI with detailed reasoning

This feature helps homeowners make informed decisions when selecting service providers.

## Recurring Scheduling

The platform supports recurring service scheduling for regular maintenance needs:

1. Homeowners can set up recurring service patterns:
   - Weekly (e.g., lawn care every Tuesday)
   - Bi-weekly (e.g., cleaning every other Monday)
   - Monthly (e.g., pool service on the first Monday)
   - Custom patterns (e.g., quarterly HVAC maintenance)

2. The system automatically generates service requests based on the pattern
3. Notifications are sent to both homeowners and service providers
4. Recurring schedules can be modified or canceled at any time

This feature is ideal for ongoing maintenance services that require regular scheduling.

## Database Migrations

The project includes a database migration system to manage schema changes:

1. Create SQL migration files in `backend/src/db/migrations/`
2. Run migrations with `npm run migrate`

## Development Scripts

- `backend/npm run dev`: Start the backend server with hot reloading
- `backend/npm run socket`: Start the WebSocket server
- `frontend/npm run dev`: Start the frontend server with hot reloading
- `backend/npm run migrate`: Run database migrations
- `./dev.sh`: Start both frontend and backend servers simultaneously

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Tailwind CSS for styling components
- Stripe for payment processing
- PostgreSQL for database management
- Express.js for API development
- Socket.IO for real-time communication
- AWS S3 for file storage