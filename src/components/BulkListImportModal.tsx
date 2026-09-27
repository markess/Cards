import React, { useState, useMemo } from 'react';
import { X, Plus, FileText, Check, ArrowRight, ArrowUpDown, Sparkles } from 'lucide-react';
import { Term } from '../types';

interface BulkListImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppendTerms: (newTerms: Term[]) => void;
}

export const BulkListImportModal: React.FC<BulkListImportModalProps> = ({
  isOpen,
  onClose,
  onAppendTerms,
}) => {
  const [rawText, setRawText] = useState('');
  const [swapColumns, setSwapColumns] = useState(false);

  // Sample tab-separated list
  const handleLoadSample = () => {
    setRawText(`Algorithm\tA step-by-step procedure for solving a problem or performing a task
Data Structure\tA specialized format for organizing, processing, and storing data
Recursion\tA method of solving a computational problem where the solution depends on solutions to smaller instances of the same problem
Binary Tree\tA tree data structure in which each node has at most two children
Big O Notation\tMathematical notation that describes the limiting behavior of a function when the argument tends towards a particular value`);
  };

  const parsedTerms = useMemo<Term[]>(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split('\n');
    const items: Term[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Split by tab (\t)
      let parts = line.split('\t');
      
      // If line has no tab, fallback to colon or dash or comma
      if (parts.length < 2) {
        if (line.includes(' - ')) parts = line.split(' - ');
        else if (line.includes(': ')) parts = line.split(': ');
        else if (line.includes(',')) parts = line.split(',');
        else parts = [line, ''];
      }

      let term = parts[0]?.trim() || '';
      let definition = parts.slice(1).join('\t').trim() || '';

      if (swapColumns) {
        const temp = term;
        term = definition;
        definition = temp;
      }

      if (term || definition) {
        items.push({
          id: `term-bulk-${Date.now()}-${index}`,
          term,
          definition,
        });
      }
    });

    return items;
  }, [rawText, swapColumns]);

  if (!isOpen) return null;

  const handleAppend = () => {
    if (parsedTerms.length === 0) return;
    onAppendTerms(parsedTerms);
    setRawText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Add Words from List
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste a list where terms are separated by <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">\t</kbd> (Tab) and cards by <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">\n</kbd> (Enter)
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
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Insert sample list
              </button>
              <button
                type="button"
                onClick={() => setSwapColumns(!swapColumns)}
                className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-medium"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{swapColumns ? 'Columns Swapped (Def \t Term)' : 'Swap Columns'}</span>
              </button>
            </div>

            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {parsedTerms.length} words detected
            </span>
          </div>

          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Word 1\tDefinition 1\nWord 2\tDefinition 2\nWord 3\tDefinition 3`}
            className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />

          {/* Live Preview List */}
          {parsedTerms.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Preview ({parsedTerms.length} words to add):
              </span>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {parsedTerms.map((t, idx) => (
                  <div key={idx} className="p-2 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <span className="font-semibold text-slate-900 dark:text-slate-200 flex-1 truncate">
                      {t.term || <span className="text-slate-400 italic">(Empty term)</span>}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400 flex-1 truncate text-right">
                      {t.definition || <span className="text-slate-400 italic">(Empty definition)</span>}
                    </span>
                  </div>
                ))}
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

          <button
            type="button"
            disabled={parsedTerms.length === 0}
            onClick={handleAppend}
            className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Append {parsedTerms.length} Words to Set</span>
          </button>
        </div>
      </div>
    </div>
  );
};
