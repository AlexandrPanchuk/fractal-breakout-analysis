import axios from 'axios';
import { saveFractals, StoredFractal } from './fractal-monitor';

interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Fractal {
  price: number;
  daysAgo: number;
}

const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD'];

async function fetchForexData(pair: string): Promise<OHLCData[]> {
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${pair}=X`, {
      params: {
        range: '2mo', // Increased range to find more fractals
        interval: '1d'
      }
    });

    const result = response.data.chart.result[0];
    const timestamps = result.timestamp;
    const ohlc = result.indicators.quote[0];

    return timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: ohlc.open[i],
      high: ohlc.high[i],
      low: ohlc.low[i],
      close: ohlc.close[i]
    })).filter((d: OHLCData) => d.high && d.low);
  } catch (error: any) {
    console.error(`Failed to fetch data for ${pair}:`, error.message);
    return [];
  }
}

function isFractalHigh(highs: number[], index: number, lookback: number = 2): boolean {
  if (index < lookback || index >= highs.length - lookback) return false;
  const center = highs[index];
  const leftCheck = highs.slice(index - lookback, index).every(h => center > h);
  const rightCheck = highs.slice(index + 1, index + 1 + lookback).every(h => center > h);
  return leftCheck && rightCheck;
}

function isFractalLow(lows: number[], index: number, lookback: number = 2): boolean {
  if (index < lookback || index >= lows.length - lookback) return false;
  const center = lows[index];
  const leftCheck = lows.slice(index - lookback, index).every(l => center < l);
  const rightCheck = lows.slice(index + 1, index + 1 + lookback).every(l => center < l);
  return leftCheck && rightCheck;
}

function findUnbrokenFractalsImproved(data: OHLCData[]): { high: Fractal | null, low: Fractal | null } {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);

  let unbrokenHigh: Fractal | null = null;
  let unbrokenLow: Fractal | null = null;

  // Try different lookback periods (2, 3, 4) to find fractals
  const lookbackPeriods = [2, 3, 4];
  
  for (const lookback of lookbackPeriods) {
    if (unbrokenHigh) break; // Already found one
    
    // Find most recent unbroken fractal high
    for (let i = highs.length - 1 - lookback; i >= lookback; i--) {
      if (isFractalHigh(highs, i, lookback)) {
        const fractalPrice = highs[i];
        const hasBeenBroken = data.slice(i + 1).some(d => d.high > fractalPrice);
        if (!hasBeenBroken) {
          unbrokenHigh = { price: fractalPrice, daysAgo: data.length - 1 - i };
          break;
        }
      }
    }
  }

  for (const lookback of lookbackPeriods) {
    if (unbrokenLow) break; // Already found one
    
    // Find most recent unbroken fractal low
    for (let i = lows.length - 1 - lookback; i >= lookback; i--) {
      if (isFractalLow(lows, i, lookback)) {
        const fractalPrice = lows[i];
        const hasBeenBroken = data.slice(i + 1).some(d => d.low < fractalPrice);
        if (!hasBeenBroken) {
          unbrokenLow = { price: fractalPrice, daysAgo: data.length - 1 - i };
          break;
        }
      }
    }
  }

  // If still no fractals found, use recent significant highs/lows
  if (!unbrokenHigh) {
    const recentHighs = data.slice(-30); // Last 30 days
    const maxHigh = Math.max(...recentHighs.map(d => d.high));
    const maxHighIndex = recentHighs.findIndex(d => d.high === maxHigh);
    if (maxHighIndex !== -1) {
      unbrokenHigh = { price: maxHigh, daysAgo: 30 - maxHighIndex };
    }
  }

  if (!unbrokenLow) {
    const recentLows = data.slice(-30); // Last 30 days
    const minLow = Math.min(...recentLows.map(d => d.low));
    const minLowIndex = recentLows.findIndex(d => d.low === minLow);
    if (minLowIndex !== -1) {
      unbrokenLow = { price: minLow, daysAgo: 30 - minLowIndex };
    }
  }

  return { high: unbrokenHigh, low: unbrokenLow };
}

function calculatePips(pair: string, price1: number, price2: number): number {
  const pipMultiplier = pair === 'USDJPY' ? 100 : 10000;
  return Math.round((price1 - price2) * pipMultiplier);
}

async function improvedFractalDetection() {
  console.log(`Improved Fractal Analysis - ${new Date().toLocaleString()}\n`);

  const storedFractals: StoredFractal[] = [];

  for (const pair of PAIRS) {
    const data = await fetchForexData(pair);
    
    if (data.length === 0) {
      console.log(`${pair}: No data available\n`);
      continue;
    }

    const currentPrice = data[data.length - 1].close;
    const fractals = findUnbrokenFractalsImproved(data);

    console.log(`${pair}:`);
    console.log(`  Current Price: ${currentPrice.toFixed(5)}`);
    
    if (fractals.high) {
      const distancePips = calculatePips(pair, fractals.high.price, currentPrice);
      console.log(`  Unbroken Fractal High: ${fractals.high.price.toFixed(5)} (${fractals.high.daysAgo} days ago)`);
      console.log(`  Distance to High: ${distancePips > 0 ? '+' : ''}${distancePips} pips`);
    } else {
      console.log(`  Unbroken Fractal High: None found (using fallback)`);
    }

    if (fractals.low) {
      const distancePips = calculatePips(pair, currentPrice, fractals.low.price);
      console.log(`  Unbroken Fractal Low: ${fractals.low.price.toFixed(5)} (${fractals.low.daysAgo} days ago)`);
      console.log(`  Distance to Low: ${distancePips > 0 ? '+' : '-'}${Math.abs(distancePips)} pips`);
    } else {
      console.log(`  Unbroken Fractal Low: None found (using fallback)`);
    }

    // Store fractal data
    storedFractals.push({
      pair,
      high: fractals.high?.price || null,
      low: fractals.low?.price || null,
      lastUpdated: new Date().toISOString()
    });

    console.log('');
  }

  // Save fractals to file
  saveFractals(storedFractals);
  console.log('Improved fractals saved to fractals.json');
  
  // Show summary
  const pairsWithBothFractals = storedFractals.filter(f => f.high && f.low).length;
  const pairsWithHighOnly = storedFractals.filter(f => f.high && !f.low).length;
  const pairsWithLowOnly = storedFractals.filter(f => !f.high && f.low).length;
  const pairsWithNone = storedFractals.filter(f => !f.high && !f.low).length;
  
  console.log('\n📊 FRACTAL SUMMARY:');
  console.log(`  Pairs with both fractals: ${pairsWithBothFractals}`);
  console.log(`  Pairs with high only: ${pairsWithHighOnly}`);
  console.log(`  Pairs with low only: ${pairsWithLowOnly}`);
  console.log(`  Pairs with none: ${pairsWithNone}`);
}

if (require.main === module) {
  improvedFractalDetection();
}

export { improvedFractalDetection };