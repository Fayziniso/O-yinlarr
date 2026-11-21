import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Heart } from 'lucide-react';
import { buildCharacter, createParticleSystem } from '../../engine/models3D';
import { createEngine, createLabelTexture, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

const TOTAL_STEPS = 12;

interface MathQuestion {
  prompt: string;
  answer: number;
  options: number[];
}

function generateQuestion(step: number): MathQuestion {
  const mode = step <= 4 ? '+' : step <= 8 ? (Math.random() > 0.45 ? '-' : '+') : '×';
  let a = 0;
  let b = 0;
  let answer = 0;

  if (mode === '+') {
    a = 3 + Math.floor(Math.random() * (8 + step * 2));
    b = 2 + Math.floor(Math.random() * (7 + step * 2));
    answer = a + b;
  } else if (mode === '-') {
    a = 10 + Math.floor(Math.random() * (12 + step * 2));
    b = 2 + Math.floor(Math.random() * (a - 2));
    answer = a - b;
  } else {
    a = 2 + Math.floor(Math.random() * 8);
    b = 2 + Math.floor(Math.random() * 8);
    answer = a * b;
  }

  const opts = new Set<number>([answer]);
  while (opts.size < 3) {
    const delta = (Math.floor(Math.random() * 7) - 3) || 2;
    const cand = Math.max(0, answer + delta);
    opts.add(cand);
  }
  return {
    prompt: `${a} ${mode} ${b} = ?`,
    answer,
    options: Array.from(opts).sort(() => Math.random() - 0.5),
  };
}

export const MatematikaUstasi: React.FC<GameComponentProps> = ({
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

  const [step, setStep] = useState(1);
  const [hearts, setHearts] = useState(3);
  const [streak, setStreak] = useState(0);
  const [question, setQuestion] = useState<MathQuestion>(() => generateQuestion(1));
  const [flash, setFlash] = useState<'none' | 'ok' | 'bad'>('none');

  const stepRef = useRef(1);
  const heartsRef = useRef(3);
  const streakRef = useRef(0);
  const scoreRef = useRef(0);
  const questionRef = useRef(question);
  questionRef.current = question;
  const busyRef = useRef(false);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onGameOver, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory, onGameOver };

  const rebuildPortalsRef = useRef<((q: MathQuestion, stepIdx: number) => void) | null>(null);
  const leapPlayerRef = useRef<((laneIdx: number, success: boolean) => void) | null>(null);

  const chooseOption = (optVal: number, idx: number) => {
    if (pausedRef.current || busyRef.current) return;
    busyRef.current = true;

    if (optVal === questionRef.current.answer) {
      sound.playSuccess();
      streakRef.current += 1;
      setStreak(streakRef.current);
      const pts = 15 + Math.min(15, streakRef.current * 3);
      scoreRef.current += pts;
      callbacksRef.current.onScoreChange(scoreRef.current);
      setFlash('ok');
      leapPlayerRef.current?.(idx, true);

      window.setTimeout(() => {
        if (stepRef.current >= TOTAL_STEPS) {
          callbacksRef.current.onVictory(
            scoreRef.current,
            `Tabriklaymiz! Barcha ${TOTAL_STEPS} ta matematik ko‘prik bosqichidan o‘tdingiz!`
          );
          return;
        }
        stepRef.current += 1;
        setStep(stepRef.current);
        const nextQ = generateQuestion(stepRef.current);
        setQuestion(nextQ);
        setFlash('none');
        rebuildPortalsRef.current?.(nextQ, stepRef.current);
        callbacksRef.current.onStatusChange?.(`Qadam ${stepRef.current}/${TOTAL_STEPS}`);
        busyRef.current = false;
      }, 700);
    } else {
      sound.playError();
      streakRef.current = 0;
      setStreak(0);
      heartsRef.current -= 1;
      setHearts(heartsRef.current);
      setFlash('bad');
      leapPlayerRef.current?.(idx, false);

      window.setTimeout(() => {
        setFlash('none');
        if (heartsRef.current <= 0) {
          callbacksRef.current.onGameOver(
            scoreRef.current,
            `Urinishlar tugadi. Siz ${stepRef.current - 1} ta misolni to‘g‘ri yechdingiz!`
          );
          return;
        }
        busyRef.current = false;
      }, 600);
    }
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Qadam 1/${TOTAL_STEPS}`);
    const onKey = (e: KeyboardEvent) => {
      if (pausedRef.current) return;
      if (e.key === '1' && questionRef.current.options[0] !== undefined) {
        chooseOption(questionRef.current.options[0], 0);
      } else if (e.key === '2' && questionRef.current.options[1] !== undefined) {
        chooseOption(questionRef.current.options[1], 1);
      } else if (e.key === '3' && questionRef.current.options[2] !== undefined) {
        chooseOption(questionRef.current.options[2], 2);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = createEngine(container, quality, {
      fov: 50,
      background: 0x0c4a6e,
      fogColor: 0x0c4a6e,
      fogNear: 16,
      fogFar: 58,
    });
    const { scene, camera, renderer } = engine;

    setupThreePointLighting(scene, quality, {
      skyColor: 0xbae6fd,
      groundColor: 0x064e3b,
      keyIntensity: 1.5,
    });

    // River plane below
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 180),
      new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        roughness: 0.18,
        metalness: 0.25,
        clearcoat: 0.9,
      })
    );
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, -1.8, -36);
    scene.add(river);

    // Bridge deck tiles (14 rows forward along -Z)
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.5 });
    for (let i = 0; i <= TOTAL_STEPS + 1; i++) {
      const z = -i * 6;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.6, 5.6), bridgeMat);
      slab.position.set(0, -0.3, z);
      slab.receiveShadow = true;
      scene.add(slab);
      for (const rx of [-4.65, 4.65]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.2, 8), railMat);
        post.position.set(rx, 0.6, z);
        scene.add(post);
      }
    }

    // Golden treasure arch at the end
    const endArch = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.35, 12, 32, Math.PI),
      new THREE.MeshPhysicalMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.18 })
    );
    endArch.position.set(0, 0.2, -(TOTAL_STEPS + 1) * 6);
    scene.add(endArch);

    // Explorer character
    const player = buildCharacter(0x10b981, 0x0f172a);
    player.position.set(0, 0, 1.5);
    player.rotation.y = Math.PI;
    scene.add(player);

    const particles = createParticleSystem(scene, 64);
    const portalsGroup = new THREE.Group();
    scene.add(portalsGroup);

    const laneXs = [-3.0, 0, 3.0];
    const portalColors = ['#0ea5e9', '#10b981', '#f59e0b'];

    let playerTargetPos = new THREE.Vector3(0, 0, 1.5);
    let jumpAnim = 0;
    let shakeTime = 0;

    const rebuildPortals = (q: MathQuestion, currentStep: number) => {
      while (portalsGroup.children.length > 0) portalsGroup.remove(portalsGroup.children[0]);
      const z = -currentStep * 6;

      q.options.forEach((val, idx) => {
        const tex = createLabelTexture(renderer, String(val), portalColors[idx % 3], '#ffffff', `${idx + 1}-tugma`);
        const gate = new THREE.Group();
        gate.position.set(laneXs[idx], 0, z);

        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(2.3, 2.7, 0.36),
          new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.15 })
        );
        frame.position.y = 1.45;
        frame.castShadow = true;
        frame.userData.optIdx = idx;
        frame.userData.optVal = val;
        gate.add(frame);

        portalsGroup.add(gate);
      });
    };

    rebuildPortals(questionRef.current, 1);
    rebuildPortalsRef.current = rebuildPortals;

    leapPlayerRef.current = (laneIdx, success) => {
      if (success) {
        const z = -stepRef.current * 6 + 1.2;
        playerTargetPos.set(laneXs[laneIdx], 0, z);
        jumpAnim = 1;
        particles.spawn(new THREE.Vector3(laneXs[laneIdx], 1.6, z - 1.2), 0x34d399, 20);
      } else {
        shakeTime = 0.45;
      }
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onPointerDown = (e: PointerEvent) => {
      if (pausedRef.current || busyRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(portalsGroup.children, true);
      if (hits.length > 0 && typeof hits[0].object.userData.optIdx === 'number') {
        chooseOption(hits[0].object.userData.optVal, hits[0].object.userData.optIdx);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    camera.position.set(0, 5.4, 8.2);
    camera.lookAt(0, 1.2, -5);

    const stopLoop = engine.startLoop((dt, elapsed) => {
      player.position.x = THREE.MathUtils.damp(player.position.x, playerTargetPos.x, 7, dt);
      player.position.z = THREE.MathUtils.damp(player.position.z, playerTargetPos.z, 7, dt);
      if (jumpAnim > 0) {
        jumpAnim = Math.max(0, jumpAnim - dt * 2.2);
        player.position.y = Math.sin(jumpAnim * Math.PI) * 1.6;
      } else {
        player.position.y = 0;
      }

      if (shakeTime > 0) shakeTime = Math.max(0, shakeTime - dt);
      const shakeX = shakeTime > 0 ? Math.sin(elapsed * 55) * 0.25 : 0;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x * 0.35 + shakeX, 5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, player.position.z + 7.2, 5, dt);
      camera.position.y = 5.2;
      camera.lookAt(player.position.x * 0.2, 1.35, player.position.z - 6.5);

      portalsGroup.children.forEach((g, i) => {
        g.position.y = Math.sin(elapsed * 2.4 + i) * 0.1;
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

      {/* Top HUD */}
      <div className="pointer-events-none absolute top-4 inset-x-4 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="px-4 py-2 rounded-xl bg-slate-950/85 border border-slate-700/80 text-white flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              className={`w-5 h-5 ${i < hearts ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`}
            />
          ))}
          <span className="ml-2 text-xs font-mono-num text-slate-300">
            Qadam {step}/{TOTAL_STEPS}
          </span>
        </div>

        <div
          className={`px-6 py-3 rounded-2xl border text-white font-display font-extrabold text-2xl sm:text-3xl font-mono-num transition-colors ${
            flash === 'ok'
              ? 'bg-emerald-600 border-emerald-300'
              : flash === 'bad'
              ? 'bg-rose-600 border-rose-300'
              : 'bg-slate-950/90 border-emerald-500/50'
          }`}
        >
          {question.prompt}
        </div>

        <div className="px-4 py-2 rounded-xl bg-slate-950/85 border border-slate-700/80 text-amber-400 text-xs font-mono-num font-bold">
          Seriya: {streak}x
        </div>
      </div>

      {/* Bottom Choice Buttons */}
      <div className="absolute bottom-4 inset-x-4 z-10 flex justify-center">
        <div className="flex gap-3 px-3.5 py-2.5 rounded-2xl bg-slate-950/85 border border-slate-700/80">
          {question.options.map((opt, idx) => (
            <button
              key={`${step}-${idx}-${opt}`}
              type="button"
              onClick={() => chooseOption(opt, idx)}
              className="min-w-[88px] sm:min-w-[108px] py-3 px-4 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white font-display font-mono-num font-extrabold text-xl transition-colors cursor-pointer"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
