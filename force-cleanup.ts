import * as fs from 'fs';

interface BreakoutReaction {
  id: string;
  pair: string;
  type: 'HIGH' | 'LOW';
  fractalPrice: number;
  breakPrice: number;
  timestamp: string;
}

function forceCleanupReactions() {
  console.log('Force cleaning duplicate reactions...');
  
  try {
    const reactions: BreakoutReaction[] = JSON.parse(fs.readFileSync('breakout-reactions.json', 'utf8'));
    console.log(`Found ${reactions.length} total reactions`);
    
    // Use Map to ensure uniqueness by pair + fractal price
    const uniqueMap = new Map<string, BreakoutReaction>();
    
    reactions.forEach(reaction => {
      const key = `${reaction.pair}_${reaction.fractalPrice.toFixed(10)}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, reaction);
      }
    });
    
    const uniqueReactions = Array.from(uniqueMap.values());
    
    console.log(`Removed ${reactions.length - uniqueReactions.length} duplicates`);
    console.log(`Keeping ${uniqueReactions.length} unique reactions`);
    
    // Save cleaned reactions
    fs.writeFileSync('breakout-reactions.json', JSON.stringify(uniqueReactions, null, 2));
    
    console.log('✅ Cleanup complete');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  forceCleanupReactions();
}

export { forceCleanupReactions };