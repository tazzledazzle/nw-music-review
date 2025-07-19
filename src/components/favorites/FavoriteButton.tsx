/**
 * Favorite button component for venues and artists
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/auth-context';
import { apiClient } from '../../lib/api-client';

interface FavoriteButtonProps {
  entityType: 'venue' | 'artist';
  entityId: number;
  onToggle?: (isFavorite: boolean) => void;
  className?: string;
}

export default function FavoriteButton({ 
  entityType, 
  entityId, 
  onToggle,
  className = '' 
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingFavorites, setIsCheckingFavorites] = useState(true);

  useEffect(() => {
    const checkIfFavorited = async () => {
      try {
        const favorites = await apiClient.getFavorites();
        const favoriteList = entityType === 'venue' ? favorites.venues : favorites.artists;
        const isFav = favoriteList.includes(entityId);
        setIsFavorited(isFav);
        onToggle?.(isFav);
      } catch (error) {
        console.error('Failed to check favorites:', error);
      } finally {
        setIsCheckingFavorites(false);
      }
    };

    if (isAuthenticated) {
      checkIfFavorited();
    } else {
      setIsCheckingFavorites(false);
    }
  }, [isAuthenticated, entityType, entityId, onToggle]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      // You might want to show a login modal here
      alert('Please log in to add favorites');
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorited) {
        await apiClient.removeFavorite(entityType, entityId);
        setIsFavorited(false);
        onToggle?.(false);
      } else {
        await apiClient.addFavorite({ entity_type: entityType, entity_id: entityId });
        setIsFavorited(true);
        onToggle?.(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // You might want to show a user-friendly error message
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Don't show favorite button for non-authenticated users
  }

  if (isCheckingFavorites) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`
        inline-flex items-center justify-center w-10 h-10 rounded-full
        border-2 transition-all duration-200
        ${isFavorited 
          ? 'bg-red-500 border-red-500 text-white hover:bg-red-600 hover:border-red-600' 
          : 'bg-white border-gray-300 text-gray-400 hover:border-red-500 hover:text-red-500'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        ${className}
      `}
      title={isFavorited ? `Remove from favorites` : `Add to favorites`}
    >
      {isLoading ? (
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg 
          className="w-5 h-5" 
          fill={isFavorited ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
      )}
    </button>
  );
}