export interface TransformData {
  position: { x: number; y: number; z: number };
  rotation: { y: number };
  animationState?: string;
  username?: string;
}

export interface AttackPayload {
  attackType: 'light_slash' | 'heavy_cleave' | 'whirlwind';
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
}

export interface DamagePayload {
  targetId: string;
  damageAmount: number;
}

export interface RemotePlayerData {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { y: number };
  animationState: string;
  hp?: number;
  maxHp?: number;
}

export type MultiplayerCallback = (eventType: string, payload: any) => void;

class MultiplayerSocketService {
  private socket: WebSocket | null = null;
  private callbacks: Set<MultiplayerCallback> = new Set();
  private localPlayerId: string | null = null;
  private isExplicitlyClosed = false;
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private lastTransformSent = 0;

  connect(onEvent?: MultiplayerCallback) {
    if (onEvent) {
      this.callbacks.add(onEvent);
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/game`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[MultiplayerSocket] Connected to 3D Game WebSocket Server at', wsUrl);
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INIT_WORLD') {
            this.localPlayerId = data.playerId;
          }

          this.callbacks.forEach((cb) => {
            try {
              cb(data.type, data);
            } catch (err) {
              console.error('[MultiplayerSocket] Error in callback handler:', err);
            }
          });
        } catch (err) {
          console.error('[MultiplayerSocket] Failed to parse message JSON:', err);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[MultiplayerSocket] Connection issue:', err);
      };

      this.socket.onclose = () => {
        this.socket = null;
        if (!this.isExplicitlyClosed) {
          const timeout = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
          this.reconnectAttempts++;
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            console.log(`[MultiplayerSocket] Reconnecting (attempt ${this.reconnectAttempts})...`);
            this.connect();
          }, timeout);
        }
      };
    } catch (err) {
      console.error('[MultiplayerSocket] Failed to create WebSocket connection:', err);
    }
  }

  sendTransform(transform: TransformData) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    // Throttle client network transforms to max 30 updates/sec (~33ms) to prevent saturating bandwidth
    const now = performance.now();
    if (now - this.lastTransformSent < 30) return;
    this.lastTransformSent = now;

    this.socket.send(
      JSON.stringify({
        type: 'PLAYER_MOVE',
        ...transform,
      })
    );
  }

  sendAttack(attackData: AttackPayload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'PLAYER_ATTACK',
          ...attackData,
        })
      );
    }
  }

  dealDamage(targetId: string, damageAmount: number) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'DEAL_DAMAGE',
          targetId,
          damageAmount,
        })
      );
    }
  }

  sendEmote(emote: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'PLAYER_EMOTE',
          emote,
        })
      );
    }
  }

  selectCharacter(characterId: string, celShadeColor?: number, position?: { x: number; y: number; z: number }) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'SELECT_CHARACTER',
          characterId,
          celShadeColor,
          position: position || { x: 0, y: 0, z: 0 },
        })
      );
    }
  }

  sendProjectile(projectileData: {
    origin: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
    projectileType?: string;
  }) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'FIRE_PROJECTILE',
          ...projectileData,
        })
      );
    }
  }

  sendSummonMinion(minionData: {
    minionId: string;
    position: { x: number; y: number; z: number };
    minionType?: string;
  }) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'SUMMON_MINION',
          ...minionData,
        })
      );
    }
  }

  unsubscribe(callback: MultiplayerCallback) {
    this.callbacks.delete(callback);
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  getMyPlayerId(): string | null {
    return this.localPlayerId;
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

export const multiplayerSocket = new MultiplayerSocketService();
