import axios from 'axios';
import { CalendarEvent, Release, CalendarProvider } from '../interfaces';

export class FredProvider implements CalendarProvider {
  private apiKey = '92e3d97415b10269d02ca3c7fa4b91ff';
  private baseUrl = 'https://api.stlouisfed.org/fred';

  async fetchDay(dateISO: string): Promise<CalendarEvent[]> {
    if (!this.apiKey) {
      console.log('FRED_API_KEY not set, using mock data');
      return this.getMockEvents(dateISO);
    }

    try {
      // FRED releases calendar
      const response = await axios.get(`${this.baseUrl}/releases`, {
        params: {
          api_key: this.apiKey,
          file_type: 'json',
          realtime_start: dateISO,
          realtime_end: dateISO
        }
      });

      const releases = response.data.releases || [];
      
      // Filter to only high-impact economic releases
      const importantReleases = releases.filter((release: any) => 
        this.getImportanceFromName(release.name) === 3
      );
      
      return importantReleases.slice(0, 5).map((release: any) => ({
        id: `USD_${release.name.replace(/\s+/g, '_')}_${dateISO}`,
        ccy: 'USD' as const,
        name: release.name,
        importance: this.getImportanceFromName(release.name),
        scheduled_at: `${dateISO}T14:30:00.000Z`,
        consensus: undefined,
        previous: undefined,
        source: 'FRED'
      }));
    } catch (error) {
      console.log('FRED API failed, using mock data');
      return this.getMockEvents(dateISO);
    }
  }

  private getMockEvents(dateISO: string): CalendarEvent[] {
    const today = new Date().toISOString().split('T')[0];
    if (dateISO !== today) return [];

    return [
      {
        id: `USD_CPI_${dateISO}`,
        ccy: 'USD',
        name: 'Consumer Price Index',
        importance: 3,
        scheduled_at: `${dateISO}T13:30:00.000Z`,
        consensus: 3.2,
        previous: 3.1,
        unit: '%',
        source: 'FRED'
      }
    ];
  }

  private getImportanceFromName(name: string): 1 | 2 | 3 {
    const highImpact = ['employment', 'payroll', 'cpi', 'gdp', 'fomc', 'interest'];
    const lowName = name.toLowerCase();
    return highImpact.some(keyword => lowName.includes(keyword)) ? 3 : 2;
  }

  async fetchReleases(ids: string[]): Promise<Release[]> {
    const releases: Release[] = [];
    
    for (const id of ids) {
      try {
        // Extract series info from ID
        const parts = id.split('_');
        const seriesName = parts.slice(1, -1).join('_');
        
        // Try to get actual data for high-impact series
        const actualValue = await this.getActualValue(seriesName);
        
        releases.push({
          id,
          actual: actualValue,
          revised_from: null,
          released_at: new Date().toISOString()
        });
      } catch (error) {
        // Skip releases we can't get actual data for
        console.log(`Skipping ${id}: no actual data available`);
      }
    }
    
    return releases;
  }
  
  private async getActualValue(seriesName: string): Promise<number | null> {
    // Map common economic indicators to FRED series IDs
    const seriesMap: Record<string, string> = {
      'Consumer_Price_Index': 'CPIAUCSL',
      'Gross_Domestic_Product': 'GDP',
      'Unemployment_Rate': 'UNRATE',
      'Federal_Funds_Rate': 'FEDFUNDS',
      'Industrial_Production': 'INDPRO',
      'Retail_Sales': 'RSAFS',
      'Housing_Starts': 'HOUST',
      'Existing_Home_Sales': 'EXHOSLUSM495S'
    };
    
    const seriesId = seriesMap[seriesName];
    if (!seriesId) return null;
    
    try {
      const response = await axios.get(`${this.baseUrl}/series/observations`, {
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
      console.log(`Failed to get actual value for ${seriesName}`);
    }
    
    return null;
  }
}