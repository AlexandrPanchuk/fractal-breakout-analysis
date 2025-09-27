import axios from 'axios';
import { readFileSync, existsSync } from 'node:fs';
// import { writeJSON, readJSON } from '../utils/fsio.js';
import { FileManager } from '../../../utils/fileManager';
import type { CalendarEvent } from '../../morningBrief/interfaces';
const KYIV_TZ = 'Europe/Kyiv';
function toUTC(isoLocal: string): string {
  // Розбір ISO з офсетом або без; якщо без — вважаємо локальним та беремо UTC via Date
  return new Date(isoLocal).toISOString();
}
function startOfDayKyiv(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00+03:00');
  return d.toISOString();
}
function kyivWindow(dateISO: string, hhmmStart: string, hhmmEnd: string): { fromUTC: string; toUTC: string } {
  const from = new Date(`${dateISO}T${hhmmStart}:00+03:00`).toISOString();
  const to = new Date(`${dateISO}T${hhmmEnd}:00+03:00`).toISOString();
  return { fromUTC: from, toUTC: to };
}
async function avFxDaily(apikey: string) {
  const u = new URL('https://www.alphavantage.co/query');
  u.searchParams.set('function', 'FX_DAILY');
  u.searchParams.set('from_symbol', 'EUR');
  u.searchParams.set('to_symbol', 'USD');
  u.searchParams.set('outputsize', 'compact');
  u.searchParams.set('apikey', apikey);
  const r = await axios.get(u.toString());
  const j = r.data;
  const ts = j['Time Series FX (Daily)'] || {};
  // return sorted asc
  return Object.entries(ts)
    .map(([t, v]: any) => ({
      date: t,
      o: +v['1. open'],
      h: +v['2. high'],
      l: +v['3. low'],
      c: +v['4. close']
    }))
    .sort((a: any, b: any) => a.date.localeCompare(b.date));
}
async function avFxIntraday1m(apikey: string) {
  const u = new URL('https://www.alphavantage.co/query');
  u.searchParams.set('function', 'FX_INTRADAY');
  u.searchParams.set('from_symbol', 'EUR');
  u.searchParams.set('to_symbol', 'USD');
  u.searchParams.set('interval', '1min');
  u.searchParams.set('outputsize', 'full');
  u.searchParams.set('apikey', apikey);
  const r = await axios.get(u.toString());
  const j = r.data;
  const ts = j['Time Series FX (1min)'] || {};
  const arr = Object.entries(ts).map(([t, v]: any) => ({ t: new Date(t + 'Z').toISOString(), p: (+v['1. open'] + +v['4. close']) / 2 }));
  return arr.sort((a: any, b: any) => a.t.localeCompare(b.t));
}
function atr14(daily: Array<{ h:number; l:number; c:number }>): number | null {
  if (daily.length < 15) return null;
  // True Range: max(High-Low, |High-prevClose|, |Low-prevClose|)
  let sum = 0; let count = 0;
  for (let i = daily.length - 14; i < daily.length; i++) {
    const curr = daily[i];
    const prev = daily[i - 1];
    if (!prev) continue;
    const tr = Math.max(curr.h - curr.l, Math.abs(curr.h - prev.c), Math.abs(curr.l - prev.c));
    sum += tr; count++;
  }
  return count ? sum / count : null;
}
function pct(a: number, b: number) { return (a - b) / Math.abs(b); }
function deltaBps(curr?: number, prev?: number): number | null {
  if (curr == null || prev == null) return null; // inputs in % (e.g., 4.25)
  return (curr - prev) * 100; // bps
}
function summarizeCalendar(cal: CalendarEvent[]) {
  const byImp: Record<number, number> = { 1: 0, 2: 0, 3: 0 } as any;
  let firstRed: string | null = null;
  let redLeft = 0;
  for (const e of cal) {
    byImp[e.importance] = (byImp[e.importance] || 0) + 1;
    if (e.importance === 3) {
      redLeft++;
      if (!firstRed || e.scheduled_at < firstRed) firstRed = e.scheduled_at;
    }
  }
  return { counts: byImp, firstRed, redLeft };
}
function simpleBias({ usd2yBps, overnightPct, asiaBreak }: { usd2yBps: number | null; overnightPct: number | null; asiaBreak: 'up'|'down'|'none' }) {
  let score = 0;
  if (usd2yBps != null) {
    if (usd2yBps > 3) score -= 1; // rising 2Y → USD stronger → EURUSD down
    if (usd2yBps < -3) score += 1;
  }
  if (overnightPct != null) {
    if (overnightPct > 0.002) score += 1; // > +0.2%
    if (overnightPct < -0.002) score -= 1;
  }
  if (asiaBreak === 'up') score += 1;
  if (asiaBreak === 'down') score -= 1;
  const label = score >= 2 ? 'bullish EURUSD' : score <= -2 ? 'bearish EURUSD' : score > 0 ? 'mild bullish' : score < 0 ? 'mild bearish' : 'neutral';
  return { score, label };
}
async function main() {
  const dateISO = process.argv[2] || new Date().toISOString().slice(0,10);
  const AV = '9NR7EKSKADA0NF15';
  // 1) Calendar summary
  const calPath = `data/macro/calendar-today.json`;
  const cal: CalendarEvent[] = existsSync(calPath) ? JSON.parse(readFileSync(calPath, 'utf-8')) : [];
  const calSum = summarizeCalendar(cal);
  // 2) Price context (daily + intraday)
  let daily:any[] = [];
  let intraday:any[] = [];
  let overnightPct: number | null = null;
  let asiaBreak: 'up'|'down'|'none' = 'none';
  let yHigh:number|null=null, yLow:number|null=null;
  let atr:number|null=null;
  if (AV) {
    daily = await avFxDaily(AV);
    atr = atr14(daily);
    // yesterday OHLC
    const todayIdx = daily.findIndex(d => d.date === dateISO);
    const y = todayIdx > 0 ? daily[todayIdx-1] : daily[daily.length-2];
    if (y) { yHigh = y.h; yLow = y.l; }
    intraday = await avFxIntraday1m(AV);
    const midnightUTC = startOfDayKyiv(dateISO);
    const since = intraday.filter(x => x.t >= midnightUTC);
    if (since.length >= 2) {
      overnightPct = pct(since[since.length-1].p, since[0].p);
    }
    // Asia window 03:00–08:00 Kyiv
    const asia = kyivWindow(dateISO, '03:00', '08:00');
    const asiaTicks = intraday.filter(x => x.t >= asia.fromUTC && x.t <= asia.toUTC);
    const asiaHigh = asiaTicks.reduce((m,x)=>Math.max(m,x.p), -Infinity);
    const asiaLow  = asiaTicks.reduce((m,x)=>Math.min(m,x.p),  Infinity);
    const lastP = since.length ? since[since.length-1].p : null;
    if (lastP != null && isFinite(asiaHigh) && isFinite(asiaLow)) {
      asiaBreak = lastP > asiaHigh ? 'up' : lastP < asiaLow ? 'down' : 'none';
    }
  }
  // 3) Rates context (US 2Y/10Y) — read yesterday's file from fetchRates
  const rates = FileManager.readJSON<any>(`data/macro/rates-${dateISO}.json`) as any || FileManager.readJSON<any>(`data/macro/rates-latest.json`);
  let dgs2Bps: number | null = null;
  if (rates?.dgs2?.length >= 2) {
    const last = rates.dgs2[rates.dgs2.length-1]?.value;
    const prev = rates.dgs2[rates.dgs2.length-2]?.value;
    dgs2Bps = deltaBps(last, prev);
  }
  // 4) News snapshot (optional)
  const news = FileManager.readJSON<any[]>(`data/macro/news-${dateISO}.json`);
  const newsCount = news.length;
  // 5) Bias
  const bias = simpleBias({ usd2yBps: dgs2Bps, overnightPct, asiaBreak });
  const brief = {
    date: dateISO,
    calendar: calSum,
    price: {
      yesterday: { high: yHigh, low: yLow },
      overnightPct,
      asiaBreak,
      atr14: atr
    },
    rates: { usd2yBps: dgs2Bps },
    news: { count15m: newsCount },
    bias,
    note: `Bias: ${bias.label}. First red at ${calSum.firstRed ?? '—'}. Overnight ${(overnightPct!=null? (overnightPct*100).toFixed(2)+'%':'—')} | US2Y ${(dgs2Bps!=null? dgs2Bps.toFixed(1)+'bp':'—')} | Asia ${asiaBreak}`
  };
  FileManager.writeJSON(`data/macro/morning-${dateISO}.json`, brief as any);
  console.log(brief.note);
}
main().catch(e => { console.error(e); process.exit(1); });