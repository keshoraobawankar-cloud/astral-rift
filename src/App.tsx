import React, { useState, useEffect } from 'react';
import {
  Character,
  Realm,
  RealmNode,
  PlayerInventory,
  GuildEstate,
  SafeZoneState,
  TeleportationArray,
  AttributeMatrix,
} from './types/game';
import { INITIAL_CHARACTERS } from './data/characters';
import { INITIAL_REALMS } from './data/realms';
import { INITIAL_WEAPONS, INITIAL_RELICS } from './data/items';
import { INITIAL_GUILD_ESTATE } from './data/guildData';
import {
  INITIAL_SAFE_ZONE_STATE,
  INITIAL_TELEPORTATION_ARRAY,
} from './data/aethelgardWorld';
import { sound } from './services/soundService';

import { HeaderNav, NavTab } from './components/HeaderNav';
import { AethelgardCitadelHub } from './components/AethelgardCitadelHub';
import { PartyRoster } from './components/PartyRoster';
import { TeleportationArrayView } from './components/TeleportationArrayView';
import { CitadelBazaarNPC } from './components/CitadelBazaarNPC';
import { StellarMap } from './components/StellarMap';
import { CombatCanvas } from './components/CombatCanvas';
import { CraftingWorkshop } from './components/CraftingWorkshop';
import { CodexLore } from './components/CodexLore';
import { GuildHall } from './components/GuildHall';
import { AffinityManager } from './services/affinityManager';
import { AffinityEventType } from './types/affinity';

export const App: React.FC = () => {
  // Safe Zone & City Boundary State (Feature A)
  const [safeZone, setSafeZone] = useState<SafeZoneState>(() => {
    try {
      const saved = localStorage.getItem('aethelgard_safezone');
      return saved ? JSON.parse(saved) : INITIAL_SAFE_ZONE_STATE;
    } catch {
      return INITIAL_SAFE_ZONE_STATE;
    }
  });

  // Ancient Teleportation Array State (Feature B)
  const [teleportArray, setTeleportArray] = useState<TeleportationArray>(() => {
    try {
      const saved = localStorage.getItem('aethelgard_teleport');
      return saved ? JSON.parse(saved) : INITIAL_TELEPORTATION_ARRAY;
    } catch {
      return INITIAL_TELEPORTATION_ARRAY;
    }
  });

  // Guild Estate State (Feature 4)
  const [guild, setGuild] = useState<GuildEstate>(() => {
    try {
      const saved = localStorage.getItem('aethelgard_guild');
      return saved ? JSON.parse(saved) : INITIAL_GUILD_ESTATE;
    } catch {
      return INITIAL_GUILD_ESTATE;
    }
  });

  // Player Inventory
  const [inventory, setInventory] = useState<PlayerInventory>(() => {
    try {
      const saved = localStorage.getItem('aethelgard_inventory');
      return saved
        ? JSON.parse(saved)
        : {
            stardust: 50830, // Gold
            astralPrisms: 1960, // Essence Stones
            riftShards: 120,
            manaPotions: 8,
            goblinLeather: 50,
            golemAlloy: 45,
            manaCrystals: 60,
            alchemicalHerbs: 35,
            fairyDust: 30,
            spiritWood: 45,
            arrayRunes: ['Rune of Ironpeak Magma', 'Rune of Whispering Wood', 'Rune of the Golem Core'],
            bountyTokens: 0,
            weapons: INITIAL_WEAPONS,
            relics: INITIAL_RELICS,
          };
    } catch {
      return {
        stardust: 50830,
        astralPrisms: 1960,
        riftShards: 120,
        manaPotions: 8,
        goblinLeather: 50,
        golemAlloy: 45,
        manaCrystals: 60,
        alchemicalHerbs: 35,
        fairyDust: 30,
        spiritWood: 45,
        arrayRunes: ['Rune of Ironpeak Magma', 'Rune of Whispering Wood', 'Rune of the Golem Core'],
        bountyTokens: 0,
        weapons: INITIAL_WEAPONS,
        relics: INITIAL_RELICS,
      };
    }
  });

  // 6-Player Party Strike Team (Elurien, Thorgar, Faelin, Kaelen, Astraea, Valen)
  const [party, setParty] = useState<Character[]>(() => {
    try {
      const saved = localStorage.getItem('aethelgard_party');
      return saved ? JSON.parse(saved) : INITIAL_CHARACTERS;
    } catch {
      return INITIAL_CHARACTERS;
    }
  });

  const [activeCharIndex, setActiveCharIndex] = useState<number>(0);

  // Continental Realms & Abyss Labyrinths
  const [realms, setRealms] = useState<Realm[]>(() => {
    try {
      const saved = localStorage.getItem('aethelgard_realms');
      return saved ? JSON.parse(saved) : INITIAL_REALMS;
    } catch {
      return INITIAL_REALMS;
    }
  });

  const [activeRealmId, setActiveRealmId] = useState<string>('realm_dungeon');
  const [activeCombatNode, setActiveCombatNode] = useState<RealmNode | null>(null);

  // Active Screen
  const [activeTab, setActiveTab] = useState<NavTab>('lobby');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [systemToast, setSystemToast] = useState<string | null>(null);

  // Dynamic NPC Affinity & Relationship Manager
  const [affinityManager] = useState<AffinityManager>(() => {
    try {
      const saved = localStorage.getItem('aethelgard_affinity');
      return new AffinityManager(saved || undefined);
    } catch {
      return new AffinityManager();
    }
  });
  const [, setAffinityVersion] = useState<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem('aethelgard_safezone', JSON.stringify(safeZone));
      localStorage.setItem('aethelgard_teleport', JSON.stringify(teleportArray));
      localStorage.setItem('aethelgard_inventory', JSON.stringify(inventory));
      localStorage.setItem('aethelgard_party', JSON.stringify(party));
      localStorage.setItem('aethelgard_realms', JSON.stringify(realms));
      localStorage.setItem('aethelgard_guild', JSON.stringify(guild));
      localStorage.setItem('aethelgard_affinity', affinityManager.serialize());
    } catch {
      // ignore
    }
  }, [safeZone, teleportArray, inventory, party, realms, guild, affinityManager]);

  const handleToggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Collect Activity Funds / Guild Vanguard Stipend
  const handleCollectActivityFunds = () => {
    setInventory((prev) => ({
      ...prev,
      stardust: prev.stardust + 3850,
      astralPrisms: prev.astralPrisms + 50,
    }));
    setSystemToast('✦ Citadel Vanguard Stipend Collected: +3,850 Gold & +50 Essence Stones!');
    setTimeout(() => setSystemToast(null), 4000);
  };

  // Allocate Attribute Point to any of the 6 heroes in the party
  const handleAllocateAttribute = (charId: string, attr: keyof AttributeMatrix) => {
    setParty((prev) =>
      prev.map((c) =>
        c.id === charId
          ? {
              ...c,
              attributes: {
                ...c.attributes,
                [attr]: (c.attributes[attr] ?? 0) + 1,
              },
              attack: attr === 'strength' ? c.attack + 14 : c.attack,
              defense: attr === 'endurance' ? c.defense + 8 : c.defense,
              hp: attr === 'endurance' ? c.hp + 45 : c.hp,
              maxHp: attr === 'endurance' ? c.maxHp + 45 : c.maxHp,
              speed: attr === 'agility' ? Number((c.speed * 1.012).toFixed(2)) : c.speed,
            }
          : c
      )
    );
  };

  // Full Hunter Attribute Allocator Calibration & Total Power Sync
  const handleUpdateHeroStats = (
    charId: string,
    stats: { strength: number; agility: number; vitality: number; intelligence: number; perception: number },
    totalPower: number
  ) => {
    setParty((prev) =>
      prev.map((c) => {
        if (c.id !== charId) return c;
        const currentEndurance = c.attributes.vitality ?? c.attributes.endurance;
        const deltaStr = stats.strength - c.attributes.strength;
        const deltaEnd = stats.vitality - currentEndurance;
        const deltaAgi = stats.agility - c.attributes.agility;

        return {
          ...c,
          attributes: {
            ...c.attributes,
            strength: stats.strength,
            agility: stats.agility,
            vitality: stats.vitality,
            endurance: stats.vitality,
            intelligence: stats.intelligence,
            perception: stats.perception,
          },
          attack: c.attack + Math.max(0, deltaStr * 14),
          defense: c.defense + Math.max(0, deltaEnd * 8),
          hp: c.hp + Math.max(0, deltaEnd * 45),
          maxHp: c.maxHp + Math.max(0, deltaEnd * 45),
          speed: deltaAgi !== 0 ? Number((c.speed * (1 + 0.002 * stats.agility)).toFixed(2)) : c.speed,
        };
      })
    );
    setSystemToast(`⚡ Build Confirmed for ${charId.toUpperCase()}! Total Power Calibrated to ${totalPower.toLocaleString()}`);
    setTimeout(() => setSystemToast(null), 4000);
  };

  // Record structured NPC relationship event
  const handleRecordAffinityEvent = (npcId: string, eventType: AffinityEventType, reason?: string) => {
    const result = affinityManager.recordEvent(npcId, eventType, reason);
    setAffinityVersion((v) => v + 1);
    try {
      localStorage.setItem('aethelgard_affinity', affinityManager.serialize());
    } catch {
      // ignore
    }
    const scoreStr = result.record.compositeScore > 0 ? `+${result.record.compositeScore}` : `${result.record.compositeScore}`;
    setSystemToast(`✦ [${result.record.npcName}] Relationship Tier: ${result.tier.tier} (${scoreStr}/100)`);
    setTimeout(() => setSystemToast(null), 3500);
  };

  // Reset NPC relationship to baseline
  const handleResetAffinity = (npcId: string) => {
    affinityManager.resetRelationship(npcId);
    setAffinityVersion((v) => v + 1);
    try {
      localStorage.setItem('aethelgard_affinity', affinityManager.serialize());
    } catch {
      // ignore
    }
    setSystemToast(`🔄 Reset relationship with ${npcId} to baseline standing.`);
    setTimeout(() => setSystemToast(null), 3000);
  };

  const handleSelectNode = (node: RealmNode) => {
    setActiveCombatNode(node);
    setActiveTab('combat');
  };

  const handleCombatVictory = (rewards: RealmNode['rewards']) => {
    if (!activeCombatNode) return;

    setInventory((prev) => ({
      ...prev,
      stardust: prev.stardust + (safeZone.wellRestedExpMultiplierActive ? rewards.stardust * 2 : rewards.stardust),
      astralPrisms: prev.astralPrisms + rewards.prisms,
      riftShards: prev.riftShards + rewards.shards,
      goblinLeather: prev.goblinLeather + (rewards.craftingMaterials?.goblinLeather || 0),
      golemAlloy: prev.golemAlloy + (rewards.craftingMaterials?.golemAlloy || 0),
      manaCrystals: prev.manaCrystals + (rewards.craftingMaterials?.manaCrystals || 0),
      alchemicalHerbs: prev.alchemicalHerbs + (rewards.craftingMaterials?.alchemicalHerbs || 0),
      spiritWood: prev.spiritWood + (rewards.craftingMaterials?.spiritWood || 0),
      fairyDust: prev.fairyDust + (rewards.craftingMaterials?.fairyDust || 0),
      arrayRunes: rewards.arrayRune && !prev.arrayRunes.includes(rewards.arrayRune)
        ? [...prev.arrayRunes, rewards.arrayRune]
        : prev.arrayRunes,
    }));

    // Grant EXP to party (with Well-Rested bonus if active)
    const baseExp = 450;
    const finalExp = safeZone.wellRestedExpMultiplierActive ? baseExp * 2 : baseExp;

    setParty((prev) =>
      prev.map((c) => {
        const nextExp = c.exp + finalExp;
        const levelUp = nextExp >= c.maxExp;
        return {
          ...c,
          exp: levelUp ? nextExp - c.maxExp : nextExp,
          level: levelUp ? c.level + 1 : c.level,
          maxExp: levelUp ? Math.round(c.maxExp * 1.3) : c.maxExp,
        };
      })
    );

    setActiveCombatNode(null);
    setActiveTab('lobby');
    setSystemToast(
      safeZone.wellRestedExpMultiplierActive
        ? '🎉 Dungeon Purified! +200% WELL-RESTED BONUS APPLIED!'
        : '🎉 Dungeon Purified! Spoils deposited into party cache.'
    );
    setTimeout(() => setSystemToast(null), 4000);
  };

  const handleCombatDefeat = () => {
    if (activeCombatNode) {
      setActiveCombatNode({ ...activeCombatNode });
    }
  };

  const handleExitCombat = () => {
    setActiveCombatNode(null);
    setActiveTab('lobby');
  };

  // Socket rune into Ancient Teleportation Array Altar (Feature B)
  const handleSocketRune = (runeName: string) => {
    setTeleportArray((prev) => {
      if (prev.socketedRunes.includes(runeName)) return prev;
      const nextRunes = [...prev.socketedRunes, runeName];
      const isComplete = nextRunes.length >= 4;
      return {
        ...prev,
        socketedRunes: nextRunes,
        isActivated: isComplete,
        tier2Unlocked: isComplete,
      };
    });
  };

  const handleUnsocketRune = (runeName: string) => {
    setTeleportArray((prev) => ({
      ...prev,
      socketedRunes: prev.socketedRunes.filter((r) => r !== runeName),
      isActivated: false,
    }));
  };

  const handleUnlockTier2 = () => {
    setRealms((prev) =>
      prev.map((r) => (r.id === 'realm_floating_expanse' ? { ...r, unlocked: true } : r))
    );
    setSystemToast('⚡ TIER 2: THE FLOATING EXPANSE UNLOCKED VIA TELEPORTATION ARRAY!');
    setTimeout(() => setSystemToast(null), 5000);
  };

  const handleTravelToTier2 = () => {
    setActiveRealmId('realm_floating_expanse');
    setActiveTab('dungeon');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Header Navigation */}
      <HeaderNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        inventory={inventory}
        guild={guild}
        safeZone={safeZone}
        isCombatActive={!!activeCombatNode}
        isMuted={isMuted}
        onToggleSound={handleToggleSound}
      />

      {/* System Toast Banner */}
      {systemToast && (
        <div className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-tech font-bold text-center py-2 px-4 text-xs tracking-wide shadow-md animate-bounce">
          {systemToast}
        </div>
      )}

      {/* Main View Display */}
      <main className="flex-1 p-4 md:p-6 flex flex-col items-center">
        {/* Citadel Plaza: Safe-Zone Aegis Dome, Inn Logout Simulator & 6 Biomes */}
        {activeTab === 'lobby' && (
          <AethelgardCitadelHub
            inventory={inventory}
            party={party}
            safeZone={safeZone}
            onUpdateSafeZone={setSafeZone}
            onOpenPartyScreen={() => setActiveTab('party')}
            onOpenTeleportArray={() => setActiveTab('array')}
            onOpenDungeonGate={() => setActiveTab('dungeon')}
            onOpenBazaar={() => setActiveTab('bazaar')}
            onOpenWorkshops={() => setActiveTab('workshops')}
            onOpenGuildHall={() => setActiveTab('guild')}
            onCollectActivityFunds={handleCollectActivityFunds}
          />
        )}

        {/* Dynamic 6-Player Party Strike Team & Attribute Matrix */}
        {activeTab === 'party' && (
          <PartyRoster
            party={party}
            inventory={inventory}
            onAllocateAttribute={handleAllocateAttribute}
            onUpdateHeroAttributes={handleUpdateHeroStats}
            onDeployParty={() => setActiveTab('dungeon')}
            onInspectHero={() => {}}
            onReturnToPlaza={() => setActiveTab('lobby')}
          />
        )}

        {/* Feature B: Ancient Teleportation Arrays (Tier 1 → Tier 2 Altar) */}
        {activeTab === 'array' && (
          <TeleportationArrayView
            teleportArray={teleportArray}
            inventory={inventory}
            onSocketRune={handleSocketRune}
            onUnsocketRune={handleUnsocketRune}
            onUnlockTier2={handleUnlockTier2}
            onTravelToTier2={handleTravelToTier2}
          />
        )}

        {/* Abyss Dungeons & 30 Tier-1 World Bosses */}
        {activeTab === 'dungeon' && (
          <StellarMap
            realms={realms}
            activeRealmId={activeRealmId}
            onSelectRealm={setActiveRealmId}
            onSelectNode={handleSelectNode}
          />
        )}

        {/* Fast-Paced Action Combat Canvas (Feature D & Ecology) */}
        {activeTab === 'combat' && activeCombatNode && (
          <CombatCanvas
            party={party}
            activeCharIndex={activeCharIndex}
            onSelectCharacter={setActiveCharIndex}
            node={activeCombatNode}
            manaPotions={inventory.manaPotions}
            onUseManaPotion={() => {
              setInventory((prev) => ({ ...prev, manaPotions: Math.max(0, prev.manaPotions - 1) }));
            }}
            onVictory={handleCombatVictory}
            onDefeat={handleCombatDefeat}
            onExit={handleExitCombat}
          />
        )}

        {/* Grand Artisan Bazaar & Feature C Voice NPC STT/TTS */}
        {activeTab === 'bazaar' && (
          <CitadelBazaarNPC
            inventory={inventory}
            party={party}
            safeZone={safeZone}
            affinityManager={affinityManager}
            onRecordAffinityEvent={handleRecordAffinityEvent}
            onResetAffinity={handleResetAffinity}
            onBuyManaPotion={(cost) => {
              setInventory((prev) => ({
                ...prev,
                stardust: prev.stardust - cost,
                manaPotions: prev.manaPotions + 1,
              }));
              sound.playHit(true);
            }}
            onUnlockHiddenQuest={() => {
              setSystemToast('📜 Dynamic Hidden Quest Unveiled by Voice/Inquiry!');
              setTimeout(() => setSystemToast(null), 4000);
            }}
          />
        )}

        {/* Dwarven Tempering with Golem Alloys & Elven Arcane Weaving */}
        {activeTab === 'workshops' && (
          <CraftingWorkshop
            inventory={inventory}
            party={party}
            onTemperWeapon={(wId, trait) => {
              setInventory((prev) => ({
                ...prev,
                weapons: prev.weapons.map((w) => (w.id === wId ? { ...w, temperingTrait: trait, baseAtk: w.baseAtk + 25 } : w)),
              }));
            }}
            onCraftWeaveItem={() => sound.playVictory()}
          />
        )}

        {/* Guild Estates, Shared Storage Vault & Specialized Workshops */}
        {activeTab === 'guild' && (
          <GuildHall
            guild={guild}
            inventory={inventory}
            party={party}
            onUpgradeCharterTier={() => {
              setGuild((prev) => ({
                ...prev,
                charterTier: Math.min(5, prev.charterTier + 1) as 1 | 2 | 3 | 4 | 5,
                perks: prev.perks.map((p) => (p.unlockedAtTier <= prev.charterTier + 1 ? { ...p, active: true } : p)),
              }));
            }}
            onUpgradeRoom={(roomId) => {
              setGuild((prev) => ({
                ...prev,
                rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, level: Math.min(r.maxLevel, r.level + 1) } : r)),
              }));
            }}
            onDepositMaterial={(mat, amount) => {
              setGuild((prev) => ({
                ...prev,
                treasury: {
                  ...prev.treasury,
                  [mat]: (prev.treasury[mat] || 0) + amount,
                },
              }));
            }}
          />
        )}

        {/* Codex, Living Dungeon Ecology & UE5 Technical Blueprint */}
        {activeTab === 'codex' && <CodexLore />}
      </main>
    </div>
  );
};
