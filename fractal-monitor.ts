import axios from 'axios';
import * as fs from 'fs';
import { recordBreakout, updateOutcomes, generateTradingContext } from './trading-stats';
import { recordBreakoutReaction } from './breakout-engine';

interface StoredFractal {
  pair: string;
  high: number | null;
  low: number | null;
  lastUpdated: string;
}

const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD'];
const STORAGE_FILE = 'fractals.json';

async function getCurrentPrice(pair: string): Promise<number | null> {
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${pair}=X`, {
      params: { range: '1d', interval: '1m' }
    });
    const result = response.data.chart.result[0];
    const quotes = result.indicators.quote[0];
    return quotes.close[quotes.close.length - 1];
  } catch {
    return null;
  }
}

async function getPriceHistory(pair: string): Promise<number[]> {
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${pair}=X`, {
      params: { range: '1d', interval: '1m' }
    });
    const result = response.data.chart.result[0];
    const quotes = result.indicators.quote[0];
    return quotes.close.filter((p: number) => p !== null);
  } catch {
    return [];
  }
}

function calculateATR(prices: number[]): number {
  if (prices.length < 14) return 0;
  const ranges = [];
  for (let i = 1; i < Math.min(15, prices.length); i++) {
    ranges.push(Math.abs(prices[i] - prices[i-1]));
  }
  return ranges.reduce((sum, range) => sum + range, 0) / ranges.length;
}

function loadFractals(): StoredFractal[] {
  try {
    return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveFractals(fractals: StoredFractal[]): void {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(fractals, null, 2));
}

async function checkBreakouts() {
  const fractals = loadFractals();
  const currentPrices: { [pair: string]: number } = {};
  
  for (const fractal of fractals) {
    const currentPrice = await getCurrentPrice(fractal.pair);
    if (!currentPrice) continue;
    
    currentPrices[fractal.pair] = currentPrice;

    if (fractal.high && currentPrice > fractal.high) {
      console.log(`🚨 ${fractal.pair}: HIGH BROKEN! ${currentPrice.toFixed(5)} > ${fractal.high.toFixed(5)} at ${new Date().toLocaleTimeString()}`);
      recordBreakout(fractal.pair, 'HIGH', fractal.high, currentPrice);
      
      // Record detailed reaction data
      const priceHistory = await getPriceHistory(fractal.pair);
      const atr = calculateATR(priceHistory);
      recordBreakoutReaction(fractal.pair, 'HIGH', fractal.high, currentPrice, priceHistory, atr);
      
      // Remove broken fractal
      removeBrokenFractal(fractal.pair, 'HIGH');
    }

    if (fractal.low && currentPrice < fractal.low) {
      console.log(`🚨 ${fractal.pair}: LOW BROKEN! ${currentPrice.toFixed(5)} < ${fractal.low.toFixed(5)} at ${new Date().toLocaleTimeString()}`);
      recordBreakout(fractal.pair, 'LOW', fractal.low, currentPrice);
      
      // Record detailed reaction data
      const priceHistory = await getPriceHistory(fractal.pair);
      const atr = calculateATR(priceHistory);
      recordBreakoutReaction(fractal.pair, 'LOW', fractal.low, currentPrice, priceHistory, atr);
      
      // Remove broken fractal
      removeBrokenFractal(fractal.pair, 'LOW');
    }
  }
  
  // Update outcomes for pending events
  updateOutcomes(currentPrices);
}

async function startMonitoring() {
  console.log('Starting fractal breakout monitoring...');
  
  // Show trading context every 5 minutes
  setInterval(() => {
    generateTradingContext();
  }, 300000);
  
  setInterval(async () => {
    await checkBreakouts();
  }, 30000); // Check every 30 seconds

  // Initial check
  await checkBreakouts();
  generateTradingContext();
}

if (require.main === module) {
  startMonitoring();
}

function removeBrokenFractal(pair: string, type: 'HIGH' | 'LOW'): void {
  const fractals = loadFractals();
  
  const fractalIndex = fractals.findIndex(f => f.pair === pair);
  if (fractalIndex !== -1) {
    if (type === 'HIGH') {
      fractals[fractalIndex].high = null;
    } else {
      fractals[fractalIndex].low = null;
    }
    
    fractals[fractalIndex].lastUpdated = new Date().toISOString();
    saveFractals(fractals);
    
    console.log(`🚫 Removed broken ${type} fractal for ${pair}`);
  }
}

export { loadFractals, saveFractals, StoredFractal };