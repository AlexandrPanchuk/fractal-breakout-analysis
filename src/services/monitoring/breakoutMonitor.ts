import { BreakoutReaction } from '../../types';
import { FileManager } from '../../utils/fileManager';
import { DATA_FILES, CURRENCY_PAIRS } from '../../config/constants';
import { PriceService } from '../data/priceService';

export class BreakoutMonitor {
  private static brokenFractals = new Set<string>();

  static async checkBreakouts(): Promise<void> {
    const multiFractals = FileManager.readJSON('multi-fractals.json') as any;
    
    for (const pairData  of multiFractals) {
      const currentPrice = await PriceService.getCurrentPrice(pairData.pair);
      if (!currentPrice) continue;

      const timeframes = ['daily', 'weekly', 'monthly'] as const;
      
      for (const timeframe of timeframes) {
        const data = pairData[timeframe];
        
        // Check highs
        for (const high of data.highs) {
          if (high.status === 'ACTIVE' && currentPrice > high.price) {
            this.recordReaction(pairData.pair, 'HIGH', timeframe, high.price, currentPrice);
          }
        }

        // Check lows
        for (const low of data.lows) {
          if (low.status === 'ACTIVE' && currentPrice < low.price) {
            this.recordReaction(pairData.pair, 'LOW', timeframe, low.price, currentPrice);
          }
        }
      }
    }
  }

  private static recordReaction(
    pair: string, 
    type: 'HIGH' | 'LOW', 
    timeframe: 'daily' | 'weekly' | 'monthly',
    fractalPrice: number, 
    breakPrice: number
  ): void {
    const reactionId = `${pair}_${type}_${timeframe}_${fractalPrice.toFixed(5)}`;
    
    if (this.brokenFractals.has(reactionId)) return;
    
    const reaction: BreakoutReaction = {
      id: reactionId,
      pair,
      type,
      timeframe,
      fractalPrice,
      breakPrice,
      timestamp: new Date().toISOString()
    };
    
    FileManager.appendJSON(DATA_FILES.BREAKOUT_REACTIONS, reaction);
    this.brokenFractals.add(reactionId);
    
    console.log(`🚨 ${pair}: ${timeframe.toUpperCase()} ${type} BROKEN! ${breakPrice.toFixed(5)} ${type === 'HIGH' ? '>' : '<'} ${fractalPrice.toFixed(5)}`);
  }
}