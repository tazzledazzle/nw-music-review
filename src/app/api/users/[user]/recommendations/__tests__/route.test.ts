import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { RecommendationRepository } from '@/lib/repositories/recommendation-repository';
import { UserRepository } from '@/lib/repositories/user-repository';
import { authMiddleware } from '@/lib/auth/auth-middleware';

// Mock dependencies
vi.mock('@/lib/repositories/recommendation-repository', () => ({
  RecommendationRepository: vi.fn().mockImplementation(() => ({
    getAllRecommendations: vi.fn(),
    getRecommendedVenues: vi.fn(),
    getRecommendedArtists: vi.fn(),
    getRecommendedEvents: vi.fn()
  }))
}));

vi.mock('@/lib/repositories/user-repository', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findById: vi.fn()
  }))
}));

vi.mock('@/lib/auth/auth-middleware', () => ({
  authMiddleware: vi.fn()
}));

describe('Recommendations API', () => {
  const mockUser = {
    id: 123,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    email_verified: true,
    password_hash: 'hash',
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockRecommendations = {
    venues: [
      { id: 1, name: 'Venue 1', score: 5.5 },
      { id: 2, name: 'Venue 2', score: 4.2 }
    ],
    artists: [
      { id: 3, name: 'Artist 1', score: 6.7 },
      { id: 4, name: 'Artist 2', score: 3.8 }
    ],
    events: [
      { id: 5, title: 'Event 1', score: 7.2 },
      { id: 6, title: 'Event 2', score: 5.1 }
    ]
  };

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock auth middleware
    (authMiddleware as any).mockResolvedValue({
      isAuthenticated: true,
      user: mockUser
    });

    // Mock user repository
    const userRepoInstance = (UserRepository as any).mock.results[0]?.value || new (UserRepository as any)();
    userRepoInstance.findById.mockResolvedValue(mockUser);

    // Mock recommendation repository
    const recommendationRepoInstance = (RecommendationRepository as any).mock.results[0]?.value || new (RecommendationRepository as any)();
    recommendationRepoInstance.getAllRecommendations.mockResolvedValue(mockRecommendations);
    recommendationRepoInstance.getRecommendedVenues.mockResolvedValue(mockRecommendations.venues);
    recommendationRepoInstance.getRecommendedArtists.mockResolvedValue(mockRecommendations.artists);
    recommendationRepoInstance.getRecommendedEvents.mockResolvedValue(mockRecommendations.events);
  });

  it('should return all recommendations by default', async () => {
    const request = new NextRequest('http://localhost/api/users/123/recommendations');
    const response = await GET(request, { params: { user: '123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockRecommendations);
    expect(RecommendationRepository.prototype.getAllRecommendations).toHaveBeenCalledWith(123, 5);
  });

  it('should return venue recommendations when type=venues', async () => {
    const request = new NextRequest('http://localhost/api/users/123/recommendations?type=venues');
    const response = await GET(request, { params: { user: '123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ venues: mockRecommendations.venues });
    expect(RecommendationRepository.prototype.getRecommendedVenues).toHaveBeenCalledWith(123, 5);
  });

  it('should return artist recommendations when type=artists', async () => {
    const request = new NextRequest('http://localhost/api/users/123/recommendations?type=artists');
    const response = await GET(request, { params: { user: '123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ artists: mockRecommendations.artists });
    expect(RecommendationRepository.prototype.getRecommendedArtists).toHaveBeenCalledWith(123, 5);
  });

  it('should return event recommendations when type=events', async () => {
    const request = new NextRequest('http://localhost/api/users/123/recommendations?type=events');
    const response = await GET(request, { params: { user: '123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ events: mockRecommendations.events });
    expect(RecommendationRepository.prototype.getRecommendedEvents).toHaveBeenCalledWith(123, 5);
  });

  it('should respect the limit parameter', async () => {
    const request = new NextRequest('http://localhost/api/users/123/recommendations?limit=10');
    const response = await GET(request, { params: { user: '123' } });
    
    expect(response.status).toBe(200);
    expect(RecommendationRepository.prototype.getAllRecommendations).toHaveBeenCalledWith(123, 10);
  });

  it('should return 401 if not authenticated', async () => {
    vi.mocked(authMiddleware).mockResolvedValue({
      isAuthenticated: false,
      user: null
    });

    const request = new NextRequest('http://localhost/api/users/123/recommendations');
    const response = await GET(request, { params: { user: '123' } });
    
    expect(response.status).toBe(401);
  });

  it('should return 403 if requesting another user\'s recommendations', async () => {
    vi.mocked(authMiddleware).mockResolvedValue({
      isAuthenticated: true,
      user: { ...mockUser, id: 456 } // Different user ID
    });

    const request = new NextRequest('http://localhost/api/users/123/recommendations');
    const response = await GET(request, { params: { user: '123' } });
    
    expect(response.status).toBe(403);
  });

  it('should allow admins to access any user\'s recommendations', async () => {
    vi.mocked(authMiddleware).mockResolvedValue({
      isAuthenticated: true,
      user: { ...mockUser, id: 456, role: 'admin' } // Different user ID but admin role
    });

    const request = new NextRequest('http://localhost/api/users/123/recommendations');
    const response = await GET(request, { params: { user: '123' } });
    
    expect(response.status).toBe(200);
  });

  it('should return 404 if user not found', async () => {
    vi.mocked(UserRepository.prototype.findById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/users/123/recommendations');
    const response = await GET(request, { params: { user: '123' } });
    
    expect(response.status).toBe(404);
  });

  it('should return 400 if user ID is invalid', async () => {
    const request = new NextRequest('http://localhost/api/users/invalid/recommendations');
    const response = await GET(request, { params: { user: 'invalid' } });
    
    expect(response.status).toBe(400);
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(RecommendationRepository.prototype.getAllRecommendations).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/users/123/recommendations');
    const response = await GET(request, { params: { user: '123' } });
    
    expect(response.status).toBe(500);
  });
});