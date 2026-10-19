import { dungeonSynth, DungeonSynthMood } from './dungeonSynthService';

class SoundService {
  private isMuted: boolean = false;

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    dungeonSynth.setSfxMuted(this.isMuted);
    if (this.isMuted) {
      dungeonSynth.stop();
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    dungeonSynth.setSfxMuted(muted);
    if (this.isMuted) {
      dungeonSynth.stop();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public get synth() {
    return dungeonSynth;
  }

  public toggleDungeonSynth(mood?: DungeonSynthMood): boolean {
    if (this.isMuted) {
      this.isMuted = false;
      dungeonSynth.setSfxMuted(false);
    }
    return dungeonSynth.toggle();
  }

  public startDungeonSynth(mood?: DungeonSynthMood) {
    if (this.isMuted) {
      this.isMuted = false;
      dungeonSynth.setSfxMuted(false);
    }
    dungeonSynth.start(mood);
  }

  public stopDungeonSynth() {
    dungeonSynth.stop();
  }

  // --- ANIME PROCEDURAL SFX TRIGGERS ---

  public playClick() {
    if (this.isMuted) return;
    dungeonSynth.playUiClick();
  }

  public playTabSwitch() {
    if (this.isMuted) return;
    dungeonSynth.playTabSwitch();
  }

  public playHit(isCrit?: boolean) {
    if (this.isMuted) return;
    dungeonSynth.playCombatHit(isCrit);
  }

  public playSlash() {
    if (this.isMuted) return;
    dungeonSynth.playCombatHit(false);
  }

  public playVictory() {
    if (this.isMuted) return;
    dungeonSynth.playLevelUpOrStatAllocate();
  }

  public playLevelUp() {
    if (this.isMuted) return;
    dungeonSynth.playLevelUpOrStatAllocate();
  }

  public playLootRoll() {
    if (this.isMuted) return;
    dungeonSynth.playLevelUpOrStatAllocate();
  }

  public playSkill(type?: 'wind' | 'earth' | 'fire' | 'dark' | 'buff' | 'burst') {
    if (this.isMuted) return;
    if (type === 'burst' || type === 'buff') {
      dungeonSynth.playLevelUpOrStatAllocate();
    } else {
      dungeonSynth.playCombatHit(true);
    }
  }

  public playSynergyCombo(_element1: string, _element2: string) {
    if (this.isMuted) return;
    dungeonSynth.playRuneSocket();
  }

  public playCraft() {
    if (this.isMuted) return;
    dungeonSynth.playForgeAnvilStrike();
  }

  public playForgeAnvilStrike() {
    if (this.isMuted) return;
    dungeonSynth.playForgeAnvilStrike();
  }

  public playTeleport() {
    if (this.isMuted) return;
    dungeonSynth.playRuneSocket();
  }

  public playRuneSocket() {
    if (this.isMuted) return;
    dungeonSynth.playRuneSocket();
  }

  public playPortalActivate() {
    if (this.isMuted) return;
    dungeonSynth.playPortalActivate();
  }

  public playAegisShield() {
    if (this.isMuted) return;
    dungeonSynth.playAegisShield();
  }

  public playTrapTrigger() {
    if (this.isMuted) return;
    dungeonSynth.playCombatHit(false);
  }

  public playBossRoar() {
    if (this.isMuted) return;
    dungeonSynth.playCombatHit(true);
  }

  public playCraftSuccess() {
    if (this.isMuted) return;
    dungeonSynth.playForgeAnvilStrike();
  }

  public playCraftFail() {
    if (this.isMuted) return;
    dungeonSynth.playCombatHit(false);
  }

  public playArmorBreak() {
    if (this.isMuted) return;
    dungeonSynth.playCombatHit(true);
  }

  public playSynergyTempest() {
    if (this.isMuted) return;
    dungeonSynth.playPortalActivate();
  }

  public playWindGust() {
    if (this.isMuted) return;
    dungeonSynth.playUiClick();
  }

  public playHammerSmash() {
    if (this.isMuted) return;
    dungeonSynth.playForgeAnvilStrike();
  }

  public playNodeSelect() {
    if (this.isMuted) return;
    dungeonSynth.playUiClick();
  }

  public playDungeonEnter() {
    if (this.isMuted) return;
    dungeonSynth.playRuneSocket();
  }

  public playBossClear() {
    if (this.isMuted) return;
    dungeonSynth.playLevelUpOrStatAllocate();
  }
}

export const sound = new SoundService();
export default sound;
