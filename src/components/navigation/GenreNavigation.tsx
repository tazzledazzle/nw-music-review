'use client';

import { useGenre } from '@/lib/context/genre-context';
import { VALID_GENRES } from '@/middleware';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import GenreBadge from '../genre/GenreBadge';

interface GenreNavigationProps {
  className?: string;
  compact?: boolean;
}

/**
 * Navigation component that displays genre options
 * Shows the current genre and allows switching between genres
 */
export default function GenreNavigation({ className = '', compact = false }: GenreNavigationProps) {
  const { currentGenre, validGenres } = useGenre();
  const [isOpen, setIsOpen] = useState(false);
  
  // Group genres into columns for better display
  const genreColumns = compact ? [validGenres] : [
    validGenres.slice(0, Math.ceil(validGenres.length / 3)),
    validGenres.slice(Math.ceil(validGenres.length / 3), Math.ceil(validGenres.length / 3) * 2),
    validGenres.slice(Math.ceil(validGenres.length / 3) * 2)
  ];
  
  // Helper function to capitalize first letter
  function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  // Helper function to get the URL for a genre
  function getGenreUrl(genre: string | null) {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost';
    const path = window.location.pathname;
    
    if (!genre) {
      // Main domain without genre
      if (isLocalhost) {
        const port = window.location.port;
        return `http://localhost:${port}${path}`;
      } else {
        const domainParts = hostname.split('.');
        if (domainParts.length > 2) {
          // Remove subdomain
          return `${window.location.protocol}//${domainParts.slice(1).join('.')}${path}`;
        }
        return `${window.location.protocol}//${hostname}${path}`;
      }
    } else {
      // Genre subdomain
      if (isLocalhost) {
        const port = window.location.port;
        return `http://${genre}.localhost:${port}${path}`;
      } else {
        const domainParts = hostname.split('.');
        if (domainParts.length >= 2) {
          // Replace subdomain or add new one
          domainParts[0] = genre;
          return `${window.location.protocol}//${domainParts.join('.')}${path}`;
        }
        return `${window.location.protocol}//${genre}.${hostname}${path}`;
      }
    }
  }
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 
                 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        {currentGenre ? (
          <GenreBadge size="sm" />
        ) : (
          <span className="text-gray-700 dark:text-gray-300">All Genres</span>
        )}
        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-2 w-auto min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                      border border-gray-200 dark:border-gray-700 p-4">
          <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <Link 
              href={getGenreUrl(null)}
              className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 
                       text-gray-900 dark:text-white font-medium"
              onClick={() => setIsOpen(false)}
            >
              All Genres
            </Link>
          </div>
          
          <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-2`}>
            {genreColumns.map((column, colIndex) => (
              <div key={colIndex} className="space-y-1">
                {column.map(genre => (
                  <Link 
                    key={genre}
                    href={getGenreUrl(genre)}
                    className={`block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 
                             ${currentGenre === genre ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 
                                                      'text-gray-700 dark:text-gray-300'}`}
                    onClick={() => setIsOpen(false)}
                  >
                    {capitalizeFirstLetter(genre)}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}