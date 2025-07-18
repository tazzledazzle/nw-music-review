import { Suspense } from 'react';
import SearchInput from '@/components/search/SearchInput';
import SearchResults from '@/components/search/SearchResults';

interface NearbySearchPageProps {
  searchParams: {
    lat?: string;
    lon?: string;
    radius?: string;
    q?: string;
    type?: string;
    [key: string]: string | undefined;
  };
}

// Loading component for nearby search results
function NearbySearchResultsLoading() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
      
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Nearby search results wrapper component
function NearbySearchResultsWrapper({ searchParams }: { searchParams: NearbySearchPageProps['searchParams'] }) {
  const lat = searchParams.lat ? parseFloat(searchParams.lat) : null;
  const lon = searchParams.lon ? parseFloat(searchParams.lon) : null;
  const radius = searchParams.radius ? parseInt(searchParams.radius) : 25;
  const query = searchParams.q || '';
  const type = searchParams.type || 'all';

  // Validate coordinates
  if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Location Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We need your location to show nearby venues and events.
          </p>
          <SearchInput 
            placeholder="Search venues, artists, or events..."
            showNearMe={true}
            className="w-full"
          />
        </div>
      </div>
    );
  }

  // Validate coordinates are within supported regions (Pacific Northwest)
  const isInRegion = (
    lat >= 42.0 && lat <= 60.0 && // Latitude range
    lon >= -139.0 && lon <= -110.0 // Longitude range
  );

  if (!isInRegion) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Location Not Supported
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This service only covers Washington, Oregon, Idaho, and British Columbia.
          </p>
          <SearchInput 
            placeholder="Search venues, artists, or events..."
            showNearMe={true}
            className="w-full"
          />
        </div>
      </div>
    );
  }

  const location = { lat, lon, radius };

  return (
    <SearchResults 
      query={query} 
      type={type} 
      location={location}
    />
  );
}

export default function NearbySearchPage({ searchParams }: NearbySearchPageProps) {
  const radius = searchParams.radius ? parseInt(searchParams.radius) : 25;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Nearby Results
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Venues and events within {radius}km of your location
              </p>
            </div>
            <SearchInput 
              placeholder="Search nearby venues, artists, or events..."
              className="w-full"
              showNearMe={true}
            />
          </div>
        </div>

        {/* Radius Selector */}
        {searchParams.lat && searchParams.lon && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center space-x-2 bg-white dark:bg-gray-800 
                          rounded-lg shadow px-4 py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Search radius:</span>
              <select
                value={radius}
                onChange={(e) => {
                  const newRadius = e.target.value;
                  const url = new URL(window.location.href);
                  url.searchParams.set('radius', newRadius);
                  window.location.href = url.toString();
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm
                         bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="5">5km</option>
                <option value="10">10km</option>
                <option value="25">25km</option>
                <option value="50">50km</option>
                <option value="100">100km</option>
              </select>
            </div>
          </div>
        )}

        {/* Search Results */}
        <Suspense fallback={<NearbySearchResultsLoading />}>
          <NearbySearchResultsWrapper searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Nearby Search - Venue Explorer',
  description: 'Find venues, artists, and events near your location in the Pacific Northwest',
};