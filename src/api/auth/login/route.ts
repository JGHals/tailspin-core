import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequest } from '@/lib/middleware/validate';

// Login request schema
const LoginSchema = z.object({
  method: z.enum(['email', 'google']),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

const AUTH_RATE_LIMIT = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 5 // 5 requests per minute for auth endpoints
};

/**
 * POST /api/auth/login
 * 
 * Login with email/password or Google
 * 
 * Example requests:
 * ```
 * // Email login
 * POST /api/auth/login
 * {
 *   "method": "email",
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * 
 * // Google login
 * POST /api/auth/login
 * {
 *   "method": "google"
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
 *     "avatar": "https://...",
 *     "tokens": 10,
 *     "maxTokens": 50
 *   }
 * }
 * ```
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    // This endpoint is a stub in the core engine. Perform auth in the client, then call server APIs with the ID token.
    return NextResponse.json({ error: 'Not implemented on server. Use client-side Firebase Auth.' }, { status: 501 });
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
} 