// ============================================================================
// MOTOR DE ÁUDIO PROCEDURAL (WEB AUDIO API) - ZONE PLAY KART 3D
// Gera música eletrônica, som de motor, derrapagem, turbo, itens e vitória.
// ============================================================================

export class ZoneAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  private driftNoiseNode: AudioBufferSourceNode | null = null;
  private driftFilter: BiquadFilterNode | null = null;
  private driftGain: GainNode | null = null;

  private musicTimer: number | null = null;
  private stepIndex = 0;
  private isMuted = false;
  private isRacing = false;
  private isPaused = false;

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.65;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.24;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.72;
      this.sfxGain.connect(this.masterGain);

      this.setupContinuousLoops();
      this.startMusicSequencer();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private setupContinuousLoops(): void {
    if (!this.ctx || !this.sfxGain) return;

    // Motor contínuo
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 65;

    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.value = 32.5;

    this.engineOsc.connect(filter);
    this.engineSubOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc.start();
    this.engineSubOsc.start();

    // Ruído de derrapagem (drift)
    const bufferSize = this.ctx.sampleRate * 1.5;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.driftNoiseNode = this.ctx.createBufferSource();
    this.driftNoiseNode.buffer = noiseBuffer;
    this.driftNoiseNode.loop = true;

    this.driftFilter = this.ctx.createBiquadFilter();
    this.driftFilter.type = 'bandpass';
    this.driftFilter.frequency.value = 1350;
    this.driftFilter.Q.value = 3.2;

    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.value = 0;

    this.driftNoiseNode.connect(this.driftFilter);
    this.driftFilter.connect(this.driftGain);
    this.driftGain.connect(this.sfxGain);
    this.driftNoiseNode.start();
  }

  private startMusicSequencer(): void {
    if (this.musicTimer !== null) return;

    // Progressão energética estilo synthwave arcade (Em - C - G - D)
    const bassNotes = [82.41, 82.41, 98.0, 82.41, 65.41, 65.41, 73.42, 98.0];
    const leadNotes = [329.63, 392.0, 493.88, 659.25, 523.25, 392.0, 587.33, 493.88];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.isMuted || this.isPaused) return;
      if (this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const step = this.stepIndex % 16;
      const phrase = Math.floor(step / 2) % bassNotes.length;

      // Baixo pulsante em colcheias
      const bass = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bass.type = 'sawtooth';
      const bFilter = this.ctx.createBiquadFilter();
      bFilter.type = 'lowpass';
      bFilter.frequency.setValueAtTime(this.isRacing ? 680 : 380, now);

      bass.frequency.setValueAtTime(bassNotes[phrase], now);
      bGain.gain.setValueAtTime(0.001, now);
      bGain.gain.exponentialRampToValueAtTime(this.isRacing ? 0.24 : 0.14, now + 0.015);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      bass.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(this.musicGain);
      bass.start(now);
      bass.stop(now + 0.16);

      // Arpejo lead energético durante a corrida
      if (this.isRacing && step % 2 === 0) {
        const lead = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        lead.type = 'square';
        const note = leadNotes[(step / 2) % leadNotes.length];
        lead.frequency.setValueAtTime(note, now);
        lGain.gain.setValueAtTime(0.001, now);
        lGain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
        lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

        lead.connect(lGain);
        lGain.connect(this.musicGain);
        lead.start(now);
        lead.stop(now + 0.14);
      }

      // Chimbal eletrônico sutil
      if (this.isRacing && step % 2 === 1) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(4200, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);
        g.gain.setValueAtTime(0.045, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc.connect(g);
        g.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.05);
      }

      this.stepIndex++;
    }, 155);
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.65, this.ctx.currentTime, 0.03);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setRaceActive(active: boolean, paused: boolean): void {
    this.isRacing = active;
    this.isPaused = paused;
    if ((!active || paused) && this.engineGain && this.driftGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.driftGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  public updateTelemetry(speedRatio: number, isDrifting: boolean, isBoosting: boolean): void {
    if (!this.ctx || !this.engineOsc || !this.engineSubOsc || !this.engineGain || !this.driftGain || !this.driftFilter) {
      return;
    }
    if (!this.isRacing || this.isPaused || this.isMuted || this.ctx.state !== 'running') {
      return;
    }

    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1.4, speedRatio));
    const baseFreq = 58 + clamped * 115 + (isBoosting ? 36 : 0);

    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
    this.engineGain.gain.setTargetAtTime(0.08 + clamped * 0.08, now, 0.05);

    if (isDrifting) {
      this.driftFilter.frequency.setTargetAtTime(1400 + clamped * 600, now, 0.04);
      this.driftGain.gain.setTargetAtTime(0.11, now, 0.03);
    } else {
      this.driftGain.gain.setTargetAtTime(0, now, 0.04);
    }
  }

  public playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'triangle',
    volume = 0.22
  ): void {
    if (!this.ctx || !this.sfxGain || this.isMuted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playCountdown(isGo: boolean): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (isGo) {
      this.playTone(587.33, 880, 0.35, 'sawtooth', 0.25);
    } else {
      this.playTone(440, 440, 0.16, 'triangle', 0.2);
    }
  }

  public playTurbo(): void {
    this.playTone(180, 720, 0.36, 'sawtooth', 0.24);
  }

  public playItemPickup(): void {
    this.playTone(523.25, 1046.5, 0.18, 'square', 0.16);
  }

  public playCoin(): void {
    const pitchJitter = 0.96 + Math.random() * 0.08;
    this.playTone(987.77 * pitchJitter, 1318.5 * pitchJitter, 0.13, 'sine', 0.18);
  }

  public playMissile(): void {
    this.playTone(760, 210, 0.28, 'sawtooth', 0.22);
  }

  public playHit(): void {
    this.playTone(190, 55, 0.32, 'sawtooth', 0.3);
  }

  public playShield(): void {
    this.playTone(320, 640, 0.25, 'sine', 0.2);
  }

  public playLap(): void {
    this.playTone(523.25, 659.25, 0.14, 'triangle', 0.2);
    window.setTimeout(() => this.playTone(659.25, 783.99, 0.22, 'triangle', 0.22), 110);
  }

  public playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      window.setTimeout(() => {
        this.playTone(n, n * 1.02, i === 3 ? 0.45 : 0.16, 'triangle', 0.24);
      }, i * 120);
    });
  }

  public dispose(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    try {
      this.engineOsc?.stop();
      this.engineSubOsc?.stop();
      this.driftNoiseNode?.stop();
      void this.ctx?.close();
    } catch {
      // ignora
    }
    this.ctx = null;
  }
}
