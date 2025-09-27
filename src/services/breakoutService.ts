import { BreakoutReaction } from '../types';
import { FileManager } from '../utils/fileManager';
import { DATA_FILES } from '../config/constants';

export class BreakoutService {
  static getReactions(): BreakoutReaction[] {
    return FileManager.readJSON<BreakoutReaction>(DATA_FILES.BREAKOUT_REACTIONS);
  }

  static addReaction(reaction: BreakoutReaction): void {
    FileManager.appendJSON(DATA_FILES.BREAKOUT_REACTIONS, reaction);
  }

  static getReactionsByPair(pair: string): BreakoutReaction[] {
    return this.getReactions().filter(r => r.pair === pair);
  }

  static getRecentReactions(limit: number = 20): BreakoutReaction[] {
    return this.getReactions()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}