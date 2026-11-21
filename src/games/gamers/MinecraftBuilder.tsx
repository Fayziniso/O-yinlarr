import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Hammer, Trash2, CheckCircle2 } from 'lucide-react';
import { createEngine, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

interface BlockType {
  id: string;
  label: string;
  color: number;
  css: string;
  roughness: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
}

const BLOCK_TYPES: BlockType[] = [
  { id: 'ot', label: "O't", color: 0x22c55e, css: '#22c55e', roughness: 0.85 },
  { id: 'tosh', label: 'Tosh', color: 0x64748b, css: '#64748b', roughness: 0.9 },
  { id: 'gisht', label: "G'isht", color: 0xb91c1c, css: '#b91c1c', roughness: 0.8 },
  { id: 'yogoch', label: "Yog'och", color: 0xa16207, css: '#a16207', roughness: 0.78 },
  { id: 'shisha', label: 'Shisha', color: 0x38bdf8, css: '#38bdf8', roughness: 0.1, transparent: true, opacity: 0.55 },
  { id: 'oltin', label: 'Oltin', color: 0xfacc15, css: '#facc15', roughness: 0.25, metalness: 0.85 },
];

const SAVE_KEY = 'uzgame3d_voxel_save_v1';

export const MinecraftBuilder: React.FC<GameComponentProps> = ({
  quality,
  isPaused,
  onScoreChange,
  onStatusChange,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;

  const [selectedType, setSelectedType] = useState(0);
  const [mode, setMode] = useState<'place' | 'remove'>('place');
  const [blockCount, setBlockCount] = useState(0);

  const selectedRef = useRef(0);
  selectedRef.current = selectedType;
  const modeRef = useRef<'place' | 'remove'>('place');
  modeRef.current = mode;

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory };

  const actionsRef = useRef<{
    clearAll: () => void;
    stampHouse: () => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = createEngine(container, quality, {
      fov: 50,
      background: 0xbae6fd,
      fogColor: 0xbae6fd,
      fogNear: 25,
      fogFar: 85,
    });
    const { scene, camera, renderer, isSoftwareGl } = engine;
    camera.position.set(11, 10, 12);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.target.set(0, 1.5, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 5;
    controls.maxDistance = 30;

    setupThreePointLighting(scene, quality, {
      skyColor: 0xe0f2fe,
      groundColor: 0x166534,
      keyIntensity: 1.45,
      shadowRange: 20,
    });

    // Base island platform (14x14 grid)
    const basePlatform = new THREE.Mesh(
      new THREE.BoxGeometry(14, 1, 14),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 })
    );
    basePlatform.position.y = -0.5;
    basePlatform.receiveShadow = true;
    basePlatform.userData.isGround = true;
    scene.add(basePlatform);

    const gridHelper = new THREE.GridHelper(14, 14, 0x065f46, 0x166534);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    const voxelGroup = new THREE.Group();
    scene.add(voxelGroup);

    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const blockMats = BLOCK_TYPES.map(
      (b) =>
        new THREE.MeshStandardMaterial({
          color: b.color,
          roughness: b.roughness,
          metalness: b.metalness ?? 0.05,
          transparent: Boolean(b.transparent),
          opacity: b.opacity ?? 1,
        })
    );

    const voxelMap = new Map<string, { mesh: THREE.Mesh; typeIdx: number }>();

    const keyOf = (x: number, y: number, z: number) => `${x},${y},${z}`;

    const persistAndSync = () => {
      const list: [number, number, number, number][] = [];
      voxelMap.forEach((v, k) => {
        const [x, y, z] = k.split(',').map(Number);
        list.push([x, y, z, v.typeIdx]);
      });
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(list));
      } catch {
        // Ignore
      }
      setBlockCount(list.length);
      callbacksRef.current.onScoreChange(list.length * 10);
      callbacksRef.current.onStatusChange?.(`Bloklar: ${list.length} ta`);
    };

    const addBlock = (x: number, y: number, z: number, typeIdx: number, silent = false) => {
      if (x < -7 || x > 6 || z < -7 || z > 6 || y < 0 || y > 12) return;
      const k = keyOf(x, y, z);
      if (voxelMap.has(k)) return;
      const mesh = new THREE.Mesh(blockGeo, blockMats[typeIdx % blockMats.length]);
      mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.voxelKey = k;
      voxelGroup.add(mesh);
      voxelMap.set(k, { mesh, typeIdx });
      if (!silent) {
        sound.playCollect();
        persistAndSync();
      }
    };

    const removeBlock = (k: string) => {
      const entry = voxelMap.get(k);
      if (!entry) return;
      voxelGroup.remove(entry.mesh);
      voxelMap.delete(k);
      sound.playClick();
      persistAndSync();
    };

    const stampHouse = () => {
      // Build a cute starter wooden/brick house
      for (let x = -2; x <= 1; x++) {
        for (let z = -2; z <= 1; z++) {
          for (let y = 0; y <= 2; y++) {
            const isEdge = x === -2 || x === 1 || z === -2 || z === 1;
            if (!isEdge) continue;
            if (z === 1 && x === 0 && y <= 1) continue; // doorway
            if (y === 1 && (x === -1 || z === 0)) {
              addBlock(x, y, z, 4, true); // glass window
            } else {
              addBlock(x, y, z, 3, true); // wood wall
            }
          }
          addBlock(x, 3, z, 2, true); // brick roof
        }
      }
      addBlock(-1, 4, -1, 5, true);
      addBlock(0, 4, -1, 5, true);
      sound.playSuccess();
      persistAndSync();
    };

    const clearAll = () => {
      voxelMap.forEach((v) => voxelGroup.remove(v.mesh));
      voxelMap.clear();
      sound.playClick();
      persistAndSync();
    };

    // Load saved voxels or build a starter small arch
    let loaded = false;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as [number, number, number, number][];
        if (Array.isArray(arr) && arr.length > 0) {
          arr.forEach(([x, y, z, t]) => addBlock(x, y, z, t, true));
          loaded = true;
        }
      }
    } catch {
      // Ignore
    }
    if (!loaded) {
      addBlock(-1, 0, 0, 1, true);
      addBlock(1, 0, 0, 1, true);
      addBlock(-1, 1, 0, 1, true);
      addBlock(1, 1, 0, 1, true);
      addBlock(-1, 2, 0, 5, true);
      addBlock(0, 2, 0, 5, true);
      addBlock(1, 2, 0, 5, true);
    }
    persistAndSync();

    actionsRef.current = { clearAll, stampHouse };

    // Raycast click vs drag detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pausedRef.current) return;
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 7) return; // was orbiting

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const targets: THREE.Object3D[] = [basePlatform, ...voxelGroup.children];
      const hits = raycaster.intersectObjects(targets, false);
      if (hits.length === 0) return;

      const hit = hits[0];
      const isRightClick = e.button === 2;
      if (modeRef.current === 'remove' || isRightClick) {
        if (hit.object.userData.voxelKey) {
          removeBlock(hit.object.userData.voxelKey as string);
        }
        return;
      }

      if (hit.face) {
        const p = hit.point.clone().addScaledVector(hit.face.normal, 0.5);
        addBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z), selectedRef.current);
      }
    };

    const onContext = (e: MouseEvent) => e.preventDefault();
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('contextmenu', onContext);

    const stopLoop = engine.startLoop(() => {
      controls.update();
    }, pausedRef);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('contextmenu', onContext);
      controls.dispose();
      stopLoop();
      engine.dispose();
    };
  }, [quality]);

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      {/* Top Builder Status */}
      <div className="pointer-events-none absolute top-4 inset-x-4 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/88 border border-slate-700/80 text-white text-xs">
          <span className="font-mono-num font-bold text-emerald-400">Bloklar: {blockCount}</span>
          <button
            type="button"
            onClick={() => actionsRef.current?.stampHouse()}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold cursor-pointer"
          >
            Uycha qurish
          </button>
          <button
            type="button"
            onClick={() => actionsRef.current?.clearAll()}
            className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-500 font-semibold cursor-pointer"
          >
            Tozalash
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            onVictory(
              Math.max(50, blockCount * 10),
              `Ajoyib arxitektura! Siz ${blockCount} ta blokdan iborat 3D inshoot qurdingiz!`
            )
          }
          className="pointer-events-auto px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          Inshootni yakunlash
        </button>
      </div>

      {/* Bottom Voxel Material & Tool Dock */}
      <div className="absolute bottom-4 inset-x-4 z-10 flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-950/90 border border-slate-700/80">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setMode('place');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              mode === 'place' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            Qo‘yish
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setMode('remove');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              mode === 'remove' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            O‘chirish
          </button>

          <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block" />

          {BLOCK_TYPES.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                sound.playClick();
                setSelectedType(i);
                setMode('place');
              }}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-transform cursor-pointer ${
                selectedType === i && mode === 'place'
                  ? 'border-amber-400 bg-slate-800 text-white scale-105'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: b.css }} />
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
