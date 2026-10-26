import React, { useState, useEffect } from 'react';

export interface MinimapEntity {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotationY: number; // In radians
  hpPercent: number; // 0 to 100
  isLocalPlayer?: boolean;
  isHostile?: boolean;
}

interface MinimapProps {
  localPlayer: MinimapEntity;
  remoteEntities: MinimapEntity[];
  mapScale?: number; // Metres in world space mapped to radar radius
  minimapSize?: number; // Size in pixels
  defaultCollapsed?: boolean;
}

export const Minimap: React.FC<MinimapProps> = ({
  localPlayer,
  remoteEntities,
  mapScale = 45, // Shows a 45m radius around local player
  minimapSize = 150,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const radius = minimapSize / 2;

  // Toggle minimap collapsed/expanded state with 'M' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasNearbyHostiles = remoteEntities.some((e) => e.isHostile);

  // Helper to calculate relative 2D pixel coordinates on the radar
  const getRadarCoords = (entityPos: { x: number; z: number }) => {
    const dx = entityPos.x - localPlayer.position.x;
    const dz = entityPos.z - localPlayer.position.z;

    // Map world space to radar canvas pixels
    let pixelX = (dx / mapScale) * radius;
    let pixelY = (dz / mapScale) * radius; // In 3D +Z is south, +X is east

    // Clamp markers to edge of minimap circle if out of range
    const distance = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
    const maxRadius = radius - 10; // Padding from edge

    let isClamped = false;
    if (distance > maxRadius) {
      const angle = Math.atan2(pixelY, pixelX);
      pixelX = Math.cos(angle) * maxRadius;
      pixelY = Math.sin(angle) * maxRadius;
      isClamped = true;
    }

    return { x: radius + pixelX, y: radius + pixelY, isClamped };
  };

  // Collapsed State: 50px compact icon HUD widget
  if (isCollapsed) {
    return (
      <div className="absolute bottom-20 right-4 z-30 select-none pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          title={`Expand Minimap (X: ${Math.round(localPlayer.position.x)}, Z: ${Math.round(
            localPlayer.position.z
          )}) • Press [M] or click to expand`}
          className="relative w-[50px] h-[50px] rounded-full border-2 border-amber-500/70 bg-slate-950/95 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center cursor-pointer group hover:border-amber-400 hover:scale-105 active:scale-95 transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          aria-label="Expand Minimap"
        >
          {/* Radar background grid styling inside 50px icon */}
          <div className="absolute inset-1 border border-slate-800/80 rounded-full pointer-events-none" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 via-transparent to-transparent animate-spin [animation-duration:4s] pointer-events-none" />

          {/* Dynamic Rotating Player Heading Pointer inside 50px icon */}
          <div
            className="relative z-10 flex flex-col items-center justify-center transition-transform duration-75"
            style={{ transform: `rotate(${localPlayer.rotationY}rad)` }}
          >
            {/* North-facing Cyan Heading Arrow */}
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[9px] border-b-cyan-400 drop-shadow-[0_0_4px_rgba(56,189,248,0.9)]" />
            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[5px] border-t-amber-500/60" />
          </div>

          {/* Mini MAP label */}
          <span className="relative z-10 text-[8px] font-mono font-bold text-amber-300 -mt-0.5 tracking-tight group-hover:text-amber-200">
            MAP
          </span>

          {/* Threat ping beacon if hostiles are present */}
          {hasNearbyHostiles && (
            <span className="absolute top-1 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
          )}

          {/* Expand badge icon overlay */}
          <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-amber-300 drop-shadow absolute -top-0.5 -right-0.5 bg-slate-900/90 rounded-full p-0.5 border border-amber-500/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
        </button>

        {/* 50px pill beneath collapsed icon */}
        <div className="mt-0.5 text-center font-mono text-[7px] text-slate-400 bg-slate-950/80 rounded px-1 py-0.2 border border-slate-800/80 max-w-[50px] truncate shadow">
          {Math.round(localPlayer.position.x)},{Math.round(localPlayer.position.z)}
        </div>
      </div>
    );
  }

  // Expanded State: Full radar with collapse controls
  return (
    <div className="absolute bottom-20 right-4 z-30 select-none pointer-events-auto">
      {/* Collapse Button Header */}
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          title="Collapse minimap to 50px icon [M]"
          className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono text-amber-300 hover:text-white bg-slate-950/90 hover:bg-amber-600/30 border border-amber-500/50 rounded-md shadow-md transition-colors cursor-pointer group"
          aria-label="Collapse Minimap"
        >
          <svg
            className="w-2.5 h-2.5 transition-transform group-hover:scale-110 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="font-semibold">Collapse</span>
          <span className="text-[7.5px] text-slate-500 bg-slate-850 px-0.5 rounded border border-slate-700">M</span>
        </button>
      </div>

      {/* Circular Minimap Container */}
      <div
        className="relative rounded-full border-2 border-amber-500/60 bg-slate-950/90 shadow-2xl backdrop-blur-md overflow-hidden"
        style={{ width: `${minimapSize}px`, height: `${minimapSize}px` }}
      >
        {/* Quick-collapse overlay button at top right edge */}
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          title="Collapse Minimap"
          className="absolute top-1 right-2 z-40 w-4 h-4 rounded-full bg-slate-900/80 hover:bg-amber-600/60 border border-amber-500/40 text-amber-300 hover:text-white flex items-center justify-center text-[10px] leading-none transition-colors cursor-pointer"
        >
          −
        </button>

        {/* Grid Crosshairs & Radar Concentric Circles */}
        <div className="absolute inset-0 border border-slate-800/80 rounded-full" />
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-700/40 -translate-x-1/2" />
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-700/40 -translate-y-1/2" />
        <div className="absolute inset-3 border border-cyan-500/20 rounded-full border-dashed" />
        <div className="absolute inset-8 border border-slate-700/30 rounded-full" />

        {/* Radar Sweep Animation Effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/10 via-transparent to-transparent animate-spin [animation-duration:6s] pointer-events-none" />

        {/* Compass Cardinal Directions */}
        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-amber-400 font-mono">
          N
        </span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500 font-mono">
          S
        </span>
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500 font-mono">
          E
        </span>
        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500 font-mono">
          W
        </span>

        {/* Remote Players & Boss Entities */}
        {remoteEntities.map((entity) => {
          const { x, y, isClamped } = getRadarCoords(entity.position);

          const hpColor =
            entity.hpPercent < 25
              ? 'bg-rose-500'
              : entity.hpPercent < 50
              ? 'bg-amber-400'
              : 'bg-emerald-400';

          return (
            <div
              key={entity.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ease-linear"
              style={{ left: `${x}px`, top: `${y}px`, opacity: isClamped ? 0.65 : 1 }}
              title={`${entity.name} (${Math.round(entity.hpPercent)}% HP)`}
            >
              {/* Entity Marker Point */}
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  entity.isHostile ? 'bg-rose-500 ring-2 ring-rose-500/50 animate-pulse' : hpColor
                } border border-slate-950 shadow-sm`}
              />

              {/* Health Ring Indicator */}
              {!isClamped && (
                <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full border border-slate-700 pointer-events-none">
                  <div
                    className={`h-full rounded-full ${hpColor} opacity-50`}
                    style={{ width: `${entity.hpPercent}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Center Player Heading Pointer (Local Player) */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ transform: `translate(-50%, -50%) rotate(${localPlayer.rotationY}rad)` }}
        >
          {/* Arrow Indicator facing player heading */}
          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-cyan-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.9)]" />
        </div>
      </div>

      {/* Coordinates & Zone Badge with Quick Collapse button */}
      <div className="mt-1 text-center font-mono text-[9px] text-slate-300 bg-slate-950/90 rounded-lg py-0.5 border border-slate-800 shadow-md flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5">
          <span className="text-cyan-400 font-bold">RADAR</span>
          <span>X: {Math.round(localPlayer.position.x)}</span>
          <span className="text-slate-600">•</span>
          <span>Z: {Math.round(localPlayer.position.z)}</span>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          title="Collapse Minimap (shrink to 50px icon)"
          className="text-[8.5px] text-amber-400 hover:text-amber-200 hover:underline flex items-center gap-0.5 pl-1.5 border-l border-slate-800 font-sans cursor-pointer"
        >
          <span>Collapse</span>
        </button>
      </div>
    </div>
  );
};

