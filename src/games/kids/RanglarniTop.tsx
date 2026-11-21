import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Volume2 } from 'lucide-react';
import { createParticleSystem } from '../../engine/models3D';
import { createContactShadow, createEngine, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

interface ColorChoice {
  id: string;
  name: string;
  hex: number;
  css: string;
}

const COLORS: ColorChoice[] = [
  { id: 'qizil', name: 'Qizil', hex: 0xef4444, css: '#ef4444' },
  { id: 'kok', name: "Ko'k", hex: 0x3b82f6, css: '#3b82f6' },
  { id: 'yashil', name: 'Yashil', hex: 0x22c55e, css: '#22c55e' },
  { id: 'sariq', name: 'Sariq', hex: 0xfacc15, css: '#facc15' },
  { id: 'toqsariq', name: "To'q sariq", hex: 0xf97316, css: '#f97316' },
  { id: 'binafsha', name: 'Binafsha', hex: 0xa855f7, css: '#a855f7' },
];

const TOTAL_ROUNDS = 10;

function pickRound(): { options: ColorChoice[]; target: ColorChoice } {
  const shuffled = [...COLORS].sort(() => Math.random() - 0.5).slice(0, 4);
  const target = shuffled[Math.floor(Math.random() * shuffled.length)];
  return { options: shuffled, target };
}

export const RanglarniTop: React.FC<GameComponentProps> = ({
  quality,
  isPaused,
  onScoreChange,
  onStatusChange,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;

  const [round, setRound] = useState(1);
  const [roundData, setRoundData] = useState(() => pickRound());
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const scoreRef = useRef(0);
  const roundRef = useRef(1);
  const roundDataRef = useRef(roundData);
  roundDataRef.current = roundData;

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory };

  const rebuildToysRef = useRef<((opts: ColorChoice[]) => void) | null>(null);
  const burstRef = useRef<((index: number, hex: number) => void) | null>(null);
  const bounceRef = useRef<number[]>([0, 0, 0, 0]);

  const handleChoose = (choice: ColorChoice, idx: number) => {
    if (pausedRef.current || feedback === 'correct') return;
    if (choice.id === roundDataRef.current.target.id) {
      sound.playSuccess();
      sound.speakUzbek(`Barakalla! Bu ${choice.name} rang!`);
      scoreRef.current += 15;
      callbacksRef.current.onScoreChange(scoreRef.current);
      bounceRef.current[idx] = 1;
      burstRef.current?.(idx, choice.hex);
      setFeedback('correct');

      window.setTimeout(() => {
        if (roundRef.current >= TOTAL_ROUNDS) {
          callbacksRef.current.onVictory(
            scoreRef.current,
            `Ajoyib! Barcha ${TOTAL_ROUNDS} ta rangni bexato topdingiz!`
          );
          return;
        }
        roundRef.current += 1;
        setRound(roundRef.current);
        const next = pickRound();
        setRoundData(next);
        setFeedback('idle');
        rebuildToysRef.current?.(next.options);
        callbacksRef.current.onStatusChange?.(`Bosqich ${roundRef.current}/${TOTAL_ROUNDS}`);
      }, 900);
    } else {
      sound.playError();
      setFeedback('wrong');
      window.setTimeout(() => setFeedback('idle'), 550);
    }
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Bosqich 1/${TOTAL_ROUNDS}`);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = createEngine(container, quality, {
      fov: 46,
      background: 0xe0f2fe,
      fogColor: 0xe0f2fe,
      fogNear: 18,
      fogFar: 46,
    });
    const { scene, camera, renderer } = engine;
    camera.position.set(0, 5.5, 11.2);
    camera.lookAt(0, 1.2, 0);

    setupThreePointLighting(scene, quality, {
      skyColor: 0xfef3c7,
      groundColor: 0x86efac,
      keyIntensity: 1.4,
    });

    // Playful wooden floor & circular stage
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(16, 48),
      new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.78 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const stageRing = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.2, 0.35, 48),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.65 })
    );
    stageRing.position.y = 0.17;
    stageRing.receiveShadow = true;
    scene.add(stageRing);

    const particles = createParticleSystem(scene, 64);
    const toysGroup = new THREE.Group();
    scene.add(toysGroup);

    const toySlots: THREE.Group[] = [];
    const positions = [-4.2, -1.4, 1.4, 4.2];

    const buildToys = (opts: ColorChoice[]) => {
      while (toysGroup.children.length > 0) {
        toysGroup.remove(toysGroup.children[0]);
      }
      toySlots.length = 0;

      opts.forEach((opt, i) => {
        const slot = new THREE.Group();
        slot.position.set(positions[i], 0.36, 0);
        slot.userData.choiceIndex = i;

        // Pedestal
        const ped = new THREE.Mesh(
          new THREE.CylinderGeometry(1.05, 1.18, 0.35, 24),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 })
        );
        ped.position.y = 0.18;
        ped.receiveShadow = true;
        slot.add(ped);

        const shadow = createContactShadow(1.15, 0.25);
        shadow.position.y = 0.37;
        slot.add(shadow);

        // Composite 3D toy figure
        const mat = new THREE.MeshPhysicalMaterial({
          color: opt.hex,
          roughness: 0.22,
          metalness: 0.08,
          clearcoat: 0.85,
        });
        const accentMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.3,
        });

        const toy = new THREE.Group();
        toy.position.y = 0.42;

        if (i % 4 === 0) {
          // Stacked toy cube + dome cap
          const base = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.35, 1.35), mat);
          base.position.y = 0.68;
          base.castShadow = true;
          toy.add(base);
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 14), accentMat);
          cap.position.y = 1.5;
          toy.add(cap);
        } else if (i % 4 === 1) {
          // Friendly glossy sphere with ring belt
          const body = new THREE.Mesh(new THREE.SphereGeometry(0.82, 24, 20), mat);
          body.position.y = 0.86;
          body.castShadow = true;
          toy.add(body);
          const belt = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.1, 12, 28), accentMat);
          belt.rotation.x = Math.PI / 2;
          belt.position.y = 0.86;
          toy.add(belt);
        } else if (i % 4 === 2) {
          // Pyramid rocket toy
          const cone = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.7, 6), mat);
          cone.position.y = 0.88;
          cone.castShadow = true;
          toy.add(cone);
          const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.22, 16), accentMat);
          baseRing.position.y = 0.12;
          toy.add(baseRing);
        } else {
          // Double-tier cylinder star tower
          const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.82, 1.35, 20), mat);
          cyl.position.y = 0.68;
          cyl.castShadow = true;
          toy.add(cyl);
          const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), accentMat);
          star.position.y = 1.72;
          toy.add(star);
        }

        toy.traverse((child) => {
          child.userData.choiceIndex = i;
        });
        ped.userData.choiceIndex = i;

        slot.add(toy);
        slot.userData.toy = toy;
        toysGroup.add(slot);
        toySlots.push(slot);
      });
    };

    buildToys(roundDataRef.current.options);
    rebuildToysRef.current = buildToys;
    burstRef.current = (idx, hex) => {
      const slot = toySlots[idx];
      if (slot) {
        particles.spawn(new THREE.Vector3(slot.position.x, 1.8, slot.position.z), hex, 22);
      }
    };

    // Raycaster for direct 3D clicking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onPointerDown = (e: PointerEvent) => {
      if (pausedRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(toysGroup.children, true);
      if (hits.length > 0) {
        const idx = hits[0].object.userData.choiceIndex;
        if (typeof idx === 'number' && roundDataRef.current.options[idx]) {
          handleChoose(roundDataRef.current.options[idx], idx);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const stopLoop = engine.startLoop((dt, elapsed) => {
      toySlots.forEach((slot, i) => {
        const toy = slot.userData.toy as THREE.Group | undefined;
        if (!toy) return;
        toy.rotation.y += dt * (0.9 + i * 0.1);
        if (bounceRef.current[i] > 0) {
          bounceRef.current[i] = Math.max(0, bounceRef.current[i] - dt * 1.8);
          toy.position.y = 0.42 + Math.sin(bounceRef.current[i] * Math.PI) * 1.4;
          toy.scale.setScalar(1 + Math.sin(bounceRef.current[i] * Math.PI) * 0.25);
        } else {
          toy.position.y = 0.42 + Math.sin(elapsed * 2.2 + i) * 0.1;
          toy.scale.setScalar(1);
        }
      });
      particles.update(dt);
    }, pausedRef);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      stopLoop();
      engine.dispose();
    };
  }, [quality]);

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      {/* Top Prompt Banner */}
      <div className="pointer-events-none absolute top-4 inset-x-4 flex justify-center z-10">
        <div className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-950/88 border border-slate-700/80 text-white shadow-lg">
          <span
            className="w-6 h-6 rounded-lg border-2 border-white shrink-0"
            style={{ backgroundColor: roundData.target.css }}
          />
          <span className="font-display text-lg sm:text-2xl font-extrabold">
            {roundData.target.name} rangni toping!
          </span>
          <button
            type="button"
            onClick={() => sound.speakUzbek(`${roundData.target.name} rangni toping!`)}
            aria-label="Ovozli aytish"
            className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center cursor-pointer hover:bg-amber-400"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono-num text-slate-300 ml-1">
            {round}/{TOTAL_ROUNDS}
          </span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback !== 'idle' && (
        <div className="pointer-events-none absolute top-20 inset-x-0 flex justify-center z-10">
          <div
            className={`px-5 py-2 rounded-xl font-display font-bold text-base ${
              feedback === 'correct'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-rose-500 text-white'
            }`}
          >
            {feedback === 'correct' ? 'Barakalla! To‘g‘ri topdingiz!' : 'Yana bir urinib ko‘ring!'}
          </div>
        </div>
      )}

      {/* Large Child-Friendly Bottom Color Buttons */}
      <div className="absolute bottom-4 inset-x-4 z-10 flex justify-center">
        <div className="flex flex-wrap justify-center gap-2.5 px-3 py-2.5 rounded-2xl bg-slate-950/85 border border-slate-700/80">
          {roundData.options.map((opt, idx) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleChoose(opt, idx)}
              className="min-w-[96px] sm:min-w-[118px] py-3 px-4 rounded-xl font-display font-bold text-sm sm:text-base text-white border-2 border-white/25 hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-sm"
              style={{ backgroundColor: opt.css }}
            >
              {opt.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
