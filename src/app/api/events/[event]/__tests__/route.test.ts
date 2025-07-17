import { GET } from '../route';
import { EventRepository } from '@/lib/repositories/event-repository';
import { NextRequest } from 'next/server';
import { vi } from 'vitest';

// Mock the EventRepository
vi.mock('@/lib/repositories/event-repository');
const MockedEventRepository = EventRepository as any;

describe('/api/events/[event]', () => {
  let mockEventRepo: any;

  beforeEach(() => {
    mockEventRepo = {
      findByIdWithDetails: vi.fn(),
    };
    MockedEventRepository.mockImplementation(() => mockEventRepo);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return event details for a valid event ID', async () => {
      const mockEvent = {
        id: 1,
        venue_id: 123,
        title: 'Test Concert',
        description: 'A great show',
        event_datetime: new Date('2025-12-25T20:00:00Z'),
        ticket_url: 'https://tickets.example.com',
        external_id: 'ext123',
        created_at: new Date(),
        updated_at: new Date(),
        venue: {
          id: 123,
          name: 'Test Venue',
          address: '123 Main St',
          capacity: 500,
          website: 'https://venue.example.com',
          city_id: 1,
          coordinates: { x: -122.4194, y: 37.7749 },
          prosper_rank: 5,
          created_at: new Date(),
          updated_at: new Date(),
          city: {
            id: 1,
            name: 'San Francisco',
            state_province: 'CA',
            country: 'US',
            coordinates: { x: -122.4194, y: 37.7749 },
            created_at: new Date(),
            updated_at: new Date()
          }
        },
        artists: [
          {
            id: 1,
            name: 'Test Artist',
            genres: ['rock', 'indie'],
            photo_url: 'https://example.com/photo.jpg',
            profile_bio: 'A great artist'
          }
        ]
      };

      mockEventRepo.findByIdWithDetails.mockResolvedValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/events/1');
      const response = await GET(request, { params: { event: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.event.title).toBe('Test Concert');
      expect(data.event.venue.name).toBe('Test Venue');
      expect(data.event.artists).toHaveLength(1);
      expect(data.event.artists[0].name).toBe('Test Artist');
      expect(data.event.status).toBe('upcoming');
      expect(data.event.formatted_date).toBeDefined();
      expect(data.event.formatted_time).toBeDefined();
      expect(mockEventRepo.findByIdWithDetails).toHaveBeenCalledWith(1);
    });

    it('should return correct status for past events', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2); // 2 days ago

      const mockEvent = {
        id: 1,
        venue_id: 123,
        title: 'Past Concert',
        description: 'A past show',
        event_datetime: pastDate,
        ticket_url: null,
        external_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        venue: {
          id: 123,
          name: 'Test Venue',
          address: '123 Main St',
          capacity: 500,
          website: null,
          city_id: 1,
          coordinates: { x: -122.4194, y: 37.7749 },
          prosper_rank: 5,
          created_at: new Date(),
          updated_at: new Date(),
          city: {
            id: 1,
            name: 'San Francisco',
            state_province: 'CA',
            country: 'US',
            coordinates: { x: -122.4194, y: 37.7749 },
            created_at: new Date(),
            updated_at: new Date()
          }
        },
        artists: []
      };

      mockEventRepo.findByIdWithDetails.mockResolvedValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/events/1');
      const response = await GET(request, { params: { event: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.event.status).toBe('past');
    });

    it('should return correct status for events today', async () => {
      const todayDate = new Date();
      todayDate.setHours(todayDate.getHours() + 2); // 2 hours from now

      const mockEvent = {
        id: 1,
        venue_id: 123,
        title: 'Today Concert',
        description: 'A show today',
        event_datetime: todayDate,
        ticket_url: null,
        external_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        venue: {
          id: 123,
          name: 'Test Venue',
          address: '123 Main St',
          capacity: 500,
          website: null,
          city_id: 1,
          coordinates: { x: -122.4194, y: 37.7749 },
          prosper_rank: 5,
          created_at: new Date(),
          updated_at: new Date(),
          city: {
            id: 1,
            name: 'San Francisco',
            state_province: 'CA',
            country: 'US',
            coordinates: { x: -122.4194, y: 37.7749 },
            created_at: new Date(),
            updated_at: new Date()
          }
        },
        artists: []
      };

      mockEventRepo.findByIdWithDetails.mockResolvedValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/events/1');
      const response = await GET(request, { params: { event: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.event.status).toBe('today');
    });

    it('should return correct status for ongoing events', async () => {
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 2); // 2 hours ago

      const mockEvent = {
        id: 1,
        venue_id: 123,
        title: 'Ongoing Concert',
        description: 'A show happening now',
        event_datetime: recentDate,
        ticket_url: null,
        external_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        venue: {
          id: 123,
          name: 'Test Venue',
          address: '123 Main St',
          capacity: 500,
          website: null,
          city_id: 1,
          coordinates: { x: -122.4194, y: 37.7749 },
          prosper_rank: 5,
          created_at: new Date(),
          updated_at: new Date(),
          city: {
            id: 1,
            name: 'San Francisco',
            state_province: 'CA',
            country: 'US',
            coordinates: { x: -122.4194, y: 37.7749 },
            created_at: new Date(),
            updated_at: new Date()
          }
        },
        artists: []
      };

      mockEventRepo.findByIdWithDetails.mockResolvedValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/events/1');
      const response = await GET(request, { params: { event: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.event.status).toBe('ongoing');
    });

    it('should return 404 for non-existent event', async () => {
      mockEventRepo.findByIdWithDetails.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/events/999');
      const response = await GET(request, { params: { event: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No event found with ID: 999');
    });

    it('should return 400 for invalid event ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/events/invalid');
      const response = await GET(request, { params: { event: 'invalid' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Event ID must be a valid number');
    });

    it('should return 400 for missing event parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/events/');
      const response = await GET(request, { params: { event: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Event parameter is required');
    });

    it('should handle repository errors', async () => {
      mockEventRepo.findByIdWithDetails.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/events/1');
      const response = await GET(request, { params: { event: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch event');
      expect(data.details).toBe('Database error');
    });
  });
});