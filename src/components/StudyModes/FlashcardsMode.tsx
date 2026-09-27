import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Volume2, 
  Star, 
  Shuffle, 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  Settings2, 
  Check, 
  Sparkles,
  Gamepad2,
  BookOpen
} from 'lucide-react';
import { StudySet, Term } from '../../types';
import { speakText, getVoiceConfigFromTags } from '../../utils/tts';

interface FlashcardsModeProps {
  studySet: StudySet;
  onExit: () => void;
  onUpdateTermStarred: (termId: string, starred: boolean) => void;
  onNavigateToMode: (mode: 'learn' | 'match' | 'test') => void;
  onRecordStudy: (cards: number) => void;
}

export const FlashcardsMode: React.FC<FlashcardsModeProps> = ({
  studySet,
  onExit,
  onUpdateTermStarred,
  onNavigateToMode,
  onRecordStudy,
}) => {
  // Settings & state
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [flipPromptFirst, setFlipPromptFirst] = useState(false); // false = term first, true = def first
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoPlayInterval, setAutoPlayInterval] = useState(4000); // 4 seconds

  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active terms pool
  const termsList = React.useMemo(() => {
    let list = [...studySet.terms];
    if (starredOnly) {
      const starred = list.filter((t) => t.starred);
      if (starred.length > 0) list = starred;
    }
    if (isShuffled) {
      // Deterministic shuffle
      return [...list].sort(() => Math.random() - 0.5);
    }
    return list;
  }, [studySet.terms, starredOnly, isShuffled]);

  const currentTerm = termsList[currentIndex] || termsList[0];

  // Flip handler
  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Navigation handlers
  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1 < termsList.length ? prev + 1 : 0));
    onRecordStudy(1);
  }, [termsList.length, onRecordStudy]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : termsList.length - 1));
  }, [termsList.length]);

  // Star toggle
  const handleToggleStar = useCallback(() => {
    if (!currentTerm) return;
    onUpdateTermStarred(currentTerm.id, !currentTerm.starred);
  }, [currentTerm, onUpdateTermStarred]);

  // Audio pronunciation
  const handleSpeak = useCallback((text: string) => {
    const voiceConfig = getVoiceConfigFromTags(studySet.tags);
    speakText(text, voiceConfig);
  }, [studySet.tags]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if focus is on an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        handleToggleStar();
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        if (currentTerm) {
          handleSpeak(isFlipped ? currentTerm.definition : currentTerm.term);
        }
      } else if (e.code === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen?.();
          setIsFullscreen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, handleToggleStar, handleSpeak, currentTerm, isFlipped, isFullscreen]);

  // Autoplay effect
  useEffect(() => {
    if (!isAutoPlaying) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = setInterval(() => {
      setIsFlipped((prev) => {
        if (!prev) {
          return true; // flip to back
        } else {
          handleNext();
          return false; // next card
        }
      });
    }, autoPlayInterval);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, autoPlayInterval, handleNext]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch((err) => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch((err) => console.log(err));
      setIsFullscreen(false);
    }
  };

  if (!currentTerm) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-500">No cards match the current filter.</p>
        <button
          onClick={() => setStarredOnly(false)}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white"
        >
          Show All Cards
        </button>
      </div>
    );
  }

  const frontText = flipPromptFirst ? currentTerm.definition : currentTerm.term;
  const backText = flipPromptFirst ? currentTerm.term : currentTerm.definition;
  const frontLabel = flipPromptFirst ? 'Definition' : 'Term';
  const backLabel = flipPromptFirst ? 'Term' : 'Definition';

  const progressPct = ((currentIndex + 1) / termsList.length) * 100;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col flex-1 max-w-4xl mx-auto w-full px-4 py-4 ${
        isFullscreen ? 'bg-slate-900 fixed inset-0 z-50 max-w-none p-6 justify-center' : ''
      }`}
    >
      {/* Top Bar Navigation & Controls */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Set</span>
          </button>
          <div className="hidden sm:block">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs">
              {studySet.title}
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Flashcards Study Mode
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          {/* Starred filter */}
          <button
            onClick={() => setStarredOnly(!starredOnly)}
            title={starredOnly ? 'Showing starred only (Click for all)' : 'Filter starred terms'}
            className={`p-2 rounded-lg text-xs font-medium transition-colors ${
              starredOnly
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Star className={`w-4 h-4 ${starredOnly ? 'fill-amber-500' : ''}`} />
          </button>

          {/* Shuffle */}
          <button
            onClick={() => {
              setIsShuffled(!isShuffled);
              setCurrentIndex(0);
            }}
            title={isShuffled ? 'Shuffled' : 'Shuffle cards'}
            className={`p-2 rounded-lg text-xs font-medium transition-colors ${
              isShuffled
                ? 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Autoplay */}
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            title={isAutoPlaying ? 'Pause Autoplay' : 'Start Autoplay'}
            className={`p-2 rounded-lg text-xs font-medium transition-colors ${
              isAutoPlaying
                ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Settings dropdown toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Options & Shortcuts"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Settings popup panel */}
      {showSettings && (
        <div className="mb-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl space-y-3 text-xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
            <span className="font-bold text-slate-900 dark:text-white">Flashcard Settings</span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Close
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={flipPromptFirst}
                onChange={(e) => setFlipPromptFirst(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700 dark:text-slate-300">Answer with term first (Definition front)</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-slate-700 dark:text-slate-300">Autoplay Speed:</span>
              <select
                value={autoPlayInterval}
                onChange={(e) => setAutoPlayInterval(Number(e.target.value))}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value={3000}>3 seconds</option>
                <option value={4000}>4 seconds</option>
                <option value={6000}>6 seconds</option>
              </select>
            </div>
          </div>
          <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">Space</kbd> Flip card</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">&larr; / &rarr;</kbd> Next / Previous</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">S</kbd> Star</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">T</kbd> Audio pronunciation</span>
          </div>
        </div>
      )}

      {/* Main Flashcard 3D Stage */}
      <div className="flex-1 flex flex-col justify-center min-h-[380px] sm:min-h-[440px] perspective-1000 select-none">
        <div
          onClick={handleFlip}
          className={`relative w-full h-[360px] sm:h-[420px] rounded-3xl cursor-pointer transition-transform duration-500 transform-style-3d shadow-xl border border-slate-200/80 dark:border-slate-800/80 ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Card Front */}
          <div className="absolute inset-0 backface-hidden rounded-3xl p-8 flex flex-col justify-between bg-white dark:bg-slate-800 shadow-md">
            {/* Top front badges */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="uppercase tracking-wider font-semibold text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                {frontLabel}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(frontText);
                  }}
                  title="Pronounce text"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStar();
                  }}
                  title="Star this card"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <Star className={`w-4 h-4 ${currentTerm.starred ? 'fill-amber-500 text-amber-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center text-center px-4">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white leading-snug">
                {frontText}
              </h3>
            </div>

            {/* Bottom prompt hint */}
            <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
              <span>Click or press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px]">Space</kbd> to flip</span>
            </div>
          </div>

          {/* Card Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl p-8 flex flex-col justify-between bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-800 dark:to-slate-900 shadow-md border-indigo-100 dark:border-indigo-900/30">
            {/* Top back badges */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="uppercase tracking-wider font-semibold text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {backLabel}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(backText);
                  }}
                  title="Pronounce text"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStar();
                  }}
                  title="Star this card"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <Star className={`w-4 h-4 ${currentTerm.starred ? 'fill-amber-500 text-amber-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center text-center px-4">
              <p className="text-xl sm:text-2xl md:text-3xl font-medium text-slate-800 dark:text-slate-100 leading-relaxed max-w-xl">
                {backText}
              </p>
            </div>

            {/* Bottom prompt hint */}
            <div className="text-center text-xs text-indigo-500 dark:text-indigo-400 flex items-center justify-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Click to flip back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Bottom Bar Controls */}
      <div className="mt-4 space-y-3">
        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Counter and Arrows */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Card <span className="text-slate-900 dark:text-white font-bold">{currentIndex + 1}</span> of {termsList.length}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              title="Previous card"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              title="Next card"
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Quick jump to other study modes */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => onNavigateToMode('match')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Match Game</span>
            </button>
            <button
              onClick={() => onNavigateToMode('learn')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Learn Mode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
