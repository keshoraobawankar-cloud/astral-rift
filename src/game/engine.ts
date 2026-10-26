// Game Engine Performance & VFX Core with 60+ FPS Delta-Time Scaling
export interface EngineParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  decay?: number;
}

export interface EngineFloatingText {
  text: string;
  x: number;
  y: number;
  alpha: number;
  color: string;
  vy: number;
  size?: number;
  isCrit?: boolean;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastTime: number;
  particles: EngineParticle[];
  floatingTexts: EngineFloatingText[];
  screenShakeTimer: number;
  screenShakeIntensity: number;
  screenShakeDuration: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context from canvas');
    this.ctx = context;
    this.lastTime = performance.now();
    this.particles = [];
    this.floatingTexts = [];
    this.screenShakeTimer = 0;
    this.screenShakeIntensity = 0;
    this.screenShakeDuration = 0;
  }

  triggerScreenShake(duration = 200, intensity = 6) {
    this.screenShakeTimer = duration;
    this.screenShakeDuration = duration;
    this.screenShakeIntensity = intensity;
  }

  getScreenShakeOffset(): { x: number; y: number } {
    if (this.screenShakeTimer <= 0) return { x: 0, y: 0 };
    const progress = this.screenShakeTimer / (this.screenShakeDuration || 1);
    const currentIntensity = this.screenShakeIntensity * progress;
    return {
      x: (Math.random() - 0.5) * currentIntensity * 2,
      y: (Math.random() - 0.5) * currentIntensity * 2,
    };
  }

  spawnParticleBurst(x: number, y: number, color = '#a855f7', count = 18, speedMult = 1.0) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4 + 2) * speedMult;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        color,
        size: Math.random() * 3.5 + 2,
        decay: Math.random() * 0.015 + 0.018,
      });
    }
  }

  addFloatingText(text: string, x: number, y: number, color = '#facc15', isCrit = false) {
    this.floatingTexts.push({
      text,
      x,
      y,
      alpha: 1.0,
      color,
      vy: isCrit ? -2.2 : -1.6,
      size: isCrit ? 20 : 15,
      isCrit,
    });
  }

  update(dt: number) {
    // Normalise dt (in ms or seconds)
    const deltaSeconds = dt > 1 ? dt / 1000 : dt;
    const frameScale = Math.min(deltaSeconds * 60, 3.0);

    // Update particles smoothly with delta time
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * frameScale;
      p.y += p.vy * frameScale;
      p.alpha -= (p.decay || 0.02) * frameScale;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating combat numbers
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * frameScale;
      ft.alpha -= 0.016 * frameScale;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer -= (dt > 1 ? dt : dt * 1000);
      if (this.screenShakeTimer < 0) this.screenShakeTimer = 0;
    }
  }

  render() {
    this.ctx.save();
    if (this.screenShakeTimer > 0) {
      const offset = this.getScreenShakeOffset();
      this.ctx.translate(offset.x, offset.y);
    }

    // Render particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      this.ctx.save();
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 6;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Render floating combat text
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const ft = this.floatingTexts[i];
      this.ctx.save();
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = Math.max(0, Math.min(1, ft.alpha));
      this.ctx.font = ft.isCrit
        ? 'bold 20px "Cinzel", serif, sans-serif'
        : 'bold 15px "Rajdhani", sans-serif';
      this.ctx.shadowColor = 'rgba(0,0,0,0.85)';
      this.ctx.shadowBlur = 4;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }

    this.ctx.restore();
  }
}
