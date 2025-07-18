'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface City {
  id: number;
  name: string;
  state_province: string;
  country: string;
  venue_count: number;
}

export default function CitiesPage({ params }: { params: { region: string } }) {
  const { region } = params;
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCities() {
      try {
        const response = await fetch(`/api/regions/${region}/cities`);
        if (!response.ok) {
          throw new Error(`Failed to fetch cities for region ${region}`);
        }
        const data = await response.json();
        setCities(data.cities);
        setLoading(false);
      } catch (err) {
        setError(`Error loading cities for ${region}. Please try again later.`);
        setLoading(false);
        console.error(`Error fetching cities for region ${region}:`, err);
      }
    }

    fetchCities();
  }, [region]);

  // Map of region codes to full names
  const regionNames: Record<string, string> = {
    'WA': 'Washington',
    'OR': 'Oregon',
    'ID': 'Idaho',
    'BC': 'British Columbia'
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
          <div className="flex items-center mb-6">
            <Link href="/regions" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center p-2 -ml-2 touch-manipulation">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"></path>
              </svg>
              Back to Regions
            </Link>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Cities in {regionNames[region] || region}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Select a city to explore music venues
          </p>
        </div>

        {cities.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-300">
              No cities found in this region.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {cities.map(city => (
              <Link 
                href={`/cities/${encodeURIComponent(city.name)}/venues`} 
                key={city.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow touch-manipulation active:bg-gray-50 dark:active:bg-gray-700"
              >
                <div className="h-40 md:h-32 bg-gray-200 dark:bg-gray-700 relative">
                  <Image
                    src="/window.svg"
                    alt={city.name}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="p-5 md:p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {city.name}
                  </h2>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300 text-base md:text-sm">
                      {city.venue_count} {city.venue_count === 1 ? 'venue' : 'venues'}
                    </span>
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <span className="text-base md:text-sm">View Venues</span>
                      <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}