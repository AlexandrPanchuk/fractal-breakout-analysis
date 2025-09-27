import axios from 'axios';

export interface FredObs { date: string; value: string; }

/** FRED timeseries observations */
export async function fredObservations(seriesId: string, start = '2019-01-01', apiKey = process.env.FRED_KEY || '92e3d97415b10269d02ca3c7fa4b91ff') {
  const u = new URL('https://api.stlouisfed.org/fred/series/observations');
  u.searchParams.set('series_id', seriesId);
  if (apiKey) u.searchParams.set('api_key', apiKey);
  u.searchParams.set('file_type', 'json');
  u.searchParams.set('observation_start', start);
  const r = await axios.get(u.toString());
  const j = r.data;
  return (j.observations || []) as FredObs[];
}

/** pick last finite value */
export function lastFinite(observations: FredObs[]): { date: string; value: number } | null {
  for (let i = observations.length - 1; i >= 0; i--) {
    const v = Number(observations[i].value);
    if (Number.isFinite(v)) return { date: observations[i].date, value: v };
  }
  return null;
}

export function pctChange(curr: number, prev: number): number {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev === 0) return NaN;
  return (curr - prev) / Math.abs(prev);
}

/** Generic m/m from monthly levels */
export function mom(observations: FredObs[]): number | null {
  if (observations.length < 2) return null;
  const last = lastFinite(observations);
  if (!last) return null;
  // find previous (by index walk back to prior finite)
  let prevVal: number | null = null;
  for (let i = observations.length - 2; i >= 0; i--) {
    const v = Number(observations[i].value);
    if (Number.isFinite(v)) { prevVal = v; break; }
  }
  return prevVal == null ? null : pctChange(last.value, prevVal);
}

/** y/y from monthly levels: compare to 12 months earlier */
export function yoy(observations: FredObs[]): number | null {
  if (observations.length < 13) return null;
  const last = lastFinite(observations);
  if (!last) return null;
  // find value 12 months earlier by index offset (assumes monthly, sorted asc)
  let lastIdx = observations.findIndex(o => o.date === last.date);
  if (lastIdx < 12) return null;
  // walk back to finite value within lastIdx-1..0 until 12 months finite found
  let back = observations[lastIdx - 12];
  let backVal = Number(back.value);
  // fallback: scan backwards to find nearest finite within +/-1 month if missing
  if (!Number.isFinite(backVal)) {
    for (let k = lastIdx - 13; k >= 0 && k >= lastIdx - 15; k--) {
      const v = Number(observations[k].value);
      if (Number.isFinite(v)) { backVal = v; break; }
    }
  }
  if (!Number.isFinite(backVal)) return null;
  return pctChange(last.value, backVal);
}

/** q/q from quarterly levels */
export function qoq(observations: FredObs[]): number | null {
  if (observations.length < 2) return null;
  const last = lastFinite(observations);
  if (!last) return null;
  // previous quarter (index -1) should exist
  const lastIdx = observations.findIndex(o => o.date === last.date);
  for (let i = lastIdx - 1; i >= 0; i--) {
    const v = Number(observations[i].value);
    if (Number.isFinite(v)) return pctChange(last.value, v);
  }
  return null;
}
