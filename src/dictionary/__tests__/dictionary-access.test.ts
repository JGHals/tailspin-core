import { dictionaryAccess } from '../dictionary-access';
import { jest } from '@jest/globals';
// Replace Firebase dictionary with in-memory implementation to avoid Firestore dependency
jest.mock('../firebase-dictionary', () => {
  const wordsByPrefix: Record<string, string[]> = {
    ap: ['apple'],
    ba: ['banana'],
    ch: ['cherry'],
    te: ['te', 'tea', 'teaberry', 'teaberries', 'teaboard'],
    pu: ['puzzle', 'puzzleation', 'puzzled', 'puzzledly', 'puzzledness'],
    le: ['lethal', 'lemon'],
    al: ['al', 'ala', 'alabama', 'alabaman', 'alabamian'],
    ce: ['ce', 'ceanothus', 'cearin', 'cease', 'ceased'],
    zz: [],
    he: ['he', 'head', 'heal', 'health', 'healthy']
  }
  return {
    FirebaseDictionaryOptimized: class {
      async initialize() {}
      async getWords(prefix: string) { return wordsByPrefix[prefix] ?? [] }
      async getWordsWithPrefix(prefix: string) { return this.getWords(prefix) }
      async isValidWord(word: string) {
        const prefix = word.slice(0, 2).toLowerCase()
        return (wordsByPrefix[prefix] ?? []).includes(word.toLowerCase())
      }
      async findNextValidWords(lastWord: string) {
        const pref = lastWord.slice(-2).toLowerCase()
        return wordsByPrefix[pref] ?? []
      }
      async isTerminalWord(word: string) {
        const next = await this.findNextValidWords(word)
        return next.length === 0
      }
    }
  }
});

describe('Dictionary Access Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidWord', () => {
    const testCases = [
      { word: 'apple', expected: true, description: 'common word' },
      { word: 'puzzle', expected: true, description: 'game example word' },
      { word: 'lethal', expected: true, description: 'game example word' },
      { word: 'alliance', expected: false, description: 'not present in in-memory mock' },
      { word: 'notaword', expected: false, description: 'invalid word' },
      { word: 'a', expected: false, description: 'too short' },
      { word: 'supercalifragilisticexpialidocious', expected: false, description: 'too long' }
    ];

    testCases.forEach(({ word, expected, description }) => {
      test(`validates ${description}: "${word}"`, async () => {
        const result = await dictionaryAccess.isValidWord(word);
        console.log(`"${word}" is ${result ? 'valid' : 'invalid'}`);
        expect(result).toBe(expected);
      });
    });
  });

  describe('getWordsWithPrefix', () => {
    const prefixes = ['ap', 'ba', 'ch', 'te', 'puz'];

    prefixes.forEach(prefix => {
      test(`finds words starting with "${prefix}"`, async () => {
        const words = await dictionaryAccess.getWordsWithPrefix(prefix);
        console.log(`Words with prefix "${prefix}": ${words.slice(0, 5).join(', ')}${words.length > 5 ? '...' : ''} (${words.length} total)`);
        expect(Array.isArray(words)).toBe(true);
        words.forEach(word => {
          expect(word.startsWith(prefix)).toBe(true);
        });
      });
    });

    test('returns empty array for short prefix', async () => {
      const words = await dictionaryAccess.getWordsWithPrefix('a');
      expect(words).toEqual([]);
    });
  });

  describe('findNextValidWords', () => {
    const chainWords = ['puzzle', 'lethal', 'alliance'];

    chainWords.forEach(word => {
      test(`finds valid next words after "${word}"`, async () => {
        const lastTwo = word.slice(-2);
        const nextWords = await dictionaryAccess.findNextValidWords(word);
        console.log(`Valid words after "${word}": ${nextWords.slice(0, 5).join(', ')}${nextWords.length > 5 ? '...' : ''} (${nextWords.length} total)`);
        expect(Array.isArray(nextWords)).toBe(true);
        nextWords.forEach(nextWord => {
          expect(nextWord.startsWith(lastTwo)).toBe(true);
        });
      });
    });
  });

  describe('isTerminalWord', () => {
    const testCases = [
      { word: 'jazz', expected: true, description: 'likely terminal (ends in zz)' },
      { word: 'the', expected: false, description: 'common non-terminal' },
      { word: 'puzzle', expected: false, description: 'game example word' }
    ];

    testCases.forEach(({ word, expected, description }) => {
      test(`correctly identifies ${description}: "${word}"`, async () => {
        const isTerminal = await dictionaryAccess.isTerminalWord(word);
        console.log(`"${word}" is ${isTerminal ? 'a terminal word' : 'not a terminal word'}`);
        expect(isTerminal).toBe(expected);
      });
    });
  });

  // Clean up after all tests
  afterAll(() => {
    // no-op to avoid long timers in CI
  });
}); 