'use client';

import React, { useState, useMemo } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer } from 'react-map-gl';
import { Calendar, MapPin, Clock, User } from 'lucide-react';
import Link from 'next/link';
import 'mapbox-gl/dist/mapbox-gl.css';

// Import from our utility file - fix path to match project structure
import { MAPBOX_ACCESS_TOKEN, MAP_STYLE, DEFAULT_CENTER } from '../../../../lib/utils/mapbox';

// TypeScript interfaces
interface Job {
  id: number;
  service: string;
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
  scheduledDate: string;
  scheduledTime: string;
  customer: string;
  status: 'scheduled' | 'pending' | 'completed';
}

interface RouteData {
  type: string;
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
}

export default function ProviderMapView() {
  // Initial viewport settings
  const [viewState, setViewState] = useState(DEFAULT_CENTER);

  // Selected job for popup
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  // Selected jobs for route planning
  const [selectedRouteJobs, setSelectedRouteJobs] = useState<Job[]>([]);
  // Route data
  const [routeData, setRouteData] = useState<RouteData | null>(null);

  // Mock jobs data - in a real app, this would come from an API
  const jobs: Job[] = [
    {
      id: 1,
      service: 'Lawn Mowing',
      address: '123 Main St, Lake Tahoe, CA',
      coordinates: [-120.0324, 39.0968],
      scheduledDate: '2023-07-05',
      scheduledTime: '10:00 AM',
      customer: 'John Smith',
      status: 'scheduled'
    },
    {
      id: 2,
      service: 'Lawn Mowing',
      address: '456 Elm St, Lake Tahoe, CA',
      coordinates: [-120.0404, 39.1068],
      scheduledDate: '2023-07-06',
      scheduledTime: '2:00 PM',
      customer: 'Sarah Johnson',
      status: 'scheduled'
    },
    {
      id: 3,
      service: 'Window Cleaning',
      address: '789 Pine St, Lake Tahoe, CA',
      coordinates: [-120.0224, 39.0868],
      scheduledDate: '2023-07-07',
      scheduledTime: '11:00 AM',
      customer: 'Robert Davis',
      status: 'scheduled'
    },
    {
      id: 4,
      service: 'Gutter Cleaning',
      address: '321 Oak St, Lake Tahoe, CA',
      coordinates: [-120.0524, 39.1168],
      scheduledDate: '2023-07-08',
      scheduledTime: '9:00 AM',
      customer: 'Emily Wilson',
      status: 'pending'
    },
    {
      id: 5,
      service: 'Snow Removal',
      address: '654 Birch St, Lake Tahoe, CA',
      coordinates: [-120.0624, 39.0768],
      scheduledDate: '2023-07-09',
      scheduledTime: '3:00 PM',
      customer: 'Michael Brown',
      status: 'scheduled'
    }
  ];

  // Toggle job selection for route planning
  const toggleJobSelection = (job: Job) => {
    if (selectedRouteJobs.some(j => j.id === job.id)) {
      setSelectedRouteJobs(selectedRouteJobs.filter(j => j.id !== job.id));
    } else {
      // Add the job to the selected jobs for route planning
      setSelectedRouteJobs([...selectedRouteJobs, job]);
    }
  };

  // Generate a route for selected jobs
  const generateRoute = () => {
    if (selectedRouteJobs.length < 2) {
      alert('Please select at least 2 jobs to create a route');
      return;
    }

    // Sort jobs by scheduled time
    const sortedJobs = [...selectedRouteJobs].sort((a, b) => {
      const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
      const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
      return dateA.getTime() - dateB.getTime();
    });

    // Create a simple LineString from the coordinates
    const coordinates = sortedJobs.map(job => job.coordinates);
    
    // Create a GeoJSON LineString from the coordinates
    setRouteData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates
      }
    });

    // Center the map on the route
    if (coordinates.length > 0) {
      const avgLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
      const avgLng = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
      
      setViewState({
        ...viewState,
        latitude: avgLat,
        longitude: avgLng,
        zoom: 10
      });
    }
  };

  // Clear the current route
  const clearRoute = () => {
    setRouteData(null);
    setSelectedRouteJobs([]);
  };

  // Filter jobs by status
  const [statusFilter, setStatusFilter] = useState('all');
  const filteredJobs = useMemo(() => {
    if (statusFilter === 'all') return jobs;
    return jobs.filter(job => job.status === statusFilter);
  }, [jobs, statusFilter]);

  // Route layer style
  const routeLayerStyle = {
    id: 'route',
    type: 'line',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#3b82f6',
      'line-width': 4,
      'line-opacity': 0.8
    }
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Jobs Map View</h1>
          <p className="text-gray-600">Visualize and plan routes for your jobs</p>
        </div>
        
        <div className="flex space-x-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">All Jobs</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs list for route planning */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Select Jobs for Route</h2>
              <div className="space-x-2">
                <button 
                  onClick={generateRoute}
                  disabled={selectedRouteJobs.length < 2}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedRouteJobs.length < 2 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Generate Route
                </button>
                <button 
                  onClick={clearRoute}
                  disabled={selectedRouteJobs.length === 0}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedRouteJobs.length === 0 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <div 
                    key={job.id} 
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedRouteJobs.some(j => j.id === job.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => toggleJobSelection(job)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{job.service}</h3>
                        <div className="flex items-center text-gray-500 text-sm mt-1">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          <span>{job.address}</span>
                        </div>
                        <div className="flex items-center text-gray-500 text-sm mt-1">
                          <User className="h-3.5 w-3.5 mr-1" />
                          <span>{job.customer}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center text-blue-600 text-sm">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          <span>{job.scheduledDate}</span>
                        </div>
                        <div className="flex items-center text-blue-600 text-sm mt-1">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          <span>{job.scheduledTime}</span>
                        </div>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            job.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                            job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-gray-500">No jobs found with the selected filter</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden h-[600px]">
            <Map
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              mapStyle={MAP_STYLE}
              mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
              style={{ width: '100%', height: '100%' }}
            >
              <FullscreenControl position="top-right" />
              <NavigationControl position="top-right" />

              {/* Render job markers */}
              {filteredJobs.map((job) => (
                <Marker
                  key={job.id}
                  longitude={job.coordinates[0]}
                  latitude={job.coordinates[1]}
                  anchor="bottom"
                  onClick={e => {
                    e.originalEvent.stopPropagation();
                    setSelectedJob(job);
                  }}
                >
                  <div className={`relative cursor-pointer ${
                    selectedRouteJobs.some(j => j.id === job.id) 
                      ? 'scale-125' 
                      : ''
                  }`}>
                    <MapPin 
                      className={`h-8 w-8 ${
                        job.status === 'scheduled' ? 'text-green-500' :
                        job.status === 'pending' ? 'text-yellow-500' :
                        'text-gray-500'
                      }`} 
                      fill={selectedRouteJobs.some(j => j.id === job.id) ? 'currentColor' : 'none'} 
                    />
                    <div className="absolute top-0 right-0">
                      <div className={`h-3 w-3 rounded-full ${
                        selectedRouteJobs.some(j => j.id === job.id) ? 'bg-blue-600' : 'bg-transparent'
                      }`} />
                    </div>
                  </div>
                </Marker>
              ))}

              {/* Render route if available */}
              {routeData && (
                <Source id="route-data" type="geojson" data={routeData}>
                  <Layer {...routeLayerStyle} />
                </Source>
              )}

              {/* Info popup when a marker is clicked */}
              {selectedJob && (
                <Popup
                  longitude={selectedJob.coordinates[0]}
                  latitude={selectedJob.coordinates[1]}
                  anchor="top"
                  onClose={() => setSelectedJob(null)}
                  closeOnClick={false}
                  className="z-10"
                >
                  <div className="p-2 max-w-xs">
                    <h3 className="font-medium">{selectedJob.service}</h3>
                    <div className="flex items-center text-gray-600 text-xs mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span>{selectedJob.address}</span>
                    </div>
                    <div className="flex items-center text-gray-600 text-xs mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{selectedJob.scheduledDate}</span>
                    </div>
                    <div className="flex items-center text-gray-600 text-xs mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{selectedJob.scheduledTime}</span>
                    </div>
                    <div className="flex items-center text-gray-600 text-xs mt-1">
                      <User className="h-3 w-3 mr-1" />
                      <span>{selectedJob.customer}</span>
                    </div>
                    <div className="mt-2 flex space-x-2">
                      <Link
                        href={`/provider/jobs/${selectedJob.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        View Details
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleJobSelection(selectedJob);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        {selectedRouteJobs.some(j => j.id === selectedJob.id)
                          ? 'Remove from Route'
                          : 'Add to Route'
                        }
                      </button>
                    </div>
                  </div>
                </Popup>
              )}
            </Map>
          </div>
          
          {/* Route Details */}
          {selectedRouteJobs.length > 0 && (
            <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-medium">Route Plan</h3>
              <div className="mt-2 space-y-2">
                {selectedRouteJobs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stop
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Service
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Address
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedRouteJobs.map((job, index) => (
                          <tr key={job.id}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {job.scheduledTime}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              {job.service}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {job.address}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {job.customer}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No jobs selected for the route</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 