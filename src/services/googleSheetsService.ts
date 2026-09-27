import { StudySet, Folder } from '../types';
import { getCachedGoogleToken, clearGoogleToken } from './googleAuth';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

interface GoogleDriveFile {
  id: string;
  name: string;
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
 * Find file by name in Google Drive
 */
async function findSpreadsheetByName(fileName: string, tokenOverride?: string): Promise<string | null> {
  const token = tokenOverride || getCachedGoogleToken();
  if (!token) {
    return null;
  }

  let headers: HeadersInit;
  try {
    headers = getAuthHeaders(tokenOverride);
  } catch {
    return null;
  }

  // Escaping single quotes in file name for query
  const query = encodeURIComponent(`name = '${fileName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const url = `${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name)&spaces=drive`;

  const res = await fetch(url, { headers });
  if (res.status === 401) {
    clearGoogleToken();
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

    const headers = getAuthHeaders(tokenOverride);
    const range = 'Sheet1!A2:I';
    const url = `${SHEETS_API_BASE}/${setsFileId}/values/${range}`;

    const res = await fetch(url, { headers });
    if (res.status === 401) {
      clearGoogleToken();
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
            terms = JSON.parse(row[6]);
          } catch (e) {
            console.warn('Error parsing terms JSON for set', id, e);
          }
        }

        const createdAt = Number(row[7]) || Date.now();
        const updatedAt = Number(row[8]) || Date.now();

        sets.push({
          id,
          title,
          description,
          folderId,
          author,
          tags,
          terms,
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

    // 1. Process `cards_sets`
    const setsRangeUrl = `${SHEETS_API_BASE}/${setsFileId}/values/Sheet1!A2:A`;
    const existingSetsRes = await fetch(setsRangeUrl, { headers });
    if (existingSetsRes.status === 401) {
      clearGoogleToken();
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
      const updateUrl = `${SHEETS_API_BASE}/${setsFileId}/values/Sheet1!A${setRowIndex}:I${setRowIndex}?valueInputOption=USER_ENTERED`;
      await fetch(updateUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ values: [setRowValues] }),
      });
    } else {
      // Append new row
      const appendUrl = `${SHEETS_API_BASE}/${setsFileId}/values/Sheet1!A:I:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      await fetch(appendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ values: [setRowValues] }),
      });
    }

    // 2. Process `cards_library` (summary file)
    const libRangeUrl = `${SHEETS_API_BASE}/${libraryFileId}/values/Sheet1!A2:A`;
    const existingLibRes = await fetch(libRangeUrl, { headers });
    if (existingLibRes.status === 401) {
      clearGoogleToken();
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
      const updateUrl = `${SHEETS_API_BASE}/${libraryFileId}/values/Sheet1!A${libRowIndex}:I${libRowIndex}?valueInputOption=USER_ENTERED`;
      await fetch(updateUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ values: [libRowValues] }),
      });
    } else {
      const appendUrl = `${SHEETS_API_BASE}/${libraryFileId}/values/Sheet1!A:I:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
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

    // Clear in cards_sets
    try {
      const setsRes = await fetch(`${SHEETS_API_BASE}/${setsFileId}/values/Sheet1!A2:A`, { headers });
      if (setsRes.status === 401) {
        clearGoogleToken();
        return;
      }
      const setsData = await setsRes.json();
      const rows: string[][] = setsData.values || [];
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === setId) {
          const rowNum = i + 2;
          await fetch(`${SHEETS_API_BASE}/${setsFileId}/values/Sheet1!A${rowNum}:I${rowNum}:clear`, {
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
      const libRes = await fetch(`${SHEETS_API_BASE}/${libraryFileId}/values/Sheet1!A2:A`, { headers });
      if (libRes.status === 401) {
        clearGoogleToken();
        return;
      }
      const libData = await libRes.json();
      const rows: string[][] = libData.values || [];
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === setId) {
          const rowNum = i + 2;
          await fetch(`${SHEETS_API_BASE}/${libraryFileId}/values/Sheet1!A${rowNum}:I${rowNum}:clear`, {
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
