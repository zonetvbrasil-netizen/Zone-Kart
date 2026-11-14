import { Volume2, VolumeX, Trophy, Users, Map as MapIcon, HelpCircle, Play, Coins } from 'lucide-react';
import { DriverId, PERSONAGENS, PISTAS_META, SKINS_KART, SkinId, TrackId } from '../game/config';
import { formatRaceTime } from '../game/rules';
import { ZoneLogo } from './ZoneIcons';

interface TitleScreenProps {
  selectedDriver: DriverId;
  selectedTrack: TrackId;
  selectedSkin: SkinId;
  totalCoins: number;
  bestTimeMs?: number;
  isMuted: boolean;
  onStartRace: () => void;
  onOpenCharacters: () => void;
  onOpenTracks: () => void;
  onOpenHelp: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({
  selectedDriver,
  selectedTrack,
  selectedSkin,
  totalCoins,
  bestTimeMs,
  isMuted,
  onStartRace,
  onOpenCharacters,
  onOpenTracks,
  onOpenHelp,
  onToggleMute,
}: TitleScreenProps) {
  const driver = PERSONAGENS[selectedDriver];
  const track = PISTAS_META[selectedTrack];
  const skin = SKINS_KART.find((s) => s.id === selectedSkin) ?? SKINS_KART[0];

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-5 sm:p-8">
      {/* Topo discreto com moedas e botão de áudio */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto bg-[#0A0A0A]/90 border border-[#C6FF00]/35 rounded-2xl px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.75)]">
          <ZoneLogo className="w-56 sm:w-72 h-auto" />
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0A0A0A]/90 border border-white/15 rounded-xl px-3.5 py-2 text-sm font-medium">
            <Coins className="w-4 h-4 text-[#C6FF00]" aria-hidden="true" />
            <span className="font-mono-num text-white font-bold">{totalCoins}</span>
            <span className="text-zinc-400 hidden sm:inline">Moedas</span>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Ativar som' : 'Silenciar som'}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#0A0A0A]/90 border border-white/15 text-white hover:border-[#C6FF00] hover:text-[#C6FF00] transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Região inferior esquerda ancorada sobre espaço negativo, deixando o kart 3D central livre */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="pointer-events-auto max-w-md w-full bg-[#0A0A0A]/92 border border-[#C6FF00]/30 rounded-2xl p-5 sm:p-6 shadow-[0_20px_48px_rgba(0,0,0,0.85)]">
          {/* Resumo ativo de piloto, kart e pista */}
          <div className="flex items-center gap-4 pb-4 mb-4 border-b border-white/10">
            <div className="w-14 h-14 rounded-xl bg-[#16161B] border border-[#C6FF00]/40 overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={driver.imagem}
                alt={driver.nome}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>Piloto: <strong className="text-white">{driver.nome}</strong></span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{skin.nome}</span>
              </div>
              <div className="font-display text-lg font-bold text-white truncate mt-0.5">
                {track.nome}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span>{track.tema}</span>
                {bestTimeMs ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-[#C6FF00] font-mono-num">
                      <Trophy className="w-3 h-3" aria-hidden="true" />
                      {formatRaceTime(bestTimeMs)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Botão principal Jogar */}
          <button
            type="button"
            data-start="true"
            onClick={onStartRace}
            className="w-full py-3.5 px-6 rounded-xl bg-[#C6FF00] hover:bg-[#D5FF38] active:scale-[0.99] text-[#0A0A0A] font-display font-bold text-xl tracking-wide flex items-center justify-center gap-2.5 shadow-[0_0_24px_rgba(198,255,0,0.35)] transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" aria-hidden="true" />
            Jogar
          </button>

          {/* Menu secundário: Personagens, Pistas, Como Jogar */}
          <div className="grid grid-cols-3 gap-2.5 mt-3">
            <button
              type="button"
              onClick={onOpenCharacters}
              className="py-2.5 px-3 rounded-xl bg-[#16161B] hover:bg-[#22222A] border border-white/10 hover:border-[#C6FF00]/60 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Users className="w-4 h-4 text-[#C6FF00] shrink-0" aria-hidden="true" />
              <span>Personagens</span>
            </button>

            <button
              type="button"
              onClick={onOpenTracks}
              className="py-2.5 px-3 rounded-xl bg-[#16161B] hover:bg-[#22222A] border border-white/10 hover:border-[#C6FF00]/60 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <MapIcon className="w-4 h-4 text-[#C6FF00] shrink-0" aria-hidden="true" />
              <span>Pistas</span>
            </button>

            <button
              type="button"
              onClick={onOpenHelp}
              className="py-2.5 px-3 rounded-xl bg-[#16161B] hover:bg-[#22222A] border border-white/10 hover:border-[#C6FF00]/60 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <HelpCircle className="w-4 h-4 text-[#C6FF00] shrink-0" aria-hidden="true" />
              <span>Como Jogar</span>
            </button>
          </div>
        </div>

        {/* Linha única de dica de controles na margem segura inferior */}
        <div className="hidden md:block bg-[#0A0A0A]/85 border border-white/10 rounded-xl px-4 py-2 text-xs text-zinc-300">
          WASD / Setas Dirigir · Espaço Drift (Mini-Turbo) · Shift Usar Item · Esc Pausar
        </div>
      </div>
    </div>
  );
}
