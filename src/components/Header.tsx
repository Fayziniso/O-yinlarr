import React, { useState } from 'react';
import {
  Gamepad2,
  Menu,
  Moon,
  Search,
  Sun,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { NavSection, UserProfile } from '../types';
import { sound } from '../utils/sound';
import { getLevelFromXp } from '../utils/storage';

interface HeaderProps {
  profile: UserProfile;
  activeNav: NavSection;
  searchQuery: string;
  onNavigate: (section: NavSection) => void;
  onSearchChange: (value: string) => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: 'home', label: 'Bosh sahifa' },
  { id: 'all-games', label: "Barcha o'yinlar" },
  { id: 'categories', label: 'Kategoriyalar' },
  { id: 'favorites', label: 'Sevimlilar' },
  { id: 'ranking', label: 'Reyting' },
];

export const Header: React.FC<HeaderProps> = ({
  profile,
  activeNav,
  searchQuery,
  onNavigate,
  onSearchChange,
  onToggleTheme,
  onToggleSound,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { level } = getLevelFromXp(profile.xp);

  const handleNavClick = (section: NavSection) => {
    sound.playClick();
    onNavigate(section);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#090D16]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 lg:gap-6">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg"
        >
          <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center">
            <Gamepad2 className="w-5 h-5" />
          </span>
          <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            UZGAME 3D
          </span>
        </button>

        {/* Zone 2: Clean single-line text navigation */}
        <nav
          aria-label="Asosiy navigatsiya"
          className="hidden xl:flex items-center gap-6 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-[21px] h-0.5 bg-amber-500" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Search + Theme + Sound + Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative hidden md:block w-48 lg:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (activeNav !== 'home' && activeNav !== 'all-games') {
                  onNavigate('all-games');
                }
              }}
              placeholder="O‘yin qidirish..."
              aria-label="O‘yin qidirish"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onToggleSound();
            }}
            aria-label={profile.soundEnabled ? "Ovozni o'chirish" : 'Ovozni yoqish'}
            title={profile.soundEnabled ? "Ovozni o'chirish" : 'Ovozni yoqish'}
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-500/60 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            {profile.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onToggleTheme();
            }}
            aria-label={profile.theme === 'dark' ? "Yorug' mavzu" : "Qorong'i mavzu"}
            title={profile.theme === 'dark' ? "Yorug' mavzu" : "Qorong'i mavzu"}
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-500/60 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            {profile.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('profile')}
            className={`h-10 px-3 sm:px-3.5 rounded-xl border flex items-center gap-2 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeNav === 'profile'
                ? 'bg-amber-500 border-amber-500 text-slate-950'
                : 'bg-slate-900 dark:bg-slate-800 border-slate-900 dark:border-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-700'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="max-w-[96px] truncate">{profile.name}</span>
            <span className="hidden sm:inline text-xs opacity-75 font-mono-num">
              {level}-daraja
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setMobileMenuOpen((v) => !v);
            }}
            aria-label="Menyu"
            className="xl:hidden w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D16] px-4 py-4 space-y-3">
          <div className="relative md:hidden">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (activeNav !== 'home' && activeNav !== 'all-games') {
                  onNavigate('all-games');
                }
              }}
              placeholder="O‘yin qidirish..."
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors cursor-pointer ${
                  activeNav === item.id
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
