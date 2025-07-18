import { Suspense } from 'react';
import SearchInput from '@/components/search/SearchInput';
import SearchResults from '@/components/search/SearchResults';

interface SearchPageProps {
  searchParams: {
    q?: string;
    type?: string;
    page?: string;
    [key: string]: string | undefined;
  };
}

// Loading component for search results
function SearchResultsLoading() {
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

// Search results wrapper component
function SearchResultsWrapper({ searchParams }: { searchParams: SearchPageProps['searchParams'] }) {
  const query = searchParams.q || '';
  const type = searchParams.type || 'all';

  if (!query) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Search Venue Explorer
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Find venues, artists, and events across the Pacific Northwest
          </p>
          <SearchInput 
            placeholder="Search venues, artists, or events..."
            autoFocus
            className="w-full"
          />
        </div>
      </div>
    );
  }

  return <SearchResults query={query} type={type} />;
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto">
            <SearchInput 
              placeholder="Search venues, artists, or events..."
              className="w-full"
            />
          </div>
        </div>

        {/* Search Results */}
        <Suspense fallback={<SearchResultsLoading />}>
          <SearchResultsWrapper searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Search - Venue Explorer',
  description: 'Search for venues, artists, and events across Washington, Oregon, Idaho, and British Columbia',
};