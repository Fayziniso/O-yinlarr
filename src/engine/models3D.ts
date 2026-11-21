import * as THREE from 'three';

export interface CarModelRig {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  frontWheels: THREE.Object3D[];
}

/**
 * Composite 10-part PBR Sports Car / SUV model pivoted at bottom-center (y = 0)
 */
export function buildCarModel(
  bodyHex: number,
  accentHex = 0x0f172a,
  style: 'sport' | 'suv' | 'taxi' = 'sport'
): CarModelRig {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: bodyHex,
    metalness: 0.72,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    roughness: 0.55,
    metalness: 0.3,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.2,
    roughness: 0.08,
    clearcoat: 1.0,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x17191f, roughness: 0.88, metalness: 0.05 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.18 });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff8dc,
    emissive: 0xfef08a,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    emissive: 0xef4444,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  const isSuv = style === 'suv';
  const bodyH = isSuv ? 0.75 : 0.52;
  const bodyLen = isSuv ? 4.2 : 4.4;
  const bodyW = isSuv ? 2.05 : 1.92;

  // 1. Lower chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyLen), bodyMat);
  chassis.position.set(0, 0.36 + bodyH / 2, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // 2. Cabin roof
  const cabinLen = isSuv ? 2.4 : 1.95;
  const cabinH = isSuv ? 0.65 : 0.48;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.28, cabinH, cabinLen), bodyMat);
  cabin.position.set(0, 0.36 + bodyH + cabinH / 2 - 0.04, isSuv ? -0.15 : -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // 3. Windshield & Side Glass band
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW - 0.22, cabinH - 0.12, cabinLen + 0.08),
    glassMat
  );
  glass.position.set(0, 0.36 + bodyH + cabinH / 2 - 0.06, isSuv ? -0.15 : -0.2);
  group.add(glass);

  // 4. Front bumper & splitter
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.06, 0.22, 0.34), darkMat);
  frontBumper.position.set(0, 0.42, bodyLen / 2 + 0.02);
  group.add(frontBumper);

  // 5. Rear diffuser + spoiler (for sport) or roof sign (for taxi)
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.04, 0.24, 0.28), darkMat);
  rearBumper.position.set(0, 0.42, -bodyLen / 2 - 0.02);
  group.add(rearBumper);

  if (style === 'sport') {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.1, 0.08, 0.36), darkMat);
    wing.position.set(0, 0.36 + bodyH + 0.26, -bodyLen / 2 + 0.28);
    wing.castShadow = true;
    group.add(wing);
    for (const sx of [-0.62, 0.62]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.16), darkMat);
      strut.position.set(sx, 0.36 + bodyH + 0.12, -bodyLen / 2 + 0.28);
      group.add(strut);
    }
  } else if (style === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.2, 0.26),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfacc15,
        emissiveIntensity: 0.9,
      })
    );
    sign.position.set(0, 0.36 + bodyH + cabinH + 0.08, -0.1);
    group.add(sign);
  }

  // 6. Headlights & Taillights
  for (const sx of [-0.64, 0.64]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.08), headMat);
    hl.position.set(sx, 0.36 + bodyH * 0.65, bodyLen / 2 + 0.01);
    group.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), tailMat);
    tl.position.set(sx, 0.36 + bodyH * 0.65, -bodyLen / 2 - 0.01);
    group.add(tl);
  }

  // 7. Four detailed wheels (tire + alloy hub)
  const wheels: THREE.Object3D[] = [];
  const frontWheels: THREE.Object3D[] = [];
  const wheelRadius = isSuv ? 0.44 : 0.37;
  const wheelPositions: [number, number, boolean][] = [
    [-bodyW / 2 - 0.04, bodyLen * 0.32, true],
    [bodyW / 2 + 0.04, bodyLen * 0.32, true],
    [-bodyW / 2 - 0.04, -bodyLen * 0.32, false],
    [bodyW / 2 + 0.04, -bodyLen * 0.32, false],
  ];

  wheelPositions.forEach(([wx, wz, isFront]) => {
    const pivot = new THREE.Group();
    pivot.position.set(wx, wheelRadius, wz);

    const wheelSpin = new THREE.Group();
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.28, 18),
      tireMat
    );
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelSpin.add(tire);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, 0.3, 12),
      rimMat
    );
    hub.rotation.z = Math.PI / 2;
    wheelSpin.add(hub);

    pivot.add(wheelSpin);
    group.add(pivot);
    wheels.push(wheelSpin);
    if (isFront) frontWheels.push(pivot);
  });

  return { group, wheels, frontWheels };
}

/**
 * Composite 8-part PBR Starfighter spaceship pointing along -Z
 */
export function buildSpaceship(primaryHex = 0x38bdf8, accentHex = 0xf59e0b): THREE.Group {
  const ship = new THREE.Group();

  const hullMat = new THREE.MeshPhysicalMaterial({
    color: primaryHex,
    metalness: 0.78,
    roughness: 0.22,
    clearcoat: 0.9,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.65,
    roughness: 0.35,
  });
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.3,
    roughness: 0.08,
    clearcoat: 1.0,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });

  // Fuselage nose cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 8), hullMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0, -1.0);
  nose.castShadow = true;
  ship.add(nose);

  // Main body
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 1.5, 8), trimMat);
  core.rotation.x = Math.PI / 2;
  core.position.set(0, 0, 0.75);
  ship.add(core);

  // Cockpit canopy
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), canopyMat);
  canopy.scale.set(0.9, 0.65, 1.8);
  canopy.position.set(0, 0.36, -0.05);
  ship.add(canopy);

  // Swept wings
  const wingGeo = new THREE.BoxGeometry(3.5, 0.1, 1.0);
  const wings = new THREE.Mesh(wingGeo, hullMat);
  wings.position.set(0, -0.04, 0.55);
  wings.castShadow = true;
  ship.add(wings);

  // Twin vertical stabilizers & thruster nacelles
  for (const sx of [-1.25, 1.25]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.9), trimMat);
    fin.position.set(sx, 0.28, 0.75);
    ship.add(fin);

    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.2, 10), trimMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(sx * 0.65, -0.08, 1.05);
    ship.add(pod);

    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.08, 0.4, 10), glowMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(sx * 0.65, -0.08, 1.72);
    ship.add(thruster);
  }

  return ship;
}

/**
 * Stylized multi-layered 3D tree (bottom-center pivoted at y = 0)
 */
export function buildStylizedTree(scale = 1, foliageHex = 0x2e8b57): THREE.Group {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9, metalness: 0.0 });
  const leafMat = new THREE.MeshStandardMaterial({ color: foliageHex, roughness: 0.75, metalness: 0.0 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 2.0, 8), trunkMat);
  trunk.position.y = 1.0;
  trunk.castShadow = true;
  tree.add(trunk);

  const layers = [
    { r: 1.55, h: 1.8, y: 2.35 },
    { r: 1.2, h: 1.5, y: 3.35 },
    { r: 0.8, h: 1.2, y: 4.15 },
  ];
  layers.forEach((l) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(l.r, l.h, 8), leafMat);
    cone.position.y = l.y;
    cone.castShadow = true;
    tree.add(cone);
  });

  tree.scale.setScalar(scale);
  return tree;
}

/**
 * Friendly composite 3D animals for 3–5 yosh game
 */
export type AnimalKind = 'mushuk' | 'kuchuk' | 'sigir' | 'ordak' | 'sher' | 'quyon';

export function buildFriendlyAnimal(kind: AnimalKind): THREE.Group {
  const g = new THREE.Group();
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.2 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

  const palette: Record<AnimalKind, { main: number; accent: number; nose: number }> = {
    mushuk: { main: 0xf97316, accent: 0xfed7aa, nose: 0xf43f5e },
    kuchuk: { main: 0xa16207, accent: 0x713f12, nose: 0x1e293b },
    sigir: { main: 0xf8fafc, accent: 0x1e293b, nose: 0xfda4af },
    ordak: { main: 0xfacc15, accent: 0xf97316, nose: 0xea580c },
    sher: { main: 0xeab308, accent: 0x9a3412, nose: 0x7c2d12 },
    quyon: { main: 0xf1f5f9, accent: 0xfbcfe8, nose: 0xf472b6 },
  };

  const p = palette[kind];
  const mainMat = new THREE.MeshStandardMaterial({ color: p.main, roughness: 0.55 });
  const accentMat = new THREE.MeshStandardMaterial({ color: p.accent, roughness: 0.65 });
  const noseMat = new THREE.MeshStandardMaterial({ color: p.nose, roughness: 0.35 });

  // Body
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 20, 16),
    mainMat
  );
  body.scale.set(0.95, 0.85, kind === 'ordak' ? 1.25 : 1.35);
  body.position.set(0, 0.95, 0);
  body.castShadow = true;
  g.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 16), mainMat);
  head.position.set(0, 1.55, 0.72);
  head.castShadow = true;
  g.add(head);

  // Eyes
  for (const sx of [-0.2, 0.2]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), whiteMat);
    eyeWhite.position.set(sx, 1.66, 1.18);
    g.add(eyeWhite);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), eyeMat);
    pupil.position.set(sx, 1.66, 1.26);
    g.add(pupil);
  }

  // Legs
  const legPositions =
    kind === 'ordak'
      ? [
          [-0.25, 0.0],
          [0.25, 0.0],
        ]
      : [
          [-0.36, 0.45],
          [0.36, 0.45],
          [-0.36, -0.45],
          [0.36, -0.45],
        ];
  legPositions.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.14, 0.65, 10),
      kind === 'ordak' ? accentMat : mainMat
    );
    leg.position.set(lx, 0.32, lz);
    leg.castShadow = true;
    g.add(leg);
  });

  // Species-defining details
  if (kind === 'mushuk') {
    for (const sx of [-0.32, 0.32]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 6), mainMat);
      ear.position.set(sx, 2.08, 0.68);
      g.add(ear);
    }
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), noseMat);
    snout.position.set(0, 1.5, 1.25);
    g.add(snout);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.0, 8), mainMat);
    tail.position.set(0, 1.3, -1.05);
    tail.rotation.x = -0.6;
    g.add(tail);
  } else if (kind === 'kuchuk') {
    for (const sx of [-0.48, 0.48]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.3), accentMat);
      ear.position.set(sx, 1.5, 0.66);
      ear.rotation.z = sx > 0 ? -0.25 : 0.25;
      g.add(ear);
    }
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.34), accentMat);
    muzzle.position.set(0, 1.44, 1.22);
    g.add(muzzle);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), noseMat);
    nose.position.set(0, 1.52, 1.4);
    g.add(nose);
  } else if (kind === 'sigir') {
    const spot1 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), accentMat);
    spot1.position.set(0.45, 1.05, 0.05);
    g.add(spot1);
    const spot2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), accentMat);
    spot2.position.set(-0.42, 1.1, -0.35);
    g.add(spot2);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.3, 0.34), noseMat);
    muzzle.position.set(0, 1.38, 1.18);
    g.add(muzzle);
    for (const sx of [-0.28, 0.28]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 8), accentMat);
      horn.position.set(sx, 2.08, 0.65);
      horn.rotation.z = sx > 0 ? -0.3 : 0.3;
      g.add(horn);
    }
  } else if (kind === 'ordak') {
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.44), accentMat);
    beak.position.set(0, 1.48, 1.28);
    g.add(beak);
    for (const sx of [-0.68, 0.68]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), mainMat);
      wing.scale.set(0.35, 0.75, 1.25);
      wing.position.set(sx, 1.02, -0.05);
      g.add(wing);
    }
  } else if (kind === 'sher') {
    const mane = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.24, 12, 20), accentMat);
    mane.position.set(0, 1.55, 0.62);
    g.add(mane);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), noseMat);
    nose.position.set(0, 1.48, 1.26);
    g.add(nose);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.1, 8), mainMat);
    tail.position.set(0, 1.05, -1.05);
    tail.rotation.x = -0.8;
    g.add(tail);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), accentMat);
    tuft.position.set(0, 1.45, -1.45);
    g.add(tuft);
  } else if (kind === 'quyon') {
    for (const sx of [-0.2, 0.2]) {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.85, 10), mainMat);
      ear.position.set(sx, 2.32, 0.68);
      ear.rotation.z = sx > 0 ? -0.15 : 0.15;
      g.add(ear);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), noseMat);
    nose.position.set(0, 1.52, 1.26);
    g.add(nose);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), whiteMat);
    puff.position.set(0, 0.9, -1.02);
    g.add(puff);
  }

  return g;
}

/**
 * Composite 3D Fruits (Olma, Banan, Nok)
 */
export type FruitKind = 'olma' | 'banan' | 'nok';

export function buildFruit3D(kind: FruitKind): THREE.Group {
  const g = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.55 });

  if (kind === 'olma') {
    const appleMat = new THREE.MeshPhysicalMaterial({
      color: 0xe11d48,
      roughness: 0.25,
      clearcoat: 0.7,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.68, 22, 18), appleMat);
    body.scale.set(1.06, 0.96, 1.06);
    body.position.y = 0.68;
    body.castShadow = true;
    g.add(body);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.35, 8), stemMat);
    stem.position.set(0, 1.38, 0);
    stem.rotation.z = 0.15;
    g.add(stem);

    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), leafMat);
    leaf.scale.set(1.2, 0.25, 0.65);
    leaf.position.set(0.22, 1.4, 0);
    leaf.rotation.z = 0.35;
    g.add(leaf);
  } else if (kind === 'banan') {
    const banMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.65, 0.35, 0),
      new THREE.Vector3(-0.2, 0.85, 0),
      new THREE.Vector3(0.3, 0.9, 0),
      new THREE.Vector3(0.75, 0.45, 0),
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.22, 12, false), banMat);
    tube.castShadow = true;
    g.add(tube);

    const tipA = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), stemMat);
    tipA.position.set(-0.68, 0.32, 0);
    g.add(tipA);
    const tipB = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), stemMat);
    tipB.position.set(0.78, 0.43, 0);
    g.add(tipB);
  } else {
    // Nok (Pear using LatheGeometry)
    const pearMat = new THREE.MeshPhysicalMaterial({
      color: 0x84cc16,
      roughness: 0.32,
      clearcoat: 0.5,
    });
    const pts = [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(0.45, 0.15),
      new THREE.Vector2(0.62, 0.48),
      new THREE.Vector2(0.46, 0.88),
      new THREE.Vector2(0.32, 1.25),
      new THREE.Vector2(0.18, 1.48),
      new THREE.Vector2(0.01, 1.54),
    ];
    const pear = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), pearMat);
    pear.castShadow = true;
    g.add(pear);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.32, 8), stemMat);
    stem.position.set(0, 1.66, 0);
    g.add(stem);

    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), leafMat);
    leaf.scale.set(1.2, 0.22, 0.6);
    leaf.position.set(0.2, 1.66, 0);
    leaf.rotation.z = 0.4;
    g.add(leaf);
  }

  return g;
}

/**
 * Composite 3D Dinosaurs for Dinozavrlar olami
 */
export type DinoSpecies = 'trex' | 'triceratops' | 'stegosaurus' | 'brachiosaurus' | 'pteranodon';

export function buildDinosaur(species: DinoSpecies): THREE.Group {
  const g = new THREE.Group();
  const colors: Record<DinoSpecies, { body: number; accent: number }> = {
    trex: { body: 0x15803d, accent: 0x86efac },
    triceratops: { body: 0xd97706, accent: 0xfde68a },
    stegosaurus: { body: 0x0f766e, accent: 0xf59e0b },
    brachiosaurus: { body: 0x0284c7, accent: 0xbae6fd },
    pteranodon: { body: 0x9333ea, accent: 0xf9a8d4 },
  };
  const c = colors[species];
  const bodyMat = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.6 });
  const accentMat = new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.45 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  if (species === 'pteranodon') {
    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 8), bodyMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.set(0, 3.8, 0);
    g.add(torso);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.3, 6), accentMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 3.85, 1.35);
    g.add(beak);
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 6), bodyMat);
    crest.rotation.x = -Math.PI / 2;
    crest.position.set(0, 4.05, 0.3);
    g.add(crest);
    for (const sx of [-1.8, 1.8]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.2), bodyMat);
      wing.position.set(sx, 3.85, 0.1);
      wing.rotation.z = sx > 0 ? 0.15 : -0.15;
      wing.castShadow = true;
      g.add(wing);
    }
    return g;
  }

  // Main body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.25, 2.5), bodyMat);
  body.position.set(0, 1.75, 0);
  body.castShadow = true;
  g.add(body);

  // Tail
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 8), bodyMat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 1.65, -2.25);
  tail.castShadow = true;
  g.add(tail);

  // Legs
  const legs: [number, number][] =
    species === 'trex'
      ? [
          [-0.55, -0.1],
          [0.55, -0.1],
        ]
      : [
          [-0.55, 0.85],
          [0.55, 0.85],
          [-0.55, -0.85],
          [0.55, -0.85],
        ];
  legs.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.3, 0.5), bodyMat);
    leg.position.set(lx, 0.65, lz);
    leg.castShadow = true;
    g.add(leg);
  });

  if (species === 'trex') {
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.2, 1.0), bodyMat);
    neck.position.set(0, 2.65, 1.1);
    g.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.85, 1.55), bodyMat);
    head.position.set(0, 3.3, 1.65);
    head.castShadow = true;
    g.add(head);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.25, 1.3), accentMat);
    jaw.position.set(0, 2.78, 1.7);
    g.add(jaw);
    for (const sx of [-0.55, 0.55]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), eyeMat);
      eye.position.set(sx, 3.45, 1.9);
      g.add(eye);
    }
  } else if (species === 'triceratops') {
    const frill = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.22, 12), accentMat);
    frill.rotation.x = Math.PI / 2 - 0.3;
    frill.position.set(0, 2.35, 1.35);
    g.add(frill);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.85, 1.35), bodyMat);
    head.position.set(0, 1.95, 1.9);
    g.add(head);
    for (const sx of [-0.36, 0.36]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.95, 8), accentMat);
      horn.rotation.x = Math.PI / 2 - 0.25;
      horn.position.set(sx, 2.32, 2.55);
      g.add(horn);
    }
  } else if (species === 'stegosaurus') {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 1.0), bodyMat);
    head.position.set(0, 1.75, 1.75);
    g.add(head);
    for (let i = 0; i < 6; i++) {
      const plate = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.78, 4), accentMat);
      plate.position.set(i % 2 === 0 ? -0.18 : 0.18, 2.65, 0.85 - i * 0.45);
      g.add(plate);
    }
  } else {
    // Brachiosaurus tall neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.62, 3.8, 10), bodyMat);
    neck.position.set(0, 3.65, 1.45);
    neck.rotation.x = 0.28;
    neck.castShadow = true;
    g.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.6, 1.05), bodyMat);
    head.position.set(0, 5.45, 2.15);
    g.add(head);
    const crest = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), accentMat);
    crest.position.set(0, 5.82, 2.05);
    g.add(crest);
  }

  return g;
}

/**
 * Stylized 3D Human Character (Explorer / Footballer / Survivor) pivoted at y=0
 */
export function buildCharacter(shirtHex = 0x0ea5e9, pantsHex = 0x1e293b): THREE.Group {
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.6 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.5 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.7 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });

  for (const sx of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.24), pantsMat);
    leg.position.set(sx, 0.42, 0);
    leg.castShadow = true;
    g.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.36), shoeMat);
    shoe.position.set(sx, 0.07, 0.05);
    g.add(shoe);
  }

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.36), shirtMat);
  torso.position.set(0, 1.15, 0);
  torso.castShadow = true;
  g.add(torso);

  for (const sx of [-0.42, 0.42]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.64, 0.2), shirtMat);
    arm.position.set(sx, 1.12, 0);
    arm.castShadow = true;
    g.add(arm);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14), skinMat);
  head.position.set(0, 1.82, 0);
  head.castShadow = true;
  g.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
  );
  hair.position.set(0, 1.85, -0.02);
  g.add(hair);

  return g;
}

/**
 * Simple lightweight 3D particle burst manager (zero GC per frame)
 */
export interface ParticleBurstSystem {
  spawn: (pos: THREE.Vector3, colorHex: number, count?: number) => void;
  update: (dt: number) => void;
}

export function createParticleSystem(scene: THREE.Scene, maxParticles = 80): ParticleBurstSystem {
  const geo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  const particles: {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    life: number;
    maxLife: number;
  }[] = [];

  for (let i = 0; i < maxParticles; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    particles.push({
      mesh,
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
    });
  }

  let cursor = 0;

  return {
    spawn(pos: THREE.Vector3, colorHex: number, count = 14) {
      for (let i = 0; i < count; i++) {
        const p = particles[cursor % maxParticles];
        cursor++;
        p.mesh.visible = true;
        p.mesh.position.copy(pos);
        p.mesh.scale.setScalar(1);
        (p.mesh.material as THREE.MeshStandardMaterial).color.setHex(colorHex);
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.2 + Math.random() * 4.5;
        p.vel.set(Math.cos(angle) * speed, 2.5 + Math.random() * 4.2, Math.sin(angle) * speed);
        p.life = 0.65 + Math.random() * 0.35;
        p.maxLife = p.life;
      }
    },
    update(dt: number) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.mesh.visible = false;
          continue;
        }
        p.vel.y -= 9.5 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.rotation.x += dt * 6;
        p.mesh.rotation.y += dt * 5;
        p.mesh.scale.setScalar(Math.max(0.05, p.life / p.maxLife));
      }
    },
  };
}
