'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MagnifyingGlassIcon, MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { debounce } from 'lodash';
import { useGenre } from '@/lib/context/genre-context';
import GenreBadge from '../genre/GenreBadge';

interface SearchSuggestion {
  id: number;
  name: string;
  type: 'venue' | 'artist' | 'event';
  subtitle?: string;
  location?: {
    city: string;
    state_province: string;
  };
  genres?: string[];
}

interface SearchInputProps {
  placeholder?: string;
  onSearch?: (query: string, type?: string) => void;
  showNearMe?: boolean;
  className?: string;
  autoFocus?: boolean;
  showGenreBadge?: boolean;
}

export default function SearchInput({ 
  placeholder = "Search venues, artists, or events...",
  onSearch,
  showNearMe = true,
  className = "",
  autoFocus = false,
  showGenreBadge = true
}: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isNearMeLoading, setIsNearMeLoading] = useState(false);
  
  const { currentGenre, isGenreFiltered } = useGenre();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced function to fetch suggestions
  const debouncedFetchSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      try {
        // Add genre to search params if filtered
        const searchParams = new URLSearchParams({
          q: searchQuery,
          limit: '5'
        });
        
        if (isGenreFiltered && currentGenre) {
          searchParams.set('genres', currentGenre);
        }
        
        const response = await fetch(
          `/api/search?${searchParams.toString()}`
        );
        
        if (response.ok) {
          const data = await response.json();
          const allSuggestions: SearchSuggestion[] = [];

          // Add venue suggestions
          data.results.venues.items.forEach((venue: any) => {
            allSuggestions.push({
              id: venue.id,
              name: venue.name,
              type: 'venue',
              subtitle: venue.address,
              location: venue.city
            });
          });

          // Add artist suggestions
          data.results.artists.items.forEach((artist: any) => {
            allSuggestions.push({
              id: artist.id,
              name: artist.name,
              type: 'artist',
              subtitle: artist.genres?.join(', '),
              genres: artist.genres
            });
          });

          // Add event suggestions
          data.results.events.items.forEach((event: any) => {
            allSuggestions.push({
              id: event.id,
              name: event.title,
              type: 'event',
              subtitle: `${event.venue.name} • ${new Date(event.event_datetime).toLocaleDateString()}`,
              location: event.venue.city,
              genres: event.artists?.flatMap((artist: any) => artist.genres || [])
            });
          });

          setSuggestions(allSuggestions);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [currentGenre, isGenreFiltered]
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    debouncedFetchSuggestions(value);
  };

  // Handle search submission
  const handleSearch = (searchQuery?: string, searchType?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      setShowSuggestions(false);
      if (onSearch) {
        onSearch(finalQuery, searchType);
      } else {
        // Navigate to search results page
        const params = new URLSearchParams({ q: finalQuery });
        if (searchType) params.set('type', searchType);
        
        // Add genre filter if applicable
        if (isGenreFiltered && currentGenre) {
          params.set('genres', currentGenre);
        }
        
        router.push(`/search?${params.toString()}`);
      }
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
    
    // Navigate directly to the specific item page
    switch (suggestion.type) {
      case 'venue':
        router.push(`/venues/${suggestion.id}`);
        break;
      case 'artist':
        router.push(`/artists/${suggestion.id}`);
        break;
      case 'event':
        router.push(`/events/${suggestion.id}`);
        break;
      default:
        handleSearch(suggestion.name, suggestion.type);
    }
  };

  // Handle "Near Me" functionality
  const handleNearMe = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsNearMeLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const params = new URLSearchParams({
          lat: latitude.toString(),
          lon: longitude.toString(),
          radius: '25'
        });
        
        // Add genre filter if applicable
        if (isGenreFiltered && currentGenre) {
          params.set('genres', currentGenre);
        }
        
        router.push(`/search/nearby?${params.toString()}`);
        setIsNearMeLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please check your browser settings.');
        setIsNearMeLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'venue':
        return '🏛️';
      case 'artist':
        return '🎤';
      case 'event':
        return '🎵';
      default:
        return '🔍';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Genre Badge */}
      {showGenreBadge && isGenreFiltered && (
        <div className="mb-2">
          <GenreBadge showClear={true} />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            Showing {currentGenre} content only
          </span>
        </div>
      )}
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={isGenreFiltered ? `Search ${currentGenre} ${placeholder}` : placeholder}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg 
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white
                   placeholder-gray-500 dark:placeholder-gray-400"
        />

        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}

        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Near Me Button */}
      {showNearMe && (
        <button
          onClick={handleNearMe}
          disabled={isNearMeLoading}
          className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 
                   rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50
                   dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isNearMeLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          ) : (
            <MapPinIcon className="h-4 w-4 mr-2" />
          )}
          {isNearMeLoading ? 'Getting location...' : 'Near me'}
        </button>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 
                   dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.id}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700
                        border-b border-gray-100 dark:border-gray-700 last:border-b-0
                        ${index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-lg mt-0.5">{getTypeIcon(suggestion.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {suggestion.name}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                                   bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {suggestion.type}
                    </span>
                  </div>
                  {suggestion.subtitle && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {suggestion.subtitle}
                    </p>
                  )}
                  {suggestion.location && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {suggestion.location.city}, {suggestion.location.state_province}
                    </p>
                  )}
                  {suggestion.genres && suggestion.genres.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {suggestion.genres.slice(0, 2).map((genre, i) => (
                        <span 
                          key={`${genre}-${i}`}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs 
                                   font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 
                                   dark:text-blue-300"
                        >
                          {genre}
                        </span>
                      ))}
                      {suggestion.genres.length > 2 && (
                        <span className="text-xs text-gray-500">+{suggestion.genres.length - 2} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}