# Fractal Breakout Analysis System

A modular TypeScript system for detecting forex fractal breakouts with clean architecture and real-time monitoring.

## Architecture

```
src/
├── types/           # TypeScript interfaces and types
├── services/        # Business logic and data operations
├── controllers/     # HTTP request handlers
├── utils/          # Utility functions and helpers
├── config/         # Configuration constants
├── app.ts          # Express application setup
└── server.ts       # Server entry point
```

## Features

- **Clean Architecture**: Modular design with separation of concerns
- **Type Safety**: Full TypeScript implementation with strict typing
- **Real-time Monitoring**: Live fractal breakout detection
- **Trade Journal**: Complete trading management system
- **Multi-timeframe Analysis**: Daily, weekly, and monthly fractals
- **Web Dashboard**: Interactive UI with real-time updates

## Quick Start

```bash
# Install dependencies
npm install

# Development mode (web server only)
npm run dev

# Full system with scheduler
npx ts-node scheduler.ts

# Build for production
npm run build
npm start
```

## API Endpoints

- `GET /api/breakout-reactions` - Get recent breakout reactions
- `GET /api/trades/open` - Get open trades
- `POST /api/trades` - Create new trade
- `POST /api/trades/:id/close` - Close trade
- `GET /api/trading-ideas` - Get trading ideas
- `POST /api/trading-ideas` - Create trading idea

## Data Models

### BreakoutReaction
```typescript
interface BreakoutReaction {
  id: string;
  pair: string;
  type: 'HIGH' | 'LOW';
  timeframe: 'daily' | 'weekly' | 'monthly';
  fractalPrice: number;
  breakPrice: number;
  timestamp: string;
}
```

### Trade
```typescript
interface Trade {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  // ... additional fields
}
```

## Services

### BreakoutService
- `getReactions()` - Retrieve all breakout reactions
- `addReaction()` - Add new breakout reaction
- `getReactionsByPair()` - Filter reactions by currency pair
- `getRecentReactions()` - Get latest reactions with limit

### TradeService
- `getTrades()` - Get all trades
- `getOpenTrades()` - Get active trades only
- `addTrade()` - Create new trade
- `closeTrade()` - Close existing trade

## Utilities

### FileManager
- `readJSON<T>()` - Type-safe JSON file reading
- `writeJSON<T>()` - Type-safe JSON file writing
- `appendJSON<T>()` - Append data to JSON file

### PipCalculator
- `calculate()` - Calculate pip difference between prices

## Configuration

All constants are centralized in `src/config/constants.ts`:
- Currency pairs
- Data file paths
- API endpoints
- Pip multipliers

## Development

The system follows clean architecture principles:
1. **Types** define data contracts
2. **Services** handle business logic
3. **Controllers** manage HTTP requests
4. **Utils** provide reusable functionality
5. **Config** centralizes constants

This ensures maintainability, testability, and scalability.