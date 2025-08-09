import { NextRequest, NextResponse } from 'next/server';
import { DailyPuzzleGenerator } from '@/game/daily-puzzle-generator';
import { adminDb } from '@/firebase/admin';
import { AdminFirestoreProvider } from '@/services/firestore-provider';
import { setDictionaryProvider } from '@/dictionary/dictionary-access';

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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(id);
        reject(e);
      });
  });
}

export async function POST(request: NextRequest) {
  try {
    // Ensure Admin SDK is available
    const provider = new AdminFirestoreProvider(adminDb);
    // Ensure dictionary uses admin provider during generation
    setDictionaryProvider(provider);

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
        // If not forcing, skip if already exists
        if (!force) {
          const exists = await provider.documentExists('daily_puzzles', dateStr);
          if (exists) {
            results.push({ date: dateStr, status: 'success' });
            continue;
          }
        }
        const generator = new DailyPuzzleGenerator(provider, {
          fastMode: true,
          maxCandidatesPerPrefix: 200,
          maxBranchingPerNode: 100,
          timeBudgetMs: 15000,
        });
        const puzzle = await withTimeout(
          generator.generateDailyPuzzle(dateStr),
          30000,
          `Generation for ${dateStr}`
        );
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
    // Cleanup provider override to avoid accidental reuse
    setDictionaryProvider(null);
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


