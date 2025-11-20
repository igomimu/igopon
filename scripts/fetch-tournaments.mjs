import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const outputFile = path.join(projectRoot, 'public', 'tournaments.json');

const SOURCES = [
  {
    name: '日本棋院 囲碁大会・イベント',
    feedUrl: 'https://www.nihonkiin.or.jp/event/atom.xml',
    homepage: 'https://www.nihonkiin.or.jp/event/',
  },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: true,
  cdataPropName: '#cdata',
});

const normaliseToArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const htmlToPlainText = (html) => {
  if (!html) return '';
  const $ = cheerio.load(html);
  return $('body').text().replace(/\s+/g, ' ').trim();
};

const extractEventDate = (text) => {
  if (!text) return undefined;
  const patterns = [
    /(\d{4}年(?:（[^）]+）)?\s*\d{1,2}月\s*\d{1,2}日(?:（[^）]+）)?(?:\s*[〜～-]\s*(?:\d{4}年)?(?:（[^）]+）)?\s*\d{1,2}月\s*\d{1,2}日(?:（[^）]+）)?)?)/,
    /(\d{1,2}月\s*\d{1,2}日(?:（[^）]+）)?(?:\s*[〜～-]\s*\d{1,2}月\s*\d{1,2}日(?:（[^）]+）)?)?)/,
    /(\d{4}\/\d{1,2}\/\d{1,2})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\s+/g, ' ').trim();
    }
  }
  return undefined;
};

const stripYearDate = (text) => {
  if (!text) return undefined;
  const m = text.match(/(\d{4})年(?:（[^）]+）)?\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (m) {
    const [, year, month, day] = m;
    const iso = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return iso;
  }
  const slash = text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slash) {
    const [, year, month, day] = slash;
    const iso = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return iso;
  }
  return undefined;
};

const inferYearFromPublished = (eventText, publishedText) => {
  if (!eventText || !publishedText) return undefined;
  const md = eventText.match(/(\d{1,2})月\s*(\d{1,2})日/);
  if (!md) return undefined;
  const pubYearMatch = publishedText.match(/(\d{4})/);
  if (!pubYearMatch) return undefined;
  const [month, day] = md.slice(1, 3).map((n) => Number.parseInt(n, 10));
  const baseYear = Number.parseInt(pubYearMatch[1], 10);
  if (Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(baseYear)) return undefined;

  const publishIso = stripYearDate(publishedText);
  const publishDate = publishIso ? new Date(publishIso) : new Date();
  const buildIso = (y, m, d) =>
    `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const candidateMs = Date.UTC(baseYear, month - 1, day);
  const DAY_MS = 24 * 60 * 60 * 1000;

  if (candidateMs + 30 * DAY_MS < publishDate.getTime()) {
    return buildIso(baseYear + 1, month, day);
  }
  return buildIso(baseYear, month, day);
};

const toDateValue = (isoString) => {
  if (!isoString) return undefined;
  const timestamp = Date.parse(isoString);
  return Number.isNaN(timestamp) ? undefined : timestamp;
};

const extractContent = (entry) => {
  if (!entry.content) return '';
  if (typeof entry.content === 'string') return entry.content;
  if (entry.content['#cdata']) return entry.content['#cdata'];
  if (entry.content['#text']) return entry.content['#text'];
  if (entry.content.cdata) return entry.content.cdata;
  return '';
};

const extractLink = (entry) => {
  const links = normaliseToArray(entry.link);
  for (const link of links) {
    if (typeof link === 'string') return link;
    if (link?.href && (!link.rel || link.rel === 'alternate')) return link.href;
  }
  return undefined;
};

const buildSummary = (text) => {
  if (!text) return '';
  const max = 140;
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const fetchFromAtomFeed = async (source) => {
  const res = await fetch(source.feedUrl, {
    headers: { 'User-Agent': 'igo-tournaments-fetcher/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${source.feedUrl}: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const entries = normaliseToArray(parsed.feed?.entry);

  return entries.map((entry) => {
    const title = entry.title?.trim() ?? 'タイトル未取得';
    const url = extractLink(entry) ?? source.homepage;
    const publishedText = entry.published ?? entry.updated ?? '';
    const contentHtml = extractContent(entry);
    const textContent = htmlToPlainText(contentHtml || entry.summary || '');
    const eventDateText = extractEventDate(textContent);
    const eventIsoDate =
      stripYearDate(eventDateText ?? '') ?? inferYearFromPublished(eventDateText, publishedText) ?? null;

    const publishedIso = stripYearDate(publishedText) ?? null;
    const sortDateValue =
      toDateValue(eventIsoDate) ?? toDateValue(publishedIso) ?? Number.MAX_SAFE_INTEGER;

    return {
      title,
      url,
      source: source.name,
      sourceHomepage: source.homepage,
      eventDateText: eventDateText ?? '日程情報が見つかりませんでした',
      publishedText: publishedText || '更新日未取得',
      publishedIso,
      eventIsoDate: eventIsoDate ?? null,
      sortDate: sortDateValue,
      summary: buildSummary(textContent),
      categories: normaliseToArray(entry.category)
        .map((cat) => (typeof cat === 'string' ? cat : cat?.term))
        .filter(Boolean),
    };
  });
};

const run = async () => {
  const allItems = [];
  for (const source of SOURCES) {
    const items = await fetchFromAtomFeed(source);
    allItems.push(...items);
  }

  const sorted = allItems.sort((a, b) => {
    return a.sortDate - b.sortDate;
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: SOURCES,
    tournaments: sorted,
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`Saved ${sorted.length} tournaments to ${outputFile}`);
};

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
