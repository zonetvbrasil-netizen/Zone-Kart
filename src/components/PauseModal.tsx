import { Play, RotateCcw, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onExitToMenu: () => void;
}

export function PauseModal({ onResume, onRestart, onExitToMenu }: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="w-full max-w-sm bg-[#0F1014] border border-[#C6FF00]/45 rounded-2xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.9)]">
        <h2 id="pause-title" className="font-display text-2xl font-bold text-white text-center">
          Jogo Pausado
        </h2>
        <p className="text-sm text-zinc-400 text-center mt-1">
          Pressione ESC ou P para continuar na pista.
        </p>

        <div className="flex flex-col gap-3 mt-6">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-5 rounded-xl bg-[#C6FF00] hover:bg-[#D5FF38] text-[#0A0A0A] font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            Continuar
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-5 rounded-xl bg-[#181920] hover:bg-[#22242E] border border-white/10 text-white font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#C6FF00]" aria-hidden="true" />
            Reiniciar Corrida
          </button>

          <button
            type="button"
            onClick={onExitToMenu}
            className="w-full py-3 px-5 rounded-xl bg-[#181920] hover:bg-[#22242E] border border-white/10 text-zinc-300 hover:text-white font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Voltar ao Menu
          </button>
        </div>
      </div>
    </div>
  );
}
