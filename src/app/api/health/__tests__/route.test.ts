import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { testConnection } from '@/lib/db';

// Mock the database connection
vi.mock('@/lib/db', () => ({
  testConnection: vi.fn()
}));

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success status when database is healthy', async () => {
    const mockDbTest = { success: true, timestamp: new Date() };
    (testConnection as any).mockResolvedValue(mockDbTest);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
      database: expect.objectContaining({
        success: true,
        timestamp: expect.any(String)
      })
    });
  });

  it('should return error status when database connection fails', async () => {
    const mockError = new Error('Database connection failed');
    (testConnection as any).mockRejectedValue(mockError);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      status: 'error',
      error: 'Database connection failed'
    });
  });

  it('should handle unknown errors gracefully', async () => {
    (testConnection as any).mockRejectedValue('Unknown error');

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      status: 'error',
      error: 'Unknown error'
    });
  });
});