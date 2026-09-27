import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
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

// Flag to track sign-in state
let isSigningIn = false;
// Cache the access token in memory (per workspace-integration instructions)
let cachedAccessToken: string | null = null;

// Remove legacy stored tokens that may have expired
try {
  sessionStorage.removeItem('google_workspace_token');
  localStorage.removeItem('google_workspace_token');
} catch (e) {
  // ignore
}

export type AuthListener = (hasToken: boolean, user: User | null) => void;
const listeners = new Set<AuthListener>();

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  listener(!!cachedAccessToken, auth.currentUser);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(user: User | null) {
  listeners.forEach((l) => l(!!cachedAccessToken, user));
}

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      notifyListeners(user);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
        notifyListeners(user);
      }
    }
  });
};

export async function signInWithGoogleOAuth(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error('Could not obtain Google OAuth access token for Google Drive and Google Sheets.');
    }

    cachedAccessToken = accessToken;
    notifyListeners(result.user);
    return { user: result.user, accessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getCachedGoogleToken(): string | null {
  return cachedAccessToken;
}

export function clearGoogleToken(): void {
  cachedAccessToken = null;
  notifyListeners(auth.currentUser);
}

export async function signOutGoogle(): Promise<void> {
  clearGoogleToken();
  await fbSignOut(auth);
  notifyListeners(null);
}
