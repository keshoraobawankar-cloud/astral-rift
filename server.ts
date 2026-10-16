import express, { Request, Response, NextFunction } from 'express';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aethelgard_anti_cheat_jwt_master_secret_key_2026';
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY || 'aethelgard_refresh_master_secret_key_2026';

app.use(express.json());

// ============================================================================
// BASE ATTRIBUTE RULES & ANTI-CHEAT ENGINE CONFIGURATION
// ============================================================================
export const BASE_STATS: Record<string, number> = {
  strength: 20,
  agility: 20,
  vitality: 20,
  intelligence: 10,
  perception: 10,
};

export const MAX_STAT_CAP = 200;
export const DEFAULT_STARTING_POOL = 15;

interface UserRecord {
  playerId: string;
  username: string;
  password: string; // bcrypt hash
  createdAt: string;
}

interface StoredCharacterRecord {
  playerId: string;
  characterId: string;
  stats: {
    strength: number;
    agility: number;
    vitality: number;
    intelligence: number;
    perception: number;
  };
  availablePoints: number;
  totalEarnedPoints: number;
  totalPower: number;
  updatedAt: string;
}

interface AuditLogEntry {
  auditId: string;
  playerId: string;
  status: 'VERIFIED_SUCCESS' | 'CHEATING_BLOCKED' | 'BOUNDS_ERROR' | 'AUTH_ERROR';
  reason: string;
  spentPoints: number;
  submittedPool: number;
  expectedEarned: number;
  timestamp: string;
}

// In-Memory Database collections
const usersDatabase: UserRecord[] = [];

// Seed default hunter demo account (password: "hunter2026")
const defaultHashedPassword = bcrypt.hashSync('hunter2026', 10);
usersDatabase.push({
  playerId: 'player_123_abc',
  username: 'hunter_monarch',
  password: defaultHashedPassword,
  createdAt: new Date().toISOString(),
});

const characterDatabase: Record<string, StoredCharacterRecord> = {
  'player_123_abc': {
    playerId: 'player_123_abc',
    characterId: 'elurien',
    stats: { ...BASE_STATS } as any,
    availablePoints: DEFAULT_STARTING_POOL,
    totalEarnedPoints: DEFAULT_STARTING_POOL,
    totalPower: Math.floor(20 * 35 + 20 * 30 + 20 * 25 + 10 * 20 + 10 * 30),
    updatedAt: new Date().toISOString(),
  },
};

const auditLogs: AuditLogEntry[] = [];

// Helper: Calculate dynamic Total Power using Solo Leveling attribute formula
function calculateTotalPower(stats: Record<string, number>): number {
  return Math.floor(
    (stats.strength || 20) * 35 +
    (stats.agility || 20) * 30 +
    (stats.vitality || 20) * 25 +
    (stats.intelligence || 10) * 20 +
    (stats.perception || 10) * 30
  );
}

// Extend Request type to include decoded user
interface AuthenticatedRequest extends Request {
  user?: {
    playerId: string;
    username?: string;
    role?: string;
    iat?: number;
    exp?: number;
  };
}

// ============================================================================
// JWT AUTHENTICATION MIDDLEWARE
// Returns 401 on missing or expired token so Axios interceptor triggers refresh
// ============================================================================
const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  // Expecting header format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No JWT authorization token provided in Bearer header.',
    });
  }

  try {
    const verifiedUser = jwt.verify(token, JWT_SECRET) as { playerId: string; username?: string };
    req.user = verifiedUser;
    next();
  } catch {
    auditLogs.unshift({
      auditId: `audit_${Date.now()}`,
      playerId: 'unknown',
      status: 'AUTH_ERROR',
      reason: 'Cryptographic JWT signature verification failed or token expired.',
      spentPoints: 0,
      submittedPool: 0,
      expectedEarned: 0,
      timestamp: new Date().toISOString(),
    });
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Authentication required.',
    });
  }
};

// ============================================================================
// 1. REGISTRATION ENDPOINT (Bcrypt Password Hashing)
// ============================================================================
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { playerId = `player_${Date.now().toString(36)}`, username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const existing = usersDatabase.find((u) => u.username === username);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Username is already registered.' });
    }

    // Hash the player's password with bcrypt (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    usersDatabase.push({
      playerId,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    });

    // Initialize character attributes record in database
    characterDatabase[playerId] = {
      playerId,
      characterId: 'elurien',
      stats: { ...BASE_STATS } as any,
      availablePoints: DEFAULT_STARTING_POOL,
      totalEarnedPoints: DEFAULT_STARTING_POOL,
      totalPower: calculateTotalPower(BASE_STATS),
      updatedAt: new Date().toISOString(),
    };

    return res.status(201).json({
      success: true,
      message: 'User registered successfully with bcrypt password hash.',
      playerId,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Internal registration server error.' });
  }
});

// ============================================================================
// 2. LOGIN ENDPOINT (Issues Short-Lived Access Token + Long-Lived Refresh Token)
// ============================================================================
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    // Find user in database
    const user = usersDatabase.find((u) => u.username === username);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    // Verify password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    // Short-lived Access Token (15 min) & Long-lived Refresh Token (7 days)
    const tokenPayload = {
      playerId: user.playerId,
      username: user.username,
      role: 'hunter_expedition_leader',
    };
    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(
      { playerId: user.playerId, username: user.username },
      REFRESH_SECRET_KEY,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful! JWT authorization granted.',
      token: accessToken,
      access_token: accessToken,
      refresh_token: refreshToken,
      playerId: user.playerId,
      username: user.username,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal login server error.' });
  }
});

// ============================================================================
// 3. REFRESH TOKEN ENDPOINT
// ============================================================================
app.post('/api/auth/refresh', (req: Request, res: Response) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(401).json({ success: false, error: 'Refresh token missing.' });
  }

  try {
    // Verify refresh token using secret key
    const decoded = jwt.verify(refresh_token, REFRESH_SECRET_KEY) as { playerId: string; username: string };

    // Issue new short-lived access token
    const newAccessToken = jwt.sign(
      { playerId: decoded.playerId, username: decoded.username, role: 'hunter_expedition_leader' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const newRefreshToken = jwt.sign(
      { playerId: decoded.playerId, username: decoded.username },
      REFRESH_SECRET_KEY,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      access_token: newAccessToken,
      token: newAccessToken,
      refresh_token: newRefreshToken,
      new_refresh_token: newRefreshToken,
    });
  } catch {
    return res.status(403).json({ success: false, error: 'Invalid or expired refresh token.' });
  }
});

// Quick token generation for dev / guest access
app.post('/api/auth/token', (req: Request, res: Response) => {
  const { playerId = 'player_123_abc', username = 'hunter_monarch' } = req.body;
  const tokenPayload = { playerId, username, role: 'hunter_expedition_leader' };
  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ playerId, username }, REFRESH_SECRET_KEY, { expiresIn: '7d' });

  if (!characterDatabase[playerId]) {
    characterDatabase[playerId] = {
      playerId,
      characterId: 'elurien',
      stats: { ...BASE_STATS } as any,
      availablePoints: DEFAULT_STARTING_POOL,
      totalEarnedPoints: DEFAULT_STARTING_POOL,
      totalPower: calculateTotalPower(BASE_STATS),
      updatedAt: new Date().toISOString(),
    };
  }

  return res.json({
    success: true,
    token: accessToken,
    access_token: accessToken,
    refresh_token: refreshToken,
    playerId,
    username,
    message: 'Fast JWT token generated for guest hunter session.',
  });
});

// ============================================================================
// 3. PROTECTED STAT VALIDATION ROUTE (Guarded by verifyToken Middleware)
// ============================================================================
app.post('/api/character/validate-and-save', verifyToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    // req.user.playerId is securely extracted from the verified token
    const playerId = req.user?.playerId || 'player_123_abc';
    const { new_stats, newStats, available_points, availablePoints: altAvailablePoints, characterId = 'elurien' } = req.body;

    const submittedStats = new_stats || newStats;
    const submittedPool = typeof available_points === 'number' ? available_points : altAvailablePoints;

    if (!submittedStats || typeof submittedPool !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload: stats object and available_points are required.',
      });
    }

    // 1. Fetch official record from trusted database
    let dbRecord = characterDatabase[playerId];
    if (!dbRecord) {
      dbRecord = {
        playerId,
        characterId,
        stats: { ...BASE_STATS } as any,
        availablePoints: DEFAULT_STARTING_POOL,
        totalEarnedPoints: DEFAULT_STARTING_POOL,
        totalPower: calculateTotalPower(BASE_STATS),
        updatedAt: new Date().toISOString(),
      };
      characterDatabase[playerId] = dbRecord;
    }

    const totalEarnedPoints = dbRecord.totalEarnedPoints;
    let calculatedSpentPoints = 0;

    // 2. Check individual stat caps and minimums
    for (const [stat, baseVal] of Object.entries(BASE_STATS)) {
      const val = submittedStats[stat];
      if (typeof val !== 'number') {
        return res.status(400).json({
          success: false,
          error: `Invalid stat field: missing ${stat}`,
        });
      }

      if (val < baseVal) {
        const errorMsg = `Anti-Cheat Alert: Stat ${stat} (${val}) cannot be decreased below base value (${baseVal}).`;
        auditLogs.unshift({
          auditId: `audit_${Date.now()}`,
          playerId,
          status: 'BOUNDS_ERROR',
          reason: errorMsg,
          spentPoints: 0,
          submittedPool,
          expectedEarned: totalEarnedPoints,
          timestamp: new Date().toISOString(),
        });
        return res.status(400).json({ success: false, error: errorMsg });
      }

      if (val > MAX_STAT_CAP) {
        const errorMsg = `Anti-Cheat Alert: Stat ${stat} (${val}) out of allowable bounds (max ${MAX_STAT_CAP}).`;
        auditLogs.unshift({
          auditId: `audit_${Date.now()}`,
          playerId,
          status: 'BOUNDS_ERROR',
          reason: errorMsg,
          spentPoints: 0,
          submittedPool,
          expectedEarned: totalEarnedPoints,
          timestamp: new Date().toISOString(),
        });
        return res.status(400).json({ success: false, error: errorMsg });
      }

      calculatedSpentPoints += val - baseVal;
    }

    // 3. Verify total balance matches earned pool: sum(CurrentStat - BaseStat) + RemainingAvailable = TotalEarned
    if (calculatedSpentPoints + submittedPool !== totalEarnedPoints) {
      const errorMsg = `Cheating detected: Point pool mismatch. Spent (${calculatedSpentPoints}) + Available (${submittedPool}) !== Total Earned (${totalEarnedPoints}).`;
      auditLogs.unshift({
        auditId: `audit_${Date.now()}`,
        playerId,
        status: 'CHEATING_BLOCKED',
        reason: errorMsg,
        spentPoints: calculatedSpentPoints,
        submittedPool,
        expectedEarned: totalEarnedPoints,
        timestamp: new Date().toISOString(),
      });
      return res.status(403).json({
        success: false,
        error: errorMsg,
        antiCheatCode: 'ERR_POINT_POOL_EXPLOIT',
        calculatedSpent: calculatedSpentPoints,
        submittedPool,
        expectedEarned: totalEarnedPoints,
      });
    }

    // 4. Commit securely to database
    const totalPower = calculateTotalPower(submittedStats);
    dbRecord.stats = { ...submittedStats };
    dbRecord.availablePoints = submittedPool;
    dbRecord.totalPower = totalPower;
    dbRecord.updatedAt = new Date().toISOString();

    auditLogs.unshift({
      auditId: `audit_${Date.now()}`,
      playerId,
      status: 'VERIFIED_SUCCESS',
      reason: 'JWT and point pool equation verified successfully.',
      spentPoints: calculatedSpentPoints,
      submittedPool,
      expectedEarned: totalEarnedPoints,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: `Attributes verified and saved for verified player: ${playerId}`,
      stats: dbRecord.stats,
      availablePoints: dbRecord.availablePoints,
      totalPower,
      totalEarnedPoints,
      jwtVerified: true,
      timestamp: dbRecord.updatedAt,
      verificationToken: `AETHEL_SIG_${Date.now().toString(36).toUpperCase()}`,
    });
  } catch (err: any) {
    console.error('Server validation error:', err);
    return res.status(500).json({ success: false, error: 'Internal server validation error.' });
  }
});

// Backward-compatible endpoint: /api/character/update-stats
app.post('/api/character/update-stats', (req: Request, res: Response) => {
  const { playerId = 'player_123_abc', stats, availablePoints } = req.body;
  if (!characterDatabase[playerId]) {
    characterDatabase[playerId] = {
      playerId,
      characterId: 'elurien',
      stats: { ...BASE_STATS } as any,
      availablePoints: DEFAULT_STARTING_POOL,
      totalEarnedPoints: DEFAULT_STARTING_POOL,
      totalPower: calculateTotalPower(BASE_STATS),
      updatedAt: new Date().toISOString(),
    };
  }

  const record = characterDatabase[playerId];
  record.stats = { ...stats };
  record.availablePoints = availablePoints;
  record.totalPower = calculateTotalPower(stats);
  record.updatedAt = new Date().toISOString();

  return res.json({
    success: true,
    message: 'Attributes successfully saved!',
    data: record,
  });
});

// Fetch saved stats
app.get('/api/character/stats/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;
  const record = characterDatabase[playerId] || characterDatabase['player_123_abc'];
  return res.json({ success: true, record });
});

// Fetch anti-cheat audit logs
app.get('/api/character/audit-logs', (_req: Request, res: Response) => {
  return res.json({ success: true, logs: auditLogs.slice(0, 20) });
});

// ============================================================================
// REDIS IN-MEMORY STATE STORE & ASYNCHRONOUS WRITE-BEHIND BUFFER
// ============================================================================
class InMemoryRedis {
  private store = new Map<string, string>();
  private hashes = new Map<string, Map<string, string>>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async set(key: string, val: string): Promise<'OK'> {
    this.store.set(key, val);
    return 'OK';
  }
  async del(key: string): Promise<number> {
    const deleted = this.store.delete(key) ? 1 : 0;
    this.hashes.delete(key);
    return deleted;
  }
  async hset(key: string, field: string, val: string): Promise<number> {
    if (!this.hashes.has(key)) this.hashes.set(key, new Map());
    this.hashes.get(key)!.set(field, val);
    return 1;
  }
  async hget(key: string, field: string): Promise<string | null> {
    return this.hashes.get(key)?.get(field) ?? null;
  }
  async hgetall(key: string): Promise<Record<string, string>> {
    const map = this.hashes.get(key);
    if (!map) return {};
    return Object.fromEntries(map.entries());
  }
  async hdel(key: string, field: string): Promise<number> {
    return this.hashes.get(key)?.delete(field) ? 1 : 0;
  }
}
export const redis = new InMemoryRedis();

// Buffer for debounced database persistence
const writeBehindBuffer = new Map<string, Partial<PlayerProfileRecord> & { timestamp: number }>();
let lastFlushTime = Date.now();
const PERSISTENCE_FLUSH_INTERVAL = 10000; // 10s debounced flush

export function queuePlayerStateSave(playerId: string, state: Partial<PlayerProfileRecord>) {
  const existing = writeBehindBuffer.get(playerId) || { timestamp: Date.now() };
  writeBehindBuffer.set(playerId, { ...existing, ...state, timestamp: Date.now() });
}

export function flushWriteBehindBuffer() {
  if (writeBehindBuffer.size === 0) return;
  const count = writeBehindBuffer.size;
  writeBehindBuffer.forEach((updates, pId) => {
    const profile = playerProfiles[pId] || playerProfiles['player_123_abc'];
    if (profile) {
      if (typeof updates.gold === 'number') profile.gold = updates.gold;
      if (typeof updates.essence === 'number') profile.essence = updates.essence;
      if (Array.isArray(updates.inventory)) profile.inventory = updates.inventory;
      if (updates.safeZone) profile.safeZone = updates.safeZone;
      profile.updatedAt = new Date().toISOString();
    }
  });
  writeBehindBuffer.clear();
  lastFlushTime = Date.now();
  console.log(`[Persistence Worker] Flushed write-behind buffer (${count} profiles synchronized).`);
}

setInterval(flushWriteBehindBuffer, PERSISTENCE_FLUSH_INTERVAL);

// ============================================================================
// 4. PLAYER STATE SYNC & SAFE-ZONE ENDPOINTS (Decoupled Persistence)
// ============================================================================
interface PlayerProfileRecord {
  id: string;
  username?: string;
  gold: number;
  essence: number;
  inventory: any[];
  safeZone?: any;
  updatedAt: string;
}

const playerProfiles: Record<string, PlayerProfileRecord> = {
  'player_123_abc': {
    id: 'player_123_abc',
    username: 'hunter_monarch',
    gold: 50830,
    essence: 1960,
    inventory: [
      { id: 'health_potion', name: 'Health Potion', quantity: 5 },
      { id: 'mana_potion', name: 'Elven Mana Flask', quantity: 8 },
    ],
    safeZone: {
      bIsInSafeZone: true,
      locationName: 'Citadel of Oakhaven (Safe-Zone)',
      isRestingInInn: false,
      wellRestedExpMultiplierActive: false,
    },
    updatedAt: new Date().toISOString(),
  },
};

app.post('/api/player/sync', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    let playerId = 'player_123_abc';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded?.playerId) playerId = decoded.playerId;
      } catch {
        // guest fallback
      }
    }

    const { gold, essence, inventory, safeZone, currentZone, username } = req.body;
    let profile = playerProfiles[playerId];
    if (!profile) {
      profile = {
        id: playerId,
        username: username || 'hunter_monarch',
        gold: typeof gold === 'number' ? gold : 50830,
        essence: typeof essence === 'number' ? essence : 1960,
        inventory: Array.isArray(inventory) ? inventory : [],
        safeZone: safeZone || {
          bIsInSafeZone: true,
          locationName: currentZone || 'Citadel Plaza',
          isRestingInInn: false,
          wellRestedExpMultiplierActive: false,
        },
        updatedAt: new Date().toISOString(),
      };
      playerProfiles[playerId] = profile;
    } else {
      if (typeof gold === 'number') profile.gold = gold;
      if (typeof essence === 'number') profile.essence = essence;
      if (Array.isArray(inventory)) profile.inventory = inventory;
      if (safeZone) {
        profile.safeZone = safeZone;
      } else if (currentZone) {
        profile.safeZone = { ...(profile.safeZone || {}), locationName: currentZone };
      }
      profile.updatedAt = new Date().toISOString();
    }

    // Decouple persistence: enqueue into write-behind buffer
    queuePlayerStateSave(playerId, { gold, essence, inventory, safeZone: profile.safeZone });

    return res.status(200).json({
      success: true,
      message: 'Player state synchronized and buffered asynchronously',
      profile,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Sync failed' });
  }
});

app.get('/api/player/sync', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  let playerId = 'player_123_abc';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded?.playerId) playerId = decoded.playerId;
    } catch {
      // guest fallback
    }
  }

  const profile = playerProfiles[playerId] || playerProfiles['player_123_abc'];
  return res.status(200).json({ success: true, profile });
});

// Inn Safe-Zone Resting & Logout
app.post('/api/player/safe-zone/inn-logout', (req: Request, res: Response) => {
  const { playerId = 'player_123_abc', gold, essence } = req.body;
  const profile = playerProfiles[playerId] || playerProfiles['player_123_abc'];
  if (typeof gold === 'number') profile.gold = gold;
  if (typeof essence === 'number') profile.essence = essence;

  const safeZone = {
    bIsInSafeZone: true,
    locationName: 'Citadel of Oakhaven (Safe-Zone)',
    isRestingInInn: true,
    wellRestedExpMultiplierActive: true,
    wellRestedTimerSeconds: 7200,
    isSleepingInWilderness: false,
    exhaustedSleeperTimer: 0,
  };
  profile.safeZone = safeZone;
  profile.updatedAt = new Date().toISOString();

  return res.status(200).json({
    success: true,
    message: 'Safe-Zone Inn resting verified! +2-hour Well-Rested EXP Multiplier (+100% EXP) active.',
    safeZone,
    profile,
  });
});

// Wilderness Disconnect
app.post('/api/player/safe-zone/wilderness-disconnect', (req: Request, res: Response) => {
  const { playerId = 'player_123_abc', locationName = 'Shattered Badlands (Wilderness PvP Active)' } = req.body;
  const profile = playerProfiles[playerId] || playerProfiles['player_123_abc'];

  const safeZone = {
    bIsInSafeZone: false,
    locationName,
    isRestingInInn: false,
    wellRestedExpMultiplierActive: false,
    isSleepingInWilderness: true,
    exhaustedSleeperTimer: 300,
  };
  profile.safeZone = safeZone;
  profile.updatedAt = new Date().toISOString();

  return res.status(200).json({
    success: true,
    message: 'Wilderness disconnect recorded: Avatar remains vulnerable ExhaustedSleeper for 300 seconds.',
    safeZone,
    profile,
  });
});

// ============================================================================
// MOUNT VITE MIDDLEWARE IN DEV OR STATIC IN PROD
// ============================================================================
async function start() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const httpServer = createHttpServer(app);

  // ============================================================================
  // MULTIPLAYER WEBSOCKET SERVICES (/ws/chat and /ws/game)
  // Authoritative 20 TPS Engine with Distance Verification & Cooldowns
  // ============================================================================
  const wssChat = new WebSocketServer({ noServer: true });
  const wssGame = new WebSocketServer({ noServer: true });

  // 1. Chat WebSocket Handler
  const chatClients = new Set<WebSocket>();
  wssChat.on('connection', (ws: WebSocket) => {
    chatClients.add(ws);
    console.log('[WebSocket] New player connected to /ws/chat');

    ws.send(
      JSON.stringify({
        type: 'CHAT_MESSAGE',
        sender: 'Citadel Gatekeeper',
        text: 'Connected to Citadel Live Communications Relay.',
        timestamp: new Date().toISOString(),
      })
    );

    ws.on('message', (data: any) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === 'CHAT_MESSAGE') {
          const payload = JSON.stringify({
            type: 'CHAT_MESSAGE',
            sender: parsed.sender || 'Anonymous',
            text: parsed.text,
            timestamp: new Date().toISOString(),
          });

          chatClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          });
        }
      } catch (err) {
        console.error('Invalid Chat WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      chatClients.delete(ws);
      console.log('[WebSocket] Player disconnected from chat');
    });
  });

  // 2. Authoritative 3D Multiplayer Game & Combat Engine
  const TICK_RATE = 20; // 20 updates per second (50ms per tick)
  const FRAME_TIME = 1000 / TICK_RATE;

  interface EquippedWeapon {
    type: string;
    damageBonus: number;
  }

  interface InventoryItem {
    type: string;
    count: number;
    rarity?: string;
  }

  interface AuthoritativePlayer {
    ws: WebSocket;
    id: string;
    username: string;
    x: number;
    y: number;
    z: number;
    rotation: number;
    animationState: string;
    hp: number;
    maxHp: number;
    inventory: InventoryItem[];
    equippedWeapon: EquippedWeapon | null;
    isAttacking: boolean;
    lastAttackTime: number;
    lastUpdated: number;
    characterId?: string;
    celShadeColor?: number;
  }

  interface WorldItem {
    id: string;
    type: string;
    x: number;
    y: number;
    z: number;
    count: number;
  }

  const worldItems = new Map<string, WorldItem>();

  function spawnWorldDrop(x: number, z: number, itemType = 'Health Potion') {
    const itemId = `item_${Math.random().toString(36).substring(2, 9)}`;
    worldItems.set(itemId, {
      id: itemId,
      type: itemType,
      x: Number(x.toFixed(2)),
      y: 0.5,
      z: Number(z.toFixed(2)),
      count: 1,
    });
    console.log(`[Loot Engine] Spawned ${itemType} drop at (${x.toFixed(1)}, ${z.toFixed(1)})`);
  }

  // Pre-seed ambient item drops in sanctuary
  spawnWorldDrop(12, 10, 'Health Potion');
  spawnWorldDrop(-14, 8, 'Iron Greatsword');
  spawnWorldDrop(8, -16, 'Kasaka Dagger');

  interface ServerMonster {
    id: string;
    name: string;
    type: string;
    level: number;
    x: number;
    y: number;
    z: number;
    homeX: number;
    homeZ: number;
    hp: number;
    maxHp: number;
    state: 'IDLE' | 'CHASE' | 'ATTACK' | 'DEAD';
    targetPlayerId: string | null;
    lastAttackTime: number;
    respawnTimer: number;
    role: string;
  }

  const players = new Map<string, AuthoritativePlayer>();
  const monsters = new Map<string, ServerMonster>();

  function spawnInitialMonsters() {
    const initialMobs: ServerMonster[] = [
      { id: 'mob_1', name: 'Void Shadow Stalker', type: 'Stalker', level: 28, x: 36, y: 0, z: 18, homeX: 36, homeZ: 18, hp: 1200, maxHp: 1200, state: 'IDLE', targetPlayerId: null, lastAttackTime: 0, respawnTimer: 0, role: 'Wild Predator • Abyss Swarm' },
      { id: 'mob_2', name: 'Ironpeak Golem Scout', type: 'Golem', level: 32, x: -38, y: 0, z: -25, homeX: -38, homeZ: -25, hp: 1800, maxHp: 1800, state: 'IDLE', targetPlayerId: null, lastAttackTime: 0, respawnTimer: 0, role: 'Dwarven Caldera Construct' },
      { id: 'mob_3', name: 'Bloodfang Abyss Beast', type: 'Beast', level: 30, x: 22, y: 0, z: -40, homeX: 22, homeZ: -40, hp: 1500, maxHp: 1500, state: 'IDLE', targetPlayerId: null, lastAttackTime: 0, respawnTimer: 0, role: 'Badlands Carnivore' },
    ];
    initialMobs.forEach((mob) => monsters.set(mob.id, mob));
    console.log(`[PvE Engine] Spawned ${monsters.size} server-managed roaming monsters.`);
  }
  spawnInitialMonsters();

  // Authoritative World Boss State (Abyss Void Titan)
  const worldBoss = {
    id: 'abyss_titan',
    name: 'Abyss Void Titan',
    x: 45,
    y: 3.5,
    z: -45,
    rotation: 0,
    angle: 0,
    radius: 45,
    hp: 85000,
    maxHp: 100000,
    status: 'Patrolling Badlands',
  };

  function calculateDistance(
    p1: { x: number; y?: number; z: number },
    p2: { x: number; y?: number; z: number }
  ): number {
    const dx = p1.x - p2.x;
    const dy = (p1.y || 0) - (p2.y || 0);
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function broadcastExcept(senderId: string, data: object) {
    const payload = JSON.stringify(data);
    players.forEach((player, id) => {
      if (id !== senderId && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(payload);
      }
    });
  }

  function broadcastAll(data: object) {
    const payload = JSON.stringify(data);
    players.forEach((player) => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(payload);
      }
    });
  }

  // --- SERVER-MANAGED AI & PvE LOOP (Runs every tick) ---
  function updateServerAI(deltaTime: number) {
    const now = Date.now();

    monsters.forEach((mob, mobId) => {
      // 1. Handle Respawn Logic
      if (mob.state === 'DEAD') {
        if (now >= mob.respawnTimer) {
          mob.hp = mob.maxHp;
          mob.state = 'IDLE';
          mob.targetPlayerId = null;
          mob.x = mob.homeX;
          mob.z = mob.homeZ;
          console.log(`[PvE Engine] Monster ${mobId} (${mob.name}) has respawned!`);
        }
        return;
      }

      // 2. Find nearest living player for aggro
      let nearestPlayer: AuthoritativePlayer | null = null;
      let minDistance = Infinity;
      const AGGRO_RANGE = 14.0;
      const ATTACK_RANGE = 2.4;
      const MOB_SPEED = 3.2 * deltaTime;

      players.forEach((player) => {
        if (player.hp <= 0) return;
        const dist = calculateDistance(mob, player);
        if (dist < minDistance) {
          minDistance = dist;
          nearestPlayer = player;
        }
      });

      // 3. AI State Machine
      if (nearestPlayer && minDistance <= AGGRO_RANGE) {
        mob.state = 'CHASE';
        mob.targetPlayerId = (nearestPlayer as any).id;

        if (minDistance <= ATTACK_RANGE) {
          const MOB_DAMAGE = 12;
          if (!mob.lastAttackTime || now - mob.lastAttackTime > 1600) {
            (nearestPlayer as any).hp = Math.max(0, (nearestPlayer as any).hp - MOB_DAMAGE);
            mob.lastAttackTime = now;
            broadcastAll({
              type: 'PLAYER_DAMAGED',
              attackerId: mobId,
              targetId: (nearestPlayer as any).id,
              damageAmount: MOB_DAMAGE,
              remainingHp: (nearestPlayer as any).hp,
              timestamp: now,
            });
            console.log(
              `[PvE Combat] Monster ${mobId} attacked player ${(nearestPlayer as any).id} for ${MOB_DAMAGE} DMG. Player HP: ${(nearestPlayer as any).hp}`
            );
          }
        } else {
          // Walk toward target player
          const dx = (nearestPlayer as any).x - mob.x;
          const dz = (nearestPlayer as any).z - mob.z;
          const angle = Math.atan2(dx, dz);
          mob.x += Math.sin(angle) * MOB_SPEED;
          mob.z += Math.cos(angle) * MOB_SPEED;
        }
      } else {
        mob.state = 'IDLE';
        mob.targetPlayerId = null;
      }
    });
  }

  wssGame.on('connection', (ws: WebSocket) => {
    const clientId = `player_${Math.random().toString(36).substring(2, 9)}`;
    const spawnOffsetX = (Math.random() - 0.5) * 6;
    const spawnOffsetZ = (Math.random() - 0.5) * 6;

    const initialPlayer: AuthoritativePlayer = {
      ws,
      id: clientId,
      username: `Hunter_${clientId.substring(7, 11)}`,
      x: spawnOffsetX,
      y: 0,
      z: spawnOffsetZ,
      rotation: 0,
      animationState: 'idle',
      hp: 100,
      maxHp: 100,
      inventory: [
        { type: 'Health Potion', count: 3 },
        { type: 'Iron Greatsword', count: 1 },
      ],
      equippedWeapon: { type: 'Iron Greatsword', damageBonus: 20 },
      isAttacking: false,
      lastAttackTime: 0,
      lastUpdated: Date.now(),
    };

    players.set(clientId, initialPlayer);
    console.log(`[Multiplayer] Player connected: ${clientId}. Total active: ${players.size}`);

    // Welcome payload with client ID and initial world snapshot
    ws.send(
      JSON.stringify({
        type: 'WELCOME',
        id: clientId,
        playerId: clientId,
        player: {
          id: clientId,
          username: initialPlayer.username,
          position: { x: initialPlayer.x, y: initialPlayer.y, z: initialPlayer.z },
          rotation: { y: initialPlayer.rotation },
          animationState: initialPlayer.animationState,
          hp: initialPlayer.hp,
          maxHp: initialPlayer.maxHp,
        },
        worldBoss: {
          id: worldBoss.id,
          name: worldBoss.name,
          x: worldBoss.x,
          y: worldBoss.y,
          z: worldBoss.z,
          hp: worldBoss.hp,
          maxHp: worldBoss.maxHp,
        },
      })
    );

    // Broadcast new player joined to existing players
    broadcastExcept(clientId, {
      type: 'PLAYER_JOINED',
      player: {
        id: clientId,
        username: initialPlayer.username,
        position: { x: initialPlayer.x, y: initialPlayer.y, z: initialPlayer.z },
        rotation: { y: initialPlayer.rotation },
        animationState: initialPlayer.animationState,
        hp: initialPlayer.hp,
        maxHp: initialPlayer.maxHp,
      },
    });

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        const player = players.get(clientId);
        if (!player || player.hp <= 0) return;

        // 1. Client Input: Movement & Transform
        if (data.type === 'PLAYER_MOVE') {
          if (typeof data.x === 'number') player.x = data.x;
          else if (data.position && typeof data.position.x === 'number') player.x = data.position.x;

          if (typeof data.y === 'number') player.y = data.y;
          else if (data.position && typeof data.position.y === 'number') player.y = data.position.y;

          if (typeof data.z === 'number') player.z = data.z;
          else if (data.position && typeof data.position.z === 'number') player.z = data.position.z;

          if (typeof data.rotation === 'number') player.rotation = data.rotation;
          else if (data.rotation && typeof data.rotation.y === 'number') player.rotation = data.rotation.y;

          if (data.animationState) player.animationState = data.animationState;
          if (data.username) player.username = data.username;
          player.lastUpdated = Date.now();
        }

        // 2. Authoritative Combat Verification (Server checks cooldown, distance & damage)
        else if (data.type === 'PLAYER_ATTACK') {
          const now = Date.now();
          const ATTACK_COOLDOWN = 450; // 450ms cooldown between attacks

          // Enforce server-side cooldown against macro scripts or speed-hacking
          if (now - player.lastAttackTime < ATTACK_COOLDOWN) return;

          player.lastAttackTime = now;
          player.isAttacking = true;

          const atkType = data.attackType || 'light_slash';
          const ATTACK_RANGE = atkType === 'whirlwind' ? 6.0 : atkType === 'heavy_cleave' ? 5.2 : 4.2;
          const UNARMED_DAMAGE = atkType === 'whirlwind' ? 680 : atkType === 'heavy_cleave' ? 320 : 140;
          const weaponBonus = player.equippedWeapon ? player.equippedWeapon.damageBonus : 0;
          const BASE_DAMAGE = UNARMED_DAMAGE + weaponBonus;

          // Broadcast attack visual event immediately for responsive feedback
          broadcastExcept(clientId, {
            type: 'REMOTE_ATTACK',
            attackerId: clientId,
            attackType: atkType,
            position: { x: player.x, y: player.y, z: player.z },
            direction: data.direction || { x: 0, y: 0, z: 1 },
          });

          // Server-Side 3D Distance Verification against other players (PvP)
          players.forEach((target, targetId) => {
            if (targetId === clientId || target.hp <= 0) return;

            const distance = calculateDistance(player, target);
            if (distance <= ATTACK_RANGE) {
              target.hp = Math.max(0, target.hp - BASE_DAMAGE);
              console.log(
                `[PvP Engine] Player ${clientId} hit ${targetId} for ${BASE_DAMAGE} DMG. Remaining HP: ${target.hp}/${target.maxHp}`
              );

              broadcastAll({
                type: 'PLAYER_DAMAGED',
                attackerId: clientId,
                targetId,
                damageAmount: BASE_DAMAGE,
                remainingHp: target.hp,
                timestamp: Date.now(),
              });

              if (target.hp === 0) {
                console.log(`[Combat Engine] Player ${targetId} has fallen in battle! Respawning in 5 seconds...`);
                setTimeout(() => {
                  const respawning = players.get(targetId);
                  if (respawning) {
                    respawning.hp = respawning.maxHp;
                    respawning.x = 0;
                    respawning.y = 0;
                    respawning.z = 0;
                    broadcastAll({
                      type: 'PLAYER_RESPAWNED',
                      id: targetId,
                      hp: respawning.maxHp,
                      position: { x: 0, y: 0, z: 0 },
                    });
                  }
                }, 5000);
              }
            }
          });

          // Server-Side 3D Distance Verification against Mobs (PvE)
          monsters.forEach((mob, mobId) => {
            if (mob.hp <= 0) return;
            const distance = calculateDistance(player, mob);
            if (distance <= ATTACK_RANGE + 1.2) {
              mob.hp = Math.max(0, mob.hp - BASE_DAMAGE);
              mob.targetPlayerId = clientId;
              mob.state = 'CHASE';

              console.log(
                `[PvE Engine] Player ${clientId} hit monster ${mobId} (${mob.name}) for ${BASE_DAMAGE}. Mob HP: ${mob.hp}/${mob.maxHp}`
              );

              broadcastAll({
                type: 'MONSTER_DAMAGED',
                attackerId: clientId,
                mobId,
                damageAmount: BASE_DAMAGE,
                remainingHp: mob.hp,
                timestamp: Date.now(),
              });

              if (mob.hp === 0) {
                mob.state = 'DEAD';
                mob.respawnTimer = Date.now() + 10000;
                const dropPool = ['Health Potion', 'Iron Greatsword', 'Kasaka Dagger', 'Golem Core'];
                const droppedItem = dropPool[Math.floor(Math.random() * dropPool.length)];
                spawnWorldDrop(mob.x, mob.z, droppedItem);
                console.log(`[PvE Engine] Monster ${mobId} defeated! Spawned ${droppedItem}. Respawning in 10s.`);
              }
            }
          });

          // Server-Side Hit Detection against Abyss Titan World Boss
          const distToBoss = calculateDistance(player, worldBoss);
          if (distToBoss <= ATTACK_RANGE + 3.2) {
            worldBoss.hp = Math.max(0, worldBoss.hp - BASE_DAMAGE);
            broadcastAll({
              type: 'PLAYER_DAMAGED',
              attackerId: clientId,
              targetId: 'abyss_titan',
              damageAmount: BASE_DAMAGE,
              remainingHp: worldBoss.hp,
              timestamp: Date.now(),
            });
          }

          setTimeout(() => {
            player.isAttacking = false;
          }, 200);
        }

        // 3. Real-Time In-Game Chat Handling
        else if (data.type === 'CHAT_MESSAGE') {
          const cleanText = typeof data.text === 'string' ? data.text.substring(0, 140) : '';
          if (cleanText.trim().length > 0) {
            broadcastAll({
              type: 'CHAT_MESSAGE',
              senderId: clientId,
              sender: player.username,
              text: cleanText.trim(),
              timestamp: new Date().toISOString(),
            });
          }
        }

        // 4. Item Pickup (Authoritative Range Verification)
        else if (data.type === 'PICKUP_ITEM') {
          const targetItem = worldItems.get(data.itemId);
          if (player && targetItem && player.hp > 0) {
            const PICKUP_RANGE = 3.8;
            if (calculateDistance(player, targetItem) <= PICKUP_RANGE) {
              if (player.inventory.length < 10) {
                player.inventory.push({ type: targetItem.type, count: targetItem.count || 1 });
                worldItems.delete(targetItem.id);
                console.log(`[Loot Engine] Player ${clientId} picked up ${targetItem.type}`);

                broadcastAll({
                  type: 'WORLD_ITEM_COLLECTED',
                  itemId: targetItem.id,
                  collectorId: clientId,
                  itemType: targetItem.type,
                });

                ws.send(
                  JSON.stringify({
                    type: 'INVENTORY_UPDATED',
                    inventory: player.inventory,
                    equippedWeapon: player.equippedWeapon,
                    pickedItem: targetItem.type,
                  })
                );
              }
            }
          }
        }

        // 5. Equip / Unequip Item
        else if (data.type === 'EQUIP_ITEM') {
          const index = data.inventoryIndex;
          if (typeof index === 'number' && player.inventory[index]) {
            const itemToEquip = player.inventory[index];
            const isWeapon =
              itemToEquip.type.includes('Sword') ||
              itemToEquip.type.includes('Dagger') ||
              itemToEquip.type.includes('Blade') ||
              itemToEquip.type.includes('Bow');

            if (isWeapon) {
              const prevEquipped = player.equippedWeapon;
              player.inventory.splice(index, 1);
              if (prevEquipped) {
                player.inventory.push({ type: prevEquipped.type, count: 1 });
              }
              const bonus = itemToEquip.type.includes('Dagger') ? 25 : itemToEquip.type.includes('Greatsword') ? 40 : 20;
              player.equippedWeapon = {
                type: itemToEquip.type,
                damageBonus: bonus,
              };

              console.log(
                `[Equipment] Player ${clientId} equipped ${player.equippedWeapon.type} (+${bonus} DMG)`
              );

              ws.send(
                JSON.stringify({
                  type: 'INVENTORY_UPDATED',
                  inventory: player.inventory,
                  equippedWeapon: player.equippedWeapon,
                })
              );
            } else if (itemToEquip.type.includes('Potion') || itemToEquip.type.includes('Flask')) {
              player.inventory.splice(index, 1);
              player.hp = Math.min(player.maxHp, player.hp + 40);
              console.log(`[Item] Player ${clientId} consumed ${itemToEquip.type}. HP: ${player.hp}`);

              ws.send(
                JSON.stringify({
                  type: 'INVENTORY_UPDATED',
                  inventory: player.inventory,
                  equippedWeapon: player.equippedWeapon,
                  hp: player.hp,
                })
              );
            }
          }
        }

        // 6. Emotes, Character Archetypes & Projectiles
        else if (data.type === 'PLAYER_EMOTE') {
          broadcastExcept(clientId, {
            type: 'REMOTE_EMOTE',
            playerId: clientId,
            emote: data.emote,
          });
        } else if (data.type === 'SELECT_CHARACTER') {
          player.characterId = data.characterId;
          player.celShadeColor = data.celShadeColor;
          broadcastExcept(clientId, {
            type: 'PLAYER_CHARACTER_CHANGED',
            playerId: clientId,
            characterId: data.characterId,
            celShadeColor: data.celShadeColor,
            position: { x: player.x, y: player.y, z: player.z },
          });
        } else if (data.type === 'FIRE_PROJECTILE') {
          broadcastExcept(clientId, {
            type: 'REMOTE_PROJECTILE',
            attackerId: clientId,
            origin: data.origin,
            direction: data.direction,
            projectileType: data.projectileType || 'starlight_arrow',
          });
        } else if (data.type === 'SUMMON_MINION') {
          broadcastExcept(clientId, {
            type: 'REMOTE_SUMMON_MINION',
            summonerId: clientId,
            minionId: data.minionId,
            position: data.position,
            minionType: data.minionType || 'skeleton_vanguard',
          });
        }
      } catch (err: any) {
        console.error(`[Error] Processing message from ${clientId}:`, err.message);
      }
    });

    ws.on('close', () => {
      console.log(`[Disconnection] Player disconnected: ${clientId}`);
      players.delete(clientId);
      broadcastAll({
        type: 'PLAYER_DISCONNECTED',
        id: clientId,
      });
      broadcastAll({
        type: 'PLAYER_LEFT',
        id: clientId,
      });
    });

    ws.on('error', (err) => {
      console.error(`[Socket Error] ${clientId}:`, err.message);
    });
  });

  // ============================================================================
  // AUTHORITATIVE 20 TPS WORLD GAME LOOP (50ms Fixed Timestep)
  // ============================================================================
  let tickCount = 0;
  let lastTickTime = Date.now();
  let tickJitterMs = 0;

  setInterval(() => {
    const now = Date.now();
    const actualDelta = now - lastTickTime;
    tickJitterMs = Math.abs(actualDelta - FRAME_TIME);
    lastTickTime = now;
    tickCount++;

    const dtSeconds = Math.min(actualDelta / 1000, 0.1);

    // 1. Run Server-Side PvE Monster AI updates
    updateServerAI(dtSeconds);

    // 2. Authoritative World Boss Orbital Movement
    worldBoss.angle += 0.05 * (FRAME_TIME / 1000) * 4.4;
    worldBoss.x = Math.cos(worldBoss.angle) * worldBoss.radius;
    worldBoss.z = Math.sin(worldBoss.angle) * worldBoss.radius;
    worldBoss.y = 3.5 + Math.sin(worldBoss.angle * 2) * 0.6;
    worldBoss.rotation = worldBoss.angle + Math.PI / 2;

    // 3. Broadcast Batched World State to all Connected Clients
    if (players.size > 0 || monsters.size > 0 || worldItems.size > 0) {
      const playerArray = Array.from(players.values()).map((p) => ({
        id: p.id,
        username: p.username,
        x: Number(p.x.toFixed(2)),
        y: Number(p.y.toFixed(2)),
        z: Number(p.z.toFixed(2)),
        position: { x: Number(p.x.toFixed(2)), y: Number(p.y.toFixed(2)), z: Number(p.z.toFixed(2)) },
        rotation: Number(p.rotation.toFixed(2)),
        animationState: p.animationState,
        hp: p.hp,
        maxHp: p.maxHp,
        isAttacking: p.isAttacking,
        equippedWeapon: p.equippedWeapon,
        inventory: p.inventory,
        lastUpdated: p.lastUpdated,
      }));

      const monsterArray = Array.from(monsters.values()).map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        level: m.level,
        x: Number(m.x.toFixed(2)),
        y: Number(m.y.toFixed(2)),
        z: Number(m.z.toFixed(2)),
        position: { x: Number(m.x.toFixed(2)), y: Number(m.y.toFixed(2)), z: Number(m.z.toFixed(2)) },
        hp: m.hp,
        maxHp: m.maxHp,
        state: m.state,
        role: m.role,
      }));

      const itemArray = Array.from(worldItems.values()).map((it) => ({
        id: it.id,
        type: it.type,
        x: Number(it.x.toFixed(2)),
        y: Number(it.y.toFixed(2)),
        z: Number(it.z.toFixed(2)),
        position: { x: Number(it.x.toFixed(2)), y: Number(it.y.toFixed(2)), z: Number(it.z.toFixed(2)) },
        count: it.count,
      }));

      const payload = JSON.stringify({
        type: 'WORLD_STATE',
        timestamp: now,
        tick: tickCount,
        players: playerArray,
        monsters: monsterArray,
        worldItems: itemArray,
        worldBoss: {
          id: worldBoss.id,
          name: worldBoss.name,
          x: Number(worldBoss.x.toFixed(2)),
          y: Number(worldBoss.y.toFixed(2)),
          z: Number(worldBoss.z.toFixed(2)),
          rotation: Number(worldBoss.rotation.toFixed(2)),
          hp: worldBoss.hp,
          maxHp: worldBoss.maxHp,
          status: worldBoss.status,
        },
      });

      players.forEach((player) => {
        if (player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(payload);
        }
      });
    }

    // Telemetry log every 10 seconds (200 ticks)
    if (tickCount % 200 === 0) {
      console.log(
        `[Authoritative 20 TPS Loop] Active players: ${players.size}, Mobs: ${monsters.size}, Items: ${worldItems.size}, Titan HP: ${worldBoss.hp}/${worldBoss.maxHp}, Jitter: ${tickJitterMs}ms`
      );
    }
  }, FRAME_TIME);

  // Server Telemetry Endpoint for Monitoring and Verification
  app.get('/api/server/telemetry', (_req: Request, res: Response) => {
    return res.json({
      success: true,
      tps: TICK_RATE,
      targetFrameTimeMs: FRAME_TIME,
      activePlayers: players.size,
      bufferedPersistenceCount: writeBehindBuffer.size,
      lastPersistenceFlush: new Date(lastFlushTime).toISOString(),
      worldBoss: {
        name: worldBoss.name,
        hp: worldBoss.hp,
        maxHp: worldBoss.maxHp,
        position: { x: worldBoss.x, y: worldBoss.y, z: worldBoss.z },
      },
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  // Upgrade HTTP request to appropriate WebSocket server
  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/ws/game') {
      wssGame.handleUpgrade(request, socket, head, (ws) => {
        wssGame.emit('connection', ws, request);
      });
    } else if (pathname === '/ws/chat') {
      wssChat.handleUpgrade(request, socket, head, (ws) => {
        wssChat.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Aethelgard Server] Full-Stack HTTP & Authoritative 20 TPS WebSocket Engine active on port ${PORT}`);
  });
}

start();
