import axios from 'axios';

export class PriceService {
  static async getCurrentPrice(pair: string): Promise<number | null> {
    try {
      const symbol = this.getYahooSymbol(pair);
      const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        params: { range: '1d', interval: '1m' }
      });
      
      // console.log(response.data.chart);
      const result = response.data.chart.result[0];
      const quotes = result.indicators.quote[0];

      // console.log(quotes.close[quotes.close.length - 1]);

      return quotes.close[quotes.close.length - 1];
    } catch (error) {
      console.error(`Failed to get price for ${pair}:`, error);
      return null;
    }
  }

  private static getYahooSymbol(pair: string): string {
    if (pair === 'DX-Y.NYB') return 'DX-Y.NYB';
    if (pair === 'XAUUSD') return 'GC=F';
    return `${pair}=X`;
  }
}