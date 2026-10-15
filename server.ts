import express, { Request, Response, NextFunction } from 'express';
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Aethelgard Server] Full-Stack JWT & Anti-Cheat Authority active on port ${PORT}`);
  });
}

start();
