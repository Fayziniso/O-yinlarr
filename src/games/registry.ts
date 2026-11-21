import React from 'react';
import { GameComponentProps } from '../types';

type LazyGameComponent = React.LazyExoticComponent<React.ComponentType<GameComponentProps>>;

export const GAME_REGISTRY: Record<string, LazyGameComponent> = {
  // Category A: 3–5 yosh
  'ranglarni-top': React.lazy(() =>
    import('./kids/RanglarniTop').then((m) => ({ default: m.RanglarniTop }))
  ),
  'hayvonlarni-tani': React.lazy(() =>
    import('./kids/HayvonlarniTani').then((m) => ({ default: m.HayvonlarniTani }))
  ),
  'shakllar-olami': React.lazy(() =>
    import('./kids/ShakllarOlami').then((m) => ({ default: m.ShakllarOlami }))
  ),
  'mevalarni-sarala': React.lazy(() =>
    import('./kids/MevalarniSarala').then((m) => ({ default: m.MevalarniSarala }))
  ),
  'raqamlarni-organ': React.lazy(() =>
    import('./kids/RaqamlarniOrgan').then((m) => ({ default: m.RaqamlarniOrgan }))
  ),

  // Category B: 6–9 yosh
  'matematika-ustasi': React.lazy(() =>
    import('./scholars/MatematikaUstasi').then((m) => ({ default: m.MatematikaUstasi }))
  ),
  'xotira-sinovi': React.lazy(() =>
    import('./scholars/XotiraSinovi').then((m) => ({ default: m.XotiraSinovi }))
  ),
  'puzzle-3d': React.lazy(() =>
    import('./scholars/Puzzle3D').then((m) => ({ default: m.Puzzle3D }))
  ),
  'dinozavrlar-olami': React.lazy(() =>
    import('./scholars/DinozavrlarOlami').then((m) => ({ default: m.DinozavrlarOlami }))
  ),
  'tezkor-bilimdon': React.lazy(() =>
    import('./scholars/TezkorBilimdon').then((m) => ({ default: m.TezkorBilimdon }))
  ),

  // Category C: 10–15 yosh
  '3d-racing': React.lazy(() =>
    import('./gamers/Racing3D').then((m) => ({ default: m.Racing3D }))
  ),
  'space-explorer': React.lazy(() =>
    import('./gamers/SpaceExplorer').then((m) => ({ default: m.SpaceExplorer }))
  ),
  'zombie-survival': React.lazy(() =>
    import('./gamers/ZombieSurvival').then((m) => ({ default: m.ZombieSurvival }))
  ),
  'basketball-challenge': React.lazy(() =>
    import('./gamers/BasketballChallenge').then((m) => ({ default: m.BasketballChallenge }))
  ),
  'minecraft-builder': React.lazy(() =>
    import('./gamers/MinecraftBuilder').then((m) => ({ default: m.MinecraftBuilder }))
  ),

  // Category D: 16–20 yosh
  'car-simulator': React.lazy(() =>
    import('./pro/CarSimulator').then((m) => ({ default: m.CarSimulator }))
  ),
  'football-simulator': React.lazy(() =>
    import('./pro/FootballSimulator').then((m) => ({ default: m.FootballSimulator }))
  ),
  'city-driving': React.lazy(() =>
    import('./pro/CityDriving').then((m) => ({ default: m.CityDriving }))
  ),
  'tower-defense': React.lazy(() =>
    import('./pro/TowerDefense3D').then((m) => ({ default: m.TowerDefense3D }))
  ),
  'space-battle-arena': React.lazy(() =>
    import('./pro/SpaceBattleArena').then((m) => ({ default: m.SpaceBattleArena }))
  ),
};
