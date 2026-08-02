/**
 * Design Review Browser — loads browse/catalog.json and drives
 * keyboard film-strip review + local feedback for any deconstruct-engine output tree.
 */
const CATALOG_URL = new URL('./catalog.json', import.meta.url);

/** @typedef {'unseen'|'ok'|'needs-work'|'blocker'} Status */
/** @typedef {{ status: Status, note: string, updatedAt: string|null }} Feedback */

const state = {
  catalog: null,
  layer: 'views', // views | atoms | molecules | organisms
  themeMode: 'dark', // dark | light | pair
  stageMode: 'png', // png | live
  query: '',
  filterUnreviewed: false,
  filterFlagged: false,
  routeId: null,
  stateId: null,
  /** flat list of entries for current layer + filters */
  entries: [],
  index: 0,
  feedback: /** @type {Record<string, Feedback>} */ ({}),
  storageKey: 'design-review:default',
  saveTimer: null,
};

// ── DOM ──────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const els = {
  sourceLabel: $('source-label'),
  layerChips: $('layer-chips'),
  search: $('search'),
  progressBar: $('progress-bar'),
  progressText: $('progress-text'),
  exportBtn: $('export-btn'),
  routeList: $('route-list'),
  stateList: $('state-list'),
  stateSection: $('state-section'),
  filterUnreviewed: $('filter-unreviewed'),
  filterFlagged: $('filter-flagged'),
  crumb: $('crumb'),
  stageTitle: $('stage-title'),
  stageCount: $('stage-count'),
  frameWrap: $('frame-wrap'),
  stageEmpty: $('stage-empty'),
  prevBtn: $('prev-btn'),
  nextBtn: $('next-btn'),
  openHtml: $('open-html'),
  copyPath: $('copy-path'),
  noteField: $('note-field'),
  notesMeta: $('notes-meta'),
  notesPath: $('notes-path'),
  strip: $('strip'),
  toast: $('toast'),
};

// ── utils ────────────────────────────────────────────────────────────────────
function toast(msg) {
  els.toast.hidden = false;
  els.toast.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    els.toast.hidden = true;
  }, 1800);
}

function assetUrl(rel) {
  if (!rel) return null;
  // catalog paths are relative to system root; browse/ is one level down
  return new URL(`../${rel}`, import.meta.url).href;
}

function thumbFor(entry, theme = 'dark') {
  const a = entry.assets || {};
  if (theme === 'light') {
    return a.lightMobile || a.lightPng || a.darkMobile || a.darkPng || null;
  }
  return a.darkMobile || a.darkPng || a.lightMobile || a.lightPng || null;
}

function htmlFor(entry, theme = 'dark') {
  const a = entry.assets || {};
  if (theme === 'light') return a.lightHtml || a.darkHtml || null;
  return a.darkHtml || a.lightHtml || null;
}

function fb(path) {
  return (
    state.feedback[path] || {
      status: 'unseen',
      note: '',
      updatedAt: null,
    }
  );
}

function setFb(path, patch) {
  const prev = fb(path);
  state.feedback[path] = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  scheduleSave();
  updateProgress();
  renderRailDots();
  renderStrip();
}

function scheduleSave() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(persistFeedback, 200);
}

function persistFeedback() {
  try {
    localStorage.setItem(state.storageKey, JSON.stringify(state.feedback));
  } catch {
    /* quota */
  }
}

function loadFeedback() {
  try {
    const raw = localStorage.getItem(state.storageKey);
    state.feedback = raw ? JSON.parse(raw) : {};
  } catch {
    state.feedback = {};
  }
}

// ── catalog → flat entries ───────────────────────────────────────────────────
function flattenViews(catalog) {
  const out = [];
  const routes = catalog.layers?.views?.routes || [];
  for (const route of routes) {
    for (const st of route.states || []) {
      for (const leaf of st.leaves || []) {
        out.push({
          kind: 'view',
          path: leaf.path,
          routeId: route.id,
          routeLabel: route.label,
          stateId: st.id,
          stateLabel: st.label,
          id: leaf.id,
          n: leaf.n,
          title: leaf.title,
          assets: leaf.assets,
          coverage: leaf.coverage,
        });
      }
    }
  }
  return out;
}

function flattenComponents(catalog, layer) {
  return (catalog.layers?.[layer] || []).map((c) => ({
    kind: layer,
    path: c.path,
    routeId: layer,
    routeLabel: layer,
    stateId: '_',
    stateLabel: 'base',
    id: c.id,
    n: null,
    title: c.label || c.id,
    assets: c.assets,
  }));
}

function allForLayer() {
  if (!state.catalog) return [];
  if (state.layer === 'views') return flattenViews(state.catalog);
  return flattenComponents(state.catalog, state.layer);
}

function matchesQuery(entry, q) {
  if (!q) return true;
  const hay = [
    entry.path,
    entry.routeLabel,
    entry.stateLabel,
    entry.title,
    entry.id,
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function matchesFilters(entry) {
  const f = fb(entry.path);
  if (state.filterUnreviewed && f.status !== 'unseen') return false;
  if (
    state.filterFlagged &&
    f.status !== 'needs-work' &&
    f.status !== 'blocker'
  ) {
    return false;
  }
  return true;
}

function rebuildEntries({ keepPath = null } = {}) {
  let list = allForLayer().filter(
    (e) => matchesQuery(e, state.query) && matchesFilters(e),
  );

  // When a route is selected, still allow strip of whole filtered set OR
  // prefer keeping order: all matching, with optional soft-focus on route.
  // Nav selects route for rail highlight; navigation is across filtered list.
  state.entries = list;

  if (keepPath) {
    const i = list.findIndex((e) => e.path === keepPath);
    state.index = i >= 0 ? i : 0;
  } else if (state.index >= list.length) {
    state.index = Math.max(0, list.length - 1);
  }

  if (list.length && state.routeId == null && state.layer === 'views') {
    state.routeId = list[0].routeId;
    state.stateId = list[0].stateId;
  }
}

function current() {
  return state.entries[state.index] || null;
}

// ── render ───────────────────────────────────────────────────────────────────
function renderLayerChips() {
  const c = state.catalog?.counts || {};
  const layers = [
    ['views', c.views],
    ['atoms', c.atoms],
    ['molecules', c.molecules],
    ['organisms', c.organisms],
  ];
  els.layerChips.innerHTML = '';
  layers.forEach(([name, count], i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layers__btn';
    btn.textContent = name;
    btn.disabled = !count;
    btn.setAttribute('aria-pressed', state.layer === name ? 'true' : 'false');
    btn.title = count ? `${count} items · key ${i + 1}` : 'None in catalog';
    btn.addEventListener('click', () => {
      if (!count) return;
      state.layer = name;
      state.routeId = null;
      state.stateId = null;
      state.index = 0;
      rebuildEntries();
      syncHash();
      renderAll();
    });
    els.layerChips.appendChild(btn);
  });
}

function routeStats(routeId) {
  const leaves = allForLayer().filter((e) => e.routeId === routeId);
  let ok = 0,
    needs = 0,
    block = 0,
    unseen = 0;
  for (const e of leaves) {
    const s = fb(e.path).status;
    if (s === 'ok') ok++;
    else if (s === 'needs-work') needs++;
    else if (s === 'blocker') block++;
    else unseen++;
  }
  return { total: leaves.length, ok, needs, block, unseen };
}

function renderRoutes() {
  els.routeList.innerHTML = '';
  if (state.layer !== 'views') {
    // component layers: single "route" list of components as flat groups
    const items = allForLayer();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rail__item';
    btn.setAttribute('aria-current', 'true');
    btn.innerHTML = `<span>${state.layer}</span><span class="rail__count">${items.length}</span>`;
    els.routeList.appendChild(wrapLi(btn));
    els.stateSection.hidden = true;
    return;
  }

  const routes = state.catalog?.layers?.views?.routes || [];
  for (const r of routes) {
    const stats = routeStats(r.id);
    const hasAny = allForLayer().some(
      (e) => e.routeId === r.id && matchesQuery(e, state.query) && matchesFilters(e),
    );
    if (!hasAny && (state.query || state.filterUnreviewed || state.filterFlagged)) {
      continue;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rail__item';
    btn.setAttribute(
      'aria-current',
      state.routeId === r.id ? 'true' : 'false',
    );
    const dot = document.createElement('span');
    dot.className = 'rail__dot';
    if (stats.block) dot.classList.add('rail__dot--block');
    else if (stats.needs) dot.classList.add('rail__dot--needs');
    else if (stats.ok && stats.unseen === 0) dot.classList.add('rail__dot--ok');
    else if (stats.ok) dot.classList.add('rail__dot--mixed');

    const label = document.createElement('span');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '8px';
    label.style.minWidth = '0';
    label.appendChild(dot);
    const t = document.createElement('span');
    t.textContent = r.label;
    t.style.overflow = 'hidden';
    t.style.textOverflow = 'ellipsis';
    t.style.whiteSpace = 'nowrap';
    label.appendChild(t);

    const count = document.createElement('span');
    count.className = 'rail__count';
    count.textContent = String(r.leafCount);

    btn.appendChild(label);
    btn.appendChild(count);
    btn.addEventListener('click', () => {
      state.routeId = r.id;
      const first = state.entries.find((e) => e.routeId === r.id) ||
        allForLayer().find((e) => e.routeId === r.id);
      if (first) {
        // ensure entry is in filtered list
        rebuildEntries();
        let i = state.entries.findIndex((e) => e.path === first.path);
        if (i < 0) {
          // temporarily clear filters? jump within full layer list
          const full = allForLayer().filter((e) => e.routeId === r.id);
          if (full[0]) {
            state.filterUnreviewed = false;
            state.filterFlagged = false;
            els.filterUnreviewed.checked = false;
            els.filterFlagged.checked = false;
            rebuildEntries();
            i = state.entries.findIndex((e) => e.routeId === r.id);
          }
        }
        if (i >= 0) state.index = i;
        state.stateId = state.entries[state.index]?.stateId ?? null;
      }
      syncHash();
      renderAll();
    });
    els.routeList.appendChild(wrapLi(btn));
  }
  renderStates();
}

function wrapLi(el) {
  const li = document.createElement('li');
  li.appendChild(el);
  return li;
}

function renderStates() {
  if (state.layer !== 'views' || !state.routeId) {
    els.stateSection.hidden = true;
    return;
  }
  const route = (state.catalog.layers.views.routes || []).find(
    (r) => r.id === state.routeId,
  );
  if (!route || route.states.length <= 1) {
    // still show if multiple meaningful states
    const meaningful = (route?.states || []).filter(
      (s) => s.id !== '_' && s.id !== '_base',
    );
    if (meaningful.length <= 1) {
      els.stateSection.hidden = true;
      return;
    }
  }
  els.stateSection.hidden = false;
  els.stateList.innerHTML = '';
  for (const st of route.states) {
    const count = st.leaves.length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rail__item';
    btn.setAttribute(
      'aria-current',
      state.stateId === st.id ? 'true' : 'false',
    );
    btn.innerHTML = `<span>${escapeHtml(st.label)}</span><span class="rail__count">${count}</span>`;
    btn.addEventListener('click', () => {
      state.stateId = st.id;
      const i = state.entries.findIndex(
        (e) => e.routeId === state.routeId && e.stateId === st.id,
      );
      if (i >= 0) state.index = i;
      else {
        // find in full list
        const full = allForLayer().find(
          (e) => e.routeId === state.routeId && e.stateId === st.id,
        );
        if (full) {
          rebuildEntries({ keepPath: full.path });
        }
      }
      syncHash();
      renderAll();
    });
    els.stateList.appendChild(wrapLi(btn));
  }
}

function renderRailDots() {
  // re-render rail for status dots without full wipe of focus when possible
  renderRoutes();
}

function renderStage() {
  const entry = current();
  if (!entry) {
    els.stageEmpty.hidden = false;
    els.frameWrap.innerHTML = '';
    els.stageTitle.textContent = 'No match';
    els.stageCount.textContent = '';
    els.crumb.textContent = '';
    els.openHtml.removeAttribute('href');
    els.notesPath.textContent = '';
    els.prevBtn.disabled = true;
    els.nextBtn.disabled = true;
    return;
  }
  els.stageEmpty.hidden = true;
  els.prevBtn.disabled = state.index <= 0;
  els.nextBtn.disabled = state.index >= state.entries.length - 1;

  const crumbs = [entry.routeLabel];
  if (entry.stateLabel && entry.stateLabel !== 'base') crumbs.push(entry.stateLabel);
  els.crumb.innerHTML = crumbs
    .map((c, i) => (i === crumbs.length - 1 ? `<strong>${escapeHtml(c)}</strong>` : escapeHtml(c)))
    .join(' · ');
  els.stageTitle.textContent = entry.title;
  els.stageCount.textContent = `${state.index + 1} / ${state.entries.length}`;
  els.notesPath.textContent = entry.path;

  const htmlPath =
    state.themeMode === 'light'
      ? htmlFor(entry, 'light')
      : htmlFor(entry, 'dark');
  if (htmlPath) {
    els.openHtml.href = assetUrl(htmlPath);
  } else {
    els.openHtml.removeAttribute('href');
  }

  els.frameWrap.className =
    'frame-wrap' + (state.themeMode === 'pair' ? ' frame-wrap--pair' : '');
  els.frameWrap.innerHTML = '';

  const themes =
    state.themeMode === 'pair' ? ['dark', 'light'] : [state.themeMode];

  for (const theme of themes) {
    const frame = document.createElement('div');
    frame.className = 'frame';
    if (state.themeMode === 'pair') {
      const lab = document.createElement('div');
      lab.className = 'frame__label';
      lab.textContent = theme;
      frame.appendChild(lab);
    }
    const glass = document.createElement('div');
    glass.className = 'frame__glass';

    if (state.stageMode === 'live') {
      const src = htmlFor(entry, theme);
      if (src) {
        const iframe = document.createElement('iframe');
        iframe.className = 'frame__iframe';
        iframe.title = `${entry.title} (${theme})`;
        iframe.src = assetUrl(src);
        glass.appendChild(iframe);
      } else {
        glass.textContent = 'No HTML';
        glass.style.color = '#888';
        glass.style.padding = '40px';
      }
    } else {
      const src = thumbFor(entry, theme);
      if (src) {
        const img = document.createElement('img');
        img.className = 'frame__img';
        img.alt = `${entry.title} ${theme}`;
        img.src = assetUrl(src);
        glass.appendChild(img);
      } else {
        glass.textContent = 'No preview';
        glass.style.color = '#888';
        glass.style.padding = '40px';
      }
    }
    frame.appendChild(glass);
    els.frameWrap.appendChild(frame);
  }

  // notes panel
  const f = fb(entry.path);
  els.noteField.value = f.note || '';
  document.querySelectorAll('.status').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.status === f.status ? 'true' : 'false',
    );
  });
  els.notesMeta.textContent = f.updatedAt
    ? `Saved ${new Date(f.updatedAt).toLocaleString()}`
    : 'Not yet reviewed';
}

function renderStrip() {
  const entry = current();
  els.strip.innerHTML = '';
  // show nearby window for performance on large catalogs
  const total = state.entries.length;
  const windowSize = 80;
  let start = 0;
  let end = total;
  if (total > windowSize) {
    start = Math.max(0, state.index - Math.floor(windowSize / 2));
    end = Math.min(total, start + windowSize);
    start = Math.max(0, end - windowSize);
  }

  for (let i = start; i < end; i++) {
    const e = state.entries[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'strip__item';
    btn.setAttribute('aria-current', i === state.index ? 'true' : 'false');
    btn.title = e.title;
    btn.dataset.index = String(i);
    const thumb = thumbFor(e, state.themeMode === 'light' ? 'light' : 'dark');
    if (thumb) {
      const img = document.createElement('img');
      img.src = assetUrl(thumb);
      img.alt = '';
      img.loading = 'lazy';
      btn.appendChild(img);
    }
    const status = fb(e.path).status;
    if (status !== 'unseen') {
      const badge = document.createElement('span');
      badge.className = `strip__badge strip__badge--${status === 'needs-work' ? 'needs' : status === 'blocker' ? 'block' : 'ok'}`;
      btn.appendChild(badge);
    }
    if (e.n != null) {
      const n = document.createElement('span');
      n.className = 'strip__n';
      n.textContent = String(e.n);
      btn.appendChild(n);
    }
    btn.addEventListener('click', () => {
      goTo(i);
    });
    els.strip.appendChild(btn);
  }

  // scroll active into view
  requestAnimationFrame(() => {
    const active = els.strip.querySelector('[aria-current="true"]');
    if (active) {
      active.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  });
  void entry;
}

function updateProgress() {
  const all = allForLayer();
  const reviewed = all.filter((e) => fb(e.path).status !== 'unseen').length;
  const total = all.length;
  const pct = total ? Math.round((reviewed / total) * 100) : 0;
  els.progressBar.style.width = `${pct}%`;
  els.progressText.textContent = `${reviewed} / ${total}`;
}

function renderSegButtons() {
  document.querySelectorAll('[data-theme-mode]').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.themeMode === state.themeMode ? 'true' : 'false',
    );
  });
  document.querySelectorAll('[data-stage-mode]').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.stageMode === state.stageMode ? 'true' : 'false',
    );
  });
}

function renderAll() {
  renderLayerChips();
  renderSegButtons();
  renderRoutes();
  renderStage();
  renderStrip();
  updateProgress();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── navigation ───────────────────────────────────────────────────────────────
function goTo(i) {
  if (!state.entries.length) return;
  state.index = Math.max(0, Math.min(state.entries.length - 1, i));
  const e = current();
  if (e) {
    state.routeId = e.routeId;
    state.stateId = e.stateId;
  }
  syncHash();
  renderAll();
}

function next(delta = 1) {
  goTo(state.index + delta);
}

function nextInRoute(delta = 1) {
  const e = current();
  if (!e) return;
  const routeEntries = state.entries
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => x.routeId === e.routeId);
  const pos = routeEntries.findIndex(({ i }) => i === state.index);
  const nextPos = pos + delta;
  if (nextPos < 0 || nextPos >= routeEntries.length) return;
  goTo(routeEntries[nextPos].i);
}

// ── hash deep links ──────────────────────────────────────────────────────────
function syncHash() {
  const e = current();
  if (!e) {
    history.replaceState(null, '', location.pathname + location.search);
    return;
  }
  const hash = `#${e.path}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

function applyHash() {
  const h = location.hash.replace(/^#/, '');
  if (!h) return false;
  // path might be views/... or just relative
  const path = h;
  // find in full layer set, switch layer if needed
  for (const layer of ['views', 'atoms', 'molecules', 'organisms']) {
    state.layer = layer;
    rebuildEntries();
    // rebuild without filters for hash resolve
    const full =
      layer === 'views'
        ? flattenViews(state.catalog)
        : flattenComponents(state.catalog, layer);
    const hit = full.find((e) => e.path === path || e.path === `views/${path}`);
    if (hit) {
      state.layer = layer;
      state.query = '';
      els.search.value = '';
      state.filterUnreviewed = false;
      state.filterFlagged = false;
      els.filterUnreviewed.checked = false;
      els.filterFlagged.checked = false;
      rebuildEntries({ keepPath: hit.path });
      state.routeId = hit.routeId;
      state.stateId = hit.stateId;
      return true;
    }
  }
  state.layer = 'views';
  rebuildEntries();
  return false;
}

// ── export ───────────────────────────────────────────────────────────────────
function exportMarkdown() {
  const c = state.catalog;
  const lines = [
    `# Design Review feedback`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    c?.source ? `Source: ${c.source}` : null,
    ``,
  ].filter((x) => x !== null);

  const groups = {
    views: flattenViews(c),
    atoms: flattenComponents(c, 'atoms'),
    molecules: flattenComponents(c, 'molecules'),
    organisms: flattenComponents(c, 'organisms'),
  };

  for (const [layer, items] of Object.entries(groups)) {
    const flagged = items.filter((e) => {
      const s = fb(e.path).status;
      return s !== 'unseen' || fb(e.path).note;
    });
    if (!flagged.length) continue;
    lines.push(`## ${layer}`);
    lines.push('');

    if (layer === 'views') {
      const byRoute = new Map();
      for (const e of flagged) {
        if (!byRoute.has(e.routeId)) byRoute.set(e.routeId, []);
        byRoute.get(e.routeId).push(e);
      }
      for (const [routeId, list] of byRoute) {
        lines.push(`### ${list[0].routeLabel} (\`${routeId}\`)`);
        lines.push('');
        for (const e of list) {
          const f = fb(e.path);
          lines.push(
            `- **[${f.status}]** ${e.title} — \`${e.path}\``,
          );
          if (f.note) {
            lines.push('');
            lines.push(`  ${f.note.replace(/\n/g, '\n  ')}`);
            lines.push('');
          }
        }
      }
    } else {
      for (const e of flagged) {
        const f = fb(e.path);
        lines.push(`- **[${f.status}]** ${e.title} — \`${e.path}\``);
        if (f.note) {
          lines.push('');
          lines.push(`  ${f.note.replace(/\n/g, '\n  ')}`);
          lines.push('');
        }
      }
    }
    lines.push('');
  }

  const body = lines.join('\n');
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  const day = new Date().toISOString().slice(0, 10);
  a.href = URL.createObjectURL(blob);
  a.download = `view-feedback-${day}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Exported feedback markdown');
}

// ── events ───────────────────────────────────────────────────────────────────
function bind() {
  els.search.addEventListener('input', () => {
    state.query = els.search.value.trim().toLowerCase();
    const keep = current()?.path;
    rebuildEntries({ keepPath: keep });
    renderAll();
  });

  els.filterUnreviewed.addEventListener('change', () => {
    state.filterUnreviewed = els.filterUnreviewed.checked;
    rebuildEntries({ keepPath: current()?.path });
    renderAll();
  });
  els.filterFlagged.addEventListener('change', () => {
    state.filterFlagged = els.filterFlagged.checked;
    rebuildEntries({ keepPath: current()?.path });
    renderAll();
  });

  document.querySelectorAll('[data-theme-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.themeMode = btn.dataset.themeMode;
      renderAll();
    });
  });
  document.querySelectorAll('[data-stage-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.stageMode = btn.dataset.stageMode;
      renderAll();
    });
  });

  els.prevBtn.addEventListener('click', () => next(-1));
  els.nextBtn.addEventListener('click', () => next(1));
  els.exportBtn.addEventListener('click', exportMarkdown);

  els.copyPath.addEventListener('click', async () => {
    const e = current();
    if (!e) return;
    try {
      await navigator.clipboard.writeText(e.path);
      toast('Path copied');
    } catch {
      toast(e.path);
    }
  });

  document.querySelectorAll('.status').forEach((btn) => {
    btn.addEventListener('click', () => {
      const e = current();
      if (!e) return;
      setFb(e.path, { status: btn.dataset.status });
      document.querySelectorAll('.status').forEach((b) => {
        b.setAttribute(
          'aria-pressed',
          b.dataset.status === btn.dataset.status ? 'true' : 'false',
        );
      });
      if (btn.dataset.status === 'needs-work' || btn.dataset.status === 'blocker') {
        els.noteField.focus();
      }
    });
  });

  els.noteField.addEventListener('input', () => {
    const e = current();
    if (!e) return;
    const note = els.noteField.value;
    const prev = fb(e.path);
    setFb(e.path, {
      note,
      status:
        prev.status === 'unseen' && note.trim()
          ? 'needs-work'
          : prev.status,
    });
  });

  window.addEventListener('hashchange', () => {
    if (applyHash()) renderAll();
  });

  window.addEventListener('keydown', (ev) => {
    const tag = (ev.target && ev.target.tagName) || '';
    const typing =
      tag === 'INPUT' || tag === 'TEXTAREA' || ev.target?.isContentEditable;

    if (ev.key === '/' && !typing) {
      ev.preventDefault();
      els.search.focus();
      els.search.select();
      return;
    }
    if (ev.key === 'Escape' && typing) {
      ev.target.blur();
      return;
    }
    if (typing) return;

    switch (ev.key) {
      case 'j':
      case 'ArrowDown':
        ev.preventDefault();
        next(1);
        break;
      case 'k':
      case 'ArrowUp':
        ev.preventDefault();
        next(-1);
        break;
      case 'J':
        ev.preventDefault();
        nextInRoute(1);
        break;
      case 'K':
        ev.preventDefault();
        nextInRoute(-1);
        break;
      case 'd':
        ev.preventDefault();
        state.themeMode =
          state.themeMode === 'dark'
            ? 'light'
            : state.themeMode === 'light'
              ? 'dark'
              : 'dark';
        renderAll();
        break;
      case 'p':
        ev.preventDefault();
        state.themeMode = state.themeMode === 'pair' ? 'dark' : 'pair';
        renderAll();
        break;
      case 'i':
        ev.preventDefault();
        state.stageMode = state.stageMode === 'png' ? 'live' : 'png';
        renderAll();
        break;
      case 'o':
        ev.preventDefault();
        if (current()) setFb(current().path, { status: 'ok' });
        renderStage();
        renderStrip();
        updateProgress();
        renderRailDots();
        break;
      case 'n':
        ev.preventDefault();
        if (current()) {
          setFb(current().path, { status: 'needs-work' });
          renderStage();
          renderStrip();
          updateProgress();
          renderRailDots();
          els.noteField.focus();
        }
        break;
      case 'b':
        ev.preventDefault();
        if (current()) {
          setFb(current().path, { status: 'blocker' });
          renderStage();
          renderStrip();
          updateProgress();
          renderRailDots();
          els.noteField.focus();
        }
        break;
      case 'e':
        ev.preventDefault();
        exportMarkdown();
        break;
      case '1':
      case '2':
      case '3':
      case '4': {
        const map = ['views', 'atoms', 'molecules', 'organisms'];
        const layer = map[Number(ev.key) - 1];
        const count = state.catalog?.counts?.[layer] || 0;
        if (count) {
          state.layer = layer;
          state.index = 0;
          rebuildEntries();
          syncHash();
          renderAll();
        }
        break;
      }
      default:
        break;
    }
  });
}

// ── boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  bind();
  els.sourceLabel.textContent = 'Loading catalog…';
  try {
    const res = await fetch(CATALOG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.catalog = await res.json();
  } catch (err) {
    els.sourceLabel.textContent =
      'Catalog missing — run: node _build-catalog.mjs (from system root, over http)';
    console.error(err);
    toast('Failed to load catalog.json');
    return;
  }

  const src =
    state.catalog.source ||
    `${state.catalog.counts?.views ?? 0} views · generated ${state.catalog.generatedAt?.slice(0, 10) || ''}`;
  els.sourceLabel.textContent = src;
  document.title = `Design Review · ${state.catalog.counts?.views ?? 0} views`;

  state.storageKey = `design-review:${state.catalog.generatedAt || 'v1'}:${state.catalog.counts?.views || 0}`;
  // Prefer stable key by path counts so notes survive regenerations of same tree
  state.storageKey = `design-review:v1:${location.pathname}`;
  loadFeedback();

  if (!applyHash()) {
    rebuildEntries();
    // Prefer a product route over internal _shell specimen when present
    const start =
      state.entries.find((e) => e.routeId && !e.routeId.startsWith('_')) ||
      state.entries[0];
    if (start) {
      state.index = state.entries.indexOf(start);
      state.routeId = start.routeId;
      state.stateId = start.stateId;
    }
    syncHash();
  }
  renderAll();
}

boot().catch((err) => {
  console.error('[design-review] boot failed', err);
  toast(String(err?.message || err));
});
