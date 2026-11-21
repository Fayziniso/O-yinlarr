import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createEngine, setupThreePointLighting } from '../engine/threeUtils';
import { GraphicsQuality, ThemeMode } from '../types';

interface Hero3DSceneProps {
  primaryColor: number;
  secondaryColor: number;
  theme: ThemeMode;
  quality: GraphicsQuality;
}

export const Hero3DScene: React.FC<Hero3DSceneProps> = ({
  primaryColor,
  secondaryColor,
  theme,
  quality,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bgHex = theme === 'dark' ? 0x090d16 : 0xf1f5f9;
    const engine = createEngine(container, quality, {
      fov: 48,
      background: bgHex,
      fogColor: bgHex,
      fogNear: 14,
      fogFar: 42,
    });
    const { scene, camera } = engine;
    camera.position.set(0, 1.5, 13.5);

    setupThreePointLighting(scene, quality, {
      keyColor: 0xfff7ed,
      keyIntensity: 1.4,
      skyColor: theme === 'dark' ? 0x38bdf8 : 0xe0f2fe,
      groundColor: theme === 'dark' ? 0x0f172a : 0xcbd5e1,
      hemiIntensity: 0.9,
      rimColor: primaryColor,
    });

    // Central floating gaming artifact group (composite multi-part)
    const centerGroup = new THREE.Group();
    centerGroup.position.set(3.2, 0.2, 0);
    scene.add(centerGroup);

    const coreMat = new THREE.MeshPhysicalMaterial({
      color: primaryColor,
      metalness: 0.78,
      roughness: 0.18,
      clearcoat: 1.0,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: theme === 'dark' ? 0xe2e8f0 : 0x1e293b,
      metalness: 0.85,
      roughness: 0.22,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      emissive: secondaryColor,
      emissiveIntensity: 1.3,
      roughness: 0.25,
    });

    const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.75, 0), coreMat);
    centerGroup.add(coreMesh);

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.08, 16, 64), frameMat);
    ring1.rotation.x = Math.PI / 3;
    centerGroup.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.055, 14, 64), glowMat);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 5;
    centerGroup.add(ring2);

    // Floating geometric satellites
    const satellites: { mesh: THREE.Mesh; basePos: THREE.Vector3; speed: number; phase: number }[] = [];
    const satGeos = [
      new THREE.BoxGeometry(0.75, 0.75, 0.75),
      new THREE.IcosahedronGeometry(0.55, 0),
      new THREE.ConeGeometry(0.5, 0.95, 6),
      new THREE.TorusGeometry(0.45, 0.16, 12, 24),
    ];

    for (let i = 0; i < 12; i++) {
      const mat = i % 2 === 0 ? coreMat : glowMat;
      const mesh = new THREE.Mesh(satGeos[i % satGeos.length], mat);
      const angle = (i / 12) * Math.PI * 2;
      const radius = 5.2 + (i % 3) * 1.9;
      const x = Math.cos(angle) * radius + 1.5;
      const y = ((i % 5) - 2) * 1.45;
      const z = Math.sin(angle) * 4.5 - 2.5;
      mesh.position.set(x, y, z);
      scene.add(mesh);
      satellites.push({
        mesh,
        basePos: new THREE.Vector3(x, y, z),
        speed: 0.5 + (i % 4) * 0.22,
        phase: i * 0.9,
      });
    }

    // Subtle ambient particle field (InstancedMesh)
    const particleCount = quality === 'low' ? 35 : 70;
    const pGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({
      color: theme === 'dark' ? 0x94a3b8 : 0x64748b,
      transparent: true,
      opacity: theme === 'dark' ? 0.55 : 0.35,
    });
    const instanced = new THREE.InstancedMesh(pGeo, pMat, particleCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < particleCount; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 16 - 4
      );
      dummy.scale.setScalar(0.6 + Math.random() * 1.4);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    }
    instanced.computeBoundingSphere();
    scene.add(instanced);

    // Subtle mouse parallax
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const stopLoop = engine.startLoop((dt, elapsed) => {
      coreMesh.rotation.y += dt * 0.55;
      coreMesh.rotation.x += dt * 0.25;
      ring1.rotation.z += dt * 0.4;
      ring1.rotation.y += dt * 0.2;
      ring2.rotation.x -= dt * 0.32;
      ring2.rotation.z -= dt * 0.22;
      centerGroup.position.y = Math.sin(elapsed * 1.1) * 0.35;

      for (let i = 0; i < satellites.length; i++) {
        const s = satellites[i];
        s.mesh.rotation.x += dt * s.speed;
        s.mesh.rotation.y += dt * s.speed * 0.8;
        s.mesh.position.y = s.basePos.y + Math.sin(elapsed * s.speed + s.phase) * 0.35;
      }

      instanced.rotation.y = elapsed * 0.03;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 1.1, 3, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.4 + pointer.y * 0.6, 3, dt);
      camera.lookAt(1.2, 0, 0);
    }, pausedRef);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      stopLoop();
      engine.dispose();
    };
  }, [primaryColor, secondaryColor, theme, quality]);

  return <div ref={containerRef} className="w-full h-full" aria-hidden="true" />;
};
