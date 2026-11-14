/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterModal } from './components/CharacterModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { PauseModal } from './components/PauseModal';
import { RaceHUD } from './components/RaceHUD';
import { ResultsModal } from './components/ResultsModal';
import { TitleScreen } from './components/TitleScreen';
import { TrackModal } from './components/TrackModal';
import { ZoneAudioEngine } from './game/audio';
import {
  CONFIG_JOGO,
  DriverId,
  GameState,
  PISTAS_META,
  SKINS_KART,
  SkinId,
  TrackId,
} from './game/config';
import { HudSnapshot, RaceEngine } from './game/RaceEngine';
import { KartInputState, loadProgress, PersistedProgress, saveProgress } from './game/rules';

const INITIAL_HUD: HudSnapshot = {
  gameState: 'title',
  countdownText: '',
  position: 6,
  totalRacers: 6,
  lap: 1,
  totalLaps: CONFIG_JOGO.numeroVoltas,
  speedKmh: 0,
  elapsedMs: 0,
  item: null,
  driftChargeRatio: 0,
  shieldActive: false,
  boostActive: false,
  coinsInRace: 0,
  bannerText: '',
  minimapRacers: [],
  minimapTrack: [],
  standings: [],
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RaceEngine | null>(null);
  const audioRef = useRef<ZoneAudioEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [selectedDriver, setSelectedDriver] = useState<DriverId>('zone');
  const [selectedTrack, setSelectedTrack] = useState<TrackId>('zone_circuit');
  const [selectedSkin, setSelectedSkin] = useState<SkinId>('padrao');
  const [activeModal, setActiveModal] = useState<'none' | 'characters' | 'tracks' | 'help'>('none');
  const [isMuted, setIsMuted] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [progress, setProgress] = useState<PersistedProgress>(() => loadProgress());
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(false);

  const selectedTrackRef = useRef(selectedTrack);
  selectedTrackRef.current = selectedTrack;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const activeModalRef = useRef(activeModal);
  activeModalRef.current = activeModal;

  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Detectar dispositivo com toque ou viewport estreita
  useEffect(() => {
    const checkTouch = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches;
      setShowTouchControls(Boolean(coarse || window.innerWidth < 768));
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const handleRaceFinish = useCallback((finalSnap: HudSnapshot) => {
    const trackKey = selectedTrackRef.current;
    const playerRow = finalSnap.standings.find((r) => r.isPlayer);
    const finishMs = playerRow?.finishTimeMs ?? finalSnap.elapsedMs;

    setProgress((prev) => {
      const prevBest = prev.melhoresTempos[trackKey];
      const beatRecord = !prevBest || finishMs < prevBest;
      setIsNewRecord(beatRecord);

      const updated: PersistedProgress = {
        moedas: prev.moedas + finalSnap.coinsInRace,
        skinsDesbloqueadas: prev.skinsDesbloqueadas,
        melhoresTempos: {
          ...prev.melhoresTempos,
          [trackKey]: beatRecord ? finishMs : prevBest,
        },
      };
      saveProgress(updated);
      return updated;
    });
    setGameState('gameover');
  }, []);

  // Inicializar WebGL + RaceEngine uma única vez
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const audio = new ZoneAudioEngine();
    audioRef.current = audio;

    const engine = new RaceEngine({
      container,
      audio,
      initialDriver: 'zone',
      initialTrack: 'zone_circuit',
      initialSkin: 'padrao',
      onHudUpdate: (snap) => setHud(snap),
      onRaceFinish: handleRaceFinish,
    });
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setGameState('playing');
      document.body.dataset.state = 'playing';
      engine.startRace();
    }

    return () => {
      engine.dispose();
      audio.dispose();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, [handleRaceFinish]);

  const startRace = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setActiveModal('none');
    setIsNewRecord(false);
    setGameState('playing');
    document.body.dataset.state = 'playing';
    engineRef.current?.startRace();
  }, []);

  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      setGameState('paused');
      engineRef.current?.setPaused(true);
    } else if (gameStateRef.current === 'paused') {
      setGameState('playing');
      engineRef.current?.setPaused(false);
    }
  }, []);

  const exitToMenu = useCallback(() => {
    setGameState('title');
    document.body.dataset.state = 'title';
    engineRef.current?.returnToTitle();
  }, []);

  const toggleMute = useCallback(() => {
    audioRef.current?.unlock();
    setIsMuted((prev) => {
      const next = !prev;
      audioRef.current?.setMuted(next);
      return next;
    });
  }, []);

  // Controles de teclado globais em window
  useEffect(() => {
    const syncKey = (code: string, key: string, pressed: boolean) => {
      const eng = engineRef.current;
      if (!eng) return;

      const k = key.toLowerCase();
      if (code === 'ArrowUp' || k === 'w') eng.setInputState({ accelerate: pressed });
      if (code === 'ArrowDown' || k === 's') eng.setInputState({ brake: pressed });
      if (code === 'ArrowLeft' || k === 'a') eng.setInputState({ left: pressed });
      if (code === 'ArrowRight' || k === 'd') eng.setInputState({ right: pressed });
      if (code === 'Space') eng.setInputState({ drift: pressed });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      audioRef.current?.unlock();
      const state = gameStateRef.current;

      if (state === 'title' && activeModalRef.current === 'none') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startRace();
          return;
        }
      }

      if (e.code === 'Escape' || e.key.toLowerCase() === 'p') {
        if (activeModalRef.current !== 'none') {
          setActiveModal('none');
          return;
        }
        if (state === 'playing' || state === 'paused') {
          e.preventDefault();
          togglePause();
          return;
        }
      }

      if (e.key.toLowerCase() === 'm') {
        toggleMute();
        return;
      }

      if (state === 'playing') {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
          e.preventDefault();
        }
        if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) {
          engineRef.current?.triggerPlayerItem();
        }
        syncKey(e.code, e.key, true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      syncKey(e.code, e.key, false);
    };

    const onBlurOrHide = () => {
      engineRef.current?.clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlurOrHide);
    document.addEventListener('visibilitychange', onBlurOrHide);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlurOrHide);
      document.removeEventListener('visibilitychange', onBlurOrHide);
    };
  }, [startRace, toggleMute, togglePause]);

  const handleSelectDriver = (id: DriverId) => {
    setSelectedDriver(id);
    engineRef.current?.setDriver(id);
  };

  const handleSelectTrack = (id: TrackId) => {
    setSelectedTrack(id);
    engineRef.current?.setTrack(id);
  };

  const handleSelectOrUnlockSkin = (skinId: SkinId) => {
    const skin = SKINS_KART.find((s) => s.id === skinId);
    if (!skin) return;

    if (progress.skinsDesbloqueadas.includes(skinId)) {
      setSelectedSkin(skinId);
      engineRef.current?.setSkin(skinId);
      return;
    }

    if (progress.moedas >= skin.custoMoedas) {
      const updated: PersistedProgress = {
        ...progress,
        moedas: progress.moedas - skin.custoMoedas,
        skinsDesbloqueadas: [...progress.skinsDesbloqueadas, skinId],
      };
      setProgress(updated);
      saveProgress(updated);
      setSelectedSkin(skinId);
      engineRef.current?.setSkin(skinId);
    }
  };

  const handleTouchInput = useCallback((partial: Partial<KartInputState>) => {
    audioRef.current?.unlock();
    engineRef.current?.setInputState(partial);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0A0A0A]">
      {/* Contêiner isolado do WebGL Three.js */}
      <div
        ref={canvasMountRef}
        data-testid="race-canvas-container"
        className="absolute inset-0 w-full h-full"
      />

      {/* Tela Inicial */}
      {gameState === 'title' && (
        <TitleScreen
          selectedDriver={selectedDriver}
          selectedTrack={selectedTrack}
          selectedSkin={selectedSkin}
          totalCoins={progress.moedas}
          bestTimeMs={progress.melhoresTempos[selectedTrack]}
          isMuted={isMuted}
          onStartRace={startRace}
          onOpenCharacters={() => setActiveModal('characters')}
          onOpenTracks={() => setActiveModal('tracks')}
          onOpenHelp={() => setActiveModal('help')}
          onToggleMute={toggleMute}
        />
      )}

      {/* Modais da Tela Inicial */}
      {gameState === 'title' && activeModal === 'characters' && (
        <CharacterModal
          selectedDriver={selectedDriver}
          selectedSkin={selectedSkin}
          unlockedSkins={progress.skinsDesbloqueadas}
          totalCoins={progress.moedas}
          onSelectDriver={handleSelectDriver}
          onSelectOrUnlockSkin={handleSelectOrUnlockSkin}
          onClose={() => setActiveModal('none')}
        />
      )}

      {gameState === 'title' && activeModal === 'tracks' && (
        <TrackModal
          selectedTrack={selectedTrack}
          bestTimes={progress.melhoresTempos}
          onSelectTrack={handleSelectTrack}
          onClose={() => setActiveModal('none')}
        />
      )}

      {gameState === 'title' && activeModal === 'help' && (
        <HowToPlayModal onClose={() => setActiveModal('none')} />
      )}

      {/* HUD durante a Corrida */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <RaceHUD
          hud={hud}
          isMuted={isMuted}
          showTouchControls={showTouchControls}
          onToggleMute={toggleMute}
          onPause={togglePause}
          onUseItem={() => engineRef.current?.triggerPlayerItem()}
          onTouchInput={handleTouchInput}
        />
      )}

      {/* Modal de Pausa */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={togglePause}
          onRestart={startRace}
          onExitToMenu={exitToMenu}
        />
      )}

      {/* Tela de Resultado com Pódio */}
      {gameState === 'gameover' && (
        <ResultsModal
          hud={hud}
          trackName={PISTAS_META[selectedTrack].nome}
          isNewRecord={isNewRecord}
          bestTimeMs={progress.melhoresTempos[selectedTrack]}
          onPlayAgain={startRace}
          onExitToMenu={exitToMenu}
        />
      )}
    </div>
  );
}
