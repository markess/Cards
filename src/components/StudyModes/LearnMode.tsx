import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Check, 
  X, 
  Volume2, 
  Sparkles, 
  RotateCcw, 
  ArrowRight,
  Award,
  CheckCircle2,
  Eye,
  TrendingUp,
  Keyboard
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudySet, Term } from '../../types';
import { cortexGrade, GradeResult } from '../../utils/cortexGrading';
import { speakText, getVoiceConfigFromTags } from '../../utils/tts';

interface LearnModeProps {
  studySet: StudySet;
  onExit: () => void;
  onRecordStudy: (cards: number) => void;
}

type QuestionType = 
  | 'mc-definition' // Given term, pick definition
  | 'mc-term'       // Given definition, pick term
  | 'true-false'    // Is this definition true for this term?
  | 'flashcard'     // Active recall flip card
  | 'written';      // Type answer

interface LearnQuestion {
  term: Term;
  type: QuestionType;
  prompt: string;
  subPrompt?: string;
  correctAnswer: string;
  options?: string[]; // for multiple choice
  tfCandidate?: string; // for true/false
  tfIsCorrect?: boolean;
}

// Fisher-Yates shuffle utility
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface TermProgress {
  correctCount: number;
  requiredCorrect: number; // 2 if flashcard ("Flip to verify definition"), 1 if any other mode
  isMastered: boolean;
}

export const LearnMode: React.FC<LearnModeProps> = ({
  studySet,
  onExit,
  onRecordStudy,
}) => {
  // Mastery tracking: termId -> TermProgress
  const [progress, setProgress] = useState<Record<string, TermProgress>>({});
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [roundQuestions, setRoundQuestions] = useState<LearnQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  
  // Answering state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [writtenAnswer, setWrittenAnswer] = useState<string>('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [gradingResult, setGradingResult] = useState<GradeResult | null>(null);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const [roundCompleted, setRoundCompleted] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to build questions for a set of terms with randomized modes
  const buildQuestionsForTerms = (terms: Term[], currentProgress: Record<string, TermProgress>): LearnQuestion[] => {
    // All available learning methods
    const allTypes: QuestionType[] = ['mc-definition', 'mc-term', 'true-false', 'flashcard', 'written'];

    return terms.map((t) => {
      const otherTerms = studySet.terms.filter((ot) => ot.id !== t.id);

      // Random learning mode selection for each question
      let chosenType: QuestionType;
      if (otherTerms.length >= 1) {
        chosenType = allTypes[Math.floor(Math.random() * allTypes.length)];
      } else {
        // Fallback for single-term set
        chosenType = Math.random() > 0.5 ? 'flashcard' : 'written';
      }

      if (chosenType === 'mc-definition') {
        const correct = t.definition;
        const distractors = shuffle(otherTerms)
          .slice(0, 3)
          .map((ot) => ot.definition);
        const options = shuffle([correct, ...distractors]);

        return {
          term: t,
          type: 'mc-definition',
          prompt: t.term,
          subPrompt: 'Select matching definition',
          correctAnswer: correct,
          options,
        };
      }

      if (chosenType === 'mc-term') {
        const correct = t.term;
        const distractors = shuffle(otherTerms)
          .slice(0, 3)
          .map((ot) => ot.term);
        const options = shuffle([correct, ...distractors]);

        return {
          term: t,
          type: 'mc-term',
          prompt: t.definition,
          subPrompt: 'Which term matches this definition?',
          correctAnswer: correct,
          options,
        };
      }

      if (chosenType === 'true-false') {
        const isActuallyTrue = Math.random() > 0.5 || otherTerms.length === 0;
        let candidateDef = t.definition;
        if (!isActuallyTrue && otherTerms.length > 0) {
          const fake = otherTerms[Math.floor(Math.random() * otherTerms.length)];
          candidateDef = fake.definition;
        }

        return {
          term: t,
          type: 'true-false',
          prompt: t.term,
          subPrompt: 'True or False — Is this definition correct?',
          correctAnswer: isActuallyTrue ? 'True' : 'False',
          tfCandidate: candidateDef,
          tfIsCorrect: isActuallyTrue,
        };
      }

      if (chosenType === 'flashcard') {
        return {
          term: t,
          type: 'flashcard',
          prompt: t.term,
          subPrompt: 'Active Recall — Flip to verify definition',
          correctAnswer: t.definition,
        };
      }

      // Default: written
      return {
        term: t,
        type: 'written',
        prompt: t.definition,
        subPrompt: 'Type the matching term',
        correctAnswer: t.term,
      };
    });
  };

  // Start new round
  const startRound = (newRoundNum: number, currentProgress: Record<string, TermProgress>) => {
    // Only terms that are NOT yet mastered are included
    const unmastered = studySet.terms.filter((t) => !currentProgress[t.id]?.isMastered);

    if (unmastered.length === 0) {
      setRoundCompleted(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      return;
    }

    // Terms in Learn appear in RANDOM order (shuffled)
    const shuffledUnmastered = shuffle(unmastered);

    // Batch of up to 6 terms for this round
    const batch = shuffledUnmastered.slice(0, 6);
    const questions = buildQuestionsForTerms(batch, currentProgress);

    setRoundQuestions(questions);
    setRoundNumber(newRoundNum);
    setCurrentIndex(0);
    setIsAnswerSubmitted(false);
    setSelectedOption(null);
    setWrittenAnswer('');
    setGradingResult(null);
    setIsCardFlipped(false);
    setRoundCompleted(false);
  };

  // Initialize once per studySet id
  useEffect(() => {
    setProgress({});
    startRound(1, {});
  }, [studySet.id]);

  const currentQ: LearnQuestion | undefined = roundQuestions[currentIndex];

  // Auto-focus input on written questions
  useEffect(() => {
    if (currentQ?.type === 'written' && !isAnswerSubmitted && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentQ?.type, currentIndex, isAnswerSubmitted]);

  // Tag-based pronunciation (ES, FR, EN)
  const handleSpeak = (text?: string) => {
    const voiceConfig = getVoiceConfigFromTags(studySet.tags);
    // If text not provided or if prompt is definition, pronounce the actual term
    const targetText = text || currentQ?.term.term || '';
    speakText(targetText, voiceConfig);
  };

  // Submit Answer
  const submitAnswer = (userAns: string, isCorrect: boolean, feedback?: string) => {
    if (isAnswerSubmitted || !currentQ) return;

    setSelectedOption(userAns);
    setIsAnswerSubmitted(true);

    const termId = currentQ.term.id;
    const isFlip = currentQ.type === 'flashcard';

    let defaultFeedback = feedback;
    if (!defaultFeedback) {
      if (isCorrect) {
        if (isFlip) {
          defaultFeedback = 'Correct! 1 of 2 verifications recorded for Flip mode.';
        } else {
          defaultFeedback = 'Correct! This term is now mastered and completed for all 5 rounds.';
        }
      } else {
        defaultFeedback = `Incorrect. Progress for this term has been reset. The correct answer is: ${currentQ.correctAnswer}`;
      }
    }

    setGradingResult({
      isCorrect,
      isClose: false,
      score: isCorrect ? 1.0 : 0.0,
      feedback: defaultFeedback,
    });

    // Update progress:
    // If correct in Flip mode ("Flip to verify definition"): requires 2 correct answers across all rounds
    // If correct in any other mode: requires ONLY 1 correct answer across all rounds
    // If incorrect in any mode: counter is RESET to 0!
    setProgress((prev) => {
      const existing = prev[termId] || { correctCount: 0, requiredCorrect: isFlip ? 2 : 1, isMastered: false };

      if (isCorrect) {
        if (isFlip) {
          const nextCount = existing.correctCount + 1;
          const isMastered = nextCount >= 2;
          return {
            ...prev,
            [termId]: {
              correctCount: nextCount,
              requiredCorrect: 2,
              isMastered,
            },
          };
        } else {
          // 1 correct answer in any test/written/choice mode fulfills mastery!
          return {
            ...prev,
            [termId]: {
              correctCount: existing.correctCount + 1,
              requiredCorrect: 1,
              isMastered: true,
            },
          };
        }
      } else {
        // Incorrect answer: counter resets to 0!
        return {
          ...prev,
          [termId]: {
            correctCount: 0,
            requiredCorrect: 1,
            isMastered: false,
          },
        };
      }
    });

    onRecordStudy(1);
  };

  // Handle multiple-choice click
  const handleSelectMC = (option: string) => {
    if (!currentQ) return;
    const isCorrect = option === currentQ.correctAnswer;
    submitAnswer(option, isCorrect);
  };

  // Handle true/false click
  const handleSelectTF = (userChoice: boolean) => {
    if (!currentQ) return;
    const isCorrect = userChoice === currentQ.tfIsCorrect;
    const choiceStr = userChoice ? 'True' : 'False';
    const feedback = isCorrect
      ? 'Well done! Evaluated correctly.'
      : `Incorrect. True definition: "${currentQ.term.definition}"`;
    submitAnswer(choiceStr, isCorrect, feedback);
  };

  // Handle Flashcard self-assessment
  const handleFlashcardRating = (known: boolean) => {
    if (!currentQ) return;
    submitAnswer(
      known ? 'Know it' : 'Still learning',
      known,
      known
        ? 'Great! 1 correct verification recorded (needs 2 to master in Flip mode).'
        : 'Keep practicing! Progress for this card has been reset.'
    );
  };

  // Handle written submission
  const handleWrittenSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentQ || isAnswerSubmitted || !writtenAnswer.trim()) return;

    const grade = cortexGrade(writtenAnswer, currentQ.correctAnswer);
    submitAnswer(writtenAnswer, grade.isCorrect, grade.feedback);
  };

  // Override answer as correct
  const handleOverrideCorrect = () => {
    if (!currentQ) return;
    setGradingResult((prev) =>
      prev ? { ...prev, isCorrect: true, feedback: 'Overridden: Marked as correct.' } : null
    );
    const termId = currentQ.term.id;
    const isFlip = currentQ.type === 'flashcard';
    setProgress((prev) => {
      const existing = prev[termId] || { correctCount: 0, requiredCorrect: isFlip ? 2 : 1, isMastered: false };
      const nextCount = existing.correctCount + 1;
      const isMastered = isFlip ? nextCount >= 2 : true;
      return {
        ...prev,
        [termId]: {
          correctCount: nextCount,
          requiredCorrect: isFlip ? 2 : 1,
          isMastered,
        },
      };
    });
  };

  // Advance to next question in this round, or finish round
  const handleNext = () => {
    if (currentIndex + 1 < roundQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsAnswerSubmitted(false);
      setSelectedOption(null);
      setWrittenAnswer('');
      setGradingResult(null);
      setIsCardFlipped(false);
    } else {
      // Round is finished!
      setRoundCompleted(true);
    }
  };

  // Comprehensive keyboard shortcut support for LearnMode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // In text input during written mode, let normal typing happen
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      // 1. Advance to next question after submitting answer
      if (isAnswerSubmitted) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      // If typing in written input, only Enter submits the form (handled by standard form submit)
      if (isInputActive) {
        return;
      }

      if (!currentQ) return;

      // 2. Multiple choice: keys '1', '2', '3', '4'
      if ((currentQ.type === 'mc-definition' || currentQ.type === 'mc-term') && currentQ.options) {
        const keyNum = parseInt(e.key, 10);
        if (keyNum >= 1 && keyNum <= currentQ.options.length) {
          e.preventDefault();
          handleSelectMC(currentQ.options[keyNum - 1]);
          return;
        }
      }

      // 3. True / False: '1' or 'T' or 'Y' for True; '2' or 'F' or 'N' for False
      if (currentQ.type === 'true-false') {
        const k = e.key.toUpperCase();
        if (k === '1' || k === 'T' || k === 'Y') {
          e.preventDefault();
          handleSelectTF(true);
          return;
        }
        if (k === '2' || k === 'F' || k === 'N') {
          e.preventDefault();
          handleSelectTF(false);
          return;
        }
      }

      // 4. Flashcard mode: Space to flip, then '1' for Still Learning, '2' for I knew this
      if (currentQ.type === 'flashcard') {
        if (e.code === 'Space') {
          e.preventDefault();
          setIsCardFlipped((prev) => !prev);
          return;
        }

        if (isCardFlipped) {
          if (e.key === '1' || e.key.toUpperCase() === 'L') {
            e.preventDefault();
            handleFlashcardRating(false);
            return;
          }
          if (e.key === '2' || e.key.toUpperCase() === 'K') {
            e.preventDefault();
            handleFlashcardRating(true);
            return;
          }
        }
      }

      // Pronunciation shortcut: 'P' or 'V' to pronounce prompt
      if (e.key.toUpperCase() === 'P' || e.key.toUpperCase() === 'V') {
        e.preventDefault();
        handleSpeak(currentQ.prompt);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerSubmitted, currentQ, currentIndex, isCardFlipped]);

  // Overall Mastery calculations
  const totalMastered = studySet.terms.filter((t) => progress[t.id]?.isMastered).length;
  const totalFamiliar = studySet.terms.filter(
    (t) => !progress[t.id]?.isMastered && (progress[t.id]?.correctCount || 0) > 0
  ).length;
  const totalNotStudied = Math.max(0, studySet.terms.length - (totalMastered + totalFamiliar));
  const isSetCompletelyMastered = totalMastered === studySet.terms.length && studySet.terms.length > 0;

  // Real-time Round step calculation: visibly increases with every question
  const currentStep = roundCompleted 
    ? roundQuestions.length 
    : currentIndex + (isAnswerSubmitted ? 1 : 0);
  const roundProgressPercent = Math.min(100, Math.round((currentStep / Math.max(1, roundQuestions.length)) * 100));

  // Overall set mastery score
  const overallMasteryPercent = Math.min(
    100,
    Math.round((totalMastered / Math.max(1, studySet.terms.length)) * 100)
  );

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Learn</span>
        </button>

        {/* Dynamic task badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 text-xs font-semibold border border-indigo-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cortex Adaptive Learning</span>
        </div>

        {/* Stage / Round Counter */}
        <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 text-white shadow-sm flex items-center gap-1.5">
          <span>Stage / Round</span>
          <span className="w-5 h-5 rounded-full bg-white text-indigo-700 flex items-center justify-center font-black text-[11px]">
            {roundNumber}
          </span>
          <span className="text-indigo-200 text-[10px]">of 5</span>
        </div>
      </div>

      {/* DUAL REAL-TIME PROGRESS BARS */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* 1. Current Round Step Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span>Round {roundNumber} Progress:</span>
              <strong className="text-indigo-600 dark:text-indigo-400">
                {currentStep} of {roundQuestions.length} questions
              </strong>
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
              {roundProgressPercent}%
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${roundProgressPercent}%` }}
            />
          </div>
        </div>

        {/* 2. Overall Set Mastery Breakdown */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Overall Set Mastery: {overallMasteryPercent}%</span>
            </span>

            <div className="flex items-center gap-2.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {totalMastered} Mastered
              </span>
              <span>&bull;</span>
              <span className="text-amber-500 font-bold">
                {totalFamiliar} Familiar
              </span>
              <span>&bull;</span>
              <span>{studySet.terms.length} total</span>
            </div>
          </div>

          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${(totalMastered / Math.max(1, studySet.terms.length)) * 100}%` }}
            />
            <div
              className="bg-amber-400 transition-all duration-500"
              style={{ width: `${(totalFamiliar / Math.max(1, studySet.terms.length)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* VIEW: Round / Stage Completed Screen */}
      {roundCompleted ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 animate-fade-in my-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              Stage Completed
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {isSetCompletelyMastered
                ? 'Study Set 100% Mastered!'
                : `Round ${roundNumber} of 5 Complete!`}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              {isSetCompletelyMastered
                ? 'Congratulations! All terms have been mastered across all 5 rounds.'
                : `Great progress! Terms answered correctly are completed across all 5 rounds. Unmastered terms will advance to Round ${roundNumber + 1}.`}
            </p>
          </div>

          {/* Mastery breakdown badges */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-left">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                Mastered
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {totalMastered}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400">
                Familiar
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {totalFamiliar}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Remaining
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {totalNotStudied}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {!isSetCompletelyMastered ? (
              <button
                onClick={() => startRound(roundNumber + 1, progress)}
                className="w-full sm:w-auto px-7 py-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Continue to Round {roundNumber + 1} {roundNumber < 5 ? 'of 5' : ''}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setProgress({});
                  startRound(1, {});
                }}
                className="w-full sm:w-auto px-7 py-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Practice Set Again</span>
              </button>
            )}

            <button
              onClick={onExit}
              className="w-full sm:w-auto px-5 py-3 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Back to Study Set
            </button>
          </div>
        </div>
      ) : currentQ ? (
        /* VIEW: Active Question Card */
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-fade-in">
          {/* Prompt Header */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                  {currentQ.subPrompt}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  currentQ.type === 'flashcard'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                }`}>
                  {currentQ.type === 'flashcard' ? '2 correct needed' : '1 correct needed'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  <Keyboard className="w-3 h-3" />
                  <span>Keys: 1-4 &bull; T/F &bull; Space</span>
                </span>
                <button
                  onClick={() => handleSpeak(currentQ.type === 'mc-term' || currentQ.type === 'written' ? currentQ.term.term : currentQ.prompt)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Pronounce (Key: P or V)"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {currentQ.prompt}
            </h3>
          </div>

          {/* TASK 1 & 2: Multiple Choice */}
          {(currentQ.type === 'mc-definition' || currentQ.type === 'mc-term') && currentQ.options && (
            <div className="grid grid-cols-1 gap-3 pt-2">
              {currentQ.options.map((opt, idx) => {
                let btnStyle =
                  'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-slate-800';

                if (isAnswerSubmitted) {
                  if (opt === currentQ.correctAnswer) {
                    btnStyle =
                      'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-medium';
                  } else if (opt === selectedOption) {
                    btnStyle =
                      'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100';
                  } else {
                    btnStyle = 'opacity-40 border-slate-200 dark:border-slate-800';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswerSubmitted}
                    onClick={() => handleSelectMC(opt)}
                    className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all ${btnStyle}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm leading-snug flex-1">{opt}</span>
                    {isAnswerSubmitted && opt === currentQ.correctAnswer && (
                      <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    {isAnswerSubmitted && opt === selectedOption && opt !== currentQ.correctAnswer && (
                      <X className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* TASK 3: True / False Evaluation */}
          {currentQ.type === 'true-false' && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                  Proposed Definition:
                </span>
                <p className="text-base font-medium text-slate-800 dark:text-slate-100">
                  &ldquo;{currentQ.tfCandidate}&rdquo;
                </p>
              </div>

              {!isAnswerSubmitted ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleSelectTF(true)}
                    className="p-4 rounded-xl border-2 border-emerald-400 dark:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <Check className="w-4 h-4" />
                    <span>True / Correct (T)</span>
                  </button>

                  <button
                    onClick={() => handleSelectTF(false)}
                    className="p-4 rounded-xl border-2 border-red-400 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-700 dark:text-red-300 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <span className="w-5 h-5 rounded bg-red-500/20 text-red-700 dark:text-red-300 text-xs font-black flex items-center justify-center">
                      2
                    </span>
                    <X className="w-4 h-4" />
                    <span>False / Incorrect (F)</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* TASK 4: Flashcard Active Recall */}
          {currentQ.type === 'flashcard' && (
            <div className="space-y-4 pt-2">
              <div
                onClick={() => !isAnswerSubmitted && setIsCardFlipped(!isCardFlipped)}
                className={`p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                  isCardFlipped
                    ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                {!isCardFlipped ? (
                  <div className="text-center py-4 space-y-2">
                    <Eye className="w-6 h-6 text-indigo-500 mx-auto" />
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      Click or press [Space] to reveal definition
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 animate-fade-in">
                    <span className="text-[11px] font-bold uppercase text-slate-400">
                      Definition:
                    </span>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {currentQ.term.definition}
                    </p>
                  </div>
                )}
              </div>

              {isCardFlipped && !isAnswerSubmitted && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleFlashcardRating(false)}
                    className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <RotateCcw className="w-4 h-4" />
                    <span>Still learning (1)</span>
                  </button>

                  <button
                    onClick={() => handleFlashcardRating(true)}
                    className="p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span className="w-5 h-5 rounded bg-white/20 text-white text-xs font-black flex items-center justify-center">
                      2
                    </span>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>I knew this (2)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TASK 5: Written Answer Typing Input */}
          {currentQ.type === 'written' && (
            <form onSubmit={handleWrittenSubmit} className="space-y-4 pt-2">
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  disabled={isAnswerSubmitted}
                  value={writtenAnswer}
                  onChange={(e) => setWrittenAnswer(e.target.value)}
                  placeholder="Type the matching term here..."
                  className="w-full p-3.5 text-sm sm:text-base rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {!isAnswerSubmitted && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!writtenAnswer.trim()}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all"
                  >
                    Check with Cortex
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Feedback & Cortex Evaluation Banner */}
          {isAnswerSubmitted && gradingResult && (
            <div
              className={`p-4 rounded-xl border animate-fade-in ${
                gradingResult.isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800/80 text-red-900 dark:text-red-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {gradingResult.isCorrect ? (
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                  )}
                  <span className="font-bold text-sm">
                    {gradingResult.isCorrect ? 'Well done!' : 'Study this term!'}
                  </span>
                </div>

                {!gradingResult.isCorrect && (
                  <button
                    type="button"
                    onClick={handleOverrideCorrect}
                    className="text-xs font-semibold underline text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    I was right (override)
                  </button>
                )}
              </div>

              <p className="text-xs mt-1.5 opacity-90">{gradingResult.feedback}</p>

              {!gradingResult.isCorrect && (
                <div className="mt-2.5 pt-2 border-t border-red-200 dark:border-red-800/50 text-xs">
                  <span className="font-semibold block text-slate-600 dark:text-slate-300 mb-0.5">
                    Correct Answer:
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {currentQ.correctAnswer}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Next Button when answer is submitted */}
          {isAnswerSubmitted && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
