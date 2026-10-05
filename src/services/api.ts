import { StudySet, Folder, UserStats } from '../types';
import {
  loadSetsFromGoogleSheets,
  saveSetToGoogleSheets,
  deleteSetFromGoogleSheets,
  ensureCardsLibraryFile,
  ensureCardsSetsFile,
  ensureCardsFoldersFile,
  ensureCardsTelegramFile,
  loadTelegramConfigFromGoogle,
  saveTelegramConfigToGoogle,
  deleteTelegramConfigFromGoogle,
  TelegramConfig,
  loadFoldersFromGoogleSheets,
  saveFolderToGoogleSheets,
  deleteFolderFromGoogleSheets,
} from './googleSheetsService';
import {
  getStoredSets,
  saveStoredSets,
  getStoredFolders,
  saveStoredFolders,
  getStoredStats,
  saveStoredStats,
} from '../utils/storage';
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
        // Merge with any local sets so newly created local sets are not lost
        const localSets = getStoredSets();
        const setMap = new Map<string, StudySet>();
        sheetsSets.forEach((s) => setMap.set(s.id, s));
        localSets.forEach((ls) => {
          if (!setMap.has(ls.id)) {
            setMap.set(ls.id, ls);
          }
        });
        const merged = Array.from(setMap.values());
        saveStoredSets(merged);
        return merged;
      }
    } catch (e) {
      console.warn('[Google Sheets] Could not load sets from Google Sheets, using local storage cache:', e);
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
    if (!getCachedGoogleToken()) {
      return getStoredFolders();
    }
    try {
      const sheetsFolders = await loadFoldersFromGoogleSheets();
      if (sheetsFolders && sheetsFolders.length > 0) {
        const localFolders = getStoredFolders();
        const folderMap = new Map<string, Folder>();
        sheetsFolders.forEach((f) => folderMap.set(f.id, f));
        localFolders.forEach((lf) => {
          if (!folderMap.has(lf.id)) {
            folderMap.set(lf.id, lf);
          }
        });
        const merged = Array.from(folderMap.values());
        saveStoredFolders(merged);
        return merged;
      }
    } catch (e) {
      console.warn('[Google Sheets] Could not load folders from Google Sheets, using local storage cache:', e);
    }
    return getStoredFolders();
  },

  async saveFolder(folder: Folder): Promise<Folder> {
    const folders = getStoredFolders();
    const updated = [...folders.filter((f) => f.id !== folder.id), folder];
    saveStoredFolders(updated);

    if (getCachedGoogleToken()) {
      try {
        await saveFolderToGoogleSheets(folder);
      } catch (e) {
        console.warn('[Google Sheets] Failed saving folder to Google Sheets (saved locally):', e);
      }
    }
    return folder;
  },

  async deleteFolder(folderId: string): Promise<void> {
    const folders = getStoredFolders().filter((f) => f.id !== folderId);
    saveStoredFolders(folders);

    if (getCachedGoogleToken()) {
      try {
        await deleteFolderFromGoogleSheets(folderId);
      } catch (e) {
        console.warn('[Google Sheets] Failed deleting folder from Google Sheets (deleted locally):', e);
      }
    }
  },

  // Full Two-Way Synchronization across Sets and Folders
  async syncAll(localSets: StudySet[], localFolders: Folder[]): Promise<{ sets: StudySet[]; folders: Folder[] }> {
    const token = getCachedGoogleToken();
    if (!token) {
      return { sets: getStoredSets(), folders: getStoredFolders() };
    }

    try {
      // 1. Ensure all 4 spreadsheets exist in Drive: cards_library, cards_sets, cards_folders, cards_telegram
      await Promise.all([
        ensureCardsLibraryFile(),
        ensureCardsSetsFile(),
        ensureCardsFoldersFile(),
        ensureCardsTelegramFile(),
      ]);

      // 2. Fetch remote sets & folders from Google Sheets in parallel
      const [remoteSets, remoteFolders] = await Promise.all([
        loadSetsFromGoogleSheets(),
        loadFoldersFromGoogleSheets(),
      ]);

      // 3. Reconcile Folders
      const folderMap = new Map<string, Folder>();
      remoteFolders.forEach((f) => folderMap.set(f.id, f));

      const foldersToUpload: Folder[] = [];
      localFolders.forEach((lf) => {
        if (!folderMap.has(lf.id)) {
          folderMap.set(lf.id, lf);
          foldersToUpload.push(lf);
        }
      });
      const mergedFolders = Array.from(folderMap.values());
      saveStoredFolders(mergedFolders);

      // Upload local folders missing on Google Sheets
      for (const f of foldersToUpload) {
        saveFolderToGoogleSheets(f).catch((e) =>
          console.warn('[Google Sheets] Failed syncing folder to sheets:', e)
        );
      }

      // 4. Reconcile Sets
      const setMap = new Map<string, StudySet>();
      remoteSets.forEach((s) => setMap.set(s.id, s));

      const setsToUpload: StudySet[] = [];
      localSets.forEach((ls) => {
        const remote = setMap.get(ls.id);
        if (!remote) {
          setMap.set(ls.id, ls);
          setsToUpload.push(ls);
        } else if ((ls.updatedAt || 0) > (remote.updatedAt || 0)) {
          setMap.set(ls.id, ls);
          setsToUpload.push(ls);
        }
      });
      const mergedSets = Array.from(setMap.values());
      saveStoredSets(mergedSets);

      // Upload local sets missing on Google Sheets
      for (const s of setsToUpload) {
        saveSetToGoogleSheets(s).catch((e) =>
          console.warn('[Google Sheets] Failed syncing set to sheets:', e)
        );
      }

      console.log(`[Google Sheets] Two-way sync complete: ${mergedSets.length} sets, ${mergedFolders.length} folders.`);
      return { sets: mergedSets, folders: mergedFolders };
    } catch (err) {
      console.warn('[Google Sheets] syncAll encountered error, returning local cache:', err);
      return { sets: getStoredSets(), folders: getStoredFolders() };
    }
  },

  // Stats
  async getStats(): Promise<UserStats | null> {
    return getStoredStats();
  },

  async saveStats(stats: UserStats): Promise<void> {
    saveStoredStats(stats);
  },

  // Check and setup Google Sheets files (cards_library, cards_sets, cards_folders, cards_telegram)
  async initializeGoogleSheetsFiles(): Promise<{
    libraryFileId: string;
    setsFileId: string;
    foldersFileId: string;
    telegramFileId: string;
  }> {
    const libraryFileId = await ensureCardsLibraryFile();
    const setsFileId = await ensureCardsSetsFile();
    const foldersFileId = await ensureCardsFoldersFile();
    const telegramFileId = await ensureCardsTelegramFile();
    return { libraryFileId, setsFileId, foldersFileId, telegramFileId };
  },

  // Telegram Bot Token Configuration & Owner Access Control
  async getTelegramConfig(): Promise<TelegramConfig> {
    const token = getCachedGoogleToken();
    if (token) {
      try {
        const config = await loadTelegramConfigFromGoogle();
        if (config.botToken) {
          localStorage.setItem('cards_telegram_token', config.botToken);
          if (config.botUsername) localStorage.setItem('cards_telegram_username', config.botUsername);
          if (config.ownerUserId) localStorage.setItem('cards_telegram_owner_id', config.ownerUserId);
          if (config.ownerUsername) localStorage.setItem('cards_telegram_owner_username', config.ownerUsername);
          if (config.pairingCode) localStorage.setItem('cards_telegram_pair_code', config.pairingCode);
          return config;
        }
      } catch (e) {
        console.warn('Failed loading telegram config from Google Sheets:', e);
      }
    }
    const localToken = localStorage.getItem('cards_telegram_token') || '';
    const localUsername = localStorage.getItem('cards_telegram_username') || undefined;
    const localOwnerId = localStorage.getItem('cards_telegram_owner_id') || undefined;
    const localOwnerUsername = localStorage.getItem('cards_telegram_owner_username') || undefined;
    const localPairCode = localStorage.getItem('cards_telegram_pair_code') || undefined;
    return {
      botToken: localToken,
      botUsername: localUsername,
      ownerUserId: localOwnerId,
      ownerUsername: localOwnerUsername,
      pairingCode: localPairCode,
    };
  },

  async saveTelegramConfig(config: TelegramConfig): Promise<void> {
    const trimmed = config.botToken.trim();
    localStorage.setItem('cards_telegram_token', trimmed);
    if (config.botUsername) localStorage.setItem('cards_telegram_username', config.botUsername.trim());
    else localStorage.removeItem('cards_telegram_username');

    if (config.ownerUserId) localStorage.setItem('cards_telegram_owner_id', config.ownerUserId.trim());
    else localStorage.removeItem('cards_telegram_owner_id');

    if (config.ownerUsername) localStorage.setItem('cards_telegram_owner_username', config.ownerUsername.trim());
    else localStorage.removeItem('cards_telegram_owner_username');

    if (config.pairingCode) localStorage.setItem('cards_telegram_pair_code', config.pairingCode.trim());
    else localStorage.removeItem('cards_telegram_pair_code');

    const token = getCachedGoogleToken();
    if (token) {
      try {
        await saveTelegramConfigToGoogle(config);
      } catch (e) {
        console.warn('Failed saving telegram config to Google Sheets (saved locally):', e);
      }
    }
  },

  async deleteTelegramConfig(): Promise<void> {
    localStorage.removeItem('cards_telegram_token');
    localStorage.removeItem('cards_telegram_username');
    localStorage.removeItem('cards_telegram_owner_id');
    localStorage.removeItem('cards_telegram_owner_username');
    localStorage.removeItem('cards_telegram_pair_code');

    const token = getCachedGoogleToken();
    if (token) {
      try {
        await deleteTelegramConfigFromGoogle();
      } catch (e) {
        console.warn('Failed deleting telegram config from Google Sheets (deleted locally):', e);
      }
    }
  },
};
