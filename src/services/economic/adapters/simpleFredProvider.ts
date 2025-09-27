import axios from 'axios';
import { CalendarEvent, Release, CalendarProvider } from '../interfaces';

export class SimpleFredProvider implements CalendarProvider {
  private apiKey = process.env.FRED_API_KEY || '';

  async fetchDay(dateISO: string): Promise<CalendarEvent[]> {
    const today = new Date().toISOString().split('T')[0];
    if (dateISO !== today) return [];

    // Only return key economic indicators that are actually released regularly
    const keyIndicators = [
      {
        id: `USD_CPI_${dateISO}`,
        name: 'Consumer Price Index',
        time: '13:30:00',
        importance: 3
      },
      {
        id: `USD_NFP_${dateISO}`,
        name: 'Non-Farm Payrolls',
        time: '13:30:00',
        importance: 3
      },
      {
        id: `USD_GDP_${dateISO}`,
        name: 'Gross Domestic Product',
        time: '13:30:00',
        importance: 3
      },
      {
        id: `USD_RETAIL_SALES_${dateISO}`,
        name: 'Retail Sales',
        time: '13:30:00',
        importance: 2
      },
      {
        id: `USD_UNEMPLOYMENT_${dateISO}`,
        name: 'Unemployment Rate',
        time: '13:30:00',
        importance: 3
      }
    ];

    return keyIndicators.map(indicator => ({
      id: indicator.id,
      ccy: 'USD' as const,
      name: indicator.name,
      importance: indicator.importance as 1 | 2 | 3,
      scheduled_at: `${dateISO}T${indicator.time}.000Z`,
      consensus: undefined,
      previous: undefined,
      source: 'SimpleFRED'
    }));
  }

  async fetchReleases(ids: string[]): Promise<Release[]> {
    const releases: Release[] = [];
    
    for (const id of ids) {
      try {
        const actualValue = await this.getActualValue(id);
        
        releases.push({
          id,
          actual: actualValue,
          revised_from: null,
          released_at: new Date().toISOString()
        });
      } catch (error) {
        console.log(`No data for ${id}`);
      }
    }
    
    return releases;
  }

  private async getActualValue(id: string): Promise<number | null> {
    if (!this.apiKey) return Math.random() * 100; // Mock data if no API key

    // Map release IDs to FRED series
    const seriesMap: Record<string, string> = {
      'CPI': 'CPIAUCSL',
      'NFP': 'PAYEMS', 
      'GDP': 'GDP',
      'RETAIL_SALES': 'RSAFS',
      'UNEMPLOYMENT': 'UNRATE'
    };

    // Extract indicator type from ID
    const indicatorType = Object.keys(seriesMap).find(key => id.includes(key));
    if (!indicatorType) return null;

    const seriesId = seriesMap[indicatorType];

    try {
      const response = await axios.get('https://api.stlouisfed.org/fred/series/observations', {
        params: {
          series_id: seriesId,
          api_key: this.apiKey,
          file_type: 'json',
          limit: 1,
          sort_order: 'desc'
        }
      });

      const observations = response.data.observations || [];
      if (observations.length > 0) {
        const value = parseFloat(observations[0].value);
        return isNaN(value) ? null : value;
      }
    } catch (error) {
      console.log(`FRED API error for ${seriesId}`);
    }

    return null;
  }
}