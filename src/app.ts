import express from 'express';
import cors from 'cors';
import path from 'path';
import * as fs from 'fs';
import { ApiController } from './controllers/apiController';
import { FractalService } from './services/data/fractalService';
import { PriceService } from './services/data/priceService';
import { FileManager } from './utils/fileManager';

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  // Main page
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  });

  // Trade Journal API
  app.get('/api/breakout-reactions', ApiController.getBreakoutReactions);
  app.get('/api/trades/open', ApiController.getOpenTrades);
  app.post('/api/trades', ApiController.createTrade);
  app.post('/api/trades/:id/close', ApiController.closeTrade);
  app.get('/api/trading-ideas', ApiController.getTradingIdeas);
  app.post('/api/trading-ideas', ApiController.createTradingIdea);
  
  // Fractal data routes
  app.get('/api/current-fractals', (req, res) => res.json(FractalService.getCurrentFractals()));
  app.get('/api/multi-fractals', (req, res) => res.json(FractalService.getMultiFractals()));
  app.get('/api/daily-movements', (req, res) => {
    const movements = FractalService.getDailyMovements();
    const pair = req.query.pair as string;
    if (pair) {
      res.json(movements.filter((m: any) => m.pair === pair));
    } else {
      res.json(movements);
    }
  });
  
  // Calendar routes
  app.get('/api/todays-events', (req, res) => {
    try {
      const calendar = JSON.parse(fs.readFileSync('forex-calendar.json', 'utf8'));
      const today = new Date().toISOString().split('T')[0];
      const events = calendar.filter((event: any) => event.date === today);
      res.json(events);
    } catch (error) {
      res.json([]);
    }
  });
  
  app.get('/api/upcoming-events', (req, res) => {
    try {
      const calendar = JSON.parse(fs.readFileSync('forex-calendar.json', 'utf8'));
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const events = calendar.filter((event: any) => {
        const eventDateTime = new Date(`${event.date}T${event.time}`);
        return eventDateTime > now && eventDateTime < next24h && event.impact === 'HIGH';
      });
      res.json(events);
    } catch (error) {
      res.json([]);
    }
  });
  
  // Price routes
  app.get('/api/current-prices', async (req, res) => {
    const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD', 'DX-Y.NYB'];
    const prices: any = {};
    
    for (const pair of pairs) {
      prices[pair] = await PriceService.getCurrentPrice(pair);
    }
    
    res.json(prices);
  });
  
  // Movement routes
  app.get('/api/today-movement/:pair', (req, res) => {
    try {
      const movements = JSON.parse(fs.readFileSync('daily-movements.json', 'utf8'));
      const today = new Date().toISOString().split('T')[0];
      const movement = movements.find((m: any) => m.pair === req.params.pair && m.date === today);
      res.json(movement || null);
    } catch (error) {
      res.json(null);
    }
  });
  
  // Momentum sessions
  app.get('/api/momentum-sessions', (req, res) => {
    try {
      const { getMomentumSessions, getCurrentMomentumStatus } = require('../momentum-sessions');
      res.json({
        sessions: getMomentumSessions(),
        status: getCurrentMomentumStatus()
      });
    } catch (error) {
      res.json({ sessions: [], status: 'Error loading sessions' });
    }
  });
  
  // Yesterday low events
  app.get('/api/yesterday-low-events', (req, res) => {
    try {
      const events = JSON.parse(fs.readFileSync('yesterday-low-events.json', 'utf8'));
      res.json(events);
    } catch (error) {
      res.json([]);
    }
  });
  
  // Economic calendar routes
  app.get('/api/economic-events', (req, res) => {
    try {
      const { EconomicService } = require('./services/economic/economicService');
      const economicService = new EconomicService();
      const events = economicService.getHighImpactEvents();
      res.json(events);
    } catch (error) {
      res.json([]);
    }
  });
  
  app.get('/api/economic-events/:pair', (req, res) => {
    try {
      const { EconomicService } = require('./services/economic/economicService');
      const economicService = new EconomicService();
      const events = economicService.getEventsForPair(req.params.pair);
      res.json(events);
    } catch (error) {
      res.json([]);
    }
  });
  
  // Journal and stats
  app.get('/api/journal', (req, res) => {
    try {
      const { TradeJournal } = require('../trade-journal');
      const tradeJournal = new TradeJournal();
      const filters = {
        ideaId: req.query.ideaId as string,
        symbol: req.query.symbol as string,
        direction: req.query.direction as 'LONG' | 'SHORT',
        outcome: req.query.outcome as 'TP' | 'SL' | 'MANUAL',
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string
      };
      const entries = tradeJournal.getJournalEntries(filters);
      res.json(entries);
    } catch (error) {
      res.json([]);
    }
  });
  
  app.get('/api/stats', (req, res) => {
    try {
      const { TradeJournal } = require('../trade-journal');
      const tradeJournal = new TradeJournal();
      const ideaId = req.query.ideaId as string;
      const stats = tradeJournal.getStats(ideaId);
      res.json(stats);
    } catch (error) {
      res.json({});
    }
  });
  
  // Missing API endpoints
  app.get('/api/reactions', (req, res) => {
    try {
      const reactions = FileManager.readJSON('breakout-reactions.json');
      const pair = req.query.pair as string;
      
      if (pair) {
        const filtered = reactions.filter((r: any) => r.pair === pair);
        res.json({ reactions: filtered, stats: null });
      } else {
        res.json({ reactions, stats: null });
      }
    } catch (error) {
      res.json({ reactions: [], stats: null });
    }
  });
  
  app.get('/api/trading-stats', (req, res) => {
    try {
      const stats = JSON.parse(fs.readFileSync('breakout-stats.json', 'utf8'));
      res.json(stats);
    } catch (error) {
      res.json([]);
    }
  });
  
  app.get('/api/morning-brief/:pair', (req, res) => {
    try {
      const pair = req.params.pair.toUpperCase();
      const today = new Date().toISOString().split('T')[0];
      
      // Map currency to pair
      const currencyToPair = {
        'EUR': 'EURUSD',
        'GBP': 'GBPUSD', 
        'JPY': 'USDJPY',
        'AUD': 'AUDUSD',
        'CAD': 'USDCAD',
        'NZD': 'NZDUSD'
      };
      
      const targetPair = currencyToPair[pair as keyof typeof currencyToPair] || pair;
      
      // Try combined file first
      const combinedFile = `data/macro/morning-all-${today}.json`;
      if (fs.existsSync(combinedFile)) {
        const allBriefs = JSON.parse(fs.readFileSync(combinedFile, 'utf8'));
        const brief = allBriefs[targetPair];
        if (brief) return res.json(brief);
      }
      
      // Try pair-specific file
      const pairFile = `data/macro/morning-${targetPair}-${today}.json`;
      if (fs.existsSync(pairFile)) {
        const brief = JSON.parse(fs.readFileSync(pairFile, 'utf8'));
        return res.json(brief);
      }
      
      // Fallback to EUR file for EURUSD
      if (targetPair === 'EURUSD') {
        const eurFile = `data/macro/morning-${today}.json`;
        if (fs.existsSync(eurFile)) {
          const brief = JSON.parse(fs.readFileSync(eurFile, 'utf8'));
          return res.json({ ...brief, pair: 'EURUSD' });
        }
      }
      
      res.json(null);
    } catch (error) {
      console.error('Morning brief API error:', error);
      res.json(null);
    }
  });

  return app;
}