import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Volume2 } from 'lucide-react';
import {
  AnimalKind,
  buildFriendlyAnimal,
  buildStylizedTree,
  createParticleSystem,
} from '../../engine/models3D';
import {
  createContactShadow,
  createEngine,
  createGrassTexture,
  setupThreePointLighting,
} from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

interface AnimalInfo {
  id: AnimalKind;
  name: string;
  soundLabel: string;
}

const ANIMALS: AnimalInfo[] = [
  { id: 'mushuk', name: 'Mushuk', soundLabel: 'Miyov-miyov!' },
  { id: 'kuchuk', name: 'Kuchuk', soundLabel: 'Vov-vov!' },
  { id: 'sigir', name: 'Sigir', soundLabel: 'Muu-muu!' },
  { id: 'ordak', name: "O'rdak", soundLabel: 'G‘aq-g‘aq!' },
  { id: 'sher', name: 'Sher', soundLabel: 'Arr-arr!' },
  { id: 'quyon', name: 'Quyon', soundLabel: 'Sakrab yuradi!' },
];

const TOTAL_ROUNDS = 8;

function makeRound() {
  const options = [...ANIMALS].sort(() => Math.random() - 0.5).slice(0, 4);
  const target = options[Math.floor(Math.random() * options.length)];
  return { options, target };
}

export const HayvonlarniTani: React.FC<GameComponentProps> = ({
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
  const [roundData, setRoundData] = useState(() => makeRound());
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const scoreRef = useRef(0);
  const roundRef = useRef(1);
  const roundDataRef = useRef(roundData);
  roundDataRef.current = roundData;

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory };

  const rebuildRef = useRef<((opts: AnimalInfo[]) => void) | null>(null);
  const celebrateRef = useRef<((idx: number) => void) | null>(null);
  const hopRef = useRef<number[]>([0, 0, 0, 0]);

  const playTargetClue = (target: AnimalInfo) => {
    sound.playAnimal(target.id);
    window.setTimeout(() => {
      sound.speakUzbek(`${target.name} qani?`);
    }, 380);
  };

  const handleSelect = (animal: AnimalInfo, idx: number) => {
    if (pausedRef.current || feedback === 'correct') return;
    sound.playAnimal(animal.id);
    hopRef.current[idx] = 1;

    if (animal.id === roundDataRef.current.target.id) {
      scoreRef.current += 20;
      callbacksRef.current.onScoreChange(scoreRef.current);
      celebrateRef.current?.(idx);
      setFeedback('correct');
      window.setTimeout(() => sound.playSuccess(), 250);

      window.setTimeout(() => {
        if (roundRef.current >= TOTAL_ROUNDS) {
          callbacksRef.current.onVictory(
            scoreRef.current,
            `Barakalla! Barcha ${TOTAL_ROUNDS} ta hayvonni topdingiz!`
          );
          return;
        }
        roundRef.current += 1;
        setRound(roundRef.current);
        const next = makeRound();
        setRoundData(next);
        setFeedback('idle');
        rebuildRef.current?.(next.options);
        callbacksRef.current.onStatusChange?.(`Hayvon ${roundRef.current}/${TOTAL_ROUNDS}`);
      }, 1050);
    } else {
      setFeedback('wrong');
      window.setTimeout(() => sound.playError(), 220);
      window.setTimeout(() => setFeedback('idle'), 600);
    }
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Hayvon 1/${TOTAL_ROUNDS}`);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = createEngine(container, quality, {
      fov: 45,
      background: 0xbae6fd,
      fogColor: 0xbae6fd,
      fogNear: 20,
      fogFar: 55,
    });
    const { scene, camera, renderer } = engine;
    camera.position.set(0, 5.2, 12.2);
    camera.lookAt(0, 1.3, 0);

    setupThreePointLighting(scene, quality, {
      skyColor: 0xe0f2fe,
      groundColor: 0x22c55e,
      keyIntensity: 1.5,
    });

    // Meadow ground
    const grassTex = createGrassTexture(renderer, 12);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(36, 48),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Background trees framing the meadow
    const treeSpots: [number, number, number][] = [
      [-9, -6, 1.1],
      [-5.5, -8.5, 0.9],
      [0, -9.5, 1.2],
      [6, -8, 1.0],
      [9.5, -5.5, 1.15],
    ];
    treeSpots.forEach(([tx, tz, sc]) => {
      const t = buildStylizedTree(sc, 0x22c55e);
      t.position.set(tx, 0, tz);
      scene.add(t);
    });

    const particles = createParticleSystem(scene, 56);
    const animalsGroup = new THREE.Group();
    scene.add(animalsGroup);

    const slots: THREE.Group[] = [];
    const xs = [-4.5, -1.5, 1.5, 4.5];

    const rebuild = (opts: AnimalInfo[]) => {
      while (animalsGroup.children.length > 0) {
        animalsGroup.remove(animalsGroup.children[0]);
      }
      slots.length = 0;

      opts.forEach((a, i) => {
        const slot = new THREE.Group();
        slot.position.set(xs[i], 0, 0.4);

        const pad = new THREE.Mesh(
          new THREE.CylinderGeometry(1.15, 1.25, 0.2, 20),
          new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.7 })
        );
        pad.position.y = 0.1;
        pad.receiveShadow = true;
        pad.userData.animalIdx = i;
        slot.add(pad);

        const shadow = createContactShadow(1.05, 0.3);
        shadow.position.y = 0.22;
        slot.add(shadow);

        const model = buildFriendlyAnimal(a.id);
        model.position.y = 0.22;
        model.scale.setScalar(0.85);
        model.traverse((obj) => {
          obj.userData.animalIdx = i;
        });
        slot.add(model);
        slot.userData.model = model;

        animalsGroup.add(slot);
        slots.push(slot);
      });
    };

    rebuild(roundDataRef.current.options);
    rebuildRef.current = rebuild;
    celebrateRef.current = (idx) => {
      const slot = slots[idx];
      if (slot) {
        particles.spawn(new THREE.Vector3(slot.position.x, 1.9, slot.position.z), 0xfacc15, 22);
      }
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onPointerDown = (e: PointerEvent) => {
      if (pausedRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(animalsGroup.children, true);
      if (hits.length > 0) {
        const idx = hits[0].object.userData.animalIdx;
        if (typeof idx === 'number' && roundDataRef.current.options[idx]) {
          handleSelect(roundDataRef.current.options[idx], idx);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const stopLoop = engine.startLoop((dt, elapsed) => {
      slots.forEach((slot, i) => {
        const model = slot.userData.model as THREE.Group | undefined;
        if (!model) return;
        model.rotation.y = Math.sin(elapsed * 1.4 + i) * 0.35;
        if (hopRef.current[i] > 0) {
          hopRef.current[i] = Math.max(0, hopRef.current[i] - dt * 1.6);
          model.position.y = 0.22 + Math.sin(hopRef.current[i] * Math.PI) * 1.3;
          model.rotation.y += dt * 8;
        } else {
          model.position.y = 0.22 + Math.abs(Math.sin(elapsed * 2 + i)) * 0.08;
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

      <div className="pointer-events-none absolute top-4 inset-x-4 flex justify-center z-10">
        <div className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-950/88 border border-slate-700/80 text-white">
          <div className="text-left">
            <p className="text-xs text-emerald-400 font-semibold">
              Ovoz: {roundData.target.soundLabel}
            </p>
            <p className="font-display text-lg sm:text-2xl font-extrabold">
              {roundData.target.name}ni toping!
            </p>
          </div>
          <button
            type="button"
            onClick={() => playTargetClue(roundData.target)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            Ovozni eshit
          </button>
          <span className="text-xs font-mono-num text-slate-300">
            {round}/{TOTAL_ROUNDS}
          </span>
        </div>
      </div>

      {feedback !== 'idle' && (
        <div className="pointer-events-none absolute top-24 inset-x-0 flex justify-center z-10">
          <div
            className={`px-5 py-2 rounded-xl font-display font-bold text-base ${
              feedback === 'correct' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
            }`}
          >
            {feedback === 'correct'
              ? `Ofarin! Bu ${roundData.target.name}!`
              : 'Bu boshqa hayvon, yana urinib ko‘ring!'}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 inset-x-4 z-10 flex justify-center">
        <div className="flex flex-wrap justify-center gap-2.5 px-3 py-2.5 rounded-2xl bg-slate-950/85 border border-slate-700/80">
          {roundData.options.map((a, idx) => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleSelect(a, idx)}
              className="min-w-[100px] py-3 px-4 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white font-display font-bold text-sm sm:text-base transition-colors cursor-pointer"
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
