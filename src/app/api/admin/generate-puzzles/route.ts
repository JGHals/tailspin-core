import { NextRequest, NextResponse } from 'next/server';
import { dailyPuzzleGenerator } from '@/game/daily-puzzle-generator';
import { db } from '@/firebase/firebase';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: 'Batch Puzzle Generation API',
    usage: 'POST with { startDate?: YYYY-MM-DD, daysAhead?: number, force?: boolean }',
    example: {
      startDate: '2025-08-09',
      daysAhead: 7,
      force: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // NOTE: The current DailyPuzzleGenerator depends on client Firestore (db)
    // which is not initialized on the server. Guard here to avoid runtime errors.
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Firestore client is not initialized in server runtime. Use an Admin SDK-backed generator or trigger generation from a client page.',
          hint:
            'Implement server-side generation using Firebase Admin SDK in a separate generator or run this endpoint from a browser-only admin tool.',
        },
        { status: 500 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      startDate?: string;
      daysAhead?: number;
      force?: boolean;
    };

    const startDate = body.startDate ?? new Date().toISOString().split('T')[0];
    const daysAhead = Number.isFinite(body.daysAhead) ? (body.daysAhead as number) : 7;
    const force = Boolean(body.force);

    const results: Array<{
      date: string;
      status: 'success' | 'failed';
      startWord?: string;
      targetWord?: string;
      parMoves?: number;
      difficulty?: string;
      error?: string;
    }> = [];

    const baseDate = new Date(startDate);
    for (let i = 0; i < daysAhead; i++) {
      const targetDate = new Date(baseDate);
      targetDate.setDate(baseDate.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];

      try {
        // TODO: If force === false, consider checking for existing doc first
        const puzzle = await dailyPuzzleGenerator.generateDailyPuzzle(dateStr);
        results.push({
          date: dateStr,
          status: 'success',
          startWord: puzzle.startWord,
          targetWord: puzzle.targetWord,
          parMoves: (puzzle as any).parMoves,
          difficulty: (puzzle as any).difficulty ?? 'medium',
        });
      } catch (err: any) {
        results.push({
          date: dateStr,
          status: 'failed',
          error: err?.message ?? String(err),
        });
      }
    }

    const successful = results.filter((r) => r.status === 'success').length;
    return NextResponse.json({
      success: successful > 0,
      message: `Generated ${successful}/${daysAhead} daily puzzles`,
      summary: {
        total: daysAhead,
        successful,
        failed: daysAhead - successful,
        startDate,
        endDate: results.at(-1)?.date,
      },
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? String(error),
        message: 'Batch puzzle generation failed',
      },
      { status: 500 }
    );
  }
}


