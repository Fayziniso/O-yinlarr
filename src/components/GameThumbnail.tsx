import React from 'react';
import { GameMeta } from '../types';

interface Props {
  game: GameMeta;
  className?: string;
}

/**
 * Bespoke crisp vector-3D illustrated game cover art for all 20 UZGAME 3D titles.
 * Guarantees instant load, zero broken images, and immediately recognizable artwork per game.
 */
export const GameThumbnail: React.FC<Props> = ({ game, className = '' }) => {
  const renderArtwork = () => {
    switch (game.id) {
      case 'ranglarni-top':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <defs>
              <linearGradient id="bg-rt" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="100%" stopColor="#fde68a" />
              </linearGradient>
            </defs>
            <rect width="320" height="200" fill="url(#bg-rt)" />
            <ellipse cx="160" cy="166" rx="125" ry="20" fill="#d97706" opacity="0.22" />
            {/* 3D Red Cube */}
            <polygon points="58,108 94,88 130,108 94,128" fill="#fb7185" />
            <polygon points="58,108 94,128 94,166 58,146" fill="#e11d48" />
            <polygon points="130,108 94,128 94,166 130,146" fill="#be123c" />
            {/* 3D Blue Sphere */}
            <circle cx="168" cy="108" r="36" fill="#2563eb" />
            <circle cx="156" cy="94" r="14" fill="#60a5fa" opacity="0.7" />
            {/* 3D Green Cone */}
            <polygon points="242,68 208,150 276,150" fill="#10b981" />
            <ellipse cx="242" cy="150" rx="34" ry="10" fill="#059669" />
            <polygon points="242,68 242,150 276,150" fill="#047857" opacity="0.35" />
          </svg>
        );
      case 'hayvonlarni-tani':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <linearGradient id="bg-ht" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="60%" stopColor="#dcfce7" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
            <rect width="320" height="200" fill="url(#bg-ht)" />
            <ellipse cx="160" cy="176" rx="170" ry="44" fill="#22c55e" />
            {/* Friendly Lion */}
            <circle cx="115" cy="108" r="42" fill="#b45309" />
            <circle cx="115" cy="108" r="30" fill="#facc15" />
            <circle cx="104" cy="102" r="4.5" fill="#0f172a" />
            <circle cx="126" cy="102" r="4.5" fill="#0f172a" />
            <polygon points="115,110 109,118 121,118" fill="#7c2d12" />
            {/* Friendly Bunny */}
            <rect x="200" y="54" width="12" height="36" rx="6" fill="#f8fafc" />
            <rect x="220" y="54" width="12" height="36" rx="6" fill="#f8fafc" />
            <circle cx="216" cy="112" r="28" fill="#f8fafc" />
            <circle cx="207" cy="107" r="4" fill="#0f172a" />
            <circle cx="225" cy="107" r="4" fill="#0f172a" />
            <circle cx="216" cy="116" r="4.5" fill="#f472b6" />
          </svg>
        );
      case 'shakllar-olami':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#eff6ff" />
            <rect x="28" y="32" width="264" height="136" rx="18" fill="#d97706" opacity="0.22" />
            <rect x="36" y="40" width="248" height="120" rx="14" fill="#fef3c7" stroke="#d97706" strokeWidth="3" />
            <rect x="58" y="72" width="52" height="52" rx="8" fill="#3b82f6" />
            <circle cx="160" cy="98" r="28" fill="#f43f5e" />
            <polygon points="238,68 208,124 268,124" fill="#10b981" />
          </svg>
        );
      case 'mevalarni-sarala':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#fff7ed" />
            {/* Basket */}
            <path d="M88,128 L232,128 L216,178 L104,178 Z" fill="#b45309" />
            <rect x="82" y="118" width="156" height="14" rx="7" fill="#d97706" />
            {/* Apple */}
            <circle cx="118" cy="96" r="26" fill="#e11d48" />
            <ellipse cx="126" cy="68" rx="10" ry="5" fill="#16a34a" transform="rotate(-20 126 68)" />
            {/* Pear */}
            <circle cx="198" cy="102" r="22" fill="#84cc16" />
            <circle cx="198" cy="82" r="15" fill="#84cc16" />
            {/* Banana */}
            <path d="M138,76 Q162,48 188,80 Q162,72 138,76 Z" fill="#facc15" stroke="#eab308" strokeWidth="6" strokeLinecap="round" />
          </svg>
        );
      case 'raqamlarni-organ':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#f5f3ff" />
            {[
              { x: 46, y: 66, n: '1', c: '#f43f5e' },
              { x: 128, y: 52, n: '2', c: '#f59e0b' },
              { x: 210, y: 66, n: '3', c: '#8b5cf6' },
            ].map((b) => (
              <g key={b.n}>
                <rect x={b.x} y={b.y} width="66" height="74" rx="14" fill={b.c} />
                <text
                  x={b.x + 33}
                  y={b.y + 49}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="40"
                  fontWeight="800"
                  fontFamily="Outfit, sans-serif"
                >
                  {b.n}
                </text>
              </g>
            ))}
          </svg>
        );
      case 'matematika-ustasi':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <linearGradient id="bg-mu" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
            <rect width="320" height="200" fill="url(#bg-mu)" />
            <polygon points="30,175 160,120 290,175 290,200 30,200" fill="#065f46" />
            <rect x="66" y="48" width="188" height="58" rx="12" fill="#0f172a" stroke="#34d399" strokeWidth="2.5" />
            <text x="160" y="88" textAnchor="middle" fill="#6ee7b7" fontSize="34" fontWeight="800" fontFamily="JetBrains Mono, monospace">
              7 × 8 = ?
            </text>
            <circle cx="95" cy="148" r="18" fill="#10b981" />
            <circle cx="160" cy="142" r="22" fill="#f59e0b" />
            <circle cx="225" cy="148" r="18" fill="#06b6d4" />
          </svg>
        );
      case 'xotira-sinovi':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#0c4a6e" />
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(${44 + i * 82}, 42)`}>
                <rect width="68" height="114" rx="12" fill={i === 1 ? '#f59e0b' : '#1e293b'} stroke="#38bdf8" strokeWidth="2.5" />
                <polygon
                  points="34,34 41,52 60,52 45,63 51,80 34,70 17,80 23,63 8,52 27,52"
                  fill={i === 1 ? '#ffffff' : '#38bdf8'}
                />
              </g>
            ))}
          </svg>
        );
      case 'puzzle-3d':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#1e293b" />
            {/* Isometric stacked 3D tower blocks */}
            <polygon points="160,34 212,62 160,90 108,62" fill="#fbbf24" />
            <polygon points="108,62 160,90 160,132 108,104" fill="#d97706" />
            <polygon points="212,62 160,90 160,132 212,104" fill="#b45309" />
            <polygon points="160,104 226,138 160,172 94,138" fill="#38bdf8" opacity="0.9" />
            <polygon points="94,138 160,172 160,192 94,158" fill="#0284c7" />
            <polygon points="226,138 160,172 160,192 226,158" fill="#0369a1" />
          </svg>
        );
      case 'dinozavrlar-olami':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <linearGradient id="bg-dn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
            <rect width="320" height="200" fill="url(#bg-dn)" />
            <polygon points="210,130 265,44 315,130" fill="#57534e" />
            <polygon points="250,66 265,44 280,66" fill="#f97316" />
            <ellipse cx="160" cy="180" rx="180" ry="50" fill="#15803d" />
            {/* Stylized 3D T-Rex silhouette */}
            <rect x="86" y="102" width="62" height="44" rx="12" fill="#166534" />
            <rect x="132" y="66" width="46" height="32" rx="8" fill="#166534" />
            <polygon points="48,124 90,108 90,134" fill="#166534" />
            <rect x="100" y="140" width="16" height="30" rx="4" fill="#14532d" />
            <rect x="128" y="140" width="16" height="30" rx="4" fill="#14532d" />
            <circle cx="158" cy="78" r="4" fill="#fef08a" />
          </svg>
        );
      case 'tezkor-bilimdon':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#1e1b4b" />
            <polygon points="60,0 130,200 10,200" fill="#6366f1" opacity="0.2" />
            <polygon points="260,0 310,200 190,200" fill="#38bdf8" opacity="0.2" />
            <rect x="44" y="128" width="48" height="58" rx="6" fill="#ef4444" />
            <rect x="106" y="114" width="48" height="72" rx="6" fill="#3b82f6" />
            <rect x="168" y="102" width="48" height="84" rx="6" fill="#10b981" />
            <rect x="230" y="122" width="48" height="64" rx="6" fill="#f59e0b" />
            <text x="160" y="74" textAnchor="middle" fill="#ffffff" fontSize="48" fontWeight="800" fontFamily="Outfit, sans-serif">
              ?
            </text>
          </svg>
        );
      case '3d-racing':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <linearGradient id="bg-rc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="55%" stopColor="#7c2d12" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <rect width="320" height="200" fill="url(#bg-rc)" />
            <polygon points="122,95 198,95 292,200 28,200" fill="#1e293b" />
            <polygon points="157,95 163,95 168,200 152,200" fill="#f59e0b" strokeDasharray="12 10" />
            {/* Sports Car rear */}
            <rect x="114" y="132" width="92" height="32" rx="8" fill="#f59e0b" />
            <polygon points="126,132 138,112 182,112 194,132" fill="#0f172a" />
            <rect x="122" y="144" width="22" height="7" rx="3" fill="#ef4444" />
            <rect x="176" y="144" width="22" height="7" rx="3" fill="#ef4444" />
          </svg>
        );
      case 'space-explorer':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#020617" />
            <circle cx="52" cy="44" r="2" fill="#ffffff" />
            <circle cx="272" cy="38" r="2.5" fill="#bae6fd" />
            <circle cx="242" cy="146" r="2" fill="#ffffff" />
            <circle cx="76" cy="158" r="1.8" fill="#38bdf8" />
            {/* Energy ring */}
            <ellipse cx="220" cy="96" rx="44" ry="44" fill="none" stroke="#06b6d4" strokeWidth="6" />
            {/* Starfighter */}
            <polygon points="145,100 84,78 96,100 84,122" fill="#38bdf8" />
            <polygon points="158,100 100,90 100,110" fill="#e2e8f0" />
            <circle cx="80" cy="100" r="8" fill="#f59e0b" />
          </svg>
        );
      case 'zombie-survival':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#0f172a" />
            <circle cx="160" cy="112" r="64" fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray="8 6" />
            <circle cx="160" cy="112" r="36" fill="none" stroke="#22c55e" strokeWidth="2.5" />
            {/* Survivor center */}
            <rect x="148" y="96" width="24" height="32" rx="6" fill="#0ea5e9" />
            {/* Stylized cube bots */}
            <rect x="66" y="68" width="26" height="26" rx="4" fill="#22c55e" />
            <rect x="234" y="128" width="26" height="26" rx="4" fill="#22c55e" />
            <rect x="228" y="58" width="24" height="24" rx="4" fill="#f59e0b" />
          </svg>
        );
      case 'basketball-challenge':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <linearGradient id="bg-bb" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c2d12" />
              <stop offset="100%" stopColor="#1c1917" />
            </linearGradient>
            <rect width="320" height="200" fill="url(#bg-bb)" />
            <rect x="190" y="34" width="90" height="62" rx="4" fill="#f8fafc" stroke="#ef4444" strokeWidth="4" />
            <rect x="172" y="88" width="44" height="6" rx="3" fill="#f97316" />
            <path d="M176,94 L182,126 M194,94 L194,126 M212,94 L206,126" stroke="#e2e8f0" strokeWidth="2" />
            {/* Arc + Ball */}
            <path d="M56,154 Q120,40 186,86" fill="none" stroke="#fbbf24" strokeWidth="3" strokeDasharray="6 6" />
            <circle cx="88" cy="112" r="24" fill="#ea580c" stroke="#1c1917" strokeWidth="2" />
          </svg>
        );
      case 'minecraft-builder':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#38bdf8" />
            <rect x="0" y="140" width="320" height="60" fill="#16a34a" />
            {/* Voxel house */}
            <rect x="92" y="86" width="136" height="72" fill="#a16207" />
            <rect x="82" y="68" width="156" height="20" fill="#b91c1c" />
            <rect x="104" y="50" width="112" height="20" fill="#dc2626" />
            <rect x="146" y="114" width="28" height="44" fill="#451a03" />
            <rect x="106" y="102" width="24" height="24" fill="#bae6fd" />
            <rect x="190" y="102" width="24" height="24" fill="#bae6fd" />
          </svg>
        );
      case 'car-simulator':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <linearGradient id="bg-cs" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#18181b" />
              <stop offset="100%" stopColor="#3f3f46" />
            </linearGradient>
            <rect width="320" height="200" fill="url(#bg-cs)" />
            <line x1="0" y1="158" x2="320" y2="158" stroke="#ef4444" strokeWidth="3" />
            {/* Side profile supercar */}
            <path d="M46,144 L70,118 L124,96 L204,96 L246,118 L278,128 L278,148 L46,148 Z" fill="#ef4444" />
            <polygon points="128,102 198,102 226,118 106,118" fill="#0f172a" />
            <circle cx="96" cy="148" r="20" fill="#09090b" stroke="#cbd5e1" strokeWidth="5" />
            <circle cx="228" cy="148" r="20" fill="#09090b" stroke="#cbd5e1" strokeWidth="5" />
          </svg>
        );
      case 'football-simulator':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#059669" />
            <rect x="18" y="18" width="284" height="164" fill="none" stroke="#ecfdf5" strokeWidth="3" opacity="0.85" />
            <line x1="160" y1="18" x2="160" y2="182" stroke="#ecfdf5" strokeWidth="3" opacity="0.85" />
            <circle cx="160" cy="100" r="32" fill="none" stroke="#ecfdf5" strokeWidth="3" opacity="0.85" />
            <circle cx="160" cy="100" r="18" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />
            <polygon points="160,91 168,97 165,107 155,107 152,97" fill="#0f172a" />
          </svg>
        );
      case 'city-driving':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#0f172a" />
            {/* City skyline */}
            <rect x="24" y="48" width="44" height="106" fill="#1e293b" />
            <rect x="78" y="28" width="54" height="126" fill="#334155" />
            <rect x="144" y="56" width="48" height="98" fill="#1e293b" />
            <rect x="204" y="34" width="52" height="120" fill="#334155" />
            <rect x="266" y="64" width="38" height="90" fill="#1e293b" />
            {/* Glowing windows */}
            {[34, 90, 108, 214, 232].map((x) => (
              <rect key={x} x={x} y="54" width="10" height="14" fill="#facc15" opacity="0.85" />
            ))}
            <rect x="0" y="152" width="320" height="48" fill="#18181b" />
            <line x1="0" y1="176" x2="320" y2="176" stroke="#38bdf8" strokeWidth="3" strokeDasharray="18 14" />
          </svg>
        );
      case 'tower-defense':
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#1c1917" />
            <path d="M0,145 L110,145 L110,65 L230,65 L230,145 L320,145" fill="none" stroke="#78716c" strokeWidth="28" />
            {/* Tower 1 */}
            <rect x="52" y="70" width="34" height="44" rx="5" fill="#f59e0b" />
            <line x1="69" y1="78" x2="148" y2="65" stroke="#38bdf8" strokeWidth="3.5" />
            {/* Tower 2 */}
            <rect x="158" y="100" width="34" height="44" rx="5" fill="#ef4444" />
            {/* Enemy drones */}
            <circle cx="152" cy="65" r="10" fill="#ef4444" />
            <circle cx="186" cy="65" r="10" fill="#ef4444" />
          </svg>
        );
      case 'space-battle-arena':
      default:
        return (
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#090d16" />
            <circle cx="250" cy="160" r="70" fill="#312e81" />
            {/* Lasers */}
            <line x1="94" y1="108" x2="218" y2="68" stroke="#38bdf8" strokeWidth="4" />
            <line x1="94" y1="120" x2="218" y2="80" stroke="#38bdf8" strokeWidth="4" />
            {/* Player fighter */}
            <polygon points="104,114 48,92 60,114 48,136" fill="#6366f1" />
            {/* Enemy cruiser */}
            <polygon points="205,74 268,54 256,74 268,94" fill="#ec4899" />
            <circle cx="218" cy="74" r="12" fill="#f59e0b" opacity="0.85" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`relative overflow-hidden select-none bg-slate-900 ${className}`}
      aria-label={game.title}
    >
      {renderArtwork()}
    </div>
  );
};
