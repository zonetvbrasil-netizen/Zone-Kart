import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrackData, projectOntoTrack } from './tracks';
import {
  computeStandings,
  formatRaceTime,
  loadProgress,
  rollItemByPosition,
  saveProgress,
  stepKartKinematics,
  updateLapProgress,
  type RacerState,
} from './rules';

function createMockRacer(overrides: Partial<RacerState> = {}): RacerState {
  return {
    id: 'player',
    nome: 'ZONE',
    isPlayer: true,
    x: 0,
    y: 0,
    z: 0,
    vy: 0,
    yaw: 0,
    speed: 0,
    steerVisual: 0,
    isGrounded: true,
    isDrifting: false,
    driftDir: 0,
    driftCharge: 0,
    boostTimer: 0,
    shieldTimer: 0,
    spinTimer: 0,
    sampleIndex: 0,
    progress: 0,
    maxCheckpoint: 0,
    lap: 1,
    finished: false,
    finishTimeMs: 0,
    item: null,
    speedMultiplier: 1,
    turboMultiplier: 1,
    controlMultiplier: 1,
    ...overrides,
  };
}

test('todas as 3 pistas geram amostras fechadas, faixas de turbo, itens e moedas', () => {
  for (const id of ['zone_circuit', 'arena_gamer', 'lime_desert'] as const) {
    const track = buildTrackData(id);
    assert.equal(track.samples.length, 320);
    assert.ok(track.totalLength > 500, `Pista ${id} deve ter comprimento adequado`);
    assert.ok(track.boostPads.length >= 4);
    assert.ok(track.itemBoxes.length >= 9);
    assert.ok(track.coins.length >= 16);

    const proj = projectOntoTrack(track, track.samples[0].pos.x, track.samples[0].pos.z, 0);
    assert.equal(proj.isOffTrack, false);
    assert.ok(Math.abs(proj.lateralOffset) < 0.25);
  }
});

test('sorteio de itens favorece ataque/turbo nas ultimas posicoes e defesa na lideranca', () => {
  const firstPlaceCounts = { escudo_zone: 0, oleo: 0, turbo_z: 0, missil_neon: 0 };
  const lastPlaceCounts = { escudo_zone: 0, oleo: 0, turbo_z: 0, missil_neon: 0 };

  for (let i = 0; i < 100; i++) {
    const r = (i + 0.5) / 100;
    firstPlaceCounts[rollItemByPosition(1, () => r)]++;
    lastPlaceCounts[rollItemByPosition(6, () => r)]++;
  }

  assert.ok(firstPlaceCounts.escudo_zone + firstPlaceCounts.oleo > 60);
  assert.ok(lastPlaceCounts.turbo_z + lastPlaceCounts.missil_neon > 80);
});

test('progressao de voltas exige checkpoints e finaliza na 3a volta', () => {
  const racer = createMockRacer({ lap: 1, progress: 0.02, maxCheckpoint: 0 });

  // Tentar dar ré pela linha de chegada não deve contar volta
  racer.progress = 0.96;
  const reverseAttempt = updateLapProgress(racer, 0.02, 5000, 3);
  assert.equal(reverseAttempt.lapCompleted, false);
  assert.equal(racer.lap, 1);

  // Avançar pelos checkpoints e completar 3 voltas
  for (let lap = 1; lap <= 3; lap++) {
    updateLapProgress(racer, 0.25, lap * 10000, 3);
    updateLapProgress(racer, 0.52, lap * 15000, 3);
    updateLapProgress(racer, 0.78, lap * 20000, 3);
    racer.progress = 0.93;
    const res = updateLapProgress(racer, 0.04, lap * 25000, 3);
    assert.equal(res.lapCompleted, true);
    if (lap < 3) {
      assert.equal(res.justFinished, false);
      assert.equal(racer.lap, lap + 1);
    } else {
      assert.equal(res.justFinished, true);
      assert.equal(racer.finished, true);
      assert.equal(racer.finishTimeMs, 75000);
    }
  }
});

test('classificacao ordena corretamente pilotos finalizados e em pista', () => {
  const racers = [
    createMockRacer({ id: 'a', lap: 2, progress: 0.4 }),
    createMockRacer({ id: 'b', lap: 3, progress: 0.9, finished: true, finishTimeMs: 82000 }),
    createMockRacer({ id: 'c', lap: 3, progress: 0.1 }),
    createMockRacer({ id: 'd', lap: 3, progress: 0.9, finished: true, finishTimeMs: 79000 }),
  ];

  const ranked = computeStandings(racers);
  assert.deepEqual(
    ranked.map((r) => r.id),
    ['d', 'b', 'c', 'a']
  );
});

test('fisica de kart acelera, derrapa e dispara mini-turbo ao soltar espaco', () => {
  const track = buildTrackData('zone_circuit');
  const racer = createMockRacer({ x: 0, y: 0, z: 0, yaw: 0, speed: 35 });

  // Segurar drift + curva por 0.8s
  for (let i = 0; i < 48; i++) {
    const proj = projectOntoTrack(track, racer.x, racer.z, racer.sampleIndex);
    stepKartKinematics(
      racer,
      { accelerate: true, brake: false, left: true, right: false, drift: true },
      proj,
      1 / 60
    );
  }
  assert.equal(racer.isDrifting, true);
  assert.ok(racer.driftCharge > 0.6);

  // Soltar drift deve ativar mini-turbo
  const projRelease = projectOntoTrack(track, racer.x, racer.z, racer.sampleIndex);
  const ev = stepKartKinematics(
    racer,
    { accelerate: true, brake: false, left: false, right: false, drift: false },
    projRelease,
    1 / 60
  );
  assert.equal(ev.miniTurboTriggered, true);
  assert.ok(racer.boostTimer > 0.5);
});

test('formatRaceTime e persistencia em storage funcionam corretamente', () => {
  assert.equal(formatRaceTime(65432), '01:05.43');
  assert.equal(formatRaceTime(0), '00:00.00');

  const map = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  } as unknown as Storage;

  saveProgress(
    {
      moedas: 24,
      skinsDesbloqueadas: ['padrao', 'volt'],
      melhoresTempos: { zone_circuit: 71230 },
    },
    mockStorage
  );

  const loaded = loadProgress(mockStorage);
  assert.equal(loaded.moedas, 24);
  assert.deepEqual(loaded.skinsDesbloqueadas, ['padrao', 'volt']);
  assert.equal(loaded.melhoresTempos.zone_circuit, 71230);
});
