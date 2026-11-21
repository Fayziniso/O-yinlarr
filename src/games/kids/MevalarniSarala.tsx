import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildFruit3D, createParticleSystem, FruitKind } from '../../engine/models3D';
import { createEngine, createWoodFloorTexture, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

const FRUITS: { id: FruitKind; label: string; colorHex: number; css: string }[] = [
  { id: 'olma', label: 'Olma', colorHex: 0xe11d48, css: '#e11d48' },
  { id: 'banan', label: 'Banan', colorHex: 0xeab308, css: '#eab308' },
  { id: 'nok', label: 'Nok', colorHex: 0x65a30d, css: '#65a30d' },
];

const TARGET_COUNT = 12;

function randomFruit(): FruitKind {
  return FRUITS[Math.floor(Math.random() * FRUITS.length)].id;
}

export const MevalarniSarala: React.FC<GameComponentProps> = ({
  quality,
  isPaused,
  onScoreChange,
  onStatusChange,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;

  const [currentFruit, setCurrentFruit] = useState<FruitKind>(() => randomFruit());
  const [sortedCount, setSortedCount] = useState(0);
  const [message, setMessage] = useState('Mevani mos savatga sudrab boring yoki savatni bosing!');

  const currentFruitRef = useRef<FruitKind>(currentFruit);
  currentFruitRef.current = currentFruit;
  const sortedRef = useRef(0);
  const scoreRef = useRef(0);
  const busyRef = useRef(false);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory };

  const spawnFruitModelRef = useRef<((kind: FruitKind) => void) | null>(null);
  const flyToBasketRef = useRef<((basketIdx: number, colorHex: number) => void) | null>(null);

  const handleDropInBasket = (basketKind: FruitKind, basketIdx: number) => {
    if (pausedRef.current || busyRef.current) return;
    if (basketKind === currentFruitRef.current) {
      busyRef.current = true;
      sound.playCollect();
      const meta = FRUITS[basketIdx];
      flyToBasketRef.current?.(basketIdx, meta.colorHex);
      scoreRef.current += 15;
      sortedRef.current += 1;
      setSortedCount(sortedRef.current);
      callbacksRef.current.onScoreChange(scoreRef.current);
      callbacksRef.current.onStatusChange?.(`Saralandi: ${sortedRef.current}/${TARGET_COUNT}`);
      setMessage(`Barakalla! ${meta.label} o‘z savatiga tushdi!`);

      window.setTimeout(() => {
        if (sortedRef.current >= TARGET_COUNT) {
          callbacksRef.current.onVictory(
            scoreRef.current,
            `Ajoyib hosil! Barcha ${TARGET_COUNT} ta meva to‘g‘ri saralandi!`
          );
          return;
        }
        const next = randomFruit();
        setCurrentFruit(next);
        spawnFruitModelRef.current?.(next);
        busyRef.current = false;
      }, 650);
    } else {
      sound.playError();
      setMessage('Bu boshqa meva savati! Rangiga qarang.');
    }
  };

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(`Saralandi: 0/${TARGET_COUNT}`);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = createEngine(container, quality, {
      fov: 46,
      background: 0xfff7ed,
      fogColor: 0xfff7ed,
      fogNear: 20,
      fogFar: 50,
    });
    const { scene, camera, renderer } = engine;
    camera.position.set(0, 6.2, 10.8);
    camera.lookAt(0, 0.8, 0);

    setupThreePointLighting(scene, quality, {
      skyColor: 0xffedd5,
      groundColor: 0xa16207,
      keyIntensity: 1.45,
    });

    const woodTex = createWoodFloorTexture(renderer, 3);
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.5, 8.5),
      new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 })
    );
    table.position.y = -0.25;
    table.receiveShadow = true;
    scene.add(table);

    const particles = createParticleSystem(scene, 56);

    // Build 3 woven baskets at back row
    const basketPositions = [-4, 0, 4];
    const basketGroup = new THREE.Group();
    scene.add(basketGroup);

    FRUITS.forEach((f, idx) => {
      const bx = basketPositions[idx];
      const bz = -2.1;
      const b = new THREE.Group();
      b.position.set(bx, 0, bz);

      const wickerMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
      const rimMat = new THREE.MeshStandardMaterial({ color: f.colorHex, roughness: 0.35 });

      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.0, 1.35, 18), wickerMat);
      body.position.y = 0.68;
      body.castShadow = true;
      body.receiveShadow = true;
      b.add(body);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.16, 12, 24), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 1.35;
      b.add(rim);

      // Small sample fruit badge on basket front
      const emblem = buildFruit3D(f.id);
      emblem.scale.setScalar(0.45);
      emblem.position.set(0, 0.45, 1.28);
      b.add(emblem);

      b.traverse((o) => {
        o.userData.basketKind = f.id;
        o.userData.basketIdx = idx;
      });
      basketGroup.add(b);
    });

    // Active Fruit pedestal & model
    const fruitHolder = new THREE.Group();
    fruitHolder.position.set(0, 0.1, 2.2);
    scene.add(fruitHolder);

    const tray = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.45, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 })
    );
    tray.position.set(0, 0.09, 2.2);
    tray.receiveShadow = true;
    scene.add(tray);

    let activeFruitMesh: THREE.Group | null = null;
    let flyingTarget: THREE.Vector3 | null = null;
    let isDragging = false;
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.0);
    const dragIntersect = new THREE.Vector3();

    const spawnFruit = (kind: FruitKind) => {
      if (activeFruitMesh) {
        fruitHolder.remove(activeFruitMesh);
      }
      activeFruitMesh = buildFruit3D(kind);
      activeFruitMesh.scale.setScalar(1.25);
      fruitHolder.position.set(0, 0.25, 2.2);
      flyingTarget = null;
      fruitHolder.add(activeFruitMesh);
    };

    spawnFruit(currentFruitRef.current);
    spawnFruitModelRef.current = spawnFruit;
    flyToBasketRef.current = (basketIdx, colorHex) => {
      flyingTarget = new THREE.Vector3(basketPositions[basketIdx], 1.5, -2.1);
      particles.spawn(new THREE.Vector3(basketPositions[basketIdx], 1.8, -2.1), colorHex, 20);
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const setMouse = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (pausedRef.current || busyRef.current) return;
      setMouse(e);
      raycaster.setFromCamera(mouse, camera);

      // Check clicking directly on a basket
      const basketHits = raycaster.intersectObjects(basketGroup.children, true);
      if (basketHits.length > 0) {
        const kind = basketHits[0].object.userData.basketKind as FruitKind | undefined;
        const idx = basketHits[0].object.userData.basketIdx as number | undefined;
        if (kind !== undefined && idx !== undefined) {
          handleDropInBasket(kind, idx);
          return;
        }
      }

      // Check starting drag on active fruit
      const fruitHits = raycaster.intersectObjects(fruitHolder.children, true);
      if (fruitHits.length > 0) {
        isDragging = true;
        sound.playSelect();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || pausedRef.current) return;
      setMouse(e);
      raycaster.setFromCamera(mouse, camera);
      if (raycaster.ray.intersectPlane(dragPlane, dragIntersect)) {
        fruitHolder.position.x = THREE.MathUtils.clamp(dragIntersect.x, -5.5, 5.5);
        fruitHolder.position.z = THREE.MathUtils.clamp(dragIntersect.z, -3.2, 3.2);
        fruitHolder.position.y = 1.2;
      }
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      // Check proximity to any basket
      let matched = false;
      basketPositions.forEach((bx, idx) => {
        const dist = Math.hypot(fruitHolder.position.x - bx, fruitHolder.position.z - -2.1);
        if (dist < 2.2) {
          matched = true;
          handleDropInBasket(FRUITS[idx].id, idx);
        }
      });
      if (!matched) {
        fruitHolder.position.set(0, 0.25, 2.2);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const stopLoop = engine.startLoop((dt, elapsed) => {
      if (activeFruitMesh) {
        activeFruitMesh.rotation.y += dt * 1.4;
      }
      if (flyingTarget) {
        fruitHolder.position.lerp(flyingTarget, 1 - Math.exp(-10 * dt));
      } else if (!isDragging) {
        fruitHolder.position.y = 0.28 + Math.sin(elapsed * 2.5) * 0.1;
      }
      particles.update(dt);
    }, pausedRef);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      stopLoop();
      engine.dispose();
    };
  }, [quality]);

  const activeInfo = FRUITS.find((f) => f.id === currentFruit)!;

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      <div className="pointer-events-none absolute top-4 inset-x-4 flex justify-center z-10">
        <div className="px-5 py-2.5 rounded-2xl bg-slate-950/88 border border-slate-700/80 text-white text-center">
          <p className="text-xs font-mono-num text-amber-400">
            Hozirgi meva: {activeInfo.label} · {sortedCount}/{TARGET_COUNT}
          </p>
          <p className="font-display text-sm sm:text-lg font-bold mt-0.5">{message}</p>
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-4 z-10 flex justify-center">
        <div className="flex flex-wrap justify-center gap-2.5 px-3 py-2.5 rounded-2xl bg-slate-950/85 border border-slate-700/80">
          {FRUITS.map((f, idx) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleDropInBasket(f.id, idx)}
              className="min-w-[112px] py-3 px-4 rounded-xl font-display font-bold text-sm sm:text-base text-white border-2 border-white/25 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              style={{ backgroundColor: f.css }}
            >
              {f.label} savati
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
