import { notFound } from 'next/navigation';
import { ArtistProfile } from '@/components/artist/ArtistProfile';
import { Artist } from '@/lib/models/types';

interface ArtistPageProps {
  params: {
    artist: string;
  };
}

async function getArtist(artistParam: string): Promise<Artist | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/artists/${encodeURIComponent(artistParam)}`, {
      cache: 'no-store' // Ensure fresh data
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching artist:', error);
    return null;
  }
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const artist = await getArtist(params.artist);

  if (!artist) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ArtistProfile artist={artist} />
    </div>
  );
}

export async function generateMetadata({ params }: ArtistPageProps) {
  const artist = await getArtist(params.artist);

  if (!artist) {
    return {
      title: 'Artist Not Found',
    };
  }

  return {
    title: `${artist.name} - Venue Explorer`,
    description: artist.profile_bio || `Discover upcoming shows and media for ${artist.name}`,
    openGraph: {
      title: artist.name,
      description: artist.profile_bio || `Discover upcoming shows and media for ${artist.name}`,
      images: artist.photo_url ? [artist.photo_url] : [],
    },
  };
}