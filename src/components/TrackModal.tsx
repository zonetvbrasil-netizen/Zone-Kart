import { Check, Trophy, X } from 'lucide-react';
import { PISTAS_META, TrackId } from '../game/config';
import { formatRaceTime } from '../game/rules';

interface TrackModalProps {
  selectedTrack: TrackId;
  bestTimes: Partial<Record<TrackId, number>>;
  onSelectTrack: (id: TrackId) => void;
  onClose: () => void;
}

export function TrackModal({
  selectedTrack,
  bestTimes,
  onSelectTrack,
  onClose,
}: TrackModalProps) {
  const tracks = [PISTAS_META.zone_circuit, PISTAS_META.arena_gamer, PISTAS_META.lime_desert];

  return (
    <div
      className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0F1014] border border-[#C6FF00]/40 rounded-2xl p-5 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 id="track-modal-title" className="font-display text-2xl font-bold text-white">
              Selecionar Pista
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              3 circuitos temáticos com rampas, faixas de turbo e atalhos secretos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar seleção de pistas"
            className="w-10 h-10 rounded-xl bg-[#181920] hover:bg-[#242630] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 mt-5">
          {tracks.map((t) => {
            const active = selectedTrack === t.id;
            const best = bestTimes[t.id];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTrack(t.id)}
                className={`text-left rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  active
                    ? 'bg-[#171D10] border-[#C6FF00] shadow-[0_0_20px_rgba(198,255,0,0.18)]'
                    : 'bg-[#16171D] border-white/10 hover:border-white/30'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl font-bold text-white">{t.nome}</span>
                    {active && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C6FF00]">
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        Ativa
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                    <span className="text-[#C6FF00] font-medium">{t.tema}</span>
                    <span aria-hidden="true">·</span>
                    <span>Dificuldade: {t.dificuldade}</span>
                    <span aria-hidden="true">·</span>
                    <span>3 Voltas</span>
                  </div>
                  <p className="text-sm text-zinc-300 mt-2">{t.descricao}</p>
                </div>

                <div className="shrink-0 sm:text-right bg-[#0A0A0A]/80 border border-white/10 rounded-xl px-4 py-2.5">
                  <div className="text-[11px] text-zinc-400 flex items-center sm:justify-end gap-1">
                    <Trophy className="w-3.5 h-3.5 text-[#C6FF00]" aria-hidden="true" />
                    <span>Melhor Tempo</span>
                  </div>
                  <div className="font-mono-num text-base font-bold text-white mt-0.5">
                    {best ? formatRaceTime(best) : '--:--.--'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#C6FF00] hover:bg-[#D5FF38] text-[#0A0A0A] font-display font-bold text-sm cursor-pointer"
          >
            Confirmar Pista
          </button>
        </div>
      </div>
    </div>
  );
}
