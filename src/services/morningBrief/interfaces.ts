export interface CalendarEvent {
  id: string;
  ccy: 'USD' | 'EUR';
  name: string;
  importance: 1 | 2 | 3;
  scheduled_at: string;
  consensus?: number;
  previous?: number;
  unit?: string;
  source?: string;
}