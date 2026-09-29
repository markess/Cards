import React, { useState } from 'react';
import { X, Folder, Plus, Trash2, Tag, Check } from 'lucide-react';
import { Folder as FolderType } from '../types';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderType[];
  onCreateFolder: (folder: FolderType) => void;
  onDeleteFolder: (folderId: string) => void;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  folders,
  onCreateFolder,
  onDeleteFolder,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    // Check if a folder with the same name already exists (case-insensitive)
    const exists = folders.some(
      (f) => f.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (exists) {
      setErrorMessage(`Папка с названием "${trimmed}" уже существует.`);
      return;
    }

    setErrorMessage(null);
    const newFolder: FolderType = {
      id: `folder-${Date.now()}`,
      name: trimmed,
      description: description.trim(),
      color: selectedColor,
      createdAt: Date.now(),
    };

    onCreateFolder(newFolder);
    setName('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Folders & Categories</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize your study sets by subject or class
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
        <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[70vh]">
          {/* Create new folder form */}
          <form onSubmit={handleCreate} className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Create New Folder
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Folder Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="e.g. Psychology 101, MCAT Prep"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:outline-none transition-colors ${
                  errorMessage
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
                }`}
              />
              {errorMessage && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errorMessage}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Color selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Badge Color
              </label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  >
                    {selectedColor === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Folder</span>
            </button>
          </form>

          {/* Existing folders list */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Your Folders ({folders.length})
            </h3>
            {folders.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No folders created yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {folders.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: f.color }}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {f.name}
                        </div>
                        {f.description && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {f.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteFolder(f.id)}
                      title="Delete folder"
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
