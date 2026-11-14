import { CONFIG_JOGO, ItemType, SkinId, TrackId } from './config';
import { TrackProjection } from './tracks';

export interface KartInputState {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
}

export interface RacerState {
  id: string;
  nome: string;
  isPlayer: boolean;
  x: number;
  y: number;
  z: number;
  vy: number;
  yaw: number;
  speed: number;
  steerVisual: number;
  isGrounded: boolean;
  isDrifting: boolean;
  driftDir: number; // -1 right, 0 none, +1 left
  driftCharge: number; // seconds charged
  boostTimer: number;
  shieldTimer: number;
  spinTimer: number;
  sampleIndex: number;
  progress: number;
  maxCheckpoint: number; // 0..3 checkpoints per lap
  lap: number; // 1..numeroVoltas
  finished: boolean;
  finishTimeMs: number;
  item: ItemType | null;
  speedMultiplier: number;
  turboMultiplier: number;
  controlMultiplier: number;
}

export interface PersistedProgress {
  moedas: number;
  skinsDesbloqueadas: SkinId[];
  melhoresTempos: Partial<Record<TrackId, number>>;
}

const STORAGE_KEY = 'zone_play_kart_progress_v1';

/**
 * Sorteia um item baseado na posição atual do piloto (1º..6º).
 * Pilotos mais atrás têm maior chance de ganhar Turbo Z ou Míssil Neon.
 */
export function rollItemByPosition(position: number, rng: () => number = Math.random): ItemType {
  const r = rng();
  if (position <= 1) {
    // 1º lugar: mais escudo e óleo, menor chance de turbo
    if (r < 0.38) return 'escudo_zone';
    if (r < 0.72) return 'oleo';
    if (r < 0.92) return 'turbo_z';
    return 'missil_neon';
  }
  if (position <= 3) {
    // 2º ou 3º lugar: mix balanceado
    if (r < 0.32) return 'turbo_z';
    if (r < 0.62) return 'missil_neon';
    if (r < 0.84) return 'escudo_zone';
    return 'oleo';
  }
  // 4º ao 6º lugar: foco em recuperação (Turbo Z e Míssil Neon)
  if (r < 0.48) return 'turbo_z';
  if (r < 0.86) return 'missil_neon';
  if (r < 0.96) return 'escudo_zone';
  return 'oleo';
}

/**
 * Atualiza o progresso de volta usando 4 setores (checkpoints) para evitar trapaça ao dar ré.
 */
export function updateLapProgress(
  racer: Pick<RacerState, 'progress' | 'maxCheckpoint' | 'lap' | 'finished' | 'finishTimeMs'>,
  newProgress: number,
  elapsedMs: number,
  totalLaps: number = CONFIG_JOGO.numeroVoltas
): { lapCompleted: boolean; justFinished: boolean } {
  if (racer.finished) {
    return { lapCompleted: false, justFinished: false };
  }

  const prevProgress = racer.progress;
  racer.progress = newProgress;

  // Checkpoints sequenciais: 0.2 -> 0.45 -> 0.7 -> 0.88
  if (racer.maxCheckpoint === 0 && newProgress >= 0.18 && newProgress < 0.5) {
    racer.maxCheckpoint = 1;
  } else if (racer.maxCheckpoint === 1 && newProgress >= 0.45 && newProgress < 0.75) {
    racer.maxCheckpoint = 2;
  } else if (racer.maxCheckpoint === 2 && newProgress >= 0.7 && newProgress < 0.95) {
    racer.maxCheckpoint = 3;
  }

  // Cruzou a linha de chegada indo para frente após completar os checkpoints
  const crossedFinishForward = prevProgress > 0.82 && newProgress < 0.22;
  if (crossedFinishForward && racer.maxCheckpoint >= 2) {
    racer.maxCheckpoint = 0;
    if (racer.lap >= totalLaps) {
      racer.finished = true;
      racer.finishTimeMs = elapsedMs;
      return { lapCompleted: true, justFinished: true };
    }
    racer.lap += 1;
    return { lapCompleted: true, justFinished: false };
  }

  return { lapCompleted: false, justFinished: false };
}

/**
 * Calcula a classificação ordenada do 1º ao 6º lugar.
 */
export function computeStandings<
  T extends Pick<RacerState, 'id' | 'finished' | 'finishTimeMs' | 'lap' | 'progress'>
>(racers: T[]): T[] {
  return [...racers].sort((a, b) => {
    if (a.finished && b.finished) {
      return a.finishTimeMs - b.finishTimeMs;
    }
    if (a.finished) return -1;
    if (b.finished) return 1;
    const scoreA = a.lap + a.progress;
    const scoreB = b.lap + b.progress;
    return scoreB - scoreA;
  });
}

export interface KinematicsEvents {
  miniTurboTriggered: boolean;
  miniTurboTier: 0 | 1 | 2;
}

/**
 * Física arcade do kart: aceleração suave, drift com carregamento de mini-turbo,
 * saltos em rampas e colisão simples com as barreiras externas da pista.
 */
export function stepKartKinematics(
  racer: RacerState,
  input: KartInputState,
  proj: TrackProjection,
  dt: number
): KinematicsEvents {
  const events: KinematicsEvents = { miniTurboTriggered: false, miniTurboTier: 0 };

  // Reduz temporizadores ativos
  if (racer.boostTimer > 0) racer.boostTimer = Math.max(0, racer.boostTimer - dt);
  if (racer.shieldTimer > 0) racer.shieldTimer = Math.max(0, racer.shieldTimer - dt);

  // Se foi atingido (óleo ou míssil), gira no lugar brevemente
  if (racer.spinTimer > 0) {
    racer.spinTimer = Math.max(0, racer.spinTimer - dt);
    racer.speed = Math.max(0, racer.speed - CONFIG_JOGO.frenagem * 1.4 * dt);
    racer.isDrifting = false;
    racer.driftCharge = 0;
    racer.x += Math.sin(racer.yaw) * racer.speed * dt;
    racer.z += Math.cos(racer.yaw) * racer.speed * dt;
    racer.y = Math.max(proj.roadY, racer.y);
    return events;
  }

  const maxSpeedBase = CONFIG_JOGO.velocidadeMaxima * racer.speedMultiplier;
  const activeMaxSpeed =
    racer.boostTimer > 0
      ? CONFIG_JOGO.velocidadeTurbo * racer.turboMultiplier
      : proj.isOffTrack
      ? maxSpeedBase * 0.62
      : maxSpeedBase;

  // Aceleração e frenagem
  if (input.accelerate) {
    const accelRate = racer.boostTimer > 0 ? CONFIG_JOGO.aceleracao * 2.2 : CONFIG_JOGO.aceleracao;
    racer.speed += accelRate * dt;
  } else if (input.brake) {
    racer.speed -= CONFIG_JOGO.frenagem * dt;
  } else {
    // Desaceleração natural por atrito
    const drag = 24 * dt;
    if (Math.abs(racer.speed) <= drag) racer.speed = 0;
    else racer.speed -= Math.sign(racer.speed) * drag;
  }

  // Impulso mínimo durante turbo ativo
  if (racer.boostTimer > 0 && racer.speed < activeMaxSpeed * 0.85) {
    racer.speed += CONFIG_JOGO.aceleracao * 2.6 * dt;
  }

  racer.speed = Math.max(-18, Math.min(activeMaxSpeed, racer.speed));

  // Direção (+1 esquerda, -1 direita)
  const rawSteer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  racer.steerVisual += (rawSteer - racer.steerVisual) * Math.min(1, 14 * dt);

  // Gerenciamento de Drift (Espaço)
  const canDrift =
    input.drift && racer.speed >= CONFIG_JOGO.velocidadeDriftMin && racer.isGrounded;

  if (canDrift) {
    if (!racer.isDrifting && rawSteer !== 0) {
      racer.isDrifting = true;
      racer.driftDir = rawSteer;
      racer.driftCharge = 0;
    }
    if (racer.isDrifting) {
      // Permite modular o ângulo da curva durante o drift sem trocar o lado travado
      const driftTurn =
        racer.driftDir * 1.15 + rawSteer * 0.55;
      racer.yaw += driftTurn * CONFIG_JOGO.taxaGiroBase * racer.controlMultiplier * dt;
      racer.driftCharge += dt;
    } else if (rawSteer !== 0) {
      const speedFactor = Math.min(1, Math.abs(racer.speed) / 20);
      racer.yaw += rawSteer * CONFIG_JOGO.taxaGiroBase * racer.controlMultiplier * speedFactor * dt;
    }
  } else {
    // Ao soltar o drift, concede mini-turbo se carregou o suficiente
    if (racer.isDrifting) {
      if (racer.driftCharge >= 1.35) {
        racer.boostTimer = Math.max(racer.boostTimer, 1.35 * racer.turboMultiplier);
        events.miniTurboTriggered = true;
        events.miniTurboTier = 2;
      } else if (racer.driftCharge >= 0.55) {
        racer.boostTimer = Math.max(racer.boostTimer, 0.8 * racer.turboMultiplier);
        events.miniTurboTriggered = true;
        events.miniTurboTier = 1;
      }
      racer.isDrifting = false;
      racer.driftDir = 0;
      racer.driftCharge = 0;
    }

    if (rawSteer !== 0 && Math.abs(racer.speed) > 0.5) {
      const dirSign = racer.speed >= 0 ? 1 : -1;
      const speedFactor = Math.min(1, Math.abs(racer.speed) / 18);
      racer.yaw +=
        rawSteer *
        dirSign *
        CONFIG_JOGO.taxaGiroBase *
        racer.controlMultiplier *
        speedFactor *
        dt;
    }
  }

  // Movimento no plano XZ
  const prevY = racer.y;
  const moveYaw = racer.isDrifting ? racer.yaw - racer.driftDir * 0.16 : racer.yaw;
  racer.x += Math.sin(moveYaw) * racer.speed * dt;
  racer.z += Math.cos(moveYaw) * racer.speed * dt;

  // Física vertical (rampas e saltos)
  const groundY = proj.roadY;
  if (racer.isGrounded) {
    // Se acabou de passar pelo topo de uma rampa em alta velocidade, ganha impulso aéreo
    const slope = groundY - prevY;
    if (proj.isRamp && slope < -0.05 && racer.speed > 38) {
      racer.vy = Math.min(14, racer.speed * 0.16);
      racer.isGrounded = false;
    } else {
      racer.y = groundY;
      racer.vy = 0;
    }
  } else {
    racer.vy -= CONFIG_JOGO.gravidade * dt;
    racer.y += racer.vy * dt;
    if (racer.y <= groundY) {
      racer.y = groundY;
      racer.vy = 0;
      racer.isGrounded = true;
    }
  }

  return events;
}

/**
 * Formata milissegundos em MM:SS.CC para cronômetro e pódio.
 */
export function formatRaceTime(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00.00';
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function loadProgress(storage?: Storage): PersistedProgress {
  const defaultState: PersistedProgress = {
    moedas: 0,
    skinsDesbloqueadas: ['padrao'],
    melhoresTempos: {},
  };
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!store) return defaultState;
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    return {
      moedas: typeof parsed.moedas === 'number' && parsed.moedas >= 0 ? parsed.moedas : 0,
      skinsDesbloqueadas: Array.isArray(parsed.skinsDesbloqueadas)
        ? Array.from(new Set<SkinId>(['padrao', ...parsed.skinsDesbloqueadas]))
        : ['padrao'],
      melhoresTempos: parsed.melhoresTempos && typeof parsed.melhoresTempos === 'object'
        ? parsed.melhoresTempos
        : {},
    };
  } catch {
    return defaultState;
  }
}

export function saveProgress(progress: PersistedProgress, storage?: Storage): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!store) return;
    store.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignora falhas de armazenamento privado
  }
}
