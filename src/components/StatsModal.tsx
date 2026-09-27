import React from 'react';
import { X, Flame, Clock, Award, BookOpen, CheckCircle, Trophy, RotateCcw } from 'lucide-react';
import { UserStats } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
  onResetData: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  onResetData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Flame className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Study Progress & Achievements
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track your consistent daily momentum
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
        <div className="p-6 space-y-6">
          {/* Main Streak Hero */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/20 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                Current Streak
              </span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-baseline gap-1 mt-0.5">
                <span>{stats.streakDays}</span>
                <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                  {stats.streakDays === 1 ? 'day' : 'days'} in a row
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Study every day to build long-term retention!
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center shadow-inner">
              <Flame className="w-10 h-10 text-amber-500 fill-amber-500 animate-bounce" />
            </div>
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>Cards Studied</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {stats.totalCardsStudied}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>Total Study Time</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {stats.totalTimeMinutes}m
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                <span>Tests Passed</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {stats.testsCompleted}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>Match Races Won</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {stats.matchesWon}
              </div>
            </div>
          </div>

          {/* Reset button */}
          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="text-slate-500">Need to start fresh?</span>
            <button
              onClick={() => {
                if (confirm('Reset all demo sets and stats to original state?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 hover:underline font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset all sample data</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Keep Studying
          </button>
        </div>
      </div>
    </div>
  );
};
