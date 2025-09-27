import axios from 'axios';
import { CalendarEvent, Release, CalendarProvider } from '../interfaces';

export class YahooFinanceProvider implements CalendarProvider {
  private baseUrl = 'https://query1.finance.yahoo.com/v1/finance/calendar';

  async fetchDay(dateISO: string): Promise<CalendarEvent[]> {
    try {
      const startTime = new Date(dateISO).getTime() / 1000;
      const endTime = startTime + 86400; // +24 hours

      const response = await axios.get(`${this.baseUrl}/earnings`, {
        params: {
          from: startTime,
          to: endTime,
          formatted: true,
          lang: 'en-US',
          region: 'US'
        },
        timeout: 10000
      });

      const data = response.data?.finance?.result?.[0];
      if (!data?.earnings) return [];

      const events: CalendarEvent[] = data.earnings.map((earning: any) => {
        const symbol = earning.ticker || 'Unknown';
        const companyName = earning.companyshortname || symbol;
        const earningsDate = new Date(earning.startdatetime).toISOString();

        return {
          id: `USD_${symbol}_Earnings_${dateISO}`,
          ccy: 'USD' as const,
          name: `${companyName} Earnings`,
          importance: this.getImportanceFromSymbol(symbol),
          scheduled_at: earningsDate,
          consensus: earning.epsestimate,
          previous: earning.epsactual,
          unit: 'EPS',
          source: 'YahooFinance'
        };
      });

      console.log(`Yahoo Finance: Found ${events.length} earnings events`);
      return events;

    } catch (error) {
      console.log('Yahoo Finance failed:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  private getImportanceFromSymbol(symbol: string): 1 | 2 | 3 {
    // Major companies that can move markets
    const majorSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'BAC'];
    return majorSymbols.includes(symbol) ? 3 : 2;
  }

  async fetchReleases(ids: string[]): Promise<Release[]> {
    return ids.map(id => ({
      id,
      actual: null,
      revised_from: null,
      released_at: new Date().toISOString()
    }));
  }
}