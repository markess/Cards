import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Volume2, 
  Check, 
  X, 
  Sparkles, 
  RotateCcw, 
  ArrowRight,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudySet, Term } from '../../types';
import { cortexGrade, GradeResult } from '../../utils/cortexGrading';
import { speakText, getVoiceConfigFromTags } from '../../utils/tts';

interface WriteModeProps {
  studySet: StudySet;
  onExit: () => void;
  onRecordStudy: (cards: number) => void;
}

export const WriteMode: React.FC<WriteModeProps> = ({
  studySet,
  onExit,
  onRecordStudy,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [gradingResult, setGradingResult] = useState<GradeResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const terms = studySet.terms;
  const currentTerm: Term | undefined = terms[currentIndex];

  useEffect(() => {
    if (!isSubmitted && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, isSubmitted]);

  const handleSpeak = (text: string) => {
    const voiceConfig = getVoiceConfigFromTags(studySet.tags);
    speakText(text, voiceConfig);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitted || !currentTerm || !userInput.trim()) return;

    const result = cortexGrade(userInput, currentTerm.term);
    setGradingResult(result);
    setIsSubmitted(true);
    onRecordStudy(1);

    if (result.isCorrect) {
      setCompletedCount((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < terms.length) {
      setCurrentIndex((prev) => prev + 1);
      setUserInput('');
      setIsSubmitted(false);
      setGradingResult(null);
      setShowHint(false);
    } else {
      setIsFinished(true);
      confetti({ particleCount: 90, spread: 60 });
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setUserInput('');
    setIsSubmitted(false);
    setGradingResult(null);
    setShowHint(false);
    setCompletedCount(0);
    setIsFinished(false);
  };

  // Keyboard shortcut for continue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitted && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitted, currentIndex, terms.length]);

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Spell & Write</span>
        </button>

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Card <span className="text-slate-900 dark:text-white font-bold">{currentIndex + 1}</span> of {terms.length}
        </div>
      </div>

      {isFinished ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl text-center space-y-6 my-auto animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
            <Check className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Write Session Complete!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              You correctly spelled {completedCount} out of {terms.length} terms.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practice Again</span>
            </button>
            <button
              onClick={onExit}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200"
            >
              Back to Study Set
            </button>
          </div>
        </div>
      ) : currentTerm ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl space-y-6 animate-fade-in">
          {/* Prompt (Definition) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Definition
              </span>
              <button
                type="button"
                onClick={() => handleSpeak(currentTerm.definition)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="Hear definition"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xl sm:text-2xl font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
              {currentTerm.definition}
            </p>
          </div>

          {/* Hint button */}
          {!isSubmitted && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{showHint ? 'Hide Hint' : "Don't know? Give me a hint"}</span>
              </button>
              {showHint && (
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  Starts with: "{currentTerm.term.slice(0, 2)}..." ({currentTerm.term.length} letters)
                </span>
              )}
            </div>
          )}

          {/* User Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Type the term:
              </label>
              <input
                ref={inputRef}
                type="text"
                disabled={isSubmitted}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type the matching term..."
                className="w-full p-3.5 text-sm sm:text-base rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {!isSubmitted && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all"
                >
                  Answer
                </button>
              </div>
            )}
          </form>

          {/* Grading feedback */}
          {isSubmitted && gradingResult && (
            <div
              className={`p-4 rounded-xl border animate-fade-in ${
                gradingResult.isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800/80 text-red-900 dark:text-red-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {gradingResult.isCorrect ? (
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <X className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                )}
                <span className="font-bold text-sm">
                  {gradingResult.isCorrect ? 'Correct!' : 'Incorrect'}
                </span>
              </div>

              <p className="text-xs mt-1 opacity-90">{gradingResult.feedback}</p>

              {!gradingResult.isCorrect && (
                <div className="mt-3 pt-2.5 border-t border-red-200 dark:border-red-800/50 text-xs">
                  <span className="font-semibold block text-slate-600 dark:text-slate-300 mb-1">
                    Correct Spelling:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900 dark:text-white">
                      {currentTerm.term}
                    </span>
                    <button
                      onClick={() => handleSpeak(currentTerm.term)}
                      className="p-1 rounded text-slate-500 hover:text-indigo-600"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30"
                >
                  <span>Press Any Key / Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
