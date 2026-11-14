import { PISTAS_META, TrackId } from './config';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TrackSample {
  index: number;
  progress: number; // 0..1 along closed loop
  pos: Vec3;
  tangent: Vec3;
  right: Vec3;
  yaw: number;
  halfWidth: number;
  isRamp: boolean;
}

export interface TrackFeaturePlacement {
  progress: number;
  lateralOffset: number; // fraction of halfWidth (-0.8..0.8) or world meters
  pos: Vec3;
  yaw: number;
}

export interface ShortcutZone {
  startProgress: number;
  endProgress: number;
  side: 'left' | 'right'; // -1 = left, +1 = right
  extraWidth: number;
  boost: boolean;
}

export interface TrackData {
  id: TrackId;
  samples: TrackSample[];
  totalLength: number;
  halfWidth: number;
  boostPads: TrackFeaturePlacement[];
  itemBoxes: TrackFeaturePlacement[];
  coins: TrackFeaturePlacement[];
  shortcuts: ShortcutZone[];
}

export interface TrackProjection {
  sampleIndex: number;
  progress: number;
  lateralOffset: number; // meters from center (+ = right, - = left)
  roadY: number;
  roadYaw: number;
  halfWidth: number;
  isOffTrack: boolean;
  isShortcut: boolean;
  isRamp: boolean;
}

/**
 * Pontos de controle (X, Y, Z) de cada pista fechada.
 * A pista sempre nasce na origem (0, 0, 0) apontando para +Z para largada limpa.
 */
const TRACK_CONTROL_POINTS: Record<TrackId, Vec3[]> = {
  zone_circuit: [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 75 },
    { x: 25, y: 0, z: 145 },
    { x: 95, y: 0, z: 170 },
    { x: 165, y: 3.8, z: 135 }, // Rampa urbana elevada
    { x: 195, y: 0, z: 60 },
    { x: 160, y: 0, z: -25 },
    { x: 190, y: 0, z: -105 },
    { x: 130, y: 0, z: -170 },
    { x: 40, y: 0, z: -155 },
    { x: -15, y: 0, z: -95 },
    { x: 0, y: 0, z: -45 },
  ],
  arena_gamer: [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 70 },
    { x: -35, y: 3.4, z: 135 }, // Rampa 1
    { x: -115, y: 0, z: 155 },
    { x: -175, y: 0, z: 100 },
    { x: -155, y: 0, z: 20 },
    { x: -90, y: 0, z: -25 },
    { x: -145, y: 3.6, z: -95 }, // Rampa 2
    { x: -110, y: 0, z: -165 },
    { x: -20, y: 0, z: -165 },
    { x: 20, y: 0, z: -105 },
    { x: 0, y: 0, z: -48 },
  ],
  lime_desert: [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 85 },
    { x: 55, y: 4.2, z: 165 }, // Grande duna/rampa
    { x: 145, y: 1.2, z: 180 },
    { x: 210, y: 0, z: 115 },
    { x: 170, y: 0, z: 35 },
    { x: 105, y: 2.2, z: -15 },
    { x: 155, y: 0, z: -95 },
    { x: 110, y: 0, z: -180 },
    { x: 15, y: 0, z: -175 },
    { x: -35, y: 1.5, z: -105 },
    { x: 0, y: 0, z: -50 },
  ],
};

const TRACK_SHORTCUTS: Record<TrackId, ShortcutZone[]> = {
  zone_circuit: [
    { startProgress: 0.48, endProgress: 0.58, side: 'left', extraWidth: 10, boost: true },
  ],
  arena_gamer: [
    { startProgress: 0.42, endProgress: 0.52, side: 'right', extraWidth: 9.5, boost: true },
  ],
  lime_desert: [
    { startProgress: 0.55, endProgress: 0.66, side: 'left', extraWidth: 11, boost: true },
  ],
};

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function sampleClosedSpline(points: Vec3[], t: number): Vec3 {
  const n = points.length;
  const scaled = ((t % 1) + 1) % 1 * n;
  const idx = Math.floor(scaled);
  const localT = scaled - idx;

  const p0 = points[(idx - 1 + n) % n];
  const p1 = points[idx % n];
  const p2 = points[(idx + 1) % n];
  const p3 = points[(idx + 2) % n];

  return {
    x: catmullRom(p0.x, p1.x, p2.x, p3.x, localT),
    y: catmullRom(p0.y, p1.y, p2.y, p3.y, localT),
    z: catmullRom(p0.z, p1.z, p2.z, p3.z, localT),
  };
}

const trackCache = new Map<TrackId, TrackData>();

export function buildTrackData(trackId: TrackId): TrackData {
  const cached = trackCache.get(trackId);
  if (cached) return cached;

  const controlPts = TRACK_CONTROL_POINTS[trackId];
  const meta = PISTAS_META[trackId];
  const halfWidth = meta.larguraPista * 0.5;
  const sampleCount = 320;

  // Passo 1: superamostragem para parametrizar por comprimento de arco uniforme
  const denseCount = 1280;
  const densePts: Vec3[] = [];
  const cumLen: number[] = [0];
  let totalLen = 0;

  for (let i = 0; i < denseCount; i++) {
    const pt = sampleClosedSpline(controlPts, i / denseCount);
    densePts.push(pt);
    if (i > 0) {
      const dx = pt.x - densePts[i - 1].x;
      const dy = pt.y - densePts[i - 1].y;
      const dz = pt.z - densePts[i - 1].z;
      totalLen += Math.hypot(dx, dy, dz);
      cumLen.push(totalLen);
    }
  }
  const closeDx = densePts[0].x - densePts[denseCount - 1].x;
  const closeDy = densePts[0].y - densePts[denseCount - 1].y;
  const closeDz = densePts[0].z - densePts[denseCount - 1].z;
  totalLen += Math.hypot(closeDx, closeDy, closeDz);

  const uniformPts: Vec3[] = [];
  let denseIdx = 0;
  for (let i = 0; i < sampleCount; i++) {
    const targetDist = (i / sampleCount) * totalLen;
    while (denseIdx < denseCount - 2 && cumLen[denseIdx + 1] < targetDist) {
      denseIdx++;
    }
    const segStart = cumLen[denseIdx];
    const segEnd = denseIdx === denseCount - 1 ? totalLen : cumLen[denseIdx + 1];
    const alpha = segEnd > segStart ? (targetDist - segStart) / (segEnd - segStart) : 0;
    const a = densePts[denseIdx];
    const b = densePts[(denseIdx + 1) % denseCount];
    uniformPts.push({
      x: a.x + (b.x - a.x) * alpha,
      y: Math.max(0, a.y + (b.y - a.y) * alpha),
      z: a.z + (b.z - a.z) * alpha,
    });
  }

  // Passo 2: construir amostras com tangente, vetor lateral direito e indicação de rampa
  const samples: TrackSample[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const prev = uniformPts[(i - 1 + sampleCount) % sampleCount];
    const curr = uniformPts[i];
    const next = uniformPts[(i + 1) % sampleCount];

    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const tz = next.z - prev.z;
    const tLen = Math.hypot(tx, ty, tz) || 1;
    const tangent: Vec3 = { x: tx / tLen, y: ty / tLen, z: tz / tLen };

    // Vetor direito no plano XZ compatível com forward = (sin(yaw), 0, cos(yaw))
    const flatLen = Math.hypot(tx, tz) || 1;
    const fx = tx / flatLen;
    const fz = tz / flatLen;
    const right: Vec3 = { x: -fz, y: 0, z: fx };
    const yaw = Math.atan2(fx, fz);

    samples.push({
      index: i,
      progress: i / sampleCount,
      pos: curr,
      tangent,
      right,
      yaw,
      halfWidth,
      isRamp: curr.y > 1.35,
    });
  }

  const placeAtProgress = (progress: number, lateralFraction: number): TrackFeaturePlacement => {
    const idx = Math.floor(((progress % 1) + 1) % 1 * sampleCount) % sampleCount;
    const s = samples[idx];
    const lateralMeters = lateralFraction * halfWidth;
    return {
      progress: s.progress,
      lateralOffset: lateralMeters,
      pos: {
        x: s.pos.x + s.right.x * lateralMeters,
        y: s.pos.y,
        z: s.pos.z + s.right.z * lateralMeters,
      },
      yaw: s.yaw,
    };
  };

  // Faixas de turbo distribuídas estrategicamente na pista e nos atalhos
  const boostPads: TrackFeaturePlacement[] = [
    placeAtProgress(0.11, 0.0),
    placeAtProgress(0.32, -0.32),
    placeAtProgress(0.53, TRACK_SHORTCUTS[trackId][0].side === 'left' ? -1.18 : 1.18),
    placeAtProgress(0.73, 0.25),
    placeAtProgress(0.9, -0.15),
  ];

  // Fileiras de caixas de item (?)
  const itemBoxProgresses = [0.16, 0.39, 0.65, 0.84];
  const itemBoxes: TrackFeaturePlacement[] = [];
  for (const p of itemBoxProgresses) {
    for (const lat of [-0.52, 0, 0.52]) {
      itemBoxes.push(placeAtProgress(p, lat));
    }
  }

  // Arcos de moedas colecionáveis
  const coins: TrackFeaturePlacement[] = [];
  const coinArcs = [
    { start: 0.06, lat: -0.35 },
    { start: 0.24, lat: 0.42 },
    { start: 0.45, lat: -0.2 },
    { start: 0.69, lat: 0.35 },
    { start: 0.88, lat: 0.0 },
  ];
  for (const arc of coinArcs) {
    for (let k = 0; k < 4; k++) {
      coins.push(placeAtProgress(arc.start + k * 0.012, arc.lat));
    }
  }

  const data: TrackData = {
    id: trackId,
    samples,
    totalLength: totalLen,
    halfWidth,
    boostPads,
    itemBoxes,
    coins,
    shortcuts: TRACK_SHORTCUTS[trackId],
  };
  trackCache.set(trackId, data);
  return data;
}

/**
 * Projeta uma posição (x, z) na pista com busca local rápida (ou global se hintIndex < 0).
 */
export function projectOntoTrack(
  track: TrackData,
  x: number,
  z: number,
  hintIndex = -1
): TrackProjection {
  const samples = track.samples;
  const n = samples.length;
  let bestIdx = 0;
  let bestDistSq = Infinity;

  if (hintIndex >= 0 && hintIndex < n) {
    const window = 28;
    for (let offset = -window; offset <= window; offset++) {
      const idx = (hintIndex + offset + n) % n;
      const s = samples[idx];
      const dx = x - s.pos.x;
      const dz = z - s.pos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = idx;
      }
    }
    // Se ficou muito longe da janela local, faz varredura completa
    if (bestDistSq > track.halfWidth * track.halfWidth * 9) {
      bestDistSq = Infinity;
      for (let idx = 0; idx < n; idx++) {
        const s = samples[idx];
        const dx = x - s.pos.x;
        const dz = z - s.pos.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
    }
  } else {
    for (let idx = 0; idx < n; idx++) {
      const s = samples[idx];
      const dx = x - s.pos.x;
      const dz = z - s.pos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = idx;
      }
    }
  }

  const sample = samples[bestIdx];
  const relX = x - sample.pos.x;
  const relZ = z - sample.pos.z;

  // Projeção longitudinal e lateral
  const along = relX * sample.tangent.x + relZ * sample.tangent.z;
  const lateralOffset = relX * sample.right.x + relZ * sample.right.z;

  const segLen = track.totalLength / n;
  const deltaProg = along / track.totalLength;
  const progress = (((sample.progress + deltaProg) % 1) + 1) % 1;

  // Verifica se está na faixa de atalho
  let isShortcut = false;
  let effectiveLeftLimit = -sample.halfWidth;
  let effectiveRightLimit = sample.halfWidth;

  for (const sc of track.shortcuts) {
    if (progress >= sc.startProgress && progress <= sc.endProgress) {
      if (sc.side === 'left') {
        effectiveLeftLimit = -(sample.halfWidth + sc.extraWidth);
        if (lateralOffset < -sample.halfWidth * 0.9 && lateralOffset >= effectiveLeftLimit) {
          isShortcut = true;
        }
      } else {
        effectiveRightLimit = sample.halfWidth + sc.extraWidth;
        if (lateralOffset > sample.halfWidth * 0.9 && lateralOffset <= effectiveRightLimit) {
          isShortcut = true;
        }
      }
    }
  }

  const isOffTrack = lateralOffset < effectiveLeftLimit || lateralOffset > effectiveRightLimit;

  // Interpolação suave da altura Y da pista
  const nextSample = samples[(bestIdx + 1) % n];
  const prevSample = samples[(bestIdx - 1 + n) % n];
  const tSeg = Math.max(-1, Math.min(1, along / segLen));
  const roadY =
    tSeg >= 0
      ? sample.pos.y + (nextSample.pos.y - sample.pos.y) * tSeg
      : sample.pos.y + (sample.pos.y - prevSample.pos.y) * tSeg;

  return {
    sampleIndex: bestIdx,
    progress,
    lateralOffset,
    roadY: Math.max(0, roadY),
    roadYaw: sample.yaw,
    halfWidth: sample.halfWidth,
    isOffTrack,
    isShortcut,
    isRamp: sample.isRamp,
  };
}
