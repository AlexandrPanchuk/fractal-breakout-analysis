export const CURRENCY_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 
  'USDCAD', 'NZDUSD', 'XAUUSD', 'DX-Y.NYB'
] as const;

export const TIMEFRAMES = ['daily', 'weekly', 'monthly'] as const;

export const DATA_FILES = {
  BREAKOUT_REACTIONS: 'breakout-reactions.json',
  MULTI_FRACTALS: 'multi-fractals.json',
  DAILY_MOVEMENTS: 'daily-movements.json',
  FOREX_CALENDAR: 'forex-calendar.json',
  TRADES: 'trades.json',
  TRADING_IDEAS: 'trading-ideas.json',
  JOURNAL: 'journal.json'
} as const;

export const API_ENDPOINTS = {
  YAHOO_FINANCE: 'https://query1.finance.yahoo.com/v8/finance/chart/',
  FOREXFACTORY: 'https://www.forexfactory.com/calendar'
} as const;

export const PIP_MULTIPLIERS = {
  USDJPY: 100,
  XAUUSD: 10,
  'DX-Y.NYB': 100,
  DEFAULT: 10000
} as const;