import { NextRequest } from 'next/server';
import { VALID_GENRES } from '../../middleware';

/**
 * Extract genre from request headers
 * @param request Next.js request object
 * @returns The genre string or null if no valid genre is found
 */
export function getGenreFromRequest(request: NextRequest): string | null {
  const genreHeader = request.headers.get('x-genre-filter');
  
  if (genreHeader && VALID_GENRES.includes(genreHeader.toLowerCase())) {
    return genreHeader.toLowerCase();
  }
  
  return null;
}

/**
 * Check if an entity should be included based on genre filtering
 * @param entityGenres Array of genres associated with the entity
 * @param filterGenre Genre to filter by
 * @returns True if the entity should be included, false otherwise
 */
export function shouldIncludeByGenre(entityGenres: string[], filterGenre: string | null): boolean {
  // If no genre filter is applied, include all entities
  if (!filterGenre) {
    return true;
  }
  
  // If the entity has no genres, include it in all genre views
  // This ensures venues without specific genres still appear
  if (!entityGenres || entityGenres.length === 0) {
    return true;
  }
  
  // Include the entity if it matches the filter genre
  return entityGenres.some(genre => 
    genre.toLowerCase() === filterGenre.toLowerCase()
  );
}