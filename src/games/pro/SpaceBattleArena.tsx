import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TouchControls } from '../../components/TouchControls';
import { buildSpaceship, createParticleSystem } from '../../engine/models3D';
import { createEngine, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

const TOTAL_WAVES = 3;

export const SpaceBattleArena: React.FC<GameComponentProps> = ({
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
  const [wave, setWave] = useState(1);
  const [enemiesLeft, setEnemiesLeft] = useState(4);
  const [missiles, setMissiles] = useState(3);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onGameOver, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onGameOver, onVictory };

  const setKeyState = (code: string, pressed: boolean) => {
    keysRef.current[code] = pressed;
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Jang to‘lqini 1/${TOTAL_WAVES}`);
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
      fov: 60,
      background: 0x050814,
      fogColor: 0x050814,
      fogNear: 35,
      fogFar: 160,
    });
    const { scene, camera, renderer } = engine;

    setupThreePointLighting(scene, quality, {
      skyColor: 0x818cf8,
      groundColor: 0x1e1b4b,
      keyIntensity: 1.5,
    });

    // Planet & orbital space station backdrop
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(28, 28, 22),
      new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.75 })
    );
    planet.position.set(-42, -18, -110);
    scene.add(planet);

    const stationRing = new THREE.Mesh(
      new THREE.TorusGeometry(16, 0.9, 12, 48),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.75, roughness: 0.3 })
    );
    stationRing.position.set(28, 12, -88);
    scene.add(stationRing);

    // Starfield
    const starCount = quality === 'low' ? 120 : 220;
    const stars = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.14, 5, 5),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }),
      starCount
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < starCount; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 140,
        (Math.random() - 0.5) * 70,
        -20 - Math.random() * 130
      );
      dummy.updateMatrix();
      stars.setMatrixAt(i, dummy.matrix);
    }
    stars.computeBoundingSphere();
    scene.add(stars);

    // Player Combat Interceptor
    const player = buildSpaceship(0x6366f1, 0x38bdf8);
    player.scale.setScalar(0.85);
    scene.add(player);

    interface EnemyFighter {
      mesh: THREE.Group;
      hp: number;
      isBoss: boolean;
      phase: number;
      fireCd: number;
      basePos: THREE.Vector3;
    }
    interface LaserBolt {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      fromPlayer: boolean;
      damage: number;
      life: number;
    }

    const enemies: EnemyFighter[] = [];
    const bolts: LaserBolt[] = [];
    const particles = createParticleSystem(scene, 96);

    const laserGeo = new THREE.BoxGeometry(0.18, 0.18, 1.8);
    const playerLaserMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const missileMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const enemyLaserMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    const spawnWave = (waveNum: number) => {
      const count = waveNum === 3 ? 4 : 3 + waveNum;
      for (let i = 0; i < count; i++) {
        const isBoss = waveNum === 3 && i === 0;
        const ship = buildSpaceship(isBoss ? 0xec4899 : 0xef4444, 0xf59e0b);
        ship.rotation.y = Math.PI; // face player (+Z)
        ship.scale.setScalar(isBoss ? 1.55 : 0.78);
        const bx = (i - (count - 1) / 2) * 7.5;
        const by = (i % 2 === 0 ? 1 : -1) * 2.2;
        const bz = isBoss ? -42 : -32 - (i % 3) * 6;
        ship.position.set(bx, by, bz);
        scene.add(ship);
        enemies.push({
          mesh: ship,
          hp: isBoss ? 160 : 40 + waveNum * 12,
          isBoss,
          phase: i * 1.4,
          fireCd: 1.0 + Math.random() * 1.5,
          basePos: new THREE.Vector3(bx, by, bz),
        });
      }
      setEnemiesLeft(enemies.length);
      setWave(waveNum);
      callbacksRef.current.onStatusChange?.(`Jang to‘lqini ${waveNum}/${TOTAL_WAVES}`);
    };

    spawnWave(1);

    let px = 0;
    let py = 0;
    let curWave = 1;
    let shieldVal = 100;
    let missileCount = 3;
    let score = 0;
    let fireCd = 0;
    let missileCd = 0;
    let ended = false;
    let pointerFire = false;

    const onDown = () => {
      pointerFire = true;
    };
    const onUp = () => {
      pointerFire = false;
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    camera.position.set(0, 2.5, 10.2);

    const stopLoop = engine.startLoop((dt, elapsed) => {
      if (ended) return;
      const k = keysRef.current;

      stationRing.rotation.z += dt * 0.15;

      const mx = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);
      const my = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);

      px = THREE.MathUtils.clamp(px + mx * 14 * dt, -11.5, 11.5);
      py = THREE.MathUtils.clamp(py + my * 10 * dt, -5.5, 5.5);

      player.position.x = THREE.MathUtils.damp(player.position.x, px, 10, dt);
      player.position.y = THREE.MathUtils.damp(player.position.y, py, 10, dt);
      player.rotation.z = THREE.MathUtils.damp(player.rotation.z, -mx * 0.42, 8, dt);
      player.rotation.x = THREE.MathUtils.damp(player.rotation.x, my * 0.25, 8, dt);

      // Gentle shield regen
      shieldVal = Math.min(100, shieldVal + dt * 2.2);

      // Primary Twin Plasma Blasters
      if (fireCd > 0) fireCd = Math.max(0, fireCd - dt);
      if ((k['Space'] || pointerFire) && fireCd <= 0) {
        fireCd = 0.2;
        sound.playShoot();
        for (const ox of [-0.95, 0.95]) {
          const m = new THREE.Mesh(laserGeo, playerLaserMat);
          m.position.set(player.position.x + ox, player.position.y, player.position.z - 1.4);
          scene.add(m);
          bolts.push({
            mesh: m,
            vel: new THREE.Vector3(0, 0, -68),
            fromPlayer: true,
            damage: 18,
            life: 1.4,
          });
        }
      }

      // Homing Missile (E key)
      if (missileCd > 0) missileCd = Math.max(0, missileCd - dt);
      if (k['KeyE'] && missileCd <= 0 && missileCount > 0 && enemies.length > 0) {
        missileCd = 1.1;
        missileCount -= 1;
        setMissiles(missileCount);
        sound.playExplosion();
        const target = enemies[0];
        const dir = target.mesh.position.clone().sub(player.position).normalize();
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), missileMat);
        m.position.copy(player.position);
        scene.add(m);
        bolts.push({
          mesh: m,
          vel: dir.multiplyScalar(48),
          fromPlayer: true,
          damage: 65,
          life: 2.2,
        });
      }

      // Enemy AI maneuvering & firing
      enemies.forEach((en) => {
        const ampX = en.isBoss ? 6.5 : 4.2;
        en.mesh.position.x = en.basePos.x + Math.sin(elapsed * 1.4 + en.phase) * ampX;
        en.mesh.position.y = en.basePos.y + Math.cos(elapsed * 1.8 + en.phase) * 2.0;
        en.mesh.rotation.z = Math.cos(elapsed * 1.4 + en.phase) * 0.25;

        en.fireCd -= dt;
        if (en.fireCd <= 0) {
          en.fireCd = en.isBoss ? 0.95 : 1.8 + Math.random() * 1.1;
          const aim = player.position.clone().sub(en.mesh.position).normalize();
          const m = new THREE.Mesh(laserGeo, enemyLaserMat);
          m.position.copy(en.mesh.position);
          scene.add(m);
          bolts.push({
            mesh: m,
            vel: aim.multiplyScalar(28),
            fromPlayer: false,
            damage: en.isBoss ? 18 : 12,
            life: 2.5,
          });
        }
      });

      // Update laser bolts & collisions
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.life -= dt;
        b.mesh.position.addScaledVector(b.vel, dt);

        if (b.life <= 0) {
          scene.remove(b.mesh);
          bolts.splice(i, 1);
          continue;
        }

        if (b.fromPlayer) {
          let hit = false;
          for (let j = enemies.length - 1; j >= 0; j--) {
            const en = enemies[j];
            const hitRadius = en.isBoss ? 3.4 : 2.1;
            if (b.mesh.position.distanceTo(en.mesh.position) < hitRadius) {
              en.hp -= b.damage;
              hit = true;
              particles.spawn(b.mesh.position.clone(), 0x38bdf8, 8);
              if (en.hp <= 0) {
                sound.playExplosion();
                particles.spawn(en.mesh.position.clone(), 0xf59e0b, 26);
                scene.remove(en.mesh);
                enemies.splice(j, 1);
                score += en.isBoss ? 150 : 45;
                callbacksRef.current.onScoreChange(score);
                setEnemiesLeft(enemies.length);
              }
              break;
            }
          }
          if (hit) {
            scene.remove(b.mesh);
            bolts.splice(i, 1);
          }
        } else {
          if (b.mesh.position.distanceTo(player.position) < 1.9) {
            shieldVal = Math.max(0, shieldVal - b.damage);
            setShield(Math.round(shieldVal));
            sound.playError();
            particles.spawn(player.position.clone(), 0xf43f5e, 14);
            scene.remove(b.mesh);
            bolts.splice(i, 1);
            if (shieldVal <= 0) {
              ended = true;
              callbacksRef.current.onGameOver(
                score,
                `Kema qalqoni yo‘qoldi! Siz ${curWave}-to‘lqingacha jang qildingiz.`
              );
              return;
            }
          }
        }
      }

      // Next wave or Victory
      if (enemies.length === 0) {
        if (curWave >= TOTAL_WAVES) {
          ended = true;
          score += 100;
          callbacksRef.current.onScoreChange(score);
          callbacksRef.current.onVictory(
            score,
            `Galaktika qahramoni! Barcha ${TOTAL_WAVES} to‘lqin va bosh kreyser yakson qilindi!`
          );
          return;
        }
        curWave += 1;
        missileCount = Math.min(5, missileCount + 2);
        setMissiles(missileCount);
        sound.playSuccess();
        spawnWave(curWave);
      }

      setShield(Math.round(shieldVal));
      camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x * 0.5, 5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, player.position.y * 0.5 + 2.4, 5, dt);
      camera.lookAt(player.position.x * 0.4, player.position.y * 0.4, -26);

      particles.update(dt);
    }, pausedRef);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      stopLoop();
      engine.dispose();
    };
  }, [quality]);

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      <div className="pointer-events-none absolute top-4 inset-x-4 flex justify-center z-10">
        <div className="flex flex-wrap items-center justify-center gap-4 px-5 py-2.5 rounded-2xl bg-slate-950/90 border border-indigo-500/50 text-white font-mono-num text-xs sm:text-sm">
          <span>
            To‘lqin: <strong className="text-indigo-400">{wave}/{TOTAL_WAVES}</strong>
          </span>
          <span>
            Dushmanlar: <strong className="text-rose-400">{enemiesLeft}</strong>
          </span>
          <span>
            Qalqon: <strong className={shield > 35 ? 'text-cyan-400' : 'text-rose-400'}>{shield}%</strong>
          </span>
          <span>
            Raketa (E): <strong className="text-amber-400">{missiles}</strong>
          </span>
        </div>
      </div>

      <TouchControls
        onKeyState={setKeyState}
        actionLabel="OTISH"
        actionKey="Space"
        secondaryLabel="RAKETA"
        secondaryKey="KeyE"
      />
    </div>
  );
};
