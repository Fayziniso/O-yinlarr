import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RotateCw } from 'lucide-react';
import { createParticleSystem } from '../../engine/models3D';
import { createEngine, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

interface PuzzlePieceDef {
  id: string;
  label: string;
  kind: 'box' | 'cyl' | 'cone' | 'arch';
  size: [number, number, number];
  targetPos: [number, number, number];
  targetRotStep: number; // 0, 1, 2, 3 (x 90 deg)
  color: number;
}

interface BlueprintDef {
  name: string;
  pieces: PuzzlePieceDef[];
}

const BLUEPRINTS: BlueprintDef[] = [
  {
    name: 'Kosmik Raketa',
    pieces: [
      { id: 'base', label: 'Tayanch', kind: 'cyl', size: [1.3, 1.0, 1.3], targetPos: [0, 0.5, 0], targetRotStep: 0, color: 0x334155 },
      { id: 'body', label: 'Korpus', kind: 'cyl', size: [1.05, 2.2, 1.05], targetPos: [0, 2.1, 0], targetRotStep: 0, color: 0xe2e8f0 },
      { id: 'wingL', label: 'Chap qanot', kind: 'box', size: [1.1, 1.2, 0.28], targetPos: [-1.25, 0.85, 0], targetRotStep: 0, color: 0xef4444 },
      { id: 'wingR', label: "O'ng qanot", kind: 'box', size: [1.1, 1.2, 0.28], targetPos: [1.25, 0.85, 0], targetRotStep: 0, color: 0xef4444 },
      { id: 'nose', label: 'Uch qismi', kind: 'cone', size: [1.08, 1.7, 1.08], targetPos: [0, 4.05, 0], targetRotStep: 0, color: 0xf59e0b },
    ],
  },
  {
    name: 'Registon Darvozasi',
    pieces: [
      { id: 'leftPillar', label: 'Chap ustun', kind: 'box', size: [1.1, 2.8, 1.1], targetPos: [-1.8, 1.4, 0], targetRotStep: 0, color: 0x0284c7 },
      { id: 'rightPillar', label: "O'ng ustun", kind: 'box', size: [1.1, 2.8, 1.1], targetPos: [1.8, 1.4, 0], targetRotStep: 0, color: 0x0284c7 },
      { id: 'topBeam', label: 'Peshtoq', kind: 'box', size: [4.8, 0.95, 1.2], targetPos: [0, 3.25, 0], targetRotStep: 0, color: 0x0ea5e9 },
      { id: 'dome', label: 'Gumbaz', kind: 'cone', size: [1.4, 1.6, 1.4], targetPos: [0, 4.5, 0], targetRotStep: 0, color: 0xfacc15 },
    ],
  },
  {
    name: 'Qal’a Minorasi',
    pieces: [
      { id: 'wall', label: 'Asos devor', kind: 'box', size: [3.2, 1.6, 2.4], targetPos: [0, 0.8, 0], targetRotStep: 0, color: 0xd97706 },
      { id: 'towerL', label: 'Chap minora', kind: 'cyl', size: [0.7, 2.8, 0.7], targetPos: [-1.7, 1.4, 0], targetRotStep: 0, color: 0xb45309 },
      { id: 'towerR', label: "O'ng minora", kind: 'cyl', size: [0.7, 2.8, 0.7], targetPos: [1.7, 1.4, 0], targetRotStep: 0, color: 0xb45309 },
      { id: 'roofL', label: 'Chap tom', kind: 'cone', size: [0.85, 1.2, 0.85], targetPos: [-1.7, 3.4, 0], targetRotStep: 0, color: 0xef4444 },
      { id: 'roofR', label: "O'ng tom", kind: 'cone', size: [0.85, 1.2, 0.85], targetPos: [1.7, 3.4, 0], targetRotStep: 0, color: 0xef4444 },
    ],
  },
];

function makeGeo(p: PuzzlePieceDef): THREE.BufferGeometry {
  if (p.kind === 'cyl') return new THREE.CylinderGeometry(p.size[0], p.size[0], p.size[1], 18);
  if (p.kind === 'cone') return new THREE.ConeGeometry(p.size[0], p.size[1], 18);
  return new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]);
}

export const Puzzle3D: React.FC<GameComponentProps> = ({
  quality,
  isPaused,
  onScoreChange,
  onStatusChange,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;

  const [bpIdx, setBpIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [rotStep, setRotStep] = useState(0);
  const [tip, setTip] = useState('Pastki qismni tanlang va shaffof joyiga bosing!');

  const bpRef = useRef(0);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;
  const placedRef = useRef<string[]>([]);
  placedRef.current = placedIds;
  const rotRef = useRef(0);
  rotRef.current = rotStep;
  const scoreRef = useRef(0);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory };

  const rebuildRef = useRef<((idx: number) => void) | null>(null);
  const snapRef = useRef<((id: string) => void) | null>(null);

  const rotateSelected = () => {
    sound.playClick();
    setRotStep((r) => (r + 1) % 4);
  };

  const tryPlace = (slotId: string) => {
    if (pausedRef.current || !selectedRef.current) return;
    if (placedRef.current.includes(slotId)) return;

    if (selectedRef.current === slotId) {
      sound.playSuccess();
      scoreRef.current += 25;
      callbacksRef.current.onScoreChange(scoreRef.current);
      const nextPlaced = [...placedRef.current, slotId];
      setPlacedIds(nextPlaced);
      setSelectedId(null);
      setRotStep(0);
      snapRef.current?.(slotId);
      setTip('Qism aniq joylashdi!');

      const bp = BLUEPRINTS[bpRef.current];
      if (nextPlaced.length >= bp.pieces.length) {
        window.setTimeout(() => {
          if (bpRef.current + 1 >= BLUEPRINTS.length) {
            callbacksRef.current.onVictory(
              scoreRef.current,
              'Barcha 3 ta 3D inshootni mukammal yig‘dingiz!'
            );
          } else {
            bpRef.current += 1;
            setBpIdx(bpRef.current);
            setPlacedIds([]);
            setSelectedId(null);
            rebuildRef.current?.(bpRef.current);
            callbacksRef.current.onStatusChange?.(`Model: ${BLUEPRINTS[bpRef.current].name}`);
            setTip(`Yangi topshiriq: ${BLUEPRINTS[bpRef.current].name}!`);
          }
        }, 950);
      }
    } else {
      sound.playError();
      setTip('Bu qism boshqa joyga tegishli! Chizmani aylantirib qarang.');
    }
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Model: ${BLUEPRINTS[0].name}`);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') rotateSelected();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = createEngine(container, quality, {
      fov: 46,
      background: 0x0f172a,
      fogColor: 0x0f172a,
      fogNear: 20,
      fogFar: 60,
    });
    const { scene, camera, renderer, isSoftwareGl } = engine;
    camera.position.set(6.5, 6.2, 9.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.target.set(0, 2.0, 0);
    controls.minDistance = 6;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    setupThreePointLighting(scene, quality, {
      skyColor: 0x93c5fd,
      groundColor: 0x1e293b,
      keyIntensity: 1.5,
    });

    // Turntable workshop platform
    const turntable = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.6, 0.4, 36),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.35 })
    );
    turntable.position.y = -0.2;
    turntable.receiveShadow = true;
    scene.add(turntable);

    const grid = new THREE.GridHelper(18, 18, 0x334155, 0x1e293b);
    grid.position.y = -0.4;
    scene.add(grid);

    const particles = createParticleSystem(scene, 64);
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const ghostMeshes = new Map<string, THREE.Mesh>();
    const solidMeshes = new Map<string, THREE.Mesh>();

    const rebuild = (idx: number) => {
      while (modelGroup.children.length > 0) modelGroup.remove(modelGroup.children[0]);
      ghostMeshes.clear();
      solidMeshes.clear();

      const bp = BLUEPRINTS[idx];
      bp.pieces.forEach((p, i) => {
        // Ghost slot on turntable
        const ghost = new THREE.Mesh(
          makeGeo(p),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.26,
            wireframe: false,
            roughness: 0.4,
          })
        );
        ghost.position.set(...p.targetPos);
        ghost.userData.slotId = p.id;
        modelGroup.add(ghost);
        ghostMeshes.set(p.id, ghost);

        // Actual solid piece sitting in front tray initially
        const solid = new THREE.Mesh(
          makeGeo(p),
          new THREE.MeshPhysicalMaterial({
            color: p.color,
            roughness: 0.28,
            metalness: 0.25,
            clearcoat: 0.6,
          })
        );
        const startX = (i - (bp.pieces.length - 1) / 2) * 2.2;
        solid.position.set(startX, 0.85, 5.2);
        solid.scale.setScalar(0.55);
        solid.castShadow = true;
        solid.userData.pieceId = p.id;
        modelGroup.add(solid);
        solidMeshes.set(p.id, solid);
      });
    };

    rebuild(0);
    rebuildRef.current = rebuild;

    snapRef.current = (id) => {
      const ghost = ghostMeshes.get(id);
      if (ghost) {
        ghost.visible = false;
        particles.spawn(ghost.position.clone(), 0xfacc15, 20);
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
      const hits = raycaster.intersectObjects(modelGroup.children, false);
      if (hits.length === 0) return;

      const hit = hits[0].object;
      if (hit.userData.pieceId) {
        const pid = hit.userData.pieceId as string;
        if (!placedRef.current.includes(pid)) {
          sound.playSelect();
          setSelectedId(pid);
          setTip('Endi shaffof chizmadagi mos joyiga bosing!');
        }
      } else if (hit.userData.slotId) {
        tryPlace(hit.userData.slotId as string);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const stopLoop = engine.startLoop((dt) => {
      controls.update();
      const bp = BLUEPRINTS[bpRef.current];
      bp.pieces.forEach((p) => {
        const mesh = solidMeshes.get(p.id);
        if (!mesh) return;
        const isPlaced = placedRef.current.includes(p.id);
        const isSel = selectedRef.current === p.id;
        if (isPlaced) {
          mesh.position.lerp(new THREE.Vector3(...p.targetPos), 1 - Math.exp(-10 * dt));
          mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, 1, 10, dt));
          mesh.rotation.y = THREE.MathUtils.damp(mesh.rotation.y, 0, 10, dt);
        } else if (isSel) {
          mesh.position.y = THREE.MathUtils.damp(mesh.position.y, 1.55, 8, dt);
          mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, 0.72, 8, dt));
          mesh.rotation.y = THREE.MathUtils.damp(mesh.rotation.y, rotRef.current * (Math.PI / 2), 10, dt);
        } else {
          mesh.position.y = THREE.MathUtils.damp(mesh.position.y, 0.85, 8, dt);
          mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, 0.55, 8, dt));
        }
      });
      particles.update(dt);
    }, pausedRef);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      controls.dispose();
      stopLoop();
      engine.dispose();
    };
  }, [quality]);

  const currentBp = BLUEPRINTS[bpIdx];

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      <div className="pointer-events-none absolute top-4 inset-x-4 flex justify-center z-10">
        <div className="px-5 py-2.5 rounded-2xl bg-slate-950/88 border border-slate-700/80 text-white text-center">
          <p className="text-xs font-mono-num text-amber-400">
            Model {bpIdx + 1}/{BLUEPRINTS.length}: {currentBp.name} · {placedIds.length}/{currentBp.pieces.length}
          </p>
          <p className="font-display text-sm sm:text-base font-bold mt-0.5">{tip}</p>
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-4 z-10 flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-950/88 border border-slate-700/80">
          {currentBp.pieces.map((p) => {
            const done = placedIds.includes(p.id);
            const active = selectedId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={done}
                onClick={() => {
                  sound.playSelect();
                  setSelectedId(p.id);
                  setTip(`"${p.label}" tanlandi — shaffof joyiga bosing!`);
                }}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-display font-bold transition-colors cursor-pointer ${
                  done
                    ? 'bg-emerald-600/35 text-emerald-300 line-through opacity-60 cursor-default'
                    : active
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}
          {selectedId && (
            <button
              type="button"
              onClick={rotateSelected}
              className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Burish (R)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
