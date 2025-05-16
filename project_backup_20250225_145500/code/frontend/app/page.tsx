import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Auth Bypass Notice */}
      <div className="bg-green-100 text-green-800 px-4 py-2 text-center">
        <strong>🔓 Authentication Bypass Active</strong> - You can sign in without real authentication. Click any login button to continue.
      </div>
      
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold text-blue-600">HomeHub</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/services"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Services
                </Link>
                <Link
                  href="/contact"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Contact
                </Link>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <Link
                href="/login"
                className="border-transparent text-gray-500 hover:text-gray-700 px-4 py-2 text-sm font-medium"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <div className="relative bg-blue-700 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-blue-700 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <div className="pt-10 sm:pt-16 lg:pt-8 xl:pt-16">
              <div className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                <div className="sm:text-center lg:text-left">
                  <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
                    <span className="block xl:inline">Home maintenance made</span>{' '}
                    <span className="block text-blue-300 xl:inline">simple</span>
                  </h1>
                  <p className="mt-3 text-base text-blue-100 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                    Connect with trusted service providers for all your home maintenance needs. Request services, compare bids, and manage your home all in one place.
                  </p>
                  <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                    <div className="rounded-md shadow">
                      <Link
                        href="/register"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                      >
                        Get started
                      </Link>
                    </div>
                    <div className="mt-3 sm:mt-0 sm:ml-3">
                      <Link
                        href="/services"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 md:py-4 md:text-lg md:px-10"
                      >
                        Browse services
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <Image
            src="/images/hero-image.jpg"
            alt="Home maintenance"
            width={1920}
            height={1080}
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full"
          />
        </div>
      </div>

      {/* Service categories */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Services</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything your home needs
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              From lawn care to home cleaning, we've got you covered with trusted service providers.
            </p>
          </div>

          <div className="mt-10">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Lawn Care</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Professional lawn mowing, fertilization, and maintenance to keep your yard looking its best.
                    </p>
                    <Link href="/services/lawn-care" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800">
                      Learn more
                      <svg className="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Cleaning</h3>
                    <p className="mt-5 text-base text-gray-500">
                      House cleaning services, from regular maintenance to deep cleaning and specialized tasks.
                    </p>
                    <Link href="/services/cleaning" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800">
                      Learn more
                      <svg className="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Exterior Maintenance</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Gutter cleaning, power washing, and other services to maintain your home's exterior.
                    </p>
                    <Link href="/services/exterior-maintenance" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800">
                      Learn more
                      <svg className="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-10 text-center">
            <Link
              href="/services"
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              View all services
            </Link>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">How it works</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Simple and effective
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Our streamlined process makes it easy to find and book reliable home services.
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">1. Request service</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Choose the service you need and provide details about your requirements.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">2. Compare bids</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Review competitive bids from vetted service providers in your area.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">3. Schedule and relax</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Book the provider you choose and enjoy hassle-free home maintenance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits section */}
      <div className="py-12 bg-white">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <h2 className="sr-only">Benefits</h2>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="relative">
              <Image
                src="/images/benefits-image.jpg"
                alt="Benefits"
                width={768}
                height={600}
                className="h-full w-full object-cover rounded-lg"
              />
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-3xl font-extrabold text-gray-900">Why choose HomeHub?</h3>
              <p className="mt-4 text-lg text-gray-500">
                We're committed to making home maintenance simple, reliable, and stress-free.
              </p>
              
              <div className="mt-8 space-y-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg leading-6 font-medium text-gray-900">Trusted providers</h4>
                    <p className="mt-2 text-base text-gray-500">
                      All service providers are vetted and background-checked for your peace of mind.
                    </p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg leading-6 font-medium text-gray-900">Competitive pricing</h4>
                    <p className="mt-2 text-base text-gray-500">
                      Multiple bids ensure you get the best value for your home maintenance needs.
                    </p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg leading-6 font-medium text-gray-900">Simplified management</h4>
                    <p className="mt-2 text-base text-gray-500">
                      Manage all your home services in one place with our user-friendly dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Testimonials</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Trusted by homeowners
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Here's what our users are saying about their experience with HomeHub.
            </p>
          </div>

          <div className="mt-10">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex-shrink-0"></div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">Sarah Johnson</h4>
                    <p className="text-gray-500">Homeowner</p>
                  </div>
                </div>
                <div className="text-gray-600">
                  "Finding reliable lawn care used to be a headache until I discovered HomeHub. Now I can easily compare providers and book services with just a few clicks!"
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex-shrink-0"></div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">Michael Thompson</h4>
                    <p className="text-gray-500">Homeowner</p>
                  </div>
                </div>
                <div className="text-gray-600">
                  "I've saved hundreds of dollars by being able to compare bids from multiple service providers. The quality of work has been consistently excellent."
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex-shrink-0"></div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">Jennifer Rodriguez</h4>
                    <p className="text-gray-500">Homeowner</p>
                  </div>
                </div>
                <div className="text-gray-600">
                  "HomeHub has simplified my life. Having all my home services in one dashboard makes it so much easier to keep track of maintenance schedules and expenses."
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-blue-700">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Ready to simplify your home maintenance?</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-blue-100">
            Join thousands of homeowners who have simplified their home maintenance with HomeHub.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-md shadow">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
              >
                Sign up for free
              </Link>
            </div>
            <div className="ml-3 inline-flex">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-800 hover:bg-blue-900"
              >
                Log in
              </Link>
            </div>
          </div>
          <p className="mt-6 text-sm text-blue-100">
            Service provider?{' '}
            <Link href="/register?provider=true" className="text-white font-medium underline">
              Sign up as a provider
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center md:justify-start">
              <span className="text-2xl font-bold text-blue-600">HomeHub</span>
            </div>
            <div className="mt-8 md:mt-0">
              <p className="text-center text-base text-gray-500">
                &copy; 2023 HomeHub. All rights reserved.
              </p>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 pt-8 flex justify-center space-x-6">
            <Link href="/services" className="text-gray-500 hover:text-gray-600">Services</Link>
            <Link href="/contact" className="text-gray-500 hover:text-gray-600">Contact</Link>
            <Link href="/login" className="text-gray-500 hover:text-gray-600">Log in</Link>
            <Link href="/register" className="text-gray-500 hover:text-gray-600">Sign up</Link>
          </div>
        </div>
      </footer>
      
    </main>
  )
}

// Sample data - would be fetched from API in production
const serviceCategories = [
  {
    name: 'Lawn Care',
    description: 'Keep your lawn looking beautiful with our professional lawn care services.',
    slug: 'lawn-care'
  },
  {
    name: 'Exterior Maintenance',
    description: "From gutters to siding, we keep your home's exterior in perfect condition.",
    slug: 'exterior-maintenance'
  },
  {
    name: 'Cleaning',
    description: 'House cleaning, window washing, and more for a spotless home.',
    slug: 'cleaning'
  },
  {
    name: 'HVAC',
    description: 'Installation, maintenance, and repair for all your heating and cooling needs.',
    slug: 'hvac'
  },
  {
    name: 'Painting',
    description: 'Interior and exterior painting services to refresh your home.',
    slug: 'painting'
  },
  {
    name: 'Waterfront',
    description: 'Dock installation, boat cleaning, and other waterfront property services.',
    slug: 'waterfront'
  },
  {
    name: 'Winter Services',
    description: 'Snow removal, winterization, and more to prepare for the cold months.',
    slug: 'winter-services'
  },
  {
    name: 'Gardening',
    description: 'Professional landscaping and gardening to beautify your outdoor spaces.',
    slug: 'gardening'
  }
];

const testimonials = [
  {
    name: 'Sarah Johnson',
    type: 'Homeowner',
    quote: 'This platform has completely simplified how I manage services for my lake house. The QR code feature is genius!'
  },
  {
    name: 'Mike Reynolds',
    type: 'Service Provider',
    quote: 'Since joining as a provider, my business has grown by 40%. The bidding system works perfectly for my lawn care company.'
  },
  {
    name: 'Jennifer Williams',
    type: 'Homeowner',
    quote: 'I love how I can compare different bids and the AI helps me choose the best value service providers.'
  }
]; 