import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  BookOpen,
  PenTool,
  CheckCircle2,
  Zap,
  Download,
  Upload,
  Folder,
  Database,
  ShieldCheck,
  Cpu,
  Cloud,
  HardDrive,
  Flame,
  ArrowLeft,
  Code,
  FileSpreadsheet,
  Palette,
  Check,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Star,
  Lock,
  Moon,
  Smartphone,
  ServerOff,
  Globe,
  ArrowRightLeft,
  Send
} from 'lucide-react';
import { AuthUser } from '../types';

interface AboutViewProps {
  currentUser: AuthUser | null;
  onNavigateHome: () => void;
  onOpenAuth: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  currentUser,
  onNavigateHome,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'features' | 'tech' | 'architecture' | 'privacy'>('features');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors mb-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Study Sets</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                About Cards
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Core features, technology stack, serverless architecture, and privacy philosophy
              </p>
            </div>
          </div>
        </div>

        {!currentUser && (
          <button
            onClick={onOpenAuth}
            className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <span>Sign in with Google</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Hero Banner / Summary */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-indigo-700/40">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-medium border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Open & Free Flashcard Study Platform</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Modern flashcard study platform with zero subscriptions and zero backend servers
          </h2>
          <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed">
            <strong>Cards</strong> is a high-performance web application designed for active recall and spaced repetition learning. It combines 5 interactive study modes, offline-first reliability, seamless Google Drive & Sheets synchronization, and strict data privacy.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-xl font-black text-amber-300">5</div>
              <div className="text-[11px] text-indigo-200 font-medium">Study Modes</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-xl font-black text-emerald-300">$0</div>
              <div className="text-[11px] text-indigo-200 font-medium">Server Costs</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-xl font-black text-cyan-300">100%</div>
              <div className="text-[11px] text-indigo-200 font-medium">Your Google Drive</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-xl font-black text-violet-300">Offline</div>
              <div className="text-[11px] text-indigo-200 font-medium">Instant Cache</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'features'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Core Features</span>
        </button>

        <button
          onClick={() => setActiveTab('tech')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'tech'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Technology Stack</span>
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'architecture'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Architecture & Data Flow</span>
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'privacy'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Privacy & Free Tier</span>
        </button>
      </div>

      {/* TAB 1: FEATURES */}
      {activeTab === 'features' && (
        <div className="space-y-8 animate-fadeIn">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              5 Dedicated Study Modes
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Each mode stimulates distinct cognitive learning mechanisms — visual memory, kinetic typing, and associative speed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Mode 1 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                1. Flashcards
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Realistic 3D dual-sided cards with 180° flip animation. Includes shuffle ordering, term/definition flip orientation, keyboard navigation, and starred-only filtering.
              </p>
              <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>3D CSS Perspective • Visual Recall</span>
              </div>
            </div>

            {/* Mode 2 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                2. Learn (Adaptive Mastery)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Intelligent spaced repetition cycle. Categorizes terms into Remaining, Familiar, and Mastered. Missed items re-enter the queue until full retention is achieved.
              </p>
              <div className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Adaptive Intervals • Mastery Status</span>
              </div>
            </div>

            {/* Mode 3 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <PenTool className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                3. Write
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Direct keyboard spelling and definition input. Trains active motor recall and accurate foreign vocabulary orthography with instant character matching.
              </p>
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Kinetic Memory • Exact Spelling</span>
              </div>
            </div>

            {/* Mode 4 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                4. Test
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Automated practice exam generation with randomized multiple choice and True/False assessments. Generates instant grading scores and error breakdowns.
              </p>
              <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Exam Simulation • Mistake Review</span>
              </div>
            </div>

            {/* Mode 5 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                5. Match (Speed Game)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                High-speed connection game: race against the millisecond clock to pair cards with corresponding definitions on an interactive board.
              </p>
              <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Associative Speed • Personal Best Records</span>
              </div>
            </div>

            {/* Additional Features */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Quenti Import, TSV Export & Folders
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                1-click Quenti study set import accelerated by a dedicated Cloudflare Worker edge proxy. Includes dual-mode input (URL or raw text/JSON with column swapping), tabular TSV/CSV export, and folder categorization.
              </p>
              <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Quenti Cloudflare Proxy • Dual Import Modes</span>
              </div>
            </div>

            {/* Telegram Bot Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center">
                <Send className="w-5 h-5 -rotate-12" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Telegram Bot Integration
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Control your cards on-the-go from Telegram! Send words like <code className="font-mono text-indigo-500">word - translation</code> to instantly add them to your active set, create sets with <code className="font-mono text-indigo-500">/newset</code>, and view study decks with <code className="font-mono text-indigo-500">/sets</code>.
              </p>
              <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Google Drive cards_telegram • Private Owner Access Control (Silent Drop for Strangers)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TECH STACK */}
      {activeTab === 'tech' && (
        <div className="space-y-8 animate-fadeIn">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Technology Stack & Open Source Libraries
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Detailed breakdown of every tool: why it was selected and how it powers the Cards application.
            </p>
          </div>

          <div className="space-y-4">
            {/* Tech Item 1: React 19 & TypeScript */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                    ⚛️
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      React 19 & TypeScript
                    </h4>
                    <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                      Frontend Framework & Static Type Safety
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                  UI Core
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Purpose:</strong>
                  Provides a modular, reactive UI architecture and prevents runtime errors through strict compile-time typing for sets, cards, folders, study sessions, and progress metrics.
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Implementation:</strong>
                  Components are cleanly decoupled (`FlashcardsMode`, `MatchMode`, `TestMode`, `SetEditor`, `Navbar`). State transitions remain predictable and performant across views.
                </div>
              </div>
            </div>

            {/* Tech Item 2: Vite 8 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Vite 8 & GitHub Pages Static Hosting
                    </h4>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                      Modern Build Tooling & Asset Bundler
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                  Bundler
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Purpose:</strong>
                  Near-instant development compilation and lightweight production bundles suitable for zero-cost static hosting anywhere on the web.
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Implementation:</strong>
                  Configured with `base: './'` so the application seamlessly mounts from sub-paths like `https://username.github.io/Cards/` without broken asset paths or routing glitches.
                </div>
              </div>
            </div>

            {/* Tech Item 3: Firebase Auth & Google OAuth */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    🔥
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Firebase Authentication & Google OAuth 2.0
                    </h4>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      Passwordless Auth & Scope Delegation
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  Auth & Security
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Purpose:</strong>
                  Enables frictionless 1-click login using the user's Google account without storing credentials, hosting auth databases, or managing secret keys.
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Implementation:</strong>
                  Invokes `signInWithPopup(auth, googleProvider)` requesting scoped access for Google Sheets and Drive. Firebase issues a secure temporary access token for direct API calls.
                </div>
              </div>
            </div>

            {/* Tech Item 4: Google Sheets API v4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    📊
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Google Sheets API v4 & Google Drive API v3
                    </h4>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Personal Cloud Database in User's Own Account
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  Cloud Storage
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Purpose:</strong>
                  Uses the user's personal Google Drive as a permanent, free cloud database. The user retains complete ownership of their data in a standard Google Spreadsheet.
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Implementation:</strong>
                  The service `api.ts` verifies or creates a dedicated "Cards Study Sets Database" spreadsheet containing `cards_sets` and `cards_library` sheets, updating records via standard Google REST endpoints.
                </div>
              </div>
            </div>

            {/* Tech Item 5: Tailwind CSS v4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                    🎨
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Tailwind CSS v4 & 3D CSS Transitions
                    </h4>
                    <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                      Utility-first Design System & Hardware-accelerated Motion
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                  Design System
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Purpose:</strong>
                  Rapid responsive design, dark & light theme modes (`dark:`), subtle glassmorphism backdrops, and physical 3D card rotation.
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Implementation:</strong>
                  CSS utilities `perspective-1000`, `transform-style: preserve-3d`, and `rotate-y-180` deliver smooth 60fps card flips with backface culling (`backface-hidden`).
                </div>
              </div>
            </div>

            {/* Tech Item 6: HTML5 LocalStorage & Canvas Confetti */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    💾
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      HTML5 LocalStorage & Canvas Confetti
                    </h4>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      Offline-first Persistence & Gamification Feedback
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                  Client Storage
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Purpose:</strong>
                  Instant offline interactivity without network lag, continuous streak tracking without requiring an account, and motivating celebration effects upon completing milestones.
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Implementation:</strong>
                  The `storage.ts` module synchronizes mutations immediately into localStorage. `canvas-confetti` renders realistic particle bursts on high-score tests and match completions.
                </div>
              </div>
            </div>

            {/* Tech Item 7: Cloudflare Workers (Edge CORS Proxy) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Cloudflare Workers (Edge CORS Proxy)
                    </h4>
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      Serverless Edge Relay &amp; Cross-Origin Resource Sharing
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300">
                  Edge Network
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Purpose:</strong>
                  Enables static client-side web apps (such as those hosted on GitHub Pages) to import public flashcard sets from Quenti without triggering browser Same-Origin Policy (CORS) blocks.
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Implementation:</strong>
                  A lightweight serverless edge worker (`quenti-cors-proxy.maxim1nts.workers.dev`) handles HTTP preflight OPTIONS requests, fetches public tRPC procedures from Quenti server-to-server, and returns JSON payloads with valid `Access-Control-Allow-Origin: *` headers. No cards or user credentials are ever stored.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ARCHITECTURE */}
      {activeTab === 'architecture' && (
        <div className="space-y-8 animate-fadeIn">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Serverless Data Flow Architecture
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              How user interactions traverse client-side storage, Firebase OAuth, and Google Cloud APIs.
            </p>
          </div>

          {/* Interactive Flow Chart Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-indigo-400 text-xs font-bold">
                  <span>STEP 1</span>
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="font-bold text-sm text-white">Client UI (React SPA)</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  User creates sets, practices 3D cards, answers tests, and races match clocks.
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-cyan-400 text-xs font-bold">
                  <span>STEP 2</span>
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="font-bold text-sm text-white">Local Cache (LocalStorage)</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Changes save locally with zero latency. Works 100% offline at any time.
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
                  <span>STEP 3</span>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="font-bold text-sm text-white">Firebase Auth (OAuth 2.0)</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Single-click Google Sign-In issues a scoped, temporary session token.
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
                  <span>STEP 4</span>
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="font-bold text-sm text-white">Google Sheets &amp; Drive</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Cards, folders, sets &amp; Telegram bot keys synchronize into your Google Drive files (<code>cards_library</code>, <code>cards_sets</code>, <code>cards_folders</code>, <code>cards_telegram</code>).
                </div>
              </div>
            </div>

            {/* Architecture Highlights */}
            <div className="border-t border-slate-800 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-300">
              <div className="space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ServerOff className="w-4 h-4 text-emerald-400" />
                  <span>True Serverless (Zero Backend)</span>
                </div>
                <p className="text-slate-400">
                  No proprietary intermediate servers or middleman databases. Everything executes client-side in the browser.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <span>Secure Ephemeral Session Tokens</span>
                </div>
                <p className="text-slate-400">
                  OAuth tokens reside only in ephemeral browser memory (`sessionStorage`) and are never sent to third-party tracking services.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Offline-First Resilience</span>
                </div>
                <p className="text-slate-400">
                  If network disconnects or if the user chooses not to log in, all flashcards and studies remain fully functional.
                </p>
              </div>
            </div>
          </div>

          {/* Cross-Origin Import & Cloudflare Worker Edge Proxy Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  Edge Relay Architecture
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>External Set Import &amp; Cloudflare Worker CORS Proxy</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                  How Cards enables instant 1-click importing of public flashcard sets on static hosting platforms like GitHub Pages.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center font-bold text-[10px]">1</span>
                  <span>The Static Hosting Challenge</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  On static hosts (GitHub Pages), there is no backend Node.js server. When a browser initiates a cross-domain request to <code className="font-mono text-indigo-500">app.quenti.io</code>, browser Same-Origin Policy (SOP) blocks reading the JSON response because the target host does not supply cross-origin headers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center font-bold text-[10px]">2</span>
                  <span>Cloudflare Worker Edge Relay</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  A high-speed, serverless Cloudflare Worker (<code className="font-mono text-orange-500">quenti-cors-proxy.maxim1nts.workers.dev</code>) receives the request, fetches Quenti's public tRPC endpoint server-to-server (unrestricted by browser CORS), appends <code className="font-mono text-emerald-500">Access-Control-Allow-Origin: *</code>, and safely returns the cards.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-[10px]">3</span>
                  <span>Zero-Trust Privacy &amp; Fallback</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  The edge worker is completely stateless: zero logging, zero caching, and zero persistent storage. If offline or proxy-restricted, the app provides a direct dual-mode fallback: paste raw tab-separated text or JSON directly with instant card preview and column flipping.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRIVACY & COST */}
      {activeTab === 'privacy' && (
        <div className="space-y-8 animate-fadeIn">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Privacy by Design & Perpetual $0 Cost
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Why this architecture offers greater security and freedom than proprietary subscription platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                Uncompromising Privacy
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Your flashcards and study notes belong strictly to you, stored exclusively in your own Google Drive account.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Zero tracking, zero analytics telemetry, zero data harvesting, and zero banner ads.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>The app only requests scoped permissions for the specific spreadsheet files it creates.</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                Perpetually Free (No Paywalls)
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>All 5 modes (including Write, Match, and Test Generator) are permanently unlocked for free.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>Hosted on free GitHub Pages static infrastructure; Firebase Auth free tier covers 50,000 monthly active users.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>No sudden paywalls, no artificial card count limits, and complete export freedom at any time.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Call to action at bottom */}
      <div className="p-8 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Ready to start learning?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse through existing study sets or connect Google Drive to sync your cards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors shadow-sm"
          >
            Go to Study Sets
          </button>
          {!currentUser ? (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              Sign in with Google
            </button>
          ) : (
            <button
              onClick={onNavigateHome}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              My Sets
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
