export type Importance = 1 | 2 | 3;
export interface CalendarEvent {
  id: string;            // e.g. US_PCE_2025-09-26_15-30
  ccy: 'USD' | 'EUR';
  name: string;          // e.g. Core PCE Y/Y
  importance: Importance;
  scheduled_at: string;  // ISO-8601 with timezone +03:00
  consensus?: number | null;
  previous?: number | null;
  unit?: string;
  source?: string;       // provider name
}
export interface Release {
  id: string;            // matches CalendarEvent.id
  actual: number | null; // released value
  revised_from?: number | null;
  released_at: string;   // when captured
}
export interface PriceTick {
  t: string;             // ISO time
  mid: number;           // mid price (or close)
  bid?: number;
  ask?: number;
}
export interface MarketReactionWindow {
  ret: number;           // (last - base)/base
  max_favor: number;     // max positive ret within window
  max_adverse: number;   // min (negative) ret within window
}
export interface MarketReaction {
  id: string;            // event id
  pair: string;          // e.g. EURUSD
  windows: Record<string, MarketReactionWindow>;
  label_m15: 'up' | 'down' | 'flat';
}