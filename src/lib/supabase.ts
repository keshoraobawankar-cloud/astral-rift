import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any)?.env || {};
const rawUrl = metaEnv.VITE_SUPABASE_URL;
const rawAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY;

const isConfigured = Boolean(
  rawUrl &&
    typeof rawUrl === 'string' &&
    rawUrl.startsWith('http') &&
    !rawUrl.includes('your-project-id') &&
    rawAnonKey &&
    !rawAnonKey.includes('your-anon-public-key')
);

// In-Memory/Local Storage Mock Client for local dev when credentials are placeholder
class MockSupabaseClient {
  auth = {
    signUp: async ({ email, password }: { email: string; password: string }) => {
      const mockId = `user_${Math.random().toString(36).substring(2, 10)}`;
      const user = { id: mockId, email, role: 'authenticated' };
      localStorage.setItem('aethelgard_supabase_mock_session', JSON.stringify({ user }));
      return { data: { user, session: { user, access_token: `mock_token_${Date.now()}` } }, error: null };
    },
    signInWithPassword: async ({ email }: { email: string; password: string }) => {
      const saved = localStorage.getItem('aethelgard_supabase_mock_session');
      let user = saved ? JSON.parse(saved).user : null;
      if (!user) {
        user = { id: `user_${Math.random().toString(36).substring(2, 10)}`, email, role: 'authenticated' };
        localStorage.setItem('aethelgard_supabase_mock_session', JSON.stringify({ user }));
      }
      return { data: { user, session: { user, access_token: `mock_token_${Date.now()}` } }, error: null };
    },
    getSession: async () => {
      const saved = localStorage.getItem('aethelgard_supabase_mock_session');
      return { data: { session: saved ? JSON.parse(saved) : null }, error: null };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      const saved = localStorage.getItem('aethelgard_supabase_mock_session');
      if (saved) {
        callback('SIGNED_IN', JSON.parse(saved));
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
    signOut: async () => {
      localStorage.removeItem('aethelgard_supabase_mock_session');
      return { error: null };
    },
  };

  from(table: string) {
    return {
      select: (_fields?: string) => ({
        eq: (_field: string, id: string) => ({
          single: async () => {
            const raw = localStorage.getItem(`aethelgard_supabase_${table}_${id}`);
            if (raw) return { data: JSON.parse(raw), error: null };
            return {
              data: {
                gold: 50830,
                essence: 1960,
                inventory: [
                  { id: 'health_potion', name: 'Health Potion', quantity: 5 },
                  { id: 'elven_mana_flask', name: 'Elven Mana Flask', quantity: 8 },
                ],
              },
              error: null,
            };
          },
        }),
        order: (_column: string, _options?: { ascending?: boolean }) => ({
          limit: async (_n: number) => {
            if (table === 'chat_messages') {
              const raw = localStorage.getItem('aethelgard_supabase_chat_history');
              const msgs = raw ? JSON.parse(raw) : [
                { id: 1, created_at: new Date(Date.now() - 3600000).toISOString(), username: 'Vaelen_Thorne', message: 'The Abyss gate in the Calamity Trench is pulsating void energy.', zone: 'Citadel Plaza' },
                { id: 2, created_at: new Date(Date.now() - 1800000).toISOString(), username: 'ElvenArchmage', message: 'Stocked fresh Mana Flasks at Master Alden\'s stall.', zone: 'Artisan Bazaar' },
                { id: 3, created_at: new Date(Date.now() - 600000).toISOString(), username: 'IronDwarf_Thorgar', message: 'Looted 45 Golem Alloy from Ironpeak Caldera!', zone: 'Dwarven Forge' },
              ];
              return { data: msgs, error: null };
            }
            if (table === 'profiles') {
              return {
                data: [
                  { username: 'Vaelen_Thorne', gold: 142500, essence: 8400 },
                  { username: 'Elurien_Vanguard', gold: 89200, essence: 5120 },
                  { username: 'Thorgar_Hammer', gold: 76400, essence: 3890 },
                  { username: 'Astraea_Solaris', gold: 64100, essence: 3450 },
                  { username: 'Kaelen_Shadow', gold: 58900, essence: 2900 },
                  { username: 'Valen_Ironbark', gold: 50830, essence: 1960 },
                ],
                error: null,
              };
            }
            return { data: [], error: null };
          },
        }),
      }),
      insert: async (payload: any) => {
        if (table === 'chat_messages') {
          const raw = localStorage.getItem('aethelgard_supabase_chat_history');
          const msgs = raw ? JSON.parse(raw) : [];
          const newMsg = {
            id: Date.now(),
            created_at: new Date().toISOString(),
            ...payload,
          };
          msgs.push(newMsg);
          localStorage.setItem('aethelgard_supabase_chat_history', JSON.stringify(msgs.slice(-50)));
          window.dispatchEvent(new CustomEvent('aethelgard:supabase:chat', { detail: newMsg }));
        }
        if (table === 'profiles' && payload.id) {
          localStorage.setItem(`aethelgard_supabase_profiles_${payload.id}`, JSON.stringify(payload));
        }
        return { error: null };
      },
      update: (payload: any) => ({
        eq: (_field: string, id: string) => {
          localStorage.setItem(`aethelgard_supabase_profiles_${id}`, JSON.stringify(payload));
          return Promise.resolve({ error: null });
        },
      }),
    };
  }

  channel(_name: string) {
    return {
      on: (_event: string, _filter: any, callback: (payload: any) => void) => {
        const handler = (e: any) => {
          callback({ new: e.detail });
        };
        window.addEventListener('aethelgard:supabase:chat', handler);
        return {
          subscribe: () => ({
            unsubscribe: () => {
              window.removeEventListener('aethelgard:supabase:chat', handler);
            },
          }),
        };
      },
      subscribe: () => ({}),
    };
  }

  removeChannel(_channel: any) {}
}

export const supabase: SupabaseClient = isConfigured
  ? createClient(rawUrl as string, rawAnonKey as string)
  : (new MockSupabaseClient() as unknown as SupabaseClient);

export const isSupabaseLive = isConfigured;
