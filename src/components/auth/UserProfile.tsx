/**
 * User profile component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/auth-context';
import { apiClient } from '../../lib/api-client';

export default function UserProfile() {
  const { user, logout } = useAuth();
  const [favorites, setFavorites] = useState<{ venues: number[]; artists: number[]; total: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const userFavorites = await apiClient.getFavorites();
      setFavorites(userFavorites);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.updateProfile(editName.trim() || undefined);
      setIsEditing(false);
      // Note: In a real app, you might want to refresh the user data in the context
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-500">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Your Profile</h1>
              <p className="text-blue-100">Manage your account and preferences</p>
            </div>
            <button
              onClick={logout}
              className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              
              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(user.name || '');
                        setError(null);
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Name:</span>
                    <p className="text-gray-900">{user.name || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Email:</span>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Member since:</span>
                    <p className="text-gray-900">{formatDate(user.created_at)}</p>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </div>

            {/* Favorites */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Favorites</h2>
              {favorites ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-medium text-gray-900">Venues</h3>
                    <p className="text-2xl font-bold text-blue-600">{favorites.venues.length}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-medium text-gray-900">Artists</h3>
                    <p className="text-2xl font-bold text-green-600">{favorites.artists.length}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading favorites...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
