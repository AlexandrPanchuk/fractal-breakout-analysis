import axios from 'axios';
import * as fs from 'fs';

interface DailyMovement {
  date: string;
  pair: string;
  open: number;
  close: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  direction: 'UP' | 'DOWN' | 'FLAT';
}

const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD', 'DX-Y.NYB'];
const DAILY_MOVEMENTS_FILE = 'daily-movements.json';

async function fetchDailyData(pair: string): Promise<any[]> {
  try {
    const symbol = pair === 'DX-Y.NYB' ? 'DX-Y.NYB' : pair === 'XAUUSD' ? 'GC=F' : `${pair}=X`;
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
      params: { range: '3mo', interval: '1d' }
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
    })).filter((d: any) => d.high && d.low);
  } catch (error: any) {
    console.error(`Failed to fetch daily data for ${pair}:`, error.message);
    return [];
  }
}

function calculateMovements(data: any[], pair: string): DailyMovement[] {
  const movements: DailyMovement[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const previous = data[i - 1];
    
    const change = current.close - previous.close;
    const changePercent = (change / previous.close) * 100;
    
    let direction: 'UP' | 'DOWN' | 'FLAT' = 'FLAT';
    if (change > 0) direction = 'UP';
    else if (change < 0) direction = 'DOWN';
    
    movements.push({
      date: current.date,
      pair,
      open: current.open,
      close: current.close,
      high: current.high,
      low: current.low,
      change,
      changePercent,
      direction
    });
  }
  
  return movements;
}

async function updateDailyMovements() {
  console.log('Updating daily movements...\n');
  
  const allMovements: DailyMovement[] = [];

  for (const pair of PAIRS) {
    console.log(`Processing ${pair}...`);
    
    const data = await fetchDailyData(pair);
    if (data.length === 0) continue;
    
    const movements = calculateMovements(data, pair);
    allMovements.push(...movements);
    
    const recent = movements.slice(-5);
    console.log(`  Recent movements: ${recent.map(m => `${m.date}: ${m.direction} ${m.changePercent.toFixed(2)}%`).join(', ')}`);
  }

  fs.writeFileSync(DAILY_MOVEMENTS_FILE, JSON.stringify(allMovements, null, 2));
  console.log(`✅ Daily movements saved to ${DAILY_MOVEMENTS_FILE}`);
}

function loadDailyMovements(): DailyMovement[] {
  try {
    return JSON.parse(fs.readFileSync(DAILY_MOVEMENTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function getTodayMovement(pair: string): DailyMovement | null {
  const movements = loadDailyMovements();
  const today = new Date().toISOString().split('T')[0];
  return movements.find(m => m.pair === pair && m.date === today) || null;
}

function getYesterdayMovement(pair: string): DailyMovement | null {
  const movements = loadDailyMovements();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return movements.find(m => m.pair === pair && m.date === yesterday) || null;
}

async function startDailyMovementsMonitor() {
  console.log('Starting daily movements monitor (updates every 5 minutes)...');
  
  // Initial update
  await updateDailyMovements();
  
  // Update every 5 minutes
  setInterval(async () => {
    console.log(`\n[${new Date().toLocaleTimeString()}] Updating daily movements...`);
    await updateDailyMovements();
  }, 5 * 60 * 1000);
}

if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'monitor') {
    startDailyMovementsMonitor();
  } else {
    updateDailyMovements();
  }
}

module.exports = { updateDailyMovements, startDailyMovementsMonitor, loadDailyMovements, getTodayMovement, getYesterdayMovement };
export { updateDailyMovements, startDailyMovementsMonitor, loadDailyMovements, getTodayMovement, getYesterdayMovement, DailyMovement };