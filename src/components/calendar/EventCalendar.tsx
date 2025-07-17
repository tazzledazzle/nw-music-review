'use client';

import React, { useState, useEffect } from 'react';
import { Event } from '@/lib/models/types';

interface EventCalendarProps {
  venueId: number;
  onEventClick?: (event: Event) => void;
  className?: string;
}

type CalendarView = 'month' | 'week';

interface CalendarEvent extends Event {
  formatted_date: string;
  formatted_time: string;
}

export default function EventCalendar({ venueId, onEventClick, className = '' }: EventCalendarProps) {
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch events for the venue
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate date range based on current view
        const startDate = new Date(currentDate);
        const endDate = new Date(currentDate);

        if (view === 'month') {
          // Get first day of month
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          
          // Get last day of month
          endDate.setMonth(endDate.getMonth() + 1);
          endDate.setDate(0);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // Get start of week (Sunday)
          const dayOfWeek = startDate.getDay();
          startDate.setDate(startDate.getDate() - dayOfWeek);
          startDate.setHours(0, 0, 0, 0);
          
          // Get end of week (Saturday)
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
        }

        const params = new URLSearchParams({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          limit: '100'
        });

        const response = await fetch(`/api/venues/${venueId}/events?${params}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Transform events to include formatted date/time
        const transformedEvents = data.events.map((event: Event) => ({
          ...event,
          formatted_date: new Date(event.event_datetime).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }),
          formatted_time: new Date(event.event_datetime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        }));

        setEvents(transformedEvents);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [venueId, currentDate, view]);

  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toDateString();
    return events.filter(event => 
      new Date(event.event_datetime).toDateString() === dateStr
    );
  };

  // Generate calendar grid for month view
  const generateMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and calculate starting date (including previous month days)
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateObj = new Date(startDate);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const dayEvents = getEventsForDate(currentDateObj);
      const isCurrentMonth = currentDateObj.getMonth() === month;
      const isToday = currentDateObj.toDateString() === new Date().toDateString();
      
      days.push({
        date: new Date(currentDateObj),
        events: dayEvents,
        isCurrentMonth,
        isToday
      });
      
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    return days;
  };

  // Generate week grid for week view
  const generateWeekGrid = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    const days = [];
    const currentDateObj = new Date(startOfWeek);
    
    for (let i = 0; i < 7; i++) {
      const dayEvents = getEventsForDate(currentDateObj);
      const isToday = currentDateObj.toDateString() === new Date().toDateString();
      
      days.push({
        date: new Date(currentDateObj),
        events: dayEvents,
        isCurrentMonth: true,
        isToday
      });
      
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    return days;
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading events...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-600">Error loading events: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const calendarDays = view === 'month' ? generateMonthGrid() : generateWeekGrid();
  const currentMonthYear = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Calendar Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {view === 'month' ? currentMonthYear : `Week of ${calendarDays[0]?.date.toLocaleDateString()}`}
          </h2>
          
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                view === 'month' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                view === 'week' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={navigatePrevious}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Previous"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Next"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <button
            onClick={navigateToday}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className={`grid grid-cols-7 gap-1 ${view === 'week' ? 'min-h-96' : ''}`}>
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`p-2 min-h-24 border border-gray-100 rounded-lg ${
                day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${day.isToday ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${
                day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              } ${day.isToday ? 'text-blue-600' : ''}`}>
                {day.date.getDate()}
              </div>
              
              {/* Events for this day */}
              <div className="space-y-1">
                {day.events.slice(0, view === 'week' ? 10 : 3).map((event, eventIndex) => (
                  <button
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="w-full text-left p-1 bg-blue-100 hover:bg-blue-200 rounded text-xs text-blue-800 transition-colors"
                    title={`${event.title} - ${event.formatted_time}`}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    <div className="text-blue-600">{event.formatted_time}</div>
                  </button>
                ))}
                
                {/* Show "more" indicator if there are additional events */}
                {day.events.length > (view === 'week' ? 10 : 3) && (
                  <div className="text-xs text-gray-500 text-center">
                    +{day.events.length - (view === 'week' ? 10 : 3)} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Events Summary */}
      {events.length === 0 && (
        <div className="p-4 text-center text-gray-500">
          No events scheduled for this {view}.
        </div>
      )}
    </div>
  );
}