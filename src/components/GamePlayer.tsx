import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Heart,
  HelpCircle,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ACHIEVEMENTS } from '../data/games';
import { GAME_REGISTRY } from '../games/registry';
import { GameMeta, GraphicsQuality } from '../types';
import { sound } from '../utils/sound';

interface GamePlayerProps {
  game: GameMeta;
  bestScore: number;
  isFavorite: boolean;
  soundEnabled: boolean;
  graphicsQuality: GraphicsQuality;
  onToggleFavorite: () => void;
  onToggleSound: () => void;
  onChangeQuality: (q: GraphicsQuality) => void;
  onRecordResult: (
    score: number,
    won: boolean
  ) => { earnedXp: number; isNewRecord: boolean; newlyUnlocked: string[] };
  onExit: () => void;
}

interface GameErrorBoundaryState {
  hasError: boolean;
}

class GameErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry: () => void },
  GameErrorBoundaryState
> {
  state: GameErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GameErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center space-y-4">
          <h2 className="font-display text-2xl font-bold">3D grafika ishga tushmadi</h2>
          <p className="text-sm text-slate-400 max-w-md">
            Brauzer WebGL kontekstida vaqtinchalik xatolik yuz berdi. Grafika sifatini "Past" qilib qayta urinib ko‘ring.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry();
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Qayta yuklash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const GamePlayer: React.FC<GamePlayerProps> = ({
  game,
  bestScore,
  isFavorite,
  soundEnabled,
  graphicsQuality,
  onToggleFavorite,
  onToggleSound,
  onChangeQuality,
  onRecordResult,
  onExit,
}) => {
  const playerShellRef = useRef<HTMLDivElement>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [score, setScore] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [endState, setEndState] = useState<{
    type: 'victory' | 'gameover';
    finalScore: number;
    summary: string;
    earnedXp: number;
    isNewRecord: boolean;
    newlyUnlocked: string[];
  } | null>(null);

  const endedOnceRef = useRef(false);

  // Prevent Arrow keys and Space from scrolling page during active gameplay
  useEffect(() => {
    const preventScroll = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
        }
      }
      if (e.code === 'Escape' && !endState) {
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', preventScroll, { passive: false });
    return () => window.removeEventListener('keydown', preventScroll);
  }, [endState]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = async () => {
    sound.playClick();
    try {
      if (!document.fullscreenElement && playerShellRef.current?.requestFullscreen) {
        await playerShellRef.current.requestFullscreen();
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      } else {
        setIsFullscreen((v) => !v);
      }
    } catch {
      setIsFullscreen((v) => !v);
    }
  };

  const handleRestart = () => {
    sound.playSelect();
    endedOnceRef.current = false;
    setScore(0);
    setStatusText('');
    setIsPaused(false);
    setEndState(null);
    setSessionKey((k) => k + 1);
  };

  const handleVictory = useCallback(
    (finalScore: number, summary?: string) => {
      if (endedOnceRef.current) return;
      endedOnceRef.current = true;
      sound.playWin();
      const res = onRecordResult(finalScore, true);
      setEndState({
        type: 'victory',
        finalScore,
        summary: summary || 'Tabriklaymiz! O‘yinni g‘alaba bilan yakunladingiz!',
        ...res,
      });
    },
    [onRecordResult]
  );

  const handleGameOver = useCallback(
    (finalScore: number, summary?: string) => {
      if (endedOnceRef.current) return;
      endedOnceRef.current = true;
      sound.playLose();
      const res = onRecordResult(finalScore, false);
      setEndState({
        type: 'gameover',
        finalScore,
        summary: summary || 'O‘yin tugadi. Qayta urinib rekord o‘rnating!',
        ...res,
      });
    },
    [onRecordResult]
  );

  const GameComp = GAME_REGISTRY[game.id];

  return (
    <div
      ref={playerShellRef}
      className={`${
        isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'
      } w-full bg-[#070B13] text-slate-100 flex flex-col`}
    >
      {/* Top Player Control Bar */}
      <header className="shrink-0 h-15 px-3 sm:px-5 border-b border-slate-800 bg-[#0B1120] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              if (score > 0 && !endedOnceRef.current) {
                onRecordResult(score, false);
              }
              onExit();
            }}
            className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Bosh sahifa</span>
          </button>

          <div className="min-w-0">
            <h1 className="font-display font-bold text-sm sm:text-base text-white truncate">
              {game.title}
            </h1>
            {statusText && (
              <p className="text-[11px] text-slate-400 truncate hidden md:block">{statusText}</p>
            )}
          </div>
        </div>

        {/* Live Score & Best Score */}
        <div className="flex items-center gap-3 sm:gap-5 px-3 sm:px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono-num text-xs sm:text-sm shrink-0">
          <div>
            <span className="text-slate-400 mr-1.5">Ball:</span>
            <strong className="text-amber-400">{score}</strong>
          </div>
          <div className="hidden sm:block">
            <span className="text-slate-400 mr-1.5">Rekord:</span>
            <strong className="text-emerald-400">{Math.max(bestScore, score)}</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Graphics Quality Selector */}
          <div className="hidden lg:flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-semibold mr-1">
            {([
              { id: 'low', label: 'Past' },
              { id: 'medium', label: "O'rta" },
              { id: 'high', label: 'Yuqori' },
            ] as const).map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  sound.playClick();
                  onChangeQuality(q.id);
                }}
                className={`px-2 py-1 rounded-md cursor-pointer ${
                  graphicsQuality === q.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsPaused((p) => !p);
            }}
            title={isPaused ? 'Davom etish' : "To'xtatish"}
            aria-label={isPaused ? 'Davom etish' : "To'xtatish"}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            title="Qayta boshlash"
            aria-label="Qayta boshlash"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? "Ovozni o'chirish" : 'Ovozni yoqish'}
            aria-label={soundEnabled ? "Ovozni o'chirish" : 'Ovozni yoqish'}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onToggleFavorite();
            }}
            title="Sevimlilarga qo'shish"
            aria-label="Sevimlilarga qo'shish"
            className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer ${
              isFavorite
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setShowHelp(true);
              setIsPaused(true);
            }}
            title="O'yin yo'riqnomasi"
            aria-label="O'yin yo'riqnomasi"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title="To'liq ekran"
            aria-label="To'liq ekran"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main 3D Viewport Area */}
      <div className="relative flex-1 w-full min-h-[540px] h-[calc(100vh-3.75rem)] overflow-hidden bg-slate-950">
        <GameErrorBoundary onRetry={handleRestart}>
          <Suspense
            fallback={
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-200">
                <Loader2 className="w-9 h-9 text-amber-400 animate-spin" />
                <p className="font-display text-lg font-bold">{game.title} yuklanmoqda...</p>
                <p className="text-xs text-slate-400">3D muhit va materiallar tayyorlanmoqda</p>
              </div>
            }
          >
            {GameComp ? (
              <GameComp
                key={`${game.id}-${sessionKey}`}
                quality={graphicsQuality}
                soundEnabled={soundEnabled}
                isPaused={isPaused || Boolean(endState) || showHelp}
                onScoreChange={setScore}
                onStatusChange={setStatusText}
                onGameOver={handleGameOver}
                onVictory={handleVictory}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                O‘yin topilmadi.
              </div>
            )}
          </Suspense>
        </GameErrorBoundary>

        {/* Pause Overlay */}
        {isPaused && !showHelp && !endState && (
          <div className="absolute inset-0 z-30 bg-slate-950/82 flex items-center justify-center p-4">
            <div className="max-w-sm w-full rounded-2xl bg-slate-900 border border-slate-700 p-6 text-center space-y-5">
              <h2 className="font-display text-2xl font-extrabold text-white">O‘yin to‘xtatildi</h2>
              <p className="text-sm text-slate-400">{game.controlsHint}</p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setIsPaused(false);
                  }}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
                >
                  Davom etish
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
                >
                  Qayta boshlash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onExit();
                  }}
                  className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-medium cursor-pointer"
                >
                  Bosh sahifaga qaytish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions Modal */}
        {showHelp && (
          <div className="absolute inset-0 z-40 bg-slate-950/85 flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-extrabold text-white">
                  {game.title} — Yo‘riqnoma
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setShowHelp(false);
                    setIsPaused(false);
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="space-y-2.5 text-sm text-slate-300 list-decimal list-inside">
                {game.instructions.map((line, i) => (
                  <li key={i} className="leading-relaxed">
                    {line}
                  </li>
                ))}
              </ol>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-medium">
                Boshqaruv: {game.controlsHint}
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowHelp(false);
                  setIsPaused(false);
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
              >
                Tushunarli, davom etish
              </button>
            </div>
          </div>
        )}

        {/* Victory / Game Over Screen */}
        {endState && (
          <div className="absolute inset-0 z-40 bg-slate-950/88 flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-700 p-7 text-center space-y-5">
              <div
                className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
                  endState.type === 'victory'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                <Trophy className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h2 className="font-display text-3xl font-extrabold text-white">
                  {endState.type === 'victory' ? "G'alaba!" : "O'yin tugadi"}
                </h2>
                <p className="text-sm text-slate-300">{endState.summary}</p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-[11px] text-slate-400">Ball</p>
                  <p className="font-mono-num font-bold text-xl text-amber-400">
                    {endState.finalScore}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Rekord</p>
                  <p className="font-mono-num font-bold text-xl text-emerald-400">
                    {Math.max(bestScore, endState.finalScore)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Olindi</p>
                  <p className="font-mono-num font-bold text-xl text-sky-400">
                    +{endState.earnedXp} XP
                  </p>
                </div>
              </div>

              {endState.isNewRecord && endState.finalScore > 0 && (
                <p className="text-xs font-semibold text-amber-300">
                  Yangi shaxsiy rekord o‘rnatildi!
                </p>
              )}

              {endState.newlyUnlocked.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-left space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Award className="w-4 h-4" />
                    Yangi yutuq ochildi!
                  </div>
                  {endState.newlyUnlocked.map((id) => {
                    const def = ACHIEVEMENTS.find((a) => a.id === id);
                    return (
                      <p key={id} className="text-xs text-white font-medium">
                        {def?.title} (+{def?.xpReward} XP)
                      </p>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
                >
                  Qayta o‘ynash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onExit();
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
                >
                  Bosh sahifa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
