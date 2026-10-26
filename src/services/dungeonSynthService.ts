// ============================================================================
// JOYFUL ANIME JRPG PROCEDURAL AUDIO ENGINE (100% INSTRUMENTAL / LYRICLESS)
// Inspired by Frieren: Beyond Journey's End, Genshin Impact, and Tales of Town Themes
// Multi-layer polyphonic sequencer with Celesta Arpeggios, Soaring Flute/Ocarina Lead,
// Warm Acoustic Bass, Light Percussion, plus zero-latency procedural anime SFX!
// ============================================================================

export type DungeonSynthMood =
  | 'oakhaven_breeze'
  | 'sylph_voyage'
  | 'radiant_vanguard'
  | 'dungeon_crypt'
  | 'arcane_sanctuary'
  | 'abyssal_rift';

export interface AnimeAudioPreset {
  id: DungeonSynthMood;
  name: string;
  tagline: string;
  description: string;
  bpm: number;
  filterCutoff: number;
  reverbSend: number;
  chords: {
    name: string;
    root: number;
    arpeggioNotes: number[];
    leadScale: number[];
  }[];
}

// Complete Equal Temperament Note Frequencies (Hz)
export const N = {
  // Octave 2
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, Bb2: 116.54, B2: 123.47,
  // Octave 3
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, Fs3: 185.00, G3: 196.00, A3: 220.00, Bb3: 233.08, B3: 246.94,
  // Octave 4
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, A4: 440.00, Bb4: 466.16, B4: 493.88,
  // Octave 5
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, A5: 880.00, Bb5: 932.33, B5: 987.77,
  // Octave 6
  C6: 1046.50, D6: 1174.66, E6: 1318.51, F6: 1396.91, Fs6: 1479.98, G6: 1567.98, A6: 1760.00, Bb6: 1864.66, B6: 1975.53,
};

export const ANIME_JRPG_PRESETS: Record<DungeonSynthMood, AnimeAudioPreset> = {
  oakhaven_breeze: {
    id: 'oakhaven_breeze',
    name: 'Oakhaven Breeze',
    tagline: 'Citadel Sanctuary • Sunny Town Theme',
    description: 'Breezy anime town theme with sparkling celesta arpeggios, warm walking bass, and sweet flute melody.',
    bpm: 126,
    filterCutoff: 3200,
    reverbSend: 0.35,
    // Japanese "Royal Road" IVmaj7 -> V6 -> iii7 -> vi9 (Fmaj7 -> G6 -> Em7 -> Am9)
    chords: [
      {
        name: 'Fmaj7',
        root: N.F2,
        arpeggioNotes: [N.F3, N.A3, N.C4, N.E4, N.A4, N.C5, N.E5, N.A5],
        leadScale: [N.A4, N.C5, N.D5, N.E5, N.G5, N.A5],
      },
      {
        name: 'G6',
        root: N.G2,
        arpeggioNotes: [N.G3, N.B3, N.D4, N.E4, N.G4, N.B4, N.D5, N.G5],
        leadScale: [N.B4, N.D5, N.E5, N.G5, N.A5, N.B5],
      },
      {
        name: 'Em7',
        root: N.E2,
        arpeggioNotes: [N.E3, N.G3, N.B3, N.D4, N.G4, N.B4, N.D5, N.E5],
        leadScale: [N.G4, N.B4, N.D5, N.E5, N.G5, N.A5],
      },
      {
        name: 'Am9',
        root: N.A2,
        arpeggioNotes: [N.A3, N.C4, N.E4, N.G4, N.B4, N.C5, N.E5, N.G5],
        leadScale: [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6],
      },
    ],
  },
  sylph_voyage: {
    id: 'sylph_voyage',
    name: 'Sylph Sky-Voyage',
    tagline: 'Floating Expanse • Uplifting Adventure Theme',
    description: 'Whimsical high-spirited JRPG adventure theme with sparkling chimes, joyful syncopation, and soaring pastoral winds.',
    bpm: 132,
    filterCutoff: 3800,
    reverbSend: 0.45,
    // Cmaj7 -> D9 -> Bm7 -> Em7 (Lydian / Major Pentatonic Sky-Theme)
    chords: [
      {
        name: 'Cmaj7',
        root: N.C3,
        arpeggioNotes: [N.C4, N.E4, N.G4, N.B4, N.E5, N.G5, N.B5, N.C6],
        leadScale: [N.E5, N.G5, N.A5, N.B5, N.C6, N.D6],
      },
      {
        name: 'D9',
        root: N.D3,
        arpeggioNotes: [N.D4, N.Fs4, N.A4, N.C5, N.E5, N.Fs5, N.A5, N.D6],
        leadScale: [N.Fs5, N.A5, N.B5, N.D6, N.E6, N.Fs6],
      },
      {
        name: 'Bm7',
        root: N.B2,
        arpeggioNotes: [N.B3, N.D4, N.Fs4, N.A4, N.D5, N.Fs5, N.A5, N.B5],
        leadScale: [N.D5, N.Fs5, N.A5, N.B5, N.D6, N.E6],
      },
      {
        name: 'Em7',
        root: N.E3,
        arpeggioNotes: [N.E4, N.G4, N.B4, N.D5, N.G5, N.B5, N.D6, N.E6],
        leadScale: [N.E5, N.G5, N.A5, N.B5, N.D6, N.E6],
      },
    ],
  },
  radiant_vanguard: {
    id: 'radiant_vanguard',
    name: 'Radiant Vanguard',
    tagline: 'Abyss & World Bosses • Heroic Anime Battle',
    description: 'High-energy, heroic battle theme with rapid 16th-note arpeggios, driving punchy bass, and triumphant melodic leaps.',
    bpm: 148,
    filterCutoff: 4500,
    reverbSend: 0.3,
    // Dm -> Bbmaj7 -> C -> Am (Energetic driving anime battle loop)
    chords: [
      {
        name: 'Dm',
        root: N.D3,
        arpeggioNotes: [N.D4, N.F4, N.A4, N.D5, N.F5, N.A5, N.D6, N.F6],
        leadScale: [N.F5, N.G5, N.A5, N.C6, N.D6, N.E6],
      },
      {
        name: 'Bbmaj7',
        root: N.Bb2,
        arpeggioNotes: [N.Bb3, N.D4, N.F4, N.A4, N.D5, N.F5, N.A5, N.Bb5],
        leadScale: [N.D5, N.F5, N.G5, N.A5, N.Bb5, N.D6],
      },
      {
        name: 'C',
        root: N.C3,
        arpeggioNotes: [N.C4, N.E4, N.G4, N.C5, N.E5, N.G5, N.C6, N.E6],
        leadScale: [N.E5, N.G5, N.A5, N.C6, N.D6, N.E6],
      },
      {
        name: 'Am',
        root: N.A2,
        arpeggioNotes: [N.A3, N.C4, N.E4, N.A4, N.C5, N.E5, N.A5, N.C6],
        leadScale: [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6],
      },
    ],
  },
  dungeon_crypt: null as any,
  arcane_sanctuary: null as any,
  abyssal_rift: null as any,
};

ANIME_JRPG_PRESETS.dungeon_crypt = ANIME_JRPG_PRESETS.oakhaven_breeze;
ANIME_JRPG_PRESETS.arcane_sanctuary = ANIME_JRPG_PRESETS.sylph_voyage;
ANIME_JRPG_PRESETS.abyssal_rift = ANIME_JRPG_PRESETS.radiant_vanguard;

export const SYNTH_PRESETS = ANIME_JRPG_PRESETS;

export class DungeonSynth {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;

  // SFX Gain Node
  private sfxGain: GainNode | null = null;
  private sfxMuted: boolean = false;
  private sfxVolume: number = 0.55;

  // Sequencer State
  private currentMood: DungeonSynthMood = 'oakhaven_breeze';
  private currentChordIndex: number = 0;
  private currentStep: number = 0;
  private currentBar: number = 0;
  private stepTimer: ReturnType<typeof setInterval> | null = null;
  private volume: number = 0.28;
  private onStateChangeListeners: Array<(isPlaying: boolean, currentMood: DungeonSynthMood) => void> = [];

  constructor() {
    // AudioContext is NEVER initialized in constructor to avoid browser autoplay policy warnings
  }

  public subscribe(listener: (isPlaying: boolean, currentMood: DungeonSynthMood) => void): () => void {
    this.onStateChangeListeners.push(listener);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        this.onStateChangeListeners.forEach((l) => {
          try {
            l(this.isPlaying, this.currentMood);
          } catch {
            // ignore
          }
        });
      });
    } else {
      setTimeout(() => {
        this.onStateChangeListeners.forEach((l) => {
          try {
            l(this.isPlaying, this.currentMood);
          } catch {
            // ignore
          }
        });
      }, 0);
    }
  }

  public ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public start(mood?: DungeonSynthMood) {
    if (mood) {
      this.currentMood = mood;
    }
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    if (this.isPlaying) {
      this.notifyListeners();
      return;
    }

    try {
      this.isPlaying = true;
      const now = ctx.currentTime;
      const preset = ANIME_JRPG_PRESETS[this.currentMood] || ANIME_JRPG_PRESETS.oakhaven_breeze;

      // 1. Master Output Chain
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, now);

      // 2. Dynamics Compressor for warm broadcast-ready sound
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, now);
      this.compressor.knee.setValueAtTime(30, now);
      this.compressor.ratio.setValueAtTime(12, now);
      this.compressor.attack.setValueAtTime(0.003, now);
      this.compressor.release.setValueAtTime(0.25, now);

      // 3. Master Warm Lowpass Filter
      this.masterFilter = ctx.createBiquadFilter();
      this.masterFilter.type = 'lowpass';
      this.masterFilter.frequency.setValueAtTime(preset.filterCutoff, now);
      this.masterFilter.Q.setValueAtTime(1.2, now);

      // 4. Stereo Ping-Pong / Echo Delay Network
      this.delayNode = ctx.createDelay();
      this.delayNode.delayTime.setValueAtTime(0.24, now);
      this.delayGain = ctx.createGain();
      this.delayGain.gain.setValueAtTime(preset.reverbSend, now);

      this.masterFilter.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);

      this.delayNode.connect(this.delayGain);
      this.delayGain.connect(this.delayNode);
      this.delayGain.connect(this.masterFilter);

      // 5. Start Sequencer Clock
      this.startSequencerClock(preset.bpm);
      this.notifyListeners();
    } catch {
      this.isPlaying = false;
      this.notifyListeners();
    }
  }

  private startSequencerClock(bpm: number) {
    if (this.stepTimer) {
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }

    const intervalMs = (60000 / bpm) / 4;
    this.currentStep = 0;
    this.currentBar = 0;
    this.currentChordIndex = 0;

    this.stepTimer = setInterval(() => {
      if (!this.isPlaying || !this.audioCtx) return;
      this.tickSequencerStep();
    }, intervalMs);
  }

  private tickSequencerStep() {
    if (!this.audioCtx || !this.masterFilter) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const preset = ANIME_JRPG_PRESETS[this.currentMood] || ANIME_JRPG_PRESETS.oakhaven_breeze;
    const activeChord = preset.chords[this.currentChordIndex % preset.chords.length];

    const step = this.currentStep;

    // VOICE 3: WARM PIZZICATO / ACOUSTIC BASS
    if (step === 0 || step === 8 || step === 12) {
      const rootFreq = activeChord.root;
      const freq = step === 12 ? rootFreq * 1.5 : (step === 8 ? rootFreq * 1.0 : rootFreq);
      this.playBassNote(ctx, now, freq);
    }

    // VOICE 1: CRYSTAL CELESTA / HARP ARPEGGIATOR
    if (activeChord.arpeggioNotes.length > 0) {
      const arpNotes = activeChord.arpeggioNotes;
      const arpIndex = step < 8 ? step % arpNotes.length : (15 - step) % arpNotes.length;
      const noteFreq = arpNotes[arpIndex];
      const vel = step % 4 === 0 ? 0.38 : (step % 2 === 0 ? 0.24 : 0.16);
      this.playCelestaNote(ctx, now, noteFreq, vel);
    }

    // VOICE 2: SOARING ANIME FLUTE / OCARINA LEAD
    const leadSteps = [0, 3, 6, 8, 11, 14];
    if (leadSteps.includes(step) && activeChord.leadScale.length > 0) {
      const scale = activeChord.leadScale;
      const noteIdx = (this.currentBar * 2 + Math.floor(step / 3)) % scale.length;
      const pitch = scale[noteIdx];
      const duration = (60 / preset.bpm) * (step === 0 ? 0.75 : 0.45);
      this.playFluteNote(ctx, now, pitch, duration);
    }

    // VOICE 4: LIGHT WOODBLOCK & SHAKER GROOVE
    if (step === 4 || step === 12) {
      this.playWoodblock(ctx, now);
    }
    if (step % 2 === 1) {
      this.playShaker(ctx, now, step % 4 === 3 ? 0.12 : 0.07);
    }

    this.currentStep = (this.currentStep + 1) % 16;
    if (this.currentStep === 0) {
      this.currentBar = (this.currentBar + 1) % 4;
      this.currentChordIndex = (this.currentChordIndex + 1) % preset.chords.length;
    }
  }

  private playCelestaNote(ctx: AudioContext, time: number, freq: number, velocity: number) {
    if (!this.masterFilter) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(velocity * 0.4, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterFilter);
    if (this.delayNode) gain.connect(this.delayNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.48);
    osc2.stop(time + 0.48);
  }

  private playFluteNote(ctx: AudioContext, time: number, freq: number, duration: number) {
    if (!this.masterFilter) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();

    vibrato.frequency.setValueAtTime(5.5, time);
    vibratoGain.gain.setValueAtTime(0, time);
    vibratoGain.gain.linearRampToValueAtTime(freq * 0.015, time + 0.12);

    vibrato.connect(osc.frequency);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, time);
    filter.Q.setValueAtTime(2.2, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.28, time + 0.04);
    gain.gain.setValueAtTime(0.26, time + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterFilter);
    if (this.delayNode) gain.connect(this.delayNode);

    vibrato.start(time);
    osc.start(time);
    vibrato.stop(time + duration + 0.05);
    osc.stop(time + duration + 0.05);
  }

  private playBassNote(ctx: AudioContext, time: number, freq: number) {
    if (!this.masterFilter) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(580, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.45, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterFilter);

    osc.start(time);
    osc.stop(time + 0.35);
  }

  private playWoodblock(ctx: AudioContext, time: number) {
    if (!this.masterFilter) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(840, time);
    osc.frequency.exponentialRampToValueAtTime(280, time + 0.035);

    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.masterFilter);

    osc.start(time);
    osc.stop(time + 0.045);
  }

  private playShaker(ctx: AudioContext, time: number, vol: number) {
    if (!this.masterFilter) return;
    const bufferSize = Math.floor(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.028);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterFilter);

    noise.start(time);
    noise.stop(time + 0.03);
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.stepTimer) {
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }

    if (this.masterGain && this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.3);
      } catch {
        // Safe ramp down
      }
    }

    setTimeout(() => {
      this.masterGain = null;
      this.compressor = null;
      this.masterFilter = null;
      this.delayNode = null;
      this.delayGain = null;
      this.notifyListeners();
    }, 350);
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public setMood(mood: DungeonSynthMood) {
    this.currentMood = mood;
    const preset = ANIME_JRPG_PRESETS[mood] || ANIME_JRPG_PRESETS.oakhaven_breeze;

    if (this.isPlaying) {
      this.startSequencerClock(preset.bpm);
      if (this.audioCtx && this.masterFilter) {
        this.masterFilter.frequency.setValueAtTime(preset.filterCutoff, this.audioCtx.currentTime);
      }
      if (this.audioCtx && this.delayGain) {
        this.delayGain.gain.setValueAtTime(preset.reverbSend, this.audioCtx.currentTime);
      }
    }
    this.notifyListeners();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentMood(): DungeonSynthMood {
    return this.currentMood;
  }

  public getVolume(): number {
    return this.volume;
  }

  // ============================================================================
  // PROCEDURAL ANIME JRPG SOUND EFFECTS (SFX) ENGINE
  // ============================================================================
  private getSfxContext(): { ctx: AudioContext; now: number } | null {
    if (this.sfxMuted) return null;
    const ctx = this.ensureAudioContext();
    if (!ctx) return null;
    return { ctx, now: ctx.currentTime };
  }

  public setSfxMuted(muted: boolean) {
    this.sfxMuted = muted;
  }

  public getSfxMuted(): boolean {
    return this.sfxMuted;
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Crisp, airy crystalline celesta micro-chime (C6 -> G6, 35ms decay)
   */
  public playUiClick() {
    const sfx = this.getSfxContext();
    if (!sfx) return;
    const { ctx, now } = sfx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(N.C6, now);
    osc.frequency.exponentialRampToValueAtTime(N.G6, now + 0.035);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18 * this.sfxVolume, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * Crisp airy celesta tab switch (G5 -> C6 chime)
   */
  public playTabSwitch() {
    const sfx = this.getSfxContext();
    if (!sfx) return;
    const { ctx, now } = sfx;

    [N.G5, N.C6].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.03);
      gain.gain.linearRampToValueAtTime(0.22 * this.sfxVolume, now + idx * 0.03 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.03 + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.085);
    });
  }

  /**
   * Bright ascending anime pentatonic harp glissando (F5 -> A5 -> C6 -> D6 -> F6, 120ms arpeggio)
   */
  public playLevelUpOrStatAllocate() {
    const sfx = this.getSfxContext();
    if (!sfx) return;
    const { ctx, now } = sfx;

    const notes = [N.F5, N.A5, N.C6, N.D6, N.F6];
    notes.forEach((freq, i) => {
      const t = now + i * 0.024;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, t);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.28 * this.sfxVolume, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.36);
      osc2.stop(t + 0.36);
    });
  }

  /**
   * Dual-operator FM harmonic metallic ping (784Hz + 2352Hz with highpass noise burst)
   */
  public playForgeAnvilStrike() {
    const sfx = this.getSfxContext();
    if (!sfx) return;
    const { ctx, now } = sfx;

    // Carrier & Modulator (784Hz G5 + 2352Hz 3x Harmonic)
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const masterGain = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(784, now);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(2352, now);
    modGain.gain.setValueAtTime(520, now);
    modGain.gain.exponentialRampToValueAtTime(10, now + 0.35);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.4 * this.sfxVolume, now + 0.004);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    carrier.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Spark burst (high-pass noise)
    const bufferSize = Math.floor(ctx.sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4000, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    modulator.start(now);
    carrier.start(now);
    noise.start(now);
    modulator.stop(now + 0.58);
    carrier.stop(now + 0.58);
    noise.stop(now + 0.045);
  }

  /**
   * Deep celestial sub-sweep (110Hz -> 440Hz) with sparkling high chimes
   */
  public playRuneSocket() {
    const sfx = this.getSfxContext();
    if (!sfx) return;
    const { ctx, now } = sfx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.28);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.35 * this.sfxVolume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.48);

    // High sparkling chime
    setTimeout(() => {
      this.playLevelUpOrStatAllocate();
    }, 180);
  }

  public playPortalActivate() {
    this.playRuneSocket();
  }

  /**
   * Crisp anime blade slash/impact synth
   */
  public playCombatHit(isCrit: boolean = false) {
    const sfx = this.getSfxContext();
    if (!sfx) return;
    const { ctx, now } = sfx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isCrit ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 920 : 540, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime((isCrit ? 0.38 : 0.24) * this.sfxVolume, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.095);
  }

  /**
   * Warm harmonic barrier hum for sanctuary or aegis shield
   */
  public playAegisShield() {
    const sfx = this.getSfxContext();
    if (!sfx) return;
    const { ctx, now } = sfx;

    [220, 440, 660].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18 * this.sfxVolume, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.58);
    });
  }
}

export const dungeonSynth = new DungeonSynth();
export default dungeonSynth;
