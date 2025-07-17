import { GET } from '../route';
import { NextRequest } from 'next/server';
import { ArtistRepository } from '@/lib/repositories/artist-repository';

// Mock the artist repository
jest.mock('@/lib/repositories/artist-repository');

const mockArtistRepository = ArtistRepository as jest.MockedClass<typeof ArtistRepository>;

describe('/api/artists/[artist]', () => {
  let mockFindByIdWithMedia: jest.Mock;
  let mockFindByName: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindByIdWithMedia = jest.fn();
    mockFindByName = jest.fn();
    
    mockArtistRepository.prototype.findByIdWithMedia = mockFindByIdWithMedia;
    mockArtistRepository.prototype.findByName = mockFindByName;
  });

  const mockArtist = {
    id: 1,
    name: 'Test Artist',
    genres: ['rock', 'indie'],
    photo_url: 'https://example.com/photo.jpg',
    profile_bio: 'Test bio',
    created_at: new Date(),
    updated_at: new Date(),
    media: [
      {
        id: 1,
        type: 'photo' as const,
        url: 'https://example.com/photo1.jpg',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]
  };

  it('should return artist by ID', async () => {
    mockFindByIdWithMedia.mockResolvedValue(mockArtist);

    const request = new NextRequest('http://localhost/api/artists/1');
    const response = await GET(request, { params: { artist: '1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockArtist);
    expect(mockFindByIdWithMedia).toHaveBeenCalledWith(1);
  });

  it('should return artist by name', async () => {
    mockFindByName.mockResolvedValue({ id: 1, name: 'Test Artist' });
    mockFindByIdWithMedia.mockResolvedValue(mockArtist);

    const request = new NextRequest('http://localhost/api/artists/Test%20Artist');
    const response = await GET(request, { params: { artist: 'Test%20Artist' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockArtist);
    expect(mockFindByName).toHaveBeenCalledWith('Test Artist');
    expect(mockFindByIdWithMedia).toHaveBeenCalledWith(1);
  });

  it('should return 404 when artist not found', async () => {
    mockFindByIdWithMedia.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/artists/999');
    const response = await GET(request, { params: { artist: '999' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('ARTIST_NOT_FOUND');
  });

  it('should handle database errors', async () => {
    mockFindByIdWithMedia.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/artists/1');
    const response = await GET(request, { params: { artist: '1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});