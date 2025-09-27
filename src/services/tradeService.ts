import { Trade, TradingIdea } from '../types';
import { FileManager } from '../utils/fileManager';
import { DATA_FILES } from '../config/constants';

export class TradeService {
  static getTrades(): any[] {
    try {
      const { TradeJournal } = require('../../trade-journal');
      const tradeJournal = new TradeJournal();
      return tradeJournal.getOpenTrades();
    } catch (error) {
      return FileManager.readJSON<Trade>(DATA_FILES.TRADES);
    }
  }

  static getOpenTrades(): any[] {
    try {
      const { TradeJournal } = require('../../trade-journal');
      const tradeJournal = new TradeJournal();
      return tradeJournal.getOpenTrades();
    } catch (error) {
      return this.getTrades().filter((t: any) => t.status === 'OPEN' || !t.closedAt);
    }
  }

  static getClosedTrades(): any[] {
    try {
      const { TradeJournal } = require('../../trade-journal');
      const tradeJournal = new TradeJournal();
      return tradeJournal.getJournalEntries();
    } catch (error) {
      return this.getTrades().filter((t: any) => t.status === 'CLOSED' || t.closedAt);
    }
  }

  static addTrade(tradeData: any): any {
    try {
      const { TradeJournal } = require('../../trade-journal');
      const tradeJournal = new TradeJournal();
      return tradeJournal.createTrade(tradeData);
    } catch (error) {
      const newTrade = {
        ...tradeData,
        id: `trade_${Date.now()}`,
        openedAt: new Date().toISOString(),
        status: 'OPEN'
      };
      FileManager.appendJSON(DATA_FILES.TRADES, newTrade);
      return newTrade;
    }
  }

  static closeTrade(id: string, exitPrice: number, outcome: 'TP' | 'SL' | 'MANUAL'): void {
    try {
      const { TradeJournal } = require('../../trade-journal');
      const tradeJournal = new TradeJournal();
      tradeJournal.closeTrade(id, exitPrice, outcome);
    } catch (error) {
      const trades = this.getTrades();
      const tradeIndex = trades.findIndex((t: any) => t.id === id);
      if (tradeIndex !== -1) {
        trades[tradeIndex].status = 'CLOSED';
        trades[tradeIndex].closedAt = new Date().toISOString();
        trades[tradeIndex].exitPrice = exitPrice;
        trades[tradeIndex].outcome = outcome;
        FileManager.writeJSON(DATA_FILES.TRADES, trades);
      }
    }
  }

  static getTradingIdeas(): any[] {
    try {
      const { TradeJournal } = require('../../trade-journal');
      const tradeJournal = new TradeJournal();
      return tradeJournal.getTradingIdeas();
    } catch (error) {
      return FileManager.readJSON<TradingIdea>(DATA_FILES.TRADING_IDEAS);
    }
  }

  static addTradingIdea(name: string): any {
    try {
      const { TradeJournal } = require('../../trade-journal');
      const tradeJournal = new TradeJournal();
      return tradeJournal.createTradingIdea(name);
    } catch (error) {
      const idea = {
        id: `idea_${Date.now()}`,
        name,
        createdAt: new Date().toISOString()
      };
      FileManager.appendJSON(DATA_FILES.TRADING_IDEAS, idea);
      return idea;
    }
  }

  static getJournalEntries(filters?: any): any[] {
    try {
      const { TradeJournal } = require('../../trade-journal');
      const tradeJournal = new TradeJournal();
      return tradeJournal.getJournalEntries(filters);
    } catch (error) {
      return [];
    }
  }

  static getStats(ideaId?: string): any {
    try {
      const { TradeJournal } = require('../../trade-journal');
      const tradeJournal = new TradeJournal();
      return tradeJournal.getStats(ideaId);
    } catch (error) {
      return {};
    }
  }
}