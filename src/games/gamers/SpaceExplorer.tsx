import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TouchControls } from '../../components/TouchControls';
import { buildSpaceship, createParticleSystem } from '../../engine/models3D';
import { createEngine, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

const TARGET_SCORE = 300;

export const SpaceExplorer: React.FC<GameComponentProps> = ({
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

  const [shield, setShield] = useState(100);
  const [energyCount, setEnergyCount] = useState(0);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onGameOver, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onGameOver, onVictory };

  const setKeyState = (code: string, pressed: boolean) => {
    keysRef.current[code] = pressed;
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Maqsad: ${TARGET_SCORE} ball`);
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
      fov: 62,
      background: 0x020617,
      fogColor: 0x020617,
      fogNear: 30,
      fogFar: 135,
    });
    const { scene, camera } = engine;

    setupThreePointLighting(scene, quality, {
      skyColor: 0x38bdf8,
      groundColor: 0x1e1b4b,
      keyIntensity: 1.5,
    });

    // Distant planet backdrop
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(22, 28, 22),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 })
    );
    planet.position.set(34, 18, -110);
    scene.add(planet);

    // Instanced starfield
    const starCount = quality === 'low' ? 120 : 260;
    const starGeo = new THREE.SphereGeometry(0.14, 5, 5);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const stars = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const dummy = new THREE.Object3D();
    const starCoords: [number, number, number][] = [];
    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * 90;
      const y = (Math.random() - 0.5) * 50;
      const z = -Math.random() * 140;
      starCoords.push([x, y, z]);
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      stars.setMatrixAt(i, dummy.matrix);
    }
    stars.frustumCulled = false;
    scene.add(stars);

    // Player Starfighter
    const ship = buildSpaceship(0x38bdf8, 0xf59e0b);
    ship.scale.setScalar(0.85);
    scene.add(ship);

    // Tumbling Asteroids
    const asteroids: { mesh: THREE.Mesh; rotVel: THREE.Vector3 }[] = [];
    const astGeo = new THREE.DodecahedronGeometry(1.45, 0);
    const astMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(astGeo, astMat);
      m.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 11, -30 - i * 11);
      m.scale.setScalar(0.7 + Math.random() * 0.9);
      scene.add(m);
      asteroids.push({
        mesh: m,
        rotVel: new THREE.Vector3(Math.random() * 2, Math.random() * 2, Math.random()),
      });
    }

    // Energy Rings & Crystals
    const energies: THREE.Mesh[] = [];
    const ringGeo = new THREE.TorusGeometry(1.5, 0.16, 10, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.6,
    });
    for (let i = 0; i < 6; i++) {
      const r = new THREE.Mesh(ringGeo, ringMat);
      r.position.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8, -28 - i * 24);
      scene.add(r);
      energies.push(r);
    }

    const particles = createParticleSystem(scene, 72);
    let sx = 0;
    let sy = 0;
    let score = 0;
    let shieldVal = 100;
    let collected = 0;
    let invuln = 0;
    let ended = false;
    let hudTick = 0;

    camera.position.set(0, 2.2, 8.8);
    camera.lookAt(0, 0, -15);

    const stopLoop = engine.startLoop((dt, elapsed) => {
      if (ended) return;
      const k = keysRef.current;

      const mx = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);
      const my = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
      const turbo = Boolean(k['Space'] || k['ShiftLeft']);
      const forwardSpeed = turbo ? 52 : 34;

      sx = THREE.MathUtils.clamp(sx + mx * 13 * dt, -9, 9);
      sy = THREE.MathUtils.clamp(sy + my * 9 * dt, -4.8, 4.8);

      ship.position.x = THREE.MathUtils.damp(ship.position.x, sx, 9, dt);
      ship.position.y = THREE.MathUtils.damp(ship.position.y, sy, 9, dt);
      ship.rotation.z = THREE.MathUtils.damp(ship.rotation.z, -mx * 0.45, 8, dt);
      ship.rotation.x = THREE.MathUtils.damp(ship.rotation.x, my * 0.25, 8, dt);

      // Update starfield warp
      for (let i = 0; i < starCount; i++) {
        starCoords[i][2] += forwardSpeed * dt * 1.4;
        if (starCoords[i][2] > 12) starCoords[i][2] = -135;
        dummy.position.set(starCoords[i][0], starCoords[i][1], starCoords[i][2]);
        dummy.updateMatrix();
        stars.setMatrixAt(i, dummy.matrix);
      }
      stars.instanceMatrix.needsUpdate = true;

      if (invuln > 0) invuln = Math.max(0, invuln - dt);

      // Asteroids
      asteroids.forEach((a) => {
        a.mesh.position.z += forwardSpeed * dt;
        a.mesh.rotation.x += a.rotVel.x * dt;
        a.mesh.rotation.y += a.rotVel.y * dt;
        if (a.mesh.position.z > 10) {
          a.mesh.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 11, -125 - Math.random() * 40);
        }
        const dist = a.mesh.position.distanceTo(ship.position);
        if (invuln <= 0 && dist < 2.2) {
          invuln = 1.0;
          shieldVal = Math.max(0, shieldVal - 34);
          setShield(shieldVal);
          sound.playExplosion();
          particles.spawn(ship.position.clone(), 0xef4444, 22);
          a.mesh.position.z = -135;
          if (shieldVal <= 0) {
            ended = true;
            callbacksRef.current.onGameOver(
              Math.round(score),
              `Kema qalqoni ishdan chiqdi! To‘plangan energiya: ${collected} ta.`
            );
          }
        }
      });

      // Energy Rings
      energies.forEach((r) => {
        r.position.z += forwardSpeed * dt;
        r.rotation.z += dt * 2.5;
        if (r.position.z > 10) {
          r.position.set((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 8, -125 - Math.random() * 35);
        }
        if (r.position.distanceTo(ship.position) < 2.6) {
          sound.playCollect();
          score += 30;
          collected += 1;
          shieldVal = Math.min(100, shieldVal + 6);
          setEnergyCount(collected);
          setShield(shieldVal);
          particles.spawn(r.position.clone(), 0x06b6d4, 16);
          r.position.set((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 8, -135);
          callbacksRef.current.onScoreChange(Math.round(score));

          if (score >= TARGET_SCORE) {
            ended = true;
            callbacksRef.current.onVictory(
              Math.round(score),
              `Koinot kashfiyotchisi! ${collected} ta energiya halqasidan o‘tib missiyani bajardingiz!`
            );
          }
        }
      });

      score += dt * 3;
      ship.visible = invuln <= 0 || Math.floor(elapsed * 14) % 2 === 0;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, ship.position.x * 0.55, 5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, ship.position.y * 0.55 + 2.0, 5, dt);
      camera.lookAt(ship.position.x * 0.3, ship.position.y * 0.3, -18);

      particles.update(dt);

      hudTick += dt;
      if (hudTick > 0.15) {
        hudTick = 0;
        callbacksRef.current.onScoreChange(Math.round(score));
      }
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
        <div className="flex items-center gap-5 px-5 py-2.5 rounded-2xl bg-slate-950/88 border border-cyan-500/40 text-white font-mono-num text-xs sm:text-sm">
          <span>
            Qalqon: <strong className={shield > 35 ? 'text-cyan-400' : 'text-rose-400'}>{shield}%</strong>
          </span>
          <span>
            Energiya: <strong className="text-amber-400">{energyCount} ta</strong>
          </span>
          <span className="hidden sm:inline text-slate-400">Maqsad: {TARGET_SCORE} ball</span>
        </div>
      </div>

      <TouchControls onKeyState={setKeyState} actionLabel="TURBO" actionKey="Space" />
    </div>
  );
};
