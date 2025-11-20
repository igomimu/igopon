const ENDPOINT = './tournaments.json';
const state = {
  tournaments: [],
  generatedAt: null,
  sources: [],
};

const $list = document.querySelector('#tournament-list');
const $status = document.querySelector('#status');
const $lastUpdated = document.querySelector('#last-updated');
const $sourceInfo = document.querySelector('#source-info');
const $search = document.querySelector('#search');
const $sort = document.querySelector('#sort');
const $hidePast = document.querySelector('#hide-past');
const $reload = document.querySelector('#reload-btn');
const $toast = document.querySelector('#toast');

const DAY_MS = 24 * 60 * 60 * 1000;

const safeTime = (value) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

const formatRelative = (iso) => {
  if (!iso) return '日程未設定';
  const now = Date.now();
  const diffDays = Math.round((safeTime(iso) - now) / DAY_MS);
  if (Number.isNaN(diffDays)) return '日程未設定';
  if (diffDays === 0) return '本日';
  if (diffDays > 0) return `あと${diffDays}日`;
  return `${Math.abs(diffDays)}日前`;
};

const showToast = (text) => {
  if (!$toast) return;
  $toast.textContent = text;
  $toast.classList.add('show');
  setTimeout(() => $toast.classList.remove('show'), 1500);
};

const copyText = async (text, label) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} をコピーしました`);
  } catch (err) {
    console.error('copy failed', err);
    showToast('コピーできませんでした');
  }
};

const buildCard = (item) => {
  const li = document.createElement('li');
  li.className = 'card';

  const categories = item.categories || [];
  const rel = formatRelative(item.eventIsoDate);
  const published = item.publishedText || '更新日未取得';
  const summary = item.summary || '';

  li.innerHTML = `
    <div class="card__inner">
      <div>
        <span class="pill">${item.source}</span>
        <h2>${item.title}</h2>
        <div class="categories">
          ${categories.map((c) => `<span class="chip">${c}</span>`).join('')}
        </div>
      </div>
      <div class="date-box">
        <div class="date-label">日程</div>
        <div class="date-main">${item.eventDateText || '未定'}</div>
        <div class="date-sub">${rel}</div>
        <div class="date-sub">公開: ${published}</div>
      </div>
    </div>
    <p class="summary">${summary}</p>
    <div class="actions">
      <button type="button" class="js-copy-name">大会名</button>
      <button type="button" class="js-copy-date ghost">日付</button>
      <button type="button" class="js-copy-url">URL</button>
      <button type="button" class="js-copy-line ghost">まとめて</button>
    </div>
    <a class="open-link" href="${item.url}" target="_blank" rel="noreferrer noopener">公式ページを開く</a>
  `;

  const nameBtn = li.querySelector('.js-copy-name');
  const dateBtn = li.querySelector('.js-copy-date');
  const urlBtn = li.querySelector('.js-copy-url');
  const lineBtn = li.querySelector('.js-copy-line');

  nameBtn?.addEventListener('click', () => copyText(item.title, '大会名'));
  dateBtn?.addEventListener('click', () => copyText(item.eventDateText || '日程未定', '日付'));
  urlBtn?.addEventListener('click', () => copyText(item.url, 'URL'));
  lineBtn?.addEventListener('click', () => {
    const combined = `${item.title}｜${item.eventDateText || '日程未定'}｜${item.url}`;
    copyText(combined, '大会名 + 日付 + URL');
  });

  return li;
};

const render = () => {
  if (!$list || !$status) return;
  const keyword = ($search?.value || '').toLowerCase().trim();
  const hidePast = $hidePast?.checked ?? false;
  const sortMode = $sort?.value || 'event';
  const now = Date.now();

  let filtered = state.tournaments;
  if (keyword) {
    filtered = filtered.filter((item) => {
      const haystack = [
        item.title,
        item.source,
        item.summary,
        ...(item.categories || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }

  if (hidePast) {
    filtered = filtered.filter((item) => {
      if (!item.eventIsoDate) return true;
      return safeTime(item.eventIsoDate) + DAY_MS >= now;
    });
  }

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'published') {
      return safeTime(b.publishedIso) - safeTime(a.publishedIso);
    }
    return (a.sortDate ?? Number.MAX_SAFE_INTEGER) - (b.sortDate ?? Number.MAX_SAFE_INTEGER);
  });

  $list.innerHTML = '';
  if (!sorted.length) {
    $status.textContent = '該当する大会がありません。検索条件を緩めてみてください。';
    return;
  }

  $status.textContent = `${sorted.length} 件を表示中`;
  for (const item of sorted) {
    $list.appendChild(buildCard(item));
  }
};

const loadData = async () => {
  $status.textContent = '最新データを取得中...';
  try {
    const res = await fetch(`${ENDPOINT}?ts=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.tournaments = data.tournaments ?? [];
    state.generatedAt = data.generatedAt;
    state.sources = data.sources ?? [];
    if ($lastUpdated && state.generatedAt) {
      const formatted = new Date(state.generatedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      $lastUpdated.textContent = `最終更新: ${formatted}`;
    }
    if ($sourceInfo && state.sources.length) {
      const names = state.sources.map((s) => s.name).join(' / ');
      $sourceInfo.textContent = `取得元: ${names}`;
    }
    render();
  } catch (err) {
    console.error(err);
    $status.textContent = 'データを読み込めませんでした。npm run fetch:tournaments を実行し、tournaments.json を更新してください。';
  }
};

[$search, $sort, $hidePast].forEach((el) => {
  el?.addEventListener('input', render);
  el?.addEventListener('change', render);
});

$reload?.addEventListener('click', () => {
  loadData();
});

loadData();
