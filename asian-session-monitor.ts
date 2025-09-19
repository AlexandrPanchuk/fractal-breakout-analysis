import axios from 'axios';
import * as fs from 'fs';

interface DailyLevel {
  pair: string;
  yesterdayHigh?: number;
  yesterdayLow?: number;
  currentPrice: number;
  distance: number;
  type: 'HIGH' | 'LOW';
  timestamp: string;
}

const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD', 'DX-Y.NYB'];
const BUFFER_PIPS = 10; // Alert when within 10 pips of yesterday's high

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

async function getYesterdayLevels(pair: string): Promise<{high: number | null, low: number | null}> {
  try {
    const symbol = pair === 'DX-Y.NYB' ? 'DX-Y.NYB' : pair === 'XAUUSD' ? 'GC=F' : `${pair}=X`;
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
      params: { range: '5d', interval: '1d' }
    });
    const result = response.data.chart.result[0];
    const ohlc = result.indicators.quote[0];
    
    // Get yesterday's high and low (second to last day)
    const yesterdayIndex = ohlc.high.length - 2;
    return {
      high: ohlc.high[yesterdayIndex],
      low: ohlc.low[yesterdayIndex]
    };
  } catch {
    return { high: null, low: null };
  }
}

function isAsianSession(): boolean {
  const now = new Date();
  const kyivTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Kiev"}));
  const hour = kyivTime.getHours();
  return hour >= 3 && hour < 8;
}

function calculatePips(price1: number, price2: number, pair: string): number {
  const diff = Math.abs(price1 - price2);
  const multiplier = pair === 'USDJPY' ? 100 : 10000;
  return Math.round(diff * multiplier * 10) / 10;
}

async function monitorAsianSession() {
  if (!isAsianSession()) {
    console.log('⏰ Not Asian session time (03:00-08:00 Europe/Kyiv)');
    return;
  }

  console.log('🌅 Asian Session Monitor - Checking yesterday\'s levels...\n');
  
  const alerts: DailyLevel[] = [];

  for (const pair of PAIRS) {
    const [currentPrice, yesterdayLevels] = await Promise.all([
      getCurrentPrice(pair),
      getYesterdayLevels(pair)
    ]);

    if (!currentPrice || !yesterdayLevels.high || !yesterdayLevels.low) {
      console.log(`❌ ${pair}: Failed to get price data`);
      continue;
    }

    const highDistance = calculatePips(yesterdayLevels.high, currentPrice, pair);
    const lowDistance = calculatePips(yesterdayLevels.low, currentPrice, pair);
    
    const approachingHigh = currentPrice < yesterdayLevels.high && highDistance <= BUFFER_PIPS;
    const approachingLow = currentPrice > yesterdayLevels.low && lowDistance <= BUFFER_PIPS;

    console.log(`${pair}: ${currentPrice.toFixed(5)} | High: ${yesterdayLevels.high.toFixed(5)} (${highDistance.toFixed(1)}p) | Low: ${yesterdayLevels.low.toFixed(5)} (${lowDistance.toFixed(1)}p)`);

    if (approachingHigh) {
      alerts.push({
        pair,
        yesterdayHigh: yesterdayLevels.high,
        currentPrice,
        distance: highDistance,
        type: 'HIGH',
        timestamp: new Date().toISOString()
      });
      console.log(`🚨 HIGH ALERT: ${pair} approaching yesterday's high! Only ${highDistance.toFixed(1)} pips away`);
    }
    
    if (approachingLow) {
      alerts.push({
        pair,
        yesterdayLow: yesterdayLevels.low,
        currentPrice,
        distance: lowDistance,
        type: 'LOW',
        timestamp: new Date().toISOString()
      });
      console.log(`🚨 LOW ALERT: ${pair} approaching yesterday's low! Only ${lowDistance.toFixed(1)} pips away`);
    }
  }

  if (alerts.length > 0) {
    console.log(`\n📢 ${alerts.length} alert(s) triggered during Asian session`);
    // Save alerts to file
    try {
      const existingAlerts = JSON.parse(fs.readFileSync('asian-session-alerts.json', 'utf8'));
      existingAlerts.push(...alerts);
      fs.writeFileSync('asian-session-alerts.json', JSON.stringify(existingAlerts, null, 2));
    } catch {
      fs.writeFileSync('asian-session-alerts.json', JSON.stringify(alerts, null, 2));
    }
  } else {
    console.log('\n✅ No alerts - all pairs are safe from yesterday\'s highs');
  }
}

if (require.main === module) {
  monitorAsianSession();
}

export { monitorAsianSession };