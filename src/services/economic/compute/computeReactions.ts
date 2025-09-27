import type { PriceTick, MarketReactionWindow } from '../types.js';
export type WindowSpec = { name: 'm5' | 'm15' | 'h1'; seconds: number };
export const WINDOWS: WindowSpec[] = [
  { name: 'm5', seconds: 300 },
  { name: 'm15', seconds: 900 },
  { name: 'h1', seconds: 3600 }
];
export function reactionStats(base: PriceTick | null, series: PriceTick[]): MarketReactionWindow {
  if (!base || !base.mid) {
    return { ret: 0, max_favor: 0, max_adverse: 0 };
  }
  
  const baseP = base.mid;
  let last = baseP, maxFavor = 0, maxAdverse = 0;
  
  for (const p of series) {
    if (!p || !p.mid) continue;
    const r = (p.mid - baseP) / baseP;
    if (r > maxFavor) maxFavor = r;
    if (r < maxAdverse) maxAdverse = r;
    last = p.mid;
  }
  
  return { ret: (last - baseP) / baseP, max_favor: maxFavor, max_adverse: maxAdverse };
}
export function labelByThreshold(ret: number, thr = 0.001): 'up' | 'down' | 'flat' {
  if (ret >= thr) return 'up';
  if (ret <= -thr) return 'down';
  return 'flat';
}