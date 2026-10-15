export type AffinityTier = 'Devoted' | 'Friendly' | 'Neutral' | 'Suspicious' | 'Hostile';

export interface RelationshipTierInfo {
  tier: AffinityTier;
  label: string;
  description: string;
  minScore: number;
  maxScore: number;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  dialoguePrefix: string;
  tone: string;
  priceMultiplier: number;
  tradePerk: string;
}

export interface AffinityEventLog {
  id: string;
  timestamp: number;
  action: string;
  deltaAffinity: number;
  deltaTrust: number;
  reason: string;
}

export interface NPCRelationshipRecord {
  npcId: string;
  npcName: string;
  affinity: number; // -100 to +100 (Emotional standing / affection)
  trust: number;    // -100 to +100 (Reliability / respect)
  compositeScore: number; // -100 to +100 (Balanced relationship index)
  lastInteraction: number;
  interactionCount: number;
  notes: string[];
  historyLog: AffinityEventLog[];
}

export type AffinityEventType =
  | 'gift_offered'
  | 'quest_completed'
  | 'lore_discussed'
  | 'flattery_given'
  | 'tactical_win'
  | 'promise_kept'
  | 'haggled_rudely'
  | 'failed_quest'
  | 'insult_provocation'
  | 'betrayal';
