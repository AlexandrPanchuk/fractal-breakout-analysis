import { CalendarEvent } from "./interfaces";
/**
Навіщо: «єдиний календар» з консенсусом/попереднім і мітками ревізій.
Документація / особливості: near-real-time, official sources, previous доступне до виходу й позначається як revised. Потрібен ключ (безкоштовні/платні тарифи).
*/

type TECEvent = { Category:string; Country:string; Date:string; Actual?:number; Previous?:number; Forecast?:number; Importance?:number; };
export async function fetchTECalendar(dayISO: string): Promise<CalendarEvent[]> {
  const url = `https://api.tradingeconomics.com/calendar?country=Euro%20Area,United%20States&start=${dayISO}&end=${dayISO}&c=${process.env.TE_KEY}`;
  const raw: TECEvent[] = await (await fetch(url)).json() as any;
  return raw.map(e => ({
    id: `${e.Country.includes('United')?'USD':'EUR'}_${e.Category.replace(/\s+/g,'_')}_${e.Date}`,
    ccy: e.Country.includes('United') ? 'USD' : 'EUR',
    name: e.Category,
    importance: Math.max(1, Math.min(3, e.Importance ?? 2)) as 1|2|3,
    scheduled_at: new Date(e.Date).toISOString(),
    consensus: e.Forecast ?? null,
    previous: e.Previous ?? null,
    source: 'TradingEconomics'
  })) as any;
}

/**
Навіщо: офіційне джерело для PCE/Core PCE з реліз-датами (Personal Income & Outlays). 
Bureau of Economic Analysis
+1

API: BEA має публічний API (параметри UserID, datasetname=NIUnderlyingDetail|NIPA, таблиці PCE Price Index). Док-посилання PCE та сторінка релізу дають орієнтири назв серій.
 */

type BEAResp = { BEAAPI: { Results: { Data: Array<{ TimePeriod:string; DataValue:string }> } } };
export async function fetchPCE(monthYYYYMM: string) {
  const url = `https://apps.bea.gov/api/data/NIPA/ALL?UserID=${process.env.BEA_KEY}&DatasetName=NIPA&TableName=T20405&Frequency=M&Year=${monthYYYYMM.slice(0,4)}&ResultFormat=JSON`;
  const json: BEAResp = await (await fetch(url)).json() as any;
  const row = json.BEAAPI.Results.Data.find(r => r.TimePeriod.replace('-','') === monthYYYYMM);
  return row ? parseFloat(row.DataValue) : null;
}

type BLSResp = { Results: { series: Array<{ seriesID:string; data:Array<{ year:string; period:string; value:string }> }> } };
export async function fetchBLS(seriesId: string) {
  const r = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ seriesid:[seriesId], startyear:'2024', endyear:'2025' })
  });
  const j: BLSResp = await r.json() as any;
  const entry = j.Results.series[0].data[0];
  return entry ? { y: entry.year, p: entry.period, v: parseFloat(entry.value) } : null;
}