import { StudySet, Folder } from '../types';
import { getCachedGoogleToken, clearGoogleToken } from './googleAuth';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

interface GoogleDriveFile {
  id: string;
  name: string;
}

// In-memory cache for resolved file IDs to minimize roundtrips and avoid picking duplicate empty files
const fileIdCache: Record<string, string> = {};
const sheetTitleCache: Record<string, string> = {};

export function clearSheetsFileCache(): void {
  Object.keys(fileIdCache).forEach((k) => delete fileIdCache[k]);
  Object.keys(sheetTitleCache).forEach((k) => delete sheetTitleCache[k]);
}

function getAuthHeaders(tokenOverride?: string): HeadersInit {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) {
    throw new Error('AUTH_MISSING');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Get the title of the first sheet in a spreadsheet (handles localized names like 'Лист1', 'Sheet1', etc.)
 */
async function getFirstSheetTitle(spreadsheetId: string, tokenOverride?: string): Promise<string> {
  if (sheetTitleCache[spreadsheetId]) {
    return sheetTitleCache[spreadsheetId];
  }
  try {
    const headers = getAuthHeaders(tokenOverride);
    const res = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties.title`, { headers });
    if (res.ok) {
      const data = await res.json();
      const title = data.sheets?.[0]?.properties?.title || 'Sheet1';
      sheetTitleCache[spreadsheetId] = title;
      return title;
    }
  } catch {
    // fallback
  }
  return 'Sheet1';
}

/**
 * Find file by name in Google Drive.
 * Uses orderBy=modifiedTime desc so if multiple copies exist, the most recently updated one is selected.
 */
async function findSpreadsheetByName(fileName: string, tokenOverride?: string): Promise<string | null> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) {
    return null;
  }

  if (fileIdCache[fileName]) {
    return fileIdCache[fileName];
  }

  let headers: HeadersInit;
  try {
    headers = getAuthHeaders(tokenOverride);
  } catch {
    return null;
  }

  // Escaping single quotes in file name for query
  const query = encodeURIComponent(`name = '${fileName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const url = `${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`;

  const res = await fetch(url, { headers });
  if (res.status === 401) {
    clearGoogleToken();
    clearSheetsFileCache();
    console.warn(`[Google Drive] Session expired or invalid (401) while querying for "${fileName}".`);
    throw new Error('AUTH_EXPIRED');
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.warn(`[Google Drive] Error querying Drive for "${fileName}":`, errorText);
    throw new Error(`Failed to query Google Drive for ${fileName}: ${res.statusText}`);
  }

  const data = await res.json();
  const files: GoogleDriveFile[] = data.files || [];
  if (files.length > 0) {
    fileIdCache[fileName] = files[0].id;
    return files[0].id;
  }
  return null;
}

/**
 * Create a new spreadsheet with the given title and initial header row
 */
async function createSpreadsheet(
  title: string,
  headersRow: string[],
  tokenOverride?: string
): Promise<string> {
  const headers = getAuthHeaders(tokenOverride);

  const body = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Sheet1',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: headersRow.map((h) => ({
                  userEnteredValue: { stringValue: h },
                })),
              },
            ],
          },
        ],
      },
    ],
  };

  const res = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    clearGoogleToken();
    throw new Error('AUTH_EXPIRED');
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.warn(`[Google Sheets] Failed to create Google Spreadsheet "${title}":`, errorText);
    throw new Error(`Failed to create spreadsheet ${title}`);
  }

  const data = await res.json();
  return data.spreadsheetId;
}

/**
 * Ensure `cards_library` spreadsheet exists.
 * Structure of cards_library:
 * - Columns: [ID, Title, Description, Cards Count, Folder, Author, Tags, Created At, Updated At]
 */
export async function ensureCardsLibraryFile(tokenOverride?: string): Promise<string> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) return '';

  let fileId = await findSpreadsheetByName('cards_library', tokenOverride);
  if (!fileId) {
    console.log('[Google Sheets] cards_library not found. Creating new spreadsheet...');
    fileId = await createSpreadsheet(
      'cards_library',
      ['Set ID', 'Title', 'Description', 'Cards Count', 'Folder', 'Author', 'Tags', 'Created At', 'Updated At'],
      tokenOverride
    );
    console.log('[Google Sheets] cards_library created with ID:', fileId);
  }
  return fileId;
}

/**
 * Ensure `cards_sets` spreadsheet exists.
 * Structure of cards_sets:
 * - Columns: [Set ID, Title, Description, Folder, Author, Tags, Terms (JSON), Created At, Updated At]
 * - Each row is a complete set.
 */
export async function ensureCardsSetsFile(tokenOverride?: string): Promise<string> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) return '';

  let fileId = await findSpreadsheetByName('cards_sets', tokenOverride);
  if (!fileId) {
    console.log('[Google Sheets] cards_sets not found. Creating new spreadsheet...');
    fileId = await createSpreadsheet(
      'cards_sets',
      ['Set ID', 'Title', 'Description', 'Folder', 'Author', 'Tags', 'Terms JSON', 'Created At', 'Updated At'],
      tokenOverride
    );
    console.log('[Google Sheets] cards_sets created with ID:', fileId);
  }
  return fileId;
}

/**
 * Ensure `cards_folders` spreadsheet exists.
 * Structure of cards_folders:
 * - Columns: [Folder ID, Name, Description, Color, Created At]
 */
export async function ensureCardsFoldersFile(tokenOverride?: string): Promise<string> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) return '';

  let fileId = await findSpreadsheetByName('cards_folders', tokenOverride);
  if (!fileId) {
    console.log('[Google Sheets] cards_folders not found. Creating new spreadsheet...');
    fileId = await createSpreadsheet(
      'cards_folders',
      ['Folder ID', 'Name', 'Description', 'Color', 'Created At'],
      tokenOverride
    );
    console.log('[Google Sheets] cards_folders created with ID:', fileId);
  }
  return fileId;
}

/**
 * Read all study sets directly from `cards_sets` in Google Sheets
 */
export async function loadSetsFromGoogleSheets(tokenOverride?: string): Promise<StudySet[]> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) {
    return [];
  }

  try {
    const setsFileId = await ensureCardsSetsFile(tokenOverride);
    if (!setsFileId) return [];

    const sheetTitle = await getFirstSheetTitle(setsFileId, tokenOverride);
    const headers = getAuthHeaders(tokenOverride);
    const range = encodeURIComponent(`'${sheetTitle}'!A2:I`);
    const url = `${SHEETS_API_BASE}/${setsFileId}/values/${range}`;

    const res = await fetch(url, { headers });
    if (res.status === 401) {
      clearGoogleToken();
      clearSheetsFileCache();
      throw new Error('AUTH_EXPIRED');
    }
    if (!res.ok) {
      console.warn('[Google Sheets] Failed to read cards_sets values:', await res.text());
      return [];
    }

    const data = await res.json();
    const rows: any[][] = data.values || [];

    const sets: StudySet[] = [];
    for (const row of rows) {
      if (!row || row.length === 0 || !row[0]) continue;
      try {
        const id = String(row[0]);
        const title = String(row[1] || 'Untitled');
        const description = String(row[2] || '');
        const folderId = row[3] ? String(row[3]) : undefined;
        const author = String(row[4] || 'you');
        
        let tags: string[] = [];
        if (row[5]) {
          try {
            tags = JSON.parse(row[5]);
          } catch {
            tags = String(row[5]).split(',').map((t) => t.trim()).filter(Boolean);
          }
        }

        let terms: any[] = [];
        if (row[6]) {
          try {
            terms = typeof row[6] === 'string' ? JSON.parse(row[6]) : row[6];
          } catch (e) {
            console.warn('Error parsing terms JSON for set', id, e);
          }
        }

        const createdAt = Number(row[7]) || (row[7] ? new Date(row[7]).getTime() : Date.now());
        const updatedAt = Number(row[8]) || (row[8] ? new Date(row[8]).getTime() : Date.now());

        sets.push({
          id,
          title,
          description,
          folderId,
          author,
          tags,
          terms: Array.isArray(terms) ? terms : [],
          createdAt,
          updatedAt,
        });
      } catch (e) {
        console.warn('Failed parsing set row from sheets:', e);
      }
    }

    // Also ensure cards_library exists
    await ensureCardsLibraryFile(tokenOverride);

    return sets;
  } catch (err: any) {
    if (err?.message === 'AUTH_EXPIRED' || err?.message === 'AUTH_MISSING') {
      return [];
    }
    console.warn('[Google Sheets] Load sets encountered non-fatal error:', err);
    return [];
  }
}

/**
 * Read all folders directly from `cards_folders` in Google Sheets
 */
export async function loadFoldersFromGoogleSheets(tokenOverride?: string): Promise<Folder[]> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) {
    return [];
  }

  try {
    const foldersFileId = await ensureCardsFoldersFile(tokenOverride);
    if (!foldersFileId) return [];

    const sheetTitle = await getFirstSheetTitle(foldersFileId, tokenOverride);
    const headers = getAuthHeaders(tokenOverride);
    const range = encodeURIComponent(`'${sheetTitle}'!A2:E`);
    const url = `${SHEETS_API_BASE}/${foldersFileId}/values/${range}`;

    const res = await fetch(url, { headers });
    if (res.status === 401) {
      clearGoogleToken();
      clearSheetsFileCache();
      throw new Error('AUTH_EXPIRED');
    }
    if (!res.ok) {
      console.warn('[Google Sheets] Failed to read cards_folders values:', await res.text());
      return [];
    }

    const data = await res.json();
    const rows: any[][] = data.values || [];

    const folders: Folder[] = [];
    for (const row of rows) {
      if (!row || row.length === 0 || !row[0]) continue;
      try {
        const id = String(row[0]);
        const name = String(row[1] || 'New Folder');
        const description = row[2] ? String(row[2]) : undefined;
        const color = String(row[3] || 'indigo');
        const createdAt = Number(row[4]) || (row[4] ? new Date(row[4]).getTime() : Date.now());

        folders.push({
          id,
          name,
          description,
          color,
          createdAt,
        });
      } catch (e) {
        console.warn('Failed parsing folder row from sheets:', e);
      }
    }

    return folders;
  } catch (err: any) {
    if (err?.message === 'AUTH_EXPIRED' || err?.message === 'AUTH_MISSING') {
      return [];
    }
    console.warn('[Google Sheets] Load folders encountered non-fatal error:', err);
    return [];
  }
}

/**
 * Save a set to Google Sheets:
 * 1. Ensure `cards_library` exists and update or append summary row
 * 2. Ensure `cards_sets` exists and update or append full row (with Terms JSON)
 */
export async function saveSetToGoogleSheets(set: StudySet, tokenOverride?: string): Promise<void> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) return;

  try {
    const libraryFileId = await ensureCardsLibraryFile(tokenOverride);
    const setsFileId = await ensureCardsSetsFile(tokenOverride);
    if (!libraryFileId || !setsFileId) return;

    const headers = getAuthHeaders(tokenOverride);
    const setsSheetTitle = await getFirstSheetTitle(setsFileId, tokenOverride);
    const libSheetTitle = await getFirstSheetTitle(libraryFileId, tokenOverride);

    // 1. Process `cards_sets`
    const setsRange = encodeURIComponent(`'${setsSheetTitle}'!A2:A`);
    const setsRangeUrl = `${SHEETS_API_BASE}/${setsFileId}/values/${setsRange}`;
    const existingSetsRes = await fetch(setsRangeUrl, { headers });
    if (existingSetsRes.status === 401) {
      clearGoogleToken();
      clearSheetsFileCache();
      throw new Error('AUTH_EXPIRED');
    }
    const existingSetsData = await existingSetsRes.json();
    const existingSetsRows: string[][] = existingSetsData.values || [];

    let setRowIndex = -1;
    for (let i = 0; i < existingSetsRows.length; i++) {
      if (existingSetsRows[i][0] === set.id) {
        setRowIndex = i + 2; // Row number 1-indexed (A2 = row 2)
        break;
      }
    }

    const setRowValues = [
      set.id,
      set.title,
      set.description || '',
      set.folderId || '',
      set.author || 'you',
      JSON.stringify(set.tags || []),
      JSON.stringify(set.terms || []),
      set.createdAt || Date.now(),
      set.updatedAt || Date.now(),
    ];

    if (setRowIndex > 0) {
      // Update existing row
      const updateRange = encodeURIComponent(`'${setsSheetTitle}'!A${setRowIndex}:I${setRowIndex}`);
      const updateUrl = `${SHEETS_API_BASE}/${setsFileId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
      await fetch(updateUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ values: [setRowValues] }),
      });
    } else {
      // Append new row
      const appendRange = encodeURIComponent(`'${setsSheetTitle}'!A:I`);
      const appendUrl = `${SHEETS_API_BASE}/${setsFileId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      await fetch(appendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ values: [setRowValues] }),
      });
    }

    // 2. Process `cards_library` (summary file)
    const libRange = encodeURIComponent(`'${libSheetTitle}'!A2:A`);
    const libRangeUrl = `${SHEETS_API_BASE}/${libraryFileId}/values/${libRange}`;
    const existingLibRes = await fetch(libRangeUrl, { headers });
    if (existingLibRes.status === 401) {
      clearGoogleToken();
      clearSheetsFileCache();
      throw new Error('AUTH_EXPIRED');
    }
    const existingLibData = await existingLibRes.json();
    const existingLibRows: string[][] = existingLibData.values || [];

    let libRowIndex = -1;
    for (let i = 0; i < existingLibRows.length; i++) {
      if (existingLibRows[i][0] === set.id) {
        libRowIndex = i + 2;
        break;
      }
    }

    const libRowValues = [
      set.id,
      set.title,
      set.description || '',
      set.terms?.length || 0,
      set.folderId || '',
      set.author || 'you',
      (set.tags || []).join(', '),
      new Date(set.createdAt).toLocaleDateString(),
      new Date(set.updatedAt).toLocaleDateString(),
    ];

    if (libRowIndex > 0) {
      const updateRange = encodeURIComponent(`'${libSheetTitle}'!A${libRowIndex}:I${libRowIndex}`);
      const updateUrl = `${SHEETS_API_BASE}/${libraryFileId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
      await fetch(updateUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ values: [libRowValues] }),
      });
    } else {
      const appendRange = encodeURIComponent(`'${libSheetTitle}'!A:I`);
      const appendUrl = `${SHEETS_API_BASE}/${libraryFileId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      await fetch(appendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ values: [libRowValues] }),
      });
    }

    console.log(`[Google Sheets] Set "${set.title}" successfully synced to cards_library and cards_sets!`);
  } catch (e: any) {
    if (e?.message === 'AUTH_EXPIRED') {
      console.warn('[Google Sheets] Google session expired during save. Changes preserved locally.');
      return;
    }
    console.warn('[Google Sheets] Failed saving to Google Sheets (saved locally):', e);
  }
}

/**
 * Save a folder to Google Sheets (`cards_folders`)
 */
export async function saveFolderToGoogleSheets(folder: Folder, tokenOverride?: string): Promise<void> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) return;

  try {
    const foldersFileId = await ensureCardsFoldersFile(tokenOverride);
    if (!foldersFileId) return;

    const headers = getAuthHeaders(tokenOverride);
    const sheetTitle = await getFirstSheetTitle(foldersFileId, tokenOverride);

    const range = encodeURIComponent(`'${sheetTitle}'!A2:A`);
    const checkUrl = `${SHEETS_API_BASE}/${foldersFileId}/values/${range}`;
    const checkRes = await fetch(checkUrl, { headers });
    if (checkRes.status === 401) {
      clearGoogleToken();
      clearSheetsFileCache();
      throw new Error('AUTH_EXPIRED');
    }
    const checkData = await checkRes.json();
    const rows: string[][] = checkData.values || [];

    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === folder.id) {
        rowIndex = i + 2;
        break;
      }
    }

    const folderRow = [
      folder.id,
      folder.name,
      folder.description || '',
      folder.color || 'indigo',
      folder.createdAt || Date.now(),
    ];

    if (rowIndex > 0) {
      const updateRange = encodeURIComponent(`'${sheetTitle}'!A${rowIndex}:E${rowIndex}`);
      const updateUrl = `${SHEETS_API_BASE}/${foldersFileId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
      await fetch(updateUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ values: [folderRow] }),
      });
    } else {
      const appendRange = encodeURIComponent(`'${sheetTitle}'!A:E`);
      const appendUrl = `${SHEETS_API_BASE}/${foldersFileId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      await fetch(appendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ values: [folderRow] }),
      });
    }

    console.log(`[Google Sheets] Folder "${folder.name}" successfully synced to cards_folders!`);
  } catch (e: any) {
    if (e?.message === 'AUTH_EXPIRED') {
      console.warn('[Google Sheets] Google session expired during folder save.');
      return;
    }
    console.warn('[Google Sheets] Failed saving folder to Google Sheets:', e);
  }
}

/**
 * Delete a folder from Google Sheets (`cards_folders`)
 */
export async function deleteFolderFromGoogleSheets(folderId: string, tokenOverride?: string): Promise<void> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) return;

  try {
    const foldersFileId = await ensureCardsFoldersFile(tokenOverride);
    if (!foldersFileId) return;

    const headers = getAuthHeaders(tokenOverride);
    const sheetTitle = await getFirstSheetTitle(foldersFileId, tokenOverride);

    const range = encodeURIComponent(`'${sheetTitle}'!A2:A`);
    const checkUrl = `${SHEETS_API_BASE}/${foldersFileId}/values/${range}`;
    const checkRes = await fetch(checkUrl, { headers });
    if (checkRes.status === 401) {
      clearGoogleToken();
      clearSheetsFileCache();
      return;
    }
    const checkData = await checkRes.json();
    const rows: string[][] = checkData.values || [];

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === folderId) {
        const rowNum = i + 2;
        const clearRange = encodeURIComponent(`'${sheetTitle}'!A${rowNum}:E${rowNum}`);
        await fetch(`${SHEETS_API_BASE}/${foldersFileId}/values/${clearRange}:clear`, {
          method: 'POST',
          headers,
        });
        break;
      }
    }
  } catch (err) {
    console.warn('[Google Sheets] Failed deleting folder from sheets:', err);
  }
}

/**
 * SECURITY INVARIANT: File deletion on Google Drive is strictly forbidden.
 * The application is only authorized to read, create, and modify rows within
 * the user's study set spreadsheets (cards_library & cards_sets).
 * File deletion endpoints (e.g., DELETE /drive/v3/files/{id}) must NEVER be called.
 */
export function deleteFileFromGoogleDrive(): never {
  throw new Error(
    'SECURITY POLICY VIOLATION: Deleting files on Google Drive is strictly prohibited. The app can only create and modify study set spreadsheets.'
  );
}

/**
 * Delete a set from Google Sheets (clears only the specific table row in cards_sets and cards_library).
 * Note: The spreadsheet files themselves on Google Drive are NEVER deleted.
 */
export async function deleteSetFromGoogleSheets(setId: string, tokenOverride?: string): Promise<void> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) return;

  try {
    const libraryFileId = await ensureCardsLibraryFile(tokenOverride);
    const setsFileId = await ensureCardsSetsFile(tokenOverride);
    if (!libraryFileId || !setsFileId) return;

    const headers = getAuthHeaders(tokenOverride);
    const setsSheetTitle = await getFirstSheetTitle(setsFileId, tokenOverride);
    const libSheetTitle = await getFirstSheetTitle(libraryFileId, tokenOverride);

    // Clear in cards_sets
    try {
      const setsRange = encodeURIComponent(`'${setsSheetTitle}'!A2:A`);
      const setsRes = await fetch(`${SHEETS_API_BASE}/${setsFileId}/values/${setsRange}`, { headers });
      if (setsRes.status === 401) {
        clearGoogleToken();
        clearSheetsFileCache();
        return;
      }
      const setsData = await setsRes.json();
      const rows: string[][] = setsData.values || [];
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === setId) {
          const rowNum = i + 2;
          const clearRange = encodeURIComponent(`'${setsSheetTitle}'!A${rowNum}:I${rowNum}`);
          await fetch(`${SHEETS_API_BASE}/${setsFileId}/values/${clearRange}:clear`, {
            method: 'POST',
            headers,
          });
          break;
        }
      }
    } catch (e) {
      console.warn('Error clearing set from cards_sets:', e);
    }

    // Clear in cards_library
    try {
      const libRange = encodeURIComponent(`'${libSheetTitle}'!A2:A`);
      const libRes = await fetch(`${SHEETS_API_BASE}/${libraryFileId}/values/${libRange}`, { headers });
      if (libRes.status === 401) {
        clearGoogleToken();
        clearSheetsFileCache();
        return;
      }
      const libData = await libRes.json();
      const rows: string[][] = libData.values || [];
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === setId) {
          const rowNum = i + 2;
          const clearRange = encodeURIComponent(`'${libSheetTitle}'!A${rowNum}:I${rowNum}`);
          await fetch(`${SHEETS_API_BASE}/${libraryFileId}/values/${clearRange}:clear`, {
            method: 'POST',
            headers,
          });
          break;
        }
      }
    } catch (e) {
      console.warn('Error clearing set from cards_library:', e);
    }
  } catch (err) {
    console.warn('[Google Sheets] Failed deleting set from sheets (deleted locally):', err);
  }
}

/**
 * Ensure `cards_telegram` spreadsheet exists on Google Drive.
 * Structure of cards_telegram:
 * - Columns: [Key, Value, Updated At]
 * - Contains the Telegram Bot Token for controlling the app via Telegram.
 */
export async function ensureCardsTelegramFile(tokenOverride?: string): Promise<string> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) return '';

  let fileId = await findSpreadsheetByName('cards_telegram', tokenOverride);
  if (!fileId) {
    console.log('[Google Sheets] cards_telegram not found. Creating new spreadsheet on Google Drive...');
    fileId = await createSpreadsheet(
      'cards_telegram',
      ['Key', 'Value', 'Updated At'],
      tokenOverride
    );
    console.log('[Google Sheets] cards_telegram created with ID:', fileId);

    // Seed default rows
    try {
      const headers = getAuthHeaders(tokenOverride);
      const sheetTitle = await getFirstSheetTitle(fileId, tokenOverride);
      const range = encodeURIComponent(`'${sheetTitle}'!A2:C3`);
      const updateUrl = `${SHEETS_API_BASE}/${fileId}/values/${range}?valueInputOption=USER_ENTERED`;
      await fetch(updateUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          values: [
            ['bot_token', '', new Date().toISOString()],
            ['bot_username', '', new Date().toISOString()],
          ],
        }),
      });
    } catch (e) {
      console.warn('[Google Sheets] Failed to initialize default rows in cards_telegram:', e);
    }
  }
  return fileId;
}

export interface TelegramConfig {
  botToken: string;
  botUsername?: string;
  ownerUserId?: string;
  ownerUsername?: string;
  pairingCode?: string;
}

/**
 * Load Telegram bot configuration from `cards_telegram` in Google Sheets
 */
export async function loadTelegramConfigFromGoogle(
  tokenOverride?: string
): Promise<TelegramConfig> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) {
    return { botToken: '' };
  }

  try {
    const fileId = await ensureCardsTelegramFile(tokenOverride);
    if (!fileId) return { botToken: '' };

    const sheetTitle = await getFirstSheetTitle(fileId, tokenOverride);
    const headers = getAuthHeaders(tokenOverride);
    const range = encodeURIComponent(`'${sheetTitle}'!A2:C10`);
    const url = `${SHEETS_API_BASE}/${fileId}/values/${range}`;

    const res = await fetch(url, { headers });
    if (res.status === 401) {
      clearGoogleToken();
      clearSheetsFileCache();
      throw new Error('AUTH_EXPIRED');
    }
    if (!res.ok) {
      return { botToken: '' };
    }

    const data = await res.json();
    const rows: string[][] = data.values || [];

    const config: TelegramConfig = {
      botToken: '',
    };

    rows.forEach((row) => {
      const key = (row[0] || '').trim();
      const val = (row[1] || '').trim();
      if (key === 'bot_token') config.botToken = val;
      if (key === 'bot_username') config.botUsername = val || undefined;
      if (key === 'owner_user_id') config.ownerUserId = val || undefined;
      if (key === 'owner_username') config.ownerUsername = val || undefined;
      if (key === 'pairing_code') config.pairingCode = val || undefined;
    });

    return config;
  } catch (err) {
    console.warn('[Google Sheets] Failed loading telegram config:', err);
    return { botToken: '' };
  }
}

/**
 * Save or update Telegram bot token and owner access config in `cards_telegram` in Google Sheets
 */
export async function saveTelegramConfigToGoogle(
  config: TelegramConfig,
  tokenOverride?: string
): Promise<void> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) return;

  const fileId = await ensureCardsTelegramFile(tokenOverride);
  if (!fileId) return;

  const sheetTitle = await getFirstSheetTitle(fileId, tokenOverride);
  const headers = getAuthHeaders(tokenOverride);
  const range = encodeURIComponent(`'${sheetTitle}'!A2:C6`);
  const updateUrl = `${SHEETS_API_BASE}/${fileId}/values/${range}?valueInputOption=USER_ENTERED`;

  const values = [
    ['bot_token', config.botToken.trim(), new Date().toISOString()],
    ['bot_username', (config.botUsername || '').trim(), new Date().toISOString()],
    ['owner_user_id', (config.ownerUserId || '').trim(), new Date().toISOString()],
    ['owner_username', (config.ownerUsername || '').trim(), new Date().toISOString()],
    ['pairing_code', (config.pairingCode || '').trim(), new Date().toISOString()],
  ];

  const res = await fetch(updateUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    throw new Error(`Failed to save Telegram config to Google Sheets: ${res.statusText}`);
  }
}

/**
 * Clear/delete Telegram bot token from `cards_telegram` in Google Sheets
 */
export async function deleteTelegramConfigFromGoogle(tokenOverride?: string): Promise<void> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) return;

  const fileId = await ensureCardsTelegramFile(tokenOverride);
  if (!fileId) return;

  const sheetTitle = await getFirstSheetTitle(fileId, tokenOverride);
  const headers = getAuthHeaders(tokenOverride);
  const range = encodeURIComponent(`'${sheetTitle}'!A2:C6`);
  const updateUrl = `${SHEETS_API_BASE}/${fileId}/values/${range}?valueInputOption=USER_ENTERED`;

  const values = [
    ['bot_token', '', new Date().toISOString()],
    ['bot_username', '', new Date().toISOString()],
    ['owner_user_id', '', new Date().toISOString()],
    ['owner_username', '', new Date().toISOString()],
    ['pairing_code', '', new Date().toISOString()],
  ];

  await fetch(updateUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ values }),
  });
}

