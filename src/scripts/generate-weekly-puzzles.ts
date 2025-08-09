/*
  NOTE: This script uses the client-side DailyPuzzleGenerator which depends on Firestore client (db).
  To run headlessly in Node, refactor generator to use Admin SDK or provide a server context.
*/

import { dailyPuzzleGenerator } from '@/game/daily-puzzle-generator';
import { startupService } from '@/services/startup-service';

async function generateWeeklyPuzzles(daysToGenerate: number = 14) {
  console.log('🎯 TailSpin Weekly Puzzle Generation');
  console.log('====================================');

  const today = new Date();
  console.log(`📅 Generating ${daysToGenerate} puzzles starting from today (${today.toISOString().split('T')[0]})...`);

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < daysToGenerate; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0];

    try {
      console.log(`\n📝 ${dateStr}: Generating puzzle...`);
      const puzzle = await dailyPuzzleGenerator.generateDailyPuzzle(dateStr);
      console.log(`✅ ${dateStr}: Success!`);
      console.log(`   Start: ${puzzle.startWord}`);
      console.log(`   Target: ${puzzle.targetWord}`);
      // @ts-expect-error cross-file type
      console.log(`   Par: ${puzzle.parMoves} moves`);
      // @ts-expect-error cross-file type
      console.log(`   Difficulty: ${puzzle.difficulty || 'medium'}`);
      successful++;
    } catch (error: any) {
      console.error(`❌ ${dateStr}: Failed -`, error?.message ?? String(error));
      failed++;
    }
  }

  console.log('\n🎉 Weekly Generation Complete!');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${Math.round((successful / daysToGenerate) * 100)}%`);

  if (failed > 0) {
    console.log('\n⚠️  Some puzzles failed to generate. Check Firestore permissions and dictionary setup.');
  }
}

export async function main() {
  try {
    await startupService.initialize();
    await generateWeeklyPuzzles(14);
    process.exit(0);
  } catch (error) {
    console.error('Generation script failed:', error);
    process.exit(1);
  }
}

// Only auto-run if invoked directly
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (require.main === module) {
  main();
}


