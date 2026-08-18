export interface CompressionResult {
  compressedText: string;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  keptIndices: number[];
  removedIndices: number[];
  latencyMsTraditional: number;
  latencyMsOptimized: number;
  tokenSavings: number;
}

const FILLER_PATTERNS = [
  /^(it is important to note|in conclusion|to summarize|overall|furthermore|moreover|additionally|however|nevertheless|consequently|therefore|in other words|for example|for instance|as a result|on the other hand|at the same time|in this context|in general|as mentioned earlier|in fact|basically|essentially|needless to say|it goes without saying|as you know|it should be noted that)\b/i,
];

const FILLER_WORDS = new Set([
  "very",
  "really",
  "quite",
  "rather",
  "just",
  "actually",
  "basically",
  "literally",
  "simply",
  "obviously",
  "clearly",
  "certainly",
  "definitely",
  "probably",
  "maybe",
  "perhaps",
  "seems",
  "appears",
  "arguably",
  "generally",
  "typically",
  "usually",
  "often",
  "sometimes",
  "frequently",
  "occasionally",
  "various",
  "several",
  "many",
  "numerous",
  "a lot of",
  "lots of",
  "kind of",
  "sort of",
]);

export function estimateTokens(text: string): number {
  // Approximate: 1 token ≈ 0.75 words for English prose
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 0.75));
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/([.?!])\s+/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function scoreSentence(sentence: string, queryWords: Set<string>): number {
  let score = 0;
  const lower = sentence.toLowerCase();
  const words = lower.match(/\b[a-z]+\b/g) || [];

  // Penalize very short sentences
  if (words.length < 4) score -= 2;
  if (words.length > 12) score += 1.5;

  // Penalize filler patterns
  if (FILLER_PATTERNS.some((p) => p.test(sentence))) score -= 2.5;

  // Penalize filler words
  words.forEach((w) => {
    if (FILLER_WORDS.has(w)) score -= 0.4;
  });

  // Reward query overlap
  words.forEach((w) => {
    if (queryWords.has(w)) score += 2;
  });

  // Reward data-dense content: numbers, proper nouns, technical terms
  if (/\d/.test(sentence)) score += 1.2;
  if (/%|percent|percentage|ratio|rate|ms|milliseconds|tokens|parameters|model|training|inference|latency|throughput|accuracy|benchmark|dataset/i.test(sentence)) score += 1.5;

  // Reward facts and definitions
  if (/is|are|was|were|means|refers|defined|consists|contains|uses|employs|achieves|reduces|increases|improves|optimizes/i.test(sentence)) score += 0.5;

  // Slight reward for first sentence (often contains the topic)
  // Applied externally

  return score;
}

export function compressContext(
  rawContext: string,
  query: string
): CompressionResult {
  const sentences = splitSentences(rawContext);
  const queryWords = new Set(
    query
      .toLowerCase()
      .match(/\b[a-z]+\b/g)
      ?.filter((w) => w.length > 2) || []
  );

  const scored = sentences.map((sentence, index) => {
    let score = scoreSentence(sentence, queryWords);
    if (index === 0) score += 0.8; // Keep intro sentence slightly
    return { sentence, index, score };
  });

  // Target compression: 50% - 70% (keep 30% - 50% of sentences)
  // Sort by score descending and keep top portion
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const ratioTarget = 0.3 + Math.random() * 0.2; // keep 30%-50%
  const keepCount = Math.max(1, Math.round(sentences.length * ratioTarget));
  const kept = sorted.slice(0, keepCount).sort((a, b) => a.index - b.index);

  const keptIndices = kept.map((k) => k.index);
  const removedIndices = sentences
    .map((_, i) => i)
    .filter((i) => !keptIndices.includes(i));

  const compressedText = kept.map((k) => k.sentence).join(" ");
  const originalTokens = estimateTokens(rawContext);
  const compressedTokens = estimateTokens(compressedText);
  const tokenSavings = originalTokens - compressedTokens;
  const compressionRatio = Math.round((tokenSavings / originalTokens) * 100);

  // Latency simulation: larger context = longer TTFT
  const baseTraditional = 1200;
  const perTokenTraditional = 2.8;
  const latencyMsTraditional = Math.round(
    baseTraditional + originalTokens * perTokenTraditional + Math.random() * 400
  );

  const baseOptimized = 180;
  const perTokenOptimized = 0.9;
  const latencyMsOptimized = Math.round(
    baseOptimized + compressedTokens * perTokenOptimized + Math.random() * 120
  );

  return {
    compressedText,
    originalTokens,
    compressedTokens,
    compressionRatio,
    keptIndices,
    removedIndices,
    latencyMsTraditional,
    latencyMsOptimized,
    tokenSavings,
  };
}

export function formatTokens(n: number): string {
  return n.toLocaleString();
}

export function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms}ms`;
}
