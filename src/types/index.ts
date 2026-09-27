export interface Term {
  id: string;
  term: string;
  definition: string;
  starred?: boolean;
  masteryScore?: number; // 0 = unstudied, 1 = familiar, 2+ = mastered
  hint?: string;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: number;
}

export interface HighScore {
  id: string;
  setId: string;
  playerName: string;
  timeSeconds: number;
  date: number;
}

export interface StudySet {
  id: string;
  title: string;
  description: string;
  folderId?: string;
  terms: Term[];
  createdAt: number;
  updatedAt: number;
  author: string;
  tags: string[];
  isPublic?: boolean;
}

export type StudyMode = 'overview' | 'flashcards' | 'learn' | 'match' | 'test' | 'write';

export interface UserStats {
  streakDays: number;
  lastStudiedDate: string;
  totalCardsStudied: number;
  totalTimeMinutes: number;
  testsCompleted: number;
  matchesWon: number;
}

export interface TestSettings {
  questionCount: number;
  questionTypes: {
    multipleChoice: boolean;
    trueFalse: boolean;
    written: boolean;
  };
  promptWith: 'term' | 'definition' | 'both';
  instantFeedback: boolean;
}

export interface TestQuestion {
  id: string;
  termId: string;
  type: 'multiple-choice' | 'true-false' | 'written';
  prompt: string;
  correctAnswer: string;
  options?: string[]; // for multiple choice
  tfAnswer?: boolean; // for true-false
  tfDisplayedDefinition?: string; // what's shown for true-false
  userAnswer?: string;
  isCorrect?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'user';
  createdAt: number;
}

export interface AccessRequest {
  id: string;
  email: string;
  name: string;
  picture?: string;
  timestamp: number;
  status: 'rejected_limit_reached' | 'pending';
  notifiedEmail: string;
}

export interface EmailNotification {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: number;
  status: 'sent';
}

