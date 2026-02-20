import { messages, type MessageKey } from './messages';

export type Locale = 'ja' | 'en';

const STORAGE_KEY = 'igopon_language';

let currentLocale: Locale = detectLocale();

function detectLocale(): Locale {
  // Priority 1: URL parameter override (for itch.io embedding etc.)
  if (typeof location !== 'undefined') {
    const params = new URLSearchParams(location.search);
    const lang = params.get('lang');
    if (lang === 'en' || lang === 'ja') return lang;
  }
  // Priority 2: localStorage persisted preference
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'ja') return stored;
  } catch {
    // ignore
  }
  // Priority 3: Browser language detection
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language;
    if (lang.startsWith('ja')) return 'ja';
  }
  return 'en';
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}

export function getNumberLocale(): string {
  return currentLocale === 'ja' ? 'ja-JP' : 'en-US';
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const dict = messages[currentLocale] ?? messages.en;
  let text = dict[key] ?? messages.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

export function formatDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1);
  const day = String(date.getDate());
  return t('date.format', { year, month, day });
}

export function formatNumber(value: number): string {
  return value.toLocaleString(getNumberLocale());
}
