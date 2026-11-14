import { Coins, Home, RotateCcw, Trophy } from 'lucide-react';
import { HudSnapshot } from '../game/RaceEngine';
import { formatRaceTime } from '../game/rules';

interface ResultsModalProps {
  hud: HudSnapshot;
  trackName: string;
  isNewRecord: boolean;
  bestTimeMs?: number;
  onPlayAgain: () => void;
  onExitToMenu: () => void;
}

export function ResultsModal({
  hud,
  trackName,
  isNewRecord,
  bestTimeMs,
  onPlayAgain,
  onExitToMenu,
}: ResultsModalProps) {
  const top3 = hud.standings.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const playerRow = hud.standings.find((r) => r.isPlayer);

  return (
    <div
      className="fixed inset-0 z-30 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-title"
    >
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#0F1014] border border-[#C6FF00]/50 rounded-2xl p-6 sm:p-7 shadow-[0_24px_72px_rgba(0,0,0,0.95)]">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#C6FF00]">
            {trackName} · Fim de Corrida
          </div>
          <h2 id="results-title" className="font-display text-3xl sm:text-4xl font-bold text-white mt-1">
            {playerRow && playerRow.position <= 3
              ? `Você ficou em ${playerRow.position}º Lugar!`
              : `Corrida Concluída (${playerRow?.position ?? hud.position}º)`}
          </h2>
          {isNewRecord && (
            <div className="inline-flex items-center gap-1.5 mt-2 text-sm font-bold text-[#C6FF00]">
              <Trophy className="w-4 h-4" aria-hidden="true" />
              Novo Recorde da Pista!
            </div>
          )}
        </div>

        {/* Pódio Top 3 */}
        <div className="grid grid-cols-3 gap-3 items-end mt-6 pt-2">
          {podiumOrder.map((r) => {
            const isFirst = r.position === 1;
            const heightClass = isFirst ? 'h-28' : r.position === 2 ? 'h-20' : 'h-16';
            return (
              <div key={r.id} className="flex flex-col items-center text-center">
                <div
                  className={`font-display font-bold text-sm sm:text-base truncate max-w-full ${
                    r.isPlayer ? 'text-[#C6FF00]' : 'text-white'
                  }`}
                >
                  {r.nome}
                </div>
                <div className="font-mono-num text-[11px] text-zinc-400 mb-2">
                  {formatRaceTime(r.finishTimeMs)}
                </div>
                <div
                  className={`w-full ${heightClass} rounded-t-xl border-t-2 flex flex-col items-center justify-center ${
                    isFirst
                      ? 'bg-[#1A2408] border-[#C6FF00]'
                      : 'bg-[#171820] border-white/25'
                  }`}
                >
                  <span
                    className={`font-display font-bold text-2xl ${
                      isFirst ? 'text-[#C6FF00]' : 'text-white'
                    }`}
                  >
                    {r.position}º
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Métricas do jogador */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-[#16171D] border border-white/10 rounded-xl p-3 text-center">
            <div className="text-[11px] text-zinc-400">Tempo Total</div>
            <div className="font-mono-num text-base sm:text-lg font-bold text-white mt-0.5">
              {formatRaceTime(playerRow?.finishTimeMs ?? hud.elapsedMs)}
            </div>
          </div>

          <div className="bg-[#16171D] border border-white/10 rounded-xl p-3 text-center">
            <div className="text-[11px] text-zinc-400">Melhor Tempo</div>
            <div className="font-mono-num text-base sm:text-lg font-bold text-[#C6FF00] mt-0.5">
              {bestTimeMs ? formatRaceTime(bestTimeMs) : formatRaceTime(hud.elapsedMs)}
            </div>
          </div>

          <div className="bg-[#16171D] border border-white/10 rounded-xl p-3 text-center">
            <div className="text-[11px] text-zinc-400">Moedas Ganhas</div>
            <div className="font-mono-num text-base sm:text-lg font-bold text-white mt-0.5 flex items-center justify-center gap-1">
              <Coins className="w-4 h-4 text-[#C6FF00]" aria-hidden="true" />+{hud.coinsInRace}
            </div>
          </div>
        </div>

        {/* Classificação completa */}
        <div className="mt-5 border-t border-white/10 pt-4 space-y-1.5">
          {hud.standings.map((row) => (
            <div
              key={row.id}
              className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
                row.isPlayer ? 'bg-[#171D10] text-[#C6FF00] font-semibold' : 'text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono-num w-6">{row.position}º</span>
                <span>{row.nome}</span>
              </div>
              <span className="font-mono-num text-xs">{formatRaceTime(row.finishTimeMs)}</span>
            </div>
          ))}
        </div>

        {/* Ações: Jogar novamente e Menu */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="py-3 px-5 rounded-xl bg-[#C6FF00] hover:bg-[#D5FF38] text-[#0A0A0A] font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Jogar novamente
          </button>

          <button
            type="button"
            onClick={onExitToMenu}
            className="py-3 px-5 rounded-xl bg-[#181920] hover:bg-[#22242E] border border-white/10 text-white font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
