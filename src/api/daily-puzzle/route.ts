import { NextResponse } from 'next/server';
import { dailyPuzzleService } from '@/lib/game/daily-puzzle-service';

export async function GET(request: Request) {
  try {
    // Get date from query params if provided
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const date = dateStr ? new Date(dateStr) : new Date();

    // Get puzzle for the specified date
    const puzzle = await dailyPuzzleService.getDailyPuzzle(date);

    return NextResponse.json(puzzle);
  } catch (error) {
    console.error('Error getting daily puzzle:', error);
    return NextResponse.json(
      { error: 'Failed to get daily puzzle' },
      { status: 500 }
    );
  }
}

// Generate puzzles for the next week
export async function POST(request: Request) {
  try {
    // Prefetch next 3 days to warm caches (does not generate new puzzles)
    await (dailyPuzzleService as any).prefetchUpcomingPuzzles?.();
    return NextResponse.json({
      message: 'Prefetched upcoming puzzles to warm caches',
      note: 'This endpoint does not generate new puzzles. Use /api/admin/generate-puzzles for generation.',
    });
  } catch (error) {
    console.error('Error prefetching puzzles:', error);
    return NextResponse.json(
      { error: 'Prefetch failed' },
      { status: 500 }
    );
  }
} 