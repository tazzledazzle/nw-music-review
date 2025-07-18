/**
 * Tests for IngestionService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionService } from '../ingestion-service';
import { ExternalEvent } from '../types';

// Mock all the services and repositories
vi.mock('../songkick-service');
vi.mock('../bandsintown-service');
vi.mock('../ticketmaster-service');
vi.mock('../../repositories/venue-repository');
vi.mock('../../repositories/artist-repository');
vi.mock('../../repositories/event-repository');
vi.mock('../../repositories/city-repository');

import { SongkickService } from '../songkick-service';
import { BandsintownService } from '../bandsintown-service';
import { TicketmasterService } from '../ticketmaster-service';
import { VenueRepository } from '../../repositories/venue-repository';
import { ArtistRepository } from '../../repositories/artist-repository';
import { EventRepository } from '../../repositories/event-repository';
import { CityRepository } from '../../repositories/city-repository';

describe('IngestionService', () => {
  let ingestionService: IngestionService;
  let mockSongkickService: vi.Mocked<SongkickService>;
  let mockBandsintownService: vi.Mocked<BandsintownService>;
  let mockTicketmasterService: vi.Mocked<TicketmasterService>;
  let mockVenueRepository: vi.Mocked<VenueRepository>;
  let mockArtistRepository: vi.Mocked<ArtistRepository>;
  let mockEventRepository: vi.Mocked<EventRepository>;
  let mockCityRepository: vi.Mocked<CityRepository>;

  const mockExternalEvent: ExternalEvent = {
    id: 'event-123',
    title: 'Test Concert',
    description: 'A great show',
    datetime: new Date('2024-06-15T20:00:00Z'),
    venue: {
      id: 'venue-123',
      name: 'Test Venue',
      address: '123 Main St',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
      latitude: 47.6062,
      longitude: -122.3321,
      capacity: 500,
    },
    artists: [
      {
        id: 'artist-123',
        name: 'Test Artist',
        genres: ['rock'],
        imageUrl: 'https://images.example.com/artist.jpg',
      },
    ],
    ticketUrl: 'https://tickets.example.com',
    source: 'songkick',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocked services
    mockSongkickService = {
      searchEventsByLocation: vi.fn(),
      searchEventsByArtist: vi.fn(),
    } as any;

    mockBandsintownService = {
      searchEventsByLocation: vi.fn(),
      searchEventsByArtist: vi.fn(),
      getArtist: vi.fn(),
    } as any;

    mockTicketmasterService = {
      searchEventsByLocation: vi.fn(),
      searchEventsByArtist: vi.fn(),
    } as any;

    // Setup mocked repositories
    mockCityRepository = {
      findAll: vi.fn(),
      create: vi.fn(),
    } as any;

    mockVenueRepository = {
      findAll: vi.fn(),
      create: vi.fn(),
    } as any;

    mockArtistRepository = {
      findAll: vi.fn(),
      create: vi.fn(),
    } as any;

    mockEventRepository = {
      findAll: vi.fn(),
      create: vi.fn(),
      addArtistToEvent: vi.fn(),
    } as any;

    // Mock constructors
    vi.mocked(SongkickService).mockImplementation(() => mockSongkickService);
    vi.mocked(BandsintownService).mockImplementation(() => mockBandsintownService);
    vi.mocked(TicketmasterService).mockImplementation(() => mockTicketmasterService);
    vi.mocked(VenueRepository).mockImplementation(() => mockVenueRepository);
    vi.mocked(ArtistRepository).mockImplementation(() => mockArtistRepository);
    vi.mocked(EventRepository).mockImplementation(() => mockEventRepository);
    vi.mocked(CityRepository).mockImplementation(() => mockCityRepository);

    ingestionService = new IngestionService({
      songkickApiKey: 'songkick-key',
      bandsintownApiKey: 'bandsintown-key',
      ticketmasterApiKey: 'ticketmaster-key',
    });
  });

  describe('ingestEventsByLocation', () => {
    it('should successfully ingest events from all services', async () => {
      // Setup service responses
      mockSongkickService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [mockExternalEvent],
      });

      mockBandsintownService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [{ ...mockExternalEvent, id: 'event-124', source: 'bandsintown' }],
      });

      mockTicketmasterService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [{ ...mockExternalEvent, id: 'event-125', source: 'ticketmaster' }],
      });

      // Setup repository responses
      mockCityRepository.findAll.mockResolvedValue([]);
      mockCityRepository.create.mockResolvedValue({ id: 1, name: 'Seattle' } as any);

      mockVenueRepository.findAll.mockResolvedValue([]);
      mockVenueRepository.create.mockResolvedValue({ id: 1, name: 'Test Venue' } as any);

      mockArtistRepository.findAll.mockResolvedValue([]);
      mockArtistRepository.create.mockResolvedValue({ id: 1, name: 'Test Artist' } as any);

      mockEventRepository.findAll.mockResolvedValue([]);
      mockEventRepository.create.mockResolvedValue({ id: 1, title: 'Test Concert' } as any);
      mockEventRepository.addArtistToEvent.mockResolvedValue();

      const result = await ingestionService.ingestEventsByLocation({
        location: 'Seattle, WA',
      });

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(3);
      expect(result.venuesProcessed).toBe(3); // Each event creates a new venue
      expect(result.artistsProcessed).toBe(3); // Each event creates a new artist
      expect(result.errors).toHaveLength(0);

      // Verify all services were called
      expect(mockSongkickService.searchEventsByLocation).toHaveBeenCalledWith({
        location: 'Seattle, WA',
      });
      expect(mockBandsintownService.searchEventsByLocation).toHaveBeenCalledWith({
        location: 'Seattle, WA',
      });
      expect(mockTicketmasterService.searchEventsByLocation).toHaveBeenCalledWith({
        location: 'Seattle, WA',
      });
    });

    it('should handle service failures gracefully', async () => {
      // Setup one service to fail
      mockSongkickService.searchEventsByLocation.mockResolvedValue({
        success: false,
        error: 'API rate limit exceeded',
      });

      mockBandsintownService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [mockExternalEvent],
      });

      mockTicketmasterService.searchEventsByLocation.mockRejectedValue(
        new Error('Network timeout')
      );

      // Setup repository responses for successful event
      mockCityRepository.findAll.mockResolvedValue([]);
      mockCityRepository.create.mockResolvedValue({ id: 1, name: 'Seattle' } as any);
      mockVenueRepository.findAll.mockResolvedValue([]);
      mockVenueRepository.create.mockResolvedValue({ id: 1, name: 'Test Venue' } as any);
      mockArtistRepository.findAll.mockResolvedValue([]);
      mockArtistRepository.create.mockResolvedValue({ id: 1, name: 'Test Artist' } as any);
      mockEventRepository.findAll.mockResolvedValue([]);
      mockEventRepository.create.mockResolvedValue({ id: 1, title: 'Test Concert' } as any);
      mockEventRepository.addArtistToEvent.mockResolvedValue();

      const result = await ingestionService.ingestEventsByLocation({
        location: 'Seattle, WA',
      });

      expect(result.success).toBe(false); // Has errors
      expect(result.eventsProcessed).toBe(1); // Only Bandsintown succeeded
      expect(result.errors).toHaveLength(2); // Songkick and Ticketmaster errors
      expect(result.errors[0]).toContain('Songkick');
      expect(result.errors[1]).toContain('Ticketmaster');
    });

    it('should deduplicate events from different sources', async () => {
      const duplicateEvent = { ...mockExternalEvent, source: 'bandsintown' as const };

      mockSongkickService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [mockExternalEvent],
      });

      mockBandsintownService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [duplicateEvent], // Same event ID, different source
      });

      mockTicketmasterService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [],
      });

      // Setup repository responses
      mockCityRepository.findAll.mockResolvedValue([]);
      mockCityRepository.create.mockResolvedValue({ id: 1, name: 'Seattle' } as any);
      mockVenueRepository.findAll.mockResolvedValue([]);
      mockVenueRepository.create.mockResolvedValue({ id: 1, name: 'Test Venue' } as any);
      mockArtistRepository.findAll.mockResolvedValue([]);
      mockArtistRepository.create.mockResolvedValue({ id: 1, name: 'Test Artist' } as any);
      mockEventRepository.findAll.mockResolvedValue([]);
      mockEventRepository.create.mockResolvedValue({ id: 1, title: 'Test Concert' } as any);
      mockEventRepository.addArtistToEvent.mockResolvedValue();

      const result = await ingestionService.ingestEventsByLocation({
        location: 'Seattle, WA',
      });

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(2); // Both events processed (different sources)
    });

    it('should skip events not in target regions', async () => {
      const nonTargetEvent = {
        ...mockExternalEvent,
        venue: {
          ...mockExternalEvent.venue,
          state: 'CA', // California, not in target regions
        },
      };

      mockSongkickService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [nonTargetEvent],
      });

      mockBandsintownService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [],
      });

      mockTicketmasterService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await ingestionService.ingestEventsByLocation({
        location: 'Los Angeles, CA',
      });

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(0); // Event skipped
      expect(result.venuesProcessed).toBe(0);
      expect(result.artistsProcessed).toBe(0);
    });

    it('should reuse existing cities, venues, and artists', async () => {
      mockSongkickService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [mockExternalEvent],
      });

      mockBandsintownService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [],
      });

      mockTicketmasterService.searchEventsByLocation.mockResolvedValue({
        success: true,
        data: [],
      });

      // Setup existing entities
      mockCityRepository.findAll.mockResolvedValue([{ id: 1, name: 'Seattle' } as any]);
      mockVenueRepository.findAll.mockResolvedValue([{ id: 1, name: 'Test Venue' } as any]);
      mockArtistRepository.findAll.mockResolvedValue([{ id: 1, name: 'Test Artist' } as any]);
      mockEventRepository.findAll.mockResolvedValue([]);
      mockEventRepository.create.mockResolvedValue({ id: 1, title: 'Test Concert' } as any);
      mockEventRepository.addArtistToEvent.mockResolvedValue();

      const result = await ingestionService.ingestEventsByLocation({
        location: 'Seattle, WA',
      });

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
      expect(result.venuesProcessed).toBe(0); // Venue already existed
      expect(result.artistsProcessed).toBe(0); // Artist already existed

      // Verify create methods were not called for existing entities
      expect(mockCityRepository.create).not.toHaveBeenCalled();
      expect(mockVenueRepository.create).not.toHaveBeenCalled();
      expect(mockArtistRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('ingestEventsByArtist', () => {
    it('should successfully ingest events by artist', async () => {
      mockSongkickService.searchEventsByArtist.mockResolvedValue({
        success: true,
        data: [mockExternalEvent],
      });

      mockBandsintownService.searchEventsByArtist.mockResolvedValue({
        success: true,
        data: [],
      });

      mockTicketmasterService.searchEventsByArtist.mockResolvedValue({
        success: true,
        data: [],
      });

      // Setup repository responses
      mockCityRepository.findAll.mockResolvedValue([]);
      mockCityRepository.create.mockResolvedValue({ id: 1, name: 'Seattle' } as any);
      mockVenueRepository.findAll.mockResolvedValue([]);
      mockVenueRepository.create.mockResolvedValue({ id: 1, name: 'Test Venue' } as any);
      mockArtistRepository.findAll.mockResolvedValue([]);
      mockArtistRepository.create.mockResolvedValue({ id: 1, name: 'Test Artist' } as any);
      mockEventRepository.findAll.mockResolvedValue([]);
      mockEventRepository.create.mockResolvedValue({ id: 1, title: 'Test Concert' } as any);
      mockEventRepository.addArtistToEvent.mockResolvedValue();

      const result = await ingestionService.ingestEventsByArtist('Test Artist');

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);

      // Verify all services were called with artist name
      expect(mockSongkickService.searchEventsByArtist).toHaveBeenCalledWith('Test Artist', {});
      expect(mockBandsintownService.searchEventsByArtist).toHaveBeenCalledWith('Test Artist', {});
      expect(mockTicketmasterService.searchEventsByArtist).toHaveBeenCalledWith('Test Artist', {});
    });

    it('should pass search parameters to services', async () => {
      mockSongkickService.searchEventsByArtist.mockResolvedValue({
        success: true,
        data: [],
      });

      mockBandsintownService.searchEventsByArtist.mockResolvedValue({
        success: true,
        data: [],
      });

      mockTicketmasterService.searchEventsByArtist.mockResolvedValue({
        success: true,
        data: [],
      });

      const searchParams = {
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
        limit: 100,
      };

      await ingestionService.ingestEventsByArtist('Test Artist', searchParams);

      expect(mockSongkickService.searchEventsByArtist).toHaveBeenCalledWith(
        'Test Artist',
        searchParams
      );
      expect(mockBandsintownService.searchEventsByArtist).toHaveBeenCalledWith(
        'Test Artist',
        searchParams
      );
      expect(mockTicketmasterService.searchEventsByArtist).toHaveBeenCalledWith(
        'Test Artist',
        searchParams
      );
    });
  });

  describe('initialization', () => {
    it('should initialize only with provided API keys', () => {
      // Clear previous mocks
      vi.clearAllMocks();
      
      const partialService = new IngestionService({
        songkickApiKey: 'songkick-key',
        // No Bandsintown or Ticketmaster keys
      });

      expect(SongkickService).toHaveBeenCalledWith('songkick-key');
      expect(BandsintownService).not.toHaveBeenCalled();
      expect(TicketmasterService).not.toHaveBeenCalled();
    });

    it('should work with no API keys provided', () => {
      // Clear previous mocks
      vi.clearAllMocks();
      
      const emptyService = new IngestionService({});

      expect(SongkickService).not.toHaveBeenCalled();
      expect(BandsintownService).not.toHaveBeenCalled();
      expect(TicketmasterService).not.toHaveBeenCalled();
    });
  });
});