'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Region {
  country: string;
  regions: string[];
}

export default function RegionsPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');

  useEffect(() => {
    async function fetchRegions() {
      try {
        const response = await fetch('/api/regions');
        if (!response.ok) {
          throw new Error('Failed to fetch regions');
        }
        const data = await response.json();
        setRegions(data.regions);
        setLoading(false);
      } catch (err) {
        setError('Error loading regions. Please try again later.');
        setLoading(false);
        console.error('Error fetching regions:', err);
      }
    }

    fetchRegions();
  }, []);

  // Map of region codes to full names
  const regionNames: Record<string, string> = {
    'WA': 'Washington',
    'OR': 'Oregon',
    'ID': 'Idaho',
    'BC': 'British Columbia'
  };

  // Map of region codes to image paths (placeholder images)
  const regionImages: Record<string, string> = {
    'WA': '/globe.svg', // Replace with actual region images
    'OR': '/globe.svg',
    'ID': '/globe.svg',
    'BC': '/globe.svg'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Explore Regions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Select a region to discover music venues across the Pacific Northwest
          </p>
          
          {/* View toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-5 py-3 md:px-4 md:py-2 text-base md:text-sm font-medium rounded-l-lg touch-manipulation ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:active:bg-gray-500'
                }`}
              >
                List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-5 py-3 md:px-4 md:py-2 text-base md:text-sm font-medium rounded-r-lg touch-manipulation ${
                  viewMode === 'map'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:active:bg-gray-500'
                }`}
              >
                Map View
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {regions.flatMap(countryRegion =>
              countryRegion.regions.map(region => (
                <Link 
                  href={`/regions/${region}/cities`} 
                  key={region}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow touch-manipulation active:bg-gray-50 dark:active:bg-gray-700"
                >
                  <div className="h-48 md:h-40 bg-gray-200 dark:bg-gray-700 relative">
                    <Image
                      src={regionImages[region] || '/globe.svg'}
                      alt={regionNames[region] || region}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      priority={region === 'WA' || region === 'OR'} // Prioritize loading for main regions
                    />
                  </div>
                  <div className="p-5 md:p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {regionNames[region] || region}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-base md:text-sm">
                      {countryRegion.country}
                    </p>
                    <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400">
                      <span className="text-base md:text-sm">View Cities</span>
                      <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6">
            <div className="text-center mb-4 md:mb-6">
              <p className="text-gray-600 dark:text-gray-300">
                Interactive map view of regions
              </p>
            </div>
            <div className="h-80 md:h-96 bg-gray-200 dark:bg-gray-700 rounded-lg relative">
              {/* Placeholder for map - in a real implementation, this would be a map component */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Image
                    src="/globe.svg"
                    alt="Map Placeholder"
                    width={100}
                    height={100}
                    className="mx-auto mb-4"
                  />
                  <p className="text-gray-500 dark:text-gray-400">
                    Interactive map would be displayed here
                  </p>
                </div>
              </div>
              
              {/* Region markers - larger touch targets for mobile */}
              <div className="absolute inset-0">
                {regions.flatMap(countryRegion =>
                  countryRegion.regions.map(region => (
                    <Link 
                      href={`/regions/${region}/cities`} 
                      key={region}
                      className={`absolute p-3 md:p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 active:bg-blue-700 transition-colors
                        min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation
                        ${region === 'WA' ? 'top-1/4 left-1/4' : 
                          region === 'OR' ? 'top-1/3 left-1/4' : 
                          region === 'ID' ? 'top-1/3 left-1/3' : 
                          'top-1/5 left-1/5'}`}
                    >
                      {region}
                    </Link>
                  ))
                )}
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {regions.flatMap(countryRegion =>
                countryRegion.regions.map(region => (
                  <Link 
                    href={`/regions/${region}/cities`} 
                    key={region}
                    className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-center hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-600 dark:active:bg-gray-500 transition-colors touch-manipulation min-h-[44px] flex items-center justify-center"
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white text-base md:text-sm">
                      {regionNames[region] || region}
                    </h3>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}