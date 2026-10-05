import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Mail, 
  CheckCircle2, 
  LogOut, 
  ArrowRight,
  Loader2,
  HardDrive
} from 'lucide-react';
import { AuthUser } from '../types';
import { signInWithGoogleOAuth, signOutGoogle } from '../services/googleAuth';
import {
  ensureCardsLibraryFile,
  ensureCardsSetsFile,
  ensureCardsFoldersFile,
  ensureCardsTelegramFile,
} from '../services/googleSheetsService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onLogin: (user: AuthUser) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Opening Google account selector...');

    try {
      // 1. Google OAuth popup: user selects their browser account
      const { user, accessToken } = await signInWithGoogleOAuth();

      const userEmail = (user.email || emailInput).trim().toLowerCase();
      const userName = user.displayName || userEmail.split('@')[0];
      const userPicture = user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userEmail)}`;

      setStatusMessage('Checking Google Drive for "cards_library", "cards_sets", "cards_folders" & "cards_telegram"...');

      // 2. Check or create cards_library, cards_sets, cards_folders, and cards_telegram files in Google Drive / Sheets
      await ensureCardsLibraryFile(accessToken);
      await ensureCardsSetsFile(accessToken);
      await ensureCardsFoldersFile(accessToken);
      await ensureCardsTelegramFile(accessToken);

      const authUser: AuthUser = {
        id: user.uid,
        email: userEmail,
        name: userName,
        picture: userPicture,
        role: 'user',
        createdAt: Date.now(),
      };

      setStatusMessage('Connected successfully! Spreadsheets verified.');
      onLogin(authUser);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMessage(err.message || 'Error authenticating with Google account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutGoogle();
      onLogout();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Google Sheets Connection
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                cards_library, cards_sets &amp; cards_folders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {currentUser ? (
            /* Logged in view */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
                <img
                  src={currentUser.picture || 'https://api.dicebear.com/7.x/avataaars/svg'}
                  alt=""
                  className="w-10 h-10 rounded-full border border-emerald-500"
                />
                <div className="overflow-hidden">
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span>{currentUser.email}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                  <HardDrive className="w-4 h-4" />
                  <span>Google Drive Connected</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your sets are automatically saved to <strong>cards_library</strong> and <strong>cards_sets</strong> spreadsheets in your personal Google Drive.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect Google Account</span>
              </button>
            </div>
          ) : (
            /* Sign In view: ONLY Sign in with Google Account button + optional email prompt */
            <div className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your-name@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Enter your email or simply click below to choose any active Google account from your browser.
                </p>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs">
                    {errorMessage}
                  </div>
                )}

                {statusMessage && (
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <span>{statusMessage}</span>
                  </div>
                )}

                {/* THE ONLY BUTTON */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2.5 active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting Google Sheets...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Sign in with Google Account</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                Connects directly to your Google Sheets without any backend database or user limits.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
