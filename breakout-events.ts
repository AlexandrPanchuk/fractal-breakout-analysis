import * as fs from 'fs';

interface BreakoutEvent {
  id: string;
  pair: string;
  type: 'HIGH' | 'LOW';
  fractalPrice: number;
  breakPrice: number;
  timestamp: string;
}

const EVENTS_FILE = 'breakout-events.json';

function loadBreakoutEvents(): BreakoutEvent[] {
  try {
    return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveBreakoutEvents(events: BreakoutEvent[]): void {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

function recordBreakoutEvent(pair: string, type: 'HIGH' | 'LOW', fractalPrice: number, breakPrice: number): boolean {
  const events = [];
  
  // // Create unique ID based on pair, type, and fractal price
  const eventId = `${pair}_${type}_${fractalPrice.toFixed(5)}`;
  
  // // Check if event already exists
  // const existingEvent = events.find(e => e.id === eventId);
  // if (existingEvent) {
  //   return false; // Event already recorded
  // }
  
  // Create new event
  const newEvent: BreakoutEvent = {
    id: eventId,
    pair,
    type,
    fractalPrice,
    breakPrice,
    timestamp: new Date().toISOString()
  };
  
  events.push(newEvent);
  saveBreakoutEvents(events);
  
  console.log(`📊 Breakout event recorded: ${pair} ${type} ${fractalPrice.toFixed(5)} -> ${breakPrice.toFixed(5)}`);
  return true;
}

export { recordBreakoutEvent, loadBreakoutEvents, BreakoutEvent };