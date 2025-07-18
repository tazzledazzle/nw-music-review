'use client';

import { useState, useEffect } from 'react';
import { Artist, Event, Media } from '@/lib/models/types';
import { ArtistHeader } from './ArtistHeader';
import { MediaCarousel } from './MediaCarousel';
import { UpcomingShows } from './UpcomingShows';

interface ArtistProfileProps {
  artist: Artist;
}

export function ArtistProfile({ artist }: ArtistProfileProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [media, setMedia] = useState<{ photos: Media[]; videos: Media[] }>({ photos: [], videos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArtistData() {
      try {
        setLoading(true);
        
        // Fetch events and media in parallel
        const [eventsResponse, mediaResponse] = await Promise.all([
          fetch(`/api/artists/${artist.id}/events`),
          fetch(`/api/artists/${artist.id}/media`)
        ]);

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setEvents(eventsData.events || []);
        }

        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json();
          setMedia(mediaData.media || { photos: [], videos: [] });
        }
      } catch (err) {
        console.error('Error fetching artist data:', err);
        setError('Failed to load artist data');
      } finally {
        setLoading(false);
      }
    }

    fetchArtistData();
  }, [artist.id]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Artist Header */}
      <ArtistHeader artist={artist} />

      {/* Media Section */}
      {(media.photos.length > 0 || media.videos.length > 0) && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Photos & Videos
          </h2>
          <MediaCarousel photos={media.photos} videos={media.videos} />
        </section>
      )}

      {/* Upcoming Shows Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Upcoming Shows
        </h2>
        <UpcomingShows events={events} loading={loading} />
      </section>
    </div>
  );
}