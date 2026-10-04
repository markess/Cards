import React, { useState } from 'react';
import { X, Download, Sparkles, Check, ArrowRight, Loader2, Link2, ExternalLink, AlertCircle, Volume2 } from 'lucide-react';
import { Folder, StudySet } from '../types';
import { AVAILABLE_VOICES, getVoiceConfigFromTags, speakText } from '../utils/tts';
import { fetchQuentiStudySet } from '../utils/quenti';

interface QuentiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  onImportSet: (newSet: StudySet) => void;
}

export const QuentiImportModal: React.FC<QuentiImportModalProps> = ({
  isOpen,
  onClose,
  folders,
  onImportSet,
}) => {
  const [quentiUrl, setQuentiUrl] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [selectedVoiceTag, setSelectedVoiceTag] = useState<string>('EN-FEMALE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedSet, setFetchedSet] = useState<StudySet | null>(null);

  if (!isOpen) return null;

  const handleLoadSample = () => {
    setQuentiUrl('https://app.quenti.io/cmugllniq000pjm0413gbdy4w');
    setError(null);
  };

  const handleFetch = async () => {
    if (!quentiUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setFetchedSet(null);

    const input = quentiUrl.trim();

    // Check if user pasted JSON directly
    if (input.startsWith('{') || input.startsWith('[')) {
      try {
        const parsed = JSON.parse(input);
        const data = Array.isArray(parsed) ? parsed : (parsed.terms || parsed.cards || [parsed]);
        const terms = data.map((t: any, idx: number) => ({
          id: `term-p-${Date.now()}-${idx}`,
          term: String(t.term || t.word || t.front || `Card ${idx + 1}`).trim(),
          definition: String(t.definition || t.meaning || t.back || '').trim(),
          starred: false,
        })).filter((t: any) => t.term || t.definition);

        if (terms.length === 0) {
          throw new Error('No valid cards found in pasted JSON');
        }

        const formattedSet: StudySet = {
          id: `set-pasted-${Date.now()}`,
          title: (parsed && !Array.isArray(parsed) && parsed.title) || 'Imported Study Set',
          description: `Imported with ${terms.length} cards`,
          author: 'user',
          tags: ['Imported'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          terms,
        };

        setFetchedSet(formattedSet);
        setIsLoading(false);
        return;
      } catch (e: any) {
        // Not JSON, continue
      }
    }

    // Fetch from Quenti public tRPC endpoint via proxy or fallbacks
    try {
      const formattedSet = await fetchQuentiStudySet(input);
      setFetchedSet(formattedSet);

      // Auto-detect voice if tags suggest one
      if (formattedSet.tags && formattedSet.tags.length > 0) {
        const detected = getVoiceConfigFromTags(formattedSet.tags);
        setSelectedVoiceTag(detected.tag);
      }
    } catch (err: any) {
      console.warn('Quenti fetch issue:', err);
      setError(
        err.message || 'Error communicating with Quenti API. Make sure the set is public or paste the cards manually.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToCards = () => {
    if (!fetchedSet) return;

    const existingTags = (fetchedSet.tags || []).filter(
      (t) => !AVAILABLE_VOICES.some((v) => v.tag === t.toUpperCase())
    );

    const finalSet: StudySet = {
      ...fetchedSet,
      id: `set-${Date.now()}`,
      tags: [selectedVoiceTag, ...existingTags],
      folderId: selectedFolderId || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onImportSet(finalSet);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Import from Quenti
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Copy any public study set directly from <span className="font-mono">app.quenti.io</span>
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* URL Input Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Quenti Study Set URL or ID
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Insert example link
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={quentiUrl}
                  onChange={(e) => setQuentiUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                  placeholder="https://app.quenti.io/cmugllniq000pjm0413gbdy4w"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={isLoading || !quentiUrl.trim()}
                onClick={handleFetch}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Fetch Set</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Supports full links (e.g. <span className="font-mono text-indigo-500">https://app.quenti.io/cmugllniq000pjm0413gbdy4w</span>) or set IDs.
            </p>
          </div>

          {/* Folder and Voice Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Assign to Folder (Optional)
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">No folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Voice &amp; Pronunciation
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedVoiceTag}
                  onChange={(e) => setSelectedVoiceTag(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {AVAILABLE_VOICES.map((v) => (
                    <option key={v.tag} value={v.tag}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const sample =
                      selectedVoiceTag.startsWith('ES')
                        ? 'Hola, pronunciación en español'
                        : selectedVoiceTag.startsWith('FR')
                        ? 'Bonjour, prononciation en français'
                        : 'Hello, pronunciation sample';
                    speakText(sample, selectedVoiceTag);
                  }}
                  title="Test voice sample"
                  className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition-colors shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Fetched Preview */}
          {fetchedSet && (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-fade-in">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Ready to copy
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {fetchedSet.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    By {fetchedSet.author} &bull; {fetchedSet.terms.length} flashcards found
                  </p>
                </div>
              </div>

              {/* Terms sample preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  Cards preview:
                </span>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs">
                  {fetchedSet.terms.slice(0, 10).map((t, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex-1 truncate">
                        {t.term}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-400 flex-1 truncate text-right">
                        {t.definition}
                      </span>
                    </div>
                  ))}
                  {fetchedSet.terms.length > 10 && (
                    <div className="p-2 text-center text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800">
                      ...and {fetchedSet.terms.length - 10} more cards
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>

          {fetchedSet ? (
            <button
              type="button"
              onClick={handleSaveToCards}
              className="flex items-center gap-2 px-6 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Copy {fetchedSet.terms.length} Cards to Library</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isLoading || !quentiUrl.trim()}
              onClick={handleFetch}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all"
            >
              Fetch Set
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
