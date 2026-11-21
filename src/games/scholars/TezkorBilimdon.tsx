import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createParticleSystem } from '../../engine/models3D';
import { createEngine, createLabelTexture, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

interface QuizQ {
  subject: string;
  question: string;
  options: [string, string, string, string];
  correctIdx: number;
}

const QUIZ_POOL: QuizQ[] = [
  {
    subject: 'Koinot',
    question: 'Quyosh tizimidagi eng katta sayyora qaysi?',
    options: ['Mars', 'Yupiter', 'Venera', 'Merkuriy'],
    correctIdx: 1,
  },
  {
    subject: 'Geografiya',
    question: 'O‘zbekistonning poytaxti qaysi shahar?',
    options: ['Samarqand', 'Buxoro', 'Toshkent', 'Xiva'],
    correctIdx: 2,
  },
  {
    subject: 'Tabiat',
    question: 'Suv necha gradusda muzlaydi?',
    options: ['0 °C', '10 °C', '100 °C', '50 °C'],
    correctIdx: 0,
  },
  {
    subject: 'Hayvonot',
    question: 'Quruqlikdagi eng tez yuguruvchi hayvon qaysi?',
    options: ['Sher', 'Gepard', 'Ot', 'Bo‘ri'],
    correctIdx: 1,
  },
  {
    subject: 'Matematika',
    question: 'Bir soatda necha daqiqa bor?',
    options: ['30', '45', '60', '100'],
    correctIdx: 2,
  },
  {
    subject: 'Koinot',
    question: 'Yerga eng yaqin yulduz qaysi?',
    options: ['Oy', 'Quyosh', 'Mars', 'Saturn'],
    correctIdx: 1,
  },
  {
    subject: 'Tarix',
    question: 'Registon maydoni qaysi qadimiy shaharda joylashgan?',
    options: ['Samarqand', 'Farg‘ona', 'Termiz', 'Nukus'],
    correctIdx: 0,
  },
  {
    subject: 'Tabiat',
    question: 'O‘simliklar havoga qaysi foydali gazni chiqaradi?',
    options: ['Azot', 'Kislorod', 'Heliy', 'Argon'],
    correctIdx: 1,
  },
  {
    subject: 'Geografiya',
    question: 'Dunyodagi eng katta okean qaysi?',
    options: ['Atlantika', 'Hind', 'Tinch okeani', 'Shimoliy Muz'],
    correctIdx: 2,
  },
  {
    subject: 'Mantiq',
    question: 'Bir yilda nechta fasl bor?',
    options: ['3 ta', '4 ta', '5 ta', '12 ta'],
    correctIdx: 1,
  },
];

const LETTERS = ['A', 'B', 'C', 'D'];
const PILLAR_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

export const TezkorBilimdon: React.FC<GameComponentProps> = ({
  quality,
  isPaused,
  onScoreChange,
  onStatusChange,
  onGameOver,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;

  const [questions] = useState(() => [...QUIZ_POOL].sort(() => Math.random() - 0.5).slice(0, 8));
  const [qIdx, setQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [streak, setStreak] = useState(0);
  const [resultBanner, setResultBanner] = useState<'none' | 'correct' | 'wrong'>('none');

  const qIdxRef = useRef(0);
  const scoreRef = useRef(0);
  const correctCountRef = useRef(0);
  const streakRef = useRef(0);
  const lockedRef = useRef(false);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onGameOver, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onGameOver, onVictory };

  const highlightPillarRef = useRef<((idx: number, ok: boolean) => void) | null>(null);

  const advanceQuestion = () => {
    if (qIdxRef.current + 1 >= questions.length) {
      if (correctCountRef.current >= 4) {
        callbacksRef.current.onVictory(
          scoreRef.current,
          `Zo‘r natija! ${questions.length} ta savoldan ${correctCountRef.current} tasiga to‘g‘ri javob berdingiz!`
        );
      } else {
        callbacksRef.current.onGameOver(
          scoreRef.current,
          `${questions.length} ta savoldan ${correctCountRef.current} tasi to‘g‘ri. Yana urinib ko‘ring!`
        );
      }
      return;
    }
    qIdxRef.current += 1;
    setQIdx(qIdxRef.current);
    setTimeLeft(15);
    setResultBanner('none');
    lockedRef.current = false;
    callbacksRef.current.onStatusChange?.(`Savol ${qIdxRef.current + 1}/${questions.length}`);
  };

  const submitAnswer = (choiceIdx: number) => {
    if (pausedRef.current || lockedRef.current) return;
    lockedRef.current = true;
    const currentQ = questions[qIdxRef.current];
    const ok = choiceIdx === currentQ.correctIdx;

    highlightPillarRef.current?.(choiceIdx, ok);

    if (ok) {
      sound.playSuccess();
      correctCountRef.current += 1;
      streakRef.current += 1;
      setStreak(streakRef.current);
      const pts = 20 + Math.min(20, streakRef.current * 5);
      scoreRef.current += pts;
      callbacksRef.current.onScoreChange(scoreRef.current);
      setResultBanner('correct');
    } else {
      sound.playError();
      streakRef.current = 0;
      setStreak(0);
      setResultBanner('wrong');
    }

    window.setTimeout(advanceQuestion, 1000);
  };

  // Countdown timer
  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Savol 1/${questions.length}`);
    const interval = window.setInterval(() => {
      if (pausedRef.current || lockedRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) {
          lockedRef.current = true;
          sound.playError();
          streakRef.current = 0;
          setStreak(0);
          setResultBanner('wrong');
          window.setTimeout(advanceQuestion, 900);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Keyboard A/B/C/D shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pausedRef.current || lockedRef.current) return;
      const map: Record<string, number> = { KeyA: 0, KeyB: 1, KeyC: 2, KeyD: 3, Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
      if (map[e.code] !== undefined) submitAnswer(map[e.code]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = createEngine(container, quality, {
      fov: 48,
      background: 0x0f172a,
      fogColor: 0x0f172a,
      fogNear: 18,
      fogFar: 55,
    });
    const { scene, camera, renderer } = engine;
    camera.position.set(0, 5.2, 11.4);
    camera.lookAt(0, 1.5, 0);

    setupThreePointLighting(scene, quality, {
      skyColor: 0x818cf8,
      groundColor: 0x1e1b4b,
      keyIntensity: 1.4,
    });

    // Glossy TV Quiz Arena Stage
    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 9.2, 0.5, 48),
      new THREE.MeshPhysicalMaterial({ color: 0x1e1b4b, roughness: 0.25, metalness: 0.45, clearcoat: 0.8 })
    );
    stage.position.y = -0.25;
    stage.receiveShadow = true;
    scene.add(stage);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(8.5, 0.14, 12, 64),
      new THREE.MeshStandardMaterial({ color: 0x6366f1, emissive: 0x4f46e5, emissiveIntensity: 1.4 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    scene.add(ring);

    const particles = createParticleSystem(scene, 72);
    const pillarsGroup = new THREE.Group();
    scene.add(pillarsGroup);

    const pillars: { group: THREE.Group; baseHeight: number; pulse: number }[] = [];
    const xs = [-4.2, -1.4, 1.4, 4.2];

    LETTERS.forEach((letter, i) => {
      const g = new THREE.Group();
      g.position.set(xs[i], 0, 0.5);

      const tex = createLabelTexture(renderer, letter, PILLAR_COLORS[i], '#ffffff');
      const col = new THREE.Mesh(
        new THREE.BoxGeometry(1.85, 2.8, 1.85),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.28, metalness: 0.2 })
      );
      col.position.y = 1.4;
      col.castShadow = true;
      col.userData.pillarIdx = i;
      g.add(col);

      const topOrb = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshStandardMaterial({
          color: PILLAR_COLORS[i],
          emissive: PILLAR_COLORS[i],
          emissiveIntensity: 0.9,
        })
      );
      topOrb.position.y = 3.35;
      topOrb.userData.pillarIdx = i;
      g.add(topOrb);

      pillarsGroup.add(g);
      pillars.push({ group: g, baseHeight: 0, pulse: 0 });
    });

    highlightPillarRef.current = (idx, ok) => {
      if (pillars[idx]) {
        pillars[idx].pulse = 1;
        particles.spawn(
          new THREE.Vector3(xs[idx], 3.2, 0.5),
          ok ? 0x34d399 : 0xf43f5e,
          24
        );
      }
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onPointerDown = (e: PointerEvent) => {
      if (pausedRef.current || lockedRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(pillarsGroup.children, true);
      if (hits.length > 0 && typeof hits[0].object.userData.pillarIdx === 'number') {
        submitAnswer(hits[0].object.userData.pillarIdx);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const stopLoop = engine.startLoop((dt, elapsed) => {
      pillars.forEach((p, i) => {
        const orb = p.group.children[1];
        if (orb) {
          orb.rotation.y += dt * 1.8;
          orb.position.y = 3.35 + Math.sin(elapsed * 2.5 + i) * 0.16;
        }
        if (p.pulse > 0) {
          p.pulse = Math.max(0, p.pulse - dt * 1.8);
          p.group.position.y = Math.sin(p.pulse * Math.PI) * 0.8;
        }
      });
      camera.position.x = Math.sin(elapsed * 0.35) * 1.4;
      camera.lookAt(0, 1.5, 0);
      particles.update(dt);
    }, pausedRef);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      stopLoop();
      engine.dispose();
    };
  }, [quality]);

  const currentQ = questions[qIdx];

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      {/* Question Card */}
      <div className="pointer-events-none absolute top-4 inset-x-4 flex justify-center z-10">
        <div className="max-w-2xl w-full px-5 py-4 rounded-2xl bg-slate-950/90 border border-indigo-500/50 text-white space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono-num">
            <span className="text-indigo-300 font-semibold">
              {currentQ.subject} · Savol {qIdx + 1}/{questions.length}
            </span>
            <span className={timeLeft <= 5 ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
              Vaqt: {timeLeft}s · Seriya: {streak}x
            </span>
          </div>
          <p className="font-display text-lg sm:text-2xl font-extrabold leading-snug">
            {currentQ.question}
          </p>
        </div>
      </div>

      {resultBanner !== 'none' && (
        <div className="pointer-events-none absolute top-32 inset-x-0 flex justify-center z-10">
          <div
            className={`px-5 py-2 rounded-xl font-display font-bold text-base ${
              resultBanner === 'correct' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
            }`}
          >
            {resultBanner === 'correct'
              ? 'To‘g‘ri javob! Barakalla!'
              : `To‘g‘ri javob: ${currentQ.options[currentQ.correctIdx]}`}
          </div>
        </div>
      )}

      {/* Answer Options Dock */}
      <div className="absolute bottom-4 inset-x-4 z-10 flex justify-center">
        <div className="max-w-2xl w-full grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-950/88 border border-slate-700/80">
          {currentQ.options.map((opt, idx) => (
            <button
              key={`${qIdx}-${idx}`}
              type="button"
              onClick={() => submitAnswer(idx)}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white font-display font-bold text-sm sm:text-base text-left flex items-center gap-3 transition-colors cursor-pointer"
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                style={{ backgroundColor: PILLAR_COLORS[idx] }}
              >
                {LETTERS[idx]}
              </span>
              <span className="truncate">{opt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
