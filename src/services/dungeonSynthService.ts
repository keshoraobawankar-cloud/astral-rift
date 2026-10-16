// Procedural Dungeon Synth Ambient Generator using Web Audio API
// Synthesizes atmospheric, analog-style fantasy dungeon synth with zero external audio assets.
// Features: Modal chord progressions, detuned analog oscillators, resonant lowpass filter,
// deep sub-drone, subtle LFO analog drift, and multiple realm mood presets.

export type DungeonSynthMood = 'dungeon_crypt' | 'arcane_sanctuary' | 'abyssal_rift';

export interface DungeonSynthPreset {
  id: DungeonSynthMood;
  name: string;
  description: string;
  filterCutoff: number; // Hz
  filterQ: number;
  droneOctaveMultiplier: number;
  chordIntervalSeconds: number;
  scaleFrequencies: number[];
  chords: number[][];
}

export const SYNTH_PRESETS: Record<DungeonSynthMood, DungeonSynthPreset> = {
  dungeon_crypt: {
    id: 'dungeon_crypt',
    name: 'Dungeon Crypt (D Minor)',
    description: 'Dark, muffled stone cave acoustics with slow Dorian modal chord progressions.',
    filterCutoff: 580,
    filterQ: 3.2,
    droneOctaveMultiplier: 1.0,
    chordIntervalSeconds: 8,
    // D Minor / Dorian: D3, F3, G3, A3, C4, D4, F4
    scaleFrequencies: [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23],
    chords: [
      [0, 2, 4], // Dm (D3, A3, C4)
      [1, 3, 5], // F/Gm modal shift
      [2, 4, 6], // F major triad
      [3, 5, 0], // Am triad
    ],
  },
  arcane_sanctuary: {
    id: 'arcane_sanctuary',
    name: 'Arcane Sanctuary (E Dorian)',
    description: 'Ethereal, warm analog shimmer resonating through ancient crystal halls.',
    filterCutoff: 820,
    filterQ: 2.6,
    droneOctaveMultiplier: 1.25,
    chordIntervalSeconds: 9,
    // E Dorian: E3, G3, A3, B3, D4, E4, G4
    scaleFrequencies: [164.81, 196.0, 220.0, 246.94, 293.66, 329.63, 392.0],
    chords: [
      [0, 2, 4], // Em7
      [2, 4, 6], // Asus
      [1, 3, 5], // G Maj
      [3, 5, 1], // Bm
    ],
  },
  abyssal_rift: {
    id: 'abyssal_rift',
    name: 'Abyssal Rift (C Phrygian)',
    description: 'Subterranean sub-bass rumble and tense, dissonant cosmic undertones.',
    filterCutoff: 420,
    filterQ: 4.0,
    droneOctaveMultiplier: 0.75,
    chordIntervalSeconds: 10,
    // C Phrygian: C3, Db3, Eb3, F3, G3, Ab3, Bb3
    scaleFrequencies: [130.81, 138.59, 155.56, 174.61, 196.0, 207.65, 233.08],
    chords: [
      [0, 2, 4], // Cm triad
      [0, 1, 4], // Phrygian tension (C, Db, G)
      [3, 5, 0], // Fm triad
      [1, 4, 6], // Db tension
    ],
  },
};

export class DungeonSynth {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private lfoNode: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGains: GainNode[] = [];
  private timerId: ReturnType<typeof setInterval> | null = null;

  private currentMood: DungeonSynthMood = 'dungeon_crypt';
  private currentChordIndex: number = 0;
  private volume: number = 0.22; // Gentle default ambient level
  private onStateChangeListeners: Array<(isPlaying: boolean, currentMood: DungeonSynthMood) => void> = [];

  constructor() {
    // Lazy initialized on user action
  }

  public subscribe(listener: (isPlaying: boolean, currentMood: DungeonSynthMood) => void): () => void {
    this.onStateChangeListeners.push(listener);
    listener(this.isPlaying, this.currentMood);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.onStateChangeListeners.forEach((l) => l(this.isPlaying, this.currentMood));
  }

  private ensureAudioContext(): AudioContext | null {
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
      this.applyPresetParameters();
      return;
    }

    try {
      this.isPlaying = true;
      const now = ctx.currentTime;
      const preset = SYNTH_PRESETS[this.currentMood];

      // 1. Master Output Gain
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, now);

      // 2. Dungeon Low-Pass Resonant Filter
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(preset.filterCutoff, now);
      this.filterNode.Q.setValueAtTime(preset.filterQ, now);

      // 3. Gentle Analog Drift LFO (Modulates filter cutoff very slowly for breathing life)
      this.lfoNode = ctx.createOscillator();
      this.lfoGain = ctx.createGain();
      this.lfoNode.type = 'sine';
      this.lfoNode.frequency.setValueAtTime(0.08, now); // 0.08 Hz = ~12.5 second breath cycle
      this.lfoGain.gain.setValueAtTime(60, now); // ±60Hz subtle sweeping cutoff modulation
      this.lfoNode.connect(this.lfoGain);
      this.lfoGain.connect(this.filterNode.frequency);
      this.lfoNode.start(now);

      // Connect: Filter -> Master -> Speakers
      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);

      // 4. Start Continuous Deep Background Drone
      this.startBackgroundDrone();

      // 5. Start Chord Progression Loop
      this.currentChordIndex = 0;
      this.playNextChord();

      const intervalMs = preset.chordIntervalSeconds * 1000;
      this.timerId = setInterval(() => {
        if (this.isPlaying) {
          this.playNextChord();
        }
      }, intervalMs);

      this.notifyListeners();
      console.log(`[DungeonSynth] Soundtrack started (${preset.name})`);
    } catch (err) {
      console.warn('[DungeonSynth] Audio start failure:', err);
      this.isPlaying = false;
      this.notifyListeners();
    }
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    // Stop and cleanup active oscillators
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignored
      }
    });
    this.activeOscillators = [];
    this.activeGains = [];

    if (this.lfoNode) {
      try {
        this.lfoNode.stop();
        this.lfoNode.disconnect();
      } catch {
        // Ignored
      }
      this.lfoNode = null;
    }

    if (this.filterNode) {
      try {
        this.filterNode.disconnect();
      } catch {
        // Ignored
      }
      this.filterNode = null;
    }

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Ignored
      }
      this.masterGain = null;
    }

    this.notifyListeners();
    console.log('[DungeonSynth] Soundtrack stopped.');
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }

  public setMood(mood: DungeonSynthMood) {
    if (this.currentMood === mood) return;
    this.currentMood = mood;
    if (this.isPlaying) {
      // Re-trigger with new preset
      this.stop();
      this.start(mood);
    } else {
      this.notifyListeners();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentMood(): DungeonSynthMood {
    return this.currentMood;
  }

  private applyPresetParameters() {
    if (!this.audioCtx || !this.filterNode) return;
    const now = this.audioCtx.currentTime;
    const preset = SYNTH_PRESETS[this.currentMood];
    this.filterNode.frequency.linearRampToValueAtTime(preset.filterCutoff, now + 1.5);
    this.filterNode.Q.setValueAtTime(preset.filterQ, now);
  }

  // Synthesizes continuous warm analog drone layers
  private startBackgroundDrone() {
    if (!this.audioCtx || !this.filterNode) return;
    const now = this.audioCtx.currentTime;
    const preset = SYNTH_PRESETS[this.currentMood];
    const rootFreq = preset.scaleFrequencies[0] * preset.droneOctaveMultiplier;

    // 3 detuned analog layers: Sub-bass, root, and hollow fifth
    const droneLayers = [
      { freq: rootFreq * 0.5, type: 'triangle' as OscillatorType, vol: 0.18, detune: -4 },
      { freq: rootFreq, type: 'sawtooth' as OscillatorType, vol: 0.09, detune: 5 },
      { freq: rootFreq * 1.5, type: 'triangle' as OscillatorType, vol: 0.06, detune: 0 },
    ];

    droneLayers.forEach((layer) => {
      if (!this.audioCtx || !this.filterNode) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = layer.type;
      osc.frequency.setValueAtTime(layer.freq, now);
      osc.detune.setValueAtTime(layer.detune, now);

      // Very slow attack ramp to avoid clicks
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(layer.vol, now + 3.0);

      osc.connect(gain);
      gain.connect(this.filterNode);

      osc.start(now);
      this.activeOscillators.push(osc);
      this.activeGains.push(gain);
    });
  }

  // Plays slow, evolving synth pad chords with analog tape-like attack and release
  private playNextChord() {
    if (!this.isPlaying || !this.audioCtx || !this.filterNode) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const preset = SYNTH_PRESETS[this.currentMood];
    const chordIndices = preset.chords[this.currentChordIndex];
    this.currentChordIndex = (this.currentChordIndex + 1) % preset.chords.length;

    const chordDuration = preset.chordIntervalSeconds;

    chordIndices.forEach((scaleIndex, i) => {
      const freq = preset.scaleFrequencies[scaleIndex % preset.scaleFrequencies.length];
      if (!freq) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Alternate waveforms for thick vintage timbre
      osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq * 2, now); // Pad registers in mid-range (octave higher)

      // Slight natural chorusing / micro-detune (+/- 3 to 6 cents)
      const detuneCents = (i - 1) * 4;
      osc.detune.setValueAtTime(detuneCents, now);

      // Pad envelope: 2-3s fade-in, long sustained decay
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.065, now + 2.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + chordDuration - 0.2);

      osc.connect(gain);
      gain.connect(this.filterNode!);

      osc.start(now);
      osc.stop(now + chordDuration);

      this.activeOscillators.push(osc);
      this.activeGains.push(gain);

      // Auto-cleanup stopped oscillator from array after chord finishes
      setTimeout(() => {
        const index = this.activeOscillators.indexOf(osc);
        if (index !== -1) {
          this.activeOscillators.splice(index, 1);
        }
      }, chordDuration * 1000);
    });
  }
}

// Global Singleton Instance
export const dungeonSynth = new DungeonSynth();
