import React, { useState } from 'react';
import { 
  Folder as FolderIcon, 
  Layers, 
  Sparkles, 
  Gamepad2, 
  FileCheck2, 
  Plus, 
  Upload, 
  Star, 
  BookOpen, 
  Clock, 
  Search,
  FolderPlus,
  Play,
  Volume2
} from 'lucide-react';
import { Folder, StudyMode, StudySet } from '../types';
import { getVoiceConfigFromTags } from '../utils/tts';

interface SetListProps {
  sets: StudySet[];
  folders: Folder[];
  searchQuery: string;
  onSelectSet: (set: StudySet, defaultMode?: StudyMode) => void;
  onCreateSet: () => void;
  onOpenImport: () => void;
  onOpenFolderModal: () => void;
}

export const SetList: React.FC<SetListProps> = ({
  sets,
  folders,
  searchQuery,
  onSelectSet,
  onCreateSet,
  onOpenImport,
  onOpenFolderModal,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');

  // Filter sets by folder and search query
  const filteredSets = sets.filter((s) => {
    if (selectedFolderId !== 'all' && s.folderId !== selectedFolderId) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = s.title.toLowerCase().includes(q);
      const inDesc = s.description.toLowerCase().includes(q);
      const inTags = s.tags.some((t) => t.toLowerCase().includes(q));
      const inTerms = s.terms.some(
        (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
      );
      return inTitle || inDesc || inTags || inTerms;
    }
    return true;
  });

  const getFolder = (folderId?: string) => folders.find((f) => f.id === folderId);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Compact Header */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white shadow-md border border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-medium text-indigo-200">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Study Sets &bull; Google Sheets</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Cards
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onCreateSet}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Set</span>
          </button>

          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import Quenti</span>
          </button>
        </div>
      </div>

      {/* Folders & Categories Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setSelectedFolderId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedFolderId === 'all'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Sets ({sets.length})
          </button>

          {folders.map((f) => {
            const count = sets.filter((s) => s.folderId === f.id).length;
            const isSelected = selectedFolderId === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFolderId(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: f.color }}
                />
                <span>{f.name}</span>
                <span className="text-[11px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onOpenFolderModal}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors shrink-0"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Manage Folders</span>
        </button>
      </div>

      {/* Sets Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {selectedFolderId === 'all'
              ? 'Study Library'
              : folders.find((f) => f.id === selectedFolderId)?.name || 'Study Sets'}
            {' '}({filteredSets.length})
          </h2>
        </div>

        {filteredSets.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No study sets found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery
                  ? `No sets matched "${searchQuery}". Try different keywords.`
                  : 'Start by creating your own set or importing flashcards from Quenti.'}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={onCreateSet}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white"
              >
                + Create Set
              </button>
              <button
                onClick={onOpenImport}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Import from Quenti
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
            {filteredSets.map((studySet) => {
              const folder = getFolder(studySet.folderId);
              const starredCount = studySet.terms.filter((t) => t.starred).length;

              return (
                <div
                  key={studySet.id}
                  onClick={() => onSelectSet(studySet, 'overview')}
                  className="group relative p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 dark:hover:border-indigo-500/80 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between w-full min-w-0 overflow-hidden"
                >
                  <div className="space-y-2">
                    {/* Header line: folder and card count */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {folder ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-xs"
                          style={{ backgroundColor: folder.color }}
                        >
                          <FolderIcon className="w-3 h-3" />
                          <span>{folder.name}</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          Study Set
                        </span>
                      )}

                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {studySet.terms.length} terms
                      </span>
                    </div>

                    {/* Set Title */}
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {studySet.title}
                    </h3>

                    {/* Set Description */}
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {studySet.description || 'No description provided.'}
                    </p>

                    {/* Tags & Voice */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
                        <Volume2 className="w-2.5 h-2.5" />
                        <span>{getVoiceConfigFromTags(studySet.tags).name}</span>
                      </span>

                      {studySet.tags && studySet.tags.length > 0 &&
                        studySet.tags
                          .filter((t) => !['EN-FEMALE', 'EN-MALE', 'ES-FEMALE', 'ES-MALE', 'FR-FEMALE', 'FR-MALE'].includes(t.toUpperCase()))
                          .slice(0, 4)
                          .map((tag, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            >
                              #{tag}
                            </span>
                          ))}
                    </div>
                  </div>

                  {/* Quick study mode launchers */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSet(studySet, 'flashcards');
                        }}
                        title="Start Flashcards"
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors shrink-0"
                      >
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <span className="sr-only">Cards</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSet(studySet, 'learn');
                        }}
                        title="Start Cortex Learn"
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors shrink-0"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="sr-only">Learn</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSet(studySet, 'match');
                        }}
                        title="Start Match Race"
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors shrink-0"
                      >
                        <Gamepad2 className="w-4 h-4 text-emerald-500" />
                        <span className="sr-only">Match</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSet(studySet, 'test');
                        }}
                        title="Practice Test"
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors shrink-0"
                      >
                        <FileCheck2 className="w-4 h-4 text-purple-500" />
                        <span className="sr-only">Test</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:text-indigo-500 transition-colors">
                      <span className="shrink-0 whitespace-nowrap">Study</span>
                      <Play className="w-3.5 h-3.5 shrink-0 fill-current" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
