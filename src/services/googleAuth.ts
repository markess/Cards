import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged, User } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(config);
export const auth = getAuth(app);

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

export const googleProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => googleProvider.addScope(scope));
// Allow account selection if user wants to switch
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

let cachedAccessToken: string | null = null;
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minutes (Google OAuth tokens expire in 60 min)

export class GoogleAuthExpiredError extends Error {
  constructor(message = 'Google OAuth session expired. Please sign in again.') {
    super(message);
    this.name = 'GoogleAuthExpiredError';
  }
}

export async function signInWithGoogleOAuth(): Promise<{ user: User; accessToken: string }> {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error('Could not obtain Google OAuth access token for Google Drive and Google Sheets.');
  }

  cachedAccessToken = accessToken;
  try {
    sessionStorage.setItem('google_workspace_token', accessToken);
    sessionStorage.setItem('google_workspace_token_timestamp', String(Date.now()));
  } catch (e) {
    // Storage quota or private mode fallback
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cards_google_token_updated', { detail: { accessToken } }));
  }

  return { user: result.user, accessToken };
}

export function getCachedGoogleToken(): string | null {
  if (cachedAccessToken) return cachedAccessToken;

  try {
    const stored = sessionStorage.getItem('google_workspace_token');
    const storedTime = Number(sessionStorage.getItem('google_workspace_token_timestamp') || 0);

    if (stored) {
      if (storedTime && Date.now() - storedTime > TOKEN_TTL_MS) {
        clearGoogleToken();
        return null;
      }
      cachedAccessToken = stored;
      return stored;
    }
  } catch (e) {
    // Ignore
  }

  return null;
}

export function hasActiveGoogleToken(): boolean {
  return !!getCachedGoogleToken();
}

export function clearGoogleToken(): void {
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('google_workspace_token');
    sessionStorage.removeItem('google_workspace_token_timestamp');
  } catch (e) {
    // Ignore
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cards_google_token_expired'));
  }
}

export async function signOutGoogle(): Promise<void> {
  clearGoogleToken();
  await fbSignOut(auth);
}
