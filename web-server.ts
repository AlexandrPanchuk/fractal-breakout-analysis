import express, { Request, Response } from 'express';
import cors from 'cors';
import { filterReactions, getStatistics, FilterCriteria } from './breakout-engine';
import path from 'path';
import * as fs from 'fs';
import { recordBreakoutEvent } from './breakout-events';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/reactions', (req: Request, res: Response) => {
  const criteria: FilterCriteria = {
    pair: req.query.pair as string,
    dayOfWeek: req.query.dayOfWeek ? parseInt(req.query.dayOfWeek as string) : undefined,
    session: req.query.session as string,
    timeBucket: req.query.timeBucket as string,
    atrRange: req.query.atrMin && req.query.atrMax ? 
      [parseFloat(req.query.atrMin as string), parseFloat(req.query.atrMax as string)] : undefined,
    dateRange: req.query.startDate && req.query.endDate ? 
      [req.query.startDate as string, req.query.endDate as string] : undefined
  };

  const reactions = filterReactions(criteria);
  const stats = getStatistics(reactions);
  
  res.json({ reactions, stats });
});

app.get('/api/similar-context', (req: Request, res: Response) => {
  const { pair, dayOfWeek, session, timeBucket } = req.query;
  
  const criteria: FilterCriteria = {
    pair: pair as string,
    dayOfWeek: dayOfWeek ? parseInt(dayOfWeek as string) : undefined,
    session: session as string,
    timeBucket: timeBucket as string
  };

  const reactions = filterReactions(criteria);
  const stats = getStatistics(reactions);
  
  res.json({ 
    context: { pair, dayOfWeek, session, timeBucket },
    historicalReactions: 0,
    stats: null
  });
});

app.get('/api/trading-stats', (req: Request, res: Response) => {
  try {
    const stats = JSON.parse(fs.readFileSync('breakout-stats.json', 'utf8'));
    res.json(stats);
  } catch (error) {
    res.json([]);
  }
});

app.get('/api/current-fractals', (req: Request, res: Response) => {
  try {
    const fractals = JSON.parse(fs.readFileSync('fractals.json', 'utf8'));
    res.json(fractals);
  } catch (error) {
    res.json([]);
  }
});

app.get('/api/current-prices', async (req: Request, res: Response) => {
  const axios = require('axios');
  const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD', 'DX-Y.NYB'];
  const prices: any = {};
  
  for (const pair of pairs) {
    try {
      const symbol = pair === 'DX-Y.NYB' ? 'DX-Y.NYB' : pair === 'XAUUSD' ? 'GC=F' : `${pair}=X`;
      const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        params: { range: '1d', interval: '1m' }
      });
      const result = response.data.chart.result[0];
      const quotes = result.indicators.quote[0];
      prices[pair] = quotes.close[quotes.close.length - 1];
    } catch {
      prices[pair] = null;
    }
  }
  
  res.json(prices);
});

app.get('/api/forex-calendar', (req: Request, res: Response) => {
  try {
    const events = JSON.parse(fs.readFileSync('forex-calendar.json', 'utf8'));
    res.json(events);
  } catch (error) {
    console.error('Error loading calendar:', error);
    res.json([]);
  }
});

app.get('/api/todays-events', (req: Request, res: Response) => {
  try {
    const calendar = JSON.parse(fs.readFileSync('forex-calendar.json', 'utf8'));
    const today = new Date().toISOString().split('T')[0];
    const events = calendar.filter((event: any) => event.date === today);
    res.json(events);
  } catch (error) {
    console.error('Error loading today\'s events:', error);
    res.json([]);
  }
});

app.get('/api/upcoming-events', (req: Request, res: Response) => {
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
    console.error('Error loading upcoming events:', error);
    res.json([]);
  }
});

app.get('/api/event-reactions', (req: Request, res: Response) => {
  const { loadEventReactions } = require('./forex-calendar');
  try {
    const reactions = loadEventReactions();
    res.json(reactions);
  } catch (error) {
    res.json([]);
  }
});

app.get('/api/multi-fractals', (req: Request, res: Response) => {
  try {
    const multiFractals = JSON.parse(fs.readFileSync('multi-fractals.json', 'utf8'));
    res.json(multiFractals);
  } catch (error) {
    console.error('Error loading multi-fractals:', error);
    res.json([]);
  }
});

app.get('/api/daily-movements', (req: Request, res: Response) => {
  try {
    const movements = JSON.parse(fs.readFileSync('daily-movements.json', 'utf8'));
    const pair = req.query.pair as string;
    if (pair) {
      const filtered = movements.filter((m: any) => m.pair === pair);
      res.json(filtered);
    } else {
      res.json(movements);
    }
  } catch (error) {
    console.error('Error loading daily movements:', error);
    res.json([]);
  }
});

app.get('/api/today-movement/:pair', (req: Request, res: Response) => {
  try {
    const movements = JSON.parse(fs.readFileSync('daily-movements.json', 'utf8'));
    const today = new Date().toISOString().split('T')[0];
    const movement = movements.find((m: any) => m.pair === req.params.pair && m.date === today);
    res.json(movement || null);
  } catch (error) {
    res.json(null);
  }
});

app.post('/api/record-breakout', (req: Request, res: Response) => {
  // const { recordBreakoutEvent } = require('./breakout-events');
  const { pair, type, fractalPrice, breakPrice } = req.body;
  

  // console.log(pair, type);

  try {
    const recorded = recordBreakoutEvent(pair, type, fractalPrice, breakPrice);
    res.json(JSON.stringify(recorded));
    res.json({ success: recorded, message: recorded ? 'Event recorded' : 'Event already exists' });
  } catch (error) {
    
    res.status(500).json({ success: false, message: 'Error recording event' });
  }
});

app.get('/api/breakout-events', (req: Request, res: Response) => {
  try {
    const events = JSON.parse(fs.readFileSync('breakout-events.json', 'utf8'));
    res.json(events);
  } catch (error) {
    res.json([]);
  }
});

app.get('/api/breakout-reactions', (req: Request, res: Response) => {
  try {
    const reactions = JSON.parse(fs.readFileSync('breakout-reactions.json', 'utf8'));
    res.json(reactions);
  } catch (error) {
    res.json([]);
  }
});

app.get('/api/momentum-sessions', (req: Request, res: Response) => {
  try {
    const { getMomentumSessions, getCurrentMomentumStatus } = require('./momentum-sessions');
    res.json({
      sessions: getMomentumSessions(),
      status: getCurrentMomentumStatus()
    });
  } catch (error) {
    res.json({ sessions: [], status: 'Error loading sessions' });
  }
});

app.post('/api/record-reaction', (req: Request, res: Response) => {
  const { pair, type, timeframe, fractalPrice, breakPrice } = req.body;
  
  try {
    let reactionId = `${pair}_${type}_${timeframe}`;
    const reactions = JSON.parse(fs.readFileSync('breakout-reactions.json', 'utf8'));
    if (fractalPrice) {
      const reactionId = `${pair}_${type}_${timeframe}_${fractalPrice.toFixed(5)}`;
    } else {
      return res.json([]);
    }
    
    if (reactions.find((r: any) => r.id === reactionId)) {
      return res.json({ success: false, message: 'Reaction already exists' });
    }


    const newReaction = {
      id: reactionId,
      pair,
      type,
      timeframe,
      fractalPrice,
      breakPrice,
      timestamp: new Date().toISOString()
    };
    
    reactions.push(newReaction);
    fs.writeFileSync('breakout-reactions.json', JSON.stringify(reactions, null, 2));
    res.json({ success: true });
  } catch {
    const newReaction = {
      id: `${pair}_${type}_${timeframe}_${fractalPrice.toFixed(5)}`,
      pair,
      type,
      timeframe,
      fractalPrice,
      breakPrice,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync('breakout-reactions.json', JSON.stringify([newReaction], null, 2));
    res.json({ success: true });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Fractal Analysis Web UI running on port ${PORT}`);
  console.log('📊 Breakout reactions will be recorded automatically');
  console.log('🔥 Momentum sessions: London 12:30 & New York 15:30');
});

const axios = require('axios');

