import { GET } from '../route';
import { NextRequest } from 'next/server';
import { ArtistRepository } from '@/lib/repositories/artist-repository';

// Mock the artist repository
jest.mock('@/lib/repositories/artist-repository');

const mockArtistRepository = ArtistRepository as jest.MockedClass<typeof ArtistRepository>;

describe('/api/artists/[artist]/events', () => {
  let mockFindUpcomingEvents: jest.Mock;
  let mockFindByName: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUpcomingEvents = jest.fn();
    mockFindByName = jest.fn();
    
    mockArtistRepository.prototype.findUpcomingEvents = mockFindUpcomingEvents;
    mockArtistRepository.prototype.findByName = mockFindByName;
  });

  const mockEvents = [
    {
      id: 1,
      title: 'Test Concert',
      description: 'A great show',
      event_datetime: new Date('2024-12-01T20:00:00Z'),
      ticket_url: 'https://tickets.com/1',
      venue: {
        id: 1,
        name: 'Test Venue',
        address: '123 Main St',
        city: {
          name: 'Seattle',
          state_province: 'WA',
          country: 'US'
        }
      }
    }
  ];

  it('should return events for artist by ID', async () => {
    mockFindUpcomingEvents.mockResolvedValue(mockEvents);

    const request = new NextRequest('http://localhost/api/artists/1/events');
    const response = await GET(request, { params: { artist: '1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.artist_id).toBe(1);
    expect(data.events).toEqual(mockEvents);
    expect(data.total).toBe(1);
    expect(mockFindUpcomingEvents).toHaveBeenCalledWith(1, {});
  });

  it('should return events for artist by name', async () => {
    mockFindByName.mockResolvedValue({ id: 1, name: 'Test Artist' });
    mockFindUpcomingEvents.mockResolvedValue(mockEvents);

    const request = new NextRequest('http://localhost/api/artists/Test%20Artist/events');
    const response = await GET(request, { params: { artist: 'Test%20Artist' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.artist_id).toBe(1);
    expect(data.events).toEqual(mockEvents);
    expect(mockFindByName).toHaveBeenCalledWith('Test Artist');
    expect(mockFindUpcomingEvents).toHaveBeenCalledWith(1, {});
  });

  it('should handle query parameters', async () => {
    mockFindUpcomingEvents.mockResolvedValue(mockEvents);

    const request = new NextRequest('http://localhost/api/artists/1/events?start_date=2024-01-01&limit=10&page=2');
    const response = await GET(request, { params: { artist: '1' } });

    expect(response.status).toBe(200);
    expect(mockFindUpcomingEvents).toHaveBeenCalledWith(1, {
      start_date: new Date('2024-01-01'),
      limit: 10,
      page: 2
    });
  });

  it('should return 404 when artist not found by name', async () => {
    mockFindByName.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/artists/Unknown%20Artist/events');
    const response = await GET(request, { params: { artist: 'Unknown%20Artist' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('ARTIST_NOT_FOUND');
  });

  it('should handle database errors', async () => {
    mockFindUpcomingEvents.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/artists/1/events');
    const response = await GET(request, { params: { artist: '1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});