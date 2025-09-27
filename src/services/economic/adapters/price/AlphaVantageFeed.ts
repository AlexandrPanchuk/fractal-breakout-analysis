import axios from 'axios';
// import type { PriceFeed } from './PriceFeed.js';
import type { PriceTick } from '../../types.js';
import { PriceFeed } from './PriceFeed.js';
export class AlphaVantageFeed implements PriceFeed {
  constructor(private apiKey = '9NR7EKSKADA0NF15') {}
  async getAt(iso: string): Promise<PriceTick | null> {

    // console.log(iso);

    const window = 5 * 60 * 1000; // 5 minutes tolerance
    const from = new Date(new Date(iso).getTime() - window).toISOString();
    const to = new Date(new Date(iso).getTime() + window).toISOString();

    // console.log(from, to);

    const series = await this.getRange(from, to, 60);
    
    if (!series.length) return null;
    // choose the closest tick by time
    const target = new Date(iso).getTime();
    let best: PriceTick | null = null;
    let bestDiff = Infinity;
    for (const s of series) {
      const diff = Math.abs(new Date(s.t).getTime() - target);
      if (diff < bestDiff) { best = s; bestDiff = diff; }
    }
    return best;
  }
  async getRange(fromIso: string, toIso: string, _granSec: number): Promise<PriceTick[]> {
    if (!this.apiKey) throw new Error('AV_KEY env var required');
    const url = new URL('https://www.alphavantage.co/query');
    url.searchParams.set('function', 'FX_INTRADAY');
    url.searchParams.set('from_symbol', 'EUR');
    url.searchParams.set('to_symbol', 'USD');
    url.searchParams.set('interval', '1min');
    url.searchParams.set('outputsize', 'full');
    url.searchParams.set('apikey', this.apiKey);
    const res = await axios.get(url.toString());
    const j = res.data;
    const series = j['Time Series FX (1min)'] || {};
    const arr = Object.entries(series).map(([t, v]: any) => ({
      t: new Date(t + 'Z').toISOString(),
      mid: (parseFloat(v['1. open']) + parseFloat(v['4. close'])) / 2
    }));
    const fromT = new Date(fromIso).getTime();
    const toT = new Date(toIso).getTime();
    return arr
      .filter((x) => {
        const tt = new Date(x.t).getTime();
        return tt >= fromT && tt <= toT;
      })
      .sort((a, b) => a.t.localeCompare(b.t));
  }
}