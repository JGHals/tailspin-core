/*
  Node-only admin script to generate daily puzzles headlessly.
  Usage:
    npm run generate-puzzles-admin -- --start=YYYY-MM-DD --days=7 --force
*/

// Load environment variables early so Firebase Admin can initialize
import { config as loadEnv } from 'dotenv';
// Load default .env then overlay .env.local if present
loadEnv();
loadEnv({ path: '.env.local' });

import { adminDb } from '@/firebase/admin';
import { AdminFirestoreProvider } from '@/services/firestore-provider';
import { DailyPuzzleGenerator } from '@/game/daily-puzzle-generator';
import { setDictionaryProvider } from '@/dictionary/dictionary-access';

function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string | boolean> = {};
  for (const arg of args) {
    const [k, v] = arg.startsWith('--') ? arg.substring(2).split('=') : [arg, 'true'];
    params[k] = v ?? true;
  }
  return params;
}

async function main() {
  const params = parseArgs();
  const startDate = (params.start as string) ?? new Date().toISOString().split('T')[0];
  const days = Number(params.days ?? 7);
  const force = Boolean(params.force ?? false);

  // Enable verbose dictionary debugging if requested
  if (params.debug === '1' || params.debug === 'true') {
    process.env.DICTIONARY_DEBUG = '1';
  }

  const provider = new AdminFirestoreProvider(adminDb);
  setDictionaryProvider(provider);

  const generator = new DailyPuzzleGenerator(provider);

  const baseDate = new Date(startDate);
  console.log(`Generating ${days} puzzles from ${startDate}${force ? ' (force)' : ''}`);

  let success = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const id = d.toISOString().split('T')[0];

    try {
      if (!force) {
        const exists = await provider.documentExists('daily_puzzles', id);
        if (exists) {
          console.log(`✔ ${id} already exists, skipping`);
          success++;
          continue;
        }
      }
      const puzzle = await generator.generateDailyPuzzle(id);
      console.log(`✔ ${id}: ${puzzle.startWord} → ${puzzle.targetWord} (par ${puzzle.parMoves})`);
      success++;
    } catch (err: any) {
      console.error(`✖ ${id}: ${err?.message ?? String(err)}`);
    }
  }

  setDictionaryProvider(null);
  console.log(`Done. ${success}/${days} succeeded.`);
}

main().catch((e) => {
  console.error('Generation failed:', e);
  process.exit(1);
});


