import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// Registration handled client-side; this endpoint can be extended to create profiles after client auth.
import { userProfileService } from '@/lib/services/user-profile-service';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequest } from '@/lib/middleware/validate';

// Registration request schema
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).max(30)
});

const AUTH_RATE_LIMIT = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 3 // 3 requests per minute for registration
};

/**
 * POST /api/auth/register
 * 
 * Register a new user with email and password
 * 
 * Example request:
 * ```
 * POST /api/auth/register
 * {
 *   "email": "user@example.com",
 *   "password": "password123",
 *   "username": "User123"
 * }
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "success": true,
 *   "user": {
 *     "id": "abc123",
 *     "email": "user@example.com",
 *     "username": "User123",
 *     "tokens": 10,
 *     "maxTokens": 50
 *   }
 * }
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit(req, AUTH_RATE_LIMIT);
    if (rateLimitResult) return rateLimitResult;

    // Validate request body
    const validationResult = await validateRequest(req, RegisterSchema);
    if (validationResult) return validationResult;

    const body = await req.json();
    const { email, password, username } = body;

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, password, and username are required' },
        { status: 400 }
      );
    }

    try {
      // Stub: in production, client performs Firebase auth; server creates profile after token verification.
      const userProfile = await userProfileService.createProfile(
        `stub_${Date.now()}`,
        username,
        email,
        undefined
      );
      return NextResponse.json({ success: true, user: userProfile });
    } catch (error: any) {
      console.error('Registration error:', error);

      // Handle specific Firebase auth errors
      if (error.code === 'auth/email-already-in-use') {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        );
      } else if (error.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      } else if (error.code === 'auth/weak-password') {
        return NextResponse.json(
          { error: 'Password is too weak' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Registration failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
} 