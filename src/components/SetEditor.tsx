import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ArrowUpDown, 
  Download, 
  Save, 
  Folder as FolderIcon,
  Tag,
  Sparkles,
  FileText,
  Volume2
} from 'lucide-react';
import { Folder, StudySet, Term } from '../types';
import { BulkListImportModal } from './BulkListImportModal';
import { AVAILABLE_VOICES, getVoiceConfigFromTags, speakText } from '../utils/tts';

interface SetEditorProps {
  initialSet?: StudySet | null;
  folders: Folder[];
  onSave: (set: StudySet) => void;
  onCancel: () => void;
  onOpenImport: () => void;
}

export const SetEditor: React.FC<SetEditorProps> = ({
  initialSet,
  folders,
  onSave,
  onCancel,
  onOpenImport,
}) => {
  const [title, setTitle] = useState(initialSet?.title || '');
  const [description, setDescription] = useState(initialSet?.description || '');
  const [folderId, setFolderId] = useState(initialSet?.folderId || '');
  const [selectedVoiceTag, setSelectedVoiceTag] = useState<string>(() => {
    return getVoiceConfigFromTags(initialSet?.tags || []).tag;
  });
  const [tagInput, setTagInput] = useState(() => {
    const rawTags = initialSet?.tags || [];
    // Filter out internal voice tags from standard input for cleanliness
    const voiceTags = AVAILABLE_VOICES.map((v) => v.tag);
    return rawTags.filter((t) => !voiceTags.includes(t.trim().toUpperCase())).join(', ');
  });
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  
  const [terms, setTerms] = useState<Term[]>(
    initialSet?.terms && initialSet.terms.length > 0
      ? initialSet.terms
      : [
          { id: `term-${Date.now()}-1`, term: '', definition: '' },
          { id: `term-${Date.now()}-2`, term: '', definition: '' },
          { id: `term-${Date.now()}-3`, term: '', definition: '' },
        ]
  );

  const handleAddTerm = () => {
    setTerms((prev) => [
      ...prev,
      { id: `term-${Date.now()}-${prev.length + 1}`, term: '', definition: '' },
    ]);
  };

  const handleAppendFromList = (newItems: Term[]) => {
    setTerms((prev) => {
      // If previous only contained blank placeholders, replace them
      const nonBlank = prev.filter((t) => t.term.trim() || t.definition.trim());
      return [...nonBlank, ...newItems];
    });
  };

  const handleUpdateTerm = (id: string, field: 'term' | 'definition', val: string) => {
    setTerms((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: val } : t))
    );
  };

  const handleDeleteTerm = (id: string) => {
    if (terms.length <= 2) {
      alert('A study set needs at least 2 terms!');
      return;
    }
    setTerms((prev) => prev.filter((t) => t.id !== id));
  };

  // Swap all terms and definitions
  const handleSwapAll = () => {
    setTerms((prev) =>
      prev.map((t) => ({ ...t, term: t.definition, definition: t.term }))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const validTerms = terms.filter(
      (t) => t.term.trim().length > 0 || t.definition.trim().length > 0
    );

    if (validTerms.length < 2) {
      alert('Please provide at least 2 terms with definitions.');
      return;
    }

    const customTags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !AVAILABLE_VOICES.some((v) => v.tag === t.toUpperCase()));

    // Always include selected voice tag (e.g. EN-FEMALE, ES-MALE, etc.)
    const tags = [selectedVoiceTag, ...customTags];

    const updatedSet: StudySet = {
      id: initialSet?.id || `set-${Date.now()}`,
      title: title.trim() || 'Untitled Study Set',
      description: description.trim(),
      folderId: folderId || undefined,
      author: initialSet?.author || 'you',
      tags,
      createdAt: initialSet?.createdAt || Date.now(),
      updatedAt: Date.now(),
      terms: validTerms,
    };

    onSave(updatedSet);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {initialSet ? 'Edit Study Set' : 'Create a New Study Set'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
              title="Paste a list separated by tab and newline"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Add Words from List</span>
            </button>

            <button
              type="button"
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Import from Quenti</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{initialSet ? 'Save Changes' : 'Create Set'}</span>
            </button>
          </div>
        </div>

        {/* Set Metadata Fields */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Biology - Mitosis & Cell Division"
              className="w-full px-4 py-2.5 text-sm sm:text-base font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description or summary..."
              className="w-full px-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Folder / Class
              </label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Voice &amp; Pronunciation (TTS)
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedVoiceTag}
                  onChange={(e) => setSelectedVoiceTag(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                        ? 'Hola, bienvenido al estudio de tarjetas'
                        : selectedVoiceTag.startsWith('FR')
                        ? 'Bonjour, bienvenue dans votre jeu de cartes'
                        : 'Hello, welcome to your flashcards';
                    speakText(sample, selectedVoiceTag);
                  }}
                  title="Test voice sample"
                  className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition-colors shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Tags (Comma-separated)
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. Science, Exam Prep, Unit 2"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Terms Header & Bulk Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Cards ({terms.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-indigo-200 dark:border-indigo-900/60 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>+ Import List (\t and \n)</span>
            </button>

            <button
              type="button"
              onClick={handleSwapAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Swap Terms & Definitions</span>
            </button>
          </div>
        </div>

        {/* Cards Rows */}
        <div className="space-y-3">
          {terms.map((term, index) => (
            <div
              key={term.id}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-slate-500">#{index + 1}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteTerm(term.id)}
                  className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Delete card"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Term
                  </label>
                  <input
                    type="text"
                    value={term.term}
                    onChange={(e) => handleUpdateTerm(term.id, 'term', e.target.value)}
                    placeholder="Enter term..."
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Definition
                  </label>
                  <textarea
                    rows={2}
                    value={term.definition}
                    onChange={(e) => handleUpdateTerm(term.id, 'definition', e.target.value)}
                    placeholder="Enter definition..."
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Card & Save Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleAddTerm}
              className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold rounded-xl border-2 border-dashed border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Card</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkOpen(true)}
              className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
            >
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Import List (\t / \n)</span>
            </button>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{initialSet ? 'Save Changes' : 'Create Study Set'}</span>
          </button>
        </div>
      </form>

      {/* Bulk List TSV Importer Modal */}
      <BulkListImportModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onAppendTerms={handleAppendFromList}
      />
    </div>
  );
};

