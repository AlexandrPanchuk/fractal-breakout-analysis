import axios from 'axios';
import { CalendarEvent, Release, CalendarProvider } from '../interfaces';

export class TradingEconomicsProvider implements CalendarProvider {
  constructor(private apiKey = process.env.TE_KEY || '') {}

  async fetchDay(dateISO: string): Promise<CalendarEvent[]> {
    if (!this.apiKey) throw new Error('TE_KEY env var required');
    
    const url = `https://api.tradingeconomics.com/calendar?country=Euro%20Area,United%20States&start=${dateISO}&end=${dateISO}&c=${this.apiKey}`;
    
    try {
      const response = await axios.get(url);
      const raw = response.data;

      return (raw as any[]).map((e) => {
        const country: string = e.Country || '';
        const ccy = country.includes('United') ? 'USD' : 'EUR';
        const dateUtc = e.Date ? new Date(e.Date).toISOString() : new Date().toISOString();
        const id = `${ccy}_${(e.Category || 'Event').replace(/\s+/g, '_')}_${dateUtc.replace(/[:]/g, '-')}`;
        
        return {
          id,
          ccy: ccy as 'USD' | 'EUR',
          name: e.Category || 'Event',
          importance: Math.max(1, Math.min(3, e.Importance ?? 2)) as 1 | 2 | 3,
          scheduled_at: dateUtc,
          consensus: e.Forecast ?? undefined,
          previous: e.Previous ?? undefined,
          unit: e.Unit || undefined,
          source: 'TradingEconomics'
        } as CalendarEvent;
      });
    } catch (error) {
      console.error('Error fetching TE calendar:', error);
      return [];
    }
  }

  async fetchReleases(ids: string[]): Promise<Release[]> {
    return ids.map((id) => ({ 
      id, 
      actual: null, 
      revised_from: null, 
      released_at: new Date().toISOString() 
    }));
  }
}