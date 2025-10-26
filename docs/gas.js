const SPREADSHEET_ID = '1jPv6UgPUJ-GL-c6IJVQw9R1grbSOJXLcO2bMnLL6vts';
const SHEET_NAME = 'scores';
const TOP_LIMIT = 10;
const TZ = 'Asia/Tokyo';
const RANGE_WINDOW = {
    week: 7,
    month: 30
};
const SS = SpreadsheetApp.openById(SPREADSHEET_ID);

const jsonResponse = (payload) => ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);

function normalizeDateKey(value) {
    if (value instanceof Date) {
        return Utilities.formatDate(value, TZ, 'yyyy-MM-dd');
    }
    return String(value || '');
}

function startOfDay(value) {
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function addDays(value, offset) {
    const date = startOfDay(value);
    date.setDate(date.getDate() + offset);
    return date;
}

function coerceDate(value) {
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function doPost(e) {
    try {
        const rawBody = e?.postData?.contents || '';
        const payload = rawBody ? JSON.parse(rawBody) : (e && e.parameter) || {};

        let name = String(payload.name ?? payload.player ?? '').trim().replace(/[<>]/g, '').slice(0, 20);
        if (!name) {
            name = 'Guest';
        }

        const score = Math.floor(Number(payload.score));
        if (!Number.isFinite(score) || score <= 0) {
            return jsonResponse({ ok: false, message: 'invalid score' });
        }

        const sheet = SS.getSheetByName(SHEET_NAME);
        if (!sheet) {
            return jsonResponse({ ok: false, message: `sheet "${SHEET_NAME}" not found` });
        }

        const now = new Date();
        const dayKey = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
        sheet.appendRow([now, dayKey, name, score, payload.origin ?? '']);

        return jsonResponse({
            ok: true,
            saved: {
                timestamp: now.toISOString?.() || now,
                date_key: dayKey,
                player: name,
                score
            }
        });
    } catch (error) {
        return jsonResponse({ ok: false, message: String(error) });
    }
}

function doGet(e) {
    const callback = e?.parameter?.callback;
    const sheet = SS.getSheetByName(SHEET_NAME);

    if (!sheet) {
        const payload = { ok: false, date: null, entries: [], message: `sheet "${SHEET_NAME}" not found` };
        if (callback) {
            return ContentService
                .createTextOutput(`${callback}(${JSON.stringify(payload)})`)
                .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return jsonResponse(payload);
    }

    const limit = Math.min(Number(e?.parameter?.limit) || 5, TOP_LIMIT);
    const wantAll = String(e?.parameter?.all || '') === '1';
    const rangeParam = (e?.parameter?.range || '').toLowerCase();
    const windowDays = RANGE_WINDOW[rangeParam] || null;

    let dayKey = e?.parameter?.date || Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    const todayStart = startOfDay(new Date());
    let rangeStart = null;
    let rangeEndExclusive = null;

    if (windowDays) {
        rangeStart = addDays(todayStart, -(windowDays - 1));
        rangeEndExclusive = addDays(todayStart, 1);
        dayKey = rangeParam;
    }

    const lastRow = sheet.getLastRow();
    let values = [];
    if (lastRow >= 2) {
        values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    }

    let rows = values.map((row) => ({
        timestamp: row[0],
        date_key: normalizeDateKey(row[1]),
        player: String(row[2] ?? ''),
        score: Number(row[3]),
        origin: row[4]
    })).filter((row) => Number.isFinite(row.score));

    if (rangeStart) {
        const startKey = normalizeDateKey(rangeStart);
        const endKey = normalizeDateKey(todayStart);
        rows = rows.filter((row) => {
            const ts = coerceDate(row.timestamp);
            if (ts) {
                return ts >= rangeStart && ts < rangeEndExclusive;
            }
            const key = row.date_key;
            return key >= startKey && key <= endKey;
        });
    } else if (!wantAll) {
        rows = rows.filter((row) => row.date_key === dayKey);
    }

    const entries = rows
        .sort((a, b) => {
            if (a.score === b.score) {
                const timeA = coerceDate(a.timestamp)?.getTime() ?? 0;
                const timeB = coerceDate(b.timestamp)?.getTime() ?? 0;
                return timeA - timeB;
            }
            return b.score - a.score;
        })
        .slice(0, limit);

    const payload = {
        ok: true,
        date: wantAll ? 'ALL' : dayKey,
        range: windowDays ? rangeParam : null,
        entries
    };

    if (callback) {
        return ContentService
            .createTextOutput(`${callback}(${JSON.stringify(payload)})`)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return jsonResponse(payload);
}
