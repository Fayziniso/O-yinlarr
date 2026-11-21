import React, { useState } from 'react';
import {
  Award,
  Check,
  Clock,
  Heart,
  Monitor,
  Play,
  RotateCcw,
  Save,
  Sliders,
  Trophy,
  User,
} from 'lucide-react';
import { ACHIEVEMENTS, AGE_GROUPS, getAgeGroupConfig, getGameById, getGamesByAge } from '../data/games';
import { AgeGroup, GraphicsQuality, ThemeMode, UserProfile } from '../types';
import { sound } from '../utils/sound';
import { getLevelFromXp } from '../utils/storage';
import { GameThumbnail } from './GameThumbnail';

interface ProfileViewProps {
  profile: UserProfile;
  onUpdatePreferences: (patch: {
    name?: string;
    ageGroup?: AgeGroup;
    theme?: ThemeMode;
    soundEnabled?: boolean;
    graphicsQuality?: GraphicsQuality;
  }) => void;
  onPlayGame: (gameId: string) => void;
  onResetProfile: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdatePreferences,
  onPlayGame,
  onResetProfile,
}) => {
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const ageConfig = getAgeGroupConfig(profile.ageGroup);
  const ageGames = getGamesByAge(profile.ageGroup);
  const levelInfo = getLevelFromXp(profile.xp);

  const favoriteGames = profile.favorites
    .map((id) => getGameById(id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g && g.ageGroup === profile.ageGroup));

  const recentGames = profile.recentlyPlayed
    .map((id) => getGameById(id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g && g.ageGroup === profile.ageGroup));

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameDraft.trim();
    if (cleaned.length < 2) {
      sound.playError();
      return;
    }
    sound.playSuccess();
    onUpdatePreferences({ name: cleaned });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
      {/* Top Profile Overview Banner */}
      <section className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-display text-3xl font-extrabold shrink-0"
            style={{ backgroundColor: ageConfig.accentHex }}
          >
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {ageConfig.categoryTitle} · {ageConfig.label}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {profile.name}
            </h1>
            <div className="pt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-mono-num font-semibold text-amber-600 dark:text-amber-400">
                {levelInfo.level}-daraja
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{profile.xp} XP</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">
                {profile.unlockedAchievements.length}/{ACHIEVEMENTS.length} yutuq
              </span>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="w-full lg:w-80 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Keyingi darajagacha</span>
            <span className="font-mono-num">
              {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${levelInfo.progressPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* 4 Key Statistics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Jami o'ynalgan", value: `${profile.totalGamesPlayed} marta`, icon: Play },
          { label: 'Jami ball', value: `${profile.totalPoints}`, icon: Trophy },
          { label: "Sevimli o'yinlar", value: `${favoriteGames.length} ta`, icon: Heart },
          {
            label: 'Ochilgan yutuqlar',
            value: `${profile.unlockedAchievements.length} / ${ACHIEVEMENTS.length}`,
            icon: Award,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-2"
          >
            <stat.icon className="w-5 h-5 text-amber-500" />
            <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="font-display font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      {/* Main 2-column layout: Settings + Best Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Settings */}
        <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Profil sozlamalari
            </h2>
          </div>

          {/* Display Name */}
          <form onSubmit={handleSaveName} className="space-y-2.5">
            <label
              htmlFor="profile-name-edit"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Ko‘rinadigan ism
            </label>
            <div className="flex gap-2">
              <input
                id="profile-name-edit"
                type="text"
                maxLength={24}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {savedNotice ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {savedNotice ? 'Saqlandi' : 'Saqlash'}
              </button>
            </div>
          </form>

          {/* Age Group Switcher */}
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Yosh toifasi (o‘yinlar kutubxonasini belgilaydi)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {AGE_GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    sound.playSelect();
                    onUpdatePreferences({ ageGroup: g.id });
                  }}
                  className={`px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                    profile.ageGroup === g.id
                      ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="font-bold">{g.label}</div>
                  <div className="text-[11px] opacity-75 truncate">{g.categoryTitle}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Switcher */}
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Mavzu ko‘rinishi</p>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
              {([
                { id: 'dark', label: "Qorong'i mavzu" },
                { id: 'light', label: "Yorug' mavzu" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onUpdatePreferences({ theme: t.id });
                  }}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    profile.theme === t.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3D Graphics Quality */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Monitor className="w-4 h-4 text-amber-500" />
              <span>3D grafika sifati</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
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
                    onUpdatePreferences({ graphicsQuality: q.id });
                  }}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    profile.graphicsQuality === q.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Profile */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setConfirmReset(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Profil ma’lumotlarini tozalash
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 space-y-3">
                <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">
                  Barcha ballar, yutuqlar va sozlamalar o‘chiriladi. Davom etasizmi?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playError();
                      onResetProfile();
                    }}
                    className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold cursor-pointer"
                  >
                    Ha, tozalash
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-semibold cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Highest Scores per Game */}
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Eng yuqori ballaringiz ({ageConfig.label})
              </h2>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {ageGames.map((game) => {
              const best = profile.scores[game.id] || 0;
              const plays = profile.playCounts[game.id] || 0;
              const won = profile.wonGames.includes(game.id);
              return (
                <div
                  key={game.id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <GameThumbnail
                      game={game}
                      className="w-16 h-11 rounded-lg shrink-0 border border-slate-200 dark:border-slate-700"
                    />
                    <div className="min-w-0">
                      <p className="font-display font-bold text-slate-900 dark:text-white truncate">
                        {game.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {game.genre} · {plays} marta o‘ynalgan
                        {won ? " · G'alaba qozonilgan" : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="font-mono-num text-base font-bold text-slate-900 dark:text-white">
                        {best}
                      </p>
                      <p className="text-[11px] text-slate-500">rekord</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPlayGame(game.id)}
                      className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap cursor-pointer"
                    >
                      O‘ynash
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Achievements Grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-amber-500" />
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Yutuqlar va nishonlar
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACHIEVEMENTS.map((ach) => {
            const current = ach.getCurrent(profile);
            const unlocked = profile.unlockedAchievements.includes(ach.id);
            const pct = Math.min(100, Math.round((current / ach.target) * 100));
            return (
              <div
                key={ach.id}
                className={`rounded-2xl p-5 border space-y-3 transition-colors ${
                  unlocked
                    ? 'bg-amber-500/10 border-amber-500/50'
                    : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-slate-900 dark:text-white">
                      {ach.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {ach.description}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-mono-num font-bold shrink-0 ${
                      unlocked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    +{ach.xpReward} XP
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{unlocked ? 'Ochilgan' : 'Jarayonda'}</span>
                    <span className="font-mono-num">
                      {current} / {ach.target}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        unlocked ? 'bg-amber-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recently Played & Favorites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Yaqinda o‘ynalganlar
            </h2>
          </div>
          {recentGames.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-sm text-slate-500">
              Hali o‘yin o‘ynamadingiz. Bosh sahifadan biror 3D o‘yinni boshlang!
            </div>
          ) : (
            <div className="space-y-3">
              {recentGames.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => onPlayGame(game.id)}
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <GameThumbnail game={game} className="w-16 h-11 rounded-lg shrink-0" />
                    <div>
                      <p className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        {game.title}
                      </p>
                      <p className="text-xs text-slate-500">{game.genre}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Davom etish
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Sevimli o‘yinlaringiz
            </h2>
          </div>
          {favoriteGames.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-sm text-slate-500">
              Sevimlilar ro‘yxati bo‘sh. O‘yin kartasidagi yurakcha tugmasini bosib saqlang.
            </div>
          ) : (
            <div className="space-y-3">
              {favoriteGames.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => onPlayGame(game.id)}
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <GameThumbnail game={game} className="w-16 h-11 rounded-lg shrink-0" />
                    <div>
                      <p className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        {game.title}
                      </p>
                      <p className="text-xs text-slate-500">{game.genre}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    O‘ynash
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
