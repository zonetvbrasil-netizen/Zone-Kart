import { Check, Coins, Lock, X } from 'lucide-react';
import { DriverId, PERSONAGENS, SKINS_KART, SkinId } from '../game/config';

interface CharacterModalProps {
  selectedDriver: DriverId;
  selectedSkin: SkinId;
  unlockedSkins: SkinId[];
  totalCoins: number;
  onSelectDriver: (id: DriverId) => void;
  onSelectOrUnlockSkin: (skinId: SkinId) => void;
  onClose: () => void;
}

export function CharacterModal({
  selectedDriver,
  selectedSkin,
  unlockedSkins,
  totalCoins,
  onSelectDriver,
  onSelectOrUnlockSkin,
  onClose,
}: CharacterModalProps) {
  const drivers = [PERSONAGENS.zone, PERSONAGENS.zonia];

  return (
    <div
      className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="char-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0F1014] border border-[#C6FF00]/40 rounded-2xl p-5 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 id="char-modal-title" className="font-display text-2xl font-bold text-white">
              Personagens e Skins
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Escolha seu piloto e desbloqueie pinturas neon com moedas da pista.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#181920] border border-[#C6FF00]/35 rounded-xl px-3 py-1.5 text-sm">
              <Coins className="w-4 h-4 text-[#C6FF00]" aria-hidden="true" />
              <span className="font-mono-num font-bold text-white">{totalCoins}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar seleção de personagens"
              className="w-10 h-10 rounded-xl bg-[#181920] hover:bg-[#242630] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Seleção de Piloto: Zone ou Zonia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {drivers.map((d) => {
            const active = selectedDriver === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelectDriver(d.id)}
                className={`text-left rounded-2xl p-4 border transition-all cursor-pointer flex gap-4 items-center ${
                  active
                    ? 'bg-[#171D10] border-[#C6FF00] shadow-[0_0_20px_rgba(198,255,0,0.18)]'
                    : 'bg-[#16171D] border-white/10 hover:border-white/30'
                }`}
              >
                <div className="w-24 h-28 rounded-xl bg-[#0A0A0A] border border-white/10 overflow-hidden shrink-0">
                  <img
                    src={d.imagem}
                    alt={d.nome}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-xl font-bold text-white">{d.nome}</span>
                    {active && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C6FF00]">
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        Selecionado
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#C6FF00] font-medium mt-0.5">{d.titulo}</div>
                  <p className="text-xs text-zinc-300 mt-2 leading-relaxed">{d.descricao}</p>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-2.5 font-mono-num">
                    <span>Vel {Math.round(d.bonusVelocidade * 100)}%</span>
                    <span>·</span>
                    <span>Turbo {Math.round(d.bonusTurbo * 100)}%</span>
                    <span>·</span>
                    <span>Drift {Math.round(d.bonusControle * 100)}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Skins de Kart desbloqueáveis por moedas */}
        <div className="mt-6">
          <h3 className="font-display text-base font-bold text-white mb-3">
            Skins do Kart (Desbloqueáveis com Moedas)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SKINS_KART.map((skin) => {
              const isUnlocked = unlockedSkins.includes(skin.id);
              const isActive = selectedSkin === skin.id;
              const canAfford = totalCoins >= skin.custoMoedas;

              return (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => onSelectOrUnlockSkin(skin.id)}
                  disabled={!isUnlocked && !canAfford}
                  className={`rounded-xl p-3.5 border text-left flex items-center justify-between gap-3 transition-colors ${
                    isActive
                      ? 'bg-[#171D10] border-[#C6FF00]'
                      : isUnlocked || canAfford
                      ? 'bg-[#16171D] border-white/10 hover:border-white/30 cursor-pointer'
                      : 'bg-[#121318] border-white/5 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg border-2 shrink-0"
                      style={{ backgroundColor: skin.corChassi, borderColor: skin.corNeon }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{skin.nome}</div>
                      <div className="text-xs text-zinc-400 truncate">{skin.subtitulo}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-xs font-semibold">
                    {isActive ? (
                      <span className="text-[#C6FF00]">Equipada</span>
                    ) : isUnlocked ? (
                      <span className="text-zinc-300">Usar</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#C6FF00] font-mono-num">
                        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                        {skin.custoMoedas}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#C6FF00] hover:bg-[#D5FF38] text-[#0A0A0A] font-display font-bold text-sm cursor-pointer"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
