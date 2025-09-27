export type Importance = 1 | 2 | 3;

export interface CalendarEvent {
  id: string;
  ccy: 'USD' | 'EUR';
  name: string;
  importance: Importance;
  scheduled_at: string;
  consensus?: number;
  previous?: number;
  unit?: string;
  source?: string;
}

export interface Release {
  id: string;
  actual: number | null;
  revised_from?: number | null;
  released_at: string;
}

export interface CalendarProvider {
  fetchDay(dateIso: string): Promise<CalendarEvent[]>;
  fetchReleases(ids: string[]): Promise<Release[]>;
}