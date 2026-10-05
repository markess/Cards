/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthUser, Folder, StudyMode, StudySet, UserStats } from './types';
import {
  getStoredFolders,
  getStoredSets,
  getStoredStats,
  recordMatchWon,
  recordStudySession,
  recordTestCompleted,
  saveStoredFolders,
  saveStoredSets,
  saveStoredStats,
} from './utils/storage';
import { api } from './services/api';
import { signInWithGoogleOAuth, signOutGoogle, getCachedGoogleToken, subscribeAuth } from './services/googleAuth';
import { Navbar } from './components/Navbar';
import { SetList } from './components/SetList';
import { SetDetail } from './components/SetDetail';
import { SetEditor } from './components/SetEditor';
import { QuentiImportModal } from './components/QuentiImportModal';
import { ExportModal } from './components/ExportModal';
import { FolderModal } from './components/FolderModal';
import { AuthModal } from './components/AuthModal';
import { FlashcardsMode } from './components/StudyModes/FlashcardsMode';
import { LearnMode } from './components/StudyModes/LearnMode';
import { MatchMode } from './components/StudyModes/MatchMode';
import { TestMode } from './components/StudyModes/TestMode';
import { WriteMode } from './components/StudyModes/WriteMode';
import { AboutView } from './components/AboutView';
import { FileSpreadsheet, ArrowRight, Loader2, Sparkles, Info, CheckCircle2 } from 'lucide-react';

type ViewState =
  | { view: 'home' }
  | { view: 'set-detail'; setId: string }
  | { view: 'edit-set'; setId?: string }
  | { view: 'study'; setId: string; mode: StudyMode }
  | { view: 'about' };

export default function App() {
  // Current logged in Google user
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('cards_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const [sets, setSets] = useState<StudySet[]>(() => getStoredSets());
  const [folders, setFolders] = useState<Folder[]>(() => getStoredFolders());
  const [stats, setStats] = useState<UserStats>(() => getStoredStats());
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(() => !!getCachedGoogleToken());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewState, setViewState] = useState<ViewState>({ view: 'home' });

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [exportSetTarget, setExportSetTarget] = useState<StudySet | null>(null);

  // Subscribe to auth state changes for Google token
  useEffect(() => {
    return subscribeAuth((hasToken) => {
      setHasGoogleToken(hasToken);
    });
  }, []);

  // Theme state: default dark mode
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('cards_theme');
    if (saved) return saved === 'dark';
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cards_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cards_theme', 'light');
    }
  }, [isDark]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Full two-way synchronization for Sets and Folders
  const performSync = useCallback(async (showToast = false) => {
    const hasToken = !!getCachedGoogleToken();
    if (!currentUser || !hasToken) return;

    setIsSyncing(true);
    setConnectionStatus('Синхронизация карточек и папок с Google Sheets...');
    try {
      const currentSets = getStoredSets();
      const currentFolders = getStoredFolders();
      const { sets: mergedSets, folders: mergedFolders } = await api.syncAll(currentSets, currentFolders);
      setSets(mergedSets);
      setFolders(mergedFolders);
      setConnectionStatus(null);
      if (showToast) {
        setSyncToast({
          message: `Синхронизировано: ${mergedSets.length} сетов, ${mergedFolders.length} папок`,
          type: 'success',
        });
        setTimeout(() => setSyncToast(null), 3500);
      }
    } catch (e) {
      console.warn('Sync failed:', e);
      setConnectionStatus(null);
      if (showToast) {
        setSyncToast({
          message: 'Ошибка синхронизации с Google Sheets. Попробуйте снова.',
          type: 'error',
        });
        setTimeout(() => setSyncToast(null), 3500);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser]);

  // Synchronize whenever user is logged in AND has an active Google token
  useEffect(() => {
    if (currentUser && hasGoogleToken) {
      performSync(false);
    }
  }, [currentUser, hasGoogleToken, performSync]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Directly sign in with Google account & setup cards_library / cards_sets / cards_folders
  const handleDirectSignIn = async () => {
    setIsConnectingGoogle(true);
    setConnectionStatus('Opening Google account selector...');
    try {
      const { user } = await signInWithGoogleOAuth();
      const userEmail = (user.email || '').trim().toLowerCase();
      const userName = user.displayName || userEmail.split('@')[0];
      const userPicture = user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userEmail)}`;

      setConnectionStatus('Проверка Google Drive (cards_library, cards_sets, cards_folders)...');
      await api.initializeGoogleSheetsFiles();

      const authUser: AuthUser = {
        id: user.uid,
        email: userEmail,
        name: userName,
        picture: userPicture,
        role: 'user',
        createdAt: Date.now(),
      };

      setCurrentUser(authUser);
      localStorage.setItem('cards_auth_user', JSON.stringify(authUser));

      // Refresh and two-way sync all sets and folders
      await performSync(true);
      setConnectionStatus(null);
    } catch (e: any) {
      console.error('Direct Google Sign-in Error:', e);
      setConnectionStatus(null);
      // Open modal if user wants to see error details or retry
      setIsAuthOpen(true);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Login handler
  const handleLogin = async (user: AuthUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('cards_auth_user', JSON.stringify(user));
      await performSync(true);
    } catch (e) {
      console.error(e);
    }
  };

  // Sign out
  const handleLogout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('cards_auth_user');
    await signOutGoogle();
    setViewState({ view: 'home' });
    setIsAuthOpen(false);
  };

  // Handle study session stats recording
  const handleRecordStudy = useCallback((cardsCount: number) => {
    const updated = recordStudySession(cardsCount);
    setStats(updated);
    api.saveStats(updated);
  }, []);

  const handleRecordTestCompleted = useCallback(() => {
    recordTestCompleted();
    const updated = getStoredStats();
    setStats(updated);
    api.saveStats(updated);
  }, []);

  const handleRecordMatchWon = useCallback(() => {
    recordMatchWon();
    const updated = getStoredStats();
    setStats(updated);
    api.saveStats(updated);
  }, []);

  // Set selection and study mode navigation
  const handleSelectSet = (set: StudySet, defaultMode: StudyMode = 'overview') => {
    if (defaultMode === 'overview') {
      setViewState({ view: 'set-detail', setId: set.id });
    } else {
      setViewState({ view: 'study', setId: set.id, mode: defaultMode });
    }
  };

  // Star / unstar term in a set
  const handleToggleTermStarred = async (setId: string, termId: string, starred: boolean) => {
    const targetSet = sets.find((s) => s.id === setId);
    if (!targetSet) return;

    const updatedSet: StudySet = {
      ...targetSet,
      updatedAt: Date.now(),
      terms: targetSet.terms.map((t) => (t.id === termId ? { ...t, starred } : t)),
    };

    const newSets = sets.map((s) => (s.id === setId ? updatedSet : s));
    setSets(newSets);
    saveStoredSets(newSets);

    try {
      await api.saveSet(updatedSet);
    } catch (e) {
      console.error('Failed to sync starred term to Google Sheets:', e);
    }
  };

  // Save new / updated set (synced to cards_library and cards_sets)
  const handleSaveSet = async (savedSet: StudySet) => {
    const exists = sets.some((s) => s.id === savedSet.id);
    let updated: StudySet[];
    if (exists) {
      updated = sets.map((s) => (s.id === savedSet.id ? savedSet : s));
    } else {
      updated = [savedSet, ...sets];
    }
    setSets(updated);
    saveStoredSets(updated);
    setViewState({ view: 'set-detail', setId: savedSet.id });

    try {
      await api.saveSet(savedSet);
    } catch (e) {
      console.error('Failed to save set to Google Sheets:', e);
    }
  };

  // Delete set
  const handleDeleteSet = async (setId: string) => {
    const updated = sets.filter((s) => s.id !== setId);
    setSets(updated);
    saveStoredSets(updated);
    setViewState({ view: 'home' });

    try {
      await api.deleteSet(setId);
    } catch (e) {
      console.error('Failed to delete set from Google Sheets:', e);
    }
  };

  // Import set from Quenti
  const handleImportSet = async (imported: StudySet) => {
    const updated = [imported, ...sets];
    setSets(updated);
    saveStoredSets(updated);
    setViewState({ view: 'set-detail', setId: imported.id });

    try {
      await api.saveSet(imported);
    } catch (e) {
      console.error('Failed to save imported set to Google Sheets:', e);
    }
  };

  // Create folder
  const handleCreateFolder = async (newFolder: Folder) => {
    const updated = [...folders, newFolder];
    setFolders(updated);
    saveStoredFolders(updated);

    try {
      await api.saveFolder(newFolder);
    } catch (e) {
      console.error('Failed to save folder:', e);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId: string) => {
    const updated = folders.filter((f) => f.id !== folderId);
    setFolders(updated);
    saveStoredFolders(updated);

    try {
      await api.deleteFolder(folderId);
    } catch (e) {
      console.error('Failed to delete folder:', e);
    }
  };

  // Active current set lookup
  const currentSet =
    viewState.view === 'set-detail' || viewState.view === 'study'
      ? sets.find((s) => s.id === viewState.setId)
      : viewState.view === 'edit-set' && viewState.setId
      ? sets.find((s) => s.id === viewState.setId)
      : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCreate={() => {
          if (!currentUser) {
            handleDirectSignIn();
            return;
          }
          setViewState({ view: 'edit-set' });
        }}
        onOpenImport={() => {
          if (!currentUser) {
            handleDirectSignIn();
            return;
          }
          setIsImportOpen(true);
        }}
        onOpenFolderModal={() => {
          if (!currentUser) {
            handleDirectSignIn();
            return;
          }
          setIsFolderOpen(true);
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onNavigateHome={() => {
          setSearchQuery('');
          setViewState({ view: 'home' });
        }}
        onNavigateAbout={() => setViewState({ view: 'about' })}
        currentView={viewState.view}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onSync={() => performSync(true)}
        isSyncing={isSyncing}
      />

      {/* Sync Status Toast */}
      {syncToast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade-in pointer-events-none">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 ${
              syncToast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/30'
                : 'bg-red-600 text-white border-red-700 shadow-red-600/30'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncToast.message}</span>
          </div>
        </div>
      )}

      {/* Session notice banner if Google token is not active in memory */}
      {currentUser && !hasGoogleToken && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Google Drive sync paused. Your flashcards are safely available and saved locally on this device.</span>
          </div>
          <button
            onClick={handleDirectSignIn}
            disabled={isConnectingGoogle}
            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            {isConnectingGoogle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            <span>Reconnect Google Drive</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {viewState.view === 'about' ? (
          <AboutView
            currentUser={currentUser}
            onNavigateHome={() => setViewState({ view: 'home' })}
            onOpenAuth={handleDirectSignIn}
          />
        ) : !currentUser ? (
          /* SINGLE ACTION: Sign in with Google Account */
          <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-8 my-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Direct Google Sheets &amp; Google Drive Integration</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                Cards
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                Your flashcards and study sets are stored directly in your personal Google Sheets (<span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">cards_library</span> and <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">cards_sets</span>).
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm mx-auto space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
              </div>

              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Connect Your Google Account
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select any Google account active in your browser.
                </p>
              </div>

              {connectionStatus && (
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-indigo-600" />
                  <span>{connectionStatus}</span>
                </div>
              )}

              {/* ONLY BUTTON */}
              <button
                type="button"
                disabled={isConnectingGoogle}
                onClick={handleDirectSignIn}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {isConnectingGoogle ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
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
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </>
                )}
              </button>

              {/* Secondary link to About */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewState({ view: 'about' })}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                >
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>About project, features and tech stack</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* LOGGED IN WORKSPACE */
          <>
            {/* VIEW: Home / Sets list */}
            {viewState.view === 'home' && (
              <SetList
                sets={sets}
                folders={folders}
                searchQuery={searchQuery}
                onSelectSet={handleSelectSet}
                onCreateSet={() => setViewState({ view: 'edit-set' })}
                onOpenImport={() => setIsImportOpen(true)}
                onOpenFolderModal={() => setIsFolderOpen(true)}
              />
            )}

            {/* VIEW: Set Detail Overview */}
            {viewState.view === 'set-detail' && currentSet && (
              <SetDetail
                studySet={currentSet}
                folder={folders.find((f) => f.id === currentSet.folderId)}
                onBack={() => setViewState({ view: 'home' })}
                onSelectMode={(mode) =>
                  setViewState({ view: 'study', setId: currentSet.id, mode })
                }
                onEditSet={() => setViewState({ view: 'edit-set', setId: currentSet.id })}
                onDeleteSet={() => handleDeleteSet(currentSet.id)}
                onOpenExport={() => {
                  setExportSetTarget(currentSet);
                  setIsExportOpen(true);
                }}
                onToggleTermStarred={(termId, starred) =>
                  handleToggleTermStarred(currentSet.id, termId, starred)
                }
              />
            )}

            {/* VIEW: Set Editor (Create / Edit) */}
            {viewState.view === 'edit-set' && (
              <SetEditor
                initialSet={currentSet}
                folders={folders}
                onSave={handleSaveSet}
                onCancel={() => {
                  if (currentSet) {
                    setViewState({ view: 'set-detail', setId: currentSet.id });
                  } else {
                    setViewState({ view: 'home' });
                  }
                }}
                onOpenImport={() => setIsImportOpen(true)}
              />
            )}

            {/* VIEW: Study Modes */}
            {viewState.view === 'study' && currentSet && (
              <>
                {viewState.mode === 'flashcards' && (
                  <FlashcardsMode
                    studySet={currentSet}
                    onExit={() => setViewState({ view: 'set-detail', setId: currentSet.id })}
                    onUpdateTermStarred={(termId, starred) =>
                      handleToggleTermStarred(currentSet.id, termId, starred)
                    }
                    onNavigateToMode={(mode) =>
                      setViewState({ view: 'study', setId: currentSet.id, mode })
                    }
                    onRecordStudy={handleRecordStudy}
                  />
                )}

                {viewState.mode === 'learn' && (
                  <LearnMode
                    studySet={currentSet}
                    onExit={() => setViewState({ view: 'set-detail', setId: currentSet.id })}
                    onRecordStudy={handleRecordStudy}
                  />
                )}

                {viewState.mode === 'match' && (
                  <MatchMode
                    studySet={currentSet}
                    onExit={() => setViewState({ view: 'set-detail', setId: currentSet.id })}
                    onRecordMatchWon={handleRecordMatchWon}
                    onRecordStudy={handleRecordStudy}
                  />
                )}

                {viewState.mode === 'test' && (
                  <TestMode
                    studySet={currentSet}
                    onExit={() => setViewState({ view: 'set-detail', setId: currentSet.id })}
                    onRecordTestCompleted={handleRecordTestCompleted}
                    onRecordStudy={handleRecordStudy}
                  />
                )}

                {viewState.mode === 'write' && (
                  <WriteMode
                    studySet={currentSet}
                    onExit={() => setViewState({ view: 'set-detail', setId: currentSet.id })}
                    onRecordStudy={handleRecordStudy}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Global Modals */}
      {isImportOpen && (
        <QuentiImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          folders={folders}
          onImportSet={handleImportSet}
        />
      )}

      {exportSetTarget && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          studySet={exportSetTarget}
        />
      )}

      <FolderModal
        isOpen={isFolderOpen}
        onClose={() => setIsFolderOpen(false)}
        folders={folders}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">Cards</span>
            <span>&bull;</span>
            <span>Modern Flashcards &amp; Study Sets</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Personal Google Sheets Storage</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
