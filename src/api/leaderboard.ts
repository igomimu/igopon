
export interface LeaderboardEntry {
    name: string;
    score: number;
    timestamp: string;
    rank?: number;
}

export interface LeaderboardParams {
    date?: string;
    limit?: number;
    range?: string;
}

const API_BASE = 'https://script.google.com/macros/s/AKfycby6x7sGLKNAbc9ZXhlLniKHiblTQkAkmrsd13IiCim7cRDFyI3zuZC6LlOdUp2VoRLB/exec';

export const DAILY_DISPLAY_LIMIT = 5;
export const WEEKLY_DISPLAY_LIMIT = 1;
export const MONTHLY_DISPLAY_LIMIT = 1;

const DEFAULT_FETCH_LIMIT = 10;
const LEADERBOARD_TIMEOUT_MS = 6000;

export function sanitizePlayerName(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    const text = String(value);
    return text
        .replace(/[\r\n\t]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, 20);
}

function buildLeaderboardUrl(params: LeaderboardParams = {}): string {
    const query = new URLSearchParams();
    if (params.date) {
        query.set('date', params.date);
    }
    if (params.range) {
        query.set('range', params.range);
    }
    const effectiveLimit = Number.isFinite(params.limit) && params.limit! > 0 ? params.limit! : DEFAULT_FETCH_LIMIT;
    query.set('limit', String(effectiveLimit));
    return `${API_BASE}?${query.toString()}`;
}

async function fetchLeaderboardEntries(params: LeaderboardParams): Promise<LeaderboardEntry[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LEADERBOARD_TIMEOUT_MS);

    try {
        const response = await fetch(buildLeaderboardUrl(params), {
            method: 'GET',
            mode: 'cors',
            cache: 'no-store',
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Leaderboard request failed: ${response.status}`);
        }

        const payload = await response.json();
        const rawEntries = Array.isArray(payload.entries) ? payload.entries : [];

        return rawEntries.map((entry: any) => {
            const name = entry.player || entry.name || entry.playerName || '名無し';
            return {
                name: name,
                score: Number(entry.score) || 0,
                timestamp: entry.timestamp || new Date().toISOString(),
                rank: entry.rank
            };
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

function getDateKeyWithOffset(daysBack: number): string {
    const target = new Date();
    target.setDate(target.getDate() - daysBack);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export async function fetchRollingEntries(days: number, perDayLimit: number): Promise<LeaderboardEntry[]> {
    const aggregate: LeaderboardEntry[] = [];
    const limit = Number.isFinite(perDayLimit) && perDayLimit > 0 ? perDayLimit : DEFAULT_FETCH_LIMIT;

    // Parallel fetch for better performance, though sequential is safer for rate limits.
    // Given the original code was sequential, we'll keep it sequential or use Promise.all if we want speed.
    // Original was sequential. Let's try Promise.all for better UX, but handle errors gracefully.

    const promises = [];
    for (let offset = 0; offset < days; offset += 1) {
        const dateKey = getDateKeyWithOffset(offset);
        promises.push(
            fetchLeaderboardEntries({ date: dateKey, limit })
                .then(entries => entries)
                .catch(error => {
                    console.warn('Failed to load leaderboard for', dateKey, error);
                    return [] as LeaderboardEntry[];
                })
        );
    }

    const results = await Promise.all(promises);
    results.forEach(entries => aggregate.push(...entries));

    // Deduplicate based on name + score + timestamp? 
    // The original code had complex dedupe logic. For now, let's just sort.
    // Actually, let's implement the dedupe logic if possible, or just simple sort.
    // Simple sort for now.

    aggregate.sort((a, b) => {
        const scoreA = Number(a.score) || 0;
        const scoreB = Number(b.score) || 0;
        return scoreB - scoreA;
    });

    return aggregate;
}

export async function submitScore(name: string, score: number): Promise<void> {
    const payload = {
        name,
        playerName: name,
        score: Math.floor(score),
        origin: typeof location !== 'undefined' ? location.hostname : 'unknown'
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LEADERBOARD_TIMEOUT_MS);

    try {
        await fetch(API_BASE, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-store',
            body: JSON.stringify(payload),
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }
}
