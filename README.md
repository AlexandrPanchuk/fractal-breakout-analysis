# Fractal Breakout Analysis System

A comprehensive TypeScript system for detecting forex fractal breakouts and analyzing price reactions with statistical context.

## Features

- **Fractal Detection**: Identifies unbroken daily fractals (2-period confirmation)
- **Real-time Monitoring**: Tracks price breakouts with alerts
- **Statistical Analysis**: Calculates probabilities and reaction metrics
- **Web Dashboard**: Interactive UI for filtering and analysis
- **Historical Context**: Compare current conditions to similar past events

## Quick Start

```bash
# Install dependencies
npm install

# Generate real historical data (recommended)
npm run generate-real-data

# OR generate sample data (for testing)
npm run generate-data

# Launch web dashboard
npm run web
```

## Production Usage

```bash
# 1. Detect and save fractals
npm run start

# 2. Start real-time monitoring (runs continuously)
npm run monitor

# 3. Launch web dashboard
npm run web
```

## Usage

### 1. Initial Fractal Detection
```bash
npm run start
```
- Analyzes 6 forex pairs (EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, NZDUSD)
- Identifies unbroken fractal highs/lows
- Saves data to `fractals.json`

### 2. Real-time Monitoring
```bash
npm run monitor
```
- Checks for breakouts every 30 seconds
- Records detailed reaction metrics
- Shows trading probabilities every 5 minutes
- Alerts: `🚨 EURUSD: HIGH BROKEN! 1.0995 > 1.0987`

### 3. Web Dashboard
```bash
npm run web
```
- Open http://localhost:3000
- Filter by pair, day, session, time bucket
- View reaction statistics and historical patterns
- Compare similar market contexts

### 4. View Statistics Only
```bash
npm run stats
```
Shows current trading probabilities without starting monitoring.

## Data Files

- `fractals.json` - Current unbroken fractal levels
- `breakout-stats.json` - Trading probability statistics
- `breakout-events.json` - Historical breakout outcomes
- `breakout-reactions.json` - Detailed reaction metrics

## Web Dashboard Features

### Filters
- **Currency Pair**: EURUSD, GBPUSD, etc.
- **Day of Week**: Monday-Friday patterns
- **Session**: Asia, London, NY, Overlap
- **Time Bucket**: 4-hour time windows
- **Date Range**: Historical period selection

### Analysis
- **Follow-through Rate**: % of breakouts that continue
- **Impulse Metrics**: 15m, 1h, 4h price movement
- **Max Drawdown**: Worst adverse movement
- **Time to Reverse**: Minutes until price reversal

### Similar Context
Find how price reacted historically in similar conditions:
- Same day of week + session + time
- Same volatility regime (ATR)
- Same currency pair patterns

## Example Output

```
EURUSD:
  Current Price: 1.0925
  Unbroken Fractal High: 1.0987 (5 days ago)
  Unbroken Fractal Low: 1.0845 (3 days ago)
  Distance to High: +62 pips
  Distance to Low: -80 pips

📈 TRADING PROBABILITY ANALYSIS
EURUSD:
  Total Breakouts: 15
  Long Probability: 73.3%
  Short Probability: 26.7%
  Recommendation: LONG BIAS
```

## Architecture

- `fractal-detector.ts` - Main fractal detection logic
- `fractal-monitor.ts` - Real-time monitoring system
- `trading-stats.ts` - Basic probability calculations
- `breakout-engine.ts` - Advanced reaction analysis
- `web-server.ts` - Express API server
- `public/index.html` - Web dashboard UI

## Requirements

- Node.js 16+
- TypeScript
- Internet connection (Yahoo Finance API)

## Data Source

Uses Yahoo Finance API for free forex data. No API key required.