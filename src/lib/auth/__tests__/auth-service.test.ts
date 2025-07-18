import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../auth-service';
import { UserRepository } from '../../repositories/user-repository';

// Mock UserRepository
vi.mock('../../repositories/user-repository', () => {
  return {
    UserRepository: vi.fn().mockImplementation(() => ({
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      createSession: vi.fn(),
      findSessionByToken: vi.fn(),
      deleteSession: vi.fn(),
      deleteUserSessions: vi.fn(),
      update: vi.fn(),
      createPasswordResetToken: vi.fn(),
      findPasswordResetToken: vi.fn(),
      deletePasswordResetToken: vi.fn(),
      cleanupExpiredSessions: vi.fn(),
      cleanupExpiredPasswordResetTokens: vi.fn(),
    })),
  };
});

// Mock bcrypt
vi.mock('bcryptjs', () => {
  return {
    default: {
      hash: vi.fn().mockResolvedValue('hashed_password'),
      compare: vi.fn().mockResolvedValue(true),
    },
  };
});

// Mock jwt
vi.mock('jsonwebtoken', () => {
  return {
    default: {
      sign: vi.fn().mockReturnValue('mock_token'),
      verify: vi.fn().mockReturnValue({ userId: 1 }),
    },
  };
});

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
    mockUserRepository = (UserRepository as any).mock.results[0].value;
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Mock user not existing
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      // Mock user creation
      mockUserRepository.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        role: 'user',
        email_verified: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await authService.register('test@example.com', 'password123', 'Test User');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        email_verified: false,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it('should throw an error if email already exists', async () => {
      // Mock user already existing
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
      });

      await expect(authService.register('test@example.com', 'password123')).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login a user successfully', async () => {
      // Mock user existing
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        role: 'user',
        email_verified: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Mock session creation
      mockUserRepository.createSession.mockResolvedValue({
        id: 1,
        user_id: 1,
        token_hash: 'hashed_token',
        expires_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await authService.login('test@example.com', 'password123');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.createSession).toHaveBeenCalled();
      expect(result).toEqual({
        token: 'mock_token',
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          email_verified: false,
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      });
    });

    it('should throw an error if user not found', async () => {
      // Mock user not existing
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    it('should verify a token successfully', async () => {
      // Mock session existing
      mockUserRepository.findSessionByToken.mockResolvedValue({
        id: 1,
        user_id: 1,
        token_hash: 'hashed_token',
        expires_at: new Date(Date.now() + 3600000), // 1 hour in the future
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await authService.verifyToken('mock_token');

      expect(mockUserRepository.findSessionByToken).toHaveBeenCalled();
      expect(result).toBe(1);
    });

    it('should throw an error if session not found', async () => {
      // Mock session not existing
      mockUserRepository.findSessionByToken.mockResolvedValue(null);

      await expect(authService.verifyToken('mock_token')).rejects.toThrow('Session not found');
    });
  });

  describe('logout', () => {
    it('should logout a user successfully', async () => {
      // Mock session existing
      mockUserRepository.findSessionByToken.mockResolvedValue({
        id: 1,
        user_id: 1,
        token_hash: 'hashed_token',
        expires_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Mock session deletion
      mockUserRepository.deleteSession.mockResolvedValue(true);

      const result = await authService.logout('mock_token');

      expect(mockUserRepository.findSessionByToken).toHaveBeenCalled();
      expect(mockUserRepository.deleteSession).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should return false if session not found', async () => {
      // Mock session not existing
      mockUserRepository.findSessionByToken.mockResolvedValue(null);

      const result = await authService.logout('mock_token');

      expect(mockUserRepository.findSessionByToken).toHaveBeenCalled();
      expect(mockUserRepository.deleteSession).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});