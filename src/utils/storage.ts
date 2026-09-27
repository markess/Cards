import { Folder, HighScore, StudySet, UserStats } from '../types';

const STORAGE_KEYS = {
  SETS: 'cards_study_sets',
  FOLDERS: 'cards_folders',
  STATS: 'cards_user_stats',
  HIGH_SCORES: 'cards_match_highscores',
  THEME: 'cards_theme',
};

// Filter out old legacy demo sets
function sanitizeSets(sets: StudySet[]): StudySet[] {
  const legacyIds = new Set(['set-spanish-101', 'set-bio-organelles', 'set-cs-dsa']);
  return sets.filter((s) => !legacyIds.has(s.id));
}

// Filter out old legacy demo folders
function sanitizeFolders(folders: Folder[]): Folder[] {
  const legacyFolderIds = new Set(['folder-languages', 'folder-science', 'folder-cs', 'folder-gre']);
  return folders.filter((f) => !legacyFolderIds.has(f.id));
}

export function getStoredSets(): StudySet[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return sanitizeSets(parsed);
  } catch (e) {
    return [];
  }
}

export function saveStoredSets(sets: StudySet[]): void {
  try {
    const sanitized = sanitizeSets(sets);
    localStorage.setItem(STORAGE_KEYS.SETS, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Failed saving sets to cache:', e);
  }
}

export function getStoredFolders(): Folder[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return sanitizeFolders(parsed);
  } catch (e) {
    return [];
  }
}

export function saveStoredFolders(folders: Folder[]): void {
  try {
    const sanitized = sanitizeFolders(folders);
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Failed saving folders to cache:', e);
  }
}

export function getStoredStats(): UserStats {
  const today = new Date().toISOString().split('T')[0];
  const initialStats: UserStats = {
    streakDays: 0,
    lastStudiedDate: today,
    totalCardsStudied: 0,
    totalTimeMinutes: 0,
    testsCompleted: 0,
    matchesWon: 0,
  };

  try {
    const data = localStorage.getItem(STORAGE_KEYS.STATS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed reading stats:', e);
  }

  return initialStats;
}

export function saveStoredStats(stats: UserStats): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed saving stats:', e);
  }
}

export function recordStudySession(cardsCount: number, minutes = 1): UserStats {
  const current = getStoredStats();
  const today = new Date().toISOString().split('T')[0];
  let streak = current.streakDays;

  if (current.lastStudiedDate !== today) {
    const lastDate = new Date(current.lastStudiedDate);
    const nowDate = new Date(today);
    const diffDays = Math.round((nowDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      streak += 1;
    } else if (diffDays > 1) {
      streak = 1;
    }
  } else if (streak === 0) {
    streak = 1;
  }

  const updated: UserStats = {
    ...current,
    streakDays: streak,
    lastStudiedDate: today,
    totalCardsStudied: current.totalCardsStudied + cardsCount,
    totalTimeMinutes: current.totalTimeMinutes + minutes,
  };

  saveStoredStats(updated);
  return updated;
}

export function recordTestCompleted(): void {
  const current = getStoredStats();
  saveStoredStats({
    ...current,
    testsCompleted: current.testsCompleted + 1,
  });
}

export function recordMatchWon(): void {
  const current = getStoredStats();
  saveStoredStats({
    ...current,
    matchesWon: current.matchesWon + 1,
  });
}

export function getHighScores(setId: string): HighScore[] {
  try {
    const data = localStorage.getItem(`${STORAGE_KEYS.HIGH_SCORES}_${setId}`);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed reading high scores:', e);
  }
  return [];
}

export function saveHighScore(setId: string, playerName: string, timeSeconds: number): HighScore[] {
  const scores = getHighScores(setId);
  const newScore: HighScore = {
    id: String(Date.now()),
    setId,
    playerName: playerName || 'Student',
    timeSeconds,
    date: Date.now(),
  };
  const updated = [...scores, newScore]
    .sort((a, b) => a.timeSeconds - b.timeSeconds)
    .slice(0, 10);
  try {
    localStorage.setItem(`${STORAGE_KEYS.HIGH_SCORES}_${setId}`, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed saving high scores:', e);
  }
  return updated;
}

export function resetAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.SETS);
  localStorage.removeItem(STORAGE_KEYS.FOLDERS);
  localStorage.removeItem(STORAGE_KEYS.STATS);
  // Also clear legacy keys
  localStorage.removeItem('quenti_study_sets');
  localStorage.removeItem('quenti_folders');
  localStorage.removeItem('quenti_user_stats');
}
