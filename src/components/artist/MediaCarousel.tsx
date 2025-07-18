'use client';

import { useState } from 'react';
import { Media } from '@/lib/models/types';
import Image from 'next/image';

interface MediaCarouselProps {
  photos: Media[];
  videos: Media[];
}

export function MediaCarousel({ photos, videos }: MediaCarouselProps) {
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const hasPhotos = photos.length > 0;
  const hasVideos = videos.length > 0;

  if (!hasPhotos && !hasVideos) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="text-gray-400 dark:text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <p className="text-lg font-medium">No media available</p>
          <p className="text-sm">Photos and videos will appear here when available</p>
        </div>
      </div>
    );
  }

  const currentMedia = activeTab === 'photos' ? photos : videos;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex">
          {hasPhotos && (
            <button
              onClick={() => {
                setActiveTab('photos');
                setSelectedIndex(0);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'photos'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Photos ({photos.length})
            </button>
          )}
          {hasVideos && (
            <button
              onClick={() => {
                setActiveTab('videos');
                setSelectedIndex(0);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'videos'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Videos ({videos.length})
            </button>
          )}
        </nav>
      </div>

      {/* Media Display */}
      <div className="p-6">
        {currentMedia.length > 0 && (
          <>
            {/* Main Media Display */}
            <div className="mb-6">
              {activeTab === 'photos' ? (
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <Image
                    src={currentMedia[selectedIndex].url}
                    alt={`Photo ${selectedIndex + 1}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                  />
                </div>
              ) : (
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <video
                    src={currentMedia[selectedIndex].url}
                    controls
                    className="w-full h-full object-contain"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {currentMedia.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {currentMedia.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedIndex(index)}
                    className={`flex-shrink-0 relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedIndex === index
                        ? 'border-blue-500'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    {activeTab === 'photos' ? (
                      <Image
                        src={item.url}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}