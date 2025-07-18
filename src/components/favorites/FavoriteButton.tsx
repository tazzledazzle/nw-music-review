import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FavoriteButtonProps {
  entityType: 'venue' | 'artist';
  entityId: number;
  initialIsFavorite?: boolean;
  onToggle?: (isFavorite: boolean) => void;
  className?: string;
}

/**
 * Button component for adding/removing favorites
 */
export default function FavoriteButton({
  entityType,
  entityId,
  initialIsFavorite = false,
  onToggle,
  className = '',
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const router = useRouter();

  // Check if the entity is already a favorite on component mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const response = await fetch(`/api/users/favorites?type=${entityType}&details=false`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const isFav = data.data.some((fav: any) => 
            fav.entity_type === entityType && fav.entity_id === entityId
          );
          setIsFavorite(isFav);
        } else if (response.status === 401) {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [entityType, entityId]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      // Redirect to login page
      router.push('/login');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/users/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          entityType,
          entityId,
          action: isFavorite ? 'remove' : 'add',
        }),
      });

      if (response.ok) {
        const newStatus = !isFavorite;
        setIsFavorite(newStatus);
        if (onToggle) {
          onToggle(newStatus);
        }
      } else if (response.status === 401) {
        // Redirect to login page
        router.push('/login');
      } else {
        console.error('Error toggling favorite:', await response.text());
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`favorite-button ${isFavorite ? 'is-favorite' : ''} ${className}`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isLoading ? (
        <span className="loading">...</span>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={isFavorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      )}
    </button>
  );
}