import * as fs from 'fs';

interface BreakoutEvent {
  pair: string;
  type: 'HIGH' | 'LOW';
  fractalPrice: number;
  breakPrice: number;
  timestamp: string;
  priceAfter1h: number | null;
  priceAfter4h: number | null;
  outcome: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'PENDING';
}

interface TradingStats {
  pair: string;
  totalBreakouts: number;
  highBreakouts: number;
  lowBreakouts: number;
  bullishOutcomes: number;
  bearishOutcomes: number;
  longProbability: number;
  shortProbability: number;
  lastUpdated: string;
}

const STATS_FILE = 'breakout-stats.json';
const EVENTS_FILE = 'breakout-events.json';

function loadBreakoutEvents(): BreakoutEvent[] {
  try {
    return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveBreakoutEvents(events: BreakoutEvent[]): void {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

function loadTradingStats(): TradingStats[] {
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveTradingStats(stats: TradingStats[]): void {
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

function recordBreakout(pair: string, type: 'HIGH' | 'LOW', fractalPrice: number, breakPrice: number): void {
  const events = loadBreakoutEvents();
  
  // Check for duplicate - same pair, type, and fractal price
  const existingEvent = events.find(event => 
    event.pair === pair && 
    event.type === type && 
    Math.abs(event.fractalPrice - fractalPrice) < 0.00001
  );
  
  if (existingEvent) {
    console.log(`⚠️ Duplicate breakout ignored: ${pair} ${type} already recorded`);
    return;
  }
  
  const newEvent: BreakoutEvent = {
    pair,
    type,
    fractalPrice,
    breakPrice,
    timestamp: new Date().toISOString(),
    priceAfter1h: null,
    priceAfter4h: null,
    outcome: 'PENDING'
  };
  
  events.push(newEvent);
  saveBreakoutEvents(events);
  
  console.log(`📊 Breakout recorded: ${pair} ${type} at ${breakPrice.toFixed(5)}`);
}

function updateOutcomes(currentPrices: { [pair: string]: number }): void {
  const events = loadBreakoutEvents();
  const now = new Date();
  let updated = false;

  for (const event of events) {
    if (event.outcome !== 'PENDING') continue;
    
    const eventTime = new Date(event.timestamp);
    const hoursElapsed = (now.getTime() - eventTime.getTime()) / (1000 * 60 * 60);
    const currentPrice = currentPrices[event.pair];
    
    if (!currentPrice) continue;

    // Update price snapshots
    if (hoursElapsed >= 1 && event.priceAfter1h === null) {
      event.priceAfter1h = currentPrice;
      updated = true;
    }
    
    if (hoursElapsed >= 4 && event.priceAfter4h === null) {
      event.priceAfter4h = currentPrice;
      
      // Determine outcome based on 4h price movement
      const priceChange = currentPrice - event.breakPrice;
      const threshold = event.breakPrice * 0.001; // 0.1% threshold
      
      if (Math.abs(priceChange) < threshold) {
        event.outcome = 'NEUTRAL';
      } else if (event.type === 'HIGH' && priceChange > 0) {
        event.outcome = 'BULLISH';
      } else if (event.type === 'LOW' && priceChange < 0) {
        event.outcome = 'BEARISH';
      } else {
        event.outcome = event.type === 'HIGH' ? 'BEARISH' : 'BULLISH';
      }
      
      updated = true;
    }
  }

  if (updated) {
    saveBreakoutEvents(events);
    calculateStats();
  }
}

function calculateStats(): void {
  const events = loadBreakoutEvents().filter(e => e.outcome !== 'PENDING');
  const pairs = [...new Set(events.map(e => e.pair))];
  const stats: TradingStats[] = [];

  for (const pair of pairs) {
    const pairEvents = events.filter(e => e.pair === pair);
    const totalBreakouts = pairEvents.length;
    const highBreakouts = pairEvents.filter(e => e.type === 'HIGH').length;
    const lowBreakouts = pairEvents.filter(e => e.type === 'LOW').length;
    const bullishOutcomes = pairEvents.filter(e => e.outcome === 'BULLISH').length;
    const bearishOutcomes = pairEvents.filter(e => e.outcome === 'BEARISH').length;

    const longProbability = totalBreakouts > 0 ? (bullishOutcomes / totalBreakouts) * 100 : 50;
    const shortProbability = totalBreakouts > 0 ? (bearishOutcomes / totalBreakouts) * 100 : 50;

    stats.push({
      pair,
      totalBreakouts,
      highBreakouts,
      lowBreakouts,
      bullishOutcomes,
      bearishOutcomes,
      longProbability,
      shortProbability,
      lastUpdated: new Date().toISOString()
    });
  }

  saveTradingStats(stats);
}

function generateTradingContext(): void {
  const stats = loadTradingStats();
  
  console.log('\n📈 TRADING PROBABILITY ANALYSIS');
  console.log('================================');
  
  for (const stat of stats) {
    const recommendation = stat.longProbability > 60 ? 'LONG BIAS' : 
                          stat.shortProbability > 60 ? 'SHORT BIAS' : 'NEUTRAL';
    
    console.log(`\n${stat.pair}:`);
    console.log(`  Total Breakouts: ${stat.totalBreakouts}`);
    console.log(`  Long Probability: ${stat.longProbability.toFixed(1)}%`);
    console.log(`  Short Probability: ${stat.shortProbability.toFixed(1)}%`);
    console.log(`  Recommendation: ${recommendation}`);
  }
}

export { recordBreakout, updateOutcomes, generateTradingContext, BreakoutEvent };