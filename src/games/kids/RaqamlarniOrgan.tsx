import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Volume2 } from 'lucide-react';
import { createParticleSystem } from '../../engine/models3D';
import { createEngine, createLabelTexture, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

const TOTAL_ROUNDS = 8;

interface CountRound {
  count: number;
  choices: number[];
  itemName: string;
  itemColor: number;
}

const ITEMS = [
  { name: 'yulduzcha', color: 0xfacc15 },
  { name: 'shar', color: 0xef4444 },
  { name: 'kubik', color: 0x3b82f6 },
  { name: 'olmos', color: 0x10b981 },
];

function createRound(roundNum: number): CountRound {
  const maxN = Math.min(9, 3 + roundNum);
  const count = 1 + Math.floor(Math.random() * maxN);
  const set = new Set<number>([count]);
  while (set.size < 4) {
    const cand = Math.max(1, Math.min(10, count + Math.floor(Math.random() * 5) - 2));
    set.add(cand);
  }
  const item = ITEMS[roundNum % ITEMS.length];
  return {
    count,
    choices: Array.from(set).sort((a, b) => a - b),
    itemName: item.name,
    itemColor: item.color,
  };
}

export const RaqamlarniOrgan: React.FC<GameComponentProps> = ({
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
  const [data, setData] = useState<CountRound>(() => createRound(1));
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const scoreRef = useRef(0);
  const roundRef = useRef(1);
  const dataRef = useRef(data);
  dataRef.current = data;

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory };

  const rebuildRef = useRef<((d: CountRound) => void) | null>(null);
  const burstRef = useRef<(() => void) | null>(null);

  const handleAnswer = (num: number) => {
    if (pausedRef.current || feedback === 'correct') return;
    if (num === dataRef.current.count) {
      sound.playSuccess();
      sound.speakUzbek(`To‘g‘ri! ${num} ta!`);
      scoreRef.current += 15;
      callbacksRef.current.onScoreChange(scoreRef.current);
      burstRef.current?.();
      setFeedback('correct');

      window.setTimeout(() => {
        if (roundRef.current >= TOTAL_ROUNDS) {
          callbacksRef.current.onVictory(
            scoreRef.current,
            `Ofarin! Barcha ${TOTAL_ROUNDS} ta sanash topshirig‘ini bajardingiz!`
          );
          return;
        }
        roundRef.current += 1;
        setRound(roundRef.current);
        const next = createRound(roundRef.current);
        setData(next);
        setFeedback('idle');
        rebuildRef.current?.(next);
        callbacksRef.current.onStatusChange?.(`Mashq ${roundRef.current}/${TOTAL_ROUNDS}`);
      }, 950);
    } else {
      sound.playError();
      setFeedback('wrong');
      window.setTimeout(() => setFeedback('idle'), 550);
    }
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Mashq 1/${TOTAL_ROUNDS}`);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = createEngine(container, quality, {
      fov: 46,
      background: 0xf5f3ff,
      fogColor: 0xf5f3ff,
      fogNear: 20,
      fogFar: 55,
    });
    const { scene, camera, renderer } = engine;
    camera.position.set(0, 5.4, 11.4);
    camera.lookAt(0, 1.3, 0);

    setupThreePointLighting(scene, quality, {
      skyColor: 0xede9fe,
      groundColor: 0xddd6fe,
      keyIntensity: 1.4,
    });

    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 7.6, 0.4, 40),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    );
    stage.position.y = -0.2;
    stage.receiveShadow = true;
    scene.add(stage);

    const particles = createParticleSystem(scene, 64);
    const itemsGroup = new THREE.Group();
    const blocksGroup = new THREE.Group();
    scene.add(itemsGroup, blocksGroup);

    const blockColors = ['#f43f5e', '#f59e0b', '#10b981', '#8b5cf6'];

    const rebuild = (d: CountRound) => {
      while (itemsGroup.children.length > 0) itemsGroup.remove(itemsGroup.children[0]);
      while (blocksGroup.children.length > 0) blocksGroup.remove(blocksGroup.children[0]);

      // Countable 3D objects arranged neatly in arc/rows
      const cols = Math.min(5, d.count);
      const rows = Math.ceil(d.count / 5);
      const itemMat = new THREE.MeshPhysicalMaterial({
        color: d.itemColor,
        roughness: 0.22,
        metalness: 0.15,
        clearcoat: 0.85,
      });

      for (let i = 0; i < d.count; i++) {
        const r = Math.floor(i / 5);
        const c = i % 5;
        const rowLen = r === rows - 1 ? d.count - r * 5 : cols;
        const x = (c - (rowLen - 1) / 2) * 1.75;
        const z = -1.6 + r * 1.6;
        const geo =
          d.itemName === 'shar'
            ? new THREE.SphereGeometry(0.55, 20, 16)
            : d.itemName === 'kubik'
            ? new THREE.BoxGeometry(0.95, 0.95, 0.95)
            : new THREE.OctahedronGeometry(0.62, 0);
        const mesh = new THREE.Mesh(geo, itemMat);
        mesh.position.set(x, 1.45, z);
        mesh.castShadow = true;
        itemsGroup.add(mesh);
      }

      // Clickable 3D Numbered Blocks at front
      d.choices.forEach((num, idx) => {
        const x = (idx - 1.5) * 2.45;
        const tex = createLabelTexture(renderer, String(num), blockColors[idx % blockColors.length]);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 });
        const cube = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.45, 1.45), mat);
        cube.position.set(x, 0.78, 3.0);
        cube.castShadow = true;
        cube.userData.choiceNum = num;
        blocksGroup.add(cube);
      });
    };

    rebuild(dataRef.current);
    rebuildRef.current = rebuild;
    burstRef.current = () => {
      particles.spawn(new THREE.Vector3(0, 2.2, 0), 0xfacc15, 26);
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onPointerDown = (e: PointerEvent) => {
      if (pausedRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(blocksGroup.children, true);
      if (hits.length > 0 && typeof hits[0].object.userData.choiceNum === 'number') {
        handleAnswer(hits[0].object.userData.choiceNum);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const stopLoop = engine.startLoop((dt, elapsed) => {
      itemsGroup.children.forEach((obj, i) => {
        obj.rotation.y += dt * 1.4;
        obj.position.y = 1.45 + Math.sin(elapsed * 2.5 + i * 0.6) * 0.18;
      });
      blocksGroup.children.forEach((obj, i) => {
        obj.rotation.y = Math.sin(elapsed * 1.6 + i) * 0.22;
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

      <div className="pointer-events-none absolute top-4 inset-x-4 flex justify-center z-10">
        <div className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-950/88 border border-slate-700/80 text-white">
          <span className="font-display text-lg sm:text-2xl font-extrabold">
            Nechta {data.itemName} bor?
          </span>
          <button
            type="button"
            onClick={() => sound.speakUzbek(`Nechta ${data.itemName} bor? Sanab ko‘ring!`)}
            className="w-9 h-9 rounded-xl bg-violet-500 text-white flex items-center justify-center cursor-pointer hover:bg-violet-400"
            aria-label="Ovozli o'qish"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono-num text-slate-300">
            {round}/{TOTAL_ROUNDS}
          </span>
        </div>
      </div>

      {feedback !== 'idle' && (
        <div className="pointer-events-none absolute top-20 inset-x-0 flex justify-center z-10">
          <div
            className={`px-5 py-2 rounded-xl font-display font-bold text-base ${
              feedback === 'correct' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
            }`}
          >
            {feedback === 'correct' ? `Zo‘r! Jami ${data.count} ta!` : 'Qaytadan sanab ko‘ring!'}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 inset-x-4 z-10 flex justify-center">
        <div className="flex flex-wrap justify-center gap-2.5 px-3 py-2.5 rounded-2xl bg-slate-950/85 border border-slate-700/80">
          {data.choices.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleAnswer(n)}
              className="w-16 h-14 rounded-xl bg-violet-600 hover:bg-amber-400 hover:text-slate-950 text-white font-display font-extrabold text-2xl transition-colors cursor-pointer"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
