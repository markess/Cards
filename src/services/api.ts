import { StudySet, Folder, UserStats } from '../types';
import {
  loadSetsFromGoogleSheets,
  saveSetToGoogleSheets,
  deleteSetFromGoogleSheets,
  ensureCardsLibraryFile,
  ensureCardsSetsFile,
} from './googleSheetsService';
import { hasActiveGoogleToken, GoogleAuthExpiredError } from './googleAuth';
import { getStoredSets, saveStoredSets, getStoredFolders, saveStoredFolders, getStoredStats, saveStoredStats } from '../utils/storage';

export const api = {
  // Sets
  async getSets(tokenOverride?: string): Promise<StudySet[]> {
    try {
      if (tokenOverride || hasActiveGoogleToken()) {
        const sheetsSets = await loadSetsFromGoogleSheets(tokenOverride);
        if (sheetsSets && sheetsSets.length > 0) {
          saveStoredSets(sheetsSets);
          return sheetsSets;
        }
      }
    } catch (e: any) {
      if (e instanceof GoogleAuthExpiredError) {
        console.info('[Google Sheets] Google session expired or inactive, using cached sets.');
      } else {
        console.warn('[Google Sheets] Could not load from Google Sheets, using local storage cache:', e);
      }
    }
    return getStoredSets();
  },

  async saveSet(set: StudySet, tokenOverride?: string): Promise<StudySet> {
    try {
      if (tokenOverride || hasActiveGoogleToken()) {
        await saveSetToGoogleSheets(set, tokenOverride);
      }
    } catch (e) {
      console.warn('[Google Sheets] Failed saving to Google Sheets:', e);
    }
    return set;
  },

  async deleteSet(setId: string, tokenOverride?: string): Promise<void> {
    try {
      if (tokenOverride || hasActiveGoogleToken()) {
        await deleteSetFromGoogleSheets(setId, tokenOverride);
      }
    } catch (e) {
      console.warn('[Google Sheets] Failed deleting set from Google Sheets:', e);
    }
  },

  // Folders
  async getFolders(): Promise<Folder[]> {
    return getStoredFolders();
  },

  async saveFolder(folder: Folder): Promise<Folder> {
    const folders = getStoredFolders();
    const updated = [...folders.filter((f) => f.id !== folder.id), folder];
    saveStoredFolders(updated);
    return folder;
  },

  async deleteFolder(folderId: string): Promise<void> {
    const folders = getStoredFolders().filter((f) => f.id !== folderId);
    saveStoredFolders(folders);
  },

  // Stats
  async getStats(): Promise<UserStats | null> {
    return getStoredStats();
  },

  async saveStats(stats: UserStats): Promise<void> {
    saveStoredStats(stats);
  },

  // Check and setup Google Sheets files
  async initializeGoogleSheetsFiles(tokenOverride?: string): Promise<{ libraryFileId: string; setsFileId: string }> {
    const libraryFileId = await ensureCardsLibraryFile(tokenOverride);
    const setsFileId = await ensureCardsSetsFile(tokenOverride);
    return { libraryFileId, setsFileId };
  },
};
