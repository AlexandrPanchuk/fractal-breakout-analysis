
// import fetch from 'cross-fetch';
import { FileManager } from '../../../utils/fileManager';
// import { writeJSON } from '../utils/fsio.js';


async function fetchFred(seriesId: string, start: string, apiKey = process.env.FRED_KEY || '92e3d97415b10269d02ca3c7fa4b91ff') {
const url = new URL('https://api.stlouisfed.org/fred/series/observations');
url.searchParams.set('series_id', seriesId);
url.searchParams.set('api_key', apiKey);
url.searchParams.set('file_type', 'json');
url.searchParams.set('observation_start', start);
const res = await fetch(url.toString());
const j = await res.json() as any;
return (j.observations || []).filter((o: any) => o.value !== '.').map((o: any) => ({ date: o.date, value: +o.value }));
}


const dateISO = process.argv[2] || new Date().toISOString().slice(0,10);


async function main() {
const dgs2 = await fetchFred('DGS2', '2025-01-01');
const dgs10 = await fetchFred('DGS10', '2025-01-01');
FileManager.writeJSON(`data/macro/rates-${dateISO}.json`, { dgs2, dgs10 } as any);
console.log(`Saved rates for ${dateISO}: DGS2=${dgs2.length}, DGS10=${dgs10.length}`);
}


main().catch((e) => { console.error(e); process.exit(1); });