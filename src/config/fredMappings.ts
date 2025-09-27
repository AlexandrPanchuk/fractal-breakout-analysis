export type TransformKind = 'level' | 'mom' | 'yoy' | 'qoq';

export interface FredMapRule {
  match: RegExp;          // by event.name
  seriesId: string;       // FRED series id
  transform: TransformKind;
  note?: string;          // docs hint
}

/**
 * ⚠️ Примітки:
 * - Retail: headline з FRED — RSAFS (Advance Retail Sales: Retail and Food Services), SA, $.
 *   Для релізу зазвичай ринок дивиться на % m/m ⇒ transform: 'mom'.
 * - CPI: headline CPI часто дивляться як m/m (SA) і y/y (NSA). Тут для простоти: y/y з CPIAUCSL (SA).
 *   Можеш додати другу подію для m/m окремо, якщо треба.
 * - ECI: квартальний % q/q з ECIALLCIV (Total compensation: All Civilian, SA).
 */
export const FRED_MAPPINGS: FredMapRule[] = [
  {
    match: /Advance Monthly Sales for Retail and Food Services/i,
    seriesId: 'RSAFS',          // Advance Retail Sales (Retail & Food Services), SA
    transform: 'mom',
    note: 'Retail sales % m/m from level series (RSAFS)'
  },
  {
    match: /Consumer Price Index/i,
    seriesId: 'CPIAUCSL',       // CPI-U All Items, SA
    transform: 'yoy',
    note: 'CPI y/y computed from CPIAUCSL'
  },
  {
    match: /Employment Cost Index/i,
    seriesId: 'ECIALLCIV',      // ECI: Total compensation: All Civilian, SA
    transform: 'qoq',
    note: 'ECI q/q from index level'
  }
];
