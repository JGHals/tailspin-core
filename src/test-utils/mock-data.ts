export const mockWordList: string[] = [
  'puzzle',
  'lethal',
  'legal',
  'alpha',
  'lexicon',
  'jazz',
  'quiz',
  'jinx',
  'buzz',
  'fizz',
  'quick',
  'brown',
  'jumps',
  'vexed',
  'lazy',
  'test',
  'tent',
  'next',
  'time',
  'stellar',
  'arcade'
];

export const mockTerminalWords: string[] = [
  'jazz',
  'jinx',
  'buzz',
  'fizz',
  'lexicon'
];

export const mockValidChains: string[][] = [
  ['puzzle', 'lethal'],
  ['legal', 'alpha'],
  ['quick', 'jazz'],
  ['quick', 'jinx']
];

export const mockInvalidChains: string[][] = [
  ['puzzle', 'alpha'], // zz -> al invalid
  ['legal', 'puzzle'], // al -> le invalid
  ['alpha', 'arcade']  // ha -> ar invalid
];


