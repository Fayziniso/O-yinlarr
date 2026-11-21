import React from 'react';
import { Award, Play, Trophy } from 'lucide-react';
import { ACHIEVEMENTS, getAgeGroupConfig, getGamesByAge } from '../data/games';
import { UserProfile } from '../types';
import { getLevelFromXp } from '../utils/storage';
import { GameThumbnail } from './GameThumbnail';

interface RankingViewProps {
  profile: UserProfile;
  onPlayGame: (gameId: string) => void;
}

export const RankingView: React.FC<RankingViewProps> = ({ profile, onPlayGame }) => {
  const ageConfig = getAgeGroupConfig(profile.ageGroup);
  const ageGames = getGamesByAge(profile.ageGroup);
  const levelInfo = getLevelFromXp(profile.xp);

  // Local ranking benchmarks within the user's age category so user sees live rank progression
  const leaderboardEntries = [
    { name: 'Sardorbek', points: 620, level: 5, wins: 5, isUser: false },
    { name: 'Madina', points: 440, level: 4, wins: 4, isUser: false },
    { name: 'Jasur', points: 290, level: 3, wins: 3, isUser: false },
    { name: 'Zilola', points: 145, level: 2, wins: 2, isUser: false },
    {
      name: profile.name,
      points: profile.totalPoints,
      level: levelInfo.level,
      wins: profile.wonGames.length,
      isUser: true,
    },
  ].sort((a, b) => b.points - a.points);

  const userRank = leaderboardEntries.findIndex((e) => e.isUser) + 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
      <div className="space-y-2">
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {ageConfig.categoryTitle} · {ageConfig.label}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
          Reyting va eng yaxshi natijalar
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          O‘yinlarda yuqori ball to‘plang, darajangizni oshiring va jadvalning yuqori o‘rinlariga ko‘tariling.
        </p>
      </div>

      {/* User Rank Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-1">
          <p className="text-xs text-slate-500">Joriy o‘rningiz</p>
          <p className="font-display font-mono-num text-3xl font-extrabold text-amber-500">
            #{userRank}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {ageConfig.label} guruhida
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-1">
          <p className="text-xs text-slate-500">Jami ballaringiz</p>
          <p className="font-display font-mono-num text-3xl font-extrabold text-slate-900 dark:text-white">
            {profile.totalPoints}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {levelInfo.level}-daraja · {profile.xp} XP
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-1">
          <p className="text-xs text-slate-500">Yutuqlar</p>
          <p className="font-display font-mono-num text-3xl font-extrabold text-emerald-500">
            {profile.unlockedAchievements.length}/{ACHIEVEMENTS.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            G‘alabalar: {profile.wonGames.length} xil o‘yin
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Standings Table */}
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Eng faol o‘yinchilar jadvali
            </h2>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {leaderboardEntries.map((row, idx) => (
              <div
                key={`${row.name}-${idx}`}
                className={`px-6 py-4 flex items-center justify-between gap-4 ${
                  row.isUser ? 'bg-amber-500/10' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-8 h-8 rounded-lg font-mono-num font-bold text-sm flex items-center justify-center ${
                      idx === 0
                        ? 'bg-amber-500 text-slate-950'
                        : idx === 1
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white'
                        : idx === 2
                        ? 'bg-orange-400/30 text-orange-700 dark:text-orange-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-display font-bold text-slate-900 dark:text-white">
                      {row.name}{' '}
                      {row.isUser && (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          (Siz)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.level}-daraja · {row.wins} ta g‘alaba
                    </p>
                  </div>
                </div>
                <span className="font-mono-num font-bold text-base text-slate-900 dark:text-white">
                  {row.points} ball
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Personal Records in Current Age Library */}
        <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Shaxsiy rekordlaringiz
            </h2>
          </div>

          <div className="space-y-3">
            {ageGames
              .slice()
              .sort((a, b) => (profile.scores[b.id] || 0) - (profile.scores[a.id] || 0))
              .map((g) => {
                const best = profile.scores[g.id] || 0;
                return (
                  <div
                    key={g.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <GameThumbnail game={g} className="w-14 h-10 rounded-lg shrink-0" />
                      <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                          {g.title}
                        </p>
                        <p className="font-mono-num text-xs text-amber-600 dark:text-amber-400 font-semibold">
                          Rekord: {best} ball
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPlayGame(g.id)}
                      className="w-9 h-9 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 cursor-pointer"
                      aria-label={`${g.title} o'ynash`}
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                );
              })}
          </div>
        </section>
      </div>
    </div>
  );
};
