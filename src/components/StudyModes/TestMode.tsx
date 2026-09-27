import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Award, 
  RotateCcw, 
  Printer, 
  SlidersHorizontal,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudySet, Term, TestQuestion, TestSettings } from '../../types';
import { cortexGrade } from '../../utils/cortexGrading';

interface TestModeProps {
  studySet: StudySet;
  onExit: () => void;
  onRecordTestCompleted: () => void;
  onRecordStudy: (cards: number) => void;
}

export const TestMode: React.FC<TestModeProps> = ({
  studySet,
  onExit,
  onRecordTestCompleted,
  onRecordStudy,
}) => {
  // Test configuration
  const [settings, setSettings] = useState<TestSettings>({
    questionCount: Math.min(studySet.terms.length, 10),
    questionTypes: {
      multipleChoice: true,
      trueFalse: true,
      written: true,
    },
    promptWith: 'term',
    instantFeedback: false,
  });

  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  // Generate test questions
  const generateQuestions = () => {
    const pool = [...studySet.terms].sort(() => Math.random() - 0.5).slice(0, settings.questionCount);

    const generated: TestQuestion[] = pool.map((t, idx) => {
      // Pick available type
      const availableTypes: ('multiple-choice' | 'true-false' | 'written')[] = [];
      if (settings.questionTypes.multipleChoice) availableTypes.push('multiple-choice');
      if (settings.questionTypes.trueFalse) availableTypes.push('true-false');
      if (settings.questionTypes.written) availableTypes.push('written');

      const chosenType =
        availableTypes[Math.floor(Math.random() * availableTypes.length)] || 'multiple-choice';

      const prompt = settings.promptWith === 'term' ? t.term : t.definition;
      const correctAnswer = settings.promptWith === 'term' ? t.definition : t.term;

      if (chosenType === 'multiple-choice') {
        const others = studySet.terms
          .filter((item) => item.id !== t.id)
          .map((item) => (settings.promptWith === 'term' ? item.definition : item.term));
        const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

        return {
          id: `q-${idx}-${t.id}`,
          termId: t.id,
          type: 'multiple-choice',
          prompt,
          correctAnswer,
          options,
        };
      } else if (chosenType === 'true-false') {
        const isTrue = Math.random() > 0.5;
        let displayedDef = correctAnswer;
        if (!isTrue) {
          const others = studySet.terms.filter((item) => item.id !== t.id);
          if (others.length > 0) {
            const randomOther = others[Math.floor(Math.random() * others.length)];
            displayedDef = settings.promptWith === 'term' ? randomOther.definition : randomOther.term;
          }
        }

        return {
          id: `q-${idx}-${t.id}`,
          termId: t.id,
          type: 'true-false',
          prompt,
          correctAnswer: isTrue ? 'True' : 'False',
          tfAnswer: isTrue,
          tfDisplayedDefinition: displayedDef,
        };
      } else {
        // Written
        return {
          id: `q-${idx}-${t.id}`,
          termId: t.id,
          type: 'written',
          prompt,
          correctAnswer,
        };
      }
    });

    setQuestions(generated);
    setUserAnswers({});
    setIsTestStarted(true);
    setIsTestSubmitted(false);
  };

  // Submit test and grade
  const handleSubmitTest = (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestSubmitted(true);
    onRecordTestCompleted();
    onRecordStudy(questions.length);

    // Calculate score
    let correctCount = 0;
    questions.forEach((q) => {
      const ans = userAnswers[q.id] || '';
      if (q.type === 'written') {
        const res = cortexGrade(ans, q.correctAnswer);
        if (res.isCorrect) correctCount++;
      } else {
        if (ans.trim().toLowerCase() === q.correctAnswer.toLowerCase()) {
          correctCount++;
        }
      }
    });

    const pct = Math.round((correctCount / questions.length) * 100);
    if (pct >= 80) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  // Score stats
  const scoreReport = useMemo(() => {
    if (!isTestSubmitted) return null;

    let correctCount = 0;
    const gradedQuestions = questions.map((q) => {
      const userAns = userAnswers[q.id] || '';
      let isCorrect = false;

      if (q.type === 'written') {
        const res = cortexGrade(userAns, q.correctAnswer);
        isCorrect = res.isCorrect;
      } else {
        isCorrect = userAns.trim().toLowerCase() === q.correctAnswer.toLowerCase();
      }

      if (isCorrect) correctCount++;

      return {
        ...q,
        userAnswer: userAns,
        isCorrect,
      };
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    let letterGrade = 'F';
    let gradeColor = 'text-red-500';

    if (percentage >= 93) {
      letterGrade = 'A+';
      gradeColor = 'text-emerald-500';
    } else if (percentage >= 85) {
      letterGrade = 'A';
      gradeColor = 'text-emerald-500';
    } else if (percentage >= 75) {
      letterGrade = 'B';
      gradeColor = 'text-blue-500';
    } else if (percentage >= 65) {
      letterGrade = 'C';
      gradeColor = 'text-amber-500';
    } else if (percentage >= 50) {
      letterGrade = 'D';
      gradeColor = 'text-orange-500';
    }

    return {
      correctCount,
      totalCount: questions.length,
      percentage,
      letterGrade,
      gradeColor,
      gradedQuestions,
    };
  }, [isTestSubmitted, questions, userAnswers]);

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Test</span>
        </button>

        <div className="text-center">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {studySet.title}
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Practice Test Simulation
          </span>
        </div>

        {isTestStarted && !isTestSubmitted && (
          <button
            onClick={() => setIsTestStarted(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Options</span>
          </button>
        )}
        {(!isTestStarted || isTestSubmitted) && <div className="w-20" />}
      </div>

      {/* Screen 1: Test Setup Configuration */}
      {!isTestStarted ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl space-y-6 my-auto">
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Set Up Your Practice Test
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Customize question formats, question length, and prompt direction.
            </p>
          </div>

          <div className="space-y-4">
            {/* Question count */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <span>Number of Questions:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  {settings.questionCount} of {studySet.terms.length}
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={studySet.terms.length}
                value={settings.questionCount}
                onChange={(e) =>
                  setSettings({ ...settings, questionCount: Number(e.target.value) })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Question types */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Question Types:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'multipleChoice', label: 'Multiple Choice' },
                  { id: 'trueFalse', label: 'True / False' },
                  { id: 'written', label: 'Written' },
                ].map((type) => (
                  <label
                    key={type.id}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      (settings.questionTypes as any)[type.id]
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={(settings.questionTypes as any)[type.id]}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          questionTypes: {
                            ...settings.questionTypes,
                            [type.id]: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Prompt with */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Answer With:
              </span>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="promptWith"
                    checked={settings.promptWith === 'term'}
                    onChange={() => setSettings({ ...settings, promptWith: 'term' })}
                    className="text-indigo-600"
                  />
                  <span>Definitions (Prompt with Term)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="promptWith"
                    checked={settings.promptWith === 'definition'}
                    onChange={() => setSettings({ ...settings, promptWith: 'definition' })}
                    className="text-indigo-600"
                  />
                  <span>Terms (Prompt with Definition)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={generateQuestions}
              className="w-full py-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Start Practice Test</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : isTestSubmitted && scoreReport ? (
        /* Screen 2: Test Results & Score Report */
        <div className="space-y-6 animate-fade-in">
          {/* Main Score Hero */}
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <div className={`text-5xl font-extrabold ${scoreReport.gradeColor}`}>
                {scoreReport.letterGrade}
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {scoreReport.percentage}%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You got {scoreReport.correctCount} out of {scoreReport.totalCount} questions correct.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={generateQuestions}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Take Another Test</span>
              </button>
              <button
                onClick={() => setIsTestStarted(false)}
                className="px-5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-colors"
              >
                Change Test Settings
              </button>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Detailed Question Review
            </h3>
            {scoreReport.gradedQuestions.map((q, idx) => (
              <div
                key={q.id}
                className={`p-4 rounded-xl border space-y-2 bg-white dark:bg-slate-800 ${
                  q.isCorrect
                    ? 'border-emerald-200 dark:border-emerald-800/60'
                    : 'border-red-200 dark:border-red-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {q.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-slate-500">
                      Question {idx + 1} ({q.type.replace('-', ' ')})
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      q.isCorrect
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                    }`}
                  >
                    {q.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {q.prompt}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Your Answer:
                    </span>
                    <span
                      className={`font-semibold ${
                        q.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {q.userAnswer || '(No answer provided)'}
                    </span>
                  </div>

                  {!q.isCorrect && (
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                      <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] uppercase font-bold">
                        Correct Answer:
                      </span>
                      <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                        {q.correctAnswer}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Screen 3: Active Test Taking */
        <form onSubmit={handleSubmitTest} className="space-y-6">
          <div className="space-y-5">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    Question {idx + 1} of {questions.length} &bull; {q.type.replace('-', ' ')}
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {q.prompt}
                </h4>

                {/* Multiple Choice Options */}
                {q.type === 'multiple-choice' && q.options && (
                  <div className="space-y-2 pt-1">
                    {q.options.map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          userAnswers[q.id] === opt
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt}
                          checked={userAnswers[q.id] === opt}
                          onChange={(e) =>
                            setUserAnswers({ ...userAnswers, [q.id]: e.target.value })
                          }
                          className="mt-0.5 text-indigo-600"
                        />
                        <span className="leading-snug">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* True / False Options */}
                {q.type === 'true-false' && (
                  <div className="space-y-3 pt-1">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                        Definition:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {q.tfDisplayedDefinition}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {['True', 'False'].map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => setUserAnswers({ ...userAnswers, [q.id]: tf })}
                          className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                            userAnswers[q.id] === tf
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Written Answer */}
                {q.type === 'written' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={userAnswers[q.id] || ''}
                      onChange={(e) =>
                        setUserAnswers({ ...userAnswers, [q.id]: e.target.value })
                      }
                      placeholder="Type your answer here..."
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Test Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-8 py-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <span>Submit Practice Test</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
