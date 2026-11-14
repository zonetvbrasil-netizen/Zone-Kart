import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ADVERSARIOS_IA,
  CONFIG_JOGO,
  DriverId,
  GameState,
  ITENS_INFO,
  ItemType,
  PERSONAGENS,
  PISTAS_META,
  SKINS_KART,
  SkinId,
  TrackId,
} from './config';
import { ZoneAudioEngine } from './audio';
import { buildTrackScene, createKartMesh, KartMeshHandle, TrackSceneObjects } from './models';
import {
  computeStandings,
  KartInputState,
  RacerState,
  rollItemByPosition,
  stepKartKinematics,
  updateLapProgress,
} from './rules';
import { createContactShadowTexture, loadMascotCutoutTexture } from './textures';
import { buildTrackData, projectOntoTrack, TrackData } from './tracks';

export interface HudSnapshot {
  gameState: GameState;
  countdownText: string; // '3' | '2' | '1' | 'GO!' | ''
  position: number; // 1..6
  totalRacers: number;
  lap: number;
  totalLaps: number;
  speedKmh: number;
  elapsedMs: number;
  item: ItemType | null;
  driftChargeRatio: number; // 0..1
  shieldActive: boolean;
  boostActive: boolean;
  coinsInRace: number;
  bannerText: string;
  minimapRacers: Array<{ x: number; z: number; isPlayer: boolean; color: string }>;
  minimapTrack: Array<{ x: number; z: number }>;
  standings: Array<{
    id: string;
    nome: string;
    isPlayer: boolean;
    position: number;
    finishTimeMs: number;
    finished: boolean;
    color: string;
  }>;
}

interface ActiveMissile {
  mesh: THREE.Group;
  ownerId: string;
  targetId: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  life: number;
}

interface ActiveOil {
  mesh: THREE.Mesh;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  life: number;
}

interface ParticleItem {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

const _camPos = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _colNeon = new THREE.Color('#C6FF00');
const _colAmber = new THREE.Color('#FFB800');
const _colCyan = new THREE.Color('#00F0FF');

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class RaceEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private audio: ZoneAudioEngine;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onRaceFinish: (snapshot: HudSnapshot) => void;

  private trackId: TrackId = 'zone_circuit';
  private driverId: DriverId = 'zone';
  private skinId: SkinId = 'padrao';
  private gameState: GameState = 'title';

  private trackData: TrackData;
  private trackScene: TrackSceneObjects | null = null;
  private shadowTexture: THREE.Texture;
  private mascotTextures: Partial<Record<DriverId, THREE.Texture>> = {};

  private racers: RacerState[] = [];
  private kartMeshes: Map<string, KartMeshHandle> = new Map();
  private missiles: ActiveMissile[] = [];
  private oils: ActiveOil[] = [];

  // Pool de partículas zero-GC
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleItem[] = [];
  private particleCursor = 0;
  private readonly particleCapacity = 140;

  private input: KartInputState = {
    accelerate: false,
    brake: false,
    left: false,
    right: false,
    drift: false,
  };

  private countdownTimer = 0;
  private lastCountdownStep = -1;
  private raceElapsedMs = 0;
  private coinsInRace = 0;
  private bannerText = '';
  private bannerTimer = 0;
  private cameraTrauma = 0;
  private titleOrbitAngle = 0;
  private hudEmitAccum = 0;

  private frameId = 0;
  private isDisposed = false;
  private lastTime = performance.now();

  constructor(options: {
    container: HTMLElement;
    audio: ZoneAudioEngine;
    initialDriver: DriverId;
    initialTrack: TrackId;
    initialSkin: SkinId;
    onHudUpdate: (snapshot: HudSnapshot) => void;
    onRaceFinish: (snapshot: HudSnapshot) => void;
  }) {
    this.container = options.container;
    this.audio = options.audio;
    this.driverId = options.initialDriver;
    this.trackId = options.initialTrack;
    this.skinId = options.initialSkin;
    this.onHudUpdate = options.onHudUpdate;
    this.onRaceFinish = options.onRaceFinish;

    this.isSoftwareGl = detectSoftwareGl();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(this.container.clientWidth || window.innerWidth, this.container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    this.scene = new THREE.Scene();
    const aspect = (this.container.clientWidth || window.innerWidth) / Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.3, 900);

    // Ambiente PBR via RoomEnvironment (mantém metais e reflexos nítidos)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Iluminação 3 pontos com contraste quente/frio
    const hemi = new THREE.HemisphereLight('#94B8FF', '#121810', 0.72);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#FFF3DC', 1.65);
    keyLight.position.set(80, 140, 75);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 360;
      const d = 140;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#C6FF00', 0.65);
    rimLight.position.set(-90, 60, -100);
    this.scene.add(rimLight);

    this.shadowTexture = createContactShadowTexture();

    // Inicializar pool de partículas
    const pGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
    const pMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, this.particleCapacity);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < this.particleCapacity; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 0,
        color: new THREE.Color('#C6FF00'),
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _colNeon);
    }
    this.scene.add(this.particleMesh);

    this.trackData = buildTrackData(this.trackId);
    this.rebuildWorld();
    this.preloadMascotSprites();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    window.addEventListener('resize', this.handleResize);

    this.lastTime = performance.now();
    this.scheduleNextFrame();
  }

  private preloadMascotSprites(): void {
    loadMascotCutoutTexture(PERSONAGENS.zone.imagem, 'white', 'ZONE').then((tex) => {
      if (this.isDisposed) {
        tex.dispose();
        return;
      }
      this.mascotTextures.zone = tex;
      if (this.driverId === 'zone') this.applyPlayerDriverSprite();
    });
    loadMascotCutoutTexture(PERSONAGENS.zonia.imagem, 'black', 'ZONIA').then((tex) => {
      if (this.isDisposed) {
        tex.dispose();
        return;
      }
      this.mascotTextures.zonia = tex;
      if (this.driverId === 'zonia') this.applyPlayerDriverSprite();
    });
  }

  private applyPlayerDriverSprite(): void {
    const handle = this.kartMeshes.get('player');
    const tex = this.mascotTextures[this.driverId];
    if (handle?.driverSprite && tex) {
      (handle.driverSprite.material as THREE.SpriteMaterial).map = tex;
      (handle.driverSprite.material as THREE.SpriteMaterial).needsUpdate = true;
    }
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private handleResize = (): void => {
    if (this.isDisposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  };

  private clearProjectiles(): void {
    for (const m of this.missiles) this.scene.remove(m.mesh);
    this.missiles = [];
    for (const o of this.oils) this.scene.remove(o.mesh);
    this.oils = [];
  }

  private rebuildWorld(): void {
    this.clearProjectiles();

    if (this.trackScene) {
      this.scene.remove(this.trackScene.root);
      this.trackScene.disposables.forEach((d) => d.dispose());
      this.trackScene = null;
    }

    for (const handle of this.kartMeshes.values()) {
      this.scene.remove(handle.group);
    }
    this.kartMeshes.clear();

    const meta = PISTAS_META[this.trackId];
    this.scene.background = new THREE.Color(meta.corCeu);
    this.scene.fog = new THREE.FogExp2(meta.corNeblina, 0.0026);

    this.trackData = buildTrackData(this.trackId);
    this.trackScene = buildTrackScene(this.trackData, this.trackId, this.maxAnisotropy);
    this.scene.add(this.trackScene.root);

    this.spawnGrid();
    this.emitHudSnapshot(true);
  }

  private spawnGrid(): void {
    this.racers = [];
    const samples = this.trackData.samples;
    const skin = SKINS_KART.find((s) => s.id === this.skinId) ?? SKINS_KART[0];
    const driverCfg = PERSONAGENS[this.driverId];

    // Grid de largada escalonado (jogador na 6ª posição de saída atrás para ultrapassagens emocionantes)
    const gridSlots = [
      { sampleOffset: 314, lat: -3.2 },
      { sampleOffset: 314, lat: 3.2 },
      { sampleOffset: 309, lat: -3.2 },
      { sampleOffset: 309, lat: 3.2 },
      { sampleOffset: 304, lat: -3.2 },
      { sampleOffset: 304, lat: 3.2 }, // Jogador
    ];

    ADVERSARIOS_IA.forEach((ai, idx) => {
      const slot = gridSlots[idx];
      const s = samples[slot.sampleOffset % samples.length];
      const x = s.pos.x + s.right.x * slot.lat;
      const z = s.pos.z + s.right.z * slot.lat;
      const state: RacerState = {
        id: ai.id,
        nome: ai.nome,
        isPlayer: false,
        x,
        y: s.pos.y,
        z,
        vy: 0,
        yaw: s.yaw,
        speed: 0,
        steerVisual: 0,
        isGrounded: true,
        isDrifting: false,
        driftDir: 0,
        driftCharge: 0,
        boostTimer: 0,
        shieldTimer: 0,
        spinTimer: 0,
        sampleIndex: s.index,
        progress: s.progress,
        maxCheckpoint: 0,
        lap: 1,
        finished: false,
        finishTimeMs: 0,
        item: null,
        speedMultiplier: ai.ritmoBase,
        turboMultiplier: 1.0,
        controlMultiplier: 1.0,
      };
      this.racers.push(state);

      const kart = createKartMesh({
        chassisHex: ai.corKart,
        neonHex: ai.corNeon,
        helmetHex: ai.corCapacete,
        shadowTexture: this.shadowTexture,
      });
      kart.group.position.set(x, s.pos.y, z);
      kart.group.rotation.y = s.yaw;
      this.scene.add(kart.group);
      this.kartMeshes.set(ai.id, kart);
    });

    // Jogador na última fila com pista livre à frente
    const pSlot = gridSlots[5];
    const ps = samples[pSlot.sampleOffset % samples.length];
    const px = ps.pos.x + ps.right.x * pSlot.lat;
    const pz = ps.pos.z + ps.right.z * pSlot.lat;
    const playerState: RacerState = {
      id: 'player',
      nome: driverCfg.nome,
      isPlayer: true,
      x: px,
      y: ps.pos.y,
      z: pz,
      vy: 0,
      yaw: ps.yaw,
      speed: 0,
      steerVisual: 0,
      isGrounded: true,
      isDrifting: false,
      driftDir: 0,
      driftCharge: 0,
      boostTimer: 0,
      shieldTimer: 0,
      spinTimer: 0,
      sampleIndex: ps.index,
      progress: ps.progress,
      maxCheckpoint: 0,
      lap: 1,
      finished: false,
      finishTimeMs: 0,
      item: null,
      speedMultiplier: driverCfg.bonusVelocidade,
      turboMultiplier: driverCfg.bonusTurbo,
      controlMultiplier: driverCfg.bonusControle,
    };
    this.racers.push(playerState);

    const playerKart = createKartMesh({
      chassisHex: skin.corChassi,
      neonHex: skin.corNeon,
      helmetHex: '#C6FF00',
      shadowTexture: this.shadowTexture,
      driverTexture: this.mascotTextures[this.driverId] ?? null,
      isPlayerDriver: true,
    });
    playerKart.group.position.set(px, ps.pos.y, pz);
    playerKart.group.rotation.y = ps.yaw;
    this.scene.add(playerKart.group);
    this.kartMeshes.set('player', playerKart);

    this.applyPlayerDriverSprite();
    this.resetCameraToPlayer();
  }

  private resetCameraToPlayer(): void {
    const p = this.racers.find((r) => r.isPlayer);
    if (!p) return;
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    this.camera.position.set(p.x - fx * 10.5, p.y + 4.8, p.z - fz * 10.5);
    this.camera.lookAt(p.x + fx * 10, p.y + 1.5, p.z + fz * 10);
  }

  public setTrack(trackId: TrackId): void {
    if (this.trackId === trackId) return;
    this.trackId = trackId;
    this.rebuildWorld();
  }

  public setDriver(driverId: DriverId): void {
    this.driverId = driverId;
    const player = this.racers.find((r) => r.isPlayer);
    if (player) {
      const cfg = PERSONAGENS[driverId];
      player.nome = cfg.nome;
      player.speedMultiplier = cfg.bonusVelocidade;
      player.turboMultiplier = cfg.bonusTurbo;
      player.controlMultiplier = cfg.bonusControle;
    }
    this.applyPlayerDriverSprite();
  }

  public setSkin(skinId: SkinId): void {
    this.skinId = skinId;
    const skin = SKINS_KART.find((s) => s.id === skinId) ?? SKINS_KART[0];
    this.kartMeshes.get('player')?.updateColors(skin.corChassi, skin.corNeon);
  }

  public setInputState(partial: Partial<KartInputState>): void {
    Object.assign(this.input, partial);
  }

  public clearInputs(): void {
    this.input.accelerate = false;
    this.input.brake = false;
    this.input.left = false;
    this.input.right = false;
    this.input.drift = false;
  }

  public startRace(): void {
    this.audio.unlock();
    this.gameState = 'playing';
    this.countdownTimer = 3.2;
    this.lastCountdownStep = 4;
    this.raceElapsedMs = 0;
    this.coinsInRace = 0;
    this.bannerText = '';
    this.bannerTimer = 0;
    this.cameraTrauma = 0;
    this.clearInputs();
    this.rebuildWorld();
    this.audio.setRaceActive(true, false);
    this.emitHudSnapshot(true);
  }

  public returnToTitle(): void {
    this.gameState = 'title';
    this.countdownTimer = 0;
    this.bannerText = '';
    this.clearInputs();
    this.audio.setRaceActive(false, false);
    this.rebuildWorld();
  }

  public setPaused(paused: boolean): void {
    if (this.gameState !== 'playing' && this.gameState !== 'paused') return;
    this.gameState = paused ? 'paused' : 'playing';
    this.audio.setRaceActive(true, paused);
    this.emitHudSnapshot(true);
  }

  public triggerPlayerItem(): void {
    if (this.gameState !== 'playing' || this.countdownTimer > 0.35) return;
    const player = this.racers.find((r) => r.isPlayer);
    if (!player || !player.item || player.finished) return;
    this.useRacerItem(player);
  }

  private useRacerItem(racer: RacerState): void {
    const item = racer.item;
    if (!item) return;
    racer.item = null;

    if (item === 'turbo_z') {
      racer.boostTimer = Math.max(racer.boostTimer, 2.0 * racer.turboMultiplier);
      if (racer.isPlayer) {
        this.audio.playTurbo();
        this.showBanner('TURBO Z!');
      }
      this.spawnParticles(racer.x, racer.y + 0.6, racer.z, 14, _colNeon);
    } else if (item === 'escudo_zone') {
      racer.shieldTimer = 6.0;
      if (racer.isPlayer) {
        this.audio.playShield();
        this.showBanner('ESCUDO ATIVO!');
      }
    } else if (item === 'oleo') {
      const bx = racer.x - Math.sin(racer.yaw) * 3.1;
      const bz = racer.z - Math.cos(racer.yaw) * 3.1;
      const oilMesh = new THREE.Mesh(
        new THREE.CircleGeometry(1.55, 16),
        new THREE.MeshStandardMaterial({
          color: '#0D0E12',
          emissive: '#FFB800',
          emissiveIntensity: 0.25,
          roughness: 0.08,
          metalness: 0.9,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
      );
      oilMesh.rotation.x = -Math.PI / 2;
      oilMesh.position.set(bx, racer.y + 0.05, bz);
      this.scene.add(oilMesh);
      this.oils.push({ mesh: oilMesh, ownerId: racer.id, x: bx, y: racer.y, z: bz, life: 14 });
      if (racer.isPlayer) this.showBanner('ÓLEO SOLTO!');
    } else if (item === 'missil_neon') {
      const ranked = computeStandings(this.racers);
      const myRank = ranked.findIndex((r) => r.id === racer.id);
      const target = myRank > 0 ? ranked[myRank - 1] : ranked[0];
      if (!target || target.id === racer.id) return;

      const mGroup = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 1.5, 10),
        new THREE.MeshBasicMaterial({ color: '#00F0FF' })
      );
      body.rotation.x = Math.PI / 2;
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 10, 10),
        new THREE.MeshBasicMaterial({ color: '#C6FF00', transparent: true, opacity: 0.4 })
      );
      mGroup.add(body, halo);
      const mx = racer.x + Math.sin(racer.yaw) * 2.5;
      const mz = racer.z + Math.cos(racer.yaw) * 2.5;
      mGroup.position.set(mx, racer.y + 0.95, mz);
      this.scene.add(mGroup);

      this.missiles.push({
        mesh: mGroup,
        ownerId: racer.id,
        targetId: target.id,
        x: mx,
        y: racer.y + 0.95,
        z: mz,
        yaw: racer.yaw,
        life: 7.5,
      });

      if (racer.isPlayer) {
        this.audio.playMissile();
        this.showBanner('MÍSSIL NEON!');
      }
    }
  }

  private showBanner(text: string): void {
    this.bannerText = text;
    this.bannerTimer = 1.6;
  }

  private spawnParticles(x: number, y: number, z: number, count: number, color: THREE.Color): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.particleCapacity;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.9;
      p.y = y + Math.random() * 0.4;
      p.z = z + (Math.random() - 0.5) * 0.9;
      p.vx = (Math.random() - 0.5) * 7;
      p.vy = 2 + Math.random() * 5;
      p.vz = (Math.random() - 0.5) * 7;
      p.maxLife = 0.25 + Math.random() * 0.25;
      p.life = p.maxLife;
      p.scale = 0.7 + Math.random() * 0.7;
      p.color.copy(color);
    }
  }

  private scheduleNextFrame(): void {
    if (this.isDisposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = window.requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void): void {
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.isDisposed) return;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } catch {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private tick(): void {
    if (this.isDisposed) return;
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const clampedTotal = Math.min(this.isSoftwareGl ? 0.25 : 0.05, Math.max(0.001, rawDt));

    if (this.gameState === 'title') {
      this.updateTitleShowcase(clampedTotal);
    } else if (this.gameState === 'playing') {
      const subSteps = Math.max(1, Math.ceil(clampedTotal / 0.05));
      const subDt = clampedTotal / subSteps;
      for (let s = 0; s < subSteps; s++) {
        this.updatePlaying(subDt);
      }
    }

    this.updateParticles(Math.min(0.05, clampedTotal));
    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  }

  private updateTitleShowcase(dt: number): void {
    this.titleOrbitAngle += dt * 0.35;
    const p = this.racers.find((r) => r.isPlayer);
    if (p) {
      const radius = 8.2;
      this.camera.position.set(
        p.x + Math.sin(this.titleOrbitAngle) * radius,
        p.y + 3.4,
        p.z + Math.cos(this.titleOrbitAngle) * radius
      );
      this.camera.lookAt(p.x, p.y + 1.15, p.z);
    }
    this.animateTrackPickups(dt);
  }

  private animateTrackPickups(dt: number): void {
    if (!this.trackScene) return;
    for (const ib of this.trackScene.itemBoxes) {
      if (ib.respawnTimer > 0) {
        ib.respawnTimer = Math.max(0, ib.respawnTimer - dt);
        ib.mesh.visible = ib.respawnTimer <= 0;
      } else {
        ib.mesh.children[0].rotation.y += dt * 1.8;
        ib.mesh.children[0].position.y = 1.6 + Math.sin(performance.now() * 0.004 + ib.x) * 0.22;
      }
    }
    for (const c of this.trackScene.coins) {
      if (c.respawnTimer > 0) {
        c.respawnTimer = Math.max(0, c.respawnTimer - dt);
        c.mesh.visible = c.respawnTimer <= 0;
      } else {
        c.mesh.rotation.y += dt * 2.8;
      }
    }
  }

  private updatePlaying(dt: number): void {
    this.animateTrackPickups(dt);

    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - dt);
      if (this.bannerTimer <= 0) this.bannerText = '';
    }
    if (this.cameraTrauma > 0) {
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 1.8);
    }

    // Contagem regressiva 3 - 2 - 1 - GO!
    if (this.countdownTimer > 0) {
      this.countdownTimer = Math.max(0, this.countdownTimer - dt);
      const step = Math.ceil(this.countdownTimer);
      if (step !== this.lastCountdownStep) {
        this.lastCountdownStep = step;
        if (step >= 1 && step <= 3) {
          this.audio.playCountdown(false);
        } else if (step === 0) {
          this.audio.playCountdown(true);
          this.showBanner('LARGADA!');
        }
      }
      if (this.countdownTimer > 0.35) {
        this.updateCamera(dt, null);
        this.hudEmitAccum += dt;
        if (this.hudEmitAccum >= 0.08) {
          this.hudEmitAccum = 0;
          this.emitHudSnapshot(false);
        }
        return;
      }
    }

    this.raceElapsedMs += dt * 1000;
    const rankedBefore = computeStandings(this.racers);
    const playerRankIdx = rankedBefore.findIndex((r) => r.isPlayer);

    // Atualiza física de todos os 6 pilotos
    for (const racer of this.racers) {
      const proj = projectOntoTrack(this.trackData, racer.x, racer.z, racer.sampleIndex);
      racer.sampleIndex = proj.sampleIndex;

      let ctrl: KartInputState;
      if (racer.isPlayer && !racer.finished) {
        ctrl = this.input;
      } else {
        ctrl = this.computeAiInput(racer, proj, rankedBefore, playerRankIdx);
      }

      const events = stepKartKinematics(racer, ctrl, proj, dt);

      // Som e partículas de mini-turbo
      if (events.miniTurboTriggered) {
        if (racer.isPlayer) {
          this.audio.playTurbo();
          this.showBanner(events.miniTurboTier === 2 ? 'SUPER MINI-TURBO!' : 'MINI-TURBO!');
        }
        this.spawnParticles(racer.x, racer.y + 0.5, racer.z, 10, _colNeon);
      }

      // Partículas de drift enquanto carrega
      if (racer.isDrifting && Math.random() < 0.45) {
        this.spawnParticles(
          racer.x,
          racer.y + 0.25,
          racer.z,
          1,
          racer.driftCharge > 1.2 ? _colNeon : _colAmber
        );
      }

      // Colisão suave com as muretas externas da pista (considerando atalho)
      const reProj = projectOntoTrack(this.trackData, racer.x, racer.z, racer.sampleIndex);
      racer.sampleIndex = reProj.sampleIndex;
      let leftWall = -reProj.halfWidth + 1.3;
      let rightWall = reProj.halfWidth - 1.3;
      for (const sc of this.trackData.shortcuts) {
        if (reProj.progress >= sc.startProgress && reProj.progress <= sc.endProgress) {
          if (sc.side === 'left') leftWall -= sc.extraWidth;
          else rightWall += sc.extraWidth;
        }
      }
      if (reProj.lateralOffset < leftWall || reProj.lateralOffset > rightWall) {
        const clampedLat = Math.max(leftWall, Math.min(rightWall, reProj.lateralOffset));
        const s = this.trackData.samples[reProj.sampleIndex];
        racer.x = s.pos.x + s.right.x * clampedLat;
        racer.z = s.pos.z + s.right.z * clampedLat;
        racer.speed *= 0.86;
        // Alinha levemente ao traçado para evitar travar na mureta
        const diff = Math.atan2(Math.sin(s.yaw - racer.yaw), Math.cos(s.yaw - racer.yaw));
        racer.yaw += diff * 0.22;
      }

      // Bônus de velocidade ao usar atalho
      if (reProj.isShortcut && racer.boostTimer < 0.35) {
        racer.boostTimer = 0.45;
      }

      // Progressão de voltas e chegada
      const lapInfo = updateLapProgress(racer, reProj.progress, this.raceElapsedMs, CONFIG_JOGO.numeroVoltas);
      if (racer.isPlayer && lapInfo.lapCompleted) {
        if (lapInfo.justFinished) {
          this.audio.playVictory();
          this.finishRace();
        } else {
          this.audio.playLap();
          this.showBanner(racer.lap === CONFIG_JOGO.numeroVoltas ? 'VOLTA FINAL!' : `VOLTA ${racer.lap}/${CONFIG_JOGO.numeroVoltas}`);
        }
      }

      // Checar faixas de turbo, caixas de item e moedas
      this.checkTrackInteractions(racer, rankedBefore);

      // Atualizar malha 3D do kart
      this.syncKartVisual(racer, dt);
    }

    // Colisões entre karts
    this.resolveKartCollisions();

    // Atualizar projéteis (mísseis e óleo)
    this.updateProjectiles(dt);

    // Atualizar áudio contínuo e câmera do jogador
    const player = this.racers.find((r) => r.isPlayer) ?? null;
    if (player) {
      this.audio.updateTelemetry(
        Math.abs(player.speed) / CONFIG_JOGO.velocidadeMaxima,
        player.isDrifting,
        player.boostTimer > 0
      );
    }
    this.updateCamera(dt, player);

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.085) {
      this.hudEmitAccum = 0;
      this.emitHudSnapshot(false);
    }
  }

  private computeAiInput(
    racer: RacerState,
    proj: { sampleIndex: number },
    ranked: RacerState[],
    playerRankIdx: number
  ): KartInputState {
    const samples = this.trackData.samples;
    const aiCfg = ADVERSARIOS_IA.find((a) => a.id === racer.id);
    const laneFrac = aiCfg?.faixaPreferida ?? 0;

    // Rubber-banding sutil para manter disputa animada sem frustração
    const myRank = ranked.findIndex((r) => r.id === racer.id);
    const rankDelta = myRank - playerRankIdx;
    const baseMult = aiCfg?.ritmoBase ?? 0.94;
    racer.speedMultiplier = Math.max(0.84, Math.min(1.03, baseMult + rankDelta * 0.02));

    // Ponto-alvo à frente na pista
    const lookSamples = 9;
    const targetSample = samples[(proj.sampleIndex + lookSamples) % samples.length];
    const targetLat = laneFrac * targetSample.halfWidth * 0.72;
    const tx = targetSample.pos.x + targetSample.right.x * targetLat;
    const tz = targetSample.pos.z + targetSample.right.z * targetLat;

    const desiredYaw = Math.atan2(tx - racer.x, tz - racer.z);
    const angleDiff = Math.atan2(Math.sin(desiredYaw - racer.yaw), Math.cos(desiredYaw - racer.yaw));

    // IA usa item após um pequeno atraso aleatório
    if (racer.item && Math.random() < 0.014) {
      this.useRacerItem(racer);
    }

    return {
      accelerate: true,
      brake: false,
      left: angleDiff > 0.09,
      right: angleDiff < -0.09,
      drift: Math.abs(angleDiff) > 0.45 && racer.speed > 36,
    };
  }

  private checkTrackInteractions(racer: RacerState, ranked: RacerState[]): void {
    if (!this.trackScene) return;

    // Faixas de turbo
    for (const pad of this.trackScene.boostPadPositions) {
      const dx = racer.x - pad.x;
      const dz = racer.z - pad.z;
      if (dx * dx + dz * dz < 16 && Math.abs(racer.y - pad.y) < 3) {
        if (racer.boostTimer < 1.0) {
          racer.boostTimer = 1.45 * racer.turboMultiplier;
          if (racer.isPlayer) {
            this.audio.playTurbo();
            this.showBanner('FAIXA TURBO!');
          }
          this.spawnParticles(racer.x, racer.y + 0.5, racer.z, 8, _colNeon);
        }
      }
    }

    // Caixas de item (?)
    for (const ib of this.trackScene.itemBoxes) {
      if (ib.respawnTimer > 0) continue;
      const dx = racer.x - ib.x;
      const dz = racer.z - ib.z;
      if (dx * dx + dz * dz < 7.2 && Math.abs(racer.y - ib.y) < 3.2) {
        ib.respawnTimer = 4.5;
        ib.mesh.visible = false;
        if (!racer.item) {
          const rank = Math.max(1, ranked.findIndex((r) => r.id === racer.id) + 1);
          racer.item = rollItemByPosition(rank);
          if (racer.isPlayer) {
            this.audio.playItemPickup();
            this.showBanner(ITENS_INFO[racer.item].nome.toUpperCase());
          }
        }
      }
    }

    // Moedas colecionáveis
    for (const c of this.trackScene.coins) {
      if (c.respawnTimer > 0) continue;
      const dx = racer.x - c.x;
      const dz = racer.z - c.z;
      if (dx * dx + dz * dz < 6.0 && Math.abs(racer.y - c.y) < 3.0) {
        c.respawnTimer = 8.0;
        c.mesh.visible = false;
        if (racer.isPlayer) {
          this.coinsInRace += 1;
          racer.speed = Math.min(CONFIG_JOGO.velocidadeTurbo, racer.speed + 4);
          this.audio.playCoin();
          this.spawnParticles(c.x, c.y + 1.1, c.z, 6, _colNeon);
        }
      }
    }
  }

  private resolveKartCollisions(): void {
    const minDist = 2.45;
    const minDistSq = minDist * minDist;
    for (let i = 0; i < this.racers.length; i++) {
      for (let j = i + 1; j < this.racers.length; j++) {
        const a = this.racers[i];
        const b = this.racers[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dSq = dx * dx + dz * dz;
        if (dSq > 0.0001 && dSq < minDistSq) {
          const d = Math.sqrt(dSq);
          const overlap = (minDist - d) * 0.5;
          const nx = dx / d;
          const nz = dz / d;
          a.x -= nx * overlap;
          a.z -= nz * overlap;
          b.x += nx * overlap;
          b.z += nz * overlap;
          a.speed *= 0.96;
          b.speed *= 0.96;
          if (a.isPlayer || b.isPlayer) {
            this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.18);
          }
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    // Mísseis Neon guiados
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;
      const target = this.racers.find((r) => r.id === m.targetId);
      if (target) {
        const desiredYaw = Math.atan2(target.x - m.x, target.z - m.z);
        const diff = Math.atan2(Math.sin(desiredYaw - m.yaw), Math.cos(desiredYaw - m.yaw));
        m.yaw += Math.max(-4.5 * dt, Math.min(4.5 * dt, diff));
        m.y += (target.y + 0.95 - m.y) * Math.min(1, 8 * dt);
      }
      const missileSpeed = 108;
      m.x += Math.sin(m.yaw) * missileSpeed * dt;
      m.z += Math.cos(m.yaw) * missileSpeed * dt;
      m.mesh.position.set(m.x, m.y, m.z);
      m.mesh.rotation.y = m.yaw;

      if (Math.random() < 0.6) {
        this.spawnParticles(m.x, m.y, m.z, 1, _colCyan);
      }

      let hit = false;
      for (const r of this.racers) {
        if (r.id === m.ownerId) continue;
        const dx = r.x - m.x;
        const dz = r.z - m.z;
        if (dx * dx + dz * dz < 6.8) {
          hit = true;
          if (r.shieldTimer <= 0) {
            r.spinTimer = 1.15;
            this.spawnParticles(r.x, r.y + 1, r.z, 18, _colCyan);
            if (r.isPlayer) {
              this.audio.playHit();
              this.cameraTrauma = 0.7;
              this.showBanner('ATINGIDO POR MÍSSIL!');
            }
          } else if (r.isPlayer) {
            this.audio.playShield();
            this.showBanner('ESCUDO BLOQUEOU!');
          }
          break;
        }
      }

      if (hit || m.life <= 0) {
        this.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
      }
    }

    // Manchas de Óleo
    for (let i = this.oils.length - 1; i >= 0; i--) {
      const o = this.oils[i];
      o.life -= dt;
      let triggered = false;
      for (const r of this.racers) {
        if (r.id === o.ownerId && o.life > 12.8) continue;
        const dx = r.x - o.x;
        const dz = r.z - o.z;
        if (dx * dx + dz * dz < 5.5 && Math.abs(r.y - o.y) < 2) {
          triggered = true;
          if (r.shieldTimer <= 0) {
            r.spinTimer = 1.05;
            this.spawnParticles(r.x, r.y + 0.6, r.z, 12, _colAmber);
            if (r.isPlayer) {
              this.audio.playHit();
              this.cameraTrauma = 0.55;
              this.showBanner('ESCORREGOU NO ÓLEO!');
            }
          }
          break;
        }
      }
      if (triggered || o.life <= 0) {
        this.scene.remove(o.mesh);
        this.oils.splice(i, 1);
      }
    }
  }

  private syncKartVisual(racer: RacerState, dt: number): void {
    const kart = this.kartMeshes.get(racer.id);
    if (!kart) return;

    kart.group.position.set(racer.x, racer.y, racer.z);

    // Rotação visual inclui ângulo extra durante drift ou rodopio
    const driftVisualAngle = racer.isDrifting ? racer.driftDir * 0.24 : 0;
    const spinVisualAngle = racer.spinTimer > 0 ? racer.spinTimer * 12 : 0;
    kart.group.rotation.y = racer.yaw + driftVisualAngle + spinVisualAngle;

    // Inclinação leve em curvas
    kart.group.rotation.z = -racer.steerVisual * 0.065;

    // Esterço das rodas dianteiras e giro das 4 rodas
    for (const fw of kart.frontWheels) {
      fw.rotation.y = racer.steerVisual * 0.42;
    }
    const wheelSpin = racer.speed * dt * 1.9;
    for (const w of kart.allWheels) {
      w.rotation.x += wheelSpin;
    }

    // Chamas de turbo e escudo
    const boosting = racer.boostTimer > 0;
    kart.flameLeft.visible = boosting;
    kart.flameRight.visible = boosting;
    if (boosting) {
      const flicker = 0.85 + Math.random() * 0.55;
      kart.flameLeft.scale.set(1, 1, flicker);
      kart.flameRight.scale.set(1, 1, flicker);
    }

    kart.shieldDome.visible = racer.shieldTimer > 0;
    if (kart.shieldDome.visible) {
      kart.shieldDome.rotation.y += dt * 2.5;
    }
  }

  private updateCamera(dt: number, player: RacerState | null): void {
    if (!player) return;

    const fx = Math.sin(player.yaw);
    const fz = Math.cos(player.yaw);
    const isBoost = player.boostTimer > 0;

    // Abertura sutil de FOV durante turbo
    const targetFov = isBoost ? 72 : 62;
    this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-7 * dt));
    this.camera.updateProjectionMatrix();

    const dist = isBoost ? 10.6 : 9.8;
    const height = 4.6;
    _camPos.set(player.x - fx * dist, player.y + height, player.z - fz * dist);

    const shake = this.cameraTrauma * this.cameraTrauma * 0.45;
    if (shake > 0.002) {
      _camPos.x += (Math.random() - 0.5) * shake;
      _camPos.y += (Math.random() - 0.5) * shake;
    }

    const posAlpha = 1 - Math.exp(-9.5 * dt);
    this.camera.position.lerp(_camPos, posAlpha);

    _camLook.set(player.x + fx * 11, player.y + 1.5, player.z + fz * 11);
    this.camera.lookAt(_camLook);
  }

  private updateParticles(dt: number): void {
    let anyActive = false;
    for (let i = 0; i < this.particleCapacity; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyActive = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.set(0, 0, 0);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.vy -= 14 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const s = p.scale * (p.life / p.maxLife);
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.set(s, s, s);
      _dummy.rotation.set(p.life * 5, p.life * 4, 0);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, p.color);
    }
    if (anyActive) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private finishRace(): void {
    this.gameState = 'gameover';
    this.audio.setRaceActive(false, false);

    // Atribui tempos estimados aos adversários que ainda não cruzaram a chegada
    const ranked = computeStandings(this.racers);
    ranked.forEach((r, idx) => {
      if (!r.finished) {
        r.finished = true;
        r.finishTimeMs = this.raceElapsedMs + (idx + 1) * 1450;
      }
    });

    const snap = this.buildHudSnapshot();
    this.onHudUpdate(snap);
    this.onRaceFinish(snap);
  }

  private buildHudSnapshot(): HudSnapshot {
    const ranked = computeStandings(this.racers);
    const player = this.racers.find((r) => r.isPlayer) ?? this.racers[0];
    const playerPos = Math.max(1, ranked.findIndex((r) => r.id === player.id) + 1);

    let countdownText = '';
    if (this.gameState === 'playing' && this.countdownTimer > 0) {
      const ceil = Math.ceil(this.countdownTimer);
      countdownText = ceil >= 1 && ceil <= 3 ? String(ceil) : 'GO!';
    }

    const minimapTrack: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < this.trackData.samples.length; i += 5) {
      const s = this.trackData.samples[i];
      minimapTrack.push({ x: s.pos.x, z: s.pos.z });
    }

    return {
      gameState: this.gameState,
      countdownText,
      position: playerPos,
      totalRacers: this.racers.length,
      lap: Math.min(CONFIG_JOGO.numeroVoltas, player.lap),
      totalLaps: CONFIG_JOGO.numeroVoltas,
      speedKmh: Math.round(Math.abs(player.speed) * CONFIG_JOGO.fatorKmh),
      elapsedMs: this.raceElapsedMs,
      item: player.item,
      driftChargeRatio: player.isDrifting ? Math.min(1, player.driftCharge / 1.35) : 0,
      shieldActive: player.shieldTimer > 0,
      boostActive: player.boostTimer > 0,
      coinsInRace: this.coinsInRace,
      bannerText: this.bannerText,
      minimapTrack,
      minimapRacers: this.racers.map((r) => ({
        x: r.x,
        z: r.z,
        isPlayer: r.isPlayer,
        color: r.isPlayer
          ? '#C6FF00'
          : ADVERSARIOS_IA.find((a) => a.id === r.id)?.corNeon ?? '#FFFFFF',
      })),
      standings: ranked.map((r, idx) => ({
        id: r.id,
        nome: r.nome,
        isPlayer: r.isPlayer,
        position: idx + 1,
        finishTimeMs: r.finishTimeMs,
        finished: r.finished,
        color: r.isPlayer
          ? '#C6FF00'
          : ADVERSARIOS_IA.find((a) => a.id === r.id)?.corNeon ?? '#FFFFFF',
      })),
    };
  }

  private emitHudSnapshot(force: boolean): void {
    if (!force && this.gameState === 'title') return;
    this.onHudUpdate(this.buildHudSnapshot());
  }

  public dispose(): void {
    this.isDisposed = true;
    window.cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    this.clearProjectiles();
    if (this.trackScene) {
      this.trackScene.disposables.forEach((d) => d.dispose());
    }
    this.shadowTexture.dispose();
    Object.values(this.mascotTextures).forEach((t) => t?.dispose());
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
