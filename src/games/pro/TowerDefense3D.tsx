import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ArrowUpCircle, Play, Shield, Coins } from 'lucide-react';
import { createParticleSystem } from '../../engine/models3D';
import { createEngine, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

type TowerKind = 'laser' | 'cannon' | 'ice';

interface TowerDef {
  id: TowerKind;
  name: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number;
  color: number;
  css: string;
}

const TOWER_DEFS: Record<TowerKind, TowerDef> = {
  laser: {
    id: 'laser',
    name: 'Lazer',
    cost: 60,
    range: 7.5,
    damage: 16,
    fireRate: 0.45,
    color: 0x0ea5e9,
    css: '#0ea5e9',
  },
  cannon: {
    id: 'cannon',
    name: "To'p",
    cost: 90,
    range: 8.5,
    damage: 42,
    fireRate: 1.15,
    color: 0xf59e0b,
    css: '#f59e0b',
  },
  ice: {
    id: 'ice',
    name: 'Muz',
    cost: 75,
    range: 7.0,
    damage: 12,
    fireRate: 0.65,
    color: 0x38bdf8,
    css: '#38bdf8',
  },
};

const MAPS = [
  {
    name: 'Vodiy yo‘li',
    groundColor: 0x166534,
    waypoints: [
      [-12, -8],
      [-4, -8],
      [-4, 4],
      [5, 4],
      [5, -5],
      [12, -5],
    ] as [number, number][],
    pads: [
      [-8, -4],
      [-8, -11],
      [0, -4],
      [0, 0],
      [0, 7],
      [9, 0],
      [9, -8],
      [2, -8],
    ] as [number, number][],
  },
  {
    name: 'Cho‘l qal’asi',
    groundColor: 0x92400e,
    waypoints: [
      [-12, 6],
      [-2, 6],
      [-2, -6],
      [7, -6],
      [7, 5],
      [12, 5],
    ] as [number, number][],
    pads: [
      [-7, 2],
      [-7, 9],
      [2, 2],
      [2, -2],
      [2, -9],
      [10, -2],
      [10, 1],
      [-5, -4],
    ] as [number, number][],
  },
];

const TOTAL_WAVES = 6;

export const TowerDefense3D: React.FC<GameComponentProps> = ({
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

  const [mapIdx, setMapIdx] = useState(0);
  const [selectedTool, setSelectedTool] = useState<TowerKind>('laser');
  const [gold, setGold] = useState(180);
  const [baseHp, setBaseHp] = useState(10);
  const [wave, setWave] = useState(0);
  const [waveActive, setWaveActive] = useState(false);
  const [selectedPadInfo, setSelectedPadInfo] = useState<{ idx: number; kind: TowerKind; level: number } | null>(null);

  const selectedToolRef = useRef<TowerKind>('laser');
  selectedToolRef.current = selectedTool;
  const callbacksRef = useRef({ onScoreChange, onStatusChange, onGameOver, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onGameOver, onVictory };

  const actionsRef = useRef<{
    startNextWave: () => void;
    upgradeSelected: () => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const map = MAPS[mapIdx];
    const engine = createEngine(container, quality, {
      fov: 46,
      background: 0x0f172a,
      fogColor: 0x0f172a,
      fogNear: 28,
      fogFar: 90,
    });
    const { scene, camera, renderer, isSoftwareGl } = engine;
    camera.position.set(0, 19, 17);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 12;
    controls.maxDistance = 34;

    setupThreePointLighting(scene, quality, {
      skyColor: 0xbae6fd,
      groundColor: map.groundColor,
      keyIntensity: 1.5,
      shadowRange: 26,
    });

    // Map Terrain Board
    const terrain = new THREE.Mesh(
      new THREE.BoxGeometry(28, 0.8, 22),
      new THREE.MeshStandardMaterial({ color: map.groundColor, roughness: 0.9 })
    );
    terrain.position.y = -0.4;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Path Segments
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    for (let i = 0; i < map.waypoints.length - 1; i++) {
      const [x1, z1] = map.waypoints[i];
      const [x2, z2] = map.waypoints[i + 1];
      const len = Math.hypot(x2 - x1, z2 - z1);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(len + 1.8, 0.14, 1.8), pathMat);
      seg.position.set((x1 + x2) / 2, 0.05, (z1 + z2) / 2);
      seg.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      seg.receiveShadow = true;
      scene.add(seg);
    }

    // Fortress Base at end of path
    const endPt = map.waypoints[map.waypoints.length - 1];
    const baseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.7, 2.8, 8),
      new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, metalness: 0.65, roughness: 0.3 })
    );
    baseMesh.position.set(endPt[0], 1.4, endPt[1]);
    baseMesh.castShadow = true;
    scene.add(baseMesh);

    // Build clickable Tower Pads
    interface PlacedTower {
      padIdx: number;
      kind: TowerKind;
      level: number;
      pos: THREE.Vector3;
      group: THREE.Group;
      turretHead: THREE.Object3D;
      cooldown: number;
    }

    const padMeshes: THREE.Mesh[] = [];
    const towers = new Map<number, PlacedTower>();
    const padMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.3 });

    map.pads.forEach(([px, pz], idx) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.25, 16), padMat);
      pad.position.set(px, 0.12, pz);
      pad.receiveShadow = true;
      pad.userData.padIdx = idx;
      scene.add(pad);
      padMeshes.push(pad);
    });

    const buildTowerVisual = (kind: TowerKind, level: number) => {
      const g = new THREE.Group();
      const def = TOWER_DEFS[kind];
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.95, 1.0 + level * 0.2, 12),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.5 })
      );
      base.position.y = 0.6;
      base.castShadow = true;
      g.add(base);

      const head = new THREE.Group();
      head.position.y = 1.25 + level * 0.15;
      const body = new THREE.Mesh(
        kind === 'ice' ? new THREE.OctahedronGeometry(0.55, 0) : new THREE.BoxGeometry(0.9, 0.6, 0.9),
        new THREE.MeshPhysicalMaterial({ color: def.color, metalness: 0.6, roughness: 0.25 })
      );
      head.add(body);
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 1.15, 10),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 })
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = 0.65;
      head.add(barrel);
      g.add(head);

      return { group: g, head };
    };

    const particles = createParticleSystem(scene, 80);

    interface EnemyUnit {
      mesh: THREE.Group;
      hp: number;
      maxHp: number;
      speed: number;
      slowTimer: number;
      wpIdx: number;
    }

    interface Projectile {
      mesh: THREE.Mesh;
      target: EnemyUnit;
      speed: number;
      damage: number;
      slows: boolean;
    }

    let enemies: EnemyUnit[] = [];
    let projectiles: Projectile[] = [];
    let currentGold = 180;
    let currentBaseHp = 10;
    let currentWave = 0;
    let isWaveRunning = false;
    let spawnQueue = 0;
    let spawnTimer = 0;
    let score = 0;
    let ended = false;
    let activeSelectedPad: number | null = null;

    setGold(currentGold);
    setBaseHp(currentBaseHp);
    setWave(0);
    setWaveActive(false);
    setSelectedPadInfo(null);
    callbacksRef.current.onStatusChange?.(`To‘lqin 0/${TOTAL_WAVES}`);

    const placeOrSelectPad = (padIdx: number) => {
      if (ended) return;
      const existing = towers.get(padIdx);
      if (existing) {
        sound.playSelect();
        activeSelectedPad = padIdx;
        setSelectedPadInfo({ idx: padIdx, kind: existing.kind, level: existing.level });
        return;
      }

      const kind = selectedToolRef.current;
      const def = TOWER_DEFS[kind];
      if (currentGold < def.cost) {
        sound.playError();
        return;
      }

      currentGold -= def.cost;
      setGold(currentGold);
      sound.playCollect();

      const [px, pz] = map.pads[padIdx];
      const { group, head } = buildTowerVisual(kind, 1);
      group.position.set(px, 0.24, pz);
      scene.add(group);

      towers.set(padIdx, {
        padIdx,
        kind,
        level: 1,
        pos: new THREE.Vector3(px, 1.5, pz),
        group,
        turretHead: head,
        cooldown: 0,
      });
      activeSelectedPad = padIdx;
      setSelectedPadInfo({ idx: padIdx, kind, level: 1 });
    };

    const upgradeSelected = () => {
      if (activeSelectedPad === null) return;
      const t = towers.get(activeSelectedPad);
      if (!t || t.level >= 3) return;
      const upCost = 65 * t.level;
      if (currentGold < upCost) {
        sound.playError();
        return;
      }
      currentGold -= upCost;
      setGold(currentGold);
      t.level += 1;
      t.group.scale.setScalar(1 + (t.level - 1) * 0.14);
      sound.playSuccess();
      particles.spawn(t.pos.clone(), 0xfacc15, 14);
      setSelectedPadInfo({ idx: t.padIdx, kind: t.kind, level: t.level });
    };

    const startNextWave = () => {
      if (ended || isWaveRunning || spawnQueue > 0 || enemies.length > 0) return;
      if (currentWave >= TOTAL_WAVES) return;
      currentWave += 1;
      isWaveRunning = true;
      setWave(currentWave);
      setWaveActive(true);
      spawnQueue = 5 + currentWave * 2;
      spawnTimer = 0.2;
      sound.playSelect();
      callbacksRef.current.onStatusChange?.(`To‘lqin ${currentWave}/${TOTAL_WAVES}`);
    };

    actionsRef.current = { startNextWave, upgradeSelected };

    const spawnEnemy = () => {
      const g = new THREE.Group();
      const isHeavy = currentWave >= 3 && spawnQueue % 3 === 0;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(isHeavy ? 1.2 : 0.9, isHeavy ? 0.9 : 0.7, isHeavy ? 1.4 : 1.0),
        new THREE.MeshStandardMaterial({
          color: isHeavy ? 0x991b1b : 0xef4444,
          metalness: 0.4,
          roughness: 0.4,
        })
      );
      body.position.y = 0.55;
      body.castShadow = true;
      g.add(body);
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.2 })
      );
      top.position.y = 1.1;
      g.add(top);

      const [sx, sz] = map.waypoints[0];
      g.position.set(sx, 0.1, sz);
      scene.add(g);

      const maxHp = (isHeavy ? 85 : 42) + currentWave * 22;
      enemies.push({
        mesh: g,
        hp: maxHp,
        maxHp,
        speed: isHeavy ? 2.4 : 3.4 + currentWave * 0.2,
        slowTimer: 0,
        wpIdx: 1,
      });
    };

    // Raycast click on pads
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downPt = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => {
      downPt = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (pausedRef.current) return;
      if (Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) > 7) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(padMeshes, false);
      if (hits.length > 0 && typeof hits[0].object.userData.padIdx === 'number') {
        placeOrSelectPad(hits[0].object.userData.padIdx);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    const projGeo = new THREE.SphereGeometry(0.22, 8, 8);

    const stopLoop = engine.startLoop((dt) => {
      controls.update();
      if (ended) return;

      // Spawn enemies during wave
      if (spawnQueue > 0) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnEnemy();
          spawnQueue -= 1;
          spawnTimer = Math.max(0.55, 1.25 - currentWave * 0.08);
        }
      }

      // Move enemies along waypoints
      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        if (en.slowTimer > 0) en.slowTimer = Math.max(0, en.slowTimer - dt);
        const effSpeed = en.slowTimer > 0 ? en.speed * 0.5 : en.speed;

        const targetWp = map.waypoints[en.wpIdx];
        if (!targetWp) {
          // Reached base
          scene.remove(en.mesh);
          enemies.splice(i, 1);
          currentBaseHp = Math.max(0, currentBaseHp - 1);
          setBaseHp(currentBaseHp);
          sound.playError();
          if (currentBaseHp <= 0) {
            ended = true;
            callbacksRef.current.onGameOver(
              score,
              `Baza quladi! Siz ${currentWave}-to‘lqingacha himoyalandingiz.`
            );
            return;
          }
          continue;
        }
        const dx = targetWp[0] - en.mesh.position.x;
        const dz = targetWp[1] - en.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.35) {
          en.wpIdx += 1;
        } else {
          en.mesh.position.x += (dx / dist) * effSpeed * dt;
          en.mesh.position.z += (dz / dist) * effSpeed * dt;
          en.mesh.rotation.y = Math.atan2(dx, dz);
        }
      }

      // Towers targeting & firing
      towers.forEach((t) => {
        if (t.cooldown > 0) t.cooldown = Math.max(0, t.cooldown - dt);
        const def = TOWER_DEFS[t.kind];
        const range = def.range + (t.level - 1) * 1.1;

        let best: EnemyUnit | null = null;
        let bestDist = range;
        for (const en of enemies) {
          const d = Math.hypot(en.mesh.position.x - t.pos.x, en.mesh.position.z - t.pos.z);
          if (d < bestDist) {
            bestDist = d;
            best = en;
          }
        }

        if (best) {
          t.turretHead.lookAt(best.mesh.position.x, t.pos.y, best.mesh.position.z);
          if (t.cooldown <= 0) {
            t.cooldown = def.fireRate / (1 + (t.level - 1) * 0.25);
            sound.playShoot();
            const pMesh = new THREE.Mesh(
              projGeo,
              new THREE.MeshBasicMaterial({ color: def.color })
            );
            pMesh.position.copy(t.pos);
            scene.add(pMesh);
            projectiles.push({
              mesh: pMesh,
              target: best,
              speed: 19,
              damage: def.damage * (1 + (t.level - 1) * 0.5),
              slows: t.kind === 'ice',
            });
          }
        }
      });

      // Projectiles update
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const pr = projectiles[i];
        if (!enemies.includes(pr.target)) {
          scene.remove(pr.mesh);
          projectiles.splice(i, 1);
          continue;
        }
        const tx = pr.target.mesh.position.x;
        const ty = 0.8;
        const tz = pr.target.mesh.position.z;
        const dx = tx - pr.mesh.position.x;
        const dy = ty - pr.mesh.position.y;
        const dz = tz - pr.mesh.position.z;
        const d = Math.hypot(dx, dy, dz);
        if (d < 0.6) {
          pr.target.hp -= pr.damage;
          if (pr.slows) pr.target.slowTimer = 2.0;
          scene.remove(pr.mesh);
          projectiles.splice(i, 1);

          if (pr.target.hp <= 0) {
            const idx = enemies.indexOf(pr.target);
            if (idx !== -1) {
              particles.spawn(pr.target.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xf59e0b, 14);
              scene.remove(pr.target.mesh);
              enemies.splice(idx, 1);
              currentGold += 18;
              score += 20;
              setGold(currentGold);
              callbacksRef.current.onScoreChange(score);
            }
          }
        } else {
          pr.mesh.position.x += (dx / d) * pr.speed * dt;
          pr.mesh.position.y += (dy / d) * pr.speed * dt;
          pr.mesh.position.z += (dz / d) * pr.speed * dt;
        }
      }

      // Check wave clear
      if (isWaveRunning && spawnQueue === 0 && enemies.length === 0 && currentWave > 0) {
        isWaveRunning = false;
        setWaveActive(false);
        if (currentWave >= TOTAL_WAVES) {
          ended = true;
          score += 120;
          callbacksRef.current.onScoreChange(score);
          callbacksRef.current.onVictory(
            score,
            `Buyuk strateg! Barcha ${TOTAL_WAVES} to‘lqindan bazani muvaffaqiyatli himoya qildingiz!`
          );
          return;
        }
        currentGold += 45;
        setGold(currentGold);
        sound.playSuccess();
      }

      particles.update(dt);
    }, pausedRef);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      stopLoop();
      engine.dispose();
    };
  }, [quality, mapIdx]);

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      {/* Top Tactical HUD */}
      <div className="pointer-events-none absolute top-4 inset-x-4 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700/80">
          {MAPS.map((m, i) => (
            <button
              key={m.name}
              type="button"
              onClick={() => {
                sound.playClick();
                setMapIdx(i);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                mapIdx === i ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white font-mono-num text-xs sm:text-sm">
          <span className="flex items-center gap-1 text-amber-400 font-bold">
            <Coins className="w-4 h-4" />
            {gold}
          </span>
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <Shield className="w-4 h-4" />
            {baseHp}/10
          </span>
          <span>
            To‘lqin: <strong className="text-sky-400">{wave}/{TOTAL_WAVES}</strong>
          </span>
        </div>
      </div>

      {/* Bottom Tower Build & Wave Dock */}
      <div className="absolute bottom-4 inset-x-4 z-10 flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-950/92 border border-slate-700/80 text-white">
          {(Object.values(TOWER_DEFS) as TowerDef[]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                sound.playClick();
                setSelectedTool(t.id);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 cursor-pointer ${
                selectedTool === t.id
                  ? 'border-amber-400 bg-slate-800 text-white'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.css }} />
              <span>{t.name}</span>
              <span className="font-mono-num text-amber-400">{t.cost}</span>
            </button>
          ))}

          {selectedPadInfo && selectedPadInfo.level < 3 && (
            <button
              type="button"
              onClick={() => actionsRef.current?.upgradeSelected()}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpCircle className="w-4 h-4" />
              Kuchaytirish ({65 * selectedPadInfo.level})
            </button>
          )}

          <button
            type="button"
            disabled={waveActive}
            onClick={() => actionsRef.current?.startNextWave()}
            className={`px-4 py-2 rounded-xl font-display font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer ${
              waveActive
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <Play className="w-4 h-4" />
            {wave === 0 ? 'To‘lqinni boshlash' : `Keyingi to‘lqin (${wave + 1}/${TOTAL_WAVES})`}
          </button>
        </div>
      </div>
    </div>
  );
};
