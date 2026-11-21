import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TouchControls } from '../../components/TouchControls';
import { buildCarModel, buildStylizedTree, createParticleSystem } from '../../engine/models3D';
import { createAsphaltTexture, createEngine, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

const CARS = [
  { id: 'gt', name: 'Oltin GT', color: 0xf59e0b },
  { id: 'red', name: 'Qizil Turbo', color: 0xef4444 },
  { id: 'blue', name: "Ko'k Sport", color: 0x0ea5e9 },
];

const TOTAL_LAPS = 3;
const LAP_DISTANCE = 450;

export const Racing3D: React.FC<GameComponentProps> = ({
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

  const [carIdx, setCarIdx] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [lap, setLap] = useState(1);
  const [nitro, setNitro] = useState(100);
  const [hp, setHp] = useState(3);

  const carColorRef = useRef(CARS[0].color);
  carColorRef.current = CARS[carIdx].color;

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onGameOver, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onGameOver, onVictory };

  const setKeyState = (code: string, pressed: boolean) => {
    keysRef.current[code] = pressed;
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Aylana 1/${TOTAL_LAPS}`);
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
      background: 0x0f172a,
      fogColor: 0x0f172a,
      fogNear: 35,
      fogFar: 130,
    });
    const { scene, camera, renderer } = engine;

    setupThreePointLighting(scene, quality, {
      skyColor: 0xfdba74,
      groundColor: 0x1e293b,
      keyIntensity: 1.55,
      shadowRange: 30,
    });

    // Endless highway terrain & asphalt
    const terrain = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 260),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.92 })
    );
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, -0.05, -60);
    scene.add(terrain);

    const roadTex = createAsphaltTexture(renderer, 1, 14);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 240),
      new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.8 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -60);
    road.receiveShadow = true;
    scene.add(road);

    // Track guardrails & roadside trees that loop cleanly
    const propsGroup = new THREE.Group();
    scene.add(propsGroup);
    const trees: THREE.Group[] = [];
    for (let i = 0; i < 24; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const t = buildStylizedTree(0.95, 0x15803d);
      t.position.set(side * (10.5 + (i % 3) * 2), 0, -i * 10);
      propsGroup.add(t);
      trees.push(t);
    }

    // Player sports car
    const playerCar = buildCarModel(carColorRef.current, 0x0f172a, 'sport');
    playerCar.group.rotation.y = Math.PI; // face -Z
    playerCar.group.position.set(0, 0, 2);
    scene.add(playerCar.group);

    // Rival traffic obstacles
    const lanes = [-4.4, 0, 4.4];
    const rivals: { rig: ReturnType<typeof buildCarModel>; lane: number; speed: number }[] = [];
    const rivalColors = [0x64748b, 0x3b82f6, 0x22c55e, 0xa855f7, 0xe11d48];
    for (let i = 0; i < 5; i++) {
      const rig = buildCarModel(rivalColors[i], 0x111827, 'sport');
      rig.group.rotation.y = Math.PI;
      const lane = lanes[i % 3];
      rig.group.position.set(lane, 0, -35 - i * 32);
      scene.add(rig.group);
      rivals.push({ rig, lane, speed: 12 + (i % 3) * 4 });
    }

    // Glowing checkpoint arch & nitro coins
    const archGroup = new THREE.Group();
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.3,
    });
    const archBar = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.7, 0.7), archMat);
    archBar.position.y = 5.4;
    archGroup.add(archBar);
    for (const ax of [-7.6, 7.6]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.5, 0.6), archMat);
      post.position.set(ax, 2.75, 0);
      archGroup.add(post);
    }
    archGroup.position.set(0, 0, -90);
    scene.add(archGroup);

    // Collectible energy coins
    const coins: THREE.Mesh[] = [];
    const coinGeo = new THREE.OctahedronGeometry(0.65, 0);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.2,
    });
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(coinGeo, coinMat);
      c.position.set(lanes[i % 3], 1.1, -24 - i * 26);
      scene.add(c);
      coins.push(c);
    }

    const particles = createParticleSystem(scene, 72);

    let carX = 0;
    let speed = 22;
    let nitroVal = 100;
    let distance = 0;
    let currentLap = 1;
    let score = 0;
    let health = 3;
    let invuln = 0;
    let ended = false;
    let hudTimer = 0;

    camera.position.set(0, 4.4, 9.6);
    camera.lookAt(0, 1.2, -10);

    const stopLoop = engine.startLoop((dt, elapsed) => {
      if (ended) return;
      const k = keysRef.current;

      const accel = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
      const steer = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);
      const boosting = Boolean((k['Space'] || k['ShiftLeft']) && nitroVal > 5);

      const targetMax = boosting ? 70 : 48;
      if (boosting) {
        nitroVal = Math.max(0, nitroVal - dt * 36);
        speed += 38 * dt;
      } else {
        nitroVal = Math.min(100, nitroVal + dt * 11);
        speed += (accel > 0 ? 24 : accel < 0 ? -36 : 7) * dt;
      }
      speed = THREE.MathUtils.clamp(speed, 14, targetMax);

      carX += steer * 13.5 * dt;
      carX = THREE.MathUtils.clamp(carX, -5.8, 5.8);

      playerCar.group.position.x = THREE.MathUtils.damp(playerCar.group.position.x, carX, 12, dt);
      playerCar.group.rotation.y = Math.PI - steer * 0.14;
      playerCar.group.rotation.z = THREE.MathUtils.damp(playerCar.group.rotation.z, -steer * 0.06, 10, dt);
      playerCar.wheels.forEach((w) => {
        w.rotation.x += speed * dt * 1.4;
      });

      // Scroll road texture & environment
      roadTex.offset.y -= speed * dt * 0.085;
      distance += speed * dt;
      score += speed * dt * 0.12;

      trees.forEach((t) => {
        t.position.z += speed * dt;
        if (t.position.z > 18) t.position.z -= 240;
      });

      // Checkpoint arch
      archGroup.position.z += speed * dt;
      if (archGroup.position.z > 12) {
        archGroup.position.z -= 120;
        score += 20;
        sound.playCollect();
      }

      // Coins
      coins.forEach((c) => {
        c.position.z += speed * dt;
        c.rotation.y += dt * 3.2;
        if (c.position.z > 10) {
          c.position.z = -130 - Math.random() * 40;
          c.position.x = lanes[Math.floor(Math.random() * 3)];
        }
        if (
          Math.abs(c.position.z - playerCar.group.position.z) < 2.2 &&
          Math.abs(c.position.x - playerCar.group.position.x) < 1.8
        ) {
          sound.playCollect();
          score += 25;
          nitroVal = Math.min(100, nitroVal + 20);
          particles.spawn(c.position.clone(), 0x38bdf8, 12);
          c.position.z = -140 - Math.random() * 40;
          c.position.x = lanes[Math.floor(Math.random() * 3)];
        }
      });

      // Rivals collision
      if (invuln > 0) invuln = Math.max(0, invuln - dt);
      rivals.forEach((rv) => {
        rv.rig.group.position.z += (speed - rv.speed) * dt;
        rv.rig.wheels.forEach((w) => {
          w.rotation.x += rv.speed * dt * 1.2;
        });
        if (rv.rig.group.position.z > 16) {
          rv.rig.group.position.z = -135 - Math.random() * 55;
          rv.rig.group.position.x = lanes[Math.floor(Math.random() * 3)];
        }
        if (
          invuln <= 0 &&
          Math.abs(rv.rig.group.position.z - playerCar.group.position.z) < 3.6 &&
          Math.abs(rv.rig.group.position.x - playerCar.group.position.x) < 1.85
        ) {
          invuln = 1.3;
          health -= 1;
          setHp(health);
          speed = Math.max(15, speed * 0.5);
          sound.playExplosion();
          particles.spawn(playerCar.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xef4444, 20);
          rv.rig.group.position.z = -140;

          if (health <= 0) {
            ended = true;
            callbacksRef.current.onGameOver(
              Math.round(score),
              `Avto to‘qnashuvi! Siz ${Math.round(score)} ball to‘pladingiz.`
            );
          }
        }
      });

      // Lap tracking
      const computedLap = Math.floor(distance / LAP_DISTANCE) + 1;
      if (computedLap > currentLap) {
        currentLap = computedLap;
        if (currentLap > TOTAL_LAPS) {
          ended = true;
          score += 100;
          callbacksRef.current.onScoreChange(Math.round(score));
          callbacksRef.current.onVictory(
            Math.round(score),
            `Chempion! Barcha ${TOTAL_LAPS} aylanani muvaffaqiyatli yakunladingiz!`
          );
          return;
        }
        setLap(currentLap);
        sound.playSuccess();
        callbacksRef.current.onStatusChange?.(`Aylana ${currentLap}/${TOTAL_LAPS}`);
      }

      // Dynamic chase camera FOV & tilt
      const targetFov = boosting ? 72 : 58 + (speed / 60) * 7;
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 6, dt);
      camera.updateProjectionMatrix();
      camera.position.x = THREE.MathUtils.damp(camera.position.x, playerCar.group.position.x * 0.65, 6, dt);
      camera.position.z = 9.4 + (boosting ? 0.6 : 0);
      camera.lookAt(playerCar.group.position.x * 0.4, 1.3, -12);

      // Blink car slightly during invulnerability
      playerCar.group.visible = invuln <= 0 || Math.floor(elapsed * 14) % 2 === 0;
      particles.update(dt);

      hudTimer += dt;
      if (hudTimer > 0.1) {
        hudTimer = 0;
        setSpeedKmh(Math.round(speed * 3.6));
        setNitro(Math.round(nitroVal));
        callbacksRef.current.onScoreChange(Math.round(score));
      }
    }, pausedRef);

    return () => {
      stopLoop();
      engine.dispose();
    };
  }, [quality, carIdx]);

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      {/* Top Racing HUD */}
      <div className="pointer-events-none absolute top-4 inset-x-4 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/88 border border-slate-700/80">
          {CARS.map((c, idx) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                sound.playClick();
                setCarIdx(idx);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                carIdx === idx ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-slate-950/88 border border-slate-700/80 text-white font-mono-num text-xs sm:text-sm">
          <span>
            Aylana: <strong className="text-amber-400">{lap}/{TOTAL_LAPS}</strong>
          </span>
          <span>
            Tezlik: <strong className="text-sky-400">{speedKmh} km/s</strong>
          </span>
          <span>
            Nitro: <strong className="text-emerald-400">{nitro}%</strong>
          </span>
          <span>
            Jon: <strong className="text-rose-400">{hp}/3</strong>
          </span>
        </div>
      </div>

      <TouchControls onKeyState={setKeyState} actionLabel="NITRO" actionKey="Space" />
    </div>
  );
};
