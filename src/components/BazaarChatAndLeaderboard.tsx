import React, { useState, useEffect } from 'react';
import { 
  fetchRecentChat, 
  sendChatMessage, 
  subscribeToChat, 
  fetchLeaderboard, 
  ChatMessage, 
  LeaderboardEntry 
} from '../services/gameService';

interface Props {
  userId: string;
  username: string;
}

export const BazaarChatAndLeaderboard: React.FC<Props> = ({ userId, username }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'leaderboard'>('chat');

  useEffect(() => {
    // 1. Initial loads
    fetchRecentChat().then(setMessages);
    fetchLeaderboard().then(setLeaderboard);

    // 2. Subscribe to Realtime websocket chat stream
    const unsubscribe = subscribeToChat((newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
    });

    return () => unsubscribe();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await sendChatMessage(userId, username || 'Anonymous Adventurer', inputText);
      setInputText('');
    } catch (err: any) {
      console.error('Failed to send:', err.message);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto border border-amber-900/50 bg-slate-900 text-amber-100 rounded-lg p-4 shadow-xl">
      {/* Header Tabs */}
      <div className="flex border-b border-amber-800/40 mb-4 pb-2 gap-4">
        <button
          onClick={() => setActiveTab('chat')}
          className={`font-bold text-sm tracking-wide px-3 py-1 rounded transition-colors ${
            activeTab === 'chat' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          💬 Artisan Bazaar Chat
        </button>
        <button
          onClick={() => {
            setActiveTab('leaderboard');
            fetchLeaderboard().then(setLeaderboard); // Refresh on view
          }}
          className={`font-bold text-sm tracking-wide px-3 py-1 rounded transition-colors ${
            activeTab === 'leaderboard' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🏆 Realm Leaderboard
        </button>
      </div>

      {/* Tab 1: Realtime Chat */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-72">
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-3">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-8 text-center">No messages yet. Speak into the Citadel Plaza!</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="text-xs bg-slate-800/60 p-2 rounded border border-slate-700/50">
                  <span className="text-amber-400 font-semibold">[{msg.username}]</span>
                  <span className="text-slate-500 text-[10px] ml-1">({msg.zone}):</span>
                  <p className="text-slate-200 mt-0.5">{msg.message}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Broadcast to Citadel Plaza..."
              className="flex-1 bg-slate-950 border border-amber-900/60 rounded px-3 py-1.5 text-xs text-amber-100 focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="h-72 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-amber-400 border-b border-amber-800/40 uppercase text-[10px]">
              <tr>
                <th className="py-2">Rank</th>
                <th className="py-2">Adventurer</th>
                <th className="py-2 text-right">Gold</th>
                <th className="py-2 text-right">Essence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {leaderboard.map((entry, index) => (
                <tr key={index} className="hover:bg-slate-800/30">
                  <td className="py-2 font-bold text-amber-500">#{index + 1}</td>
                  <td className="py-2 text-slate-200 font-medium">{entry.username || 'Unknown'}</td>
                  <td className="py-2 text-right text-amber-300 font-mono">{entry.gold.toLocaleString()} Gold</td>
                  <td className="py-2 text-right text-cyan-300 font-mono">{entry.essence.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
