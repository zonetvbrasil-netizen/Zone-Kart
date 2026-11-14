import { useMemo } from 'react';
import { Coins, Pause, Volume2, VolumeX, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { ITENS_INFO } from '../game/config';
import { HudSnapshot } from '../game/RaceEngine';
import { formatRaceTime, KartInputState } from '../game/rules';
import { ItemIcon } from './ZoneIcons';

interface RaceHUDProps {
  hud: HudSnapshot;
  isMuted: boolean;
  showTouchControls: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onUseItem: () => void;
  onTouchInput: (partial: Partial<KartInputState>) => void;
}

export function RaceHUD({
  hud,
  isMuted,
  showTouchControls,
  onToggleMute,
  onPause,
  onUseItem,
  onTouchInput,
}: RaceHUDProps) {
  const minimapData = useMemo(() => {
    if (hud.minimapTrack.length === 0) return { path: '', racers: [] as Array<{ cx: number; cy: number; isPlayer: boolean; color: string }> };

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const pt of hud.minimapTrack) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.z < minZ) minZ = pt.z;
      if (pt.z > maxZ) maxZ = pt.z;
    }

    const pad = 12;
    const size = 112;
    const span = Math.max(1, maxX - minX, maxZ - minZ);
    const scale = (size - pad * 2) / span;
    const offsetX = (size - (maxX - minX) * scale) * 0.5;
    const offsetY = (size - (maxZ - minZ) * scale) * 0.5;

    const project = (x: number, z: number) => ({
      cx: offsetX + (maxX - x) * scale, // Espelhado para coincidir direita/esquerda na tela
      cy: offsetY + (maxZ - z) * scale,
    });

    const d = hud.minimapTrack
      .map((pt, idx) => {
        const { cx, cy } = project(pt.x, pt.z);
        return `${idx === 0 ? 'M' : 'L'}${cx.toFixed(1)},${cy.toFixed(1)}`;
      })
      .join(' ') + ' Z';

    const racers = hud.minimapRacers.map((r) => ({
      ...project(r.x, r.z),
      isPlayer: r.isPlayer,
      color: r.color,
    }));

    return { path: d, racers };
  }, [hud.minimapTrack, hud.minimapRacers]);

  const itemInfo = hud.item ? ITENS_INFO[hud.item] : null;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Faixa superior: Posição/Volta/Moedas à esquerda | Cronômetro e utilitários à direita */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-5 bg-[#0A0A0A]/88 border border-[#C6FF00]/35 rounded-2xl px-2.5 sm:px-4 py-2 sm:py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
          <div>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400">Pos</div>
            <div className="font-display font-bold text-xl sm:text-3xl leading-none text-[#C6FF00] font-mono-num">
              {hud.position}º<span className="text-xs sm:text-sm text-zinc-400 font-normal">/{hud.totalRacers}</span>
            </div>
          </div>

          <div className="w-px h-7 sm:h-8 bg-white/10" aria-hidden="true" />

          <div>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400">Volta</div>
            <div className="font-display font-bold text-xl sm:text-3xl leading-none text-white font-mono-num">
              {hud.lap}<span className="text-xs sm:text-sm text-zinc-400 font-normal">/{hud.totalLaps}</span>
            </div>
          </div>

          <div className="hidden sm:block w-px h-8 bg-white/10" aria-hidden="true" />

          <div className="hidden sm:block">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400">Moedas</div>
            <div className="font-display font-bold text-xl leading-none text-white font-mono-num flex items-center gap-1 mt-0.5">
              <Coins className="w-4 h-4 text-[#C6FF00]" aria-hidden="true" />
              {hud.coinsInRace}
            </div>
          </div>
        </div>

        {/* Canto superior direito: Cronômetro + Som [M] + Pausa [P] */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="bg-[#0A0A0A]/88 border border-white/15 rounded-2xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-right shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400">Tempo</div>
            <div className="font-mono-num text-sm sm:text-xl font-bold text-white leading-tight">
              {formatRaceTime(hud.elapsedMs)}
            </div>
          </div>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={isMuted ? 'Ativar som' : 'Silenciar som'}
            className="pointer-events-auto w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#0A0A0A]/88 border border-white/15 hover:border-[#C6FF00] text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pausar corrida"
            className="pointer-events-auto w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#0A0A0A]/88 border border-white/15 hover:border-[#C6FF00] text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Centro livre com contagem regressiva 3-2-1-GO! ou banner rápido */}
      <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
        {hud.countdownText ? (
          <div
            key={hud.countdownText}
            className="animate-z-pop font-display italic font-bold text-7xl sm:text-8xl text-[#C6FF00] hud-stroke tracking-wider"
          >
            {hud.countdownText}
          </div>
        ) : hud.bannerText ? (
          <div className="animate-z-pop bg-[#0A0A0A]/90 border border-[#C6FF00] rounded-xl px-5 py-2 font-display font-bold text-xl sm:text-2xl text-[#C6FF00] tracking-wide shadow-[0_0_24px_rgba(198,255,0,0.3)]">
            {hud.bannerText}
          </div>
        ) : null}
      </div>

      {/* Controles Virtuais Touch para Celular */}
      {showTouchControls && (
        <div className="pointer-events-none flex items-end justify-between gap-4 pb-2">
          <div className="pointer-events-auto flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Virar à esquerda"
              onPointerDown={() => onTouchInput({ left: true })}
              onPointerUp={() => onTouchInput({ left: false })}
              onPointerCancel={() => onTouchInput({ left: false })}
              onPointerLeave={() => onTouchInput({ left: false })}
              className="w-14 h-14 rounded-2xl bg-[#0A0A0A]/85 border border-white/25 active:border-[#C6FF00] active:bg-[#1E260C] flex items-center justify-center text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              aria-label="Virar à direita"
              onPointerDown={() => onTouchInput({ right: true })}
              onPointerUp={() => onTouchInput({ right: false })}
              onPointerCancel={() => onTouchInput({ right: false })}
              onPointerLeave={() => onTouchInput({ right: false })}
              className="w-14 h-14 rounded-2xl bg-[#0A0A0A]/85 border border-white/25 active:border-[#C6FF00] active:bg-[#1E260C] flex items-center justify-center text-white"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

          <div className="pointer-events-auto flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Frear"
              onPointerDown={() => onTouchInput({ brake: true })}
              onPointerUp={() => onTouchInput({ brake: false })}
              onPointerCancel={() => onTouchInput({ brake: false })}
              onPointerLeave={() => onTouchInput({ brake: false })}
              className="w-13 h-13 rounded-2xl bg-[#0A0A0A]/85 border border-white/25 active:border-red-400 flex items-center justify-center text-white"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Derrapar"
              onPointerDown={() => onTouchInput({ drift: true })}
              onPointerUp={() => onTouchInput({ drift: false })}
              onPointerCancel={() => onTouchInput({ drift: false })}
              onPointerLeave={() => onTouchInput({ drift: false })}
              className="px-3.5 h-13 rounded-2xl bg-[#0A0A0A]/85 border border-[#C6FF00]/50 active:bg-[#C6FF00] active:text-[#0A0A0A] font-display font-bold text-xs text-[#C6FF00]"
            >
              DRIFT
            </button>
            <button
              type="button"
              aria-label="Acelerar"
              onPointerDown={() => onTouchInput({ accelerate: true })}
              onPointerUp={() => onTouchInput({ accelerate: false })}
              onPointerCancel={() => onTouchInput({ accelerate: false })}
              onPointerLeave={() => onTouchInput({ accelerate: false })}
              className="w-15 h-15 rounded-2xl bg-[#C6FF00]/90 active:bg-[#D8FF38] text-[#0A0A0A] font-bold flex items-center justify-center shadow-[0_0_16px_rgba(198,255,0,0.4)]"
            >
              <ArrowUp className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}

      {/* Faixa inferior: Item + Minimapa à esquerda | Velocímetro + Carga de Drift à direita */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-end gap-3">
          {/* Slot de Item clicável (também ativado por SHIFT) */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onUseItem();
            }}
            aria-label={itemInfo ? `Usar item ${itemInfo.nome}` : 'Slot de item vazio'}
            className={`pointer-events-auto flex items-center gap-3 bg-[#0A0A0A]/90 border rounded-2xl p-2.5 sm:p-3 shadow-[0_8px_24px_rgba(0,0,0,0.65)] transition-colors ${
              hud.item
                ? 'border-[#C6FF00] hover:bg-[#171D10] cursor-pointer'
                : 'border-white/15 cursor-default'
            }`}
          >
            <ItemIcon item={hud.item} size={42} />
            <div className="text-left pr-1 hidden sm:block">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                Item [Shift]
              </div>
              <div className="font-display font-bold text-sm text-white">
                {itemInfo ? itemInfo.nome : 'Vazio'}
              </div>
            </div>
          </button>

          {/* Minimapa da pista */}
          <div className="bg-[#0A0A0A]/88 border border-white/15 rounded-2xl p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.65)] hidden sm:block">
            <svg width="96" height="96" viewBox="0 0 112 112" aria-label="Minimapa da pista">
              {minimapData.path && (
                <path
                  d={minimapData.path}
                  fill="none"
                  stroke="#3A3E4C"
                  strokeWidth="7"
                  strokeLinejoin="round"
                />
              )}
              {minimapData.path && (
                <path
                  d={minimapData.path}
                  fill="none"
                  stroke="#8B93A7"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              )}
              {minimapData.racers.map((r, i) => (
                <circle
                  key={i}
                  cx={r.cx}
                  cy={r.cy}
                  r={r.isPlayer ? 5.2 : 3.5}
                  fill={r.color}
                  stroke="#0A0A0A"
                  strokeWidth="1.5"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Velocímetro e Barra de Carga do Drift */}
        <div className="bg-[#0A0A0A]/90 border border-[#C6FF00]/35 rounded-2xl px-4 py-2.5 min-w-[144px] text-right shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
          <div className="flex items-baseline justify-end gap-1.5">
            <span className="font-mono-num font-bold text-3xl sm:text-4xl leading-none text-white">
              {hud.speedKmh}
            </span>
            <span className="text-xs font-display font-bold text-[#C6FF00]">km/h</span>
          </div>

          <div className="mt-2 h-1.5 w-full bg-[#1C1E26] rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-75 rounded-full"
              style={{
                width: `${Math.round(hud.driftChargeRatio * 100)}%`,
                backgroundColor: hud.driftChargeRatio > 0.8 ? '#C6FF00' : '#FFB800',
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
            <span>{hud.shieldActive ? 'ESCUDO' : hud.boostActive ? 'TURBO' : 'DRIFT'}</span>
            <span className="font-mono-num">
              {hud.driftChargeRatio > 0 ? `${Math.round(hud.driftChargeRatio * 100)}%` : 'Espaço'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
