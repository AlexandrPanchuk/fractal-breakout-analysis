import * as fs from 'fs';
import * as path from 'path';

export class MorningBriefService {
  private static readonly CURRENCY_PAIRS = {
    'EUR': 'EURUSD',
    'GBP': 'GBPUSD', 
    'JPY': 'USDJPY',
    'AUD': 'AUDUSD',
    'CAD': 'USDCAD',
    'NZD': 'NZDUSD'
  };

  static getBriefForCurrency(currency: string): any {
    try {
      const today = new Date().toISOString().split('T')[0];
      const briefPath = path.join('data', 'macro', `morning-${today}.json`);
      
      if (!fs.existsSync(briefPath)) {
        return null;
      }

      const rawData = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
      return this.adaptDataForCurrency(rawData, currency);
    } catch (error) {
      return null;
    }
  }

  private static adaptDataForCurrency(rawData: any, currency: string): any {
    const currencyData = this.getCurrencySpecificData(rawData, currency);
    const volatilityRank = this.calculateVolatilityRank(currencyData.atr14);
    const riskLevel = this.calculateRiskLevel(currencyData.calendar?.counts || {});
    const technicals = this.extractTechnicals(currencyData);
    const enhancedNote = this.generateEnhancedNote(currencyData, currency, riskLevel, volatilityRank);

    return {
      ...currencyData,
      currency,
      pair: this.CURRENCY_PAIRS[currency as keyof typeof this.CURRENCY_PAIRS] || `${currency}USD`,
      analysis: {
        volatilityRank,
        riskLevel,
        technicals,
        correlationRisk: this.getCorrelationRisk(currency)
      },
      enhancedNote
    };
  }

  private static calculateVolatilityRank(atr: number): number {
    return Math.min(100, Math.max(0, (atr / 0.015) * 100));
  }

  private static calculateRiskLevel(counts: any): string {
    const high = counts['3'] || 0;
    const medium = counts['2'] || 0;
    
    if (high >= 3) return 'HIGH';
    if (high >= 1 || medium >= 3) return 'MEDIUM';
    return 'LOW';
  }

  private static extractTechnicals(rawData: any): any {
    const yesterday = rawData.price?.yesterday;
    if (!yesterday) return { support: [], resistance: [], range: 0 };

    const range = yesterday.high - yesterday.low;
    const mid = (yesterday.high + yesterday.low) / 2;
    
    return {
      support: [yesterday.low, mid - range * 0.25].map(n => Number(n.toFixed(5))),
      resistance: [yesterday.high, mid + range * 0.25].map(n => Number(n.toFixed(5))),
      range: Number((range * 10000).toFixed(1))
    };
  }

  private static getCorrelationRisk(currency: string): string {
    const riskMap: any = {
      'EUR': 'DXY inverse correlation',
      'GBP': 'Brexit sentiment risk',
      'JPY': 'Safe haven flows',
      'AUD': 'Commodity correlation',
      'CAD': 'Oil price correlation',
      'NZD': 'Risk sentiment'
    };
    return riskMap[currency] || 'USD correlation';
  }

  private static getCurrencySpecificData(baseData: any, currency: string): any {
    const currencyMultipliers = {
      'EUR': { bias: 1.0, volatility: 1.0, calendar: 1.0 },
      'GBP': { bias: 1.2, volatility: 1.3, calendar: 0.8 },
      'JPY': { bias: -0.8, volatility: 0.9, calendar: 0.6 },
      'AUD': { bias: 0.7, volatility: 1.1, calendar: 0.7 },
      'CAD': { bias: 0.5, volatility: 0.8, calendar: 0.5 },
      'NZD': { bias: 0.6, volatility: 1.2, calendar: 0.4 },
      'USD': { bias: -1.0, volatility: 0.7, calendar: 1.0 }
    };

    const multiplier = currencyMultipliers[currency as keyof typeof currencyMultipliers] || currencyMultipliers.EUR;
    
    // Adapt bias based on currency correlation with EUR
    const adaptedBias = {
      score: Math.max(-2, Math.min(2, (baseData.bias?.score || 0) * multiplier.bias)),
      label: this.getBiasLabel((baseData.bias?.score || 0) * multiplier.bias)
    };

    // Adapt volatility
    const adaptedATR = (baseData.price?.atr14 || 0.007) * multiplier.volatility;

    // Adapt calendar impact
    const adaptedCalendar = {
      ...baseData.calendar,
      redLeft: Math.round((baseData.calendar?.redLeft || 0) * multiplier.calendar)
    };

    // Generate currency-specific price levels
    const priceData = this.generatePriceLevels(currency, baseData.price?.yesterday);

    return {
      ...baseData,
      bias: adaptedBias,
      calendar: adaptedCalendar,
      price: {
        ...baseData.price,
        ...priceData,
        atr14: adaptedATR
      }
    };
  }

  private static getBiasLabel(score: number): string {
    if (score > 1.2) return 'strong bullish';
    if (score > 0.5) return 'mild bullish';
    if (score < -1.2) return 'strong bearish';
    if (score < -0.5) return 'mild bearish';
    return 'neutral';
  }

  private static generatePriceLevels(currency: string, eurLevels: any): any {
    const priceLevels = {
      'EUR': { high: 1.1753, low: 1.1645 },
      'GBP': { high: 1.3420, low: 1.3310 },
      'JPY': { high: 149.85, low: 148.90 },
      'AUD': { high: 0.6890, low: 0.6820 },
      'CAD': { high: 1.3580, low: 1.3520 },
      'NZD': { high: 0.6320, low: 0.6260 },
      'USD': { high: 1.0000, low: 1.0000 }
    };

    return {
      yesterday: priceLevels[currency as keyof typeof priceLevels] || eurLevels
    };
  }

  private static generateEnhancedNote(rawData: any, currency: string, riskLevel: string, volatilityRank: number): string {
    const parts = [];
    
    parts.push(`${currency} ${rawData.bias?.label || 'neutral'} bias`);
    
    if (rawData.calendar?.redLeft > 0) {
      parts.push(`${rawData.calendar.redLeft} red events (${riskLevel} risk)`);
    }
    
    if (rawData.price?.overnightPct) {
      const dir = rawData.price.overnightPct > 0 ? 'up' : 'down';
      parts.push(`Overnight ${dir} ${Math.abs(rawData.price.overnightPct).toFixed(1)}%`);
    }
    
    parts.push(`Vol rank: ${volatilityRank.toFixed(0)}%`);
    
    if (rawData.price?.asiaBreak !== 'none') {
      parts.push(`Asia: ${rawData.price?.asiaBreak || 'neutral'}`);
    }

    return parts.join(' | ');
  }
}