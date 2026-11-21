import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TouchControls } from '../../components/TouchControls';
import { buildCharacter, buildStylizedTree, createParticleSystem } from '../../engine/models3D';
import { createEngine, createGrassTexture, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

const TARGET_SUPPLIES = 15;

export const ZombieSurvival: React.FC<GameComponentProps> = ({
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

  const [supplies, setSupplies] = useState(0);
  const [hp, setHp] = useState(100);
  const [pulseReady, setPulseReady] = useState(true);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onGameOver, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onGameOver, onVictory };

  const setKeyState = (code: string, pressed: boolean) => {
    keysRef.current[code] = pressed;
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Zaxira: 0/${TARGET_SUPPLIES}`);
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
      background: 0x0f172a,
      fogColor: 0x0f172a,
      fogNear: 20,
      fogFar: 65,
    });
    const { scene, camera, renderer } = engine;

    setupThreePointLighting(scene, quality, {
      skyColor: 0x38bdf8,
      groundColor: 0x064e3b,
      keyColor: 0xe0f2fe,
      keyIntensity: 1.35,
      shadowRange: 28,
    });

    const grassTex = createGrassTexture(renderer, 14);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(55, 48),
      new THREE.MeshStandardMaterial({ map: grassTex, color: 0x334155, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Natural forest border ring
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const t = buildStylizedTree(1.25, 0x166534);
      t.position.set(Math.cos(a) * 26, 0, Math.sin(a) * 26);
      scene.add(t);
    }

    // Survivor player
    const player = buildCharacter(0x0ea5e9, 0x1e293b);
    scene.add(player);

    // Expanding blue energy pulse ring
    const pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.35, 32),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      })
    );
    pulseRing.rotation.x = -Math.PI / 2;
    pulseRing.position.y = 0.2;
    scene.add(pulseRing);

    // Collectible glowing supply crates
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.7,
      roughness: 0.35,
    });
    const crates: THREE.Mesh[] = [];
    const spawnPos = () => {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 15;
      return new THREE.Vector3(Math.cos(a) * r, 0.65, Math.sin(a) * r);
    };
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), crateMat);
      c.position.copy(spawnPos());
      c.castShadow = true;
      scene.add(c);
      crates.push(c);
    }

    // Stylized non-graphic green voxel bot enemies
    const buildVoxelBot = () => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.55 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.1, 0.55), mat);
      body.position.y = 1.0;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.68, 0.68), mat);
      head.position.y = 1.9;
      g.add(head);
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.16, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 1.5 })
      );
      visor.position.set(0, 1.94, 0.34);
      g.add(visor);
      for (const sx of [-0.55, 0.55]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.8), dark);
        arm.position.set(sx, 1.25, 0.4);
        g.add(arm);
      }
      return g;
    };

    const bots: { group: THREE.Group; speed: number }[] = [];
    const spawnBotEdge = (g: THREE.Group) => {
      const a = Math.random() * Math.PI * 2;
      g.position.set(Math.cos(a) * 23, 0, Math.sin(a) * 23);
    };
    for (let i = 0; i < 7; i++) {
      const b = buildVoxelBot();
      spawnBotEdge(b);
      scene.add(b);
      bots.push({ group: b, speed: 3.6 + (i % 3) * 0.85 });
    }

    const particles = createParticleSystem(scene, 72);
    let score = 0;
    let collected = 0;
    let health = 100;
    let pulseCooldown = 0;
    let pulseAnim = 0;
    let invuln = 0;
    let ended = false;

    camera.position.set(0, 14, 13);

    const stopLoop = engine.startLoop((dt, elapsed) => {
      if (ended) return;
      const k = keysRef.current;

      const mx = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);
      const mz = (k['KeyS'] || k['ArrowDown'] ? 1 : 0) - (k['KeyW'] || k['ArrowUp'] ? 1 : 0);

      if (mx !== 0 || mz !== 0) {
        const len = Math.hypot(mx, mz);
        player.position.x += (mx / len) * 9.5 * dt;
        player.position.z += (mz / len) * 9.5 * dt;
        player.rotation.y = Math.atan2(mx, mz);
      }
      const distC = Math.hypot(player.position.x, player.position.z);
      if (distC > 22.5) {
        player.position.x *= 22.5 / distC;
        player.position.z *= 22.5 / distC;
      }

      // Pulse Shockwave ability (Space)
      if (pulseCooldown > 0) {
        pulseCooldown = Math.max(0, pulseCooldown - dt);
        if (pulseCooldown === 0) setPulseReady(true);
      }
      if (k['Space'] && pulseCooldown <= 0) {
        pulseCooldown = 2.6;
        pulseAnim = 1;
        setPulseReady(false);
        sound.playShoot();
        pulseRing.position.set(player.position.x, 0.25, player.position.z);

        bots.forEach((b) => {
          const d = b.group.position.distanceTo(player.position);
          if (d < 7.8) {
            particles.spawn(b.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x38bdf8, 12);
            spawnBotEdge(b.group);
            score += 10;
            callbacksRef.current.onScoreChange(score);
          }
        });
      }

      if (pulseAnim > 0) {
        pulseAnim = Math.max(0, pulseAnim - dt * 2.5);
        const s = 1 + (1 - pulseAnim) * 7.5;
        pulseRing.scale.setScalar(s);
        (pulseRing.material as THREE.MeshBasicMaterial).opacity = pulseAnim * 0.75;
      }

      // Crates collection
      crates.forEach((c, idx) => {
        c.rotation.y += dt * 1.8;
        c.position.y = 0.65 + Math.sin(elapsed * 3 + idx) * 0.14;
        if (c.position.distanceTo(player.position) < 1.8) {
          sound.playCollect();
          collected += 1;
          score += 25;
          setSupplies(collected);
          particles.spawn(c.position.clone(), 0xfacc15, 16);
          c.position.copy(spawnPos());
          callbacksRef.current.onScoreChange(score);
          callbacksRef.current.onStatusChange?.(`Zaxira: ${collected}/${TARGET_SUPPLIES}`);

          if (collected >= TARGET_SUPPLIES) {
            ended = true;
            callbacksRef.current.onVictory(
              score,
              `Qahramon! Barcha ${TARGET_SUPPLIES} ta zaxira qutisini yig‘ib omon qoldingiz!`
            );
          }
        }
      });

      // Bots chase AI
      if (invuln > 0) invuln = Math.max(0, invuln - dt);
      bots.forEach((b) => {
        const dx = player.position.x - b.group.position.x;
        const dz = player.position.z - b.group.position.z;
        const dist = Math.hypot(dx, dz) || 1;
        b.group.position.x += (dx / dist) * b.speed * dt;
        b.group.position.z += (dz / dist) * b.speed * dt;
        b.group.rotation.y = Math.atan2(dx, dz);

        if (invuln <= 0 && dist < 1.35) {
          invuln = 0.9;
          health = Math.max(0, health - 25);
          setHp(health);
          sound.playError();
          particles.spawn(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xef4444, 14);
          if (health <= 0) {
            ended = true;
            callbacksRef.current.onGameOver(
              score,
              `Energiya tugadi! Siz ${collected} ta zaxira qutisi to‘pladingiz.`
            );
          }
        }
      });

      player.visible = invuln <= 0 || Math.floor(elapsed * 14) % 2 === 0;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x, 5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, player.position.z + 12.5, 5, dt);
      camera.lookAt(player.position.x, 0.8, player.position.z);

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

      <div className="pointer-events-none absolute top-4 inset-x-4 flex justify-center z-10">
        <div className="flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-slate-950/88 border border-emerald-500/40 text-white font-mono-num text-xs sm:text-sm">
          <span>
            Jon: <strong className={hp > 40 ? 'text-emerald-400' : 'text-rose-400'}>{hp}%</strong>
          </span>
          <span>
            Zaxira: <strong className="text-amber-400">{supplies}/{TARGET_SUPPLIES}</strong>
          </span>
          <span>
            Impuls:{' '}
            <strong className={pulseReady ? 'text-sky-400' : 'text-slate-500'}>
              {pulseReady ? 'Tayyor (Space)' : 'Qayta yuklanmoqda'}
            </strong>
          </span>
        </div>
      </div>

      <TouchControls onKeyState={setKeyState} actionLabel="IMPULS" actionKey="Space" />
    </div>
  );
};
