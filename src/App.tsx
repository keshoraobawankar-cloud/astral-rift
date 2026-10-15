import React, { useState, useEffect } from 'react';
import {
  Character,
  Realm,
  RealmNode,
  PlayerInventory,
  GuildEstate,
  SafeZoneState,
  TeleportationArray,
  WorldBossInfo,
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
import { SoloLevelingHub } from './components/SoloLevelingHub';
import { HunterPartyScreen } from './components/HunterPartyScreen';
import { SungJinwooSystemStatus } from './components/SungJinwooSystemStatus';
import { CitadelBazaarNPC } from './components/CitadelBazaarNPC';
import { StellarMap } from './components/StellarMap';
import { CombatCanvas } from './components/CombatCanvas';
import { CraftingWorkshop } from './components/CraftingWorkshop';
import { CodexLore } from './components/CodexLore';
import { GuildHall } from './components/GuildHall';

export const App: React.FC = () => {
  // Safe Zone & Association Lobby State
  const [safeZone, setSafeZone] = useState<SafeZoneState>(() => {
    try {
      const saved = localStorage.getItem('solo_leveling_safezone');
      return saved ? JSON.parse(saved) : { ...INITIAL_SAFE_ZONE_STATE, locationName: 'Korean Hunters Association Lobby' };
    } catch {
      return { ...INITIAL_SAFE_ZONE_STATE, locationName: 'Korean Hunters Association Lobby' };
    }
  });

  // Guild Estate State
  const [guild, setGuild] = useState<GuildEstate>(() => {
    try {
      const saved = localStorage.getItem('solo_leveling_guild');
      return saved ? JSON.parse(saved) : INITIAL_GUILD_ESTATE;
    } catch {
      return INITIAL_GUILD_ESTATE;
    }
  });

  // Player Inventory
  const [inventory, setInventory] = useState<PlayerInventory>(() => {
    try {
      const saved = localStorage.getItem('solo_leveling_inventory');
      return saved
        ? JSON.parse(saved)
        : {
            stardust: 50830, // Gold matching Screenshot 3
            astralPrisms: 1960, // Essence Stones matching Screenshot 3
            riftShards: 120,
            manaPotions: 8,
            goblinLeather: 50,
            golemAlloy: 45,
            manaCrystals: 60,
            alchemicalHerbs: 35,
            fairyDust: 30,
            spiritWood: 45,
            arrayRunes: ['Rune of Ironpeak Magma', 'Rune of Whispering Wood'],
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
        arrayRunes: ['Rune of Ironpeak Magma', 'Rune of Whispering Wood'],
        bountyTokens: 0,
        weapons: INITIAL_WEAPONS,
        relics: INITIAL_RELICS,
      };
    }
  });

  // Hunter Roster: Sung Jinwoo, Baek Yoonho, Lee Joohee, Cha Hae-In
  const [party, setParty] = useState<Character[]>(() => {
    try {
      const saved = localStorage.getItem('solo_leveling_party');
      return saved ? JSON.parse(saved) : INITIAL_CHARACTERS;
    } catch {
      return INITIAL_CHARACTERS;
    }
  });

  const [activeCharIndex, setActiveCharIndex] = useState<number>(0);
  const [inspectedHunterId, setInspectedHunterId] = useState<string>('jinwoo');

  // Dungeon Gates
  const [realms, setRealms] = useState<Realm[]>(() => {
    try {
      const saved = localStorage.getItem('solo_leveling_realms');
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

  useEffect(() => {
    try {
      localStorage.setItem('solo_leveling_safezone', JSON.stringify(safeZone));
      localStorage.setItem('solo_leveling_inventory', JSON.stringify(inventory));
      localStorage.setItem('solo_leveling_party', JSON.stringify(party));
      localStorage.setItem('solo_leveling_realms', JSON.stringify(realms));
    } catch {
      // ignore
    }
  }, [safeZone, inventory, party, realms]);

  const handleToggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Collect Activity Funds
  const handleCollectActivityFunds = () => {
    setInventory((prev) => ({
      ...prev,
      stardust: prev.stardust + 3850,
      astralPrisms: prev.astralPrisms + 50,
    }));
    setSystemToast('✦ Activity Funds Collected: +3,850 Gold & +50 Essence Stones!');
    setTimeout(() => setSystemToast(null), 4000);
  };

  // Allocate Attribute Point to Sung Jinwoo
  const handleAllocateAttribute = (charId: string, attr: keyof AttributeMatrix) => {
    setParty((prev) =>
      prev.map((c) =>
        c.id === charId
          ? {
              ...c,
              attributes: {
                ...c.attributes,
                [attr]: c.attributes[attr] + 1,
              },
              attack: attr === 'strength' ? c.attack + 12 : c.attack,
              defense: attr === 'endurance' ? c.defense + 6 : c.defense,
              hp: attr === 'endurance' ? c.hp + 40 : c.hp,
              maxHp: attr === 'endurance' ? c.maxHp + 40 : c.maxHp,
              speed: attr === 'agility' ? c.speed * 1.01 : c.speed,
            }
          : c
      )
    );
  };

  const handleInspectHunter = (charId: string) => {
    setInspectedHunterId(charId);
    if (charId === 'jinwoo') {
      setActiveTab('system');
    } else {
      setActiveTab('party');
    }
  };

  const handleSelectNode = (node: RealmNode) => {
    setActiveCombatNode(node);
    setActiveTab('combat');
  };

  const handleCombatVictory = (rewards: RealmNode['rewards']) => {
    if (!activeCombatNode) return;

    setInventory((prev) => ({
      ...prev,
      stardust: prev.stardust + rewards.stardust,
      astralPrisms: prev.astralPrisms + rewards.prisms,
      riftShards: prev.riftShards + rewards.shards,
      goblinLeather: prev.goblinLeather + (rewards.craftingMaterials?.goblinLeather || 0),
      golemAlloy: prev.golemAlloy + (rewards.craftingMaterials?.golemAlloy || 0),
      manaCrystals: prev.manaCrystals + (rewards.craftingMaterials?.manaCrystals || 0),
      alchemicalHerbs: prev.alchemicalHerbs + (rewards.craftingMaterials?.alchemicalHerbs || 0),
      spiritWood: prev.spiritWood + (rewards.craftingMaterials?.spiritWood || 0),
      fairyDust: prev.fairyDust + (rewards.craftingMaterials?.fairyDust || 0),
    }));

    // Grant EXP to Sung Jinwoo
    setParty((prev) =>
      prev.map((c) =>
        c.id === 'jinwoo'
          ? {
              ...c,
              exp: c.exp + 450,
              level: c.exp + 450 >= c.maxExp ? c.level + 1 : c.level,
              maxExp: c.exp + 450 >= c.maxExp ? Math.round(c.maxExp * 1.3) : c.maxExp,
            }
          : c
      )
    );

    setActiveCombatNode(null);
    setActiveTab('lobby');
    setSystemToast('🎉 Dungeon Purified! Rewards deposited to Inventory.');
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

  const jinwoo = party.find((c) => c.id === 'jinwoo') || party[0];

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
        {/* Screenshot 1: Association Lobby Hub */}
        {activeTab === 'lobby' && (
          <SoloLevelingHub
            inventory={inventory}
            party={party}
            safeZone={safeZone}
            onOpenSystemWindow={() => setActiveTab('system')}
            onOpenPartyScreen={() => setActiveTab('party')}
            onOpenDungeonGate={() => setActiveTab('dungeon')}
            onCollectActivityFunds={handleCollectActivityFunds}
          />
        )}

        {/* Guild Estate & Charter Vault */}
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

        {/* Screenshot 2: Hunter Party Strike Team */}
        {activeTab === 'party' && (
          <HunterPartyScreen
            party={party}
            inventory={inventory}
            onDeployParty={() => setActiveTab('dungeon')}
            onInspectHunter={handleInspectHunter}
            onReturnToLobby={() => setActiveTab('lobby')}
          />
        )}

        {/* Screenshot 3: Sung Jinwoo Player Status & Attribute Matrix */}
        {activeTab === 'system' && (
          <SungJinwooSystemStatus
            hunter={jinwoo}
            inventory={inventory}
            onAllocateAttribute={handleAllocateAttribute}
            onEquipWeapon={() => {}}
            onClose={() => setActiveTab('lobby')}
          />
        )}

        {/* Dungeon Gates Exploration */}
        {activeTab === 'dungeon' && (
          <StellarMap
            realms={realms}
            activeRealmId={activeRealmId}
            onSelectRealm={setActiveRealmId}
            onSelectNode={handleSelectNode}
          />
        )}

        {/* Fast-Paced Action Combat Canvas */}
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

        {/* Citadel Bazaar & Voice NPC */}
        {activeTab === 'bazaar' && (
          <CitadelBazaarNPC
            inventory={inventory}
            party={party}
            safeZone={safeZone}
            onBuyManaPotion={(cost) => {
              setInventory((prev) => ({
                ...prev,
                stardust: prev.stardust - cost,
                manaPotions: prev.manaPotions + 1,
              }));
              sound.playHit(true);
            }}
            onUnlockHiddenQuest={() => {
              setSystemToast('📜 Hidden Quest Unveiled in System Window!');
              setTimeout(() => setSystemToast(null), 4000);
            }}
          />
        )}

        {/* Weapon Workshop */}
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

        {/* Archives & Codex */}
        {activeTab === 'codex' && <CodexLore />}
      </main>
    </div>
  );
};
