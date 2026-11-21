import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Camera } from 'lucide-react';
import { TouchControls } from '../../components/TouchControls';
import { buildCarModel, buildStylizedTree, createParticleSystem } from '../../engine/models3D';
import { createEngine, createGrassTexture, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

const VEHICLES: { id: string; name: string; color: number; style: 'sport' | 'suv' | 'taxi' }[] = [
  { id: 'super', name: 'Supercar GT', color: 0xef4444, style: 'sport' },
  { id: 'coupe', name: 'Sport Kupe', color: 0x3b82f6, style: 'sport' },
  { id: 'suv', name: 'Yo‘ltanlamas', color: 0x10b981, style: 'suv' },
];

const CAM_MODES = ['Orqa kamera', 'Kapot kamerasi', 'Yuqori ko‘rinish'];
const TARGET_GATES = 10;

export const CarSimulator: React.FC<GameComponentProps> = ({
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

  const [vehicleIdx, setVehicleIdx] = useState(0);
  const [camMode, setCamMode] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [gear, setGear] = useState('N');
  const [gatesPassed, setGatesPassed] = useState(0);

  const camModeRef = useRef(0);
  camModeRef.current = camMode;
  const callbacksRef = useRef({ onScoreChange, onStatusChange, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory };

  const setKeyState = (code: string, pressed: boolean) => {
    keysRef.current[code] = pressed;
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Nazorat nuqtalari: 0/${TARGET_GATES}`);
    const onDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyC' && !e.repeat) {
        sound.playClick();
        setCamMode((m) => (m + 1) % 3);
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
      fogNear: 40,
      fogFar: 160,
    });
    const { scene, camera, renderer } = engine;

    setupThreePointLighting(scene, quality, {
      skyColor: 0xfdba74,
      groundColor: 0x1e293b,
      keyIntensity: 1.6,
      shadowRange: 42,
    });

    // Expansive track grounds
    const grassTex = createGrassTexture(renderer, 26);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(135, 64),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Asphalt circular circuit track (inner r=30, outer r=44)
    const track = new THREE.Mesh(
      new THREE.RingGeometry(29, 45, 72),
      new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.82 })
    );
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.03;
    track.receiveShadow = true;
    scene.add(track);

    // Track lane centerline
    const laneLine = new THREE.Mesh(
      new THREE.RingGeometry(36.8, 37.2, 72),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    laneLine.rotation.x = -Math.PI / 2;
    laneLine.position.y = 0.05;
    scene.add(laneLine);

    // Perimeter trees & trackside pylons
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const t = buildStylizedTree(1.25, 0x166534);
      t.position.set(Math.cos(a) * 53, 0, Math.sin(a) * 53);
      scene.add(t);
    }

    // Selected vehicle
    const vCfg = VEHICLES[vehicleIdx];
    const car = buildCarModel(vCfg.color, 0x111827, vCfg.style);
    car.group.position.set(37, 0, 0);
    car.group.rotation.y = Math.PI;
    scene.add(car.group);

    // Checkpoint gate ring around circuit
    const gateAngles = Array.from({ length: TARGET_GATES }, (_, i) => (i / TARGET_GATES) * Math.PI * 2 + 0.35);
    const gateMesh = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.25, 12, 28, Math.PI),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.4,
      })
    );
    const placeGate = (idx: number) => {
      const a = gateAngles[idx % gateAngles.length];
      gateMesh.position.set(Math.cos(a) * 37, 0.2, Math.sin(a) * 37);
      gateMesh.rotation.y = -a;
    };
    placeGate(0);
    scene.add(gateMesh);

    const particles = createParticleSystem(scene, 72);

    // Realistic planar vehicle physics
    let speed = 0;
    let heading = Math.PI;
    let steerAngle = 0;
    let driftAngle = 0;
    let gateIndex = 0;
    let score = 0;
    let ended = false;
    let hudTick = 0;

    const stopLoop = engine.startLoop((dt) => {
      if (ended) return;
      const k = keysRef.current;

      const throttle = k['KeyW'] || k['ArrowUp'] ? 1 : 0;
      const brake = k['KeyS'] || k['ArrowDown'] ? 1 : 0;
      const steerInput = (k['KeyA'] || k['ArrowLeft'] ? 1 : 0) - (k['KeyD'] || k['ArrowRight'] ? 1 : 0);
      const handbrake = Boolean(k['Space']);

      const maxForward = vCfg.style === 'suv' ? 32 : 42;
      if (throttle) {
        speed += (vCfg.style === 'suv' ? 18 : 24) * dt;
      } else if (brake) {
        speed -= (speed > 0 ? 34 : 14) * dt;
      } else {
        speed *= Math.exp(-1.2 * dt);
      }
      if (handbrake) {
        speed *= Math.exp(-2.2 * dt);
      }
      speed = THREE.MathUtils.clamp(speed, -12, maxForward);

      steerAngle = THREE.MathUtils.damp(steerAngle, steerInput * 0.55, 10, dt);
      const turnRate = (handbrake ? 2.8 : 1.95) * steerAngle * (Math.min(Math.abs(speed), 24) / 14);
      if (Math.abs(speed) > 0.3) {
        heading += turnRate * dt * (speed >= 0 ? 1 : -1);
      }

      // Drift slip visual & score bonus
      const targetDrift = handbrake && Math.abs(speed) > 10 ? steerInput * 0.38 : 0;
      driftAngle = THREE.MathUtils.damp(driftAngle, targetDrift, 6, dt);
      if (Math.abs(driftAngle) > 0.16 && Math.abs(speed) > 10) {
        score += dt * 18;
      }

      car.group.position.x += Math.sin(heading) * speed * dt;
      car.group.position.z += Math.cos(heading) * speed * dt;

      // Soft outer boundary
      const r = Math.hypot(car.group.position.x, car.group.position.z);
      if (r > 50) {
        car.group.position.multiplyScalar(50 / r);
        speed *= 0.6;
      }

      car.group.rotation.y = heading + driftAngle;
      car.frontWheels.forEach((fw) => {
        fw.rotation.y = steerAngle;
      });
      car.wheels.forEach((w) => {
        w.rotation.x += speed * dt * 1.6;
      });

      // Gate check
      if (car.group.position.distanceTo(gateMesh.position) < 5.2) {
        sound.playCollect();
        particles.spawn(gateMesh.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xfacc15, 20);
        gateIndex += 1;
        score += 35;
        setGatesPassed(gateIndex);
        callbacksRef.current.onScoreChange(Math.round(score));
        callbacksRef.current.onStatusChange?.(`Nazorat nuqtalari: ${gateIndex}/${TARGET_GATES}`);

        if (gateIndex >= TARGET_GATES) {
          ended = true;
          callbacksRef.current.onVictory(
            Math.round(score),
            `Professional haydovchi! Barcha ${TARGET_GATES} ta nazorat nuqtasidan o‘tdingiz!`
          );
          return;
        }
        placeGate(gateIndex);
      }

      // Camera modes
      const mode = camModeRef.current;
      if (mode === 0) {
        const cx = car.group.position.x - Math.sin(heading) * 9.5;
        const cz = car.group.position.z - Math.cos(heading) * 9.5;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, cx, 6, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, 4.2, 6, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, cz, 6, dt);
        camera.lookAt(
          car.group.position.x + Math.sin(heading) * 6,
          1.2,
          car.group.position.z + Math.cos(heading) * 6
        );
      } else if (mode === 1) {
        // Hood / Cockpit cam
        camera.position.set(
          car.group.position.x + Math.sin(heading) * 0.7,
          1.75,
          car.group.position.z + Math.cos(heading) * 0.7
        );
        camera.lookAt(
          car.group.position.x + Math.sin(heading) * 20,
          1.4,
          car.group.position.z + Math.cos(heading) * 20
        );
      } else {
        // High Tactical Cam
        camera.position.x = THREE.MathUtils.damp(camera.position.x, car.group.position.x - Math.sin(heading) * 16, 5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, 18, 5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, car.group.position.z - Math.cos(heading) * 16, 5, dt);
        camera.lookAt(car.group.position.x, 0.5, car.group.position.z);
      }

      particles.update(dt);

      hudTick += dt;
      if (hudTick > 0.1) {
        hudTick = 0;
        const kmh = Math.abs(Math.round(speed * 3.8));
        setSpeedKmh(kmh);
        setGear(speed < -0.5 ? 'R' : kmh < 5 ? 'N' : kmh < 35 ? '1' : kmh < 70 ? '2' : kmh < 110 ? '3' : '4');
        callbacksRef.current.onScoreChange(Math.round(score));
      }
    }, pausedRef);

    return () => {
      stopLoop();
      engine.dispose();
    };
  }, [quality, vehicleIdx]);

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      <div className="pointer-events-none absolute top-4 inset-x-4 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/88 border border-slate-700/80">
          {VEHICLES.map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                sound.playClick();
                setVehicleIdx(i);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                vehicleIdx === i ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {v.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setCamMode((m) => (m + 1) % 3);
            }}
            className="ml-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            {CAM_MODES[camMode]}
          </button>
        </div>

        <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-slate-950/88 border border-slate-700/80 text-white font-mono-num text-xs sm:text-sm">
          <span>
            Tezlik: <strong className="text-amber-400">{speedKmh} km/s</strong>
          </span>
          <span>
            Uzatma: <strong className="text-sky-400">{gear}</strong>
          </span>
          <span>
            Halqalar: <strong className="text-emerald-400">{gatesPassed}/{TARGET_GATES}</strong>
          </span>
        </div>
      </div>

      <TouchControls onKeyState={setKeyState} actionLabel="DRIFT" actionKey="Space" />
    </div>
  );
};
