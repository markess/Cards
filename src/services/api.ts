import { StudySet, Folder, UserStats } from '../types';
import {
  loadSetsFromGoogleSheets,
  saveSetToGoogleSheets,
  deleteSetFromGoogleSheets,
  ensureCardsLibraryFile,
  ensureCardsSetsFile,
} from './googleSheetsService';
import { getStoredSets, saveStoredSets, getStoredFolders, saveStoredFolders, getStoredStats, saveStoredStats } from '../utils/storage';
import { getCachedGoogleToken } from './googleAuth';

export const api = {
  // Sets
  async getSets(): Promise<StudySet[]> {
    if (!getCachedGoogleToken()) {
      return getStoredSets();
    }
    try {
      const sheetsSets = await loadSetsFromGoogleSheets();
      if (sheetsSets && sheetsSets.length > 0) {
        saveStoredSets(sheetsSets);
        return sheetsSets;
      }
    } catch (e) {
      console.warn('[Google Sheets] Could not load from Google Sheets, using local storage cache:', e);
    }
    return getStoredSets();
  },

  async saveSet(set: StudySet): Promise<StudySet> {
    // Always persist locally first for immediate responsiveness
    const current = getStoredSets();
    const existingIndex = current.findIndex((s) => s.id === set.id);
    let updatedSets: StudySet[];
    if (existingIndex >= 0) {
      updatedSets = [...current];
      updatedSets[existingIndex] = set;
    } else {
      updatedSets = [set, ...current];
    }
    saveStoredSets(updatedSets);

    // Sync to Google Sheets if connected
    if (getCachedGoogleToken()) {
      try {
        await saveSetToGoogleSheets(set);
      } catch (e) {
        console.warn('[Google Sheets] Failed saving to Google Sheets (saved locally):', e);
      }
    }
    return set;
  },

  async deleteSet(setId: string): Promise<void> {
    // Delete locally first
    const current = getStoredSets();
    const updated = current.filter((s) => s.id !== setId);
    saveStoredSets(updated);

    // Sync to Google Sheets if connected
    if (getCachedGoogleToken()) {
      try {
        await deleteSetFromGoogleSheets(setId);
      } catch (e) {
        console.warn('[Google Sheets] Failed deleting set from Google Sheets (deleted locally):', e);
      }
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
  async initializeGoogleSheetsFiles(): Promise<{ libraryFileId: string; setsFileId: string }> {
    const libraryFileId = await ensureCardsLibraryFile();
    const setsFileId = await ensureCardsSetsFile();
    return { libraryFileId, setsFileId };
  },
};
