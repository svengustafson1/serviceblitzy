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

#### Form Validation
- **Zod 3.24.2**: Schema validation library
- **@hookform/resolvers 4.1.2**: For connecting Zod with React Hook Form

#### Date/Time Handling
- **date-fns 4.1.0**: Library for date manipulation and formatting

#### Mapping
- **Mapbox GL 2.15.0**: Map visualization
- **React Map GL 7.1.9**: React wrapper for Mapbox GL

#### Payments
- **Stripe (@stripe/react-stripe-js 3.1.1, @stripe/stripe-js 5.7.0)**: Payment processing

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

#### Payment Processing
- **Stripe 17.7.0**: Payment processing API

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

### Error Handling

1. **User-Friendly Errors**: Display user-friendly error messages
2. **Logging**: Log technical errors to the console
3. **Error Boundaries**: Use React error boundaries for component errors

## Project Organization

### Directory Structure

```
frontend/
├── app/                # Next.js app directory
├── components/         # UI components
│   ├── dashboard/      # Dashboard-specific components
│   ├── forms/          # Form components
│   ├── reviews/        # Review-related components
│   └── ui/             # Core UI components
├── lib/                # Utility functions and hooks
│   └── utils/          # General utilities
├── public/             # Static assets
└── src/                # Source code
    ├── app/            # Application pages
    └── lib/            # Library code
        └── utils/      # Utility functions
            ├── api.ts  # API utilities
            ├── api-hooks.ts # API custom hooks
            ├── storage.ts # Storage utilities
            └── types.ts # TypeScript types
```

### Code Organization Best Practices

1. **Feature-Based Organization**: Group code by feature rather than type
2. **Shared Components**: Place shared components in the ui directory
3. **Custom Hooks**: Group related functionality into custom hooks
4. **Type Definitions**: Centralize type definitions in types.ts

## Conclusion

This technical style guide provides a comprehensive overview of the technologies, components, and patterns used in the Home Services Platform. By following these guidelines when creating new applications, you can ensure consistency in look, feel, and functionality across your projects. 