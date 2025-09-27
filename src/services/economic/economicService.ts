import { CalendarEvent, Release } from './interfaces';
import { FredProvider } from './adapters/fredProvider';
import { ForexFactoryProvider } from './adapters/forexFactoryProvider';
import { YahooFinanceProvider } from './adapters/yahooFinanceProvider';
import { FileManager } from '../../utils/fileManager';
import { SimpleFredProvider } from './adapters/simpleFredProvider';

export class EconomicService {
  private providers = [
    new FredProvider(),
    new SimpleFredProvider(),
    new ForexFactoryProvider(),
    new YahooFinanceProvider(),
    // new FallbackCalendarProvider()
  ];


  async fetchTodaysEvents(): Promise<CalendarEvent[]> {
    const today = new Date().toISOString().split('T')[0];
    
    for (const provider of this.providers) {
      try {
        console.log(`Trying provider: ${provider.constructor.name}`);
        const events = await provider.fetchDay(today);
        
        if (events.length > 0) {
          console.log(`✅ Success with ${provider.constructor.name}: ${events.length} events`);
          FileManager.writeJSON('data/macro/calendar-today.json', events);
          return events;
        }
      } catch (error) {
        console.log(`❌ ${provider.constructor.name} failed:`, error instanceof Error ? error.message : error);
        continue;
      }
    }
    
    console.log('📁 All providers failed, using cached data');
    return FileManager.readJSON('data/macro/calendar-today.json');
  }

  getHighImpactEvents(): CalendarEvent[] {
    const events = FileManager.readJSON<CalendarEvent>('data/macro/calendar-today.json');
    return events.filter(e => e.importance === 3);
  }

  getEventsForPair(pair: string): CalendarEvent[] {
    const events = FileManager.readJSON<CalendarEvent>('data/macro/calendar-today.json');
    const baseCurrency = pair.substring(0, 3);
    const quoteCurrency = pair.substring(3, 6);
    
    return events.filter(e => 
      (baseCurrency === 'EUR' && e.ccy === 'EUR') ||
      (baseCurrency === 'USD' && e.ccy === 'USD') ||
      (quoteCurrency === 'EUR' && e.ccy === 'EUR') ||
      (quoteCurrency === 'USD' && e.ccy === 'USD')
    );
  }

  isHighImpactTime(): boolean {
    const events = this.getHighImpactEvents();
    const now = new Date();
    const currentTime = now.getTime();
    
    return events.some(event => {
      const eventTime = new Date(event.scheduled_at).getTime();
      const timeDiff = Math.abs(currentTime - eventTime);
      return timeDiff <= 30 * 60 * 1000; // Within 30 minutes
    });
  }
}