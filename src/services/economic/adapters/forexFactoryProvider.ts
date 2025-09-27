import axios from 'axios';
import * as cheerio from 'cheerio';
import { CalendarEvent, Release, CalendarProvider } from '../interfaces';

export class ForexFactoryProvider implements CalendarProvider {
  private baseUrl = 'https://www.forexfactory.com';

  async fetchDay(dateISO: string): Promise<CalendarEvent[]> {
    try {
      // Format date for FF URL (MMM-DD-YYYY)
      const date = new Date(dateISO);
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                     'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const formattedDate = `${months[date.getMonth()]}${date.getDate()}.${date.getFullYear()}`;
      
      const url = `${this.baseUrl}/calendar?day=${formattedDate}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const events: CalendarEvent[] = [];

      $('.calendar__row').each((i, row) => {
        const $row = $(row);
        const time = $row.find('.calendar__time').text().trim();
        const currency = $row.find('.calendar__currency').text().trim();
        const impact = $row.find('.calendar__impact span').attr('title') || '';
        const event = $row.find('.calendar__event').text().trim();
        const actual = $row.find('.calendar__actual').text().trim();
        const forecast = $row.find('.calendar__forecast').text().trim();
        const previous = $row.find('.calendar__previous').text().trim();

        if (event && (currency === 'USD' || currency === 'EUR')) {
          const importance = this.parseImpact(impact);
          const scheduledTime = this.parseTime(time, dateISO);

          events.push({
            id: `${currency}_${event.replace(/\s+/g, '_')}_${dateISO}`,
            ccy: currency as 'USD' | 'EUR',
            name: event,
            importance,
            scheduled_at: scheduledTime,
            consensus: this.parseNumber(forecast),
            previous: this.parseNumber(previous),
            source: 'ForexFactory'
          });
        }
      });

      console.log(`ForexFactory: Found ${events.length} events`);
      return events;

    } catch (error) {
      console.log('ForexFactory scraping failed:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  private parseImpact(impact: string): 1 | 2 | 3 {
    if (impact.includes('High')) return 3;
    if (impact.includes('Medium')) return 2;
    return 1;
  }

  private parseTime(time: string, dateISO: string): string {
    if (!time || time === 'All Day') {
      return `${dateISO}T12:00:00.000Z`;
    }
    
    // Parse time like "8:30am" or "2:00pm"
    const match = time.match(/(\d{1,2}):(\d{2})(am|pm)/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toLowerCase();
      
      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      
      return `${dateISO}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`;
    }
    
    return `${dateISO}T12:00:00.000Z`;
  }

  private parseNumber(value: string): number | undefined {
    if (!value || value === '--') return undefined;
    const cleaned = value.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
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