'use client';

import { useGenre } from '@/lib/context/genre-context';
import { VALID_GENRES } from '@/middleware';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface GenreBadgeProps {
  className?: string;
  showClear?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Component to display the current genre as a badge
 * Optionally includes a clear button to remove the genre filter
 */
export default function GenreBadge({ 
  className = '', 
  showClear = false,
  size = 'md'
}: GenreBadgeProps) {
  const { currentGenre, isGenreFiltered } = useGenre();
  
  if (!isGenreFiltered) {
    return null;
  }
  
  // Map genre to color
  const getGenreColor = (genre: string) => {
    const colorMap: Record<string, string> = {
      rock: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      jazz: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      electronic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      hiphop: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      classical: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      country: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      blues: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      folk: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      metal: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
      pop: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      indie: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
      punk: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      reggae: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
      soul: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
      rnb: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300',
      world: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    };
    
    return colorMap[genre.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };
  
  return (
    <div className={`inline-flex items-center rounded-full ${getGenreColor(currentGenre!)} ${sizeClasses[size]} font-medium ${className}`}>
      {currentGenre}
      
      {showClear && (
        <Link 
          href={window.location.pathname}
          className="ml-1.5 inline-flex items-center justify-center rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800"
          style={{ width: size === 'sm' ? '16px' : size === 'md' ? '18px' : '20px', height: size === 'sm' ? '16px' : size === 'md' ? '18px' : '20px' }}
        >
          <XMarkIcon className="w-3 h-3" />
          <span className="sr-only">Remove genre filter</span>
        </Link>
      )}
    </div>
  );
}