import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GraphicsQuality } from '../types';

let cachedSoftwareGl: boolean | null = null;

export function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = true;
    return true;
  }
}

export interface EngineContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  isSoftwareGl: boolean;
  envMap: THREE.Texture;
  resizeObserver: ResizeObserver;
  dispose: () => void;
  startLoop: (
    onUpdate: (dt: number, elapsed: number) => void,
    isPausedRef: { current: boolean }
  ) => () => void;
}

export function createEngine(
  container: HTMLElement,
  quality: GraphicsQuality,
  options?: {
    fov?: number;
    near?: number;
    far?: number;
    background?: number;
    fogColor?: number;
    fogNear?: number;
    fogFar?: number;
    fogDensity?: number;
    alpha?: boolean;
  }
): EngineContext {
  const isSoftwareGl = detectSoftwareGl();
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);

  const scene = new THREE.Scene();
  if (!options?.alpha) {
    scene.background = new THREE.Color(options?.background ?? 0x0f172a);
  }
  if (options?.fogDensity !== undefined) {
    scene.fog = new THREE.FogExp2(
      options?.fogColor ?? options?.background ?? 0x0f172a,
      options.fogDensity
    );
  } else if (options?.fogNear !== undefined && options?.fogFar !== undefined) {
    scene.fog = new THREE.Fog(
      options?.fogColor ?? options?.background ?? 0x0f172a,
      options.fogNear,
      options.fogFar
    );
  }

  const camera = new THREE.PerspectiveCamera(
    options?.fov ?? 55,
    width / height,
    options?.near ?? 0.1,
    options?.far ?? 400
  );

  const qualityDpr =
    quality === 'low' ? 1 : quality === 'medium' ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 2);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl && quality !== 'low',
    alpha: Boolean(options?.alpha),
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(isSoftwareGl ? 1 : qualityDpr);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl && quality !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Studio environment reflections (RoomEnvironment)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRt = pmrem.fromScene(new RoomEnvironment(), 0.04);
  const envMap = envRt.texture;
  scene.environment = envMap;
  pmrem.dispose();

  const handleContextLost = (e: Event) => {
    e.preventDefault();
  };
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

  const resizeObserver = new ResizeObserver(() => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  let activeCancel: (() => void) | null = null;

  const startLoop = (
    onUpdate: (dt: number, elapsed: number) => void,
    isPausedRef: { current: boolean }
  ) => {
    let running = true;
    let frameId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    if (!isSoftwareGl) {
      try {
        renderer.compile(scene, camera);
      } catch {
        // Ignore pre-compile warnings
      }
    }

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (!running) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (!running) return;
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      if (!isPausedRef.current && !document.hidden) {
        elapsed += dt;
        onUpdate(dt, elapsed);
      }
      renderer.render(scene, camera);

      if (!running) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    const stop = () => {
      running = false;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
    };
    activeCancel = stop;
    return stop;
  };

  const dispose = () => {
    if (activeCancel) {
      activeCancel();
      activeCancel = null;
    }
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
    disposeObjectTree(scene);
    envRt.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  };

  return {
    scene,
    camera,
    renderer,
    isSoftwareGl,
    envMap,
    resizeObserver,
    dispose,
    startLoop,
  };
}

export function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.normalMap?.dispose();
        std.roughnessMap?.dispose();
        std.metalnessMap?.dispose();
        std.emissiveMap?.dispose();
        m.dispose();
      });
    }
  });
}

export function setupThreePointLighting(
  scene: THREE.Scene,
  quality: GraphicsQuality,
  options?: {
    keyColor?: number;
    keyIntensity?: number;
    keyPos?: [number, number, number];
    skyColor?: number;
    groundColor?: number;
    hemiIntensity?: number;
    rimColor?: number;
    shadowRange?: number;
  }
) {
  const hemi = new THREE.HemisphereLight(
    options?.skyColor ?? 0xdbeafe,
    options?.groundColor ?? 0x334155,
    options?.hemiIntensity ?? 0.85
  );
  scene.add(hemi);

  const key = new THREE.DirectionalLight(
    options?.keyColor ?? 0xfff5e4,
    options?.keyIntensity ?? 1.55
  );
  const [kx, ky, kz] = options?.keyPos ?? [14, 24, 14];
  key.position.set(kx, ky, kz);

  const isSoft = detectSoftwareGl();
  if (!isSoft && quality !== 'low') {
    key.castShadow = true;
    const mapSize = quality === 'high' ? 1024 : 512;
    key.shadow.mapSize.set(mapSize, mapSize);
    const d = options?.shadowRange ?? 24;
    key.shadow.camera.left = -d;
    key.shadow.camera.right = d;
    key.shadow.camera.top = d;
    key.shadow.camera.bottom = -d;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 90;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.025;
  }
  scene.add(key);

  const rim = new THREE.DirectionalLight(options?.rimColor ?? 0x93c5fd, 0.55);
  rim.position.set(-14, 10, -14);
  scene.add(rim);

  return { hemi, key, rim };
}

export function createCanvasTexture(
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadow(radius = 1.6, opacity = 0.42): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, `rgba(0,0,0,${opacity})`);
  grad.addColorStop(0.6, `rgba(0,0,0,${opacity * 0.4})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.025;
  return mesh;
}

export function createLabelTexture(
  renderer: THREE.WebGLRenderer,
  text: string,
  bgHex: string,
  textHex = '#ffffff',
  subtext?: string
): THREE.CanvasTexture {
  return createCanvasTexture(renderer, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, w, h);

    // Subtle radial sheen
    const g = ctx.createRadialGradient(w * 0.35, h * 0.25, 20, w * 0.5, h * 0.5, w * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Frame border
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 18;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.fillStyle = textHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = text.length <= 2 ? 220 : text.length <= 5 ? 140 : 88;
    ctx.font = `800 ${fontSize}px Outfit, sans-serif`;
    ctx.fillText(text, w / 2, subtext ? h * 0.44 : h * 0.52);

    if (subtext) {
      ctx.font = '600 44px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(subtext, w / 2, h * 0.74);
    }
  });
}

export function createGrassTexture(renderer: THREE.WebGLRenderer, repeat = 10): THREE.CanvasTexture {
  return createCanvasTexture(
    renderer,
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#3f8f46';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 650; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const shade = Math.random() > 0.5 ? '#4ca353' : '#357a3c';
        ctx.fillStyle = shade;
        ctx.fillRect(x, y, 3, 8);
      }
    },
    repeat,
    repeat
  );
}

export function createAsphaltTexture(
  renderer: THREE.WebGLRenderer,
  repeatX = 1,
  repeatY = 12
): THREE.CanvasTexture {
  return createCanvasTexture(
    renderer,
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#262b36';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        const v = 30 + Math.floor(Math.random() * 26);
        ctx.fillStyle = `rgb(${v},${v + 3},${v + 8})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      // Side solid lines
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(10, 0, 6, h);
      ctx.fillRect(w - 16, 0, 6, h);
      // Center dashed line
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(w / 2 - 4, 24, 8, 92);
      ctx.fillRect(w / 2 - 4, 152, 8, 92);
    },
    repeatX,
    repeatY
  );
}

export function createWoodFloorTexture(renderer: THREE.WebGLRenderer, repeat = 4): THREE.CanvasTexture {
  return createCanvasTexture(
    renderer,
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#d49a5a';
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 32) {
        ctx.fillStyle = y % 64 === 0 ? '#c98e4e' : '#dba366';
        ctx.fillRect(0, y, w, 30);
        ctx.fillStyle = '#a36f38';
        ctx.fillRect(0, y + 30, w, 2);
      }
    },
    repeat,
    repeat
  );
}
