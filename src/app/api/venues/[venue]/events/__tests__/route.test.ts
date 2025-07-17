import { GET } from '../route';
import { EventRepository } from '@/lib/repositories/event-repository';
import { NextRequest } from 'next/server';
import { vi } from 'vitest';

// Mock the EventRepository
vi.mock('@/lib/repositories/event-repository');
const MockedEventRepository = EventRepository as any;

describe('/api/venues/[venue]/events', () => {
  let mockEventRepo: any;

  beforeEach(() => {
    mockEventRepo = {
      findByVenueId: vi.fn(),
    };
    MockedEventRepository.mockImplementation(() => mockEventRepo);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return events for a valid venue ID', async () => {
      const mockEvents = {
        data: [
          {
            id: 1,
            venue_id: 123,
            title: 'Test Concert',
            description: 'A great show',
            event_datetime: new Date('2024-12-25T20:00:00Z'),
            ticket_url: 'https://tickets.example.com',
            external_id: 'ext123',
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1
      };

      mockEventRepo.findByVenueId.mockResolvedValue(mockEvents);

      const request = new NextRequest('http://localhost:3000/api/venues/123/events');
      const response = await GET(request, { params: { venue: '123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events).toHaveLength(1);
      expect(data.events[0].title).toBe('Test Concert');
      expect(data.pagination.total).toBe(1);
      expect(mockEventRepo.findByVenueId).toHaveBeenCalledWith(123, {
        page: 1,
        limit: 20,
        start_date: undefined,
        end_date: undefined
      });
    });

    it('should handle date filtering parameters', async () => {
      const mockEvents = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0
      };

      mockEventRepo.findByVenueId.mockResolvedValue(mockEvents);

      const request = new NextRequest(
        'http://localhost:3000/api/venues/123/events?start_date=2024-01-01&end_date=2024-12-31&page=2&limit=10'
      );
      const response = await GET(request, { params: { venue: '123' } });

      expect(response.status).toBe(200);
      expect(mockEventRepo.findByVenueId).toHaveBeenCalledWith(123, {
        page: 2,
        limit: 10,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31')
      });
    });

    it('should return 400 for invalid venue ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/venues/invalid/events');
      const response = await GET(request, { params: { venue: 'invalid' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Venue ID must be a valid number');
    });

    it('should return 400 for missing venue parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/venues//events');
      const response = await GET(request, { params: { venue: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Venue parameter is required');
    });

    it('should return 400 for invalid date format', async () => {
      const request = new NextRequest('http://localhost:3000/api/venues/123/events?start_date=invalid-date');
      const response = await GET(request, { params: { venue: '123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid start_date format');
    });

    it('should return 400 when start_date is after end_date', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/venues/123/events?start_date=2024-12-31&end_date=2024-01-01'
      );
      const response = await GET(request, { params: { venue: '123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('start_date cannot be after end_date');
    });

    it('should cap limit at 100', async () => {
      const mockEvents = {
        data: [],
        total: 0,
        page: 1,
        limit: 100,
        total_pages: 0
      };

      mockEventRepo.findByVenueId.mockResolvedValue(mockEvents);

      const request = new NextRequest('http://localhost:3000/api/venues/123/events?limit=200');
      const response = await GET(request, { params: { venue: '123' } });

      expect(mockEventRepo.findByVenueId).toHaveBeenCalledWith(123, {
        page: 1,
        limit: 100,
        start_date: undefined,
        end_date: undefined
      });
    });

    it('should handle repository errors', async () => {
      mockEventRepo.findByVenueId.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/venues/123/events');
      const response = await GET(request, { params: { venue: '123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch venue events');
      expect(data.details).toBe('Database error');
    });
  });
});