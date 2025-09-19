import * as fs from 'fs';

interface BreakoutReaction {
  id: string;
  pair: string;
  type: 'HIGH' | 'LOW';
  fractalPrice: number;
  breakPrice: number;
  timestamp: string;
  dayOfWeek: number;
  session: 'ASIA' | 'LONDON' | 'NY' | 'OVERLAP';
  timeBucket: string;
  atr: number;
  impulse15m: number;
  impulse1h: number;
  impulse4h: number;
  retrace15m: number;
  retrace1h: number;
  maxDrawdown: number;
  timeToReverse: number | null;
  followThrough: boolean;
}

interface FilterCriteria {
  pair?: string;
  dayOfWeek?: number;
  session?: string;
  timeBucket?: string;
  atrRange?: [number, number];
  dateRange?: [string, string];
}

const REACTIONS_FILE = 'breakout-reactions.json';

function getSession(hour: number): 'ASIA' | 'LONDON' | 'NY' | 'OVERLAP' {
  if (hour >= 0 && hour < 8) return 'ASIA';
  if (hour >= 8 && hour < 13) return 'LONDON';
  if (hour >= 13 && hour < 16) return 'OVERLAP';
  return 'NY';
}

function getTimeBucket(hour: number): string {
  return `${Math.floor(hour / 4) * 4}-${Math.floor(hour / 4) * 4 + 4}`;
}

function loadReactions(): BreakoutReaction[] {
  try {
    return JSON.parse(fs.readFileSync(REACTIONS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveReactions(reactions: BreakoutReaction[]): void {
  fs.writeFileSync(REACTIONS_FILE, JSON.stringify(reactions, null, 2));
}

function recordBreakoutReaction(
  pair: string,
  type: 'HIGH' | 'LOW',
  fractalPrice: number,
  breakPrice: number,
  priceData: number[],
  atr: number
): void {
  const reactions = loadReactions();
  
  // Check for duplicate - same pair and fractal price (regardless of type)
  const existingReaction = reactions.find(reaction => 
    reaction.pair === pair && 
    Math.abs(reaction.fractalPrice - fractalPrice) < 0.00001
  );
  
  if (existingReaction) {
    console.log(`⚠️ Duplicate reaction ignored: ${pair} ${type} fractal already recorded`);
    return;
  }
  
  const timestamp = new Date().toISOString();
  const date = new Date(timestamp);
  
  const reaction: BreakoutReaction = {
    id: `${pair}_${timestamp}`,
    pair,
    type,
    fractalPrice,
    breakPrice,
    timestamp,
    dayOfWeek: date.getDay(),
    session: getSession(date.getUTCHours()),
    timeBucket: getTimeBucket(date.getUTCHours()),
    atr,
    impulse15m: calculateImpulse(priceData, 15),
    impulse1h: calculateImpulse(priceData, 60),
    impulse4h: calculateImpulse(priceData, 240),
    retrace15m: calculateRetrace(priceData, 15),
    retrace1h: calculateRetrace(priceData, 60),
    maxDrawdown: calculateMaxDrawdown(priceData, breakPrice, type),
    timeToReverse: calculateTimeToReverse(priceData, breakPrice, type),
    followThrough: calculateFollowThrough(priceData, breakPrice, type)
  };

  reactions.push(reaction);
  saveReactions(reactions);
  
  console.log(`📊 Breakout reaction recorded: ${pair} ${type} at ${breakPrice.toFixed(5)}`);
}

function calculateImpulse(prices: number[], minutes: number): number {
  if (prices.length < minutes) return 0;
  const start = prices[0];
  const end = prices[Math.min(minutes - 1, prices.length - 1)];
  return ((end - start) / start) * 100;
}

function calculateRetrace(prices: number[], minutes: number): number {
  if (prices.length < minutes) return 0;
  const peak = Math.max(...prices.slice(0, minutes));
  const trough = Math.min(...prices.slice(0, minutes));
  const start = prices[0];
  return ((peak - trough) / start) * 100;
}

function calculateMaxDrawdown(prices: number[], breakPrice: number, type: 'HIGH' | 'LOW'): number {
  let maxDrawdown = 0;
  let peak = breakPrice;
  
  for (const price of prices) {
    if (type === 'HIGH') {
      peak = Math.max(peak, price);
      maxDrawdown = Math.min(maxDrawdown, ((price - peak) / peak) * 100);
    } else {
      peak = Math.min(peak, price);
      maxDrawdown = Math.max(maxDrawdown, ((price - peak) / peak) * 100);
    }
  }
  
  return Math.abs(maxDrawdown);
}

function calculateTimeToReverse(prices: number[], breakPrice: number, type: 'HIGH' | 'LOW'): number | null {
  for (let i = 0; i < prices.length; i++) {
    const reverseCondition = type === 'HIGH' ? prices[i] < breakPrice : prices[i] > breakPrice;
    if (reverseCondition) return i;
  }
  return null;
}

function calculateFollowThrough(prices: number[], breakPrice: number, type: 'HIGH' | 'LOW'): boolean {
  if (prices.length < 60) return false; // Need at least 1 hour of data
  const hourPrice = prices[59];
  const threshold = breakPrice * 0.002; // 0.2% threshold
  
  if (type === 'HIGH') {
    return hourPrice > breakPrice + threshold;
  } else {
    return hourPrice < breakPrice - threshold;
  }
}

function filterReactions(criteria: FilterCriteria): BreakoutReaction[] {
  const reactions = loadReactions();
  
  return reactions.filter(reaction => {
    if (criteria.pair && reaction.pair !== criteria.pair) return false;
    if (criteria.dayOfWeek !== undefined && reaction.dayOfWeek !== criteria.dayOfWeek) return false;
    if (criteria.session && reaction.session !== criteria.session) return false;
    if (criteria.timeBucket && reaction.timeBucket !== criteria.timeBucket) return false;
    if (criteria.atrRange && (reaction.atr < criteria.atrRange[0] || reaction.atr > criteria.atrRange[1])) return false;
    if (criteria.dateRange) {
      const reactionDate = new Date(reaction.timestamp);
      const startDate = new Date(criteria.dateRange[0]);
      const endDate = new Date(criteria.dateRange[1]);
      if (reactionDate < startDate || reactionDate > endDate) return false;
    }
    return true;
  });
}

function getStatistics(reactions: BreakoutReaction[]) {
  if (reactions.length === 0) return null;

  const followThroughRate = (reactions.filter(r => r.followThrough).length / reactions.length) * 100;
  const avgImpulse15m = reactions.reduce((sum, r) => sum + r.impulse15m, 0) / reactions.length;
  const avgImpulse1h = reactions.reduce((sum, r) => sum + r.impulse1h, 0) / reactions.length;
  const avgImpulse4h = reactions.reduce((sum, r) => sum + r.impulse4h, 0) / reactions.length;
  const avgMaxDrawdown = reactions.reduce((sum, r) => sum + r.maxDrawdown, 0) / reactions.length;
  const avgTimeToReverse = reactions
    .filter(r => r.timeToReverse !== null)
    .reduce((sum, r) => sum + (r.timeToReverse || 0), 0) / reactions.filter(r => r.timeToReverse !== null).length;

  return {
    count: reactions.length,
    followThroughRate: followThroughRate.toFixed(1),
    avgImpulse15m: avgImpulse15m.toFixed(2),
    avgImpulse1h: avgImpulse1h.toFixed(2),
    avgImpulse4h: avgImpulse4h.toFixed(2),
    avgMaxDrawdown: avgMaxDrawdown.toFixed(2),
    avgTimeToReverse: avgTimeToReverse.toFixed(0)
  };
}

export { 
  recordBreakoutReaction, 
  filterReactions, 
  getStatistics, 
  BreakoutReaction, 
  FilterCriteria 
};