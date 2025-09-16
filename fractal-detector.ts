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

const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD', 'DX-Y.NYB'];

async function fetchForexData(pair: string): Promise<OHLCData[]> {
  try {
    const symbol = pair === 'DX-Y.NYB' ? 'DX-Y.NYB' : pair === 'XAUUSD' ? 'GC=F' : `${pair}=X`;
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
      params: {
        range: '1mo',
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

function isFractalHigh(highs: number[], index: number): boolean {
  if (index < 2 || index >= highs.length - 2) return false;
  const center = highs[index];
  const leftCheck = highs.slice(index - 2, index).every(h => center > h);
  const rightCheck = highs.slice(index + 1, index + 3).every(h => center > h);
  return leftCheck && rightCheck;
}

function isFractalLow(lows: number[], index: number): boolean {
  if (index < 2 || index >= lows.length - 2) return false;
  const center = lows[index];
  const leftCheck = lows.slice(index - 2, index).every(l => center < l);
  const rightCheck = lows.slice(index + 1, index + 3).every(l => center < l);
  return leftCheck && rightCheck;
}

function findRecentFractals(data: OHLCData[]): { high: Fractal | null, low: Fractal | null, brokenHigh: Fractal | null, brokenLow: Fractal | null } {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const currentPrice = data[data.length - 1].close;

  let unbrokenHigh: Fractal | null = null;
  let unbrokenLow: Fractal | null = null;
  let brokenHigh: Fractal | null = null;
  let brokenLow: Fractal | null = null;

  // Find most recent fractal high (broken or unbroken)
  for (let i = highs.length - 3; i >= 2; i--) {
    if (isFractalHigh(highs, i)) {
      const fractalPrice = highs[i];
      const hasBeenBroken = data.slice(i + 1).some(d => d.high > fractalPrice);
      if (!hasBeenBroken && !unbrokenHigh) {
        unbrokenHigh = { price: fractalPrice, daysAgo: data.length - 1 - i };
      } else if (hasBeenBroken && !brokenHigh) {
        brokenHigh = { price: fractalPrice, daysAgo: data.length - 1 - i };
      }
      if (unbrokenHigh && brokenHigh) break;
    }
  }

  // Find most recent fractal low (broken or unbroken)
  for (let i = lows.length - 3; i >= 2; i--) {
    if (isFractalLow(lows, i)) {
      const fractalPrice = lows[i];
      const hasBeenBroken = data.slice(i + 1).some(d => d.low < fractalPrice);
      if (!hasBeenBroken && !unbrokenLow) {
        unbrokenLow = { price: fractalPrice, daysAgo: data.length - 1 - i };
      } else if (hasBeenBroken && !brokenLow) {
        brokenLow = { price: fractalPrice, daysAgo: data.length - 1 - i };
      }
      if (unbrokenLow && brokenLow) break;
    }
  }

  return { high: unbrokenHigh, low: unbrokenLow, brokenHigh, brokenLow };
}

function calculatePips(pair: string, price1: number, price2: number): number {
  let pipMultiplier;
  if (pair === 'USDJPY') pipMultiplier = 100;
  else if (pair === 'XAUUSD') pipMultiplier = 10; // Gold: 1 pip = $0.10
  else if (pair === 'DX-Y.NYB') pipMultiplier = 100; // DXY: 1 pip = 0.01
  else pipMultiplier = 10000;
  return Math.round((price1 - price2) * pipMultiplier);
}

async function main() {
  console.log(`Forex Fractal Analysis - ${new Date().toLocaleString()}\n`);

  const storedFractals: StoredFractal[] = [];

  for (const pair of PAIRS) {
    const data = await fetchForexData(pair);
    
    if (data.length === 0) {
      console.log(`${pair}: No data available\n`);
      continue;
    }

    const currentPrice = data[data.length - 1].close;
    const fractals = findUnbrokenFractals(data);

    console.log(`${pair}:`);
    console.log(`  Current Price: ${currentPrice.toFixed(5)}`);
    
    if (fractals.high) {
      const distancePips = calculatePips(pair, fractals.high.price, currentPrice);
      console.log(`  Unbroken Fractal High: ${fractals.high.price.toFixed(5)} (${fractals.high.daysAgo} days ago)`);
      console.log(`  Distance to High: ${distancePips > 0 ? '+' : ''}${distancePips} pips`);
    } else {
      console.log(`  Unbroken Fractal High: None found`);
    }

    if (fractals.low) {
      const distancePips = calculatePips(pair, currentPrice, fractals.low.price);
      console.log(`  Unbroken Fractal Low: ${fractals.low.price.toFixed(5)} (${fractals.low.daysAgo} days ago)`);
      console.log(`  Distance to Low: ${distancePips > 0 ? '+' : '-'}${Math.abs(distancePips)} pips`);
    } else {
      console.log(`  Unbroken Fractal Low: None found`);
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
  console.log('Fractals saved to fractals.json');
}

main().catch(console.error);