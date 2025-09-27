import * as fs from 'fs';
import axios from 'axios';
import { YesterdayLowMonitor } from './yesterday-low-monitor';

interface Fractal {
  pair: string;
  high: number | null;
  low: number | null;
}

interface MultiFractal {
  price: number;
  daysAgo: number;
  status: 'ACTIVE' | 'BROKEN';
  brokenAt?: string;
}

interface PairFractals {
  pair: string;
  daily: { highs: MultiFractal[]; lows: MultiFractal[]; };
  weekly: { highs: MultiFractal[]; lows: MultiFractal[]; };
  monthly: { highs: MultiFractal[]; lows: MultiFractal[]; };
}

interface BreakoutEvent {
  id: string;
  pair: string;
  type: 'HIGH' | 'LOW';
  fractalPrice: number;
  breakPrice: number;
  timestamp: string;
}

interface BreakoutReaction {
  id: string;
  pair: string;
  type: 'HIGH' | 'LOW';
  timeframe: 'daily' | 'weekly' | 'monthly';
  fractalPrice: number;
  breakPrice: number;
  timestamp: string;
}

const FRACTALS_FILE = 'fractals.json';
const MULTI_FRACTALS_FILE = 'multi-fractals.json';
const BROKEN_FRACTALS_FILE = 'broken-fractals.json';
const EVENTS_FILE = 'breakout-events.json';
const REACTIONS_FILE = 'breakout-reactions.json';

let yesterdayLowMonitor: YesterdayLowMonitor | null = null;

function recordBreakoutEvent(pair: string, type: 'HIGH' | 'LOW', fractalPrice: number, breakPrice: number): boolean {
  try {
    const events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    const eventId = `${pair}_${type}_${fractalPrice.toFixed(5)}`;
    
    if (events.find((e: any) => e.id === eventId)) {
      return false;
    }
    
    const newEvent = {
      id: eventId,
      pair,
      type,
      fractalPrice,
      breakPrice,
      timestamp: new Date().toISOString()
    };
    
    events.push(newEvent);
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
    console.log(`📊 Breakout event recorded: ${pair} ${type} ${fractalPrice.toFixed(5)} -> ${breakPrice.toFixed(5)}`);
    return true;
  } catch {
    const newEvent = {
      id: `${pair}_${type}_${fractalPrice.toFixed(5)}`,
      pair,
      type,
      fractalPrice,
      breakPrice,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(EVENTS_FILE, JSON.stringify([newEvent], null, 2));
    console.log(`📊 Breakout event recorded: ${pair} ${type} ${fractalPrice.toFixed(5)} -> ${breakPrice.toFixed(5)}`);
    return true;
  }
}

async function getCurrentPrice(pair: string): Promise<number | null> {
  try {
    const symbol = pair === 'DX-Y.NYB' ? 'DX-Y.NYB' : pair === 'XAUUSD' ? 'GC=F' : `${pair}=X`;
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
      params: { range: '1d', interval: '1m' }
    });
    const result = response.data.chart.result[0];
    const quotes = result.indicators.quote[0];
    return quotes.close[quotes.close.length - 1];
  } catch {
    return null;
  }
}

function loadFractals(): Fractal[] {
  try {
    return JSON.parse(fs.readFileSync(FRACTALS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function loadBrokenFractals(): Set<string> {
  try {
    const broken = JSON.parse(fs.readFileSync(BROKEN_FRACTALS_FILE, 'utf8'));
    return new Set(broken);
  } catch {
    return new Set();
  }
}

function saveBrokenFractals(brokenSet: Set<string>): void {
  fs.writeFileSync(BROKEN_FRACTALS_FILE, JSON.stringify([...brokenSet], null, 2));
}

function recordBreakoutReaction(pair: string, type: 'HIGH' | 'LOW', timeframe: 'daily' | 'weekly' | 'monthly', fractalPrice: number, breakPrice: number): boolean {
  try {
    const reactions = JSON.parse(fs.readFileSync(REACTIONS_FILE, 'utf8'));
    const reactionId = `${pair}_${type}_${timeframe}_${fractalPrice.toFixed(5)}`;
    
    if (reactions.find((r: any) => r.id === reactionId)) {
      return false;
    }
    
    const newReaction = {
      id: reactionId,
      pair,
      type,
      timeframe,
      fractalPrice,
      breakPrice,
      timestamp: new Date().toISOString()
    };
    
    reactions.push(newReaction);
    fs.writeFileSync(REACTIONS_FILE, JSON.stringify(reactions, null, 2));
    console.log(`📊 Reaction recorded: ${pair} ${timeframe} ${type} ${fractalPrice.toFixed(5)} -> ${breakPrice.toFixed(5)}`);
    return true;
  } catch {
    const newReaction = {
      id: `${pair}_${type}_${timeframe}_${fractalPrice.toFixed(5)}`,
      pair,
      type,
      timeframe,
      fractalPrice,
      breakPrice,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(REACTIONS_FILE, JSON.stringify([newReaction], null, 2));
    console.log(`📊 Reaction recorded: ${pair} ${timeframe} ${type} ${fractalPrice.toFixed(5)} -> ${breakPrice.toFixed(5)}`);
    return true;
  }
}

function loadMultiFractals(): PairFractals[] {
  try {
    return JSON.parse(fs.readFileSync(MULTI_FRACTALS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

async function checkBreakouts() {
  const fractals = loadFractals();
  const multiFractals = loadMultiFractals();
  const brokenFractals = loadBrokenFractals();
  let hasNewBreakouts = false;

  // Initialize yesterday low monitor if not exists
  if (!yesterdayLowMonitor) {
    yesterdayLowMonitor = new YesterdayLowMonitor();
  }

  // Check legacy fractals
  for (const fractal of fractals) {
    const currentPrice = await getCurrentPrice(fractal.pair);
    if (!currentPrice) continue;

    if (fractal.high) {
      const highKey = `${fractal.pair}_HIGH_${fractal.high.toFixed(5)}`;
      if (currentPrice > fractal.high && !brokenFractals.has(highKey)) {
        const recorded = recordBreakoutEvent(fractal.pair, 'HIGH', fractal.high, currentPrice);
        if (recorded) {
          brokenFractals.add(highKey);
          hasNewBreakouts = true;
          console.log(`🚨 ${fractal.pair}: HIGH BROKEN! ${currentPrice.toFixed(5)} > ${fractal.high.toFixed(5)}`);
        }
      }
    }

    if (fractal.low) {
      const lowKey = `${fractal.pair}_LOW_${fractal.low.toFixed(5)}`;
      if (currentPrice < fractal.low && !brokenFractals.has(lowKey)) {
        const recorded = recordBreakoutEvent(fractal.pair, 'LOW', fractal.low, currentPrice);
        if (recorded) {
          brokenFractals.add(lowKey);
          hasNewBreakouts = true;
          console.log(`🚨 ${fractal.pair}: LOW BROKEN! ${currentPrice.toFixed(5)} < ${fractal.low.toFixed(5)}`);
        }
      }
    }
  }

  // Check yesterday low breakouts
  const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD', 'DX-Y.NYB'];
  for (const pair of pairs) {
    const currentPrice = await getCurrentPrice(pair);
    if (!currentPrice) continue;
    
    const yesterdayEvent = yesterdayLowMonitor!.checkPrice(pair, currentPrice);
    if (yesterdayEvent) {
      console.log(`🔥 ${pair}: Yesterday low trigger event! ${yesterdayEvent.pointsBelow} points below`);
    }
  }

  // Check multi-timeframe fractals
  for (const pairData of multiFractals) {
    const currentPrice = await getCurrentPrice(pairData.pair);
    if (!currentPrice) continue;

    const timeframes: Array<{name: 'daily' | 'weekly' | 'monthly', data: {highs: MultiFractal[], lows: MultiFractal[]}}> = [
      {name: 'daily', data: pairData.daily},
      {name: 'weekly', data: pairData.weekly},
      {name: 'monthly', data: pairData.monthly}
    ];

    for (const timeframe of timeframes) {
      // Check highs
      for (const high of timeframe.data.highs) {
        if (high.status === 'ACTIVE' && currentPrice > high.price) {
          recordBreakoutReaction(pairData.pair, 'HIGH', timeframe.name, high.price, currentPrice);
          console.log(`🚨 ${pairData.pair}: ${timeframe.name.toUpperCase()} HIGH BROKEN! ${currentPrice.toFixed(5)} > ${high.price.toFixed(5)}`);
        }
      }

      // Check lows
      for (const low of timeframe.data.lows) {
        if (low.status === 'ACTIVE' && currentPrice < low.price) {
          recordBreakoutReaction(pairData.pair, 'LOW', timeframe.name, low.price, currentPrice);
          console.log(`🚨 ${pairData.pair}: ${timeframe.name.toUpperCase()} LOW BROKEN! ${currentPrice.toFixed(5)} < ${low.price.toFixed(5)}`);
        }
      }
    }
  }

  if (hasNewBreakouts) {
    saveBrokenFractals(brokenFractals);
  }
}

module.exports = { checkBreakouts };
export { checkBreakouts };