// src/adapters/news/GdeltClient.ts
// import fetch from 'cross-fetch';

export interface GdeltDoc {
  seendate: string;
  title: string;
  url: string;
  language?: string;
}

const DEFAULT_QUERY =
  '(EUR OR euro OR "European Central Bank" OR ECB) (USD OR dollar OR Fed OR FOMC)';

function mockNews(): GdeltDoc[] {
  const now = new Date().toISOString();
  return [
    { seendate: now, title: 'Mock: EUR/USD morning wrap', url: 'about:blank', language: 'en' }
  ];
}

function isJsonContentType(ct: string | null): boolean {
  return !!ct && /\bjson\b/i.test(ct);
}

async function fetchJson(url: string): Promise<any | null> {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json,text/plain,*/*',
      // Деякі CDN люблять бачити юзер-агента
      'User-Agent': 'eurusd-macro-brief/1.0 (+https://local)'
    }
  });

  if (!res.ok) return null;

  const ct = res.headers.get('content-type');
  const text = await res.text();

  // Часто GDELT повертає text/plain з JSON всередині — перевіряємо і так, і так.
  if (isJsonContentType(ct) || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  // явно не JSON
  return null;
}

function docsFromDocApi(json: any): GdeltDoc[] | null {
  const arts = Array.isArray(json?.articles) ? json.articles : null;
  if (!arts) return null;
  return arts.map((a: any) => ({
    seendate: a.seendate,
    title: a.title,
    url: a.url,
    language: a.language
  }));
}

function docsFromEventsApi(json: any): GdeltDoc[] | null {
  const evs = Array.isArray(json?.events) ? json.events : null;
  if (!evs) return null;
  // Events API має інші поля; беремо headline/urls якщо є
  return evs.slice(0, 50).map((e: any) => ({
    seendate: e.Date || e.SQLDATE || e.DateAdded || new Date().toISOString(),
    title: e.Actor1Name ? `Event: ${e.Actor1Name} – ${e.EventRootCode || ''}` : 'GDELT event',
    url: e.SOURCEURL || 'about:blank',
    language: e.Language || 'en'
  }));
}

/**
 * Тягне ~15 хв новин навколо EUR/USD.
 * Стійке до не-JSON відповіді: кілька спроб + фолбек.
 */
export async function fetchGdelt15m(
  query: string = DEFAULT_QUERY,
  maxrecords = 100
): Promise<GdeltDoc[]> {
  // 1) DOC API (ArtList)
  const baseDoc = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  baseDoc.searchParams.set('query', query);
  baseDoc.searchParams.set('timespan', '15m');
  baseDoc.searchParams.set('maxrecords', String(maxrecords));
  baseDoc.searchParams.set('format', 'json');

  // спроба А: з mode=ArtList + sort
  baseDoc.searchParams.set('mode', 'ArtList');
  baseDoc.searchParams.set('sort', 'DateDesc');
  const a = await fetchJson(baseDoc.toString());
  const aDocs = a && docsFromDocApi(a);
  if (aDocs && aDocs.length) return aDocs;

  // спроба Б: без mode (деякі проксі вертають тільки без нього)
  baseDoc.searchParams.delete('mode');
  const b = await fetchJson(baseDoc.toString());
  const bDocs = b && docsFromDocApi(b);
  if (bDocs && bDocs.length) return bDocs;

  // 2) EVENTS API як бекап (не статті, але дає події/URL)
  const baseEvents = new URL('https://api.gdeltproject.org/api/v2/events/events');
  baseEvents.searchParams.set('query', query);
  baseEvents.searchParams.set('timespan', '15m');
  baseEvents.searchParams.set('format', 'json');
  const e = await fetchJson(baseEvents.toString());
  const eDocs = e && docsFromEventsApi(e);
  if (eDocs && eDocs.length) return eDocs;

  // 3) Остаточний фолбек — мок, щоб не ламати UI
  return mockNews();
}