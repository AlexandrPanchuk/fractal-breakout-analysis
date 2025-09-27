import { writeFileSync, readFileSync } from 'fs';
import { labelByThreshold, reactionStats } from '../compute/computeReactions';
import { AlphaVantageFeed } from '../adapters/price/AlphaVantageFeed';
import { PriceFeed } from '../adapters/price/PriceFeed';

async function run() {
  const today = new Date().toISOString().slice(0, 10);
  const releases = JSON.parse(readFileSync(`./data/macro/releases-${today}.json`, 'utf-8'));
  const feed: PriceFeed = new AlphaVantageFeed();

  const reactions = [];
  for (const r of releases) {
    const t0 = r.released_at;
    
    try {
      const base = await feed.getAt(t0);
      
      if (!base) {
        console.log(`No base price found for ${r.id} at ${t0}`);
        continue;
      }
      
      for (const w of [300, 900, 3600]) {
        const series = await feed.getRange(t0, new Date(new Date(t0).getTime() + w * 1000).toISOString(), 60);
        const stats = reactionStats(base, series);
        reactions.push({
          id: r.id,
          pair: 'EURUSD',
          windows: { [w]: stats },
          label_m15: labelByThreshold(stats.ret),
        });
      }
    } catch (error) {
      console.error(`Error processing ${r.id}:`, error);
      continue;
    }
  }

  writeFileSync(`./data/macro/reactions-${today}.json`, JSON.stringify(reactions, null, 2));
}
run();
