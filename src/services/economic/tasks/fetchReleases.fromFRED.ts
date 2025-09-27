// import 'dotenv/config';
// import { readJSON, writeJSON } from '../utils/fsio.js';
// import { FRED_MAPPINGS, FredMapRule } from '../config/fredMappings.js';
// import type { CalendarEvent, Release } from '../types.js';
// import { fredObservations, mom, yoy, qoq, lastFinite } from '../adapters/macro/FredClient.js';
import { FileManager } from '../../../utils/fileManager';
import { FRED_MAPPINGS, FredMapRule } from '../../../config/fredMappings';
import { CalendarEvent, Release } from '../interfaces';
import { mom, qoq, yoy, lastFinite, fredObservations } from '../adapters/FredClient';

const dateISO = process.argv[2] || new Date().toISOString().slice(0,10);

type Tx = (obs: any[]) => number | null;
const TX: Record<string, Tx> = { mom, yoy, qoq, level: (obs) => lastFinite(obs)?.value ?? null };

function pickRule(ev: CalendarEvent): FredMapRule | undefined {
  return FRED_MAPPINGS.find(r => r.match.test(ev.name));
}

async function calcActual(rule: FredMapRule): Promise<number | null> {
  const obs = await fredObservations(rule.seriesId, '2019-01-01');
  const fn = TX[rule.transform];
  return fn ? fn(obs) : null;
}

async function main() {
  const cal = FileManager.readJSON<CalendarEvent>(`data/macro/calendar-today.json`);
  const out: Release[] = [];

  for (const ev of cal) {
    const rule = pickRule(ev);
    if (!rule) {
      // немає правила — залишаємо пусто, можна заповнити вручну
      out.push({
        id: ev.id,
        actual: null,
        revised_from: null,
        released_at: new Date().toISOString()
      });
      continue;
    }
    try {
      const actual = await calcActual(rule);
      out.push({
        id: ev.id,
        actual: actual,           // % у вигляді 0.004 = 0.4% (для m/m, y/y, q/q)
        revised_from: null,
        released_at: new Date().toISOString()
      });
      console.log(`OK ${ev.name} => ${rule.seriesId} (${rule.transform}) = ${actual}`);
    } catch (e:any) {
      console.error(`FRED fetch failed for ${ev.name}:`, e?.message || e);
      out.push({ id: ev.id, actual: null, revised_from: null, released_at: new Date().toISOString() });
    }
  }

  FileManager.writeJSON(`data/macro/releases-${dateISO}.json`, out);
  console.log(`Saved releases for ${dateISO}: ${out.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
