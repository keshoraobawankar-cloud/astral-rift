import React from 'react';

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
}

export const Minimap: React.FC<MinimapProps> = ({
  localPlayer,
  remoteEntities,
  mapScale = 45, // Shows a 45m radius around local player
  minimapSize = 150,
}) => {
  const radius = minimapSize / 2;

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

  return (
    <div className="absolute bottom-20 right-4 z-30 select-none pointer-events-auto">
      {/* Circular Minimap Container */}
      <div
        className="relative rounded-full border-2 border-amber-500/60 bg-slate-950/90 shadow-2xl backdrop-blur-md overflow-hidden"
        style={{ width: `${minimapSize}px`, height: `${minimapSize}px` }}
      >
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

      {/* Coordinates & Zone Badge */}
      <div className="mt-1 text-center font-mono text-[9px] text-slate-300 bg-slate-950/90 rounded-lg py-0.5 border border-slate-800 shadow-md flex items-center justify-center gap-1.5 px-2">
        <span className="text-cyan-400 font-bold">RADAR</span>
        <span>X: {Math.round(localPlayer.position.x)}</span>
        <span className="text-slate-600">•</span>
        <span>Z: {Math.round(localPlayer.position.z)}</span>
      </div>
    </div>
  );
};
