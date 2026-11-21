import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowLeft, ArrowRight, Check, Gamepad2 } from 'lucide-react';
import { AGE_GROUPS } from '../data/games';
import { AgeGroup } from '../types';
import { sound } from '../utils/sound';

interface OnboardingProps {
  onComplete: (name: string, ageGroup: AgeGroup) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.onboard-stagger',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          stagger: 0.07,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [step]);

  useEffect(() => {
    if (step !== 3 || !selectedAge) return;
    const timer = window.setTimeout(() => {
      onComplete(name.trim(), selectedAge);
    }, 1700);
    return () => window.clearTimeout(timer);
  }, [step, selectedAge, name, onComplete]);

  const handleSelectAge = (age: AgeGroup) => {
    sound.playSelect();
    setSelectedAge(age);
    setStep(2);
  };

  const handleSubmitName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = name.trim();
    if (!cleaned) {
      sound.playError();
      setError('Iltimos, ismingizni kiriting.');
      return;
    }
    if (cleaned.length < 2) {
      sound.playError();
      setError("Ism kamida 2 ta harfdan iborat bo'lishi kerak.");
      return;
    }
    sound.playSuccess();
    setError('');
    setStep(3);
  };

  const activeAgeObj = AGE_GROUPS.find((a) => a.id === selectedAge);

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full bg-[#090D16] text-slate-100 flex flex-col justify-between px-5 py-8 md:px-10 md:py-10 relative overflow-hidden"
    >
      {/* Subtle atmospheric backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 20% 18%, rgba(245, 158, 11, 0.16), transparent 46%), radial-gradient(circle at 82% 80%, rgba(14, 165, 233, 0.18), transparent 48%)',
        }}
      />

      {/* Minimal Top Brand Bar */}
      <header className="relative z-10 max-w-6xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-white">
            UZGAME 3D
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <span className={step >= 1 ? 'text-amber-400 font-semibold' : ''}>1. Yosh</span>
          <span aria-hidden="true">/</span>
          <span className={step >= 2 ? 'text-amber-400 font-semibold' : ''}>2. Ism</span>
          <span aria-hidden="true">/</span>
          <span className={step === 3 ? 'text-amber-400 font-semibold' : ''}>3. Boshlash</span>
        </div>
      </header>

      {/* Main Centered Onboarding Flow */}
      <main className="relative z-10 max-w-6xl w-full mx-auto my-auto py-8">
        {step === 1 && (
          <div className="space-y-8">
            <div className="onboard-stagger text-center max-w-2xl mx-auto space-y-3">
              <p className="text-sm font-medium text-amber-400">
                Shaxsiylashtirilgan 3D o‘yinlar platformasi
              </p>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                Xush kelibsiz! Avval yoshingizni tanlang.
              </h1>
              <p className="text-sm sm:text-base text-slate-400">
                Yosh toifangizga mos xavfsiz, qiziqarli va haqiqiy 3D o‘yinlar to‘plami avtomatik tayyorlanadi.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {AGE_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleSelectAge(group.id)}
                  className="onboard-stagger group text-left rounded-2xl overflow-hidden bg-slate-900/90 border border-slate-800 hover:border-amber-400/70 transition-all duration-200 hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-800">
                    <img
                      src={group.image}
                      alt={group.categoryTitle}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                      <span
                        className="font-display text-2xl font-extrabold text-white tracking-tight"
                      >
                        {group.label}
                      </span>
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-950 transition-transform duration-200 group-hover:translate-x-1"
                        style={{ backgroundColor: group.accentHex }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <h2 className="font-display text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                        {group.categoryTitle}
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-slate-400 leading-relaxed">
                        {group.description}
                      </p>
                    </div>
                    <p className="pt-2 text-xs font-medium text-slate-500">
                      5 ta 3D o‘yin · Moslashtirilgan boshqaruv
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && activeAgeObj && (
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setStep(1);
              }}
              className="onboard-stagger mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Yosh toifasini o‘zgartirish
            </button>

            <div className="onboard-stagger rounded-2xl bg-slate-900/95 border border-slate-800 p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-4 pb-5 border-b border-slate-800">
                <img
                  src={activeAgeObj.image}
                  alt={activeAgeObj.categoryTitle}
                  referrerPolicy="no-referrer"
                  className="w-16 h-12 rounded-lg object-cover shrink-0"
                />
                <div>
                  <p className="text-xs font-medium text-amber-400">{activeAgeObj.label}</p>
                  <p className="font-display text-lg font-bold text-white">
                    {activeAgeObj.categoryTitle}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
                  Ismingiz nima?
                </h1>
                <p className="text-sm text-slate-400">
                  Bu ism o‘yin natijalari, reyting va shaxsiy profilingizda ko‘rinadi.
                </p>
              </div>

              <form onSubmit={handleSubmitName} className="space-y-4">
                <div>
                  <label htmlFor="uzgame-name-input" className="sr-only">
                    Ismingiz
                  </label>
                  <input
                    id="uzgame-name-input"
                    type="text"
                    autoFocus
                    maxLength={24}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Ismingizni kiriting..."
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-base focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 transition-all"
                  />
                  {error && (
                    <p role="alert" className="mt-2 text-sm text-rose-400 font-medium">
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  Boshlash
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {step === 3 && activeAgeObj && (
          <div className="max-w-xl mx-auto text-center space-y-6">
            <div className="onboard-stagger w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Check className="w-8 h-8" />
            </div>

            <h1 className="onboard-stagger font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Xush kelibsiz, {name.trim()}!
            </h1>

            <p className="onboard-stagger text-base text-slate-300">
              Siz uchun <span className="font-semibold text-amber-400">{activeAgeObj.categoryTitle}</span> ({activeAgeObj.label}) bo‘limi ochildi. Bosh sahifaga yo‘naltirilmoqda...
            </p>

            <div className="onboard-stagger pt-2">
              <button
                type="button"
                onClick={() => onComplete(name.trim(), activeAgeObj.id)}
                className="px-6 py-3 rounded-xl bg-white text-slate-950 font-semibold text-sm hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hoziroq o‘tish
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 max-w-6xl w-full mx-auto text-center text-xs text-slate-500">
        UZGAME 3D · O‘zbek tilidagi xavfsiz 3D o‘yinlar maydoni
      </footer>
    </div>
  );
};
