/**
 * Cortex Smart Grading Engine
 * Inspired by Quenti's AI & tolerant grading algorithms
 */

export interface GradeResult {
  isCorrect: boolean;
  isClose: boolean;
  score: number; // 0.0 to 1.0
  feedback?: string;
  diffSummary?: string;
}

// Normalize text: lowercase, trim, remove excessive spaces and accents
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance calculation
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));

  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (b[j - 1] === a[i - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1, // substitution
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1      // deletion
        );
      }
    }
  }

  return matrix[bn][an];
}

// Calculate similarity ratio between 0 and 1
export function similarityRatio(s1: string, s2: string): number {
  const norm1 = normalizeAnswer(s1);
  const norm2 = normalizeAnswer(s2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  // Direct containment check (e.g. user answered "mitochondria" and target is "mitochondria (plural)")
  if (norm2.includes(norm1) && norm1.length >= 4 && norm1.length / norm2.length > 0.6) {
    return 0.95;
  }
  if (norm1.includes(norm2) && norm2.length >= 4 && norm2.length / norm1.length > 0.6) {
    return 0.95;
  }

  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  return 1 - distance / maxLength;
}

/**
 * Grade user input against target answer
 */
export function cortexGrade(userInput: string, correctAnswer: string): GradeResult {
  const normUser = normalizeAnswer(userInput);
  const normTarget = normalizeAnswer(correctAnswer);

  if (!normUser) {
    return {
      isCorrect: false,
      isClose: false,
      score: 0,
      feedback: 'No answer provided.',
    };
  }

  if (normUser === normTarget) {
    return {
      isCorrect: true,
      isClose: false,
      score: 1.0,
      feedback: 'Spot on! Exactly correct.',
    };
  }

  const ratio = similarityRatio(normUser, normTarget);

  if (ratio >= 0.88) {
    // Very close match (minor typo or missing small word)
    return {
      isCorrect: true,
      isClose: true,
      score: ratio,
      feedback: 'Cortex accepted your answer with a minor typo tolerated!',
    };
  }

  if (ratio >= 0.65) {
    return {
      isCorrect: false,
      isClose: true,
      score: ratio,
      feedback: 'Almost there! Take note of the exact wording.',
    };
  }

  return {
    isCorrect: false,
    isClose: false,
    score: ratio,
    feedback: 'Incorrect. Review the correct definition.',
  };
}
