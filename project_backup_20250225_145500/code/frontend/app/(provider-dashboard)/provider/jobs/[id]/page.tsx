'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  CheckCircle, 
  RotateCw, 
  AlertCircle, 
  Truck,
  FileText,
  DollarSign,
  MessageSquare,
  XCircle,
  Home,
  Camera,
  X,
  Upload,
  Trash2
} from 'lucide-react';

// These would typically be from your API
const DEMO_JOB_PHOTOS = [
  { id: 1, url: '/images/property-placeholder-1.jpg', caption: 'Front yard before service', timestamp: '2023-07-05 10:15 AM' },
  { id: 2, url: '/images/property-placeholder-2.jpg', caption: 'Back yard before service', timestamp: '2023-07-05 10:20 AM' },
  { id: 3, url: '/images/property-placeholder-3.jpg', caption: 'Front yard after service', timestamp: '2023-07-05 11:45 AM' },
];

// Photo Gallery Modal Component
function PhotoGalleryModal({ 
  isOpen, 
  onClose, 
  photos,
  onDeletePhoto 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  photos: { id: number; url: string; caption: string; timestamp: string }[];
  onDeletePhoto: (id: number) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Job Photos</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Close gallery"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 max-h-[calc(90vh-10rem)]">
          {photos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No photos uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map(photo => (
                <div key={photo.id} className="border rounded-lg overflow-hidden group">
                  <div className="relative h-48">
                    <Image 
                      src={photo.url} 
                      alt={photo.caption || "Job photo"} 
                      fill
                      className="object-cover"
                    />
                    <button 
                      onClick={() => onDeletePhoto(photo.id)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Delete photo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm line-clamp-2">{photo.caption}</p>
                    <p className="text-xs text-gray-500 mt-1">{photo.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Upload Photo Modal Component
function UploadPhotoModal({ 
  isOpen, 
  onClose, 
  onUpload 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onUpload: (files: File[], caption: string) => void;
}) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [caption, setCaption] = React.useState('');
  const [dragging, setDragging] = React.useState(false);
  
  if (!isOpen) return null;
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFiles(Array.from(e.target.files));
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    if (e.dataTransfer.files?.length) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  
  const handleDragLeave = () => {
    setDragging(false);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length > 0) {
      onUpload(files, caption);
      setFiles([]);
      setCaption('');
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Upload Job Photos</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Close upload dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center ${
              dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="mb-3 text-gray-400">
              <Upload className="h-10 w-10 mx-auto" />
            </div>
            <p className="mb-2 font-medium">Drag and drop photos here</p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
              Browse Files
              <input 
                type="file" 
                accept="image/*" 
                className="sr-only" 
                onChange={handleFileChange} 
                multiple
              />
            </label>
          </div>
          
          {files.length > 0 && (
            <div className="mt-4">
              <p className="font-medium mb-2">{files.length} {files.length === 1 ? 'file' : 'files'} selected</p>
              <div className="max-h-32 overflow-y-auto">
                {Array.from(files).map((file, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b">
                    <span className="truncate text-sm">{file.name}</span>
                    <button 
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => {
                        const newFiles = [...files];
                        newFiles.splice(i, 1);
                        setFiles(newFiles);
                      }}
                      aria-label={`Remove file ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <label htmlFor="caption" className="block font-medium mb-1">Caption</label>
            <textarea 
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 min-h-[80px]"
              placeholder="Describe what these photos show..."
            />
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={files.length === 0}
              className={`px-4 py-2 bg-blue-600 text-white rounded-lg ${
                files.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
            >
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = React.useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [jobPhotos, setJobPhotos] = React.useState(DEMO_JOB_PHOTOS);
  
  // This would be fetched from API using params.id in production
  const job = {
    id: 1,
    service: 'Lawn Mowing',
    status: 'scheduled', // 'scheduled', 'in_progress', 'completed', 'cancelled'
    scheduledDate: '2023-07-05',
    scheduledTime: '10:00 AM - 12:00 PM',
    property: {
      id: 101,
      address: '123 Main St',
      city: 'Lake Tahoe',
      state: 'CA',
      zipCode: '96150',
      type: 'Residential',
      size: 2500,
      image: '/images/property-placeholder-1.jpg'
    },
    customer: {
      id: 201,
      name: 'John Smith',
      phone: '(555) 123-4567',
      email: 'john.smith@example.com',
      memberSince: '2022-08-15'
    },
    amount: 65.00,
    isPaid: false,
    isRecurring: true,
    frequency: 'weekly',
    notes: 'Gate code is 1234. Please mow the backyard as well.',
    jobNotes: [
      {
        id: 1,
        date: '2023-06-30',
        time: '09:15 AM',
        note: 'Customer requested that lawn clippings be bagged and not left on the lawn.'
      }
    ],
    serviceDetails: [
      'Front and back yard mowing',
      'Edging along walkways and driveway',
      'Blowing clippings from hard surfaces',
      'Removal of clippings',
      'Trim around obstacles'
    ],
    timeline: [
      {
        id: 1,
        date: '2023-06-25',
        time: '10:30 AM',
        event: 'Bid Accepted',
        description: 'Customer accepted your bid of $65.00'
      },
      {
        id: 2,
        date: '2023-06-25',
        time: '10:35 AM',
        event: 'Job Scheduled',
        description: 'Job scheduled for July 5, 2023, 10:00 AM - 12:00 PM'
      }
    ]
  };

  const handleUploadPhotos = (files: File[], caption: string) => {
    // In a real app, you would upload the files to a server
    // and then update the jobPhotos state with the response
    
    // For demo purposes, we'll create URLs for the files and add them
    const newPhotos = Array.from(files).map((file, index) => ({
      id: Math.max(0, ...jobPhotos.map(p => p.id)) + index + 1,
      url: URL.createObjectURL(file),
      caption: caption || file.name,
      timestamp: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      })
    }));
    
    setJobPhotos([...newPhotos, ...jobPhotos]);
  };

  const handleDeletePhoto = (photoId: number) => {
    setJobPhotos(jobPhotos.filter(photo => photo.id !== photoId));
  };

  // Status-specific content
  const statusContent = {
    scheduled: {
      title: 'Upcoming Job',
      description: 'This job is scheduled and confirmed.',
      primaryAction: {
        label: 'Start Job',
        icon: <Truck className="h-4 w-4" />,
        color: 'bg-blue-600 hover:bg-blue-700'
      },
      secondaryAction: {
        label: 'Cancel Job',
        icon: <XCircle className="h-4 w-4" />,
        color: 'bg-red-600 hover:bg-red-700'
      }
    },
    in_progress: {
      title: 'Job In Progress',
      description: 'This job is currently in progress.',
      primaryAction: {
        label: 'Mark as Complete',
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'bg-green-600 hover:bg-green-700'
      },
      secondaryAction: {
        label: 'Add Job Notes',
        icon: <FileText className="h-4 w-4" />,
        color: 'bg-gray-600 hover:bg-gray-700'
      }
    },
    completed: {
      title: 'Completed Job',
      description: job.isPaid 
        ? 'This job is completed and payment has been received.' 
        : 'This job is completed. Payment is pending.',
      primaryAction: job.isPaid ? null : {
        label: 'Send Invoice Reminder',
        icon: <DollarSign className="h-4 w-4" />,
        color: 'bg-yellow-600 hover:bg-yellow-700'
      },
      secondaryAction: {
        label: 'View Invoice',
        icon: <FileText className="h-4 w-4" />,
        color: 'bg-blue-600 hover:bg-blue-700'
      }
    },
    cancelled: {
      title: 'Cancelled Job',
      description: 'This job was cancelled.',
      primaryAction: {
        label: 'Contact Customer',
        icon: <MessageSquare className="h-4 w-4" />,
        color: 'bg-blue-600 hover:bg-blue-700'
      },
      secondaryAction: null
    }
  };

  const currentStatus = statusContent[job.status as keyof typeof statusContent];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Photo Upload Modal */}
      <UploadPhotoModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadPhotos}
      />
      
      {/* Photo Gallery Modal */}
      <PhotoGalleryModal 
        isOpen={isPhotoGalleryOpen}
        onClose={() => setIsPhotoGalleryOpen(false)}
        photos={jobPhotos}
        onDeletePhoto={handleDeletePhoto}
      />
      
      <div className="mb-6">
        <Link 
          href="/provider/jobs" 
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-5 border-b flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{job.service}</h1>
            <div className="text-gray-600 flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />
              <span>{job.property.address}, {job.property.city}, {job.property.state}</span>
            </div>
          </div>
          <JobStatusBadge status={job.status} />
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6 lg:col-span-2">
              {/* Status Banner */}
              <div className={`rounded-lg p-4 ${
                job.status === 'scheduled' ? 'bg-blue-50 border border-blue-100' :
                job.status === 'in_progress' ? 'bg-yellow-50 border border-yellow-100' :
                job.status === 'completed' ? 'bg-green-50 border border-green-100' :
                'bg-red-50 border border-red-100'
              }`}>
                <h2 className="font-semibold text-lg">{currentStatus.title}</h2>
                <p className="text-gray-600 mt-1">{currentStatus.description}</p>
                
                <div className="mt-4 flex gap-3">
                  {currentStatus.primaryAction && (
                    <button className={`flex items-center gap-1 px-4 py-2 text-white rounded-lg ${currentStatus.primaryAction.color}`}>
                      {currentStatus.primaryAction.icon}
                      <span>{currentStatus.primaryAction.label}</span>
                    </button>
                  )}
                  
                  {currentStatus.secondaryAction && (
                    <button className={`flex items-center gap-1 px-4 py-2 text-white rounded-lg ${currentStatus.secondaryAction.color}`}>
                      {currentStatus.secondaryAction.icon}
                      <span>{currentStatus.secondaryAction.label}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Schedule Information */}
              <div>
                <h2 className="text-lg font-semibold mb-3">Schedule Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-2 items-start">
                    <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Scheduled Date</div>
                      <div className="text-gray-600">{job.scheduledDate}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Scheduled Time</div>
                      <div className="text-gray-600">{job.scheduledTime}</div>
                    </div>
                  </div>
                  {job.isRecurring && (
                    <div className="flex gap-2 items-start">
                      <RotateCw className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Recurring Service</div>
                        <div className="text-gray-600 capitalize">{job.frequency}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Details */}
              <div>
                <h2 className="text-lg font-semibold mb-3">Service Details</h2>
                <ul className="space-y-2">
                  {job.serviceDetails.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Special Instructions */}
              {job.notes && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span>Special Instructions</span>
                  </h3>
                  <p className="text-gray-600">{job.notes}</p>
                </div>
              )}

              {/* Job Notes */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold">Job Notes</h2>
                  <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>Add Note</span>
                  </button>
                </div>
                
                {job.jobNotes.length > 0 ? (
                  <div className="space-y-3">
                    {job.jobNotes.map((note) => (
                      <div key={note.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-500 mb-1">{note.date} at {note.time}</div>
                        <p>{note.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No notes added yet.</p>
                )}
              </div>

              {/* Timeline */}
              <div>
                <h2 className="text-lg font-semibold mb-3">Timeline</h2>
                <div className="space-y-4">
                  {job.timeline.map((event, index) => (
                    <div key={event.id} className="relative pl-6">
                      {index < job.timeline.length - 1 && (
                        <div className="absolute left-[0.4375rem] top-3 bottom-0 w-0.5 bg-gray-200 z-0"></div>
                      )}
                      <div className="absolute left-0 top-1 h-2 w-2 rounded-full bg-blue-600"></div>
                      <div>
                        <div className="text-sm text-gray-500">{event.date} at {event.time}</div>
                        <div className="font-medium">{event.event}</div>
                        <div className="text-gray-600">{event.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Property Information */}
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <div className="h-40 relative">
                  <Image
                    src={job.property.image}
                    alt={job.property.address}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 flex items-end">
                    <h3 className="text-white font-bold p-4">Property Details</h3>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex gap-2 items-start">
                    <Home className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Property Type</div>
                      <div className="text-gray-600">{job.property.type}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Address</div>
                      <div className="text-gray-600">
                        {job.property.address}<br />
                        {job.property.city}, {job.property.state} {job.property.zipCode}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Link 
                      href={`https://maps.google.com/?q=${job.property.address}, ${job.property.city}, ${job.property.state} ${job.property.zipCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>View on Maps</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Customer Information</h3>
                <div className="space-y-3">
                  <div className="flex gap-2 items-start">
                    <User className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Name</div>
                      <div className="text-gray-600">{job.customer.name}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Phone</div>
                      <div className="text-gray-600">{job.customer.phone}</div>
                    </div>
                  </div>
                  <div className="pt-2 space-x-2">
                    <Link
                      href={`tel:${job.customer.phone.replace(/\D/g, '')}`}
                      className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      <Phone className="h-3 w-3" />
                      <span>Call</span>
                    </Link>
                    <Link
                      href={`/provider/messages/${job.customer.id}`}
                      className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>Message</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Payment Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Service Fee</span>
                    <span className="font-medium">${job.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="font-medium">Total</span>
                    <span className="font-bold">${job.amount.toFixed(2)}</span>
                  </div>
                  <div className="pt-2">
                    <div className={`text-sm flex items-center gap-1 ${job.isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                      {job.isPaid ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Payment received</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4" />
                          <span>Payment pending</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Photos Section */}
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Job Photos</h3>
                  {jobPhotos.length > 0 && (
                    <button 
                      onClick={() => setIsPhotoGalleryOpen(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Camera className="h-4 w-4" />
                      <span>View All ({jobPhotos.length})</span>
                    </button>
                  )}
                </div>
                
                {jobPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {jobPhotos.slice(0, 3).map(photo => (
                      <div 
                        key={photo.id} 
                        className="relative h-20 rounded-md overflow-hidden cursor-pointer"
                        onClick={() => setIsPhotoGalleryOpen(true)}
                      >
                        <Image
                          src={photo.url}
                          alt={photo.caption}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                    {jobPhotos.length > 3 && (
                      <div 
                        className="relative h-20 bg-gray-100 rounded-md flex items-center justify-center cursor-pointer"
                        onClick={() => setIsPhotoGalleryOpen(true)}
                      >
                        <span className="text-gray-600 font-medium">+{jobPhotos.length - 3} more</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No photos added yet.</p>
                )}
              </div>

              {/* Photo Upload Button */}
              <div className="border-t pt-4">
                <button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg"
                >
                  <Camera className="h-5 w-5" />
                  <span>Upload Job Photos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'scheduled':
      return (
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
          Scheduled
        </span>
      );
    case 'in_progress':
      return (
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
          In Progress
        </span>
      );
    case 'completed':
      return (
        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
          Completed
        </span>
      );
    case 'cancelled':
      return (
        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
          Cancelled
        </span>
      );
    default:
      return null;
  }
} 