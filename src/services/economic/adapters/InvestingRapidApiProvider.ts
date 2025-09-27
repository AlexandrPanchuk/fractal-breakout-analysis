import axios from 'axios';
import type { CalendarEvent, Release, CalendarProvider } from '../interfaces';

/**
 * Investing.com via RapidAPI.
 * Параметризовано через env, бо в RapidAPI можуть бути різні "hosts/paths".
 *
 * Обов'язково перевір у твоєму RapidAPI:
 * - HOST (RAPIDAPI_HOST)
 * - BASE_URL (RAPIDAPI_BASE_URL)
 * - CALENDAR_PATH (RAPIDAPI_CALENDAR_PATH)
 * - Параметри дати/країн (нижче в params)
 */
export class InvestingRapidApiProvider implements CalendarProvider {
  private key = '06ae534744msh1b368081a5a3082p1dac2ajsna75653948604';
  private host = 'investing-com.p.rapidapi.com';
  private baseUrl = `https://${this.host}`;
  private calendarPath = '/calendar';

  constructor(
    private countries: string[] = ['Euro Area', 'United States']  // підлаштуй за потреби
  ) {}

  async fetchDay(dateISO: string): Promise<CalendarEvent[]> {
    if (!this.key) throw new Error('RAPIDAPI_KEY env var required');

    // Часто календар приймає діапазон дат або конкретну дату.
    // Нижче — приклад із start/end як одна доба.
    // Try different parameter combinations based on common RapidAPI patterns
    const params: Record<string, string> = {
      from: dateISO,
      to: dateISO,
      country: 'US,EU'
    };

    // Try multiple possible endpoints
    const possiblePaths = [
      '/calendar',
      '/economic-calendar', 
      '/economicCalendar',
      '/events',
      '/news/economic-calendar'
    ];
    
    for (const path of possiblePaths) {
      const url = `${this.baseUrl}${path}`;
      
      try {
        console.log(`Trying endpoint: ${url}`, params);
      
        const res = await axios.get(url, {
          params,
          headers: {
            'X-RapidAPI-Key': this.key,
            'X-RapidAPI-Host': this.host,
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        
        console.log(`✅ Success with ${path}! Status:`, res.status);
        console.log('Response data structure:', typeof res.data, Array.isArray(res.data));

      console.log('Raw response:', JSON.stringify(res.data, null, 2).substring(0, 500));
      
      let raw = res.data;
      if (raw?.data) raw = raw.data;
      if (raw?.results) raw = raw.results;
      if (raw?.events) raw = raw.events;
      if (raw?.calendar) raw = raw.calendar;
      
      if (!Array.isArray(raw)) {
        console.log('No array found in response, keys:', Object.keys(res.data || {}));
        return [];
      }
      
      console.log(`Found ${raw.length} events`);

      // Очікувані поля в відповіді від Investing можуть відрізнятись.
      // Найчастіше: event (назва), country, date/time, actual, previous, forecast, importance.
      // Зробимо обережне мапування з фолбеками.
      const out: CalendarEvent[] = raw.map((e: any) => {
        const country: string = e.country || e.ccy || '';
        const isUSD = /United/i.test(country) || /USD/.test(country);
        const ccy = isUSD ? 'USD' : 'EUR';

        const category = e.event || e.title || e.category || 'Event';
        const dateStr =
          e.datetime || e.date || e.time || e.Date || e.timestamp || new Date().toISOString();
        const dateUtc = new Date(dateStr).toISOString();

        const id = `${ccy}_${String(category).replace(/\s+/g, '_')}_${dateUtc.replace(/[:]/g, '-')}`;

        // importance часто 1..3 або якось позначається іконками/зірочками
        // Спробуємо нормалізувати:
        let importance: 1|2|3 = 2;
        const impRaw = e.importance ?? e.impact ?? e.priority;
        if (typeof impRaw === 'number') {
          // clamp 1..3
          importance = Math.max(1, Math.min(3, impRaw)) as 1|2|3;
        } else if (typeof impRaw === 'string') {
          const s = impRaw.toLowerCase();
          if (/(high|3|★★★)/.test(s)) importance = 3;
          else if (/(low|1|★)/.test(s)) importance = 1;
          else importance = 2;
        }

        const consensus = parseMaybeNumber(e.forecast ?? e.consensus ?? e.expected);
        const previous = parseMaybeNumber(e.previous ?? e.prev ?? e.last);
        const unit = e.unit || undefined;

        return {
          id,
          ccy,
          name: String(category),
          importance,
          scheduled_at: dateUtc, // якщо хочеш Київський час — конвертни зовні
          consensus: consensus ?? null,
          previous: previous ?? null,
          unit,
          source: 'InvestingRapidAPI'
        } as CalendarEvent;
      });

        return out;
        
      } catch (err: any) {
        console.log(`❌ Failed with ${path}:`, err.response?.status || err.message);
        
        // If it's not a 404, log more details
        if (err.response?.status !== 404) {
          console.log('Response data:', err.response?.data);
        }
        
        continue; // Try next endpoint
      }
    }
    
    console.error('❌ All endpoints failed. Available endpoints might be different.');
    console.log('💡 Check RapidAPI console for correct endpoint paths');
    return [];
  }

  async fetchReleases(ids: string[]): Promise<Release[]> {
    // Цей провайдер не підтверджує факти (actual) — краще брати з офіційних джерел.
    return ids.map((id) => ({
      id,
      actual: null,
      revised_from: null,
      released_at: new Date().toISOString()
    }));
  }
}

function parseMaybeNumber(x: any): number | null {
  if (x == null) return null;
  const s = String(x).trim().replace(/[, ]/g, '');
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}
