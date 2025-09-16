import axios from 'axios';
import * as fs from 'fs';

interface MultiFractal {
  price: number;
  daysAgo: number;
  status: 'ACTIVE' | 'BROKEN';
  brokenAt?: string;
}

interface MultiTimeframeFractals {
  pair: string;
  daily: {
    highs: MultiFractal[];
    lows: MultiFractal[];
  };
  weekly: {
    highs: MultiFractal[];
    lows: MultiFractal[];
  };
  monthly: {
    highs: MultiFractal[];
    lows: MultiFractal[];
  };
  lastUpdated: string;
}

interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD', 'DX-Y.NYB'];
const MULTI_FRACTALS_FILE = 'multi-fractals.json';

async function fetchMultiTimeframeData(pair: string): Promise<{
  daily: OHLCData[];
  weekly: OHLCData[];
  monthly: OHLCData[];
}> {
  try {
    const symbol = pair === 'DX-Y.NYB' ? 'DX-Y.NYB' : pair === 'XAUUSD' ? 'GC=F' : `${pair}=X`;
    const [dailyResponse, weeklyResponse, monthlyResponse] = await Promise.all([
      axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        params: { range: '1mo', interval: '1d' }
      }),
      axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        params: { range: '10mo', interval: '1wk' }
      }),
      axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        params: { range: '3y', interval: '1mo' }
      })
    ]);

    const parseData = (response: any) => {
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
    };

    return {
      daily: parseData(dailyResponse),
      weekly: parseData(weeklyResponse),
      monthly: parseData(monthlyResponse)
    };
  } catch (error: any) {
    console.error(`Failed to fetch multi-timeframe data for ${pair}:`, error.message);
    return { daily: [], weekly: [], monthly: [] };
  }
}

function findMultipleFractals(data: OHLCData[], count: number = 5): {
  highs: MultiFractal[];
  lows: MultiFractal[];
} {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  
  const fractalHighs: MultiFractal[] = [];
  const fractalLows: MultiFractal[] = [];

  // Find fractal highs (include both broken and active)
  for (let i = highs.length - 3; i >= 2 && fractalHighs.length < count; i--) {
    if (isFractalHigh(highs, i)) {
      const price = highs[i];
      const hasBeenBroken = data.slice(i + 1).some(d => d.high > price);
      
      // Check for duplicate prices (within 0.00001 tolerance)
      const isDuplicate = fractalHighs.some(f => Math.abs(f.price - price) < 0.00001);
      if (!isDuplicate) {
        fractalHighs.push({
          price,
          daysAgo: data.length - 1 - i,
          status: hasBeenBroken ? 'BROKEN' : 'ACTIVE',
          brokenAt: hasBeenBroken ? findBreakoutDate(data, i, price, 'HIGH') : undefined
        });
      }
    }
  }

  // Find fractal lows (include both broken and active)
  for (let i = lows.length - 3; i >= 2 && fractalLows.length < count; i--) {
    if (isFractalLow(lows, i)) {
      const price = lows[i];
      const hasBeenBroken = data.slice(i + 1).some(d => d.low < price);
      
      // Check for duplicate prices (within 0.00001 tolerance)
      const isDuplicate = fractalLows.some(f => Math.abs(f.price - price) < 0.00001);
      if (!isDuplicate) {
        fractalLows.push({
          price,
          daysAgo: data.length - 1 - i,
          status: hasBeenBroken ? 'BROKEN' : 'ACTIVE',
          brokenAt: hasBeenBroken ? findBreakoutDate(data, i, price, 'LOW') : undefined
        });
      }
    }
  }

  return { highs: fractalHighs, lows: fractalLows };
}

function isFractalHigh(highs: number[], index: number): boolean {
  if (index < 2 || index >= highs.length - 2) return false;
  const center = highs[index];
  return center > highs[index - 1] && center > highs[index + 1] && 
         center > highs[index - 2] && center > highs[index + 2];
}

function isFractalLow(lows: number[], index: number): boolean {
  if (index < 2 || index >= lows.length - 2) return false;
  const center = lows[index];
  return center < lows[index - 1] && center < lows[index + 1] && 
         center < lows[index - 2] && center < lows[index + 2];
}

function findBreakoutDate(data: OHLCData[], fractalIndex: number, fractalPrice: number, type: 'HIGH' | 'LOW'): string {
  for (let i = fractalIndex + 1; i < data.length; i++) {
    const broken = type === 'HIGH' ? data[i].high > fractalPrice : data[i].low < fractalPrice;
    if (broken) return data[i].date;
  }
  return new Date().toISOString().split('T')[0];
}

function loadMultiFractals(): MultiTimeframeFractals[] {
  try {
    return JSON.parse(fs.readFileSync(MULTI_FRACTALS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveMultiFractals(fractals: MultiTimeframeFractals[]): void {
  fs.writeFileSync(MULTI_FRACTALS_FILE, JSON.stringify(fractals, null, 2));
}

async function updateMultiTimeframeFractals() {
  console.log('Updating multi-timeframe fractals...\n');
  
  const allFractals: MultiTimeframeFractals[] = [];

  for (const pair of PAIRS) {
    console.log(`Processing ${pair}...`);
    
    const data = await fetchMultiTimeframeData(pair);
    
    if (data.daily.length === 0) {
      console.log(`  No data available for ${pair}\n`);
      continue;
    }

    const dailyFractals = findMultipleFractals(data.daily, 3);
    const weeklyFractals = findMultipleFractals(data.weekly, 3);
    const monthlyFractals = findMultipleFractals(data.monthly, 3);

    const multiFractal: MultiTimeframeFractals = {
      pair,
      daily: dailyFractals,
      weekly: weeklyFractals,
      monthly: monthlyFractals,
      lastUpdated: new Date().toISOString()
    };

    allFractals.push(multiFractal);

    // Display results
    console.log(`  Daily Fractals:`);
    console.log(`    Highs: ${dailyFractals.highs.map(f => `${f.price.toFixed(5)} (${f.status})`).join(', ')}`);
    console.log(`    Lows:  ${dailyFractals.lows.map(f => `${f.price.toFixed(5)} (${f.status})`).join(', ')}`);
    
    console.log(`  Weekly Fractals:`);
    console.log(`    Highs: ${weeklyFractals.highs.map(f => `${f.price.toFixed(5)} (${f.status})`).join(', ')}`);
    console.log(`    Lows:  ${weeklyFractals.lows.map(f => `${f.price.toFixed(5)} (${f.status})`).join(', ')}`);
    
    console.log(`  Monthly Fractals:`);
    console.log(`    Highs: ${monthlyFractals.highs.map(f => `${f.price.toFixed(5)} (${f.status})`).join(', ')}`);
    console.log(`    Lows:  ${monthlyFractals.lows.map(f => `${f.price.toFixed(5)} (${f.status})`).join(', ')}\n`);
  }

  saveMultiFractals(allFractals);
  console.log(`✅ Multi-timeframe fractals saved to ${MULTI_FRACTALS_FILE}`);
  
  return allFractals;
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

function getNextActiveFractal(fractals: MultiFractal[], type: 'HIGH' | 'LOW'): MultiFractal | null {
  return fractals.find(f => f.status === 'ACTIVE') || null;
}

async function monitorMultiFractals() {
  console.log('Monitoring multi-timeframe fractals...\n');
  
  const multiFractals = loadMultiFractals();
  
  for (const pairFractals of multiFractals) {
    const currentPrice = await getCurrentPrice(pairFractals.pair);
    if (!currentPrice) continue;

    console.log(`${pairFractals.pair}: ${currentPrice.toFixed(5)}`);
    
    // Check daily fractals
    const nextDailyHigh = getNextActiveFractal(pairFractals.daily.highs, 'HIGH');
    const nextDailyLow = getNextActiveFractal(pairFractals.daily.lows, 'LOW');
    
    if (nextDailyHigh) {
      const distance = ((nextDailyHigh.price - currentPrice) / currentPrice) * 10000;
      console.log(`  Next Daily High: ${nextDailyHigh.price.toFixed(5)} (${distance.toFixed(0)} pips)`);
    }
    
    if (nextDailyLow) {
      const distance = ((currentPrice - nextDailyLow.price) / currentPrice) * 10000;
      console.log(`  Next Daily Low:  ${nextDailyLow.price.toFixed(5)} (${distance.toFixed(0)} pips)`);
    }
    
    // Check weekly fractals
    const nextWeeklyHigh = getNextActiveFractal(pairFractals.weekly.highs, 'HIGH');
    const nextWeeklyLow = getNextActiveFractal(pairFractals.weekly.lows, 'LOW');
    
    if (nextWeeklyHigh) {
      const distance = ((nextWeeklyHigh.price - currentPrice) / currentPrice) * 10000;
      console.log(`  Next Weekly High: ${nextWeeklyHigh.price.toFixed(5)} (${distance.toFixed(0)} pips)`);
    }
    
    if (nextWeeklyLow) {
      const distance = ((currentPrice - nextWeeklyLow.price) / currentPrice) * 10000;
      console.log(`  Next Weekly Low:  ${nextWeeklyLow.price.toFixed(5)} (${distance.toFixed(0)} pips)`);
    }
    
    console.log('');
  }
}

if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'monitor') {
    monitorMultiFractals();
  } else {
    updateMultiTimeframeFractals();
  }
}

module.exports = { updateMultiTimeframeFractals, monitorMultiFractals };
export { updateMultiTimeframeFractals, monitorMultiFractals, MultiTimeframeFractals };