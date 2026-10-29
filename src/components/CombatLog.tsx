import React, { useState, useRef, useEffect } from 'react';
import {
  Scroll,
  Swords,
  ShieldAlert,
  FlaskConical,
  Skull,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowDownCircle,
  Filter,
} from 'lucide-react';

export type CombatLogType = 'damage_dealt' | 'damage_taken' | 'item_used' | 'enemy_action' | 'skill_cast' | 'system';

export interface CombatLogEntry {
  id: string;
  timestamp: string;
  type: CombatLogType;
  message: string;
  detail?: string;
  isCrit?: boolean;
  value?: number;
}

interface CombatLogProps {
  logs: CombatLogEntry[];
  onClearLogs?: () => void;
  className?: string;
}

export const CombatLog: React.FC<CombatLogProps> = ({ logs, onClearLogs, className = '' }) => {
  const [filter, setFilter] = useState<'all' | 'damage' | 'items' | 'enemy'>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle user scrolling
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 25;
    setAutoScroll(isAtBottom);
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'damage') return log.type === 'damage_dealt' || log.type === 'damage_taken';
    if (filter === 'items') return log.type === 'item_used';
    if (filter === 'enemy') return log.type === 'enemy_action';
    return true;
  });

  const getLogIcon = (type: CombatLogType, isCrit?: boolean) => {
    switch (type) {
      case 'damage_dealt':
        return isCrit ? (
          <span className="text-amber-400 font-bold">⚡</span>
        ) : (
          <Swords className="w-3.5 h-3.5 text-cyan-400" />
        );
      case 'damage_taken':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'item_used':
        return <FlaskConical className="w-3.5 h-3.5 text-lime-400" />;
      case 'enemy_action':
        return <Skull className="w-3.5 h-3.5 text-amber-500" />;
      case 'skill_cast':
        return <span className="text-indigo-400 font-bold">🌀</span>;
      case 'system':
      default:
        return <span className="text-slate-400">ℹ️</span>;
    }
  };

  const getLogBadgeStyle = (type: CombatLogType, isCrit?: boolean) => {
    switch (type) {
      case 'damage_dealt':
        return isCrit
          ? 'bg-amber-950/60 text-amber-300 border-amber-600/50'
          : 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50';
      case 'damage_taken':
        return 'bg-rose-950/60 text-rose-300 border-rose-800/50';
      case 'item_used':
        return 'bg-lime-950/60 text-lime-300 border-lime-800/50';
      case 'enemy_action':
        return 'bg-amber-950/50 text-amber-300 border-amber-800/40';
      case 'skill_cast':
        return 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50';
      case 'system':
      default:
        return 'bg-slate-900 text-slate-300 border-slate-800';
    }
  };

  return (
    <div
      className={`bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Header Bar */}
      <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2">
          <Scroll className="w-4 h-4 text-cyan-400" />
          <span className="font-rpg font-bold text-xs text-white tracking-wide">
            COMBAT LOG
          </span>
          <span className="text-[10px] font-tech font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
            {logs.length}
          </span>
        </div>

        {/* Filters */}
        {!isCollapsed && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-tech font-bold transition ${
                filter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('damage')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-tech font-bold transition ${
                filter === 'damage'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Damage
            </button>
            <button
              onClick={() => setFilter('enemy')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-tech font-bold transition ${
                filter === 'enemy'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Enemies
            </button>
            <button
              onClick={() => setFilter('items')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-tech font-bold transition ${
                filter === 'items'
                  ? 'bg-lime-500/20 text-lime-300 border border-lime-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Items
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {!isCollapsed && onClearLogs && (
            <button
              onClick={onClearLogs}
              title="Clear Combat Log"
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {!isCollapsed && (
            <button
              onClick={() => {
                setAutoScroll(true);
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                }
              }}
              title={autoScroll ? 'Auto-scroll: ON' : 'Scroll to bottom'}
              className={`p-1 rounded transition ${
                autoScroll
                  ? 'text-cyan-400 bg-cyan-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Combat Log' : 'Collapse Combat Log'}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Scrollable Log Stream */}
      {!isCollapsed && (
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="p-2.5 max-h-44 md:max-h-52 overflow-y-auto space-y-1.5 text-xs font-mono scroll-smooth"
        >
          {filteredLogs.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-[11px] font-tech italic">
              Encounters pending... Engage enemies with [J], cast skills [Q, E, F], or drink potions.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-1.5 px-2 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 transition duration-150 ${getLogBadgeStyle(
                  log.type,
                  log.isCrit
                )}`}
              >
                <div className="mt-0.5 shrink-0">{getLogIcon(log.type, log.isCrit)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-400 font-tech">[{log.timestamp}]</span>
                    <span className="font-semibold text-slate-100 break-words">{log.message}</span>
                  </div>
                  {log.detail && (
                    <div className="text-[10px] text-slate-300/80 mt-0.5 font-sans pl-1 border-l border-slate-700/50">
                      {log.detail}
                    </div>
                  )}
                </div>
                {log.value !== undefined && (
                  <span
                    className={`font-mono text-xs font-bold shrink-0 ${
                      log.type === 'damage_taken'
                        ? 'text-rose-400'
                        : log.isCrit
                        ? 'text-amber-400'
                        : 'text-cyan-400'
                    }`}
                  >
                    {log.type === 'damage_taken' ? `-${log.value}` : `+${log.value}`}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
