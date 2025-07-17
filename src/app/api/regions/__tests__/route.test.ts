import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { CityRepository } from '@/lib/repositories/city-repository';

// Mock the CityRepository
vi.mock('@/lib/repositories/city-repository');

describe('/api/regions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return filtered regions for target areas', async () => {
    // Mock the getRegions method
    const mockGetRegions = vi.fn().mockResolvedValue([
      { country: 'US', regions: ['WA', 'OR', 'ID', 'CA', 'NY'] },
      { country: 'CA', regions: ['BC', 'AB', 'ON'] },
      { country: 'MX', regions: ['DF', 'GJ'] }
    ]);

    vi.mocked(CityRepository).mockImplementation(() => ({
      getRegions: mockGetRegions,
    }) as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      regions: [
        { country: 'US', regions: ['WA', 'OR', 'ID'] },
        { country: 'CA', regions: ['BC'] }
      ]
    });
    expect(mockGetRegions).toHaveBeenCalledOnce();
  });

  it('should handle empty regions gracefully', async () => {
    const mockGetRegions = vi.fn().mockResolvedValue([]);

    vi.mocked(CityRepository).mockImplementation(() => ({
      getRegions: mockGetRegions,
    }) as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      regions: []
    });
  });

  it('should handle database errors', async () => {
    const mockGetRegions = vi.fn().mockRejectedValue(new Error('Database connection failed'));

    vi.mocked(CityRepository).mockImplementation(() => ({
      getRegions: mockGetRegions,
    }) as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to fetch regions',
      details: 'Database connection failed'
    });
  });

  it('should only return target regions WA, OR, ID, BC', async () => {
    const mockGetRegions = vi.fn().mockResolvedValue([
      { country: 'US', regions: ['WA', 'OR', 'ID', 'CA', 'TX', 'NY'] },
      { country: 'CA', regions: ['BC', 'AB', 'ON', 'QC'] },
      { country: 'MX', regions: ['DF'] }
    ]);

    vi.mocked(CityRepository).mockImplementation(() => ({
      getRegions: mockGetRegions,
    }) as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    
    // Verify only target regions are included
    const allReturnedRegions = data.regions.flatMap((country: any) => country.regions);
    expect(allReturnedRegions).toEqual(['WA', 'OR', 'ID', 'BC']);
    
    // Verify countries without target regions are excluded
    expect(data.regions.find((country: any) => country.country === 'MX')).toBeUndefined();
  });
});