export type AgeGroup = '3-5' | '6-9' | '10-15' | '16-20';

export type GameGenre =
  | 'Poyga'
  | 'Sport'
  | 'Sarguzasht'
  | "Ta'lim"
  | 'Mantiq'
  | 'Strategiya'
  | 'Simulyator'
  | 'Arkada';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type ThemeMode = 'dark' | 'light';

export type SortOption = 'popular' | 'newest' | 'highest-score';

export type NavSection =
  | 'home'
  | 'all-games'
  | 'categories'
  | 'favorites'
  | 'ranking'
  | 'profile';

export interface AgeGroupConfig {
  id: AgeGroup;
  label: string;
  categoryTitle: string;
  subtitle: string;
  description: string;
  image: string;
  accentHex: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  heroColorA: number;
  heroColorB: number;
}

export interface GameMeta {
  id: string;
  title: string;
  shortDesc: string;
  instructions: string[];
  controlsHint: string;
  ageGroup: AgeGroup;
  genre: GameGenre;
  accentHex: string;
  secondaryHex: string;
  rating: number;
  basePlays: number;
  isNew: boolean;
  isPopular: boolean;
  difficulty: 'Oson' | "O'rta" | 'Qiyin';
  estimatedMinutes: number;
}

export interface UserProfile {
  name: string;
  ageGroup: AgeGroup;
  theme: ThemeMode;
  soundEnabled: boolean;
  graphicsQuality: GraphicsQuality;
  favorites: string[];
  scores: Record<string, number>;
  playCounts: Record<string, number>;
  wonGames: string[];
  totalGamesPlayed: number;
  totalPoints: number;
  xp: number;
  recentlyPlayed: string[];
  unlockedAchievements: string[];
  createdAt: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  target: number;
  getCurrent: (profile: UserProfile) => number;
}

export interface GameComponentProps {
  quality: GraphicsQuality;
  soundEnabled: boolean;
  isPaused: boolean;
  onScoreChange: (score: number) => void;
  onStatusChange?: (status: string) => void;
  onGameOver: (finalScore: number, summary?: string) => void;
  onVictory: (finalScore: number, summary?: string) => void;
}
