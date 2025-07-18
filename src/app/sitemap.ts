import { MetadataRoute } from 'next';
import { CityRepository } from '@/lib/repositories/city-repository';
import { VenueRepository } from '@/lib/repositories/venue-repository';
import { ArtistRepository } from '@/lib/repositories/artist-repository';
import { VALID_GENRES } from '@/middleware';

/**
 * Generate sitemap for the application
 * This helps search engines discover and index our content
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://venue-explorer.com';
  
  // Get all cities
  const cityRepo = new CityRepository();
  const cities = await cityRepo.findAll();
  
  // Get all venues
  const venueRepo = new VenueRepository();
  const venues = await venueRepo.findAll({ limit: 1000 });
  
  // Get popular artists
  const artistRepo = new ArtistRepository();
  const artists = await artistRepo.findAll({ limit: 500 });
  
  // Static routes
  const staticRoutes = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/regions`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search/nearby`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ] as MetadataRoute.Sitemap;
  
  // City routes
  const cityRoutes = cities.map((city) => ({
    url: `${baseUrl}/cities/${encodeURIComponent(city.name.toLowerCase())}/venues`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));
  
  // Region routes
  const regionRoutes = ['WA', 'OR', 'ID', 'BC'].map((region) => ({
    url: `${baseUrl}/regions/${region.toLowerCase()}/cities`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));
  
  // Venue routes
  const venueRoutes = venues.map((venue) => ({
    url: `${baseUrl}/venues/${venue.id}`,
    lastModified: new Date(venue.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));
  
  // Artist routes
  const artistRoutes = artists.map((artist) => ({
    url: `${baseUrl}/artists/${artist.id}`,
    lastModified: new Date(artist.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));
  
  // Genre subdomain routes
  const genreRoutes = VALID_GENRES.flatMap((genre) => [
    {
      url: `https://${genre}.venue-explorer.com`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `https://${genre}.venue-explorer.com/regions`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `https://${genre}.venue-explorer.com/search`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
  ]);
  
  // Combine all routes
  return [
    ...staticRoutes,
    ...cityRoutes,
    ...regionRoutes,
    ...venueRoutes,
    ...artistRoutes,
    ...genreRoutes,
  ];
}