import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TouchControls } from '../../components/TouchControls';
import { buildCharacter, createParticleSystem } from '../../engine/models3D';
import { createCanvasTexture, createEngine, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

const GOALS_TO_WIN = 5;
const MATCH_TIME = 90;

export const FootballSimulator: React.FC<GameComponentProps> = ({
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
  const keysRef = useRef<Record<string, boolean>>({});

  const [goals, setGoals] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MATCH_TIME);
  const [banner, setBanner] = useState('');

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onGameOver, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onGameOver, onVictory };

  const setKeyState = (code: string, pressed: boolean) => {
    keysRef.current[code] = pressed;
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Gollar: 0/${GOALS_TO_WIN}`);
    const onDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
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
      fov: 52,
      background: 0x090d16,
      fogColor: 0x090d16,
      fogNear: 38,
      fogFar: 115,
    });
    const { scene, camera, renderer } = engine;

    setupThreePointLighting(scene, quality, {
      skyColor: 0xe0f2fe,
      groundColor: 0x065f46,
      keyIntensity: 1.65,
      shadowRange: 30,
    });

    // Football Pitch Texture with crisp white lines
    const pitchTex = createCanvasTexture(renderer, 512, 1024, (ctx, w, h) => {
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#16a34a';
        ctx.fillRect(0, (i * h) / 12, w, h / 12 + 1);
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.strokeRect(24, 24, w - 48, h - 48);
      ctx.beginPath();
      ctx.moveTo(24, h / 2);
      ctx.lineTo(w - 24, h / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 68, 0, Math.PI * 2);
      ctx.stroke();
      // Penalty boxes
      ctx.strokeRect(w * 0.24, 24, w * 0.52, 120);
      ctx.strokeRect(w * 0.24, h - 144, w * 0.52, 120);
    });

    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 52),
      new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 0.85 })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Stadium surround & floodlight towers
    const surround = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 120),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    );
    surround.rotation.x = -Math.PI / 2;
    surround.position.y = -0.05;
    scene.add(surround);

    // Goal at -Z (z = -24.5)
    const goalGroup = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.5, roughness: 0.3 });
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.2, 10), postMat);
    leftPost.position.set(-4.5, 1.6, -24.5);
    const rightPost = leftPost.clone();
    rightPost.position.x = 4.5;
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 9.2, 10), postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 3.2, -24.5);
    const net = new THREE.Mesh(
      new THREE.BoxGeometry(9.0, 3.2, 2.2),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0, wireframe: true })
    );
    net.position.set(0, 1.6, -25.6);
    goalGroup.add(leftPost, rightPost, crossbar, net);
    scene.add(goalGroup);

    // Stadium stands behind goal
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(36, 7, 5),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
    );
    stand.position.set(0, 3.5, -31);
    scene.add(stand);

    // Striker player (Uzbekistan blue/white jersey!)
    const player = buildCharacter(0x0ea5e9, 0xf8fafc);
    player.position.set(0, 0, 10);
    player.rotation.y = Math.PI;
    scene.add(player);

    // AI Goalkeeper & Defender
    const keeper = buildCharacter(0xf59e0b, 0x1e293b);
    keeper.position.set(0, 0, -22.8);
    scene.add(keeper);

    const defender = buildCharacter(0xef4444, 0x1e293b);
    defender.position.set(3, 0, -8);
    scene.add(defender);

    // Football
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 })
    );
    ball.castShadow = true;
    scene.add(ball);

    const particles = createParticleSystem(scene, 72);

    const ballVel = new THREE.Vector3();
    let goalCount = 0;
    let score = 0;
    let remaining = MATCH_TIME;
    let shootCooldown = 0;
    let ended = false;

    const resetKickoff = () => {
      player.position.set(0, 0, 10);
      ball.position.set(0, 0.42, 7.8);
      ballVel.set(0, 0, 0);
      defender.position.set((Math.random() - 0.5) * 8, 0, -7);
    };
    resetKickoff();

    const stopLoop = engine.startLoop((dt, elapsed) => {
      if (ended) return;

      remaining = Math.max(0, remaining - dt);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        ended = true;
        if (goalCount >= GOALS_TO_WIN) {
          callbacksRef.current.onVictory(score, `G‘alaba! ${goalCount} ta gol urdingiz!`);
        } else {
          callbacksRef.current.onGameOver(
            score,
            `Uchrashuv yakunlandi! Hisob: ${goalCount} gol (${score} ball).`
          );
        }
        return;
      }

      const k = keysRef.current;
      const mx = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);
      const mz = (k['KeyS'] || k['ArrowDown'] ? 1 : 0) - (k['KeyW'] || k['ArrowUp'] ? 1 : 0);
      const sprint = Boolean(k['ShiftLeft'] || k['KeyE']);
      const moveSpeed = sprint ? 13.5 : 9.8;

      if (mx !== 0 || mz !== 0) {
        const len = Math.hypot(mx, mz);
        player.position.x = THREE.MathUtils.clamp(player.position.x + (mx / len) * moveSpeed * dt, -15.5, 15.5);
        player.position.z = THREE.MathUtils.clamp(player.position.z + (mz / len) * moveSpeed * dt, -23.5, 23.5);
        player.rotation.y = Math.atan2(mx, mz);
      }

      if (shootCooldown > 0) shootCooldown = Math.max(0, shootCooldown - dt);

      // Dribble & Shoot interaction
      const distToBall = Math.hypot(player.position.x - ball.position.x, player.position.z - ball.position.z);
      if (distToBall < 1.35) {
        const dirX = Math.sin(player.rotation.y);
        const dirZ = Math.cos(player.rotation.y);
        if (k['Space'] && shootCooldown <= 0) {
          shootCooldown = 0.55;
          sound.playBounce();
          // Aim slightly assisted toward goal if facing upfield
          const aimX = dirZ < -0.2 ? dirX * 18 - ball.position.x * 0.25 : dirX * 22;
          ballVel.set(aimX, 5.2, dirZ * 25);
        } else if (shootCooldown <= 0.2) {
          // Gentle dribble carry
          ball.position.x = THREE.MathUtils.damp(ball.position.x, player.position.x + dirX * 1.05, 14, dt);
          ball.position.z = THREE.MathUtils.damp(ball.position.z, player.position.z + dirZ * 1.05, 14, dt);
          ballVel.multiplyScalar(0.85);
        }
      }

      // Ball physics
      ballVel.y -= 13.5 * dt;
      ball.position.addScaledVector(ballVel, dt);
      if (ball.position.y < 0.42) {
        ball.position.y = 0.42;
        if (Math.abs(ballVel.y) > 1.2) {
          ballVel.y = Math.abs(ballVel.y) * 0.52;
        } else {
          ballVel.y = 0;
        }
        ballVel.x *= Math.exp(-1.8 * dt);
        ballVel.z *= Math.exp(-1.8 * dt);
      }
      ball.rotation.x += ballVel.z * dt * 1.5;
      ball.rotation.z -= ballVel.x * dt * 1.5;

      // Pitch sidelines bounce
      if (Math.abs(ball.position.x) > 16.2) {
        ball.position.x = Math.sign(ball.position.x) * 16.2;
        ballVel.x *= -0.7;
      }
      if (ball.position.z > 24.5) {
        ball.position.z = 24.5;
        ballVel.z *= -0.7;
      }

      // Goalkeeper AI tracks ball X
      const keeperTargetX = THREE.MathUtils.clamp(ball.position.x * 0.82, -3.7, 3.7);
      keeper.position.x = THREE.MathUtils.damp(keeper.position.x, keeperTargetX, 3.8, dt);

      // Defender AI patrols & gently intercepts
      const defTargetX = THREE.MathUtils.clamp(ball.position.x * 0.65 + Math.sin(elapsed * 1.5) * 2.5, -10, 10);
      defender.position.x = THREE.MathUtils.damp(defender.position.x, defTargetX, 2.5, dt);

      // Keeper / Defender block collision
      [keeper, defender].forEach((npc) => {
        const d = Math.hypot(npc.position.x - ball.position.x, npc.position.z - ball.position.z);
        if (d < 1.15 && ball.position.y < 2.2) {
          ballVel.z = Math.abs(ballVel.z) * 0.75 + 6;
          ballVel.x = (ball.position.x - npc.position.x) * 8;
          sound.playBounce();
        }
      });

      // Goal detection!
      if (ball.position.z < -24.5) {
        if (Math.abs(ball.position.x) < 4.2 && ball.position.y < 3.2) {
          goalCount += 1;
          score += 60;
          setGoals(goalCount);
          sound.playSuccess();
          particles.spawn(new THREE.Vector3(ball.position.x, 1.8, -24.5), 0xfacc15, 28);
          callbacksRef.current.onScoreChange(score);
          callbacksRef.current.onStatusChange?.(`Gollar: ${goalCount}/${GOALS_TO_WIN}`);
          setBanner('GOOOOL! Ajoyib zarba!');
          window.setTimeout(() => setBanner(''), 1400);

          if (goalCount >= GOALS_TO_WIN) {
            ended = true;
            window.setTimeout(() => {
              callbacksRef.current.onVictory(
                score + Math.round(remaining),
                `Stadion chempioni! ${GOALS_TO_WIN} ta chiroyli gol urdingiz!`
              );
            }, 900);
            return;
          }
          resetKickoff();
        } else {
          // Missed wide/high
          ball.position.z = -24.2;
          ballVel.z *= -0.5;
        }
      }

      // Broadcast Stadium Camera
      camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x * 0.55, 5, dt);
      camera.position.y = 11.5;
      camera.position.z = THREE.MathUtils.damp(camera.position.z, player.position.z + 13.5, 5, dt);
      camera.lookAt(ball.position.x * 0.5, 0.8, ball.position.z - 4);

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

      <div className="pointer-events-none absolute top-4 inset-x-4 flex flex-col items-center gap-2 z-10">
        <div className="flex items-center gap-5 px-5 py-2.5 rounded-2xl bg-slate-950/88 border border-emerald-500/40 text-white font-mono-num text-xs sm:text-sm">
          <span>
            Gollar: <strong className="text-emerald-400">{goals}/{GOALS_TO_WIN}</strong>
          </span>
          <span>
            Vaqt: <strong className="text-amber-400">{timeLeft}s</strong>
          </span>
          <span className="hidden sm:inline text-slate-400">Space: Zarba · Shift: Tez yugurish</span>
        </div>
        {banner && (
          <div className="px-6 py-2 rounded-xl bg-emerald-500 text-slate-950 font-display font-extrabold text-xl">
            {banner}
          </div>
        )}
      </div>

      <TouchControls
        onKeyState={setKeyState}
        actionLabel="ZARBA"
        actionKey="Space"
        secondaryLabel="TEZ"
        secondaryKey="ShiftLeft"
      />
    </div>
  );
};
