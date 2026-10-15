# Aethelgard Online (Astral Rift)

> Master Game Design Document & Developer Implementation Blueprint (Edition: v2.0 Master)  
> Engine: Unreal Engine 5 (Cel-Shaded PBR) | Genre: Non-Protagonist Open-World MMORPG  
> Merged from commit: `759d029bcc44f9ec3e286d7b0abd431b981e9a23` (keshoraobawankar-cloud/astral-rift)

An anime-style action and fantasy MMORPG featuring fast-paced combat, multi-tier continental realms, living dungeon ecology, and high-energy party synergies.

---

## Core Systems & Architecture

1. **The Multi-Tier Continental Realms**
   - **Tier 1 — The Cradle of Aether (120 km² Seamless Map)**: Six ecological biomes:
     - Central Citadel Plaza (Safe-Zone Sanctuary)
     - Whispering Emerald Forests (Elven homelands)
     - Ironpeak Calderas (Dwarven volcanic forge-mountains)
     - Luminous Sylph Meadows (Fairy glades)
     - Shattered Badlands (Open wilderness & PvP)
     - Sunken Ruins (Subterranean abyss)
   - **Tier 2 — The Floating Expanse**: Suspended sky-continents above the mana vortex, low-gravity agility (+50% jump/dodge distance), elemental tempests, and pure mana veins.

2. **Safe Zones, Wilderness PvP & The Inn Logout Rule (Feature A)**
   - **Arcane Aegis Domes**: Inside city boundaries, an absolute No-Combat Field disables weapon hitboxes and sets incoming damage multipliers to `0.0`.
   - **Wilderness Danger & Infamy**: Open PvP, monster ambushes, Infamy Points, and automated city-gate arcane ballistas.
   - **Campfire & Inn Logout**:
     - *Inn / Campfire Save*: Awards a 2-hour **Well-Rested EXP Multiplier (+100% EXP)**.
     - *Wilderness Disconnect*: Leaves the avatar in an **`ExhaustedSleeper_AI`** state for a 300-second (5-minute) vulnerability countdown before despawning.

3. **Ancient Teleportation Arrays (Feature B)**
   - Planar Teleportation Array Altar requiring 4 boss activation runes:
     - Rune of Ironpeak Magma
     - Rune of Whispering Wood
     - Rune of the Golem Core
     - Rune of the Sunken Crypt
   - Triggers an animated Niagara-style interlocking arcane rings particle sequence to bridge and stream Tier 2.

4. **Voice & AI NPC System + Dynamic Hidden Quests (Feature C)**
   - **Speech-to-Text (STT)**: Push-to-Talk microphone voice capture via Web Speech API.
   - **LLM Context & Memory Profile**: Injected JSON state containing `Player_Infamy_Score`, `Past_Transactions`, `Player_Race`, `Reputation`, and `Local_Rumors`.
   - **Text-to-Speech (TTS)**: Spoken replies synthesized with customized racial voice pitches for Broman Ironfist, Arch-Mage Lyra, and Grimm the Vault Master.
   - **Hidden Quests**: Zero map markers, triggered dynamically by probing rumors.

5. **Mana, Agility & Potion Toxicity Combat Engine (Feature D)**
   - **Agility Scaling Formulas**:
     - `Dodge I-Frames (ms) = 200 + (Agility × 1.5)`
     - `Movement Speed = BaseSpeed × (1 + 0.002 × Agility)`
   - **Potion Toxicity Meter**: 0 to 100 decaying at 2 points/sec. Each mana potion adds +35 Toxicity. Exceeding 100 triggers the **Mana Sickness** debuff (-30% Agility, +50% spell mana cost for 20s).
   - **Cross-Race Combo Links**:
     - Elven *Wind Gale* applies `Status.Primed.Wind`.
     - Dwarven *Earth Shatter* within 3s triggers **`Combo.DustTempest`** (+350% bonus AoE damage and stagger).
     - Fairies project light aura rings to reset dodge cooldowns.

6. **30 World Bosses & Living Dungeon Ecology (Feature E)**
   - 15-minute (900s) Enrage Timer with `Enrage_WeatherShift` lightning storm events.
   - Golems with destructible runic armor plates harvestable with Dwarven blunt weapons.
   - Goblins with narrow tunnel tripwires and potion theft tactics.
   - Undead with Mana Drain auras.
   - Mimics exposed by Fairy high-perception scouting.
   - D100 personal roll (*Need / Greed / Pass*) and Master Loot systems.

7. **Dynamic 6-Player Strike Team Roster**
   - Elurien Moonwhisper (High Elf Arcane Sorceress • Aether Attunement)
   - Thorgar Stonehammer (Dwarven Forge Vanguard • Rune Forging & Grit)
   - Faelin Brightwing (Fairy Luminary & Scout • Glide & Sylph Resonance)
   - Kaelen Clawstride (Beastkin Shadow-Prowler • Adaptability)
   - Astraea Sol (Human Dawn Sovereign Paladin • Solar Consecration)
   - Valen Windstrider (High Elf Wind Ranger with recurve bow)
   - Open Attribute Matrix allocation: Strength, Agility, Intelligence, Endurance, Perception.

8. **Guild Estates & Racial Workshops**
   - Guild Estates with private spawn points, shared storage vaults, and charter tiers.
   - Specialized workshops (+5% Dwarven forge speed, +10% Elven mana regen).
   - Dwarven tempering with golem alloys and Elven arcane weaving with fairy dust and spirit wood.
