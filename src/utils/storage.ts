import { ACHIEVEMENTS } from '../data/games';
import { AgeGroup, GraphicsQuality, ThemeMode, UserProfile } from '../types';

const STORAGE_KEY = 'uzgame3d_profile_v1';

export function getLevelFromXp(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPct: number;
} {
  // Progressive XP curve: level 1: 0-99, level 2: 100-249, etc.
  let level = 1;
  let threshold = 100;
  let remaining = Math.max(0, xp);
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = 100 + (level - 1) * 60;
  }
  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: threshold,
    progressPct: Math.min(100, Math.round((remaining / threshold) * 100)),
  };
}

export function createInitialProfile(name: string, ageGroup: AgeGroup): UserProfile {
  return {
    name: name.trim(),
    ageGroup,
    theme: ageGroup === '3-5' || ageGroup === '6-9' ? 'light' : 'dark',
    soundEnabled: true,
    graphicsQuality: 'high',
    favorites: [],
    scores: {},
    playCounts: {},
    wonGames: [],
    totalGamesPlayed: 0,
    totalPoints: 0,
    xp: 0,
    recentlyPlayed: [],
    unlockedAchievements: [],
    createdAt: new Date().toISOString(),
  };
}

export function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    if (!parsed || typeof parsed.name !== 'string' || !parsed.name.trim() || !parsed.ageGroup) {
      return null;
    }
    return {
      name: parsed.name,
      ageGroup: parsed.ageGroup,
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      soundEnabled: parsed.soundEnabled !== false,
      graphicsQuality:
        parsed.graphicsQuality === 'low' ||
        parsed.graphicsQuality === 'medium' ||
        parsed.graphicsQuality === 'high'
          ? parsed.graphicsQuality
          : 'high',
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      scores: parsed.scores && typeof parsed.scores === 'object' ? parsed.scores : {},
      playCounts: parsed.playCounts && typeof parsed.playCounts === 'object' ? parsed.playCounts : {},
      wonGames: Array.isArray(parsed.wonGames) ? parsed.wonGames : [],
      totalGamesPlayed: typeof parsed.totalGamesPlayed === 'number' ? parsed.totalGamesPlayed : 0,
      totalPoints: typeof parsed.totalPoints === 'number' ? parsed.totalPoints : 0,
      xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
      recentlyPlayed: Array.isArray(parsed.recentlyPlayed) ? parsed.recentlyPlayed : [],
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
        ? parsed.unlockedAchievements
        : [],
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore quota errors gracefully
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function evaluateAchievements(profile: UserProfile): {
  profile: UserProfile;
  newlyUnlocked: string[];
} {
  const newlyUnlocked: string[] = [];
  let bonusXp = 0;

  for (const ach of ACHIEVEMENTS) {
    if (!profile.unlockedAchievements.includes(ach.id)) {
      if (ach.getCurrent(profile) >= ach.target) {
        newlyUnlocked.push(ach.id);
        bonusXp += ach.xpReward;
      }
    }
  }

  if (newlyUnlocked.length === 0) {
    return { profile, newlyUnlocked: [] };
  }

  const updated: UserProfile = {
    ...profile,
    xp: profile.xp + bonusXp,
    unlockedAchievements: [...profile.unlockedAchievements, ...newlyUnlocked],
  };
  saveProfile(updated);
  return { profile: updated, newlyUnlocked };
}

export function recordGameSession(
  profile: UserProfile,
  gameId: string,
  score: number,
  won: boolean
): {
  profile: UserProfile;
  earnedXp: number;
  isNewRecord: boolean;
  newlyUnlocked: string[];
} {
  const safeScore = Math.max(0, Math.round(score));
  const prevBest = profile.scores[gameId] || 0;
  const isNewRecord = safeScore > prevBest;
  const earnedXp = Math.max(15, Math.round(safeScore * 0.5) + (won ? 40 : 10));

  const nextRecent = [gameId, ...profile.recentlyPlayed.filter((id) => id !== gameId)].slice(0, 8);
  const nextWonGames =
    won && !profile.wonGames.includes(gameId)
      ? [...profile.wonGames, gameId]
      : profile.wonGames;

  const baseUpdated: UserProfile = {
    ...profile,
    scores: {
      ...profile.scores,
      [gameId]: Math.max(prevBest, safeScore),
    },
    playCounts: {
      ...profile.playCounts,
      [gameId]: (profile.playCounts[gameId] || 0) + 1,
    },
    wonGames: nextWonGames,
    totalGamesPlayed: profile.totalGamesPlayed + 1,
    totalPoints: profile.totalPoints + safeScore,
    xp: profile.xp + earnedXp,
    recentlyPlayed: nextRecent,
  };

  const { profile: evaluated, newlyUnlocked } = evaluateAchievements(baseUpdated);
  saveProfile(evaluated);

  return {
    profile: evaluated,
    earnedXp,
    isNewRecord,
    newlyUnlocked,
  };
}

export function markRecentlyPlayed(profile: UserProfile, gameId: string): UserProfile {
  const nextRecent = [gameId, ...profile.recentlyPlayed.filter((id) => id !== gameId)].slice(0, 8);
  const updated = { ...profile, recentlyPlayed: nextRecent };
  saveProfile(updated);
  return updated;
}

export function toggleFavoriteGame(
  profile: UserProfile,
  gameId: string
): { profile: UserProfile; newlyUnlocked: string[] } {
  const exists = profile.favorites.includes(gameId);
  const nextFavs = exists
    ? profile.favorites.filter((id) => id !== gameId)
    : [...profile.favorites, gameId];
  const baseUpdated: UserProfile = { ...profile, favorites: nextFavs };
  const result = evaluateAchievements(baseUpdated);
  saveProfile(result.profile);
  return result;
}

export function updateProfilePreferences(
  profile: UserProfile,
  patch: Partial<{
    name: string;
    ageGroup: AgeGroup;
    theme: ThemeMode;
    soundEnabled: boolean;
    graphicsQuality: GraphicsQuality;
  }>
): UserProfile {
  const updated: UserProfile = {
    ...profile,
    ...patch,
    name: patch.name !== undefined ? patch.name.trim() || profile.name : profile.name,
  };
  saveProfile(updated);
  return updated;
}
