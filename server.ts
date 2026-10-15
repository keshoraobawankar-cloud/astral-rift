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
// 4. PLAYER STATE SYNC & SAFE-ZONE ENDPOINTS (Option 1: Express REST API)
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

    return res.status(200).json({
      success: true,
      message: 'Player state synchronized successfully',
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

  // 2. 3D Multiplayer Game & Combat Movement WebSocket Handler
  interface ConnectedGamePlayer {
    ws: WebSocket;
    data: {
      id: string;
      username: string;
      position: { x: number; y: number; z: number };
      rotation: { y: number };
      animationState: string;
      hp: number;
      maxHp: number;
    };
  }

  const connectedPlayers = new Map<string, ConnectedGamePlayer>();

  function broadcastExcept(senderId: string, data: object) {
    const payload = JSON.stringify(data);
    connectedPlayers.forEach(({ ws }, id) => {
      if (id !== senderId && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  function broadcastAll(data: object) {
    const payload = JSON.stringify(data);
    connectedPlayers.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  wssGame.on('connection', (ws: WebSocket) => {
    const playerId = `player_${Math.random().toString(36).substring(2, 9)}`;
    const spawnOffsetX = (Math.random() - 0.5) * 6;
    const spawnOffsetZ = (Math.random() - 0.5) * 6;

    const initialData = {
      id: playerId,
      username: `Hunter_${playerId.substring(7, 11)}`,
      position: { x: spawnOffsetX, y: 0, z: spawnOffsetZ },
      rotation: { y: 0 },
      animationState: 'idle',
      hp: 100,
      maxHp: 100,
    };

    connectedPlayers.set(playerId, { ws, data: initialData });
    console.log(`[Game WebSocket] Player ${playerId} connected. Total active: ${connectedPlayers.size}`);

    // Send newly joined player their assigned ID and list of existing remote players
    const existingPlayers = Array.from(connectedPlayers.values())
      .filter((p) => p.data.id !== playerId)
      .map((p) => p.data);

    ws.send(
      JSON.stringify({
        type: 'INIT_WORLD',
        playerId,
        player: initialData,
        existingPlayers,
      })
    );

    // Broadcast new player presence to all other connected clients
    broadcastExcept(playerId, {
      type: 'PLAYER_JOINED',
      player: initialData,
    });

    ws.on('message', (message: string) => {
      try {
        const payload = JSON.parse(message.toString());

        // A. 3D Locomotion & Position Update
        if (payload.type === 'PLAYER_MOVE') {
          const session = connectedPlayers.get(playerId);
          if (session) {
            if (payload.position) session.data.position = payload.position;
            if (payload.rotation) session.data.rotation = payload.rotation;
            if (payload.animationState) session.data.animationState = payload.animationState;
            if (payload.username) session.data.username = payload.username;

            // Broadcast smooth transform coordinates to all other clients
            broadcastExcept(playerId, {
              type: 'PLAYER_MOVED',
              id: playerId,
              username: session.data.username,
              position: session.data.position,
              rotation: session.data.rotation,
              animationState: session.data.animationState,
            });
          }
        }

        // B. Real-time Combat Action (Sword slash, Heavy Cleave, Whirlwind)
        if (payload.type === 'PLAYER_ATTACK') {
          broadcastExcept(playerId, {
            type: 'REMOTE_ATTACK',
            attackerId: playerId,
            attackType: payload.attackType || 'light_slash',
            position: payload.position,
            direction: payload.direction,
          });
        }

        // C. Damage Broadcast & Health Update
        if (payload.type === 'DEAL_DAMAGE') {
          const { targetId, damageAmount } = payload;
          const targetSession = connectedPlayers.get(targetId);
          if (targetSession) {
            targetSession.data.hp = Math.max(0, targetSession.data.hp - damageAmount);
          }

          // Broadcast damage event to everyone (including attacker for UI confirmation)
          broadcastAll({
            type: 'PLAYER_DAMAGED',
            attackerId: playerId,
            targetId,
            damageAmount,
            remainingHp: targetSession?.data.hp ?? 100,
            timestamp: Date.now(),
          });
        }

        // D. Emote Broadcast (Cheer, Guard, Rest, Shout)
        if (payload.type === 'PLAYER_EMOTE') {
          broadcastExcept(playerId, {
            type: 'REMOTE_EMOTE',
            playerId,
            emote: payload.emote,
          });
        }
      } catch (err) {
        console.error('Invalid Game WebSocket payload:', err);
      }
    });

    ws.on('close', () => {
      connectedPlayers.delete(playerId);
      console.log(`[Game WebSocket] Player ${playerId} disconnected. Total active: ${connectedPlayers.size}`);
      broadcastExcept(playerId, {
        type: 'PLAYER_LEFT',
        id: playerId,
      });
    });

    ws.on('error', (err) => {
      console.error(`[Game WebSocket] Player ${playerId} socket error:`, err);
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
    console.log(`[Aethelgard Server] Full-Stack HTTP & WebSocket Server active on port ${PORT}`);
  });
}

start();
