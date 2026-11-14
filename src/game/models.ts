import * as THREE from 'three';
import { PISTAS_META, TrackId } from './config';
import { TrackData } from './tracks';
import {
  createAsphaltTextures,
  createBoostPadTexture,
  createBuildingFacadeTexture,
  createContactShadowTexture,
  createFinishLineTexture,
  createGroundGridTexture,
  createQuestionMarkTexture,
  createZoneBannerTexture,
} from './textures';

export interface KartMeshHandle {
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  neonMat: THREE.MeshStandardMaterial;
  frontWheels: THREE.Group[];
  allWheels: THREE.Mesh[];
  flameLeft: THREE.Mesh;
  flameRight: THREE.Mesh;
  shieldDome: THREE.Mesh;
  driverSprite?: THREE.Sprite;
  updateColors: (chassisHex: string, neonHex: string) => void;
}

/**
 * Cria um kart 3D composto (10 partes) com chassi chanfrado, rodas giratórias,
 * aerofólio, escapamentos, chamas de turbo, escudo energético e piloto.
 */
export function createKartMesh(options: {
  chassisHex: string;
  neonHex: string;
  helmetHex: string;
  shadowTexture: THREE.Texture;
  driverTexture?: THREE.Texture | null;
  isPlayerDriver?: boolean;
}): KartMeshHandle {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: options.chassisHex,
    roughness: 0.45,
    metalness: 0.22,
    envMapIntensity: 0.55,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: '#1E1E26',
    roughness: 0.72,
    metalness: 0.2,
  });
  const neonMat = new THREE.MeshStandardMaterial({
    color: options.neonHex,
    emissive: options.neonHex,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.1,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#111216',
    roughness: 0.88,
    metalness: 0.08,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#D8DCE6',
    roughness: 0.2,
    metalness: 0.92,
  });

  // 1. Sombra de contato radial no chão (Y = 0.02 para evitar Z-fighting)
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 4.4),
    new THREE.MeshBasicMaterial({
      map: options.shadowTexture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.025;
  group.add(contactShadow);

  // 2. Chassi principal chanfrado (ExtrudeGeometry)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-0.85, -1.45);
  hullShape.lineTo(0.85, -1.45);
  hullShape.lineTo(1.02, -0.35);
  hullShape.lineTo(0.72, 1.35);
  hullShape.lineTo(0.32, 1.65);
  hullShape.lineTo(-0.32, 1.65);
  hullShape.lineTo(-0.72, 1.35);
  hullShape.lineTo(-1.02, -0.35);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.36,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 2,
  });
  hullGeo.rotateX(Math.PI / 2);
  const hullMesh = new THREE.Mesh(hullGeo, bodyMat);
  hullMesh.position.y = 0.62;
  hullMesh.castShadow = true;
  group.add(hullMesh);

  // 3. Faixa neon inferior (underglow trim)
  const trimMesh = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.1, 2.7), neonMat);
  trimMesh.position.set(0, 0.33, 0.05);
  group.add(trimMesh);

  // 4. Bico frontal aerodinâmico + faixa neon dianteira
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.22, 0.38), secondaryMat);
  bumper.position.set(0, 0.42, 1.65);
  bumper.castShadow = true;
  group.add(bumper);

  const noseStripe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.42), neonMat);
  noseStripe.position.set(0, 0.56, 1.35);
  group.add(noseStripe);

  // 5. Banco do piloto e volante
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.72, 0.18), secondaryMat);
  seatBack.position.set(0, 0.94, -0.45);
  seatBack.rotation.x = -0.18;
  group.add(seatBack);

  const steeringCol = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8), chromeMat);
  steeringCol.position.set(0, 0.85, 0.52);
  steeringCol.rotation.x = -0.55;
  group.add(steeringCol);

  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 8, 16), neonMat);
  steeringWheel.position.set(0, 1.06, 0.36);
  steeringWheel.rotation.x = 0.5;
  group.add(steeringWheel);

  // 6. Aerofólio traseiro
  const spoilerPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.26), secondaryMat);
  spoilerPillarL.position.set(-0.55, 0.92, -1.32);
  const spoilerPillarR = spoilerPillarL.clone();
  spoilerPillarR.position.x = 0.55;
  group.add(spoilerPillarL, spoilerPillarR);

  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 0.42), bodyMat);
  spoilerWing.position.set(0, 1.22, -1.38);
  spoilerWing.rotation.x = 0.12;
  spoilerWing.castShadow = true;
  group.add(spoilerWing);

  const spoilerEdge = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.05, 0.08), neonMat);
  spoilerEdge.position.set(0, 1.24, -1.56);
  group.add(spoilerEdge);

  // 7. Escapamentos duplos + chamas de turbo
  const exhaustGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.48, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  const exhaustL = new THREE.Mesh(exhaustGeo, chromeMat);
  exhaustL.position.set(-0.36, 0.68, -1.52);
  const exhaustR = new THREE.Mesh(exhaustGeo, chromeMat);
  exhaustR.position.set(0.36, 0.68, -1.52);
  group.add(exhaustL, exhaustR);

  const flameGeo = new THREE.ConeGeometry(0.16, 0.95, 10);
  flameGeo.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: '#C6FF00',
    transparent: true,
    opacity: 0.9,
  });
  const flameLeft = new THREE.Mesh(flameGeo, flameMat);
  flameLeft.position.set(-0.36, 0.68, -2.05);
  flameLeft.visible = false;
  const flameRight = new THREE.Mesh(flameGeo, flameMat);
  flameRight.position.set(0.36, 0.68, -2.05);
  flameRight.visible = false;
  group.add(flameLeft, flameRight);

  // 8. Quatro rodas (dianteiras com pivô de esterço)
  const tireGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.38, 16);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.TorusGeometry(0.24, 0.045, 8, 16);
  rimGeo.rotateY(Math.PI / 2);

  const frontWheels: THREE.Group[] = [];
  const allWheels: THREE.Mesh[] = [];

  const wheelCoords: Array<{ x: number; z: number; front: boolean }> = [
    { x: -1.06, z: 0.98, front: true },
    { x: 1.06, z: 0.98, front: true },
    { x: -1.12, z: -1.02, front: false },
    { x: 1.12, z: -1.02, front: false },
  ];

  for (const wc of wheelCoords) {
    const pivot = new THREE.Group();
    pivot.position.set(wc.x, 0.4, wc.z);

    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, neonMat);
    rim.position.x = wc.x < 0 ? -0.19 : 0.19;
    tire.add(rim);

    pivot.add(tire);
    group.add(pivot);
    allWheels.push(tire);
    if (wc.front) frontWheels.push(pivot);
  }

  // 9. Piloto: Sprite 2D recortado para Zone/Zonia ou boneco 3D estilizado para IA
  let driverSprite: THREE.Sprite | undefined;
  if (options.isPlayerDriver) {
    const spriteMat = new THREE.SpriteMaterial({
      map: options.driverTexture ?? null,
      transparent: true,
      alphaTest: 0.15,
    });
    driverSprite = new THREE.Sprite(spriteMat);
    driverSprite.scale.set(1.72, 2.04, 1);
    driverSprite.position.set(0, 1.52, -0.08);
    group.add(driverSprite);
  } else {
    const driverGroup = new THREE.Group();
    driverGroup.position.set(0, 0.72, -0.12);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.36, 4, 10), secondaryMat);
    torso.position.y = 0.42;
    driverGroup.add(torso);

    const helmetMat = new THREE.MeshStandardMaterial({
      color: options.helmetHex,
      roughness: 0.2,
      metalness: 0.5,
    });
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), helmetMat);
    helmet.position.y = 0.95;
    helmet.castShadow = true;
    driverGroup.add(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.28), neonMat);
    visor.position.set(0, 0.95, 0.22);
    driverGroup.add(visor);

    group.add(driverGroup);
  }

  // 10. Escudo Zone (bolha energética semitransparente)
  const shieldDome = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 20, 16),
    new THREE.MeshBasicMaterial({
      color: '#C6FF00',
      transparent: true,
      opacity: 0.24,
      wireframe: true,
      depthWrite: false,
    })
  );
  shieldDome.position.y = 1.05;
  shieldDome.visible = false;
  group.add(shieldDome);

  return {
    group,
    bodyMat,
    neonMat,
    frontWheels,
    allWheels,
    flameLeft,
    flameRight,
    shieldDome,
    driverSprite,
    updateColors: (chassisHex: string, neonHex: string) => {
      bodyMat.color.set(chassisHex);
      neonMat.color.set(neonHex);
      neonMat.emissive.set(neonHex);
    },
  };
}

export interface TrackSceneObjects {
  root: THREE.Group;
  itemBoxes: Array<{ mesh: THREE.Group; progress: number; x: number; y: number; z: number; respawnTimer: number }>;
  coins: Array<{ mesh: THREE.Mesh; x: number; y: number; z: number; respawnTimer: number }>;
  boostPadPositions: Array<{ x: number; y: number; z: number }>;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Constrói a geometria da pista 3D, pórtico de largada, faixas de turbo,
 * caixas de item, moedas e cenário temático específico da pista.
 */
export function buildTrackScene(
  track: TrackData,
  trackId: TrackId,
  maxAnisotropy: number
): TrackSceneObjects {
  const root = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const meta = PISTAS_META[trackId];

  // 1. Plano de terreno extenso até o horizonte (evita bordas vazias)
  const gridColor =
    trackId === 'lime_desert'
      ? 'rgba(198, 255, 0, 0.12)'
      : trackId === 'arena_gamer'
      ? 'rgba(0, 240, 255, 0.14)'
      : 'rgba(198, 255, 0, 0.08)';
  const groundTex = createGroundGridTexture(meta.corTerreno, gridColor, maxAnisotropy);
  disposables.push(groundTex);

  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    color: '#A0A6B2',
    roughness: 0.98,
    metalness: 0.0,
  });
  const groundGeo = new THREE.PlaneGeometry(1600, 1600);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.15;
  groundMesh.receiveShadow = true;
  root.add(groundMesh);
  disposables.push(groundMat, groundGeo);

  // 2. Malha da pista fechada em faixa contínua (ribbon geometry) + guias laterais
  const samples = track.samples;
  const n = samples.length;
  const roadVerts: number[] = [];
  const roadNormals: number[] = [];
  const roadUvs: number[] = [];
  const roadIndices: number[] = [];

  const leftWallVerts: number[] = [];
  const rightWallVerts: number[] = [];
  const wallIndices: number[] = [];

  for (let i = 0; i <= n; i++) {
    const s = samples[i % n];
    // Verifica se há atalho expandindo este segmento
    let leftWidth = s.halfWidth;
    let rightWidth = s.halfWidth;
    for (const sc of track.shortcuts) {
      if (s.progress >= sc.startProgress && s.progress <= sc.endProgress) {
        if (sc.side === 'left') leftWidth += sc.extraWidth;
        else rightWidth += sc.extraWidth;
      }
    }

    const lx = s.pos.x - s.right.x * leftWidth;
    const lz = s.pos.z - s.right.z * leftWidth;
    const rx = s.pos.x + s.right.x * rightWidth;
    const rz = s.pos.z + s.right.z * rightWidth;
    const ry = s.pos.y + 0.01;

    roadVerts.push(lx, ry, lz, rx, ry, rz);
    roadNormals.push(0, 1, 0, 0, 1, 0);
    roadUvs.push(0, i * 0.25, 1, i * 0.25);

    // Muretas baixas de contorno
    leftWallVerts.push(lx, ry, lz, lx, ry + 0.9, lz);
    rightWallVerts.push(rx, ry, rz, rx, ry + 0.9, rz);

    if (i < n) {
      const base = i * 2;
      // Winding voltado para cima (+Y) para que o asfalto seja visível de cima
      roadIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      wallIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
  roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeo.setIndex(roadIndices);
  roadGeo.computeVertexNormals();

  const { map: asphaltMap, bumpMap: asphaltBump } = createAsphaltTextures(maxAnisotropy, meta.corBorda);
  disposables.push(asphaltMap, asphaltBump, roadGeo);

  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltMap,
    bumpMap: asphaltBump,
    bumpScale: 0.06,
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.12,
    side: THREE.DoubleSide,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  root.add(roadMesh);
  disposables.push(roadMat);

  // Muretas neon laterais
  const wallMat = new THREE.MeshStandardMaterial({
    color: '#191C22',
    emissive: '#C6FF00',
    emissiveIntensity: 0.22,
    roughness: 0.45,
    metalness: 0.5,
    side: THREE.DoubleSide,
  });
  const leftWallGeo = new THREE.BufferGeometry();
  leftWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftWallVerts, 3));
  leftWallGeo.setIndex(wallIndices);
  leftWallGeo.computeVertexNormals();
  const rightWallGeo = new THREE.BufferGeometry();
  rightWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightWallVerts, 3));
  rightWallGeo.setIndex(wallIndices);
  rightWallGeo.computeVertexNormals();
  root.add(new THREE.Mesh(leftWallGeo, wallMat), new THREE.Mesh(rightWallGeo, wallMat));
  disposables.push(wallMat, leftWallGeo, rightWallGeo);

  // 3. Linha de largada e Pórtico "ZONE PLAY"
  const finishTex = createFinishLineTexture(maxAnisotropy);
  const finishLineMat = new THREE.MeshBasicMaterial({
    map: finishTex,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const finishLineGeo = new THREE.PlaneGeometry(track.halfWidth * 1.92, 4.2);
  const finishLine = new THREE.Mesh(finishLineGeo, finishLineMat);
  finishLine.rotation.x = -Math.PI / 2;
  finishLine.rotation.z = -samples[0].yaw;
  finishLine.position.set(samples[0].pos.x, samples[0].pos.y + 0.04, samples[0].pos.z);
  root.add(finishLine);
  disposables.push(finishTex, finishLineMat, finishLineGeo);

  const gantryGroup = new THREE.Group();
  gantryGroup.position.set(samples[0].pos.x, samples[0].pos.y, samples[0].pos.z);
  gantryGroup.rotation.y = samples[0].yaw;

  const pillarGeo = new THREE.BoxGeometry(1.3, 10.5, 1.3);
  const pillarMat = new THREE.MeshStandardMaterial({ color: '#14151A', roughness: 0.4, metalness: 0.7 });
  const pillarL = new THREE.Mesh(pillarGeo, pillarMat);
  pillarL.position.set(-track.halfWidth - 0.8, 5.25, 0);
  const pillarR = pillarL.clone();
  pillarR.position.x = track.halfWidth + 0.8;

  const bannerTex = createZoneBannerTexture(meta.nome.toUpperCase(), maxAnisotropy);
  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
  const bannerGeo = new THREE.BoxGeometry(track.halfWidth * 2 + 2.6, 3.2, 1.1);
  const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
  bannerMesh.position.set(0, 9.2, 0);

  gantryGroup.add(pillarL, pillarR, bannerMesh);
  root.add(gantryGroup);
  disposables.push(pillarGeo, pillarMat, bannerTex, bannerMat, bannerGeo);

  // 4. Faixas de Turbo no chão
  const boostTex = createBoostPadTexture(maxAnisotropy);
  const boostMat = new THREE.MeshBasicMaterial({
    map: boostTex,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const boostGeo = new THREE.PlaneGeometry(4.6, 8.2);
  const boostPadPositions: Array<{ x: number; y: number; z: number }> = [];

  for (const pad of track.boostPads) {
    const mesh = new THREE.Mesh(boostGeo, boostMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -pad.yaw;
    mesh.position.set(pad.pos.x, pad.pos.y + 0.045, pad.pos.z);
    root.add(mesh);
    boostPadPositions.push({ x: pad.pos.x, y: pad.pos.y, z: pad.pos.z });
  }
  disposables.push(boostTex, boostMat, boostGeo);

  // 5. Caixas de Item (?) flutuantes
  const qTex = createQuestionMarkTexture();
  const boxGeo = new THREE.BoxGeometry(1.75, 1.75, 1.75);
  const boxMat = new THREE.MeshStandardMaterial({
    map: qTex,
    emissive: '#C6FF00',
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.3,
  });
  const shadowTex = createContactShadowTexture();
  const shadowGeo = new THREE.CircleGeometry(1.05, 16);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const itemBoxes: TrackSceneObjects['itemBoxes'] = [];

  for (const ib of track.itemBoxes) {
    const boxGroup = new THREE.Group();
    boxGroup.position.set(ib.pos.x, ib.pos.y, ib.pos.z);

    const cube = new THREE.Mesh(boxGeo, boxMat);
    cube.position.y = 1.65;
    boxGroup.add(cube);

    const sh = new THREE.Mesh(shadowGeo, shadowMat);
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.03;
    boxGroup.add(sh);

    root.add(boxGroup);
    itemBoxes.push({
      mesh: boxGroup,
      progress: ib.progress,
      x: ib.pos.x,
      y: ib.pos.y,
      z: ib.pos.z,
      respawnTimer: 0,
    });
  }
  disposables.push(qTex, boxGeo, boxMat, shadowTex, shadowGeo, shadowMat);

  // 6. Moedas Zone colecionáveis
  const coinGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.18, 16);
  coinGeo.rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshStandardMaterial({
    color: '#C6FF00',
    emissive: '#88B800',
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.85,
  });
  const coins: TrackSceneObjects['coins'] = [];
  for (const c of track.coins) {
    const mesh = new THREE.Mesh(coinGeo, coinMat);
    mesh.position.set(c.pos.x, c.pos.y + 1.15, c.pos.z);
    root.add(mesh);
    coins.push({
      mesh,
      x: c.pos.x,
      y: c.pos.y,
      z: c.pos.z,
      respawnTimer: 0,
    });
  }
  disposables.push(coinGeo, coinMat);

  // 7. Cenário temático por pista com InstancedMesh para 60fps
  buildThemeScenery(root, track, trackId, maxAnisotropy, disposables);

  return { root, itemBoxes, coins, boostPadPositions, disposables };
}

function buildThemeScenery(
  root: THREE.Group,
  track: TrackData,
  trackId: TrackId,
  maxAnisotropy: number,
  disposables: Array<{ dispose: () => void }>
): void {
  const samples = track.samples;
  const dummy = new THREE.Object3D();

  // Verifica se um ponto está longe o bastante de qualquer trecho da pista
  const isClearOfTrack = (x: number, z: number, minDist: number) => {
    const minSq = minDist * minDist;
    for (let i = 0; i < samples.length; i += 4) {
      const dx = x - samples[i].pos.x;
      const dz = z - samples[i].pos.z;
      if (dx * dx + dz * dz < minSq) return false;
    }
    return true;
  };

  if (trackId === 'zone_circuit') {
    // Arranha-céus noturnos com janelas iluminadas e detalhes neon ao redor do circuito
    const facadeTex = createBuildingFacadeTexture(maxAnisotropy);
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const bMat = new THREE.MeshStandardMaterial({
      map: facadeTex,
      emissiveMap: facadeTex,
      emissive: '#FFFFFF',
      emissiveIntensity: 0.55,
      roughness: 0.5,
      metalness: 0.4,
    });
    const trimGeo = new THREE.BoxGeometry(1.02, 0.08, 1.02);
    const trimMat = new THREE.MeshBasicMaterial({ color: '#C6FF00' });

    const placements: Array<{ x: number; z: number; w: number; h: number; d: number }> = [];
    for (let i = 0; i < 64; i++) {
      const s = samples[(i * 5) % samples.length];
      const side = i % 2 === 0 ? 1 : -1;
      const dist = s.halfWidth + 18 + (i % 4) * 11;
      const x = s.pos.x + s.right.x * side * dist;
      const z = s.pos.z + s.right.z * side * dist;
      if (isClearOfTrack(x, z, s.halfWidth + 12)) {
        placements.push({
          x,
          z,
          w: 10 + (i % 3) * 5,
          h: 22 + (i % 5) * 14,
          d: 10 + ((i + 1) % 3) * 5,
        });
      }
    }

    if (placements.length > 0) {
      const buildings = new THREE.InstancedMesh(bGeo, bMat, placements.length);
      const trims = new THREE.InstancedMesh(trimGeo, trimMat, placements.length);
      placements.forEach((p, idx) => {
        dummy.position.set(p.x, p.h * 0.5 - 0.15, p.z);
        dummy.scale.set(p.w, p.h, p.d);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        buildings.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(p.x, p.h - 2.2, p.z);
        dummy.scale.set(p.w, 1.4, p.d);
        dummy.updateMatrix();
        trims.setMatrixAt(idx, dummy.matrix);
      });
      buildings.computeBoundingSphere();
      trims.computeBoundingSphere();
      root.add(buildings, trims);
    }
    disposables.push(facadeTex, bGeo, bMat, trimGeo, trimMat);
  } else if (trackId === 'arena_gamer') {
    // Telões gigantes "ZONE PLAY E-SPORTS" + pilares luminosos da arena
    const screenTex = createZoneBannerTexture('ARENA GAMER LIVE', maxAnisotropy);
    const screenGeo = new THREE.BoxGeometry(36, 15, 2.2);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });

    const screenSpots = [
      { x: -85, y: 24, z: 30, rotY: 0.4 },
      { x: -120, y: 24, z: -75, rotY: -0.7 },
      { x: -30, y: 24, z: -135, rotY: 0.1 },
    ];
    for (const sp of screenSpots) {
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(sp.x, sp.y, sp.z);
      screen.rotation.y = sp.rotY;
      root.add(screen);
    }

    // Pilares neon da arquibancada ao redor da pista
    const pGeo = new THREE.CylinderGeometry(1.1, 1.4, 24, 8);
    const pMat = new THREE.MeshStandardMaterial({
      color: '#171B26',
      emissive: '#00F0FF',
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.7,
    });
    const pillars: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 40; i++) {
      const s = samples[(i * 8) % samples.length];
      const side = i % 2 === 0 ? 1 : -1;
      const x = s.pos.x + s.right.x * side * (s.halfWidth + 14);
      const z = s.pos.z + s.right.z * side * (s.halfWidth + 14);
      if (isClearOfTrack(x, z, s.halfWidth + 9)) {
        pillars.push({ x, z });
      }
    }
    if (pillars.length > 0) {
      const inst = new THREE.InstancedMesh(pGeo, pMat, pillars.length);
      pillars.forEach((p, idx) => {
        dummy.position.set(p.x, 11.8, p.z);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        inst.setMatrixAt(idx, dummy.matrix);
      });
      inst.computeBoundingSphere();
      root.add(inst);
    }
    disposables.push(screenTex, screenGeo, screenMat, pGeo, pMat);
  } else {
    // Lime Desert: dunas escuras e cristais verde-limão brilhantes
    const rockGeo = new THREE.ConeGeometry(3.2, 11, 5);
    const rockMat = new THREE.MeshStandardMaterial({
      color: '#172315',
      emissive: '#C6FF00',
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.25,
    });
    const duneGeo = new THREE.SphereGeometry(18, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const duneMat = new THREE.MeshStandardMaterial({
      color: '#171E15',
      roughness: 0.92,
      metalness: 0.02,
    });

    const crystals: Array<{ x: number; z: number; scale: number; rot: number }> = [];
    const dunes: Array<{ x: number; z: number; sx: number; sy: number }> = [];

    for (let i = 0; i < 60; i++) {
      const s = samples[(i * 5) % samples.length];
      const side = i % 2 === 0 ? 1 : -1;
      const dist = s.halfWidth + 13 + (i % 5) * 9;
      const x = s.pos.x + s.right.x * side * dist;
      const z = s.pos.z + s.right.z * side * dist;
      if (isClearOfTrack(x, z, s.halfWidth + 9)) {
        crystals.push({
          x,
          z,
          scale: 0.75 + (i % 4) * 0.32,
          rot: (i * 0.9) % Math.PI,
        });
        if (i % 2 === 0) {
          dunes.push({ x: x + side * 14, z: z + side * 8, sx: 1 + (i % 3) * 0.4, sy: 0.45 + (i % 2) * 0.2 });
        }
      }
    }

    if (crystals.length > 0) {
      const crystalInst = new THREE.InstancedMesh(rockGeo, rockMat, crystals.length);
      crystals.forEach((c, idx) => {
        dummy.position.set(c.x, 4.2 * c.scale, c.z);
        dummy.scale.set(c.scale, c.scale * 1.15, c.scale);
        dummy.rotation.set((idx % 3 - 1) * 0.14, c.rot, ((idx + 1) % 3 - 1) * 0.12);
        dummy.updateMatrix();
        crystalInst.setMatrixAt(idx, dummy.matrix);
      });
      crystalInst.computeBoundingSphere();
      root.add(crystalInst);
    }

    if (dunes.length > 0) {
      const duneInst = new THREE.InstancedMesh(duneGeo, duneMat, dunes.length);
      dunes.forEach((d, idx) => {
        dummy.position.set(d.x, -1.5, d.z);
        dummy.scale.set(d.sx, d.sy, d.sx);
        dummy.rotation.set(0, idx * 0.7, 0);
        dummy.updateMatrix();
        duneInst.setMatrixAt(idx, dummy.matrix);
      });
      duneInst.computeBoundingSphere();
      root.add(duneInst);
    }

    disposables.push(rockGeo, rockMat, duneGeo, duneMat);
  }
}
