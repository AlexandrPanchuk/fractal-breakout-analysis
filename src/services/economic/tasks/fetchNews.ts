
import { FileManager } from '../../../utils/fileManager';
import { fetchGdelt15m } from '../adapters/news/GdeltClient';
// import { fetchGdelt15m } from '../adapters/news/GdeltClient.ts';
// import { fetchGdelt15m } from '../adapters/news/GdeltClient.js';


const dateISO = process.argv[2] || new Date().toISOString().slice(0,10);


async function main() {
const docs = await fetchGdelt15m();
FileManager.writeJSON(`data/macro/news-${dateISO}.json`, docs);
console.log(`Saved news snapshot for ${dateISO}: ${docs.length}`);
}


main().catch((e) => { console.error(e); process.exit(1); });