import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createParticleSystem } from '../../engine/models3D';
import { createEngine, createWoodFloorTexture, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

const MATCH_SECONDS = 60;

export const BasketballChallenge: React.FC<GameComponentProps> = ({
  quality,
  isPaused,
  onScoreChange,
  onStatusChange,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;
  const keysRef = useRef<Record<string, boolean>>({});

  const [timeLeft, setTimeLeft] = useState(MATCH_SECONDS);
  const [power, setPower] = useState(0);
  const [aimDeg, setAimDeg] = useState(0);
  const [streak, setStreak] = useState(0);
  const [shotMsg, setShotMsg] = useState('Nishonni to‘g‘rilab Space yoki "OTISH" tugmasini bosib turing!');

  const aimRef = useRef(0);
  const chargingRef = useRef(false);
  const powerRef = useRef(0);
  const releaseTriggerRef = useRef(false);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory };

  const startCharge = () => {
    if (pausedRef.current) return;
    chargingRef.current = true;
  };
  const endCharge = () => {
    if (!chargingRef.current) return;
    chargingRef.current = false;
    releaseTriggerRef.current = true;
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Vaqt: ${MATCH_SECONDS}s`);
    const onDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Space' && !e.repeat) startCharge();
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      if (e.code === 'Space') endCharge();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = createEngine(container, quality, {
      fov: 50,
      background: 0x1c1917,
      fogColor: 0x1c1917,
      fogNear: 24,
      fogFar: 75,
    });
    const { scene, camera, renderer } = engine;
    camera.position.set(0, 4.3, 10.6);
    camera.lookAt(0, 3.2, -5.5);

    setupThreePointLighting(scene, quality, {
      skyColor: 0xfdba74,
      groundColor: 0x451a03,
      keyIntensity: 1.6,
    });

    // Hardwood Basketball Court
    const woodTex = createWoodFloorTexture(renderer, 5);
    const court = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 28),
      new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.45 })
    );
    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    scene.add(court);

    // Three-point arc line
    const arcLine = new THREE.Mesh(
      new THREE.RingGeometry(5.8, 6.0, 36, 1, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    arcLine.rotation.x = -Math.PI / 2;
    arcLine.position.set(0, 0.02, -5.8);
    scene.add(arcLine);

    // Basketball Hoop Assembly (pole + backboard + rim + net)
    const hoopZ = -6.2;
    const rimY = 3.85;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 4.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 })
    );
    pole.position.set(0, 2.3, hoopZ - 1.2);
    pole.castShadow = true;
    scene.add(pole);

    const backboard = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.0, 0.14),
      new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.2, clearcoat: 0.8 })
    );
    backboard.position.set(0, 4.5, hoopZ - 0.72);
    backboard.castShadow = true;
    scene.add(backboard);

    const targetBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.85, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true })
    );
    targetBox.position.set(0, 4.25, hoopZ - 0.7);
    scene.add(targetBox);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.06, 12, 28),
      new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.6, roughness: 0.25 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, rimY, hoopZ);
    scene.add(rim);

    const net = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.36, 0.85, 14, 4, true),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc, wireframe: true })
    );
    net.position.set(0, rimY - 0.44, hoopZ);
    scene.add(net);

    // Basketball
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.55 })
    );
    ball.castShadow = true;
    scene.add(ball);

    // Aim trajectory preview dots
    const dotGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const aimDots: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      const d = new THREE.Mesh(dotGeo, dotMat);
      scene.add(d);
      aimDots.push(d);
    }

    const particles = createParticleSystem(scene, 64);

    let ballState: 'ready' | 'flying' = 'ready';
    const ballVel = new THREE.Vector3();
    let ballStart = new THREE.Vector3(0, 1.5, 4.2);
    let scoredThisShot = false;
    let shotTimer = 0;
    let score = 0;
    let curStreak = 0;
    let remainingTime = MATCH_SECONDS;
    let ended = false;
    let powerDir = 1;

    const resetBall = () => {
      ballState = 'ready';
      scoredThisShot = false;
      shotTimer = 0;
      const randX = (Math.random() - 0.5) * 3.8;
      ballStart.set(randX, 1.5, 4.2);
      ball.position.copy(ballStart);
      powerRef.current = 0;
      setPower(0);
    };
    resetBall();

    const stopLoop = engine.startLoop((dt) => {
      if (ended) return;

      // Match countdown
      remainingTime = Math.max(0, remainingTime - dt);
      const secInt = Math.ceil(remainingTime);
      setTimeLeft(secInt);
      if (remainingTime <= 0) {
        ended = true;
        callbacksRef.current.onVictory(
          score,
          `Vaqt tugadi! Siz 60 soniyada ${score} ball jamg‘ardingiz!`
        );
        return;
      }

      const k = keysRef.current;
      const aimMove = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);
      if (ballState === 'ready') {
        aimRef.current = THREE.MathUtils.clamp(aimRef.current + aimMove * 0.9 * dt, -0.55, 0.55);
        setAimDeg(Math.round(aimRef.current * 57));

        if (chargingRef.current) {
          powerRef.current += powerDir * 115 * dt;
          if (powerRef.current >= 100) {
            powerRef.current = 100;
            powerDir = -1;
          } else if (powerRef.current <= 10) {
            powerRef.current = 10;
            powerDir = 1;
          }
          setPower(Math.round(powerRef.current));
        }

        // Compute preview arc
        const pFactor = Math.max(0.45, powerRef.current / 100);
        const targetDistZ = hoopZ - ballStart.z; // negative ~ -10.4
        const vx = Math.sin(aimRef.current) * 8.5 - ballStart.x * 0.35;
        const vy = 7.4 + pFactor * 4.4;
        const vz = targetDistZ * (0.68 + pFactor * 0.44);

        aimDots.forEach((dot, i) => {
          dot.visible = true;
          const t = (i + 1) * 0.08;
          dot.position.set(
            ballStart.x + vx * t,
            ballStart.y + vy * t - 0.5 * 14.5 * t * t,
            ballStart.z + vz * t
          );
        });

        if (releaseTriggerRef.current) {
          releaseTriggerRef.current = false;
          ballState = 'flying';
          ballVel.set(vx, vy, vz);
          sound.playShoot();
        }
      } else {
        aimDots.forEach((d) => {
          d.visible = false;
        });
        shotTimer += dt;
        ballVel.y -= 14.5 * dt;
        const prevY = ball.position.y;
        ball.position.addScaledVector(ballVel, dt);
        ball.rotation.x -= dt * 9;

        // Backboard bounce
        if (
          ball.position.z < hoopZ - 0.45 &&
          Math.abs(ball.position.x) < 1.6 &&
          ball.position.y > 3.5 &&
          ball.position.y < 5.5
        ) {
          ball.position.z = hoopZ - 0.45;
          ballVel.z = Math.abs(ballVel.z) * 0.55;
          sound.playBounce();
        }

        // Floor bounce
        if (ball.position.y < 0.36) {
          ball.position.y = 0.36;
          ballVel.y = Math.abs(ballVel.y) * 0.55;
          ballVel.x *= 0.85;
          ballVel.z *= 0.85;
          sound.playBounce();
        }

        // Check passing through hoop rim
        if (!scoredThisShot && prevY >= rimY && ball.position.y < rimY && ballVel.y < 0) {
          const distRim = Math.hypot(ball.position.x, ball.position.z - hoopZ);
          if (distRim < 0.72) {
            scoredThisShot = true;
            curStreak += 1;
            setStreak(curStreak);
            const pts = 20 + (curStreak >= 2 ? 10 : 0);
            score += pts;
            sound.playSuccess();
            particles.spawn(new THREE.Vector3(0, rimY, hoopZ), 0xfacc15, 22);
            setShotMsg(curStreak >= 2 ? `Seriya ${curStreak}x! +${pts} ball!` : `Aniq zarba! +${pts} ball!`);
            callbacksRef.current.onScoreChange(score);
          }
        }

        if (shotTimer > 2.1 || ball.position.z < hoopZ - 4) {
          if (!scoredThisShot) {
            curStreak = 0;
            setStreak(0);
            setShotMsg('Biroz aniqroq nishonga oling!');
          }
          resetBall();
        }
      }

      particles.update(dt);
    }, pausedRef);

    return () => {
      stopLoop();
      engine.dispose();
    };
  }, [quality]);

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      {/* Top HUD */}
      <div className="pointer-events-none absolute top-4 inset-x-4 flex justify-center z-10">
        <div className="px-5 py-2.5 rounded-2xl bg-slate-950/88 border border-orange-500/40 text-white text-center">
          <div className="flex items-center justify-center gap-4 text-xs font-mono-num">
            <span className="text-amber-400 font-bold">Vaqt: {timeLeft}s</span>
            <span>Seriya: {streak}x</span>
            <span>Burchak: {aimDeg}°</span>
          </div>
          <p className="font-display text-xs sm:text-sm font-bold mt-1">{shotMsg}</p>
        </div>
      </div>

      {/* Bottom Aim + Power Bar + Shoot Button */}
      <div className="absolute bottom-4 inset-x-4 z-10 flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-slate-950/90 border border-slate-700/80 text-white">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                aimRef.current = THREE.MathUtils.clamp(aimRef.current - 0.1, -0.55, 0.55);
              }}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
            >
              Chap
            </button>
            <button
              type="button"
              onClick={() => {
                aimRef.current = THREE.MathUtils.clamp(aimRef.current + 0.1, -0.55, 0.55);
              }}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
            >
              O‘ng
            </button>
          </div>

          <div className="w-36 sm:w-44 space-y-1">
            <div className="flex justify-between text-[11px] font-mono-num text-slate-300">
              <span>Quvvat</span>
              <span>{power}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden relative">
              {/* Optimal green zone */}
              <div className="absolute inset-y-0 left-[58%] w-[24%] bg-emerald-500/35" />
              <div
                className="h-full bg-amber-500 transition-all duration-75"
                style={{ width: `${power}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              startCharge();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              endCharge();
            }}
            onPointerLeave={endCharge}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-slate-950 font-display font-extrabold text-sm cursor-pointer"
          >
            OTISH (Space)
          </button>
        </div>
      </div>
    </div>
  );
};
