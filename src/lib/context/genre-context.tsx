import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { VALID_GENRES } from '../../middleware';

interface GenreContextType {
  currentGenre: string | null;
  isGenreFiltered: boolean;
  validGenres: string[];
}

// Create the context with default values
const GenreContext = createContext<GenreContextType>({
  currentGenre: null,
  isGenreFiltered: false,
  validGenres: VALID_GENRES,
});

// Hook for using the genre context
export const useGenre = () => useContext(GenreContext);

interface GenreProviderProps {
  children: ReactNode;
  initialGenre?: string | null;
}

/**
 * Provider component for genre context
 * Makes genre information available throughout the application
 */
export const GenreProvider = ({ children, initialGenre = null }: GenreProviderProps) => {
  const [currentGenre, setCurrentGenre] = useState<string | null>(initialGenre);
  
  // Effect to detect genre from headers on client-side
  useEffect(() => {
    // If initialGenre is provided (from server), use it
    if (initialGenre) {
      setCurrentGenre(initialGenre);
      return;
    }
    
    // Otherwise try to detect from hostname
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    
    if (VALID_GENRES.includes(subdomain.toLowerCase())) {
      setCurrentGenre(subdomain.toLowerCase());
    } else {
      setCurrentGenre(null);
    }
  }, [initialGenre]);
  
  const value = {
    currentGenre,
    isGenreFiltered: currentGenre !== null,
    validGenres: VALID_GENRES,
  };
  
  return (
    <GenreContext.Provider value={value}>
      {children}
    </GenreContext.Provider>
  );
};