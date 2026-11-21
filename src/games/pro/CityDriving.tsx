import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TouchControls } from '../../components/TouchControls';
import { buildCarModel, buildStylizedTree, createParticleSystem } from '../../engine/models3D';
import { createEngine, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

const TOTAL_MISSIONS = 5;
const CITY_CARS: { name: string; color: number; style: 'taxi' | 'sport' | 'suv' }[] = [
  { name: 'Shahar Taksi', color: 0xfacc15, style: 'taxi' },
  { name: 'Sport Sedan', color: 0x0ea5e9, style: 'sport' },
  { name: 'Krossover', color: 0xf97316, style: 'suv' },
];

const DELIVERY_SPOTS: [number, number][] = [
  [30, -30],
  [-30, -30],
  [-30, 30],
  [30, 30],
  [0, -30],
  [0, 30],
  [30, 0],
  [-30, 0],
];

export const CityDriving: React.FC<GameComponentProps> = ({
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

  const [carIdx, setCarIdx] = useState(0);
  const [missionsDone, setMissionsDone] = useState(0);
  const [distMeters, setDistMeters] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(0);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory };

  const setKeyState = (code: string, pressed: boolean) => {
    keysRef.current[code] = pressed;
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Missiya: 0/${TOTAL_MISSIONS}`);
    const onDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyM' && !e.repeat) {
        sound.playClick();
        setCarIdx((i) => (i + 1) % CITY_CARS.length);
      }
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
      fov: 58,
      background: 0x0f172a,
      fogColor: 0x0f172a,
      fogNear: 35,
      fogFar: 135,
    });
    const { scene, camera } = engine;

    setupThreePointLighting(scene, quality, {
      skyColor: 0x93c5fd,
      groundColor: 0x1e293b,
      keyIntensity: 1.5,
      shadowRange: 44,
    });

    // City Asphalt Base Plane
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.85 })
    );
    base.rotation.x = -Math.PI / 2;
    base.receiveShadow = true;
    scene.add(base);

    // Build Grid City Blocks (streets at x,z = -30, 0, 30)
    const blockCoords = [-45, -15, 15, 45];
    const buildingBounds: { x: number; z: number; halfW: number }[] = [];
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const palette = [0x334155, 0x1e293b, 0x3b4d6b, 0x2c3e50];
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.9,
    });

    blockCoords.forEach((bx, ix) => {
      blockCoords.forEach((bz, iz) => {
        // Sidewalk island
        const pad = new THREE.Mesh(new THREE.BoxGeometry(19, 0.25, 19), sidewalkMat);
        pad.position.set(bx, 0.12, bz);
        pad.receiveShadow = true;
        scene.add(pad);

        // Skyscraper
        const h = 8 + ((ix * 5 + iz * 7) % 14);
        const bMat = new THREE.MeshStandardMaterial({
          color: palette[(ix + iz) % palette.length],
          roughness: 0.55,
          metalness: 0.25,
        });
        const tower = new THREE.Mesh(new THREE.BoxGeometry(13.5, h, 13.5), bMat);
        tower.position.set(bx, h / 2 + 0.2, bz);
        tower.castShadow = true;
        tower.receiveShadow = true;
        scene.add(tower);

        // Lit roof trim strip
        const trim = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.4, 13.8), winMat);
        trim.position.set(bx, h - 0.6, bz);
        scene.add(trim);

        // Park tree on corner
        const tree = buildStylizedTree(0.75, 0x16a34a);
        tree.position.set(bx + 7.8, 0.22, bz + 7.8);
        scene.add(tree);

        buildingBounds.push({ x: bx, z: bz, halfW: 8.6 });
      });
    });

    // Traffic AI cars cruising along main avenues
    const traffic: { rig: ReturnType<typeof buildCarModel>; axis: 'x' | 'z'; lane: number; dir: number; speed: number }[] = [];
    const trafficSpecs: { axis: 'x' | 'z'; lane: number; dir: number; color: number }[] = [
      { axis: 'z', lane: 2.2, dir: -1, color: 0xef4444 },
      { axis: 'z', lane: -2.2, dir: 1, color: 0x22c55e },
      { axis: 'x', lane: 32.2, dir: -1, color: 0xa855f7 },
      { axis: 'x', lane: -27.8, dir: 1, color: 0x38bdf8 },
    ];
    trafficSpecs.forEach((sp, i) => {
      const rig = buildCarModel(sp.color, 0x0f172a, 'sport');
      if (sp.axis === 'z') {
        rig.group.position.set(sp.lane, 0, (i - 1) * 28);
        rig.group.rotation.y = sp.dir > 0 ? 0 : Math.PI;
      } else {
        rig.group.position.set((i - 1) * 28, 0, sp.lane);
        rig.group.rotation.y = sp.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      scene.add(rig.group);
      traffic.push({ rig, axis: sp.axis, lane: sp.lane, dir: sp.dir, speed: 9 + i * 1.4 });
    });

    // Player Car
    const cfg = CITY_CARS[carIdx];
    const car = buildCarModel(cfg.color, 0x0f172a, cfg.style);
    car.group.position.set(0, 0, 12);
    car.group.rotation.y = Math.PI;
    scene.add(car.group);

    // Direction guide arrow hovering above player car
    const guideArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.5 })
    );
    guideArrow.rotation.x = Math.PI / 2;
    scene.add(guideArrow);

    // Glowing green delivery target zone
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 14, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    scene.add(beacon);

    let missionIdx = 0;
    const setBeaconPos = (idx: number) => {
      const [tx, tz] = DELIVERY_SPOTS[idx % DELIVERY_SPOTS.length];
      beacon.position.set(tx, 7, tz);
    };
    setBeaconPos(0);

    const particles = createParticleSystem(scene, 72);

    let speed = 0;
    let heading = Math.PI;
    let score = 0;
    let ended = false;
    let hudTick = 0;

    const stopLoop = engine.startLoop((dt) => {
      if (ended) return;
      const k = keysRef.current;

      const accel = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
      const steer = (k['KeyA'] || k['ArrowLeft'] ? 1 : 0) - (k['KeyD'] || k['ArrowRight'] ? 1 : 0);

      speed += (accel > 0 ? 22 : accel < 0 ? -28 : 0) * dt;
      if (accel === 0) speed *= Math.exp(-2.2 * dt);
      speed = THREE.MathUtils.clamp(speed, -10, 28);

      if (Math.abs(speed) > 0.25) {
        heading += steer * 2.3 * dt * (speed >= 0 ? 1 : -1);
      }

      const nextX = THREE.MathUtils.clamp(car.group.position.x + Math.sin(heading) * speed * dt, -56, 56);
      const nextZ = THREE.MathUtils.clamp(car.group.position.z + Math.cos(heading) * speed * dt, -56, 56);

      // Building collision check
      let hitBuilding = false;
      for (const b of buildingBounds) {
        if (Math.abs(nextX - b.x) < b.halfW + 1.1 && Math.abs(nextZ - b.z) < b.halfW + 1.1) {
          hitBuilding = true;
          break;
        }
      }
      if (!hitBuilding) {
        car.group.position.x = nextX;
        car.group.position.z = nextZ;
      } else {
        speed = -speed * 0.35;
        sound.playBounce();
      }

      car.group.rotation.y = heading;
      car.wheels.forEach((w) => {
        w.rotation.x += speed * dt * 1.5;
      });

      // Traffic AI update
      traffic.forEach((t) => {
        if (t.axis === 'z') {
          t.rig.group.position.z += t.dir * t.speed * dt;
          if (t.rig.group.position.z > 55) t.rig.group.position.z = -55;
          if (t.rig.group.position.z < -55) t.rig.group.position.z = 55;
        } else {
          t.rig.group.position.x += t.dir * t.speed * dt;
          if (t.rig.group.position.x > 55) t.rig.group.position.x = -55;
          if (t.rig.group.position.x < -55) t.rig.group.position.x = 55;
        }
        if (t.rig.group.position.distanceTo(car.group.position) < 3.2) {
          speed *= -0.3;
          sound.playBounce();
        }
      });

      // Guide arrow points toward beacon
      guideArrow.position.set(car.group.position.x, 2.85, car.group.position.z);
      const dx = beacon.position.x - car.group.position.x;
      const dz = beacon.position.z - car.group.position.z;
      const dist = Math.hypot(dx, dz);
      guideArrow.rotation.set(0, Math.atan2(dx, dz), 0);
      guideArrow.rotateX(Math.PI / 2);

      // Mission delivery check
      if (dist < 4.2) {
        sound.playSuccess();
        particles.spawn(new THREE.Vector3(beacon.position.x, 1.5, beacon.position.z), 0x22c55e, 24);
        missionIdx += 1;
        score += 60;
        setMissionsDone(missionIdx);
        callbacksRef.current.onScoreChange(score);
        callbacksRef.current.onStatusChange?.(`Missiya: ${missionIdx}/${TOTAL_MISSIONS}`);

        if (missionIdx >= TOTAL_MISSIONS) {
          ended = true;
          callbacksRef.current.onVictory(
            score,
            `Shahar ustasi! Barcha ${TOTAL_MISSIONS} ta yetkazib berish missiyasini bajardingiz!`
          );
          return;
        }
        setBeaconPos(missionIdx);
      }

      // Smooth chase camera
      const cx = car.group.position.x - Math.sin(heading) * 11;
      const cz = car.group.position.z - Math.cos(heading) * 11;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, cx, 5.5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 6.2, 5.5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, cz, 5.5, dt);
      camera.lookAt(car.group.position.x, 1.4, car.group.position.z);

      particles.update(dt);

      hudTick += dt;
      if (hudTick > 0.12) {
        hudTick = 0;
        setDistMeters(Math.round(dist));
        setSpeedKmh(Math.abs(Math.round(speed * 3.6)));
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

      <div className="pointer-events-none absolute top-4 inset-x-4 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/88 border border-slate-700/80">
          {CITY_CARS.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                sound.playClick();
                setCarIdx(i);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                carIdx === i ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-slate-950/88 border border-slate-700/80 text-white font-mono-num text-xs sm:text-sm">
          <span>
            Missiya: <strong className="text-emerald-400">{missionsDone}/{TOTAL_MISSIONS}</strong>
          </span>
          <span>
            Manzilgacha: <strong className="text-amber-400">{distMeters} m</strong>
          </span>
          <span>
            Tezlik: <strong className="text-sky-400">{speedKmh} km/s</strong>
          </span>
        </div>
      </div>

      <TouchControls onKeyState={setKeyState} />
    </div>
  );
};
