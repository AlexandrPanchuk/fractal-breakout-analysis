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
// const PAIRS = ['EURUSD'];
const MULTI_FRACTALS_FILE = 'multi-fractals.json';

async function fetchMultiTimeframeData(pair: string): Promise<{
  daily: OHLCData[];
  weekly: OHLCData[];
  monthly: OHLCData[];
}> {


  try {
    return await fetchPoligonData(pair);
  } catch (error: any) {
    return await fetchYahooData(pair);
  }

  // return await fetchPoligonData(pair);
  // return await fetchYahooData(pair);

  // try {
  //   if (pair === 'EURUSD') {
      
  //   } else {
  //     return await fetchYahooData(pair);
  //   }
  // } catch (error: any) {
  //   console.error(`Failed to fetch Polygon data for ${pair}:`, error.message);
  //   console.log(`Falling back to Yahoo Finance for ${pair}`);
  //   return await fetchYahooData(pair);
  // }
}

// async function getYesterdayEURUSDMinimumPolygon(apiKey: string): Promise<number | null> {
//   try {
//     const yesterday = new Date();
//     yesterday.setDate(yesterday.getDate() - 1);
//     const yesterdayStr = yesterday.toISOString().split('T')[0];

//     const response = await fetch(
//       `https://api.polygon.io/v1/open-close/C:EURUSD/${yesterdayStr}?adjusted=true&apikey=${apiKey}`
//     );

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json() as any;
    
//     if (!data.low) {
//       console.warn(`Дані за ${yesterdayStr} недоступні`);
//       return null;
//     }

//     return data.low;
//   } catch (error) {
//     console.error('Помилка при отриманні курсу Polygon:', error);
//     return null;
//   }
// }

async function fetchPoligonData(pair: string): Promise<{
  daily: OHLCData[];
  weekly: OHLCData[];
  monthly: OHLCData[];
}> {
  const apiKey = '0ypYL85Hl0xGTqaWhRrpkIkPV3jihMrT';

  const parsePolygonData = (data: any, timeframe: string) => {
    console.log(`${pair} ${timeframe} response:`, data.status, data.resultsCount || 0);

    if (!data && !data.results) {
      throw new Error(`Polygon API error: ${data.error || 'No results'}`);
    }

    const today = new Date().toISOString().split('T')[0];
    
    return data.results.map((bar: any) => ({
      date: new Date(bar.t).toISOString().split('T')[0],
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c
    })).filter((d: OHLCData) => d.high && d.low && d.date <= today); // Filter out future dates
  };

  try {
    // Map pairs to Polygon format
    const pairMapping: {[key: string]: string} = {
      'EURUSD': 'C:EURUSD',
      'GBPUSD': 'C:GBPUSD', 
      'USDJPY': 'C:USDJPY',
      'AUDUSD': 'C:AUDUSD',
      'USDCAD': 'C:USDCAD',
      'NZDUSD': 'C:NZDUSD'
    };
    
    if (!pairMapping[pair]) {
      console.log(`${pair} not supported by Polygon, using Yahoo Finance fallback`);
      return await fetchYahooData(pair);
    }
    
    const symbol = pairMapping[pair];
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 4 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dailyResponse = await fetch(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&apikey=${apiKey}`);

    const dailyData = await dailyResponse.json() as any;    
    const daily = parsePolygonData(dailyData, 'daily')

    if (dailyData && dailyData.status === 'DELAYED') {
      await new Promise(resolve => setTimeout(resolve, 15000));
    }

    const weeklyResponse = await fetch(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/week/${startDate}/${endDate}?adjusted=true&sort=asc&apikey=${apiKey}`);
    const weeklyData = await weeklyResponse.json();
    const weekly = parsePolygonData(weeklyData, 'weekly')
    if (weekly && weekly.status === 'DELAYED') {
      await new Promise(resolve => setTimeout(resolve, 15000));
    }

    const monthlyResponse = await fetch(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/month/${startDate}/${endDate}?adjusted=true&sort=asc&apikey=${apiKey}`);
    const monthlyData = await monthlyResponse.json();
    const monthly = parsePolygonData(monthlyData, 'monthly')
    if (weekly && weekly.status === 'DELAYED') {
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
     return {
      daily: daily,
      weekly: weekly,
      monthly: monthly
    };
  } catch (error: any) {
    console.error(`Failed to fetch Yahoo Finance data for ${pair}:`, error.message);
    throw new Error(`Polygon API error: ${error || 'No results'}`);
  }
}


async function fetchYahooData(pair: string): Promise<{
  daily: OHLCData[];
  weekly: OHLCData[];
  monthly: OHLCData[];
}> {
  try {
    const symbol = pair === 'DX-Y.NYB' ? 'DX-Y.NYB' : pair === 'XAUUSD' ? 'GC=F' : `${pair}=X`;
    const [dailyResponse, weeklyResponse, monthlyResponse] = await Promise.all([
      axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        params: { range: '5y', interval: '1d' }
      }),
      axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        params: { range: '5y', interval: '1wk' }
      }),
      axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        params: { range: '10y', interval: '1mo' }
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
    console.error(`Failed to fetch Yahoo Finance data for ${pair}:`, error.message);
    return { daily: [], weekly: [], monthly: [] };
  }
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

interface MultiFractal {
  price: number;
  daysAgo: number;
  status: 'ACTIVE' | 'BROKEN';
  brokenAt?: string;
}

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

function findMultiFractals(data: PriceData[], lookbackPeriod: number = 5): { highs: MultiFractal[], lows: MultiFractal[] } {
  if (data.length < lookbackPeriod * 2 + 1) {
    return { highs: [], lows: [] };
  }

  const highs: MultiFractal[] = [];
  const lows: MultiFractal[] = [];
  const currentPrice = data[data.length - 1].close;
  const currentDate = data[data.length - 1].date;

  // Find fractal highs and lows
  for (let i = lookbackPeriod; i < data.length - lookbackPeriod; i++) {
    const currentHigh = data[i].high;
    const currentLow = data[i].low;
    
    // Check for fractal high (current high is higher than surrounding periods)
    let isHigh = true;
    for (let j = i - lookbackPeriod; j <= i + lookbackPeriod; j++) {
      if (j !== i && data[j].high >= currentHigh) {
        isHigh = false;
        break;
      }
    }
    
    // Check for fractal low (current low is lower than surrounding periods)
    let isLow = true;
    for (let j = i - lookbackPeriod; j <= i + lookbackPeriod; j++) {
      if (j !== i && data[j].low <= currentLow) {
        isLow = false;
        break;
      }
    }
    
    const daysAgo = data.length - 1 - i;
    
    if (isHigh) {
      // Check if this high is broken (current price is above this high)
      const isBroken = currentPrice > currentHigh;
      
      highs.push({
        price: currentHigh,
        daysAgo: daysAgo,
        status: isBroken ? 'BROKEN' : 'ACTIVE',
        brokenAt: isBroken ? currentDate : undefined
      });
    }
    
    if (isLow) {
      // Check if this low is broken (current price is below this low)
      const isBroken = currentPrice < currentLow;
      
      lows.push({
        price: currentLow,
        daysAgo: daysAgo,
        status: isBroken ? 'BROKEN' : 'ACTIVE',
        brokenAt: isBroken ? currentDate : undefined
      });
    }
  }
  
  // Sort highs: ACTIVE first, then BROKEN, both sorted by price DESCENDING (highest first)
  highs.sort((a, b) => {
    // ACTIVE status takes priority over BROKEN
    if (a.status === 'ACTIVE' && b.status === 'BROKEN') return -1;
    if (a.status === 'BROKEN' && b.status === 'ACTIVE') return 1;
    
    // Within same status group: sort by price DESCENDING (highest price first)
    return b.price - a.price;
  });
  
  // Sort lows: ACTIVE first, then BROKEN, both sorted by price DESCENDING (highest first)
  lows.sort((a, b) => {
    // ACTIVE status takes priority over BROKEN
    if (a.status === 'ACTIVE' && b.status === 'BROKEN') return -1;
    if (a.status === 'BROKEN' && b.status === 'ACTIVE') return 1;
    
    // Within same status group: sort by price DESCENDING (highest price first)
    return b.price - a.price;
  });
  
  return { highs, lows };
}


async function updateMultiTimeframeFractals() {
  console.log('Updating multi-timeframe fractals...\n');
  
  const allFractals: MultiTimeframeFractals[] = [];

  for (const pair of PAIRS) {
    console.log(`Processing ${pair}...`);
    
    const data = await fetchMultiTimeframeData(pair);
    // await new Promise(resolve => setTimeout(resolve, 25000)); // 15 second delay
    
    if (data.daily.length === 0) {
      console.log(`  No data available for ${pair}\n`);
      continue;
    }

    // console.log(getLast3UntakenUpperFractals(data.daily));
    // console.log(getFractals(data.daily));


    const top3Highest = [...data.daily]
      .sort((a, b) => b.high - a.high)
      .slice(0, 3);

    // console.log(top3Highest);

    // const highestHigh = data.daily.reduce((max, current) => 
    //   current.high > max.high ? current : max
    // );
    // console.log(highestHigh);



    // console.log( findMultiFractals(data.daily, 5));
    // console.log(getFractals(data.daily));

    // const dailyFractals = findMultiFractals(data.daily, 5);
    // const weeklyFractals = findMultiFractals(data.weekly, 5);
    // const monthlyFractals = findMultiFractals(data.monthly, 5);

    // console.log(data.daily);

    const dailyFractals = getFractals(data.daily);
    const weeklyFractals = getFractals(data.weekly);
    const monthlyFractals = getFractals(data.monthly);
    
    // Debug: Show current price and highest fractal
    const currentPrice = data.daily[data.daily.length - 1]?.close;
    const highestHigh = Math.max(...data.daily.map(d => d.high));
    const activeHighs = dailyFractals.highs.filter(h => h.status === 'ACTIVE');
    console.log(`  Current: ${currentPrice?.toFixed(5)}, Highest in data: ${highestHigh.toFixed(5)}, Active highs: ${activeHighs.length}`);
    if (activeHighs.length === 0) {
      console.log(`  No ACTIVE highs found - market is above all recent fractal resistance levels`);
    }


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

  // console.log(allFractals);

  saveMultiFractals(allFractals);
  console.log(`✅ Multi-timeframe fractals saved to ${MULTI_FRACTALS_FILE}`);
  
  return allFractals;
}

// type MultiFractal = {
//   price: number;
//   daysAgo: number;
//   status: "active" | "broken";
//   brokenAt: string | null;
// };

function daysBetweens(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}


export function getFractals(data: Candle[]): { highs: MultiFractal[]; lows: MultiFractal[] } {
  if (!data || data.length < 5) return { highs: [], lows: [] };


  // const date = new Date();
  // const top5InRequestedFormat = data
  //   .sort((a, b) => b.high - a.high)
  //   .slice(0, 5)
  //   .map(item => ({
  //     price: item.high,
  //     daysAgo: daysBetweens(item.date, date.toDateString()),
  //     status: 'ACTIVE',
  //     brokenAt: ''
  //   })) as MultiFractal[];


  const highsAll: MultiFractal[] = [];
  const lowsAll: MultiFractal[] = [];


  // for (let i = 2; i <= top5InRequestedFormat.length - 3; i++) {
  //     highsAll.push(top5InRequestedFormat[i]);
  // }



  // highsAll.push(top5InRequestedFormat);

  const lastDate = new Date(data[data.length - 1].date);

  const daysBetween = (a: string, b: Date) =>
    Math.floor((b.getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));

  const highestHigh = Math.max(...data.map(d => d.high));

  // console.log(data);

  const currentPrice = data[data.length - 1].close;
  const recordsAboveCurrentPrice = data
      .filter(record => record.high > currentPrice)
      .map(record => ({
        ...record,
        distanceFromCurrent: record.high - currentPrice
      }))
      .sort((a, b) => a.distanceFromCurrent - b.distanceFromCurrent)
      .slice(0, 3);


  for (let i = 2; i <= data.length - 3; i++) {
    const h0 = data[i].high;
    const hL1 = data[i - 1].high, hL2 = data[i - 2].high;
    const hR1 = data[i + 1].high, hR2 = data[i + 2].high;

    const l0 = data[i].low;
    const lL1 = data[i - 1].low, lL2 = data[i - 2].low;
    const lR1 = data[i + 1].low, lR2 = data[i + 2].low;

    // Верхній фрактал
    if (h0 > hL1 && h0 > hL2 && h0 > hR1 && h0 > hR2) {
      let brokenAt: string | undefined = undefined;
      for (let j = i + 1; j < data.length; j++) {
        if (data[j].high >= h0) { brokenAt = data[j].date; break; }
      }
      highsAll.push({
        price: h0,
        daysAgo: daysBetween(data[i].date, lastDate),
        status: brokenAt ? 'BROKEN' : 'ACTIVE',
        brokenAt,
      });
    }


    // console.log(highsAll);


    // lower fractal
    if (l0 < lL1 && l0 < lL2 && l0 < lR1 && l0 < lR2) {
      let brokenAt: string | undefined = undefined;
      for (let j = i + 1; j < data.length; j++) if (data[j].low <= l0) { brokenAt = data[j].date; break; }
      
      // Also check if current price is below this low
      const currentPrice = data[data.length - 1].close;
      const isCurrentlyBroken = currentPrice < l0;
      
      lowsAll.push({
        price: l0,
        daysAgo: daysBetween(data[i].date, lastDate),
        status: (brokenAt || isCurrentlyBroken) ? 'BROKEN' : 'ACTIVE',
        brokenAt,
      });




    }
  }

  // Check if we have any ACTIVE highs, if not, add some from records above current price
  const activeLevels = highsAll.filter(level => level.status === 'ACTIVE');
  
  if (activeLevels.length === 0) {
    for (let i = 0; i < Math.min(recordsAboveCurrentPrice.length, 3); i++) {
      const record = recordsAboveCurrentPrice[i];
      let brokenAt: string | undefined = undefined;
      highsAll.push({
        price: record.high,
        daysAgo: daysBetween(record.date, lastDate),
        status: 'ACTIVE',
        brokenAt,
      });
    }
  }

  // console.log(highsAll);

  // Sort highs: ACTIVE first, then BROKEN, both sorted by daysAgo ascending (most recent first)
  const highs = highsAll.sort((a, b) => {
    if (a.status === 'ACTIVE' && b.status === 'BROKEN') return -1;
    if (a.status === 'BROKEN' && b.status === 'ACTIVE') return 1;
    return a.daysAgo - b.daysAgo;
  }).slice(0, 5);

  // Sort lows: ACTIVE first, then BROKEN, both sorted by daysAgo ascending (most recent first)
  const lows = lowsAll.sort((a, b) => {
    if (a.status === 'ACTIVE' && b.status === 'BROKEN') return -1;
    if (a.status === 'BROKEN' && b.status === 'ACTIVE') return 1;
    return a.daysAgo - b.daysAgo;
  }).slice(0, 5);

  return { highs, lows };
}


interface LevelData {
  price: number;
  daysAgo: number;
  status: 'ACTIVE' | 'BROKEN';
  brokenAt: string | null;
}

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

function checkAndUpdateLevels(
  levels: LevelData[], 
  priceData: PriceData[], 
  currentPrice: number,
  currentDate: string = '2025-09-19'
): LevelData[] {
  
  // Перевіряємо чи є активні рівні
  const activeLevels = levels.filter(level => level.status === 'ACTIVE');
  
  console.log(`Знайдено активних рівнів: ${activeLevels.length}`);
  
  // Якщо є активні рівні, повертаємо оригінальний масив
  if (activeLevels.length > 0) {
    console.log('Активні рівні знайдені:', activeLevels);
    return levels;
  }
  
  // Якщо немає активних рівнів, знаходимо 3 найближчі до поточної ціни записи
  const recordsAboveCurrentPrice = priceData
    .filter(record => record.high > currentPrice)
    .map(record => ({
      ...record,
      distanceFromCurrent: record.high - currentPrice
    }))
    .sort((a, b) => a.distanceFromCurrent - b.distanceFromCurrent)
    .slice(0, 3);
  
  console.log(`Записи вище поточної ціни (${currentPrice}):`, recordsAboveCurrentPrice);
  
  // Створюємо активні рівні з найближчих записів
  const levelsAboveCurrentPrice = recordsAboveCurrentPrice
    .map(record => ({
      price: record.high,
      daysAgo: daysBetween(record.date, currentDate),
      status: 'ACTIVE' as const,
      brokenAt: null
    }));
  
  console.log(`Рівні вище поточної ціни (${currentPrice}):`, levelsAboveCurrentPrice);
  
  // Додаємо нові активні рівні до існуючих
  const updatedLevels = [...levels, ...levelsAboveCurrentPrice];
  
  return updatedLevels;
}


function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}


type Candle = {
  date: string;           // 'YYYY-MM-DD' або ISO
  open: number;
  high: number;
  low: number;
  close: number;
};

/**
 * Повертає 3 останні (найсвіжіші) верхні фрактали, які ще не були зняті ціною.
 * Дані мають бути відсортовані за датою зростанням (найстаріша -> найновіша).
 * "Верхній фрактал" за Bill Williams: high[i] вищий за highs двох свічок ліворуч і двох праворуч.
 * "Не знятий": після появи фракталу жодна наступна свічка не робила high >= рівня фракталу.
 */
export function getLast3UntakenUpperFractals(data: Candle[]): Array<{
  index: number;   // індекс у масиві
  date: string;    // дата свічки-фракталу
  level: number;   // ціна фракталу (high)
}> {
  if (!data || data.length < 5) return [];

  const uppers: { index: number; date: string; level: number; }[] = [];

  // шукаємо верхні фрактали
  for (let i = 2; i <= data.length - 3; i++) {
    const h0 = data[i].high;
    const hL1 = data[i - 1].high, hL2 = data[i - 2].high;
    const hR1 = data[i + 1].high, hR2 = data[i + 2].high;

    const isUpperFractal = h0 > hL1 && h0 > hL2 && h0 > hR1 && h0 > hR2;
    if (!isUpperFractal) continue;

    // перевіряємо, чи "знятий" (пробитий) цей рівень у майбутніх свічках
    let takenOut = false;
    for (let j = i + 1; j < data.length; j++) {
      if (data[j].high >= h0) {
        takenOut = true;
        break;
      }
    }
    if (!takenOut) {
      uppers.push({ index: i, date: data[i].date, level: h0 });
    }
  }

  // беремо 3 найсвіжіші (за індексом/датою)
  return uppers.sort((a, b) => b.index - a.index).slice(0, 3);
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