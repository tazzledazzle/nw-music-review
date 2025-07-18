import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository } from '../repositories/user-repository';
import { User, Session } from '../models/types';

// JWT secret key from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_SALT_ROUNDS = 12;

/**
 * Authentication service for user management and authentication
 */
export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Register a new user
   * @param email User email
   * @param password User password
   * @param name User name (optional)
   * @returns Created user object (without password)
   * @throws Error if email already exists
   */
  async register(email: string, password: string, name?: string): Promise<Omit<User, 'password_hash'>> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await this.userRepository.create({
      email,
      password_hash: passwordHash,
      name: name || null,
      role: 'user',
      email_verified: false,
    });

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Login a user
   * @param email User email
   * @param password User password
   * @returns JWT token and user object (without password)
   * @throws Error if credentials are invalid
   */
  async login(email: string, password: string): Promise<{ token: string; user: Omit<User, 'password_hash'> }> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Create session
    const sessionExpires = new Date();
    sessionExpires.setDate(sessionExpires.getDate() + 7); // 7 days from now

    await this.userRepository.createSession({
      user_id: user.id,
      token_hash: this.hashToken(token),
      expires_at: sessionExpires,
    });

    // Return token and user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  /**
   * Verify a JWT token
   * @param token JWT token
   * @returns User ID if token is valid
   * @throws Error if token is invalid
   */
  async verifyToken(token: string): Promise<number> {
    try {
      // Verify JWT signature
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      
      // Check if session exists
      const session = await this.userRepository.findSessionByToken(this.hashToken(token));
      if (!session) {
        throw new Error('Session not found');
      }

      return decoded.userId;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Get user by ID
   * @param userId User ID
   * @returns User object (without password) or null if not found
   */
  async getUserById(userId: number): Promise<Omit<User, 'password_hash'> | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Logout a user by invalidating their session
   * @param token JWT token
   * @returns True if logged out successfully
   */
  async logout(token: string): Promise<boolean> {
    try {
      const session = await this.userRepository.findSessionByToken(this.hashToken(token));
      if (session) {
        await this.userRepository.deleteSession(session.id);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Change user password
   * @param userId User ID
   * @param currentPassword Current password
   * @param newPassword New password
   * @returns True if password changed successfully
   * @throws Error if current password is invalid
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    // Update user
    await this.userRepository.update(userId, { password_hash: newPasswordHash });

    // Invalidate all sessions
    await this.userRepository.deleteUserSessions(userId);

    return true;
  }

  /**
   * Create a password reset token
   * @param email User email
   * @returns Reset token or null if user not found
   */
  async createPasswordResetToken(email: string): Promise<string | null> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(resetToken);

    // Set expiration (1 hour)
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    // Save token
    await this.userRepository.createPasswordResetToken({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expires,
    });

    return resetToken;
  }

  /**
   * Reset password using a reset token
   * @param token Reset token
   * @param newPassword New password
   * @returns True if password reset successfully
   * @throws Error if token is invalid
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // Find token
    const resetToken = await this.userRepository.findPasswordResetToken(this.hashToken(token));
    if (!resetToken) {
      throw new Error('Invalid or expired token');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    // Update user
    await this.userRepository.update(resetToken.user_id, { password_hash: newPasswordHash });

    // Delete token
    await this.userRepository.deletePasswordResetToken(resetToken.id);

    // Invalidate all sessions
    await this.userRepository.deleteUserSessions(resetToken.user_id);

    return true;
  }

  /**
   * Clean up expired sessions and tokens
   */
  async cleanup(): Promise<void> {
    await this.userRepository.cleanupExpiredSessions();
    await this.userRepository.cleanupExpiredPasswordResetTokens();
  }

  /**
   * Generate a JWT token for a user
   * @param user User object
   * @returns JWT token
   */
  private generateToken(user: User): string {
    return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  /**
   * Hash a token for storage
   * @param token Token to hash
   * @returns Hashed token
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}