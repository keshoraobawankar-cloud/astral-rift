import React, { useState, useEffect } from 'react';
import { dungeonSynth, DungeonSynthMood, ANIME_JRPG_PRESETS } from '../services/dungeonSynthService';
import { Music, Volume2, VolumeX, Sparkles, ChevronDown, ChevronUp, Radio, Disc3 } from 'lucide-react';

interface DungeonSynthWidgetProps {
  compact?: boolean;
}

const SELECTABLE_MOODS: DungeonSynthMood[] = ['oakhaven_breeze', 'sylph_voyage', 'radiant_vanguard'];

export const DungeonSynthWidget: React.FC<DungeonSynthWidgetProps> = ({ compact = false }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(() => dungeonSynth.getIsPlaying());
  const [currentMood, setCurrentMood] = useState<DungeonSynthMood>(() => dungeonSynth.getCurrentMood());
  const [volume, setVolume] = useState<number>(() => dungeonSynth.getVolume());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    setIsPlaying(dungeonSynth.getIsPlaying());
    setCurrentMood(dungeonSynth.getCurrentMood());

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

  const currentPreset = ANIME_JRPG_PRESETS[currentMood] || ANIME_JRPG_PRESETS.oakhaven_breeze;

  if (compact) {
    return (
      <div className="relative inline-flex items-center">
        <button
          onClick={handleToggle}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-rpg font-bold border transition shadow-sm cursor-pointer ${
            isPlaying
              ? 'bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border-amber-400/60 text-amber-300 shadow-amber-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title={isPlaying ? `Now Playing: ${currentPreset.name} (Click to Pause)` : 'Start Joyful Anime JRPG Soundtrack'}
        >
          <Music className={`w-3.5 h-3.5 ${isPlaying ? 'text-amber-400 animate-spin' : 'text-slate-400'}`} />
          <span className="hidden sm:inline font-mono">
            {isPlaying ? `${currentPreset.name}` : 'ANIME OST'}
          </span>
          {isPlaying && (
            <span className="flex gap-0.5 items-end h-3 ml-0.5">
              <span className="w-0.5 bg-amber-400 animate-[bounce_0.9s_infinite] h-2.5" />
              <span className="w-0.5 bg-pink-400 animate-[bounce_0.6s_infinite] h-3" />
              <span className="w-0.5 bg-cyan-400 animate-[bounce_1.1s_infinite] h-1.5" />
            </span>
          )}
        </button>

        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="p-1 ml-1 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs cursor-pointer"
          title="Soundtrack & Audio Controls"
        >
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Floating Mini Panel when expanded */}
        {isExpanded && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-slate-950/98 border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-2xl z-50 text-left font-sans animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Disc3 className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="font-rpg font-bold text-xs text-amber-200">ANIME JRPG SOUNDTRACK</span>
              </div>
              <span className="text-[9px] font-mono bg-pink-900/30 text-pink-300 px-1.5 py-0.5 rounded border border-pink-500/30">
                Lyricless Polyphony
              </span>
            </div>

            <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-xl mb-3">
              <div className="flex items-center justify-between">
                <span className="font-rpg font-bold text-xs text-white">{currentPreset.name}</span>
                <span className="text-[10px] font-tech text-amber-400 font-bold">{currentPreset.bpm} BPM</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 font-sans leading-relaxed">
                {currentPreset.description}
              </p>
            </div>

            {/* Track Selector */}
            <div className="flex flex-col gap-1.5 mb-3">
              {SELECTABLE_MOODS.map((mood) => {
                const preset = ANIME_JRPG_PRESETS[mood];
                const active = currentMood === mood;
                return (
                  <button
                    key={mood}
                    onClick={() => handleSelectMood(mood)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-tech transition text-left cursor-pointer ${
                      active
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-sm'
                        : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                        <span>{preset.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">{preset.tagline}</div>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 shrink-0 ml-2">{preset.bpm} BPM</span>
                  </button>
                );
              })}
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-2 mb-2.5 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="range"
                min="0"
                max="0.6"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] font-mono text-slate-300 w-8 text-right">
                {Math.round(volume * 166)}%
              </span>
            </div>

            {/* Quick action button */}
            <button
              onClick={handleToggle}
              className={`w-full py-2 rounded-xl font-rpg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isPlaying
                  ? 'bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300'
                  : 'bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:brightness-110 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              }`}
            >
              {isPlaying ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>PAUSE SOUNDTRACK</span>
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
    <div className="bg-slate-950/95 border border-amber-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md w-full">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-pink-500 flex items-center justify-center text-slate-950 shadow-md">
            <Music className={`w-4 h-4 ${isPlaying ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <h3 className="font-rpg font-bold text-sm text-white">ANIME JRPG PROCEDURAL SOUNDTRACK</h3>
            <p className="text-[10px] font-mono text-amber-300/80">Celesta Arpeggios • Pastoral Flute • 100% Instrumental</p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          className={`px-3.5 py-1.5 rounded-xl font-rpg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
            isPlaying
              ? 'bg-gradient-to-r from-amber-500 to-pink-500 text-slate-950 shadow-lg shadow-amber-500/30'
              : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300'
          }`}
        >
          {isPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
          <span>{isPlaying ? 'PLAYING OST' : 'START OST'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {SELECTABLE_MOODS.map((mood) => {
          const preset = ANIME_JRPG_PRESETS[mood];
          const active = currentMood === mood;
          return (
            <button
              key={mood}
              onClick={() => handleSelectMood(mood)}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                active
                  ? 'bg-amber-950/50 border-amber-400 text-amber-200 shadow-md ring-1 ring-amber-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-rpg font-bold text-xs text-white">{preset.name}</span>
                <span className="text-[10px] font-mono text-cyan-400">{preset.bpm} BPM</span>
              </div>
              <div className="text-[10px] text-amber-300 font-tech font-semibold mb-1">{preset.tagline}</div>
              <p className="text-[11px] text-slate-400 font-sans line-clamp-2 leading-relaxed">{preset.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-800">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Track: {currentPreset.name} ({currentPreset.bpm} BPM)</span>
        </span>
        <div className="flex items-center gap-2">
          <span>Master Volume</span>
          <input
            type="range"
            min="0"
            max="0.6"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
