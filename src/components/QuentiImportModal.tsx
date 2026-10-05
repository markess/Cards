import React, { useState, useMemo } from 'react';
import { X, Download, Sparkles, Check, ArrowRight, Loader2, Link2, ExternalLink, AlertCircle, Volume2, FileText, ClipboardList } from 'lucide-react';
import { Folder, StudySet, Term } from '../types';
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
  const [activeTab, setActiveTab] = useState<'url' | 'paste'>('url');
  const [quentiUrl, setQuentiUrl] = useState('');
  const [pastedContent, setPastedContent] = useState('');
  const [customTitle, setCustomTitle] = useState('');
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

  // Helper to parse multi-line or tab-separated text into terms
  const parseRawTextToTerms = (raw: string): { terms: Term[]; title?: string } => {
    const text = raw.trim();
    if (!text) return { terms: [] };

    // Try parsing as JSON first
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        const data = Array.isArray(parsed) ? parsed : (parsed.terms || parsed.cards || [parsed]);
        const terms: Term[] = data
          .map((t: any, idx: number) => ({
            id: `term-p-${Date.now()}-${idx}`,
            term: String(t.word || t.term || t.front || `Card ${idx + 1}`).trim(),
            definition: String(t.definition || t.meaning || t.back || '').trim(),
            starred: false,
          }))
          .filter((t: any) => t.term || t.definition);

        return {
          terms,
          title: (!Array.isArray(parsed) && parsed.title) || undefined,
        };
      } catch (e) {
        // Not valid JSON, continue with line-by-line parsing
      }
    }

    // Line-by-line parsing (tab, colon, dash, comma)
    const lines = text.split('\n');
    const terms: Term[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let parts = line.split('\t');
      if (parts.length < 2) {
        if (line.includes(' - ')) parts = line.split(' - ');
        else if (line.includes(': ')) parts = line.split(': ');
        else if (line.includes(' — ')) parts = line.split(' — ');
        else parts = [line, ''];
      }

      const term = parts[0]?.trim() || '';
      const definition = parts.slice(1).join('\t').trim() || '';

      if (term || definition) {
        terms.push({
          id: `term-text-${Date.now()}-${index}`,
          term,
          definition,
          starred: false,
        });
      }
    });

    return { terms };
  };

  const parsedFromPaste = useMemo(() => {
    return parseRawTextToTerms(pastedContent);
  }, [pastedContent]);

  const handleApplyPasted = () => {
    if (parsedFromPaste.terms.length === 0) {
      setError('Не удалось распознать карточки. Вставьте текст со словами и определениями.');
      return;
    }

    setError(null);
    const newSet: StudySet = {
      id: `set-pasted-${Date.now()}`,
      title: customTitle.trim() || parsedFromPaste.title || 'Импортированный сет',
      description: `Импортировано ${parsedFromPaste.terms.length} карточек`,
      author: 'user',
      tags: ['Quenti', 'Imported'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      terms: parsedFromPaste.terms,
    };

    setFetchedSet(newSet);
  };

  const handleFetch = async () => {
    if (!quentiUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setFetchedSet(null);

    const input = quentiUrl.trim();

    // If user pasted cards into URL field by mistake, handle gracefully
    if (input.includes('\n') || (input.includes('\t') && !input.startsWith('http'))) {
      const parsed = parseRawTextToTerms(input);
      if (parsed.terms.length > 0) {
        setFetchedSet({
          id: `set-quenti-${Date.now()}`,
          title: customTitle.trim() || parsed.title || 'Импортированный сет',
          description: `Импортировано ${parsed.terms.length} карточек`,
          author: 'user',
          tags: ['Quenti', 'Imported'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          terms: parsed.terms,
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      const formattedSet = await fetchQuentiStudySet(input);
      setFetchedSet(formattedSet);

      if (formattedSet.tags && formattedSet.tags.length > 0) {
        const detected = getVoiceConfigFromTags(formattedSet.tags);
        setSelectedVoiceTag(detected.tag);
      }
    } catch (err: any) {
      console.warn('Quenti fetch issue:', err);
      const isCors =
        err.message?.includes('CORS_BLOCKED') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Failed to fetch') ||
        err.name === 'TypeError';

      setError(
        isCors
          ? 'CORS_ERROR'
          : err.message || 'Ошибка связи с API Quenti. Убедитесь, что сет открыт публично.'
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
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
                Загрузите любой публичный сет из <span className="font-mono">app.quenti.io</span>
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

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={() => {
              setActiveTab('url');
              setError(null);
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'url'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>По ссылке / ID</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('paste');
              setError(null);
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'paste'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Вставить карточки / текст / JSON</span>
            {parsedFromPaste.terms.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {parsedFromPaste.terms.length}
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'url' ? (
            /* Mode 1: Fetch by URL */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Quenti Study Set URL or ID
                </label>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Пример ссылки
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
                    placeholder="https://app.quenti.io/cmrk7q2h10005l504p2kq12h5"
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
                      <span>Загрузка...</span>
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
                Поддерживаются ссылки вида <span className="font-mono text-indigo-500">https://app.quenti.io/...</span> или ID сета.
              </p>
            </div>
          ) : (
            /* Mode 2: Paste Cards / JSON directly */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Вставьте список слов или JSON
                </label>
                <span className="text-[11px] text-slate-500">
                  {parsedFromPaste.terms.length > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      ✓ Распознано {parsedFromPaste.terms.length} карточек
                    </span>
                  ) : (
                    'Разделитель: Tab или перенос строки'
                  )}
                </span>
              </div>

              <textarea
                rows={5}
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder={`Скопируйте и вставьте сюда список терминов из Quenti или Quizlet:\n\nmot\tперевод\nbonjour\tпривет\nmerci\tспасибо`}
                className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              <div className="flex items-center justify-between gap-3 pt-1">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Название сета (необязательно)"
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />

                <button
                  type="button"
                  disabled={parsedFromPaste.terms.length === 0}
                  onClick={handleApplyPasted}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shrink-0"
                >
                  Применить карточки ({parsedFromPaste.terms.length})
                </button>
              </div>
            </div>
          )}

          {/* Folder and Voice Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Папка (необязательно)
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Без папки</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Озвучка карточек
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
                  title="Тест произношения"
                  className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition-colors shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Error message with 1-click fallback */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-3 text-xs text-red-700 dark:text-red-300 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  {error === 'CORS_ERROR' ? (
                    <div>
                      <p className="font-bold mb-1">
                        Браузерная защита CORS заблокировала прямой сетевой запрос к Quenti.
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        Сайт Quenti запрещает сторонним сайтам читать свои API напрямую из браузера. Вы можете открыть сет в 1 клик, скопировать список карточек и вставить во вкладку «Вставить карточки».
                      </p>
                    </div>
                  ) : (
                    <span>{error}</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-red-200/80 dark:border-red-900/60 flex flex-wrap items-center gap-2 justify-between">
                {quentiUrl.trim() && (
                  <a
                    href={quentiUrl.startsWith('http') ? quentiUrl : `https://app.quenti.io/${quentiUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Открыть сет в Quenti ↗</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('paste');
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Вставить скопированные карточки</span>
                </button>
              </div>
            </div>
          )}

          {/* Fetched Preview */}
          {fetchedSet && (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-fade-in">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Готово к импорту
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {fetchedSet.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {fetchedSet.author ? `Автор: ${fetchedSet.author} • ` : ''}Найдено {fetchedSet.terms.length} карточек
                  </p>
                </div>
              </div>

              {/* Terms sample preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  Предпросмотр карточек:
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
                      ...и ещё {fetchedSet.terms.length - 10} карточек
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
            Отмена
          </button>

          {fetchedSet ? (
            <button
              type="button"
              onClick={handleSaveToCards}
              className="flex items-center gap-2 px-6 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Сохранить {fetchedSet.terms.length} карточек в библиотеку</span>
            </button>
          ) : activeTab === 'url' ? (
            <button
              type="button"
              disabled={isLoading || !quentiUrl.trim()}
              onClick={handleFetch}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all"
            >
              Загрузить сет
            </button>
          ) : (
            <button
              type="button"
              disabled={parsedFromPaste.terms.length === 0}
              onClick={handleApplyPasted}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all"
            >
              Загрузить ({parsedFromPaste.terms.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
