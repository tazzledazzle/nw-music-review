'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SearchInput from '@/components/search/SearchInput';

interface Venue {
  id: number;
  name: string;
  address: string;
  capacity: number | null;
  website: string | null;
  prosper_rank: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export default function VenuesPage({ params }: { params: { city: string } }) {
  const { city } = params;
  const [venues, setVenues] = useState<Venue[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchVenues = async (page: number = 1) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sort_by: sortBy,
        sort_dir: sortDir
      });
      
      const response = await fetch(`/api/cities/${encodeURIComponent(city)}/venues?${queryParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch venues for city ${city}`);
      }
      
      const data = await response.json();
      setVenues(data.venues);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
        total_pages: data.pagination.total_pages
      });
      setLoading(false);
    } catch (err) {
      setError(`Error loading venues for ${city}. Please try again later.`);
      setLoading(false);
      console.error(`Error fetching venues for city ${city}:`, err);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, [city, sortBy, sortDir]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchVenues(newPage);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // In a real implementation, this would filter venues or trigger a new API call
    // For now, we'll just simulate filtering on the client side
    if (query.trim() === '') {
      fetchVenues();
    }
  };

  if (loading && venues.length === 0) {
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

  // Filter venues based on search query (client-side filtering)
  const filteredVenues = searchQuery.trim() === '' 
    ? venues 
    : venues.filter(venue => 
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (venue.address && venue.address.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Link href="/regions" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"></path>
              </svg>
              Back to Regions
            </Link>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Venues in {decodeURIComponent(city)}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Explore music venues and upcoming shows
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="w-full md:w-1/2">
              <SearchInput 
                placeholder="Search venues by name or address..."
                className="w-full"
                onSearch={handleSearch}
                showNearMe={false}
              />
            </div>
            <div className="flex items-center w-full md:w-auto">
              <label className="text-gray-700 dark:text-gray-300 mr-2">Sort by:</label>
              <select
                value={`${sortBy}-${sortDir}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-');
                  setSortBy(field);
                  setSortDir(direction as 'asc' | 'desc');
                }}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-base md:text-sm rounded-lg 
                           focus:ring-blue-500 focus:border-blue-500 block p-3 md:p-2.5 w-full md:w-auto
                           dark:bg-gray-700 dark:border-gray-600 dark:text-white touch-manipulation"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="capacity-desc">Capacity (High-Low)</option>
                <option value="capacity-asc">Capacity (Low-High)</option>
                <option value="prosper_rank-desc">Popularity (High-Low)</option>
              </select>
            </div>
          </div>
        </div>

        {filteredVenues.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-300">
              No venues found in this city.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredVenues.map(venue => (
                <Link 
                  href={`/venues/${venue.id}`} 
                  key={venue.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow touch-manipulation active:bg-gray-50 dark:active:bg-gray-700"
                >
                  <div className="h-48 md:h-40 bg-gray-200 dark:bg-gray-700 relative">
                    <Image
                      src="/file.svg"
                      alt={venue.name}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      priority={venue.prosper_rank > 0}
                    />
                    {venue.prosper_rank > 0 && (
                      <div className="absolute top-3 right-3 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm md:text-xs font-bold">
                        ★ {venue.prosper_rank}
                      </div>
                    )}
                  </div>
                  <div className="p-5 md:p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {venue.name}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-base md:text-sm mb-3">
                      {venue.address}
                    </p>
                    {venue.capacity && (
                      <p className="text-gray-500 dark:text-gray-400 text-base md:text-sm">
                        Capacity: {venue.capacity}
                      </p>
                    )}
                    <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400">
                      <span className="text-base md:text-sm">View Details</span>
                      <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex justify-center mt-8">
                <nav className="flex flex-wrap justify-center gap-2 md:inline-flex md:rounded-md md:shadow-sm md:-space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`relative inline-flex items-center justify-center px-3 py-3 md:px-2 md:py-2 rounded-md md:rounded-l-md border border-gray-300 bg-white text-base md:text-sm font-medium min-w-[44px] min-h-[44px] touch-manipulation ${
                      pagination.page === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50 active:bg-gray-100'
                    } dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page numbers - Show fewer on mobile */}
                  {Array.from({ length: Math.min(pagination.total_pages <= 3 ? pagination.total_pages : 3, pagination.total_pages) }, (_, i) => {
                    // Show pages around current page
                    let pageNum;
                    if (pagination.total_pages <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page === 1) {
                      pageNum = i + 1;
                    } else if (pagination.page === pagination.total_pages) {
                      pageNum = pagination.total_pages - 2 + i;
                    } else {
                      pageNum = pagination.page - 1 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center justify-center px-4 py-3 md:py-2 border text-base md:text-sm font-medium min-w-[44px] min-h-[44px] touch-manipulation ${
                          pagination.page === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 active:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
                        } rounded-md md:rounded-none`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  {/* Show ellipsis if there are more pages */}
                  {pagination.total_pages > 3 && pagination.page < pagination.total_pages - 1 && (
                    <span className="relative inline-flex items-center justify-center px-4 py-3 md:py-2 border border-gray-300 bg-white text-base md:text-sm text-gray-700 min-w-[44px] min-h-[44px] rounded-md md:rounded-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400">
                      ...
                    </span>
                  )}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.total_pages}
                    className={`relative inline-flex items-center justify-center px-3 py-3 md:px-2 md:py-2 rounded-md md:rounded-r-md border border-gray-300 bg-white text-base md:text-sm font-medium min-w-[44px] min-h-[44px] touch-manipulation ${
                      pagination.page === pagination.total_pages
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50 active:bg-gray-100'
                    } dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}