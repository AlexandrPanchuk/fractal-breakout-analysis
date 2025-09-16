import * as fs from 'fs';

interface BreakoutReaction {
  id: string;
  pair: string;
  type: 'HIGH' | 'LOW';
  fractalPrice: number;
  breakPrice: number;
  timestamp: string;
  dayOfWeek: number;
  session: 'ASIA' | 'LONDON' | 'NY' | 'OVERLAP';
  timeBucket: string;
  atr: number;
  impulse15m: number;
  impulse1h: number;
  impulse4h: number;
  retrace15m: number;
  retrace1h: number;
  maxDrawdown: number;
  timeToReverse: number | null;
  followThrough: boolean;
}

function cleanupDuplicateReactions() {
  console.log('Cleaning up duplicate breakout reactions...');
  
  try {
    const reactions: BreakoutReaction[] = JSON.parse(fs.readFileSync('breakout-reactions.json', 'utf8'));
    console.log(`Found ${reactions.length} total reactions`);
    
    // Remove duplicates based on pair, type, and fractal price
    const uniqueReactions: BreakoutReaction[] = [];
    const seen = new Set<string>();
    
    for (const reaction of reactions) {
      const key = `${reaction.pair}_${reaction.type}_${reaction.fractalPrice.toFixed(10)}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueReactions.push(reaction);
      }
    }
    
    console.log(`Removed ${reactions.length - uniqueReactions.length} duplicate reactions`);
    console.log(`Keeping ${uniqueReactions.length} unique reactions`);
    
    // Save cleaned reactions
    fs.writeFileSync('breakout-reactions.json', JSON.stringify(uniqueReactions, null, 2));
    
    // Show summary
    const reactionsByPair = uniqueReactions.reduce((acc, reaction) => {
      acc[reaction.pair] = (acc[reaction.pair] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    console.log('\n📊 Reactions by pair:');
    Object.entries(reactionsByPair).forEach(([pair, count]) => {
      console.log(`  ${pair}: ${count} reactions`);
    });
    
  } catch (error) {
    console.error('Error cleaning up reactions:', error);
  }
}

if (require.main === module) {
  cleanupDuplicateReactions();
}

export { cleanupDuplicateReactions };