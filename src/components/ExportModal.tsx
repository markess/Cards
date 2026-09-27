import React, { useState } from 'react';
import { X, Copy, Check, Printer, Download, Share2, FileCode } from 'lucide-react';
import { StudySet } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  studySet: StudySet;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, studySet }) => {
  const [format, setFormat] = useState<'tsv' | 'csv' | 'json'>('tsv');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getExportText = () => {
    switch (format) {
      case 'tsv':
        return studySet.terms.map((t) => `${t.term}\t${t.definition}`).join('\n');
      case 'csv':
        return (
          'Term,Definition\n' +
          studySet.terms
            .map((t) => `"${t.term.replace(/"/g, '""')}","${t.definition.replace(/"/g, '""')}"`)
            .join('\n')
        );
      case 'json':
        return JSON.stringify(
          {
            title: studySet.title,
            description: studySet.description,
            tags: studySet.tags,
            terms: studySet.terms.map((t) => ({ term: t.term, definition: t.definition })),
          },
          null,
          2
        );
    }
  };

  const exportContent = getExportText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleDownload = () => {
    const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'txt';
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${studySet.title.toLowerCase().replace(/\s+/g, '_')}_export.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${studySet.title} - Cards Study Sheet</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
            h1 { margin-bottom: 4px; font-size: 24px; }
            p { margin-top: 0; color: #64748b; font-size: 14px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px 14px; text-align: left; font-size: 14px; }
            th { background-color: #f1f5f9; font-weight: 600; width: 35%; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .header-bar { border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }
            .brand { font-size: 12px; color: #6366f1; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <span class="brand">Cards Study Sheet</span>
            <h1>${studySet.title}</h1>
            <p>${studySet.description || 'Generated with Cards'} (${studySet.terms.length} terms)</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Term</th>
                <th>Definition</th>
              </tr>
            </thead>
            <tbody>
              ${studySet.terms
                .map(
                  (t) => `
                <tr>
                  <td><strong>${t.term}</strong></td>
                  <td>${t.definition}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Export & Print Study Set
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {studySet.title} ({studySet.terms.length} terms)
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

        {/* Format Selector */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFormat('tsv')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                format === 'tsv'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              List Format (Tab / \\n)
            </button>
            <button
              onClick={() => setFormat('csv')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                format === 'csv'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              CSV Spreadsheet
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                format === 'json'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              JSON
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-500" />
            <span>Print Sheet</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="p-6 flex-1 overflow-y-auto">
          <textarea
            readOnly
            rows={10}
            value={exportContent}
            className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition-all"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
