import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  RotateCcw, 
  Trophy, 
  Flame, 
  Timer, 
  Sparkles, 
  Check, 
  X,
  Medal,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { HighScore, StudySet, Term } from '../../types';
import { getHighScores, saveHighScore } from '../../utils/storage';

interface MatchModeProps {
  studySet: StudySet;
  onExit: () => void;
  onRecordMatchWon: () => void;
  onRecordStudy: (cards: number) => void;
}

interface TileItem {
  tileId: string;
  termId: string;
  text: string;
  kind: 'term' | 'definition';
  isMatched: boolean;
}

export const MatchMode: React.FC<MatchModeProps> = ({
  studySet,
  onExit,
  onRecordMatchWon,
  onRecordStudy,
}) => {
  const [tiles, setTiles] = useState<TileItem[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [penaltyMessage, setPenaltyMessage] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<HighScore[]>([]);
  const [playerName, setPlayerName] = useState('Player 1');
  const [hasSavedScore, setHasSavedScore] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const penaltyMsRef = useRef<number>(0);

  // Load high scores
  useEffect(() => {
    setLeaderboard(getHighScores(studySet.id));
  }, [studySet.id]);

  // Start / restart game
  const initGame = useCallback(() => {
    // Pick 6 random terms (or all if < 6)
    const count = Math.min(studySet.terms.length, 6);
    const chosen = [...studySet.terms].sort(() => Math.random() - 0.5).slice(0, count);

    const generatedTiles: TileItem[] = [];
    chosen.forEach((t) => {
      generatedTiles.push({
        tileId: `term-${t.id}`,
        termId: t.id,
        text: t.term,
        kind: 'term',
        isMatched: false,
      });
      generatedTiles.push({
        tileId: `def-${t.id}`,
        termId: t.id,
        text: t.definition,
        kind: 'definition',
        isMatched: false,
      });
    });

    // Fisher-Yates shuffle helper
    const shuffleArray = <T,>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    // Shuffle tiles thoroughly
    setTiles(shuffleArray(generatedTiles));
    setSelectedTileId(null);
    setWrongPair(null);
    setElapsedMs(0);
    penaltyMsRef.current = 0;
    setIsGameOver(false);
    setHasSavedScore(false);
    setIsPlaying(true);
    startTimeRef.current = Date.now();
  }, [studySet.terms]);

  // Initial mount
  useEffect(() => {
    initGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initGame]);

  // Timer loop
  useEffect(() => {
    if (!isPlaying || isGameOver) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const current = now - startTimeRef.current + penaltyMsRef.current;
      setElapsedMs(current);
    }, 30);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isGameOver]);

  // Handle tile click
  const handleTileClick = (clickedTile: TileItem) => {
    if (!isPlaying || isGameOver || clickedTile.isMatched) return;
    if (wrongPair) return; // Wait for wrong pair animation to finish

    // If clicking same tile again, deselect
    if (selectedTileId === clickedTile.tileId) {
      setSelectedTileId(null);
      return;
    }

    // First tile selection
    if (!selectedTileId) {
      setSelectedTileId(clickedTile.tileId);
      return;
    }

    // Second tile selected: verify match
    const firstTile = tiles.find((t) => t.tileId === selectedTileId);
    if (!firstTile) {
      setSelectedTileId(clickedTile.tileId);
      return;
    }

    // Match check: must have same termId and different kind
    if (firstTile.termId === clickedTile.termId && firstTile.kind !== clickedTile.kind) {
      // MATCH SUCCESS!
      const nextTiles = tiles.map((t) =>
        t.termId === firstTile.termId ? { ...t, isMatched: true } : t
      );
      setTiles(nextTiles);
      setSelectedTileId(null);

      // Check if all tiles matched
      const allMatched = nextTiles.every((t) => t.isMatched);
      if (allMatched) {
        setIsGameOver(true);
        setIsPlaying(false);
        const finalTimeSec = Number((elapsedMs / 1000).toFixed(1));
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
        onRecordMatchWon();
        onRecordStudy(studySet.terms.length);
      }
    } else {
      // MISMATCH! Penalty +1.0 second
      setWrongPair([firstTile.tileId, clickedTile.tileId]);
      penaltyMsRef.current += 1000;
      setPenaltyMessage('+1.0s penalty!');

      setTimeout(() => {
        setWrongPair(null);
        setSelectedTileId(null);
        setPenaltyMessage(null);
      }, 700);
    }
  };

  // Submit high score
  const handleSaveScore = () => {
    const finalSeconds = Number((elapsedMs / 1000).toFixed(1));
    const updated = saveHighScore(studySet.id, playerName, finalSeconds);
    setLeaderboard(updated);
    setHasSavedScore(true);
  };

  // Format timer
  const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const centis = Math.floor((ms % 1000) / 10);
    return `${mins > 0 ? `${mins}:` : ''}${secs.toString().padStart(mins > 0 ? 2 : 1, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Match</span>
        </button>

        {/* Live Timer Clock */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
          <Timer className="w-4 h-4 text-indigo-500" />
          <span className="font-mono text-base font-bold text-slate-900 dark:text-white min-w-[70px]">
            {formatTime(elapsedMs)}s
          </span>
          {penaltyMessage && (
            <span className="text-xs font-bold text-red-500 animate-bounce">
              {penaltyMessage}
            </span>
          )}
        </div>

        <button
          onClick={initGame}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Restart</span>
        </button>
      </div>

      {/* Instructions header */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
          Make everything disappear!
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Match each term with its definition. Beware: wrong matches add a 1 second penalty!
        </p>
      </div>

      {/* Game Over Modal / Victory Card */}
      {isGameOver ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg mx-auto w-full text-center space-y-6 animate-fade-in my-auto">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-500">
              Match Cleared!
            </span>
            <div className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1">
              {formatTime(elapsedMs)}s
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              You cleared all {studySet.terms.length} pairs!
            </p>
          </div>

          {/* High score save */}
          {!hasSavedScore ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Save your score to the Leaderboard:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={playerName}
                  maxLength={15}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your Name"
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleSaveScore}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>Score recorded on Leaderboard!</span>
            </div>
          )}

          {/* Leaderboard snippet */}
          <div className="text-left space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Medal className="w-3.5 h-3.5 text-amber-500" />
              Top Fast Times
            </span>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
              {leaderboard.slice(0, 3).map((item, idx) => (
                <div
                  key={item.id}
                  className="p-2.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    #{idx + 1} {item.playerName}
                  </span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {item.timeSeconds}s
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={initGame}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
            <button
              onClick={onExit}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      ) : (
        /* The Match Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 flex-1">
          {tiles.map((tile) => {
            if (tile.isMatched) {
              // Disappeared / cleared tile placeholder
              return (
                <div
                  key={tile.tileId}
                  className="opacity-0 pointer-events-none rounded-2xl min-h-[110px]"
                />
              );
            }

            const isSelected = selectedTileId === tile.tileId;
            const isWrong = wrongPair && wrongPair.includes(tile.tileId);

            let borderAndBg =
              'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:shadow-md';

            if (isSelected) {
              borderAndBg =
                'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 dark:border-indigo-500 shadow-md ring-2 ring-indigo-500/30 scale-[1.02]';
            } else if (isWrong) {
              borderAndBg =
                'bg-red-50 dark:bg-red-950/60 border-red-500 animate-shake shadow-md';
            }

            return (
              <button
                key={tile.tileId}
                onClick={() => handleTileClick(tile)}
                className={`p-4 rounded-2xl border text-center flex items-center justify-center min-h-[110px] sm:min-h-[130px] transition-all cursor-pointer select-none active:scale-95 ${borderAndBg}`}
              >
                <span
                  className={`text-xs sm:text-sm font-semibold leading-snug line-clamp-4 ${
                    isSelected
                      ? 'text-indigo-950 dark:text-indigo-200 font-bold'
                      : isWrong
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {tile.text}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
