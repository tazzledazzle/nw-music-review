import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth/auth-service';

// Validation schema for login
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/users/login
 * Login a user
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await req.json();

    // Validate request body
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.format() },
        { status: 400 }
      );
    }

    // Login user
    const authService = new AuthService();
    const { token, user } = await authService.login(
      result.data.email,
      result.data.password
    );

    return NextResponse.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle known errors
    if (error instanceof Error) {
      if (error.message === 'Invalid credentials') {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
    }

    // Handle unknown errors
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}