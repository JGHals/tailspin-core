import { NextResponse } from 'next/server';
// Password resets are initiated client-side via Firebase SDK.

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    try {
      // Stub: instruct client to initiate reset via Firebase SDK.
      return NextResponse.json({ success: false, message: 'Use client-side Firebase to send reset email.' }, { status: 501 });
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'No account found with this email' },
          { status: 404 }
        );
      } else if (error.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to send reset email' },
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