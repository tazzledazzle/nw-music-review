'use client';

import { Artist } from '@/lib/models/types';
import Image from 'next/image';

interface ArtistHeaderProps {
  artist: Artist;
}

export function ArtistHeader({ artist }: ArtistHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Artist Photo */}
        <div className="flex-shrink-0">
          {artist.photo_url ? (
            <div className="relative w-48 h-48 mx-auto md:mx-0">
              <Image
                src={artist.photo_url}
                alt={artist.name}
                fill
                className="rounded-lg object-cover"
                sizes="(max-width: 768px) 192px, 192px"
              />
            </div>
          ) : (
            <div className="w-48 h-48 mx-auto md:mx-0 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <div className="text-gray-400 dark:text-gray-500 text-center">
                <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <p className="text-sm">No photo</p>
              </div>
            </div>
          )}
        </div>

        {/* Artist Info */}
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {artist.name}
          </h1>

          {/* Genres */}
          {artist.genres && artist.genres.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {artist.genres.map((genre, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {artist.profile_bio && (
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {artist.profile_bio}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
            {artist.media && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <span>{artist.media.length} media items</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span>Member since {new Date(artist.created_at).getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}