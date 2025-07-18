'use client';

import { Event } from '@/lib/models/types';
import Link from 'next/link';

interface UpcomingShowsProps {
  events: Event[];
  loading: boolean;
}

export function UpcomingShows({ events, loading }: UpcomingShowsProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="text-gray-400 dark:text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <p className="text-lg font-medium">No upcoming shows</p>
          <p className="text-sm">Check back later for new events</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {events.map((event) => (
          <div key={event.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-start space-x-4">
              {/* Date */}
              <div className="flex-shrink-0 text-center">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3 min-w-[4rem]">
                  <div className="text-blue-800 dark:text-blue-200 font-bold text-sm">
                    {new Date(event.event_datetime).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                  </div>
                  <div className="text-blue-900 dark:text-blue-100 font-bold text-xl">
                    {new Date(event.event_datetime).getDate()}
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {event.title}
                </h3>

                {/* Venue Info */}
                {event.venue && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate">
                      {event.venue.name}
                      {event.venue.city && (
                        <span className="text-gray-500 dark:text-gray-500">
                          {' • '}{event.venue.city.name}, {event.venue.city.state_province}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Time */}
                <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>
                    {new Date(event.event_datetime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>

                {/* Description */}
                {event.description && (
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                    {event.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-4">
                  {event.ticket_url && (
                    <a
                      href={event.ticket_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                      Get Tickets
                    </a>
                  )}
                  
                  <Link
                    href={`/events/${event.id}`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}