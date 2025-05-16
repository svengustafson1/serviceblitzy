'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';

// Mock data for appointments (in a real app, this would come from the backend)
const mockAppointments = [
  {
    id: 'appt1',
    title: 'Lawn Mowing - 123 Main St',
    date: '2023-07-10',
    startTime: '10:00 AM',
    endTime: '11:30 AM',
    customer: 'John Smith',
    status: 'confirmed'
  },
  {
    id: 'appt2',
    title: 'Garden Cleanup - 456 Elm St',
    date: '2023-07-10',
    startTime: '2:00 PM',
    endTime: '4:00 PM',
    customer: 'Sarah Johnson',
    status: 'confirmed'
  },
  {
    id: 'appt3',
    title: 'Hedge Trimming - 789 Oak Ave',
    date: '2023-07-12',
    startTime: '9:00 AM',
    endTime: '10:30 AM',
    customer: 'Mike Wilson',
    status: 'pending'
  },
  {
    id: 'appt4',
    title: 'Lawn Mowing - 123 Main St',
    date: '2023-07-17',
    startTime: '10:00 AM',
    endTime: '11:30 AM',
    customer: 'John Smith',
    status: 'confirmed'
  },
  {
    id: 'appt5',
    title: 'Sprinkler Repair - 234 Pine St',
    date: '2023-07-18',
    startTime: '1:00 PM',
    endTime: '3:00 PM',
    customer: 'Amanda Brown',
    status: 'confirmed'
  }
];

// Helper to get days in a month
const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper to get day of week (0 = Sunday, 1 = Monday, etc.)
const getDayOfWeek = (year, month, day) => {
  return new Date(year, month, day).getDay();
};

// Days of the week
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProviderSchedulePage() {
  const currentDate = new Date();
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth());
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [view, setView] = useState('month'); // 'month', 'week', or 'day'
  
  // Go to previous month
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  
  // Go to next month
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };
  
  // Get appointments for a specific day
  const getAppointmentsForDay = (year, month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return mockAppointments.filter(appointment => appointment.date === dateStr);
  };
  
  // Format month name
  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long' });
  
  // Build calendar grid
  const buildCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDayOfMonth = getDayOfWeek(viewYear, viewMonth, 1);
    
    let calendarDays = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }
    
    return calendarDays;
  };
  
  const calendarDays = buildCalendarGrid();
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <p className="text-gray-600">Manage your appointments and availability</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex space-x-2">
            <button 
              onClick={() => setView('month')}
              className={`px-3 py-1 rounded-md ${view === 'month' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            >
              Month
            </button>
            <button 
              onClick={() => setView('week')}
              className={`px-3 py-1 rounded-md ${view === 'week' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            >
              Week
            </button>
            <button 
              onClick={() => setView('day')}
              className={`px-3 py-1 rounded-md ${view === 'day' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            >
              Day
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={prevMonth} 
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {monthName} {viewYear}
            </h2>
            <button 
              onClick={nextMonth} 
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          <button className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            <span>Add Event</span>
          </button>
        </div>
        
        <div className="p-4">
          {/* Month View */}
          {view === 'month' && (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map(day => (
                  <div key={day} className="text-center text-gray-500 font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div 
                    key={index} 
                    className={`
                      min-h-[100px] border rounded-md p-2
                      ${!day ? 'bg-gray-50' : 'hover:border-blue-300 cursor-pointer'}
                      ${day === currentDate.getDate() && viewMonth === currentDate.getMonth() && viewYear === currentDate.getFullYear() ? 'bg-blue-50 border-blue-200' : ''}
                    `}
                  >
                    {day && (
                      <>
                        <div className="font-medium mb-1">{day}</div>
                        {getAppointmentsForDay(viewYear, viewMonth, day).map(appointment => (
                          <div 
                            key={appointment.id} 
                            className={`
                              p-1 mb-1 text-xs rounded truncate
                              ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                            `}
                          >
                            {appointment.startTime} - {appointment.title}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Week and Day views would go here */}
          {(view === 'week' || view === 'day') && (
            <div className="text-center py-8">
              <div className="flex flex-col items-center">
                <CalendarIcon className="h-12 w-12 text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-500">Coming Soon</h3>
                <p className="text-gray-500">
                  {view === 'week' ? 'Week view' : 'Day view'} is under development
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
        </div>
        
        <div className="divide-y">
          {mockAppointments.filter(appointment => new Date(appointment.date) >= currentDate)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5)
            .map(appointment => (
              <div key={appointment.id} className="p-4 flex items-start">
                <div className="bg-blue-100 rounded-lg p-3 mr-4">
                  <CalendarIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{appointment.title}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Clock className="h-4 w-4 mr-1" />
                    {appointment.startTime} - {appointment.endTime}
                  </div>
                  <div className="text-sm text-gray-500">Customer: {appointment.customer}</div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    aria-label={`Edit appointment: ${appointment.title}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    aria-label={`Delete appointment: ${appointment.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
} 