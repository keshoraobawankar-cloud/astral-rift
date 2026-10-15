import { supabase } from '../lib/supabase';

export interface PlayerData {
  gold: number;
  essence: number;
  inventory: Array<{ id: string; name: string; quantity: number }>;
}

export interface ChatMessage {
  id: number;
  created_at: string;
  username: string;
  message: string;
  zone: string;
}

export interface LeaderboardEntry {
  username: string;
  gold: number;
  essence: number;
}

// 1. Sign Up New Player
export async function signUpPlayer(email: string, pass: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
  });

  if (error) throw error;

  // Initialize profile data for new user
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        username,
        gold: 100,
        essence: 0,
        inventory: [{ id: 'health_potion', name: 'Health Potion', quantity: 5 }],
      });

    if (profileError) {
      console.warn('Profile initialization note:', profileError.message);
    }
  }

  return data.user;
}

// 2. Sign In Player
export async function signInPlayer(email: string, pass: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) throw error;
  return data.user;
}

// 3. Fetch Player Inventory & Profile
export async function loadPlayerData(userId: string): Promise<PlayerData | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('gold, essence, inventory')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error loading profile:', error.message);
    return null;
  }

  return data as PlayerData;
}

// 4. Save Player Inventory & Profile
export async function savePlayerData(userId: string, playerData: PlayerData) {
  const { error } = await supabase
    .from('profiles')
    .update({
      gold: playerData.gold,
      essence: playerData.essence,
      inventory: playerData.inventory,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
  return true;
}

// --- REALTIME CHAT FUNCTIONS ---

// Send a chat message
export async function sendChatMessage(userId: string, username: string, message: string, zone = 'Citadel Plaza') {
  const { error } = await supabase
    .from('chat_messages')
    .insert({ user_id: userId, username, message, zone });

  if (error) throw error;
}

// Fetch recent chat history
export async function fetchRecentChat(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Chat fetch error:', error);
    return [];
  }
  return (data || []).slice().reverse();
}

// Subscribe to real-time chat broadcasts
export function subscribeToChat(onNewMessage: (msg: ChatMessage) => void) {
  const channel = supabase
    .channel('public:chat_messages')
    .on(
      'postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload: any) => {
        if (payload?.new) {
          onNewMessage(payload.new as ChatMessage);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// --- LEADERBOARD FUNCTIONS ---

// Fetch Top 10 Wealthiest Adventurers
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, gold, essence')
    .order('gold', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Leaderboard error:', error);
    return [];
  }
  return data || [];
}
