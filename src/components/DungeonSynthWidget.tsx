import React, { useState, useEffect } from 'react';
import { dungeonSynth, DungeonSynthMood, SYNTH_PRESETS } from '../services/dungeonSynthService';
import { Music, Volume2, VolumeX, Sparkles, ChevronDown, ChevronUp, Radio } from 'lucide-react';

interface DungeonSynthWidgetProps {
  compact?: boolean;
}

export const DungeonSynthWidget: React.FC<DungeonSynthWidgetProps> = ({ compact = false }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(dungeonSynth.getIsPlaying());
  const [currentMood, setCurrentMood] = useState<DungeonSynthMood>(dungeonSynth.getCurrentMood());
  const [volume, setVolume] = useState<number>(dungeonSynth.getVolume());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = dungeonSynth.subscribe((playing, mood) => {
      setIsPlaying(playing);
      setCurrentMood(mood);
    });
    return unsubscribe;
  }, []);

  const handleToggle = () => {
    dungeonSynth.toggle();
  };

  const handleSelectMood = (mood: DungeonSynthMood) => {
    dungeonSynth.setMood(mood);
    if (!isPlaying) {
      dungeonSynth.start(mood);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    dungeonSynth.setVolume(val);
  };

  const currentPreset = SYNTH_PRESETS[currentMood];

  if (compact) {
    return (
      <div className="relative inline-flex items-center">
        <button
          onClick={handleToggle}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-rpg font-bold border transition shadow-sm cursor-pointer ${
            isPlaying
              ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 shadow-amber-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title={isPlaying ? 'Dungeon Synth Playing: Click to Pause' : 'Start Procedural Dungeon Synth Soundtrack'}
        >
          <Music className={`w-3.5 h-3.5 ${isPlaying ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">
            {isPlaying ? 'SYNTH: ON' : 'DUNGEON SYNTH'}
          </span>
          {isPlaying && (
            <span className="flex gap-0.5 items-end h-3 ml-0.5">
              <span className="w-0.5 bg-amber-400 animate-[bounce_1.2s_infinite] h-2.5" />
              <span className="w-0.5 bg-amber-400 animate-[bounce_0.8s_infinite] h-3" />
              <span className="w-0.5 bg-amber-400 animate-[bounce_1.5s_infinite] h-1.5" />
            </span>
          )}
        </button>

        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="p-1 ml-1 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs"
          title="Synth Audio Settings"
        >
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Floating Mini Panel when expanded */}
        {isExpanded && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-slate-950/95 border border-amber-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-xl z-50 text-left font-sans">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="font-rpg font-bold text-xs text-amber-200">PROCEDURAL DUNGEON SYNTH</span>
              </div>
              <span className="text-[9px] font-mono bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                Web Audio
              </span>
            </div>

            <p className="text-[11px] text-slate-300 mb-2 font-mono leading-tight">
              {currentPreset.name}: {currentPreset.description}
            </p>

            {/* Mood selector */}
            <div className="flex flex-col gap-1 mb-3">
              {(Object.keys(SYNTH_PRESETS) as DungeonSynthMood[]).map((mood) => {
                const preset = SYNTH_PRESETS[mood];
                const active = currentMood === mood;
                return (
                  <button
                    key={mood}
                    onClick={() => handleSelectMood(mood)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-tech transition text-left cursor-pointer ${
                      active
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800'
                    }`}
                  >
                    <span>{preset.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{preset.filterCutoff}Hz LPF</span>
                  </button>
                );
              })}
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-2 mb-2 bg-slate-900/70 p-2 rounded-xl border border-slate-800">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                {Math.round(volume * 200)}%
              </span>
            </div>

            {/* Quick action button */}
            <button
              onClick={handleToggle}
              className={`w-full py-1.5 rounded-xl font-rpg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isPlaying
                  ? 'bg-rose-950/70 hover:bg-rose-900 border border-rose-500/50 text-rose-300'
                  : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
              }`}
            >
              {isPlaying ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>HALT SOUNDTRACK</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>START SOUNDTRACK</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full Box View
  return (
    <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md w-full">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Music className={`w-4 h-4 ${isPlaying ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <h3 className="font-rpg font-bold text-sm text-amber-200">PROCEDURAL DUNGEON SYNTH</h3>
            <p className="text-[10px] font-mono text-slate-400">Pure Web Audio API • Zero External MP3s</p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          className={`px-3 py-1.5 rounded-xl font-rpg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
            isPlaying
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 animate-pulse'
              : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300'
          }`}
        >
          {isPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
          <span>{isPlaying ? 'PLAYING AMBIENCE' : 'START SYNTH'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        {(Object.keys(SYNTH_PRESETS) as DungeonSynthMood[]).map((mood) => {
          const preset = SYNTH_PRESETS[mood];
          const active = currentMood === mood;
          return (
            <button
              key={mood}
              onClick={() => handleSelectMood(mood)}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                active
                  ? 'bg-amber-950/60 border-amber-500/80 text-amber-200 shadow-md'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="font-tech font-bold text-xs text-white mb-0.5">{preset.name}</div>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{preset.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          Filter: {currentPreset.filterCutoff}Hz Resonant Lowpass (Q={currentPreset.filterQ})
        </span>
        <div className="flex items-center gap-2">
          <span>Vol</span>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
