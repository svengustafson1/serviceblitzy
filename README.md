# ServiceBlitzy

A home services platform for connecting homeowners with service providers.

## Project Structure

- **Frontend**: Next.js application (port 3000)
- **Backend**: Node.js API server (port 3001)
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
   
   # Start the frontend (in a separate terminal)
   cd frontend && npm run dev
   ```

5. Access the application at http://localhost:3000

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

## Development Scripts

- `dev.sh` - Start both frontend and backend servers
- `setup-and-run.sh` - Setup the project and run servers
- Various backup scripts for database management

## Technology Stack

### Frontend
- Next.js with React
- Tailwind CSS for styling
- Context API for state management
- Responsive design for all devices

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- Firebase integration
- Stripe payment processing

## Getting Started

### Prerequisites
- Node.js (v14+)
- PostgreSQL (v12+)
- Stripe account for payments

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

This will start both the backend and frontend servers in development mode.

## Payment System

The platform uses Stripe for secure payment processing. The payment flow works as follows:

1. After a homeowner accepts a bid, they can initiate payment
2. A Stripe Payment Intent is created on the backend
3. The frontend uses Stripe Elements to securely collect payment information
4. After successful payment, the service request status is updated
5. Service providers can track their earnings and pending payouts

### Setting Up Stripe

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Add the keys to your `.env` file:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET`: Secret for validating webhook events

4. To test Stripe webhook functionality locally:
   - Install the Stripe CLI: https://stripe.com/docs/stripe-cli
   - Run `stripe listen --forward-to localhost:5000/api/payments/webhook`

## Database Migrations

The project includes a database migration system to manage schema changes:

1. Create SQL migration files in `backend/src/db/migrations/`
2. Run migrations with `npm run migrate`

## Development Scripts

- `backend/npm run dev`: Start the backend server with hot reloading
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