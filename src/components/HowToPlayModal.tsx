import { X } from 'lucide-react';
import { ITENS_INFO, ItemType } from '../game/config';
import { ItemIcon } from './ZoneIcons';

interface HowToPlayModalProps {
  onClose: () => void;
}

export function HowToPlayModal({ onClose }: HowToPlayModalProps) {
  const items: ItemType[] = ['turbo_z', 'missil_neon', 'oleo', 'escudo_zone'];

  return (
    <div
      className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0F1014] border border-[#C6FF00]/40 rounded-2xl p-5 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 id="help-modal-title" className="font-display text-2xl font-bold text-white">
              Como Jogar
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Domine o drift, pegue atalhos e use os itens na hora certa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar instruções"
            className="w-10 h-10 rounded-xl bg-[#181920] hover:bg-[#242630] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controles */}
        <div className="mt-5">
          <h3 className="font-display text-base font-bold text-[#C6FF00] mb-3">
            Controles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
            <div className="bg-[#16171D] border border-white/10 rounded-xl p-3 flex justify-between items-center gap-3">
              <span className="text-zinc-300">Acelerar / Frear</span>
              <span className="font-mono-num text-xs bg-[#0A0A0A] border border-white/15 px-2.5 py-1 rounded-lg text-white">
                W / S ou ↑ / ↓
              </span>
            </div>
            <div className="bg-[#16171D] border border-white/10 rounded-xl p-3 flex justify-between items-center gap-3">
              <span className="text-zinc-300">Virar o Kart</span>
              <span className="font-mono-num text-xs bg-[#0A0A0A] border border-white/15 px-2.5 py-1 rounded-lg text-white">
                A / D ou ← / →
              </span>
            </div>
            <div className="bg-[#16171D] border border-white/10 rounded-xl p-3 flex justify-between items-center gap-3">
              <span className="text-zinc-300">Drift + Mini-Turbo</span>
              <span className="font-mono-num text-xs bg-[#0A0A0A] border border-[#C6FF00]/40 px-2.5 py-1 rounded-lg text-[#C6FF00]">
                ESPAÇO (segurar e soltar)
              </span>
            </div>
            <div className="bg-[#16171D] border border-white/10 rounded-xl p-3 flex justify-between items-center gap-3">
              <span className="text-zinc-300">Usar Item / Pausar</span>
              <span className="font-mono-num text-xs bg-[#0A0A0A] border border-white/15 px-2.5 py-1 rounded-lg text-white">
                SHIFT / ESC
              </span>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-2.5">
            No celular ou tablet, os botões virtuais de direção, drift e item aparecem automaticamente na tela durante a corrida.
          </p>
        </div>

        {/* Itens */}
        <div className="mt-6">
          <h3 className="font-display text-base font-bold text-[#C6FF00] mb-3">
            Itens da Pista (Caixas ?)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((id) => {
              const info = ITENS_INFO[id];
              return (
                <div
                  key={id}
                  className="bg-[#16171D] border border-white/10 rounded-xl p-3.5 flex items-start gap-3"
                >
                  <ItemIcon item={id} size={40} />
                  <div>
                    <div className="font-display font-bold text-sm text-white">{info.nome}</div>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{info.descricao}</p>
                  </div>
                </div>
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
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
