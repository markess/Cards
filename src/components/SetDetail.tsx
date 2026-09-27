import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Layers, 
  Sparkles, 
  Gamepad2, 
  FileCheck2, 
  PenTool, 
  Star, 
  Volume2, 
  Share2, 
  Edit3, 
  Trash2, 
  Printer, 
  Search, 
  Tag, 
  Folder as FolderIcon,
  Plus
} from 'lucide-react';
import { Folder, StudyMode, StudySet, Term } from '../types';
import { speakText, getVoiceConfigFromTags } from '../utils/tts';

interface SetDetailProps {
  studySet: StudySet;
  folder?: Folder;
  onBack: () => void;
  onSelectMode: (mode: StudyMode) => void;
  onEditSet: () => void;
  onDeleteSet: () => void;
  onOpenExport: () => void;
  onToggleTermStarred: (termId: string, starred: boolean) => void;
}

export const SetDetail: React.FC<SetDetailProps> = ({
  studySet,
  folder,
  onBack,
  onSelectMode,
  onEditSet,
  onDeleteSet,
  onOpenExport,
  onToggleTermStarred,
}) => {
  const [filterStarred, setFilterStarred] = useState(false);
  const [termSearch, setTermSearch] = useState('');

  const starredCount = studySet.terms.filter((t) => t.starred).length;

  const filteredTerms = studySet.terms.filter((t) => {
    if (filterStarred && !t.starred) return false;
    if (termSearch.trim()) {
      const q = termSearch.toLowerCase();
      return t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q);
    }
    return true;
  });

  const voiceConfig = getVoiceConfigFromTags(studySet.tags);

  const handleSpeak = (text: string) => {
    speakText(text, voiceConfig);
  };

  const studyModes = [
    {
      id: 'flashcards' as StudyMode,
      name: 'Flashcards',
      icon: Layers,
      description: 'Review cards with smooth 3D flip, audio, and shortcuts',
      color: 'from-blue-500 to-indigo-600',
      badge: 'Popular',
    },
    {
      id: 'learn' as StudyMode,
      name: 'Learn',
      icon: Sparkles,
      description: 'Adaptive questions powered by Cortex AI smart grading',
      color: 'from-indigo-600 to-violet-600',
      badge: 'Cortex AI',
    },
    {
      id: 'match' as StudyMode,
      name: 'Match',
      icon: Gamepad2,
      description: 'Race against the clock to match pairs & top the leaderboard',
      color: 'from-violet-600 to-pink-600',
      badge: 'Timed Game',
    },
    {
      id: 'test' as StudyMode,
      name: 'Test',
      icon: FileCheck2,
      description: 'Customizable practice exam with instant score breakdown',
      color: 'from-emerald-500 to-teal-600',
      badge: 'Graded',
    },
    {
      id: 'write' as StudyMode,
      name: 'Spell & Write',
      icon: PenTool,
      description: 'Type out terms and master spelling and accurate recall',
      color: 'from-amber-500 to-orange-600',
      badge: 'Spelling',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Study Sets</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-500" />
            <span>Export & Print</span>
          </button>

          <button
            onClick={onEditSet}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Set</span>
          </button>

          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${studySet.title}"?`)) {
                onDeleteSet();
              }
            }}
            title="Delete study set"
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Set Header Hero */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {folder && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: folder.color }}
            >
              <FolderIcon className="w-3 h-3" />
              <span>{folder.name}</span>
            </span>
          )}
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {studySet.terms.length} terms &bull; Created by {studySet.author}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Volume2 className="w-3 h-3 text-indigo-500" />
            <span>Voice: {voiceConfig.name}</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {studySet.title}
        </h1>

        {studySet.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            {studySet.description}
          </p>
        )}

        {/* Tags */}
        {studySet.tags && studySet.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {studySet.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Study Modes Section */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Choose a Study Mode
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {studyModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className="group relative p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg transition-all duration-200 text-left flex flex-col justify-between overflow-hidden"
              >
                {/* Accent top stripe */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${mode.color} opacity-80 group-hover:opacity-100 transition-opacity`}
                />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`p-2.5 rounded-xl bg-gradient-to-br ${mode.color} text-white shadow-sm`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {mode.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {mode.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {mode.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                  <span>Start Studying</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Terms Preview & List */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Terms in this set ({studySet.terms.length})
            </h2>

            {starredCount > 0 && (
              <button
                onClick={() => setFilterStarred(!filterStarred)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                  filterStarred
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    filterStarred ? 'fill-amber-500 text-amber-500' : ''
                  }`}
                />
                <span>Starred ({starredCount})</span>
              </button>
            )}
          </div>

          {/* Quick search terms */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={termSearch}
              onChange={(e) => setTermSearch(e.target.value)}
              placeholder="Search terms..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Cards Table List */}
        <div className="space-y-2.5">
          {filteredTerms.map((term, idx) => (
            <div
              key={term.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              {/* Term */}
              <div className="flex-1 min-w-[200px] flex items-start gap-3">
                <span className="text-xs font-bold text-slate-400 w-6 pt-0.5">
                  {idx + 1}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {term.term}
                </span>
              </div>

              {/* Definition */}
              <div className="flex-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {term.definition}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleSpeak(term.term)}
                  title="Pronounce term"
                  className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleTermStarred(term.id, !term.starred)}
                  title="Star term"
                  className="p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Star
                    className={`w-4 h-4 ${
                      term.starred ? 'fill-amber-500 text-amber-500' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}

          {filteredTerms.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No matching terms found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
