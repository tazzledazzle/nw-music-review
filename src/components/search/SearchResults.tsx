'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MapPinIcon, 
  CalendarIcon, 
  TicketIcon,
  UserGroupIcon,
  StarIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { useGenre } from '@/lib/context/genre-context';
import { VALID_GENRES } from '@/middleware';
import GenreBadge from '../genre/GenreBadge';
import GenreFilter from '../genre/GenreFilter';

interface SearchResultsProps {
  query: string;
  type?: string;
  initialResults?: any;
  location?: {
    lat: number;
    lon: number;
    radius?: number;
  };
}

interface SearchFilters {
  type: string;
  genres: string[];
  state_province: string[];
  capacity_min?: number;
  capacity_max?: number;
  prosper_rank_min?: number;
  start_date?: string;
  end_date?: string;
  has_tickets?: boolean;
  sort_by?: string;
  sort_dir: 'asc' | 'desc';
}

export default function SearchResults({ 
  query, 
  type = 'all', 
  initialResults,
  location 
}: SearchResultsProps) {
  const { currentGenre, isGenreFiltered } = useGenre();
  const [results, setResults] = useState(initialResults);
  const [loading, setLoading] = useState(!initialResults);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type,
    genres: isGenreFiltered && currentGenre ? [currentGenre] : [],
    state_province: [],
    sort_dir: 'desc'
  });

  // Fetch search results
  const fetchResults = async (currentPage = 1, currentFilters = filters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        page: currentPage.toString(),
        limit: '12',
        ...Object.fromEntries(
          Object.entries(currentFilters).filter(([_, value]) => 
            value !== undefined && value !== '' && 
            (Array.isArray(value) ? value.length > 0 : true)
          ).map(([key, value]) => [
            key, 
            Array.isArray(value) ? value.join(',') : value.toString()
          ])
        )
      });

      // Add location parameters if searching nearby
      if (location) {
        params.set('lat', location.lat.toString());
        params.set('lon', location.lon.toString());
        if (location.radius) {
          params.set('radius', location.radius.toString());
        }
      }

      const endpoint = location ? '/api/search/nearby' : '/api/search';
      const response = await fetch(`${endpoint}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!initialResults) {
      fetchResults();
    }
  }, [query, type]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setPage(1);
    fetchResults(1, updatedFilters);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchResults(newPage);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Format distance for display
  const formatDistance = (distance: number) => {
    return distance < 1 
      ? `${Math.round(distance * 1000)}m`
      : `${distance.toFixed(1)}km`;
  };

  if (loading && !results) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Searching...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button 
          onClick={() => fetchResults()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!results || results.results.venues.total + results.results.artists.total + results.results.events.total === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          No results found for "{query}"
        </p>
        <p className="text-gray-500 dark:text-gray-500 mt-2">
          Try adjusting your search terms or filters
        </p>
      </div>
    );
  }

  const { venues, artists, events } = results.results;
  const totalResults = venues.total + artists.total + events.total;

  return (
    <div className="space-y-6">
      {/* Search Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Search Results
              {isGenreFiltered && (
                <GenreBadge className="ml-3" size="sm" showClear={true} />
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {totalResults} results for "{query}"
              {location && ` within ${location.radius || 25}km`}
              {isGenreFiltered && ` in ${currentGenre} music`}
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex items-center space-x-2">
            {/* Filters Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 
                       dark:border-gray-600 dark:text-white flex items-center"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5 mr-1" />
              Filters
            </button>
            
            {/* Type Filter */}
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange({ type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 
                       dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Results</option>
              <option value="venue">Venues Only</option>
              <option value="artist">Artists Only</option>
              <option value="event">Events Only</option>
            </select>
          </div>
        </div>
        
        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Genre Filter */}
            <div>
              <GenreFilter 
                onChange={(genre) => {
                  handleFilterChange({ 
                    genres: genre ? [genre] : [] 
                  });
                }}
                showAllOption={true}
              />
            </div>
            
            {/* State/Province Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State/Province
              </label>
              <select
                value={filters.state_province[0] || ''}
                onChange={(e) => handleFilterChange({ 
                  state_province: e.target.value ? [e.target.value] : [] 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 
                         dark:border-gray-600 dark:text-white"
              >
                <option value="">All States/Provinces</option>
                <option value="WA">Washington</option>
                <option value="OR">Oregon</option>
                <option value="ID">Idaho</option>
                <option value="BC">British Columbia</option>
              </select>
            </div>
            
            {/* Sort By Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={`${filters.sort_by || 'relevance'}-${filters.sort_dir}`}
                onChange={(e) => {
                  const [sortBy, sortDir] = e.target.value.split('-');
                  handleFilterChange({ 
                    sort_by: sortBy === 'relevance' ? undefined : sortBy,
                    sort_dir: sortDir as 'asc' | 'desc'
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 
                         dark:border-gray-600 dark:text-white"
              >
                <option value="relevance-desc">Relevance</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                {filters.type === 'venue' && (
                  <>
                    <option value="prosper_rank-desc">Highest Ranked</option>
                    <option value="capacity-desc">Largest Capacity</option>
                  </>
                )}
                {filters.type === 'event' && (
                  <>
                    <option value="event_datetime-asc">Upcoming First</option>
                    <option value="event_datetime-desc">Past First</option>
                  </>
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Sections */}
      <div className="space-y-8">
        {/* Venues Section */}
        {venues.total > 0 && (filters.type === 'all' || filters.type === 'venue') && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <span className="text-2xl mr-2">🏛️</span>
                Venues ({venues.total})
              </h2>
              {filters.type === 'all' && venues.total > 3 && (
                <Link 
                  href={`/search?q=${encodeURIComponent(query)}&type=venue`}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
                >
                  View all venues →
                </Link>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {venues.items.slice(0, filters.type === 'all' ? 3 : undefined).map((venue: any) => (
                <Link 
                  key={venue.id} 
                  href={`/venues/${venue.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md 
                           transition-shadow border border-gray-200 dark:border-gray-700"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {venue.name}
                      </h3>
                      {venue.prosper_rank > 0 && (
                        <div className="flex items-center ml-2">
                          <StarIcon className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                            {venue.prosper_rank}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        <span className="truncate">{venue.address}</span>
                      </div>
                      
                      {venue.capacity && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <UserGroupIcon className="h-4 w-4 mr-1" />
                          <span>Capacity: {venue.capacity.toLocaleString()}</span>
                        </div>
                      )}
                      
                      {venue.distance !== undefined && (
                        <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          <span>{formatDistance(venue.distance)} away</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                      {venue.city.name}, {venue.city.state_province}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Artists Section */}
        {artists.total > 0 && (filters.type === 'all' || filters.type === 'artist') && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <span className="text-2xl mr-2">🎤</span>
                Artists ({artists.total})
              </h2>
              {filters.type === 'all' && artists.total > 3 && (
                <Link 
                  href={`/search?q=${encodeURIComponent(query)}&type=artist`}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
                >
                  View all artists →
                </Link>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {artists.items.slice(0, filters.type === 'all' ? 3 : undefined).map((artist: any) => (
                <Link 
                  key={artist.id} 
                  href={`/artists/${artist.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md 
                           transition-shadow border border-gray-200 dark:border-gray-700"
                >
                  <div className="p-4">
                    <div className="flex items-start space-x-3">
                      {artist.photo_url ? (
                        <img 
                          src={artist.photo_url} 
                          alt={artist.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 
                                      flex items-center justify-center">
                          <span className="text-xl">🎤</span>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {artist.name}
                        </h3>
                        
                        {artist.genres && artist.genres.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {artist.genres.slice(0, 3).map((genre: string) => (
                              <Link 
                                key={genre}
                                href={`http://${genre}.${window.location.host}`}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs 
                                         font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 
                                         dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
                              >
                                {genre}
                              </Link>
                            ))}
                            {artist.genres.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{artist.genres.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                        
                        {artist.profile_bio && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {artist.profile_bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Events Section */}
        {events.total > 0 && (filters.type === 'all' || filters.type === 'event') && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <span className="text-2xl mr-2">🎵</span>
                Events ({events.total})
              </h2>
              {filters.type === 'all' && events.total > 3 && (
                <Link 
                  href={`/search?q=${encodeURIComponent(query)}&type=event`}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
                >
                  View all events →
                </Link>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.items.slice(0, filters.type === 'all' ? 3 : undefined).map((event: any) => (
                <Link 
                  key={event.id} 
                  href={`/events/${event.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md 
                           transition-shadow border border-gray-200 dark:border-gray-700"
                >
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {event.title}
                    </h3>
                    
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>{formatDate(event.event_datetime)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        <span className="truncate">{event.venue.name}</span>
                        {event.distance !== undefined && (
                          <span className="ml-2 text-blue-600 dark:text-blue-400">
                            ({formatDistance(event.distance)})
                          </span>
                        )}
                      </div>
                      
                      {event.artists && event.artists.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.artists.slice(0, 3).map((artist: any) => (
                            <span 
                              key={artist.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs 
                                       font-medium bg-green-100 text-green-800 dark:bg-green-900 
                                       dark:text-green-300"
                            >
                              {artist.name}
                            </span>
                          ))}
                          {event.artists.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{event.artists.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Display genres for the event */}
                      {event.artists && event.artists.some((artist: any) => artist.genres?.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.from(new Set(
                            event.artists.flatMap((artist: any) => artist.genres || []).slice(0, 3)
                          )).map((genre: string) => (
                            <Link 
                              key={genre}
                              href={`http://${genre}.${window.location.host}`}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs 
                                       font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 
                                       dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
                            >
                              {genre}
                            </Link>
                          ))}
                        </div>
                      )}
                      
                      {event.ticket_url && (
                        <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                          <TicketIcon className="h-4 w-4 mr-1" />
                          <span>Tickets available</span>
                        </div>
                      )}
                    </div>
                    
                    {event.description && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Pagination */}
      {results.pagination.total_pages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 
                     disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700
                     dark:border-gray-600 dark:text-white"
          >
            Previous
          </button>
          
          <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
            Page {page} of {results.pagination.total_pages}
          </span>
          
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === results.pagination.total_pages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 
                     disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700
                     dark:border-gray-600 dark:text-white"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}