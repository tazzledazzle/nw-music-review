import { FavoritesRepository } from '../favorites-repository';
import { QueryBuilder } from '../../db/query-builder';

// Mock the QueryBuilder
jest.mock('../../db/query-builder');

describe('FavoritesRepository', () => {
  let favoritesRepository: FavoritesRepository;
  
  beforeEach(() => {
    jest.clearAllMocks();
    favoritesRepository = new FavoritesRepository();
  });
  
  describe('addFavorite', () => {
    it('should add a favorite successfully', async () => {
      const mockFavorite = {
        user_id: 1,
        entity_type: 'venue',
        entity_id: 2,
        created_at: new Date(),
      };
      
      // Mock the insert method
      (QueryBuilder.prototype.insert as jest.Mock).mockResolvedValue(mockFavorite);
      
      const result = await favoritesRepository.addFavorite(1, 'venue', 2);
      
      expect(QueryBuilder.prototype.insert).toHaveBeenCalledWith({
        user_id: 1,
        entity_type: 'venue',
        entity_id: 2,
      });
      expect(result).toEqual(mockFavorite);
    });
    
    it('should handle duplicate favorites', async () => {
      const mockFavorite = {
        user_id: 1,
        entity_type: 'venue',
        entity_id: 2,
        created_at: new Date(),
      };
      
      // Mock the insert method to throw a duplicate key error
      const error = new Error('Duplicate key');
      (error as any).code = '23505';
      (QueryBuilder.prototype.insert as jest.Mock).mockRejectedValue(error);
      
      // Mock the getFavorite method
      (favoritesRepository.getFavorite as jest.Mock) = jest.fn().mockResolvedValue(mockFavorite);
      
      const result = await favoritesRepository.addFavorite(1, 'venue', 2);
      
      expect(favoritesRepository.getFavorite).toHaveBeenCalledWith(1, 'venue', 2);
      expect(result).toEqual(mockFavorite);
    });
  });
  
  describe('removeFavorite', () => {
    it('should remove a favorite successfully', async () => {
      // Mock the raw method
      (QueryBuilder.raw as jest.Mock).mockResolvedValue({ rowCount: 1 });
      
      const result = await favoritesRepository.removeFavorite(1, 'venue', 2);
      
      expect(QueryBuilder.raw).toHaveBeenCalledWith(
        'DELETE FROM user_favorites WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3',
        [1, 'venue', 2]
      );
      expect(result).toBe(true);
    });
    
    it('should return false if favorite not found', async () => {
      // Mock the raw method
      (QueryBuilder.raw as jest.Mock).mockResolvedValue({ rowCount: 0 });
      
      const result = await favoritesRepository.removeFavorite(1, 'venue', 2);
      
      expect(result).toBe(false);
    });
  });
  
  describe('getFavorite', () => {
    it('should get a favorite successfully', async () => {
      const mockFavorite = {
        user_id: 1,
        entity_type: 'venue',
        entity_id: 2,
        created_at: new Date(),
      };
      
      // Mock the where and executeSingle methods
      (QueryBuilder.prototype.where as jest.Mock).mockReturnThis();
      (QueryBuilder.prototype.executeSingle as jest.Mock).mockResolvedValue(mockFavorite);
      
      const result = await favoritesRepository.getFavorite(1, 'venue', 2);
      
      expect(QueryBuilder.prototype.where).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockFavorite);
    });
    
    it('should return null if favorite not found', async () => {
      // Mock the where and executeSingle methods
      (QueryBuilder.prototype.where as jest.Mock).mockReturnThis();
      (QueryBuilder.prototype.executeSingle as jest.Mock).mockResolvedValue(null);
      
      const result = await favoritesRepository.getFavorite(1, 'venue', 2);
      
      expect(result).toBeNull();
    });
  });
  
  describe('getUserFavorites', () => {
    it('should get all user favorites', async () => {
      const mockFavorites = {
        data: [
          { user_id: 1, entity_type: 'venue', entity_id: 2 },
          { user_id: 1, entity_type: 'artist', entity_id: 3 },
        ],
        total: 2,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      
      // Mock the where, orderBy, and executePaginated methods
      (QueryBuilder.prototype.where as jest.Mock).mockReturnThis();
      (QueryBuilder.prototype.orderBy as jest.Mock).mockReturnThis();
      (QueryBuilder.prototype.executePaginated as jest.Mock).mockResolvedValue(mockFavorites);
      
      const result = await favoritesRepository.getUserFavorites(1);
      
      expect(QueryBuilder.prototype.where).toHaveBeenCalledWith('user_id = $1', 1);
      expect(QueryBuilder.prototype.orderBy).toHaveBeenCalledWith('created_at', 'DESC');
      expect(result).toEqual(mockFavorites);
    });
    
    it('should filter by entity type if provided', async () => {
      // Mock the where, orderBy, and executePaginated methods
      (QueryBuilder.prototype.where as jest.Mock).mockReturnThis();
      (QueryBuilder.prototype.orderBy as jest.Mock).mockReturnThis();
      (QueryBuilder.prototype.executePaginated as jest.Mock).mockResolvedValue({ data: [] });
      
      await favoritesRepository.getUserFavorites(1, 'venue');
      
      expect(QueryBuilder.prototype.where).toHaveBeenCalledWith('entity_type = $2', 'venue');
    });
  });
  
  describe('getUserFavoriteVenues', () => {
    it('should get user favorite venues with details', async () => {
      const mockVenues = {
        data: [
          { id: 2, name: 'Venue 1' },
          { id: 3, name: 'Venue 2' },
        ],
        total: 2,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      
      // Mock the raw method for count query
      (QueryBuilder.raw as jest.Mock).mockImplementation((query) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: '2' }] });
        } else {
          return Promise.resolve({ rows: mockVenues.data });
        }
      });
      
      const result = await favoritesRepository.getUserFavoriteVenues(1);
      
      expect(QueryBuilder.raw).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockVenues);
    });
  });
  
  describe('getUserFavoriteArtists', () => {
    it('should get user favorite artists with details', async () => {
      const mockArtists = {
        data: [
          { id: 2, name: 'Artist 1' },
          { id: 3, name: 'Artist 2' },
        ],
        total: 2,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      
      // Mock the raw method for count query
      (QueryBuilder.raw as jest.Mock).mockImplementation((query) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: '2' }] });
        } else {
          return Promise.resolve({ rows: mockArtists.data });
        }
      });
      
      const result = await favoritesRepository.getUserFavoriteArtists(1);
      
      expect(QueryBuilder.raw).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockArtists);
    });
  });
});