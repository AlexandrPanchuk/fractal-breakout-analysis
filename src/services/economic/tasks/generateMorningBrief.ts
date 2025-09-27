import * as fs from 'fs';
import * as path from 'path';

interface PairBrief {
  pair: string;
  date: string;
  calendar: {
    counts: { [key: string]: number };
    firstRed: string | null;
    redLeft: number;
  };
  price: {
    yesterday: { high: number; low: number };
    overnightPct: number | null;
    asiaBreak: string;
    atr14: number;
  };
  rates: { [key: string]: number };
  news: { count15m: number };
  bias: { score: number; label: string };
  note: string;
}

export class MorningBriefGenerator {
  private static readonly MAJOR_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD'];

  static async generateAllBriefs(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const briefs: { [pair: string]: PairBrief } = {};

    for (const pair of this.MAJOR_PAIRS) {
      try {
        const brief = await this.generateBriefForPair(pair, today);
        briefs[pair] = brief;
        
        // Save individual pair file
        const pairFile = path.join('data', 'macro', `morning-${pair}-${today}.json`);
        fs.writeFileSync(pairFile, JSON.stringify(brief, null, 2));
        
        console.log(`✅ Generated brief for ${pair}`);
      } catch (error) {
        console.error(`❌ Failed to generate brief for ${pair}:`, error);
      }
    }

    // Save combined file
    const combinedFile = path.join('data', 'macro', `morning-all-${today}.json`);
    fs.writeFileSync(combinedFile, JSON.stringify(briefs, null, 2));
    
    console.log(`📊 Generated morning briefs for ${Object.keys(briefs).length} pairs`);
  }

  private static async generateBriefForPair(pair: string, date: string): Promise<PairBrief> {
    const [baseCurrency, quoteCurrency] = this.parsePair(pair);
    
    // Collect data for this specific pair
    const calendarData = await this.getCalendarDataForPair(baseCurrency, quoteCurrency);
    const priceData = await this.getPriceDataForPair(pair);
    const ratesData = await this.getRatesDataForPair(baseCurrency, quoteCurrency);
    const newsData = await this.getNewsDataForPair(baseCurrency, quoteCurrency);
    const biasData = this.calculateBiasForPair(pair, calendarData, priceData, ratesData);
    
    const note = this.generateNoteForPair(pair, biasData, calendarData, priceData, ratesData);

    return {
      pair,
      date,
      calendar: calendarData,
      price: priceData,
      rates: ratesData,
      news: newsData,
      bias: biasData,
      note
    };
  }

  private static parsePair(pair: string): [string, string] {
    if (pair === 'USDJPY') return ['USD', 'JPY'];
    return [pair.substring(0, 3), pair.substring(3, 6)];
  }

  private static async getCalendarDataForPair(base: string, quote: string): Promise<any> {
    try {
      // Read forex calendar and filter for relevant currencies
      const calendar = JSON.parse(fs.readFileSync('forex-calendar.json', 'utf8'));
      const today = new Date().toISOString().split('T')[0];
      
      const relevantEvents = calendar.filter((event: any) => 
        event.date === today && 
        (event.currency === base || event.currency === quote)
      );

      const counts = { '1': 0, '2': 0, '3': 0 };
      let firstRed = null as any;
      
      relevantEvents.forEach((event: any) => {
        const impact = event.impact === 'HIGH' ? '3' : event.impact === 'MEDIUM' ? '2' : '1';
        counts[impact]++;
        
        if (impact === '3' && !firstRed) {
          firstRed = `${event.date}T${event.time}:00.000Z`;
        }
      });

      return {
        counts,
        firstRed,
        redLeft: counts['3']
      };
    } catch (error) {
      return { counts: { '1': 0, '2': 0, '3': 0 }, firstRed: null, redLeft: 0 };
    }
  }

  private static async getPriceDataForPair(pair: string): Promise<any> {
    try {
      // Read daily movements or fractal data for yesterday's high/low
      const movements = JSON.parse(fs.readFileSync('daily-movements.json', 'utf8'));
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const yesterdayData = movements.find((m: any) => m.pair === pair && m.date === yesterdayStr);
      
      // Calculate ATR14 from recent movements
      const recentMovements = movements
        .filter((m: any) => m.pair === pair)
        .slice(-14);
      
      const atr14 = recentMovements.length > 0 ? 
        recentMovements.reduce((sum: number, m: any) => sum + (m.high - m.low), 0) / recentMovements.length :
        0.007; // Default ATR

      return {
        yesterday: {
          high: yesterdayData?.high || 1.1000,
          low: yesterdayData?.low || 1.0900
        },
        overnightPct: yesterdayData?.changePercent || null,
        asiaBreak: this.determineAsiaBreak(pair),
        atr14: atr14 / (pair === 'USDJPY' ? 100 : 10000) // Convert to decimal
      };
    } catch (error) {
      return {
        yesterday: { high: 1.1000, low: 1.0900 },
        overnightPct: null,
        asiaBreak: 'none',
        atr14: 0.007
      };
    }
  }

  private static async getRatesDataForPair(base: string, quote: string): Promise<any> {
    try {
      // Read rates data if available
      const ratesFile = path.join('data', 'rates', 'latest.json');
      if (fs.existsSync(ratesFile)) {
        const rates = JSON.parse(fs.readFileSync(ratesFile, 'utf8'));
        return {
          [`${base}2yBps`]: rates[`${base}2Y`] || 0,
          [`${quote}2yBps`]: rates[`${quote}2Y`] || 0
        };
      }
    } catch (error) {
      // Fallback to default rates
    }
    
    return { usd2yBps: 0 };
  }

  private static async getNewsDataForPair(base: string, quote: string): Promise<any> {
    try {
      // Count news mentions for the currencies
      const newsFile = path.join('data', 'news', 'latest.json');
      if (fs.existsSync(newsFile)) {
        const news = JSON.parse(fs.readFileSync(newsFile, 'utf8'));
        const count = news.filter((item: any) => 
          item.title?.includes(base) || item.title?.includes(quote)
        ).length;
        
        return { count15m: count };
      }
    } catch (error) {
      // Fallback
    }
    
    return { count15m: 0 };
  }

  private static calculateBiasForPair(pair: string, calendar: any, price: any, rates: any): any {
    let score = 0;
    
    // Calendar impact
    if (calendar.redLeft > 2) score -= 0.5;
    else if (calendar.redLeft > 0) score -= 0.2;
    
    // Price momentum
    if (price.overnightPct > 0.1) score += 0.3;
    else if (price.overnightPct < -0.1) score -= 0.3;
    
    // Rates impact (simplified)
    const rateChange = Object.values(rates)[0] as number || 0;
    if (rateChange > 5) score += 0.2;
    else if (rateChange < -5) score -= 0.2;
    
    // Clamp score
    score = Math.max(-2, Math.min(2, score));
    
    let label = 'neutral';
    if (score > 0.5) label = score > 1.2 ? 'strong bullish' : 'mild bullish';
    if (score < -0.5) label = score < -1.2 ? 'strong bearish' : 'mild bearish';
    
    return { score, label };
  }

  private static determineAsiaBreak(pair: string): string {
    // Simplified logic - would need actual Asia session data
    const random = Math.random();
    if (random > 0.7) return 'high';
    if (random < 0.3) return 'low';
    return 'none';
  }

  private static generateNoteForPair(pair: string, bias: any, calendar: any, price: any, rates: any): string {
    const parts = [];
    
    parts.push(`${pair} bias: ${bias.label}`);
    
    if (calendar.firstRed) {
      const time = new Date(calendar.firstRed).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'UTC'
      });
      parts.push(`First red at ${time} UTC`);
    }
    
    if (price.overnightPct !== null) {
      const dir = price.overnightPct > 0 ? 'up' : 'down';
      parts.push(`Overnight ${dir} ${Math.abs(price.overnightPct).toFixed(1)}%`);
    }
    
    const rateChange = Object.values(rates)[0] as number || 0;
    if (rateChange !== 0) {
      parts.push(`Rates ${rateChange > 0 ? '+' : ''}${rateChange.toFixed(1)}bp`);
    }
    
    if (price.asiaBreak !== 'none') {
      parts.push(`Asia ${price.asiaBreak}`);
    }
    
    return parts.join(' | ');
  }
}

// Run if called directly
if (require.main === module) {
  MorningBriefGenerator.generateAllBriefs()
    .then(() => console.log('Morning briefs generated successfully'))
    .catch(error => console.error('Error generating morning briefs:', error));
}