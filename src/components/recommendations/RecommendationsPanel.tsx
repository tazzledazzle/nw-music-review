import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Artist, Venue, Event } from '@/lib/models/types';
import { formatDate } from '@/lib/utils/date-utils';

interface RecommendationsPanelProps {
  userId: number;
  limit?: number;
}

interface RecommendationsData {
  venues: (Venue & { score: number })[];
  artists: (Artist & { score: number })[];
  events: (Event & { score: number })[];
}

/**
 * Component to display personalized recommendations for a user
 */
export default function RecommendationsPanel({ userId, limit = 3 }: RecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'venues' | 'artists' | 'events'>('venues');

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}/recommendations?limit=${limit}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }
        
        const data = await response.json();
        setRecommendations(data);
        setError(null);
      } catch (err) {
        setError('Unable to load recommendations');
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId, limit]);

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recommended For You</h2>
        <div className="flex justify-center items-center h-40">
          <div className="animate-pulse text-gray-400">Loading recommendations...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recommended For You</h2>
        <div className="bg-red-50 p-4 rounded-md text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (!recommendations || 
      (recommendations.venues.length === 0 && 
       recommendations.artists.length === 0 && 
       recommendations.events.length === 0)) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recommended For You</h2>
        <p className="text-gray-500 text-center py-8">
          Add some favorites to get personalized recommendations!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Recommended For You</h2>
        <p className="text-sm text-gray-500 mt-1">
          Based on your favorites and browsing history
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-2 px-4 text-center ${
            activeTab === 'venues' 
              ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('venues')}
        >
          Venues
          {recommendations.venues.length > 0 && (
            <span className="ml-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
              {recommendations.venues.length}
            </span>
          )}
        </button>
        <button
          className={`flex-1 py-2 px-4 text-center ${
            activeTab === 'artists' 
              ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('artists')}
        >
          Artists
          {recommendations.artists.length > 0 && (
            <span className="ml-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
              {recommendations.artists.length}
            </span>
          )}
        </button>
        <button
          className={`flex-1 py-2 px-4 text-center ${
            activeTab === 'events' 
              ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('events')}
        >
          Events
          {recommendations.events.length > 0 && (
            <span className="ml-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
              {recommendations.events.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'venues' && (
          <div className="space-y-4">
            {recommendations.venues.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No venue recommendations yet</p>
            ) : (
              recommendations.venues.map((venue) => (
                <Link 
                  href={`/venues/${venue.id}`} 
                  key={venue.id}
                  className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{venue.name}</h3>
                      <p className="text-sm text-gray-500">
                        {venue.city?.name}, {venue.city?.state_province}
                      </p>
                      {venue.capacity && (
                        <p className="text-xs text-gray-400 mt-1">
                          Capacity: {venue.capacity}
                        </p>
                      )}
                    </div>
                    <div className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded">
                      Match Score: {venue.score.toFixed(1)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'artists' && (
          <div className="space-y-4">
            {recommendations.artists.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No artist recommendations yet</p>
            ) : (
              recommendations.artists.map((artist) => (
                <Link 
                  href={`/artists/${artist.id}`} 
                  key={artist.id}
                  className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{artist.name}</h3>
                      {artist.genres && artist.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {artist.genres.slice(0, 3).map((genre) => (
                            <span 
                              key={genre} 
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                            >
                              {genre}
                            </span>
                          ))}
                          {artist.genres.length > 3 && (
                            <span className="text-xs text-gray-400">+{artist.genres.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded">
                      Match Score: {artist.score.toFixed(1)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            {recommendations.events.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No event recommendations yet</p>
            ) : (
              recommendations.events.map((event) => (
                <Link 
                  href={`/events/${event.id}`} 
                  key={event.id}
                  className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-500">
                        {event.venue?.name} • {formatDate(new Date(event.event_datetime))}
                      </p>
                      {event.artists && event.artists.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {event.artists.map(a => a.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded">
                      Match Score: {event.score.toFixed(1)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t">
        <Link 
          href={`/users/${userId}/recommendations`}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View all recommendations →
        </Link>
      </div>
    </div>
  );
}