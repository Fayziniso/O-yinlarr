import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TouchControls } from '../../components/TouchControls';
import {
  buildCarModel,
  buildDinosaur,
  buildStylizedTree,
  createParticleSystem,
  DinoSpecies,
} from '../../engine/models3D';
import { createEngine, createGrassTexture, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

interface DinoSpot {
  id: DinoSpecies;
  name: string;
  fact: string;
  pos: [number, number];
}

const DINOS: DinoSpot[] = [
  {
    id: 'trex',
    name: 'Tirannozavr (T-Rex)',
    fact: 'Eng mashhur yirtqich dinozavr — uzunligi 12 metrgacha yetgan!',
    pos: [-16, -14],
  },
  {
    id: 'triceratops',
    name: 'Tritseratops',
    fact: 'Uchta kuchli shoxi va katta qalqonsimon boshi bilan tanilgan.',
    pos: [18, -12],
  },
  {
    id: 'stegosaurus',
    name: 'Stegozavr',
    fact: 'Orqasidagi plastinkalar tana haroratini boshqarishga yordam bergan.',
    pos: [16, 16],
  },
  {
    id: 'brachiosaurus',
    name: 'Braxiozavr',
    fact: 'Baland daraxtlar barglarini yeydigan ulkan uzun bo‘yinli dinozavr!',
    pos: [-18, 14],
  },
  {
    id: 'pteranodon',
    name: 'Pteranodon',
    fact: 'Qadimgi osmonlarda qanot qoqib uchgan ulkan uchar sudraluvchi.',
    pos: [0, -24],
  },
];

export const DinozavrlarOlami: React.FC<GameComponentProps> = ({
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

  const [foundIds, setFoundIds] = useState<DinoSpecies[]>([]);
  const [activeFact, setActiveFact] = useState<{ name: string; fact: string } | null>(null);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory };

  const setKeyState = (code: string, pressed: boolean) => {
    keysRef.current[code] = pressed;
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Kashf etildi: 0/${DINOS.length}`);
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
      fov: 54,
      background: 0xbae6fd,
      fogColor: 0xbae6fd,
      fogNear: 24,
      fogFar: 90,
    });
    const { scene, camera, renderer } = engine;

    setupThreePointLighting(scene, quality, {
      skyColor: 0xe0f2fe,
      groundColor: 0x166534,
      keyIntensity: 1.55,
      shadowRange: 34,
    });

    // Prehistoric valley ground
    const grassTex = createGrassTexture(renderer, 20);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(75, 48),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Distant volcano landmark
    const volcano = new THREE.Mesh(
      new THREE.ConeGeometry(16, 20, 12),
      new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9 })
    );
    volcano.position.set(0, 9.5, -52);
    scene.add(volcano);
    const lavaCap = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 3.4, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 1.6 })
    );
    lavaCap.position.set(0, 19.2, -52);
    scene.add(lavaCap);

    // Perimeter trees & rocks (natural outdoor boundary)
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      const r = 34 + (i % 3) * 4;
      const tree = buildStylizedTree(1.1 + (i % 3) * 0.3, i % 2 === 0 ? 0x15803d : 0x16a34a);
      tree.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
      scene.add(tree);
    }

    // Explorer Rover
    const rover = buildCarModel(0xf59e0b, 0x1e293b, 'suv');
    rover.group.scale.setScalar(0.75);
    rover.group.position.set(0, 0, 8);
    rover.group.rotation.y = Math.PI;
    scene.add(rover.group);

    // Place 5 composite 3D dinosaurs + discovery beacons
    const dinoEntities = DINOS.map((d) => {
      const model = buildDinosaur(d.id);
      model.position.set(d.pos[0], 0, d.pos[1]);
      model.lookAt(0, 0, 0);
      scene.add(model);

      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.65, 9, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xfacc15,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      beacon.position.set(d.pos[0], 4.5, d.pos[1]);
      scene.add(beacon);

      return { info: d, model, beacon, discovered: false };
    });

    const particles = createParticleSystem(scene, 64);
    let speed = 0;
    let heading = Math.PI;
    let score = 0;
    let discoveredCount = 0;
    let won = false;

    const stopLoop = engine.startLoop((dt, elapsed) => {
      const k = keysRef.current;
      const accel = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
      const steer = (k['KeyA'] || k['ArrowLeft'] ? 1 : 0) - (k['KeyD'] || k['ArrowRight'] ? 1 : 0);

      speed += accel * 22 * dt;
      speed *= Math.exp(-3.2 * dt);
      speed = THREE.MathUtils.clamp(speed, -8, 14);

      if (Math.abs(speed) > 0.2) {
        heading += steer * 2.2 * dt * (speed >= 0 ? 1 : -1);
      }

      rover.group.position.x += Math.sin(heading) * speed * dt;
      rover.group.position.z += Math.cos(heading) * speed * dt;

      // Natural valley clamp
      const distFromCenter = Math.hypot(rover.group.position.x, rover.group.position.z);
      if (distFromCenter > 31) {
        rover.group.position.multiplyScalar(31 / distFromCenter);
      }

      rover.group.rotation.y = heading;
      rover.wheels.forEach((w) => {
        w.rotation.x += speed * dt * 2.1;
      });

      // Animate dinos & check discovery proximity
      dinoEntities.forEach((de, idx) => {
        if (de.info.id === 'pteranodon') {
          de.model.position.y = Math.sin(elapsed * 2.5) * 0.7;
          de.model.rotation.y = elapsed * 0.4;
        } else {
          de.model.rotation.y += Math.sin(elapsed + idx) * dt * 0.25;
        }
        de.beacon.rotation.y += dt * 1.2;

        if (!de.discovered) {
          const d = Math.hypot(
            rover.group.position.x - de.info.pos[0],
            rover.group.position.z - de.info.pos[1]
          );
          if (d < 5.5) {
            de.discovered = true;
            de.beacon.visible = false;
            discoveredCount += 1;
            score += 40;
            sound.playSuccess();
            particles.spawn(new THREE.Vector3(de.info.pos[0], 2.5, de.info.pos[1]), 0x4ade80, 22);
            callbacksRef.current.onScoreChange(score);
            callbacksRef.current.onStatusChange?.(`Kashf etildi: ${discoveredCount}/${DINOS.length}`);
            setFoundIds((prev) => [...prev, de.info.id]);
            setActiveFact({ name: de.info.name, fact: de.info.fact });

            if (discoveredCount >= DINOS.length && !won) {
              won = true;
              window.setTimeout(() => {
                callbacksRef.current.onVictory(
                  score,
                  `Ajoyib ekspeditsiya! Barcha ${DINOS.length} ta dinozavrni topdingiz!`
                );
              }, 1400);
            }
          }
        }
      });

      // Smooth third-person chase camera
      const camX = rover.group.position.x - Math.sin(heading) * 10.5;
      const camZ = rover.group.position.z - Math.cos(heading) * 10.5;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, camX, 5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 5.8, 5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, camZ, 5, dt);
      camera.lookAt(rover.group.position.x, 1.4, rover.group.position.z);

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

      {/* Top Discovery Progress */}
      <div className="pointer-events-none absolute top-4 inset-x-4 flex flex-col items-center gap-2 z-10">
        <div className="px-4 py-2 rounded-xl bg-slate-950/88 border border-slate-700/80 text-white text-xs sm:text-sm font-medium">
          Sariq nurlar tomon haydang · Topilgan dinozavrlar:{' '}
          <span className="font-mono-num font-bold text-emerald-400">
            {foundIds.length}/{DINOS.length}
          </span>
        </div>

        {activeFact && (
          <div className="max-w-md px-5 py-3 rounded-2xl bg-emerald-950/92 border border-emerald-400/60 text-white text-center">
            <p className="font-display font-extrabold text-emerald-300 text-base">
              {activeFact.name} topildi!
            </p>
            <p className="text-xs sm:text-sm text-emerald-100 mt-0.5">{activeFact.fact}</p>
          </div>
        )}
      </div>

      <TouchControls onKeyState={setKeyState} />
    </div>
  );
};
