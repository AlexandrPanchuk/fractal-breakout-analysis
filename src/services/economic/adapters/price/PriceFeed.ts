import type { PriceTick } from '../../types.js';
export interface PriceFeed {
  getAt(isoTime: string): Promise<PriceTick | null>;
  getRange(fromIso: string, toIso: string, granularitySec: number): Promise<PriceTick[]>;
}