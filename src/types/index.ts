export interface BreakoutReaction {
  id: string;
  pair: string;
  type: 'HIGH' | 'LOW';
  timeframe: 'daily' | 'weekly' | 'monthly';
  fractalPrice: number;
  breakPrice: number;
  timestamp: string;
}

export interface Fractal {
  pair: string;
  high?: number;
  low?: number;
  date: string;
  status?: 'ACTIVE' | 'BROKEN';
}

export interface MultiFractal {
  pair: string;
  daily: {
    highs: FractalLevel[];
    lows: FractalLevel[];
  };
  weekly: {
    highs: FractalLevel[];
    lows: FractalLevel[];
  };
  monthly: {
    highs: FractalLevel[];
    lows: FractalLevel[];
  };
}

export interface FractalLevel {
  price: number;
  date: string;
  status: 'ACTIVE' | 'BROKEN';
  daysAgo?: number;
}

export interface DailyMovement {
  pair: string;
  date: string;
  open: number;
  close: number;
  changePercent: number;
  direction: 'UP' | 'DOWN' | 'FLAT';
}

export interface ForexEvent {
  date: string;
  time: string;
  currency: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  forecast: string;
  previous: string;
  country: string;
}

export interface Trade {
  id: string;
  symbol: string;
  ideaId: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  positionSize: number;
  notes?: string;
  openedAt: string;
  closedAt?: string;
  exitPrice?: number;
  outcome?: 'TP' | 'SL' | 'MANUAL';
  pnl?: number;
  rMultiple?: number;
}

export interface TradingIdea {
  id: string;
  name: string;
  createdAt: string;
}