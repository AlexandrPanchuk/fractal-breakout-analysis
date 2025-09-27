import { Request, Response } from 'express';
import { BreakoutService } from '../services/breakoutService';
import { TradeService } from '../services/tradeService';
import { PriceService } from '../services/data/priceService';

export class ApiController {
  static getBreakoutReactions(req: Request, res: Response): void {
    try {
      const reactions = BreakoutService.getRecentReactions();
      res.json(reactions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reactions' });
    }
  }

  static getOpenTrades(req: Request, res: Response): void {
    try {
      const trades = TradeService.getOpenTrades();
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  }

  static async createTrade(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, ideaId, direction, entryPrice, takeProfit, stopLoss, positionSize, notes } = req.body;
      
      const finalEntryPrice = entryPrice || await PriceService.getCurrentPrice(symbol);
      if (!finalEntryPrice) {
        res.status(400).json({ error: 'Could not get current price for symbol' });
        return;
      }
      
      const trade = TradeService.addTrade({
        symbol, ideaId, direction, entryPrice: finalEntryPrice,
        takeProfit, stopLoss, positionSize, notes
      });
      
      res.json(trade);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static closeTrade(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const { exitPrice, outcome } = req.body;
      TradeService.closeTrade(id, exitPrice, outcome);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to close trade' });
    }
  }

  static getTradingIdeas(req: Request, res: Response): void {
    try {
      const ideas = TradeService.getTradingIdeas();
      res.json(ideas);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trading ideas' });
    }
  }

  static createTradingIdea(req: Request, res: Response): void {
    try {
      const { name } = req.body;
      const idea = TradeService.addTradingIdea(name);
      res.json(idea);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create trading idea' });
    }
  }
}