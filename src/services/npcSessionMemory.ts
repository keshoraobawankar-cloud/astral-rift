export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export class NPCSessionMemory {
  public npcId: string;
  public maxShortTermTurns: number;
  public shortTermHistory: ChatTurn[];
  public longTermNotes: string[];
  public totalTurnsLogged: number;

  constructor(
    npcId: string,
    maxShortTermTurns: number = 4,
    initialShortTerm: ChatTurn[] = [],
    initialLongTerm: string[] = []
  ) {
    this.npcId = npcId;
    this.maxShortTermTurns = maxShortTermTurns;
    this.shortTermHistory = initialShortTerm ? [...initialShortTerm] : [];
    this.longTermNotes = initialLongTerm ? [...initialLongTerm] : [];
    this.totalTurnsLogged = this.shortTermHistory.length / 2;
  }

  public async addExchange(userMessage: string, npcResponse: string): Promise<void> {
    const now = Date.now();
    this.shortTermHistory.push({ role: 'user', content: userMessage, timestamp: now });
    this.shortTermHistory.push({ role: 'assistant', content: npcResponse, timestamp: now });
    this.totalTurnsLogged += 1;

    // Check if we need to compress older history into long-term notes
    const maxEntries = this.maxShortTermTurns * 2;
    if (this.shortTermHistory.length > maxEntries) {
      await this.compressOldestHistory();
    }
  }

  private async compressOldestHistory(): Promise<void> {
    const maxEntries = this.maxShortTermTurns * 2;
    const excessCount = this.shortTermHistory.length - maxEntries;
    if (excessCount <= 0) return;

    const oldChunk = this.shortTermHistory.slice(0, excessCount);
    this.shortTermHistory = this.shortTermHistory.slice(excessCount);

    // Call server compression endpoint or procedural compression
    try {
      const res = await fetch('/api/npc/compress-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId: this.npcId,
          oldChunk,
          existingNotes: this.longTermNotes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.newNotes) && data.newNotes.length > 0) {
          for (const note of data.newNotes) {
            const cleaned = note.replace(/^[-*•]\s*/, '').trim();
            if (cleaned && !this.longTermNotes.includes(cleaned)) {
              this.longTermNotes.push(cleaned);
            }
          }
          return;
        }
      }
    } catch {
      // Offline / fallback procedural condensation
    }

    // Local procedural condensation if API is offline
    this.proceduralCondensation(oldChunk);
  }

  private proceduralCondensation(chunk: ChatTurn[]): void {
    const userQueries = chunk.filter((c) => c.role === 'user').map((c) => c.content);
    const combined = userQueries.join('; ');
    if (combined) {
      const summaryBullet = `Discussed tactical priorities & inquiries: "${combined.slice(0, 80)}..."`;
      if (!this.longTermNotes.includes(summaryBullet)) {
        this.longTermNotes.push(summaryBullet);
      }
    }
  }

  public getFormattedShortTerm(): string {
    if (this.shortTermHistory.length === 0) {
      return 'No recent conversation.';
    }
    return this.shortTermHistory
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  }

  public getFormattedLongTerm(): string {
    if (this.longTermNotes.length === 0) {
      return 'No long-term memories recorded yet.';
    }
    return this.longTermNotes.map((note) => `- ${note}`).join('\n');
  }

  public buildSystemPrompt(
    npcName: string,
    archetype: string,
    playerAffinityTier: string,
    location?: string,
    additionalState?: string
  ): string {
    const longTermText = this.getFormattedLongTerm();
    const shortTermText = this.getFormattedShortTerm();

    const prompt = `
[SYSTEM: CHARACTER PROFILE]
- Name: ${npcName}
- Archetype: ${archetype}
- Location: ${location || 'Oakhaven Citadel'}
- Current Player Standing: ${playerAffinityTier}
${additionalState ? `\n[ADDITIONAL STATE]\n${additionalState}\n` : ''}
[LONG-TERM MEMORY (Crucial past events, choices, and commitments)]
${longTermText}

[ACTIVE SHORT-TERM MEMORY (Recent conversation turns)]
${shortTermText}

[BEHAVIORAL INSTRUCTIONS]
1. Stay strictly in character based on your archetype and player affinity standing.
2. Naturally reference past facts from your long-term memory if the player brings up related topics.
3. Keep response concise (under 3 sentences unless explaining a tactical plan).
4. Never break character or acknowledge you are an AI.
`.trim();

    return prompt;
  }
}
