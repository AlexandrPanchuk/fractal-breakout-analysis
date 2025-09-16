# Fractal Breakout Analysis System

A comprehensive TypeScript system for detecting forex fractal breakouts and analyzing price reactions with statistical context, featuring multi-timeframe analysis, real-time monitoring, and automated scheduling.

## Features

- **Multi-Timeframe Fractals**: Daily, weekly, and monthly fractal detection with automatic promotion
- **Real-time Monitoring**: Tracks price breakouts with alerts and proximity warnings
- **Daily Movement Tracking**: Records and displays daily price movements with calendar view
- **Statistical Analysis**: Calculates probabilities and reaction metrics with historical context
- **Web Dashboard**: Interactive UI with filtering, modal analysis, and news integration
- **Automated Scheduling**: Single command runs everything with proper timing
- **Active Hours Tracking**: 10:30 and 15:30 trading alerts with sound notifications
- **News Integration**: Real ForexFactory calendar events with impact visualization

## Quick Start (Single Command)

```bash
# Install dependencies
npm install

# Run everything with automated scheduling
npm run scheduler
```

This single command will:
- Start the web dashboard on http://localhost:3000
- Update multi-timeframe fractals daily at 00:01 and every 4 hours
- Update daily movements every 5 minutes
- Keep everything running automatically

## Manual Commands (Optional)

### Multi-Timeframe Fractals
```bash
npm run multi-fractals     # Update fractals once
npm run monitor-multi      # Monitor fractals continuously
```

### Daily Movements
```bash
npx ts-node daily-movements.ts          # Update once
npx ts-node daily-movements.ts monitor  # Update every 5 minutes
```

### Web Dashboard Only
```bash
npm run web  # http://localhost:3000
```

### Legacy Commands
```bash
npm run start    # Original fractal detection
npm run monitor  # Original monitoring
npm run stats    # View trading probabilities
```

## Data Files

- `multi-fractals.json` - Multi-timeframe fractal data (daily/weekly/monthly)
- `daily-movements.json` - Daily price movements with direction indicators
- `forex-calendar.json` - Real ForexFactory calendar events
- `fractals.json` - Legacy unbroken fractal levels
- `breakout-stats.json` - Trading probability statistics
- `breakout-events.json` - Historical breakout outcomes
- `breakout-reactions.json` - Detailed reaction metrics

## Web Dashboard Features

### Multi-Timeframe View
- **Daily/Weekly/Monthly Tabs**: Switch between timeframes
- **Fractal Status**: ACTIVE/BROKEN indicators with dates
- **Next Targets**: Automatic promotion to higher timeframes
- **Daily Movement Indicators**: ↗ ↘ → with percentage changes
- **Active Hours Display**: 10:30 & 15:30 trading times

### Currency Pair Modals
- **Statistics Tab**: Reaction metrics and probabilities
- **Calendar Tab**: 30-day visual movement history
- **Reactions Tab**: Detailed breakout analysis

### News Integration
- **Today's Events**: Current day ForexFactory events
- **High Impact Alerts**: Visual indicators on fractal cards
- **Event Impact Levels**: HIGH/MEDIUM/LOW classification

### Filters & Analysis
- **Currency Pairs**: EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, NZDUSD, XAUUSD, DXY
- **Time-based Filtering**: Day, session, time bucket
- **Historical Context**: Similar market condition analysis
- **Real-time Alerts**: Breakout and proximity notifications

## Example Output

```
🚀 Starting Fractal Analysis Scheduler

🌐 Starting web server...
📊 Running multi-timeframe fractals update...
📈 Running daily movements update...

⏰ Scheduler started with the following schedule:
   • Multi-timeframe fractals: Daily at 00:01 + every 4 hours
   • Daily movements: Every 5 minutes
   • Web server: Running continuously on http://localhost:3000

EURUSD: 1.17804
  Daily High: 1.17804 (BROKEN) → Next: 1.18303 (weekly)
  Daily Low: 1.16689 (ACTIVE) ↗ +1.08%
  
🚨 EURUSD: WEEKLY HIGH BROKEN! 1.18350 > 1.18303
⚠️ GBPUSD: APPROACHING LOW 5 pips away
```

## Architecture

### Core Components
- `scheduler.ts` - Master scheduler running all components
- `multi-timeframe-fractals.ts` - Daily/weekly/monthly fractal detection
- `daily-movements.ts` - Price movement tracking with calendar view
- `web-server.ts` - Express API server with all endpoints
- `public/index.html` - Interactive web dashboard

### Legacy Components
- `fractal-detector.ts` - Original fractal detection
- `fractal-monitor.ts` - Original monitoring system
- `trading-stats.ts` - Probability calculations
- `breakout-engine.ts` - Reaction analysis
- `manual-calendar-input.ts` - ForexFactory events parser

### Data Processing
- Multi-timeframe analysis with automatic level promotion
- Real-time price updates every 30 seconds
- Daily movement calculations every 5 minutes
- News event integration with impact visualization

## Requirements

- Node.js 16+
- TypeScript
- Internet connection (Yahoo Finance API)
- `node-cron` for scheduling

## Data Sources

- **Yahoo Finance API**: Free forex data (no API key required)
  - EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, NZDUSD: `{PAIR}=X`
  - Gold (XAUUSD): `GC=F`
  - Dollar Index (DXY): `DX-Y.NYB`
- **ForexFactory Calendar**: Real economic events with impact levels

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/fractal-breakout-analysis.git
cd fractal-breakout-analysis
npm install
npm run scheduler
```

Open http://localhost:3000 to access the web dashboard.

## License

MIT License - Feel free to use and modify for your trading analysis needs.