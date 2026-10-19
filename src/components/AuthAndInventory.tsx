import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseLive } from '../lib/supabase';
import { signInPlayer, signUpPlayer, loadPlayerData, savePlayerData, PlayerData } from '../services/gameService';
import { Shield, Sparkles, Scroll, User, LogOut, CheckCircle, Database } from 'lucide-react';

interface AuthAndInventoryProps {
  onSyncInventoryToGame?: (gold: number, essence: number) => void;
  onClose?: () => void;
}

export const AuthAndInventory: React.FC<AuthAndInventoryProps> = ({ onSyncInventoryToGame, onClose }) => {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [gameData, setGameData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Check active auth session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchData(session.user.id);
      } else {
        setGameData(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string) => {
    setLoading(true);
    const data = await loadPlayerData(userId);
    if (data) {
      setGameData(data);
      if (onSyncInventoryToGame) {
        onSyncInventoryToGame(data.gold, data.essence);
      }
    }
    setLoading(false);
  };

  const handleAuth = async (isSignUp: boolean) => {
    try {
      setLoading(true);
      setStatusMsg(null);
      if (isSignUp) {
        if (!email || !password || !username) {
          throw new Error('Username, email, and password are required for sign up.');
        }
        await signUpPlayer(email, password, username);
        setStatusMsg({ text: 'Account forged! Signed in to Astral Vault.' });
      } else {
        if (!email || !password) {
          throw new Error('Email and password are required for login.');
        }
        await signInPlayer(email, password);
        setStatusMsg({ text: 'Session authenticated with Astral Vault!' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Authentication failed', error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!user || !gameData) return;

    const newInventory = [...gameData.inventory, { id: `scroll_${Date.now()}`, name: 'Magic Arcane Scroll', quantity: 1 }];
    const updated = { ...gameData, gold: gameData.gold + 25, inventory: newInventory };

    setGameData(updated);
    if (onSyncInventoryToGame) {
      onSyncInventoryToGame(updated.gold, updated.essence);
    }
    try {
      await savePlayerData(user.id, updated);
      setStatusMsg({ text: '✓ Loot secured in Astral Vault (+25 Gold, +1 Magic Scroll)!' });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      setStatusMsg({ text: `Failed to save: ${err.message}`, error: true });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/95 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-slate-100 font-sans">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-base font-bold font-rpg text-cyan-300">Astral Storage Vault</h2>
            <p className="text-[10px] text-slate-400">
              {isSupabaseLive ? '✦ Synchronized with Continental Relays' : '✦ Local Vault Cache Active'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {statusMsg && (
        <div
          className={`p-2.5 mb-3 rounded-lg text-xs font-mono border ${
            statusMsg.error
              ? 'bg-rose-950/70 border-rose-500/40 text-rose-300'
              : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {!user ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-300 font-sans">
            Access your secure Astral Storage Vault to preserve your gold, essence, and equipment cache across realms.
          </p>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Adventurer Codename</label>
            <input
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              placeholder="Username (Sign Up Only)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Email Address</label>
            <input
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              placeholder="hunter@aethelgard.online"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Passcode</label>
            <input
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              disabled={loading}
              className="flex-1 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition"
              onClick={() => handleAuth(false)}
            >
              {loading ? 'Authenticating...' : 'Log In'}
            </button>
            <button
              disabled={loading}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition"
              onClick={() => handleAuth(true)}
            >
              {loading ? 'Forging...' : 'Sign Up'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-xs font-bold text-slate-200">{user.email}</p>
                <p className="text-[10px] text-slate-500 font-mono">UID: {user.id.substring(0, 12)}...</p>
              </div>
            </div>
            <button
              className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/40 px-2 py-1 rounded-lg transition"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 text-center py-4">Syncing Supabase profile & inventory...</p>
          ) : gameData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950/80 border border-amber-500/30 p-2.5 rounded-xl">
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 block font-bold">Gold</span>
                  <span className="text-base font-mono font-bold text-amber-300">{gameData.gold.toLocaleString()}</span>
                </div>
                <div className="bg-slate-950/80 border border-cyan-500/30 p-2.5 rounded-xl">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-400 block font-bold">Essence</span>
                  <span className="text-base font-mono font-bold text-cyan-300">{gameData.essence.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Scroll className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cloud Saved Inventory:</span>
                </h3>
                <ul className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-1 max-h-36 overflow-y-auto text-xs">
                  {gameData.inventory.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center text-slate-300 py-0.5 border-b border-slate-800/40 last:border-0">
                      <span>• {item.name}</span>
                      <span className="font-mono text-cyan-400 text-[11px]">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleAddItem}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Loot Scroll (+25 Gold & Add Item)</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center">No Supabase profile found. Click Sign Out and re-register.</p>
          )}
        </div>
      )}
    </div>
  );
};
