import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createParticleSystem } from '../../engine/models3D';
import { createEngine, createLabelTexture, setupThreePointLighting } from '../../engine/threeUtils';
import { GameComponentProps } from '../../types';
import { sound } from '../../utils/sound';

const SYMBOLS = [
  { id: 'yulduz', glyph: '★', bg: '#f59e0b' },
  { id: 'olmos', glyph: '◆', bg: '#0ea5e9' },
  { id: 'quyosh', glyph: '☀', bg: '#ef4444' },
  { id: 'oy', glyph: '☾', bg: '#8b5cf6' },
  { id: 'yaproq', glyph: '✿', bg: '#10b981' },
  { id: 'chaqmoq', glyph: '⚡', bg: '#eab308' },
  { id: 'toj', glyph: '♛', bg: '#ec4899' },
  { id: 'yurak', glyph: '♥', bg: '#f43f5e' },
];

const LEVELS = [
  { cols: 3, rows: 2, label: '1-bosqich (3×2)' },
  { cols: 4, rows: 3, label: '2-bosqich (4×3)' },
  { cols: 4, rows: 4, label: '3-bosqich (4×4)' },
];

interface CardItem {
  index: number;
  symbolId: string;
  mesh: THREE.Mesh;
  flipped: boolean;
  matched: boolean;
  targetRotY: number;
}

export const XotiraSinovi: React.FC<GameComponentProps> = ({
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
  const [moves, setMoves] = useState(0);
  const [pairsLeft, setPairsLeft] = useState(3);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onVictory });
  callbacksRef.current = { onScoreChange, onStatusChange, onVictory };

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
    const { scene, camera, renderer } = engine;
    camera.position.set(0, 10.5, 8.2);
    camera.lookAt(0, 0, 0.3);

    setupThreePointLighting(scene, quality, {
      skyColor: 0x38bdf8,
      groundColor: 0x1e293b,
      keyIntensity: 1.5,
    });

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(13.5, 0.4, 10.5),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.2 })
    );
    board.position.y = -0.35;
    board.receiveShadow = true;
    scene.add(board);

    const particles = createParticleSystem(scene, 72);
    const cardsGroup = new THREE.Group();
    scene.add(cardsGroup);

    // Pre-build back and front textures
    const backTex = createLabelTexture(renderer, '?', '#1e293b', '#38bdf8', 'UZGAME');
    const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.35, metalness: 0.25 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.5 });

    const faceMaterials = new Map<string, THREE.MeshStandardMaterial>();
    SYMBOLS.forEach((s) => {
      const tex = createLabelTexture(renderer, s.glyph, s.bg, '#ffffff');
      faceMaterials.set(s.id, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 }));
    });

    let cards: CardItem[] = [];
    let openCards: CardItem[] = [];
    let lockBoard = false;
    let currentLevel = 0;
    let score = 0;
    let moveCount = 0;

    const buildLevel = (lvl: number) => {
      while (cardsGroup.children.length > 0) cardsGroup.remove(cardsGroup.children[0]);
      cards = [];
      openCards = [];
      lockBoard = false;

      const cfg = LEVELS[lvl];
      const pairCount = (cfg.cols * cfg.rows) / 2;
      setPairsLeft(pairCount);
      setLevelIdx(lvl);
      callbacksRef.current.onStatusChange?.(cfg.label);

      const chosen = SYMBOLS.slice(0, pairCount);
      const deck = [...chosen, ...chosen].sort(() => Math.random() - 0.5);

      const spacingX = cfg.cols === 3 ? 2.6 : 2.2;
      const spacingZ = cfg.rows === 2 ? 2.9 : cfg.rows === 3 ? 2.4 : 2.05;
      const cardW = cfg.rows === 4 ? 1.65 : 1.9;
      const cardH = cfg.rows === 4 ? 1.65 : 2.1;

      deck.forEach((sym, i) => {
        const col = i % cfg.cols;
        const row = Math.floor(i / cfg.cols);
        const x = (col - (cfg.cols - 1) / 2) * spacingX;
        const z = (row - (cfg.rows - 1) / 2) * spacingZ;

        // BoxGeometry material order: +x, -x, +y (top=back), -y (bottom=front), +z, -z
        const mats = [
          sideMat,
          sideMat,
          backMat,
          faceMaterials.get(sym.id)!,
          sideMat,
          sideMat,
        ];
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(cardW, 0.22, cardH), mats);
        mesh.position.set(x, 0.2, z);
        mesh.castShadow = true;
        mesh.userData.cardIndex = i;
        cardsGroup.add(mesh);

        cards.push({
          index: i,
          symbolId: sym.id,
          mesh,
          flipped: false,
          matched: false,
          targetRotY: 0,
        });
      });
    };

    buildLevel(0);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      if (pausedRef.current || lockBoard) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObjects(cardsGroup.children, false);
      if (hits.length === 0) return;

      const idx = hits[0].object.userData.cardIndex as number;
      const card = cards[idx];
      if (!card || card.flipped || card.matched) return;

      sound.playSelect();
      card.flipped = true;
      card.targetRotY = Math.PI;
      openCards.push(card);

      if (openCards.length === 2) {
        moveCount += 1;
        setMoves(moveCount);
        const [a, b] = openCards;
        if (a.symbolId === b.symbolId) {
          sound.playSuccess();
          a.matched = true;
          b.matched = true;
          openCards = [];
          score += 25;
          callbacksRef.current.onScoreChange(score);
          particles.spawn(a.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xfacc15, 14);
          particles.spawn(b.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xfacc15, 14);

          const remaining = cards.filter((c) => !c.matched).length / 2;
          setPairsLeft(remaining);

          if (remaining === 0) {
            lockBoard = true;
            window.setTimeout(() => {
              if (currentLevel + 1 >= LEVELS.length) {
                callbacksRef.current.onVictory(
                  score,
                  `Ajoyib xotira! Barcha 3 bosqichni ${moveCount} ta urinishda yakunladingiz!`
                );
              } else {
                currentLevel += 1;
                buildLevel(currentLevel);
              }
            }, 900);
          }
        } else {
          lockBoard = true;
          window.setTimeout(() => {
            sound.playError();
            a.flipped = false;
            b.flipped = false;
            a.targetRotY = 0;
            b.targetRotY = 0;
            openCards = [];
            lockBoard = false;
          }, 720);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const stopLoop = engine.startLoop((dt) => {
      cards.forEach((c) => {
        c.mesh.rotation.z = THREE.MathUtils.damp(c.mesh.rotation.z, c.targetRotY, 10, dt);
        const lift = c.flipped && !c.matched ? 0.55 : c.matched ? 0.12 : 0.2;
        c.mesh.position.y = THREE.MathUtils.damp(c.mesh.position.y, lift, 9, dt);
      });
      particles.update(dt);
    }, pausedRef);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      stopLoop();
      engine.dispose();
    };
  }, [quality]);

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      <div className="pointer-events-none absolute top-4 inset-x-4 flex justify-center z-10">
        <div className="flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-slate-950/88 border border-slate-700/80 text-white text-sm">
          <span className="font-display font-bold text-sky-400">{LEVELS[levelIdx].label}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-num">Qolgan juftlar: {pairsLeft}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-num">Urinishlar: {moves}</span>
        </div>
      </div>
    </div>
  );
};
