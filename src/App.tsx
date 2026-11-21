import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Award,
  Flame,
  Gamepad2,
  Heart,
  Play,
  Search,
  SlidersHorizontal,
  Star,
  Trophy,
} from 'lucide-react';
import { GamePlayer } from './components/GamePlayer';
import { GameThumbnail } from './components/GameThumbnail';
import { Header } from './components/Header';
import { Hero3DScene } from './components/Hero3DScene';
import { Onboarding } from './components/Onboarding';
import { ProfileView } from './components/ProfileView';
import { RankingView } from './components/RankingView';
import {
  ACHIEVEMENTS,
  AGE_GROUPS,
  ALL_GENRES,
  getAgeGroupConfig,
  getGameById,
  getGamesByAge,
} from './data/games';
import {
  AgeGroup,
  GameGenre,
  GameMeta,
  GraphicsQuality,
  NavSection,
  SortOption,
  ThemeMode,
  UserProfile,
} from './types';
import { sound } from './utils/sound';
import {
  clearProfile,
  createInitialProfile,
  getLevelFromXp,
  loadProfile,
  markRecentlyPlayed,
  recordGameSession,
  saveProfile,
  toggleFavoriteGame,
  updateProfilePreferences,
} from './utils/storage';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [activeNav, setActiveNav] = useState<NavSection>('home');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<GameGenre | 'Barchasi'>('Barchasi');
  const [sortOption, setSortOption] = useState<SortOption>('popular');

  // Achievement unlock notification toast
  const [toastAchievement, setToastAchievement] = useState<string | null>(null);

  const gamesSectionRef = useRef<HTMLElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Sync theme to <html class="dark">
  useEffect(() => {
    const theme: ThemeMode = profile?.theme ?? 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [profile?.theme]);

  // Sync sound setting
  useEffect(() => {
    sound.setEnabled(profile ? profile.soundEnabled : true);
  }, [profile?.soundEnabled]);

  // Subtle GSAP transition on view change
  useEffect(() => {
    if (!pageContainerRef.current || activeGameId) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.page-fade-in',
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.32, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    }, pageContainerRef);
    return () => ctx.revert();
  }, [activeNav, profile?.ageGroup, activeGameId]);

  const showAchievementToast = (unlockedIds: string[]) => {
    if (unlockedIds.length === 0) return;
    const first = ACHIEVEMENTS.find((a) => a.id === unlockedIds[0]);
    if (!first) return;
    setToastAchievement(`${first.title} (+${first.xpReward} XP)`);
    window.setTimeout(() => setToastAchievement(null), 3600);
  };

  // Onboarding completion handler
  const handleOnboardingComplete = (name: string, ageGroup: AgeGroup) => {
    const fresh = createInitialProfile(name, ageGroup);
    saveProfile(fresh);
    setProfile(fresh);
    setActiveNav('home');
  };

  // Age-filtered exclusive library (strictly matches user's selected age group)
  const ageGames = useMemo(() => {
    if (!profile) return [];
    return getGamesByAge(profile.ageGroup);
  }, [profile]);

  // Genres present in current age group + full list
  const filteredGames = useMemo(() => {
    let list = [...ageGames];

    if (activeNav === 'favorites' && profile) {
      list = list.filter((g) => profile.favorites.includes(g.id));
    }

    if (selectedGenre !== 'Barchasi') {
      list = list.filter((g) => g.genre === selectedGenre);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.shortDesc.toLowerCase().includes(q) ||
          g.genre.toLowerCase().includes(q)
      );
    }

    if (sortOption === 'popular') {
      list.sort((a, b) => Number(b.isPopular) - Number(a.isPopular) || b.basePlays - a.basePlays);
    } else if (sortOption === 'newest') {
      list.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.rating - a.rating);
    } else if (sortOption === 'highest-score' && profile) {
      list.sort((a, b) => (profile.scores[b.id] || 0) - (profile.scores[a.id] || 0));
    }

    return list;
  }, [ageGames, activeNav, selectedGenre, searchQuery, sortOption, profile]);

  const handleOpenGame = (gameId: string) => {
    if (!profile) return;
    sound.playSelect();
    const updated = markRecentlyPlayed(profile, gameId);
    setProfile(updated);
    setActiveGameId(gameId);
  };

  const handleToggleFavorite = (gameId: string) => {
    if (!profile) return;
    sound.playClick();
    const { profile: next, newlyUnlocked } = toggleFavoriteGame(profile, gameId);
    setProfile(next);
    showAchievementToast(newlyUnlocked);
  };

  const handleUpdatePrefs = (patch: {
    name?: string;
    ageGroup?: AgeGroup;
    theme?: ThemeMode;
    soundEnabled?: boolean;
    graphicsQuality?: GraphicsQuality;
  }) => {
    if (!profile) return;
    const next = updateProfilePreferences(profile, patch);
    setProfile(next);
    if (patch.ageGroup) {
      setSelectedGenre('Barchasi');
      setSearchQuery('');
    }
  };

  const handleResetProfile = () => {
    clearProfile();
    setProfile(null);
    setActiveGameId(null);
    setActiveNav('home');
    setSearchQuery('');
    setSelectedGenre('Barchasi');
  };

  // STEP 0: Show full-screen Onboarding on first visit
  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Dedicated Game Player View
  const activeGame = activeGameId ? getGameById(activeGameId) : null;
  if (activeGame) {
    return (
      <GamePlayer
        game={activeGame}
        bestScore={profile.scores[activeGame.id] || 0}
        isFavorite={profile.favorites.includes(activeGame.id)}
        soundEnabled={profile.soundEnabled}
        graphicsQuality={profile.graphicsQuality}
        onToggleFavorite={() => handleToggleFavorite(activeGame.id)}
        onToggleSound={() => handleUpdatePrefs({ soundEnabled: !profile.soundEnabled })}
        onChangeQuality={(q) => handleUpdatePrefs({ graphicsQuality: q })}
        onRecordResult={(score, won) => {
          const result = recordGameSession(profile, activeGame.id, score, won);
          setProfile(result.profile);
          showAchievementToast(result.newlyUnlocked);
          return {
            earnedXp: result.earnedXp,
            isNewRecord: result.isNewRecord,
            newlyUnlocked: result.newlyUnlocked,
          };
        }}
        onExit={() => setActiveGameId(null)}
      />
    );
  }

  const ageConfig = getAgeGroupConfig(profile.ageGroup);
  const levelInfo = getLevelFromXp(profile.xp);

  const renderGameCard = (game: GameMeta) => {
    const isFav = profile.favorites.includes(game.id);
    const best = profile.scores[game.id] || 0;
    const isKidMode = profile.ageGroup === '3-5';

    return (
      <article
        key={game.id}
        className="group rounded-2xl overflow-hidden bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-amber-500/70 transition-all duration-200 hover:-translate-y-1 flex flex-col"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <button
            type="button"
            onClick={() => handleOpenGame(game.id)}
            className="w-full h-full block cursor-pointer focus-visible:outline-none"
            aria-label={`${game.title} o'yinini boshlash`}
          >
            <GameThumbnail
              game={game}
              className="w-full h-full transition-transform duration-300 group-hover:scale-105"
            />
          </button>

          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={() => handleToggleFavorite(game.id)}
            aria-label={isFav ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo'shish"}
            className={`absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              isFav
                ? 'bg-rose-500 text-white'
                : 'bg-slate-950/75 text-white hover:bg-slate-900'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-amber-600 dark:text-amber-400">{game.genre}</span>
              <span aria-hidden="true">·</span>
              <span>{game.difficulty}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-mono-num">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {game.rating.toFixed(1)}
              </span>
              {game.isNew && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Yangi</span>
                </>
              )}
            </div>

            <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {game.title}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
              {game.shortDesc}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
              {best > 0 ? (
                <span>
                  Rekord: <strong className="text-slate-900 dark:text-white">{best}</strong>
                </span>
              ) : (
                <span>3D WebGL</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleOpenGame(game.id)}
              className={`${
                isKidMode ? 'px-5 py-2.5 text-sm' : 'px-4 py-2 text-xs sm:text-sm'
              } rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              O‘ynash
            </button>
          </div>
        </div>
      </article>
    );
  };

  const renderFilterBar = () => (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="O‘yin nomi bo‘yicha qidiring..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Sort & Age Category Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <label htmlFor="age-filter-select" className="font-medium">
              Yosh toifasi:
            </label>
            <select
              id="age-filter-select"
              value={profile.ageGroup}
              onChange={(e) => {
                sound.playSelect();
                handleUpdatePrefs({ ageGroup: e.target.value as AgeGroup });
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {AGE_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label} — {g.categoryTitle}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            {([
              { id: 'popular', label: 'Eng mashhur' },
              { id: 'newest', label: 'Yangi o‘yinlar' },
              { id: 'highest-score', label: 'Eng yuqori ball' },
            ] as const).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSortOption(s.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  sortOption === s.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Genre Interactive Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(['Barchasi', ...ALL_GENRES] as const).map((genre) => {
          const active = selectedGenre === genre;
          return (
            <button
              key={genre}
              type="button"
              onClick={() => {
                sound.playClick();
                setSelectedGenre(genre);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        profile={profile}
        activeNav={activeNav}
        searchQuery={searchQuery}
        onNavigate={(sec) => {
          setActiveNav(sec);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSearchChange={setSearchQuery}
        onToggleTheme={() =>
          handleUpdatePrefs({ theme: profile.theme === 'dark' ? 'light' : 'dark' })
        }
        onToggleSound={() => handleUpdatePrefs({ soundEnabled: !profile.soundEnabled })}
      />

      {/* Achievement Unlock Toast */}
      {toastAchievement && (
        <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-2xl bg-slate-900 border border-amber-500/60 text-white shadow-xl flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-400">Yangi yutuq ochildi!</p>
            <p className="text-sm font-display font-bold">{toastAchievement}</p>
          </div>
        </div>
      )}

      <main ref={pageContainerRef} className="flex-1">
        {/* ==================== HOME VIEW ==================== */}
        {activeNav === 'home' && (
          <div className="page-fade-in">
            {/* 3D Animated Hero Section */}
            <section className="relative w-full min-h-[470px] lg:min-h-[540px] flex items-center overflow-hidden border-b border-slate-200 dark:border-slate-800/80">
              <div className="absolute inset-0">
                <Hero3DScene
                  primaryColor={ageConfig.heroColorA}
                  secondaryColor={ageConfig.heroColorB}
                  theme={profile.theme}
                  quality={profile.graphicsQuality}
                />
              </div>

              {/* Measured Scrim for WCAG AA Contrast over 3D Scene */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-50/95 via-slate-50/80 to-transparent dark:from-[#090D16]/95 dark:via-[#090D16]/75 dark:to-transparent" />

              <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-14 lg:py-20">
                <div className="max-w-2xl space-y-5">
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    Salom, {profile.name}! · {ageConfig.categoryTitle} ({ageConfig.label})
                  </p>

                  <h1 className="font-display text-3xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.08]">
                    Cheksiz o‘yinlar olamiga xush kelibsiz!
                  </h1>

                  <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                    Sevimli o‘yinlaringizni tanlang, mahoratingizni sinang va yangi sarguzashtlarni kashf eting!
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        gamesSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm sm:text-base inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Gamepad2 className="w-5 h-5" />
                      O‘yinlarni ko‘rish
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setSortOption('popular');
                        setSelectedGenre('Barchasi');
                        gamesSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-6 py-3.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-display font-bold text-sm sm:text-base inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Flame className="w-5 h-5 text-amber-500" />
                      Mashhur o‘yinlar
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Personal Progress Strip */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-20">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'Yosh toifasi', value: ageConfig.label, sub: ageConfig.categoryTitle },
                  {
                    label: 'Daraja va XP',
                    value: `${levelInfo.level}-daraja`,
                    sub: `${profile.xp} XP · ${levelInfo.progressPct}%`,
                  },
                  {
                    label: 'Jami ball',
                    value: `${profile.totalPoints}`,
                    sub: `${profile.totalGamesPlayed} marta o‘ynalgan`,
                  },
                  {
                    label: 'Yutuqlar',
                    value: `${profile.unlockedAchievements.length}/${ACHIEVEMENTS.length}`,
                    sub: `${profile.favorites.length} ta sevimli`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm"
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                    <p className="mt-1 font-display font-mono-num text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {item.value}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{item.sub}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Personalized Age-Filtered Games Section */}
            <section
              ref={gamesSectionRef}
              className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {ageConfig.label} uchun maxsus to‘plam
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    {ageConfig.categoryTitle}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {ageConfig.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setActiveNav('ranking');
                  }}
                  className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  Reytingni ko‘rish
                </button>
              </div>

              {renderFilterBar()}

              {filteredGames.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
                  <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Mos o‘yin topilmadi
                  </p>
                  <p className="text-sm text-slate-500">
                    Qidiruv matnini o‘zgartiring yoki barcha janrlarni tanlang.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedGenre('Barchasi');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm cursor-pointer"
                  >
                    Filtrlarni tozalash
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGames.map(renderGameCard)}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ==================== ALL GAMES VIEW ==================== */}
        {activeNav === 'all-games' && (
          <div className="page-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {ageConfig.categoryTitle} · {ageConfig.label}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                Barcha o‘yinlar
              </h1>
            </div>

            {renderFilterBar()}

            {filteredGames.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
                <p className="font-display text-lg font-bold">O‘yin topilmadi</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGenre('Barchasi');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm cursor-pointer"
                >
                  Barchasini ko‘rsatish
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGames.map(renderGameCard)}
              </div>
            )}
          </div>
        )}

        {/* ==================== CATEGORIES VIEW ==================== */}
        {activeNav === 'categories' && (
          <div className="page-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Yosh toifalari va janrlar
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                Kategoriyalar
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                Har bir yosh guruhi uchun 5 ta alohida 3D o‘yin tayyorlangan. Istalgan yosh toifasini tanlab uning maxsus kutubxonasiga o‘tishingiz mumkin.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {AGE_GROUPS.map((g) => {
                const isCurrent = g.id === profile.ageGroup;
                const gamesInGroup = getGamesByAge(g.id);
                return (
                  <div
                    key={g.id}
                    className={`rounded-2xl overflow-hidden bg-white dark:bg-slate-900/90 border transition-colors flex flex-col sm:flex-row ${
                      isCurrent
                        ? 'border-amber-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="sm:w-48 aspect-[4/3] sm:aspect-auto shrink-0 bg-slate-800">
                      <img
                        src={g.image}
                        alt={g.categoryTitle}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          {g.label} {isCurrent ? '· Faol toifa' : ''}
                        </p>
                        <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                          {g.categoryTitle}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {g.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {gamesInGroup.map((gm) => gm.title).join(' · ')}
                        </p>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playSelect();
                            handleUpdatePrefs({ ageGroup: g.id });
                            setActiveNav('all-games');
                          }}
                          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-bold cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-amber-500 hover:text-slate-950 transition-colors'
                          }`}
                        >
                          {isCurrent ? 'O‘yinlarni ochish' : 'Ushbu toifaga o‘tish'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== FAVORITES VIEW ==================== */}
        {activeNav === 'favorites' && (
          <div className="page-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-rose-500">Saqlangan o‘yinlar</p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                Sevimlilar ({ageConfig.label})
              </h1>
            </div>

            {filteredGames.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
                <Heart className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Hozircha sevimli o‘yinlar yo‘q
                </p>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Yoqtirgan 3D o‘yiningiz kartasidagi yurakcha tugmasini bosing — u darhol shu yerda paydo bo‘ladi.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveNav('all-games')}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-display font-bold text-sm cursor-pointer"
                >
                  O‘yinlarni ko‘rish
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGames.map(renderGameCard)}
              </div>
            )}
          </div>
        )}

        {/* ==================== RANKING VIEW ==================== */}
        {activeNav === 'ranking' && (
          <div className="page-fade-in">
            <RankingView profile={profile} onPlayGame={handleOpenGame} />
          </div>
        )}

        {/* ==================== PROFILE VIEW ==================== */}
        {activeNav === 'profile' && (
          <div className="page-fade-in">
            <ProfileView
              profile={profile}
              onUpdatePreferences={handleUpdatePrefs}
              onPlayGame={handleOpenGame}
              onResetProfile={handleResetProfile}
            />
          </div>
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0B1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-display font-bold text-slate-900 dark:text-white">
            <Gamepad2 className="w-4 h-4 text-amber-500" />
            <span>UZGAME 3D</span>
          </div>
          <p className="text-center">
            Yosh toifalariga mos 20 ta interaktiv WebGL 3D o‘yinlar platformasi · O‘zbek tilida
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveNav('categories')}
              className="hover:text-amber-500 transition-colors cursor-pointer"
            >
              Kategoriyalar
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('profile')}
              className="hover:text-amber-500 transition-colors cursor-pointer"
            >
              Profil
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
