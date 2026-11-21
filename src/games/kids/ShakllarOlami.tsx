import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createParticleSystem } from '../../engine/models3D';
import { createEngine, createWoodFloorTexture, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

type ShapeType = 'kub' | 'shar' | 'konus' | 'silindr' | 'piramida';

interface ShapeDef {
  id: ShapeType;
  label: string;
  color: number;
  css: string;
}

const LEVELS: ShapeDef[][] = [
  [
    { id: 'kub', label: 'Kub', color: 0x3b82f6, css: '#3b82f6' },
    { id: 'shar', label: 'Shar', color: 0xef4444, css: '#ef4444' },
    { id: 'konus', label: 'Konus', color: 0x10b981, css: '#10b981' },
  ],
  [
    { id: 'kub', label: 'Kub', color: 0x6366f1, css: '#6366f1' },
    { id: 'silindr', label: 'Silindr', color: 0xf59e0b, css: '#f59e0b' },
    { id: 'shar', label: 'Shar', color: 0xec4899, css: '#ec4899' },
    { id: 'piramida', label: 'Piramida', color: 0x14b8a6, css: '#14b8a6' },
  ],
  [
    { id: 'piramida', label: 'Piramida', color: 0x8b5cf6, css: '#8b5cf6' },
    { id: 'kub', label: 'Kub', color: 0x0ea5e9, css: '#0ea5e9' },
    { id: 'konus', label: 'Konus', color: 0x22c55e, css: '#22c55e' },
    { id: 'silindr', label: 'Silindr', color: 0xf97316, css: '#f97316' },
    { id: 'shar', label: 'Shar', color: 0xf43f5e, css: '#f43f5e' },
  ],
];

function createShapeGeo(id: ShapeType): THREE.BufferGeometry {
  switch (id) {
    case 'kub':
      return new THREE.BoxGeometry(1.15, 1.15, 1.15);
    case 'shar':
      return new THREE.SphereGeometry(0.68, 22, 18);
    case 'konus':
      return new THREE.ConeGeometry(0.7, 1.3, 20);
    case 'silindr':
      return new THREE.CylinderGeometry(0.58, 0.58, 1.2, 20);
    case 'piramida':
      return new THREE.ConeGeometry(0.78, 1.25, 4);
  }
}

export const ShakllarOlami: React.FC<GameComponentProps> = ({
  quality,
  isPaused,
  onScoreChange,
  onStatusChange,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;

  const [levelIdx, setLevelIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<ShapeType | null>(null);
  const [matchedIds, setMatchedIds] = useState<ShapeType[]>([]);
  const [hint, setHint] = useState('Pastdagi 3D shaklni tanlang va mos uyasiga bosing!');

  const levelRef = useRef(0);
  const selectedRef = useRef<ShapeType | null>(null);
  selectedRef.current = selectedId;
  const matchedRef = useRef<ShapeType[]>([]);
  matchedRef.current = matchedIds;
  const scoreRef = useRef(0);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory };

  const rebuildLevelRef = useRef<((lvl: number) => void) | null>(null);
  const snapShapeRef = useRef<((id: ShapeType) => void) | null>(null);

  const tryPlace = (slotId: ShapeType) => {
    if (pausedRef.current) return;
    if (!selectedRef.current) {
      setHint('Avval pastdagi yorqin shaklni bosing!');
      return;
    }
    if (matchedRef.current.includes(slotId)) return;

    if (selectedRef.current === slotId) {
      sound.playSuccess();
      scoreRef.current += 20;
      callbacksRef.current.onScoreChange(scoreRef.current);
      const nextMatched = [...matchedRef.current, slotId];
      setMatchedIds(nextMatched);
      setSelectedId(null);
      snapShapeRef.current?.(slotId);
      setHint('Ajoyib moslik! Davom eting!');

      const currentShapes = LEVELS[levelRef.current];
      if (nextMatched.length >= currentShapes.length) {
        window.setTimeout(() => {
          if (levelRef.current + 1 >= LEVELS.length) {
            callbacksRef.current.onVictory(
              scoreRef.current,
              'Barcha 3D shakllar olamini muvaffaqiyatli yakunladingiz!'
            );
          } else {
            levelRef.current += 1;
            setLevelIdx(levelRef.current);
            setMatchedIds([]);
            setSelectedId(null);
            rebuildLevelRef.current?.(levelRef.current);
            callbacksRef.current.onStatusChange?.(`Bosqich ${levelRef.current + 1}/${LEVELS.length}`);
            setHint('Yangi bosqich! Shakllarni joylashtiring.');
          }
        }, 950);
      }
    } else {
      sound.playError();
      setHint('Bu siluet boshqa shakl uchun. Boshqa uyani tanlang!');
    }
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Bosqich 1/${LEVELS.length}`);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = createEngine(container, quality, {
      fov: 46,
      background: 0xeff6ff,
      fogColor: 0xeff6ff,
      fogNear: 22,
      fogFar: 55,
    });
    const { scene, camera, renderer } = engine;
    camera.position.set(0, 7.2, 10.6);
    camera.lookAt(0, 0.5, 0);

    setupThreePointLighting(scene, quality, {
      skyColor: 0xffffff,
      groundColor: 0xfde68a,
      keyIntensity: 1.45,
    });

    // Wooden Montessori sorting table
    const woodTex = createWoodFloorTexture(renderer, 3);
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(13.5, 0.5, 7.2),
      new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.65 })
    );
    table.position.y = -0.25;
    table.receiveShadow = true;
    scene.add(table);

    const particles = createParticleSystem(scene, 56);
    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    const pieceMeshes = new Map<ShapeType, THREE.Mesh>();
    const targetPositions = new Map<ShapeType, THREE.Vector3>();
    const snappedSet = new Set<ShapeType>();

    const buildLevel = (lvl: number) => {
      while (dynamicGroup.children.length > 0) {
        dynamicGroup.remove(dynamicGroup.children[0]);
      }
      pieceMeshes.clear();
      targetPositions.clear();
      snappedSet.clear();

      const defs = LEVELS[lvl];
      const shuffledPieces = [...defs].sort(() => Math.random() - 0.5);
      const spacing = defs.length === 3 ? 3.4 : defs.length === 4 ? 2.8 : 2.35;
      const startX = -((defs.length - 1) * spacing) / 2;

      // Top row: Silhouette target slots
      defs.forEach((d, i) => {
        const x = startX + i * spacing;
        const z = -1.65;
        const pad = new THREE.Mesh(
          new THREE.CylinderGeometry(0.95, 1.02, 0.14, 24),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 })
        );
        pad.position.set(x, 0.07, z);
        pad.userData.slotId = d.id;
        dynamicGroup.add(pad);

        // Translucent silhouette wireframe
        const ghost = new THREE.Mesh(
          createShapeGeo(d.id),
          new THREE.MeshStandardMaterial({
            color: 0x334155,
            transparent: true,
            opacity: 0.34,
            roughness: 0.5,
          })
        );
        ghost.position.set(x, 0.85, z);
        ghost.userData.slotId = d.id;
        dynamicGroup.add(ghost);

        targetPositions.set(d.id, new THREE.Vector3(x, 0.85, z));
      });

      // Bottom row: Draggable / clickable colorful 3D pieces
      shuffledPieces.forEach((d, i) => {
        const x = startX + i * spacing;
        const z = 1.9;
        const mesh = new THREE.Mesh(
          createShapeGeo(d.id),
          new THREE.MeshPhysicalMaterial({
            color: d.color,
            roughness: 0.22,
            metalness: 0.1,
            clearcoat: 0.8,
          })
        );
        mesh.position.set(x, 0.85, z);
        mesh.castShadow = true;
        mesh.userData.pieceId = d.id;
        dynamicGroup.add(mesh);
        pieceMeshes.set(d.id, mesh);
      });
    };

    buildLevel(0);
    rebuildLevelRef.current = buildLevel;
    snapShapeRef.current = (id) => {
      snappedSet.add(id);
      const tPos = targetPositions.get(id);
      if (tPos) {
        particles.spawn(tPos.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xfacc15, 18);
      }
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onPointerDown = (e: PointerEvent) => {
      if (pausedRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(dynamicGroup.children, true);
      if (hits.length === 0) return;

      const hit = hits[0].object;
      if (hit.userData.pieceId) {
        const pid = hit.userData.pieceId as ShapeType;
        if (!matchedRef.current.includes(pid)) {
          sound.playSelect();
          setSelectedId(pid);
          setHint(`"${LEVELS[levelRef.current].find((s) => s.id === pid)?.label}" tanlandi — endi yuqoridagi mos siluetga bosing!`);
        }
      } else if (hit.userData.slotId) {
        tryPlace(hit.userData.slotId as ShapeType);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const stopLoop = engine.startLoop((dt, elapsed) => {
      pieceMeshes.forEach((mesh, id) => {
        const isSnapped = snappedSet.has(id);
        const isSelected = selectedRef.current === id;
        if (isSnapped) {
          const target = targetPositions.get(id);
          if (target) {
            mesh.position.lerp(target, 1 - Math.exp(-10 * dt));
          }
          mesh.rotation.y += dt * 0.5;
          mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, 1, 8, dt));
        } else {
          mesh.rotation.y += dt * (isSelected ? 2.4 : 0.9);
          const targetY = isSelected ? 1.55 + Math.sin(elapsed * 5) * 0.12 : 0.85;
          mesh.position.y = THREE.MathUtils.damp(mesh.position.y, targetY, 8, dt);
          mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, isSelected ? 1.18 : 1, 8, dt));
        }
      });
      particles.update(dt);
    }, pausedRef);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      stopLoop();
      engine.dispose();
    };
  }, [quality]);

  const currentDefs = LEVELS[levelIdx];

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      <div className="pointer-events-none absolute top-4 inset-x-4 flex justify-center z-10">
        <div className="px-5 py-2.5 rounded-2xl bg-slate-950/88 border border-slate-700/80 text-white text-center">
          <p className="text-xs font-mono-num text-amber-400">
            Bosqich {levelIdx + 1}/{LEVELS.length} · Joylashtirildi: {matchedIds.length}/{currentDefs.length}
          </p>
          <p className="font-display text-sm sm:text-lg font-bold mt-0.5">{hint}</p>
        </div>
      </div>

      {/* Helper tactile selector bar */}
      <div className="absolute bottom-4 inset-x-4 z-10 flex justify-center">
        <div className="flex flex-wrap justify-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-950/85 border border-slate-700/80">
          {currentDefs.map((s) => {
            const done = matchedIds.includes(s.id);
            const active = selectedId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={done}
                onClick={() => {
                  if (selectedId && selectedId !== s.id) {
                    tryPlace(s.id);
                  } else {
                    sound.playSelect();
                    setSelectedId(s.id);
                    setHint(`"${s.label}" tanlandi — yuqoridagi siluetga bosing!`);
                  }
                }}
                className={`px-3.5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  done
                    ? 'bg-emerald-600/40 text-emerald-200 line-through opacity-60 cursor-default'
                    : active
                    ? 'bg-amber-400 text-slate-950 scale-105'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
