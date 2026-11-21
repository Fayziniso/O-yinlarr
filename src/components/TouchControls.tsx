import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

interface TouchControlsProps {
  onKeyState: (key: string, pressed: boolean) => void;
  actionLabel?: string;
  actionKey?: string;
  secondaryLabel?: string;
  secondaryKey?: string;
  horizontalOnly?: boolean;
}

/**
 * Ergonomic touch controls for mobile and tablet play (solid/rgba surfaces, no backdrop-blur over WebGL).
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  onKeyState,
  actionLabel,
  actionKey = 'Space',
  secondaryLabel,
  secondaryKey = 'KeyE',
  horizontalOnly = false,
}) => {
  const bind = (code: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      onKeyState(code, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      onKeyState(code, false);
    },
    onPointerLeave: () => onKeyState(code, false),
    onPointerCancel: () => onKeyState(code, false),
  });

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-end justify-between select-none md:opacity-80">
      {/* Directional pad */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5">
        {!horizontalOnly && (
          <button
            type="button"
            aria-label="Oldinga"
            {...bind('KeyW')}
            className="w-12 h-12 rounded-xl bg-slate-900/85 border border-slate-600/80 text-white active:bg-amber-500 active:text-slate-950 flex items-center justify-center cursor-pointer"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Chapga"
            {...bind('KeyA')}
            className="w-12 h-12 rounded-xl bg-slate-900/85 border border-slate-600/80 text-white active:bg-amber-500 active:text-slate-950 flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {!horizontalOnly && (
            <button
              type="button"
              aria-label="Orqaga"
              {...bind('KeyS')}
              className="w-12 h-12 rounded-xl bg-slate-900/85 border border-slate-600/80 text-white active:bg-amber-500 active:text-slate-950 flex items-center justify-center cursor-pointer"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            aria-label="O'ngga"
            {...bind('KeyD')}
            className="w-12 h-12 rounded-xl bg-slate-900/85 border border-slate-600/80 text-white active:bg-amber-500 active:text-slate-950 flex items-center justify-center cursor-pointer"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Action buttons */}
      {(actionLabel || secondaryLabel) && (
        <div className="pointer-events-auto flex items-center gap-2">
          {secondaryLabel && (
            <button
              type="button"
              {...bind(secondaryKey)}
              className="h-12 px-4 rounded-xl bg-sky-600/90 border border-sky-400/70 text-white font-display font-bold text-sm active:scale-95 cursor-pointer"
            >
              {secondaryLabel}
            </button>
          )}
          {actionLabel && (
            <button
              type="button"
              {...bind(actionKey)}
              className="h-14 px-5 rounded-xl bg-amber-500 border border-amber-300 text-slate-950 font-display font-extrabold text-sm active:scale-95 cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
