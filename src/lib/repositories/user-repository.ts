import { QueryBuilder } from '../db/query-builder';
import { User, Session, PasswordResetToken } from '../models/types';

/**
 * Repository for user-related database operations
 */
export class UserRepository {
  private queryBuilder: QueryBuilder;

  constructor() {
    this.queryBuilder = new QueryBuilder('users');
  }

  /**
   * Find a user by ID
   * @param id User ID
   * @returns User object or null if not found
   */
  async findById(id: number): Promise<User | null> {
    return await new QueryBuilder('users')
      .where('id = $1', id)
      .executeSingle<User>();
  }

  /**
   * Find a user by email
   * @param email User email
   * @returns User object or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    return await new QueryBuilder('users')
      .where('email = $1', email)
      .executeSingle<User>();
  }

  /**
   * Create a new user
   * @param userData User data without ID
   * @returns Created user object
   */
  async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    return await new QueryBuilder('users').insert<User>(userData);
  }

  /**
   * Update a user
   * @param id User ID
   * @param userData User data to update
   * @returns Updated user object or null if not found
   */
  async update(id: number, userData: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): Promise<User | null> {
    return await new QueryBuilder('users').update<User>(id, userData);
  }

  /**
   * Delete a user
   * @param id User ID
   * @returns True if deleted, false if not found
   */
  async delete(id: number): Promise<boolean> {
    return await new QueryBuilder('users').delete(id);
  }

  /**
   * Create a new session
   * @param sessionData Session data without ID
   * @returns Created session object
   */
  async createSession(sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session> {
    return await new QueryBuilder('sessions').insert<Session>(sessionData);
  }

  /**
   * Find a session by token hash
   * @param tokenHash Hashed token
   * @returns Session object or null if not found
   */
  async findSessionByToken(tokenHash: string): Promise<Session | null> {
    return await new QueryBuilder('sessions')
      .where('token_hash = $1', tokenHash)
      .where('expires_at > NOW()')
      .executeSingle<Session>();
  }

  /**
   * Delete a session
   * @param id Session ID
   * @returns True if deleted, false if not found
   */
  async deleteSession(id: number): Promise<boolean> {
    return await new QueryBuilder('sessions').delete(id);
  }

  /**
   * Delete all sessions for a user
   * @param userId User ID
   * @returns Number of deleted sessions
   */
  async deleteUserSessions(userId: number): Promise<number> {
    const result = await QueryBuilder.raw(
      'DELETE FROM sessions WHERE user_id = $1',
      [userId]
    );
    return result.rowCount || 0;
  }

  /**
   * Create a password reset token
   * @param tokenData Token data without ID
   * @returns Created token object
   */
  async createPasswordResetToken(
    tokenData: Omit<PasswordResetToken, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PasswordResetToken> {
    return await new QueryBuilder('password_reset_tokens').insert<PasswordResetToken>(tokenData);
  }

  /**
   * Find a password reset token by token hash
   * @param tokenHash Hashed token
   * @returns Token object or null if not found
   */
  async findPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null> {
    return await new QueryBuilder('password_reset_tokens')
      .where('token_hash = $1', tokenHash)
      .where('expires_at > NOW()')
      .executeSingle<PasswordResetToken>();
  }

  /**
   * Delete a password reset token
   * @param id Token ID
   * @returns True if deleted, false if not found
   */
  async deletePasswordResetToken(id: number): Promise<boolean> {
    return await new QueryBuilder('password_reset_tokens').delete(id);
  }

  /**
   * Delete all expired sessions
   * @returns Number of deleted sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await QueryBuilder.raw(
      'DELETE FROM sessions WHERE expires_at <= NOW()',
      []
    );
    return result.rowCount || 0;
  }

  /**
   * Delete all expired password reset tokens
   * @returns Number of deleted tokens
   */
  async cleanupExpiredPasswordResetTokens(): Promise<number> {
    const result = await QueryBuilder.raw(
      'DELETE FROM password_reset_tokens WHERE expires_at <= NOW()',
      []
    );
    return result.rowCount || 0;
  }
}