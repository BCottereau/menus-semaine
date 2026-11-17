'use strict';
(() => {
  /* ---------- Réglages ---------- */
  const SCORING = { miss: 10, dauphine: 5, top12: 2, wrongRank: 1 };
  const MAX_SCORE = SCORING.miss + 4 * SCORING.dauphine + 7 * SCORING.top12;
  const ELECTION = new Date('2026-12-12T21:10:00+01:00');
  const SLOT_LABELS = ['Miss France 2027', '1re dauphine', '2e dauphine', '3e dauphine', '4e dauphine', ...Array(7).fill('Top 12')];
  const SHORT = ['Miss', 'D1', 'D2', 'D3', 'D4', ...Array(7).fill('T12')];
  const RANKS = ['Miss France', '1re dauphine', '2e dauphine', '3e dauphine', '4e dauphine'];
  const rankLow = i => i === 0 ? 'Miss France' : RANKS[i];
  const B32 = '0123456789abcdefghijklmnopqrstuv';
  const LS = { picks: 'mf27.picks', name: 'mf27.name', players: 'mf27.players', results: 'mf27.results', tab: 'mf27.tab' };
  // Noms de régions utilisés dans les données historiques (en anglais) pour chaque candidate
  const REGION_KEYS = { Tahiti: ['French Polynesia', 'Tahiti'], Languedoc: ['Languedoc', 'Languedoc-Roussillon'] };
  const FR = {
    Brittany: 'Bretagne', Burgundy: 'Bourgogne', Corsica: 'Corse', 'French Guiana': 'Guyane',
    'French Polynesia': 'Polynésie (Tahiti)', 'New Caledonia': 'Nouvelle-Calédonie', Normandy: 'Normandie',
    Picardy: 'Picardie', "Nice Côte d'Azur": "Côte d'Azur", Saar: 'Sarre', Morocco: 'Maroc'
  };

  const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = {
    crown: svg('<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>'),
    info: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
    x: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    copy: svg('<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'),
    share: svg('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>'),
    shuffle: svg('<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-7.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>'),
    trash: svg('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'),
    trophy: svg('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
    search: svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
    plus: svg('<path d="M5 12h14"/><path d="M12 5v14"/>')
  };

  /* ---------- État ---------- */
  const state = {
    cands: [], byId: new Map(), winners: [], replacements: [], recent: {},
    fileResults: null, localResults: null,
    picks: Array(12).fill(null), name: '', players: [],
    selected: null, tab: 'pick', sort: 'region', query: ''
  };

  /* ---------- Utilitaires ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const save = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
  const fr = r => FR[r] || r;
  const cand = id => state.byId.get(id);
  const baseUrl = () => location.origin + location.pathname;
  const heightTxt = h => h ? h.toFixed(2).replace('.', ',') + ' m' : '–';

  async function getJSON(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(url + ' : ' + r.status);
    return r.json();
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  async function copyText(text, okMsg = 'Lien copié') {
    try { await navigator.clipboard.writeText(text); toast(okMsg); }
    catch { window.prompt('Copiez ce lien :', text); }
  }

  function initials(name) {
    const parts = name.split(/[\s-]+/).filter(Boolean);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  function avatar(c, size = 'm') {
    const hue = (c.id * 47) % 360;
    const img = c.photo_url ? `<img src="${esc(c.photo_url)}" alt="" loading="lazy" onerror="this.remove()">` : '';
    return `<span class="av av-${size}" style="--h:${hue}">${esc(initials(c.name))}${img}</span>`;
  }

  /* ---------- Encodage des liens ---------- */
  const encIds = ids => ids.map(id => B32[id || 0]).join('');
  const decIds = s => [...String(s)].map(ch => { const i = B32.indexOf(ch.toLowerCase()); return i > 0 ? i : null; });

  function validPickCode(code) {
    if (!/^[0-9a-v]{12}$/i.test(code || '')) return false;
    const ids = decIds(code);
    return ids.every(id => id && state.byId.has(id)) && new Set(ids).size === 12;
  }
  const pickLink = () => `${baseUrl()}#p=${encIds(state.picks)}&n=${encodeURIComponent(state.name.trim())}`;

  function resultsCode(R) {
    const rest = [...R.top12].filter(id => !R.order.includes(id));
    return encIds(R.order) + encIds(rest);
  }
  function decodeResults(code) {
    if (!/^[0-9a-v]{5,17}$/i.test(code || '')) return null;
    const ids = decIds(code);
    return { miss_france: ids[0], dauphines: ids.slice(1, 5), top12: ids.slice(5).filter(Boolean) };
  }

  /* ---------- Données historiques ---------- */
  const regionKeys = c => REGION_KEYS[c.region_en] || [c.region_en];

  function titlesFor(c) {
    const keys = regionKeys(c);
    const list = state.winners.filter(w => keys.includes(w.region)).map(w => ({ ...w, repl: false }))
      .concat(state.replacements.filter(w => keys.includes(w.region)).map(w => ({ ...w, repl: true })));
    return list.sort((a, b) => b.year - a.year);
  }

  function recentFor(c) {
    const keys = regionKeys(c);
    return Object.keys(state.recent).sort().reverse().map(year => {
      const e = state.recent[year];
      const list = e.top12 || e.top15 || [];
      let label = null, tier = 0;
      if (keys.includes(e.winner)) { label = 'Miss France'; tier = 3; }
      else if (e.ru && e.ru.some(r => keys.includes(r))) {
        const i = e.ru.findIndex(r => keys.includes(r));
        label = RANKS[i + 1]; tier = 2;
      } else {
        const i = list.findIndex(r => keys.includes(r));
        if (i >= 0) { label = i < 12 ? 'Top 12' : 'Top 15'; tier = 1; }
      }
      return { year, label, tier };
    });
  }

  /* ---------- Pronostic ---------- */
  function sanitizePicks(arr) {
    const out = Array(12).fill(null), seen = new Set();
    (Array.isArray(arr) ? arr : []).slice(0, 12).forEach((id, i) => {
      if (state.byId.has(id) && !seen.has(id)) { out[i] = id; seen.add(id); }
    });
    return out;
  }
  const pickCount = () => state.picks.filter(Boolean).length;
  const isComplete = () => pickCount() === 12;
  const slotOf = id => state.picks.indexOf(id);

  function commitPicks() {
    save(LS.picks, state.picks);
    renderBoard(); renderPool(); renderShare(); renderCandList(); renderRanking();
  }

  function placeInSlot(id, slot) {
    const prev = slotOf(id);
    const occupant = state.picks[slot];
    if (prev >= 0) state.picks[prev] = occupant && prev !== slot ? occupant : null; // échange si elle venait d'une autre case
    state.picks[slot] = id;
    state.selected = null;
    commitPicks();
  }

  function addPick(id) {
    if (slotOf(id) >= 0) return;
    if (state.selected != null) { placeInSlot(id, state.selected); return; }
    const free = state.picks.indexOf(null);
    if (free < 0) { toast('Top 12 complet : touchez une case pour la remplacer'); return; }
    placeInSlot(id, free);
    const c = cand(id);
    toast(`${c.region} → ${SLOT_LABELS[free]}`);
  }

  function removePick(slot) {
    state.picks[slot] = null;
    if (state.selected === slot) state.selected = null;
    commitPicks();
  }

  function swapSlots(a, b) {
    [state.picks[a], state.picks[b]] = [state.picks[b], state.picks[a]];
    state.selected = null;
    commitPicks();
  }

  function tapSlot(slot) {
    const sel = state.selected;
    if (sel === slot) { state.selected = null; }
    else if (sel != null && (state.picks[sel] || state.picks[slot])) { swapSlots(sel, slot); return; }
    else { state.selected = slot; }
    renderBoard(); renderPool();
  }

  function randomFill() {
    const free = state.cands.filter(c => slotOf(c.id) < 0).map(c => c.id);
    for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
    state.picks = state.picks.map(id => id || free.pop());
    state.selected = null;
    commitPicks();
    toast('Cases vides complétées au hasard');
  }

  /* ---------- Résultats & score ---------- */
  function resolveRef(ref) {
    if (ref == null || ref === '') return null;
    if (typeof ref === 'number') return state.byId.has(ref) ? ref : null;
    const n = norm(ref);
    if (/^\d+$/.test(n)) return state.byId.has(+n) ? +n : null;
    if (['polynesie', 'polynesie francaise', 'french polynesia'].includes(n)) return state.cands.find(c => c.region_en === 'Tahiti')?.id ?? null;
    const c = state.cands.find(c => [c.region, c.region_en, c.name].some(v => norm(v) === n));
    return c ? c.id : null;
  }

  function normResults(raw) {
    const R = { order: [null, null, null, null, null], top12: new Set(), unresolved: [] };
    if (!raw) return R;
    const refs = [raw.miss_france, ...(Array.isArray(raw.dauphines) ? raw.dauphines : [])].slice(0, 5);
    refs.forEach((ref, i) => {
      const id = resolveRef(ref);
      if (ref != null && ref !== '' && !id) R.unresolved.push(ref);
      if (id && !R.order.includes(id)) R.order[i] = id;
    });
    (Array.isArray(raw.top12) ? raw.top12 : []).forEach(ref => {
      const id = resolveRef(ref);
      if (id) R.top12.add(id); else if (ref != null && ref !== '') R.unresolved.push(ref);
    });
    R.order.forEach(id => id && R.top12.add(id));
    return R;
  }

  const activeRaw = () => state.localResults || state.fileResults;
  const results = () => normResults(activeRaw());

  function resultsStatus(R) {
    if (R.top12.size === 0) return 'none';
    if (R.top12.size >= 12 && R.order.every(Boolean)) return 'final';
    return 'partial';
  }

  function scorePicks(ids, R) {
    const top12Known = R.top12.size >= 12;
    const top5 = new Set(R.order.filter(Boolean));
    const top5Known = R.order.every(Boolean);
    const rows = ids.map((c, i) => {
      const actual = R.order.indexOf(c);
      const r = { id: c, slot: i, pts: 0, pending: false, kind: 'none', label: '' };
      if (R.top12.size === 0) { r.pending = true; r.kind = 'wait'; r.label = 'En attente'; }
      else if (!R.top12.has(c)) {
        if (top12Known) { r.kind = 'miss'; r.label = 'Hors Top 12'; }
        else { r.pending = true; r.kind = 'wait'; r.label = 'En attente'; }
      } else if (i <= 4) {
        if (R.order[i] === c) { r.pts = i === 0 ? SCORING.miss : SCORING.dauphine; r.kind = 'exact'; r.label = 'Bon rang'; }
        else if (R.order[i] != null || actual >= 0) {
          r.pts = SCORING.wrongRank; r.kind = 'part';
          r.label = actual >= 0 ? `Finalement ${rankLow(actual)}` : 'Top 12, autre rang';
        } else { r.pts = SCORING.wrongRank; r.pending = true; r.kind = 'part'; r.label = 'Top 12, rang à venir'; }
      } else if (actual >= 0) { r.pts = SCORING.wrongRank; r.kind = 'part'; r.label = `Finalement ${rankLow(actual)}`; }
      else { r.pts = SCORING.top12; r.pending = !top5Known; r.kind = 'exact'; r.label = top5Known ? 'Top 12 ✓' : 'Top 12 (si hors Top 5)'; }
      return r;
    });
    return {
      rows,
      total: rows.reduce((s, r) => s + r.pts, 0),
      exact: rows.filter(r => r.kind === 'exact').length,
      pending: rows.some(r => r.pending)
    };
  }

  /* ---------- Joueurs ---------- */
  function addPlayer(name, code, silent) {
    if (!validPickCode(code)) return 'invalid';
    name = (name || '').trim().slice(0, 40) || `Anonyme ${state.players.length + 1}`;
    const existing = state.players.find(p => norm(p.name) === norm(name));
    if (existing) {
      if (existing.code === code) return 'same';
      existing.code = code;
      save(LS.players, state.players);
      if (!silent) toast(`Pronostic de ${name} mis à jour`);
      return 'updated';
    }
    state.players.push({ name, code });
    save(LS.players, state.players);
    if (!silent) toast(`${name} ajouté·e au classement`);
    return 'added';
  }

  function parseLinks(text) {
    const found = [];
    String(text).split(/\s+/).forEach(tok => {
      const h = tok.indexOf('#');
      const q = h >= 0 ? tok.slice(h + 1) : tok;
      if (!/(^|&)p=/.test(q)) return;
      const sp = new URLSearchParams(q);
      found.push({ code: (sp.get('p') || '').toLowerCase(), name: sp.get('n') || '' });
    });
    return found;
  }

  function allEntries() {
    const list = state.players.map(p => ({ ...p, ids: decIds(p.code) }));
    if (isComplete() && state.name.trim()) {
      const code = encIds(state.picks);
      const dup = list.find(p => p.code === code && norm(p.name) === norm(state.name));
      if (dup) dup.me = true;
      else list.unshift({ name: state.name.trim(), code, ids: [...state.picks], me: true });
    }
    return list;
  }

  /* ---------- Rendu : Mon pronostic ---------- */
  function buildPickTab() {
    $('#tab-pick').innerHTML = `
      <div class="card-block">
        <label class="field">
          <span class="field-label">Votre prénom ou pseudo</span>
          <input id="nameInput" type="text" maxlength="40" autocomplete="nickname" placeholder="ex. Baptiste" value="${esc(state.name)}">
        </label>
      </div>
      <div class="board-head">
        <h2>Votre Top 12</h2>
        <span id="progress" class="progress"></span>
      </div>
      <p id="hint" class="hint"></p>
      <div id="board" class="board"></div>
      <div class="row-actions">
        <button class="btn ghost" data-action="random">${ICON.shuffle}Compléter au hasard</button>
        <button class="btn ghost" data-action="clear">${ICON.trash}Tout effacer</button>
      </div>
      <div id="share"></div>
      <div class="board-head pool-head"><h2>Les 31 candidates</h2></div>
      <div id="pool" class="pool" data-drop="pool"></div>`;
    $('#nameInput').addEventListener('input', e => {
      state.name = e.target.value;
      save(LS.name, state.name);
      renderShare(); renderRanking();
    });
  }

  function slotHTML(i) {
    const id = state.picks[i];
    const c = id && cand(id);
    const kind = i === 0 ? 'miss' : i <= 4 ? 'dau' : 'top';
    const cls = ['slot', `slot-${kind}`, c ? 'filled' : 'empty', state.selected === i ? 'selected' : ''].join(' ');
    const label = i === 0 ? `${ICON.crown}<span>Miss France 2027</span>` : `<span>${SLOT_LABELS[i]}</span>`;
    const body = c
      ? `${avatar(c, i === 0 ? 'l' : 's')}<span class="slot-txt"><span class="slot-region">${esc(c.region)}</span><span class="slot-name">${esc(c.name)}</span></span>`
      : `<span class="slot-empty">${state.selected === i ? 'Choisissez une candidate' : 'Choisir'}</span>`;
    const aria = c ? `${SLOT_LABELS[i]} : ${c.region}, ${c.name}. Touchez pour sélectionner ou échanger.` : `${SLOT_LABELS[i]} : vide`;
    return `<div class="${cls}" data-drop="slot" data-slot="${i}" ${c ? `data-drag data-cid="${id}"` : ''}>
        <button class="slot-main" data-action="slot" data-slot="${i}" aria-label="${esc(aria)}" aria-pressed="${state.selected === i}">
          <span class="slot-label">${label}</span>${body}
        </button>
        ${c ? `<button class="slot-x" data-action="unpick" data-slot="${i}" data-nodrag aria-label="Retirer ${esc(c.region)}">${ICON.x}</button>` : ''}
      </div>`;
  }

  function renderBoard() {
    const b = $('#board');
    if (!b) return;
    b.innerHTML = `
      <div class="tier tier-miss">${slotHTML(0)}</div>
      <div class="tier-title">Les dauphines</div>
      <div class="tier tier-dau">${[1, 2, 3, 4].map(slotHTML).join('')}</div>
      <div class="tier-title">Le reste du Top 12 <small>(ordre libre)</small></div>
      <div class="tier tier-top">${[5, 6, 7, 8, 9, 10, 11].map(slotHTML).join('')}</div>`;
    const n = pickCount();
    $('#progress').innerHTML = `<b>${n}</b>/12`;
    $('#progress').classList.toggle('done', n === 12);
    const hint = $('#hint');
    if (state.selected != null) {
      hint.innerHTML = `Case <b>${SLOT_LABELS[state.selected]}</b> sélectionnée : touchez une candidate, ou une autre case pour échanger.`;
      hint.classList.add('active');
    } else {
      hint.textContent = n === 12
        ? 'Pronostic complet. Touchez deux cases pour les échanger, ou glissez-déposez.'
        : 'Touchez une candidate pour la placer dans la prochaine case libre, ou touchez d’abord une case. Glissez-déposez pour réorganiser (appui long sur mobile).';
      hint.classList.remove('active');
    }
  }

  function renderPool() {
    const p = $('#pool');
    if (!p) return;
    p.innerHTML = state.cands.map(c => {
      const s = slotOf(c.id);
      return `<div class="pcard ${s >= 0 ? 'is-picked' : ''}" data-drag data-cid="${c.id}">
          <button class="pcard-main" data-action="pool" data-cid="${c.id}" aria-label="${esc(c.region)}, ${esc(c.name)}${s >= 0 ? ' (' + SLOT_LABELS[s] + ', toucher pour retirer)' : ''}">
            ${avatar(c, 's')}
            <span class="pcard-txt"><span class="pcard-region">${esc(c.region)}</span><span class="pcard-name">${esc(c.name)}</span></span>
            ${s >= 0 ? `<span class="badge ${s === 0 ? 'gold' : ''}">${SHORT[s]}</span>` : ''}
          </button>
          <button class="pcard-info" data-action="info" data-cid="${c.id}" data-nodrag aria-label="Fiche de ${esc(c.name)}">${ICON.info}</button>
        </div>`;
    }).join('');
  }

  function renderShare() {
    const el = $('#share');
    if (!el) return;
    const missing = [];
    if (!isComplete()) missing.push(`${12 - pickCount()} case${12 - pickCount() > 1 ? 's' : ''} à remplir`);
    if (!state.name.trim()) missing.push('votre pseudo');
    if (missing.length) {
      el.innerHTML = `<div class="share-box locked">${ICON.share}<div><b>Lien de partage</b><p>Il manque : ${missing.join(' et ')}.</p></div></div>`;
      return;
    }
    const link = pickLink();
    el.innerHTML = `<div class="share-box">
        <div class="share-top">${ICON.share}<div><b>Votre lien de pronostic</b><p>Envoyez-le à vos amis : il contient tout votre Top 12. Si vous changez d’avis, renvoyez le nouveau lien.</p></div></div>
        <input class="link-field" readonly value="${esc(link)}" aria-label="Lien de partage" onclick="this.select()">
        <div class="row-actions">
          <button class="btn gold" data-action="copy-link">${ICON.copy}Copier le lien</button>
          ${navigator.share ? `<button class="btn" data-action="share-link">${ICON.share}Partager</button>` : ''}
        </div>
      </div>`;
  }

  /* ---------- Rendu : Candidates ---------- */
  function buildCandsTab() {
    $('#tab-cands').innerHTML = `
      <div class="toolbar">
        <label class="search">${ICON.search}<input id="q" type="search" placeholder="Région, nom, ville…" aria-label="Rechercher"></label>
        <label class="select"><span class="sr">Trier</span>
          <select id="sort">
            <option value="region">Région A→Z</option>
            <option value="titles">Palmarès de la région</option>
            <option value="last">Dernière victoire</option>
            <option value="age">Âge</option>
            <option value="height">Taille</option>
            <option value="name">Prénom</option>
          </select>
        </label>
      </div>
      <div id="candList" class="clist"></div>`;
    $('#q').addEventListener('input', e => { state.query = e.target.value; renderCandList(); });
    $('#sort').value = state.sort;
    $('#sort').addEventListener('change', e => { state.sort = e.target.value; renderCandList(); });
  }

  function renderCandList() {
    const el = $('#candList');
    if (!el) return;
    const q = norm(state.query);
    const sorters = {
      region: (a, b) => a.region.localeCompare(b.region, 'fr'),
      titles: (a, b) => b.past_titles - a.past_titles || (b.last_title_year || 0) - (a.last_title_year || 0),
      last: (a, b) => (b.last_title_year || 0) - (a.last_title_year || 0),
      age: (a, b) => a.age - b.age,
      height: (a, b) => b.height_m - a.height_m,
      name: (a, b) => a.name.localeCompare(b.name, 'fr')
    };
    const list = state.cands
      .filter(c => !q || norm([c.region, c.region_en, c.name, c.hometown].join(' ')).includes(q))
      .sort(sorters[state.sort]);
    if (!list.length) { el.innerHTML = '<p class="empty-msg">Aucune candidate ne correspond.</p>'; return; }
    el.innerHTML = list.map(c => {
      const s = slotOf(c.id);
      return `<button class="ccard" data-action="info" data-cid="${c.id}">
          ${avatar(c, 'm')}
          <span class="ccard-body">
            <span class="ccard-top"><span class="ccard-region">${esc(c.region)}</span>${s >= 0 ? `<span class="badge ${s === 0 ? 'gold' : ''}">${SHORT[s]}</span>` : ''}</span>
            <span class="ccard-name">${esc(c.name)}</span>
            <span class="ccard-meta">${c.age} ans · ${heightTxt(c.height_m)} · ${esc(c.hometown)}</span>
            <span class="ccard-titles">${c.past_titles ? `${ICON.crown}${c.past_titles} titre${c.past_titles > 1 ? 's' : ''} · dernier en ${c.last_title_year}` : '<i>Jamais titrée</i>'}</span>
          </span>
        </button>`;
    }).join('');
  }

  /* ---------- Fiche candidate ---------- */
  function openFiche(id) {
    const c = cand(id);
    if (!c) return;
    const titles = titlesFor(c);
    const repl = titles.filter(t => t.repl).length;
    const last = titles.find(t => !t.repl);
    const recent = recentFor(c);
    const s = slotOf(id);
    const sheet = $('#sheet');
    sheet.innerHTML = `
      <div class="sheet-inner">
        <button class="sheet-close" data-action="close-sheet" aria-label="Fermer">${ICON.x}</button>
        <div class="fiche-head">
          ${avatar(c, 'xl')}
          <div>
            <p class="eyebrow">Miss ${esc(c.region)}</p>
            <h2 id="sheet-title">${esc(c.name)}</h2>
            ${c.instagram ? `<a class="insta" href="https://instagram.com/${esc(String(c.instagram).replace(/^@/, ''))}" target="_blank" rel="noopener">@${esc(String(c.instagram).replace(/^@/, ''))}</a>` : ''}
          </div>
        </div>
        <div class="stats">
          <div><span>Âge</span><b>${c.age} ans</b></div>
          <div><span>Taille</span><b>${heightTxt(c.height_m)}</b></div>
          <div><span>Ville</span><b>${esc(c.hometown)}</b></div>
        </div>
        <h3>Palmarès de la région</h3>
        ${c.past_titles ? `
          <p class="big-line"><b>${c.past_titles}</b> titre${c.past_titles > 1 ? 's' : ''} de Miss France${repl ? ` <small>(dont ${repl} par remplacement)</small>` : ''}</p>
          <p class="muted">Dernière victoire : <b>${c.last_title_year}</b>${last && last.year === c.last_title_year ? ` · ${esc(last.name)}` : ''}</p>
          <ul class="titles">${titles.map(t => `<li${t.repl ? ' class="repl"' : ''}><b>${t.year}</b> ${esc(t.name)}${t.repl ? ' <small>remplaçante</small>' : ''}${regionKeys(c).length > 1 && t.region !== c.region_en ? ` <small>(${esc(fr(t.region))})</small>` : ''}</li>`).join('')}</ul>`
        : `<p class="muted">Aucune Miss France dans l’histoire pour cette région. Une première ?</p>`}
        <h3>5 dernières éditions</h3>
        <div class="recent">${recent.map(r => `<div class="rec tier-${r.tier}"><span>${r.year}</span><b>${r.label || '—'}</b></div>`).join('')}</div>
        <div class="sheet-actions">
          ${s >= 0
            ? `<button class="btn" data-action="sheet-unpick" data-cid="${id}">${ICON.x}Retirer (${SLOT_LABELS[s]})</button>`
            : `<button class="btn gold" data-action="sheet-pick" data-cid="${id}">${ICON.plus}Ajouter à mon Top 12</button>`}
        </div>
      </div>`;
    showSheet();
  }

  function showSheet() {
    const sheet = $('#sheet');
    if (!sheet.open) { if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', ''); }
    sheet.scrollTop = 0;
  }
  function closeSheet() { const s = $('#sheet'); if (s.close) s.close(); else s.removeAttribute('open'); }

  function picksListHTML(ids, scored) {
    return `<ol class="plist">${ids.map((id, i) => {
      const c = cand(id);
      const r = scored && scored.rows[i];
      return `<li class="${r ? 'k-' + r.kind : ''}">
          <span class="plist-rank">${SHORT[i]}</span>
          ${avatar(c, 's')}
          <span class="plist-txt"><b>${esc(c.region)}</b><small>${esc(c.name)}</small></span>
          ${r ? `<span class="plist-pts" title="${esc(r.label)}"><span>${r.pts ? '+' + r.pts : '0'}${r.pending ? '<i>?</i>' : ''}</span><small>${esc(r.label)}</small></span>` : ''}
        </li>`;
    }).join('')}</ol>`;
  }

  /* ---------- Rendu : Classement ---------- */
  function buildRankTab() {
    $('#tab-rank').innerHTML = `
      <div id="resStatus"></div>
      <div class="board-head"><h2>Classement</h2><span class="progress">sur ${MAX_SCORE} pts</span></div>
      <div id="leaderboard" class="lb"></div>
      <div class="card-block">
        <h3>Ajouter des amis</h3>
        <p class="muted">Collez ici les liens reçus (un ou plusieurs, même au milieu d’un message).</p>
        <textarea id="linksInput" rows="3" placeholder="https://…#p=…&amp;n=Léa"></textarea>
        <div class="row-actions"><button class="btn gold" data-action="add-links">${ICON.plus}Ajouter au classement</button></div>
      </div>
      <details class="card-block rules">
        <summary>Barème</summary>
        <ul>
          <li><b>${SCORING.miss} pts</b> : la bonne Miss France</li>
          <li><b>${SCORING.dauphine} pts</b> par dauphine au bon rang</li>
          <li><b>${SCORING.top12} pts</b> par candidate bien placée dans le Top 12 (choisie en 6e-12e et qualifiée sans entrer dans le Top 5)</li>
          <li><b>${SCORING.wrongRank} pt</b> par candidate qualifiée dans le Top 12 mais pas au bon rang</li>
        </ul>
        <p class="muted">Maximum ${MAX_SCORE} pts. Égalité départagée par le nombre de pronostics exacts. Pendant la soirée, les scores marqués « ? » sont provisoires.</p>
      </details>
      <details id="resEditor" class="card-block">
        <summary>Saisir les résultats (organisateur)</summary>
        <div id="resForm"></div>
      </details>`;
    $('#resEditor').addEventListener('toggle', e => { if (e.target.open) renderResForm(); });
  }

  function renderResStatus() {
    const el = $('#resStatus');
    if (!el) return;
    const R = results();
    const st = resultsStatus(R);
    const src = state.localResults ? 'saisie locale' : 'results.json';
    let html;
    if (st === 'none') {
      html = `<div class="status wait">${ICON.trophy}<div><b>Résultats pas encore connus</b><p>Rendez-vous samedi 12 décembre sur TF1. Le classement se mettra à jour dès que les résultats seront saisis.</p></div></div>`;
    } else {
      const miss = R.order[0] && cand(R.order[0]);
      html = `<div class="status ${st}">${ICON.trophy}<div>
          <b>${st === 'final' ? 'Résultats définitifs' : 'Résultats en cours'}</b>
          <p>${miss ? `Miss France 2027 : <b>${esc(miss.region)}</b>, ${esc(miss.name)}` : `Top 12 : ${R.top12.size}/12 connues · Top 5 : ${R.order.filter(Boolean).length}/5`}</p>
          <p class="muted small">Source : ${src}${R.unresolved.length ? ` · non reconnu : ${R.unresolved.map(esc).join(', ')}` : ''}</p>
        </div></div>`;
    }
    el.innerHTML = html;
  }

  const openDetails = new Set();
  function renderRanking() {
    renderResStatus();
    const el = $('#leaderboard');
    if (!el) return;
    const R = results();
    const entries = allEntries().map(e => ({ ...e, s: scorePicks(e.ids, R) }));
    if (!entries.length) {
      el.innerHTML = `<p class="empty-msg">Personne pour l’instant. Complétez votre pronostic (avec pseudo) et collez les liens de vos amis ci-dessous.</p>`;
      return;
    }
    const started = resultsStatus(R) !== 'none';
    entries.sort((a, b) => started ? (b.s.total - a.s.total || b.s.exact - a.s.exact || a.name.localeCompare(b.name, 'fr')) : (b.me - a.me || a.name.localeCompare(b.name, 'fr')));
    let rank = 0, prev = null;
    el.innerHTML = entries.map((e, i) => {
      if (started) { const k = `${e.s.total}|${e.s.exact}`; if (k !== prev) rank = i + 1; prev = k; }
      const miss = cand(e.ids[0]);
      const id = `${e.name}|${e.code}`;
      return `<details class="lb-row ${e.me ? 'me' : ''}" data-key="${esc(id)}" ${openDetails.has(id) ? 'open' : ''}>
          <summary>
            <span class="lb-rank ${started && rank <= 3 ? 'r' + rank : ''}">${started ? rank : '•'}</span>
            <span class="lb-name"><b>${esc(e.name)}${e.me ? ' <small>(moi)</small>' : ''}</b><small>${ICON.crown}${esc(miss.region)}</small></span>
            <span class="lb-score">${started ? `${e.s.total}${e.s.pending ? '<i>?</i>' : ''}<small>pts</small>` : ''}</span>
          </summary>
          ${picksListHTML(e.ids, started ? e.s : null)}
          ${e.me ? '' : `<div class="row-actions"><button class="btn ghost small" data-action="remove-player" data-name="${esc(e.name)}">${ICON.trash}Retirer ${esc(e.name)}</button></div>`}
        </details>`;
    }).join('');
    el.querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => {
      d.open ? openDetails.add(d.dataset.key) : openDetails.delete(d.dataset.key);
    }));
  }

  function renderResForm() {
    const el = $('#resForm');
    if (!el) return;
    const R = results();
    const opts = sel => `<option value="">— pas encore connue —</option>` + [...state.cands]
      .sort((a, b) => a.region.localeCompare(b.region, 'fr'))
      .map(c => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${esc(c.region)} · ${esc(c.name)}</option>`).join('');
    el.innerHTML = `
      <p class="muted">Pour suivre la soirée en direct : cochez le Top 12 dès son annonce, puis complétez les dauphines et la Miss. La saisie reste sur cet appareil ; partagez ensuite le lien des résultats, ou remplissez <code>results.json</code> dans le dépôt pour tout le monde.</p>
      <div class="res-grid">
        ${RANKS.map((r, i) => `<label class="field"><span class="field-label">${i === 0 ? ICON.crown : ''}${r}</span><select data-rank="${i}">${opts(R.order[i])}</select></label>`).join('')}
      </div>
      <p class="field-label">Top 12 (ordre libre, le Top 5 est coché automatiquement)</p>
      <div class="chips">${state.cands.map(c => `<label class="chip"><input type="checkbox" value="${c.id}" ${R.top12.has(c.id) ? 'checked' : ''}><span>${esc(c.region)}</span></label>`).join('')}</div>
      <p class="muted small" id="resCount"></p>
      <div class="row-actions">
        <button class="btn gold" data-action="save-results">Enregistrer</button>
        ${state.localResults ? `<button class="btn" data-action="copy-results">${ICON.copy}Lien des résultats</button><button class="btn ghost" data-action="reset-results">Revenir à results.json</button>` : ''}
      </div>`;
    const count = () => { $('#resCount').textContent = `${el.querySelectorAll('.chips input:checked').length}/12 cochées`; };
    el.querySelectorAll('select').forEach(s => s.addEventListener('change', () => {
      const id = +s.value;
      if (id) { const cb = el.querySelector(`.chips input[value="${id}"]`); if (cb) cb.checked = true; }
      count();
    }));
    el.querySelectorAll('.chips input').forEach(cb => cb.addEventListener('change', count));
    count();
  }

  function saveResultsForm() {
    const el = $('#resForm');
    const order = [...el.querySelectorAll('select[data-rank]')].map(s => +s.value || null);
    const set = order.filter(Boolean);
    if (new Set(set).size !== set.length) { toast('Une même candidate est à deux rangs'); return; }
    const top12 = new Set([...el.querySelectorAll('.chips input:checked')].map(i => +i.value));
    set.forEach(id => top12.add(id));
    if (top12.size > 12) { toast(`${top12.size} candidates cochées : 12 maximum`); return; }
    state.localResults = { miss_france: order[0], dauphines: order.slice(1), top12: [...top12] };
    save(LS.results, state.localResults);
    renderRanking(); renderResForm();
    toast('Résultats enregistrés');
  }

  function renderAll() { renderBoard(); renderPool(); renderShare(); renderCandList(); renderRanking(); }

  /* ---------- Onglets ---------- */
  function setTab(tab) {
    state.tab = tab;
    save(LS.tab, tab);
    document.querySelectorAll('.tabs [role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    ['pick', 'cands', 'rank'].forEach(t => { $('#tab-' + t).hidden = t !== tab; });
  }

  /* ---------- Liens entrants ---------- */
  function handleHash() {
    const h = location.hash.slice(1);
    if (!h) return;
    const sp = new URLSearchParams(h);
    history.replaceState(null, '', baseUrl());
    if (sp.get('p')) {
      const code = sp.get('p').toLowerCase();
      const name = (sp.get('n') || '').trim();
      if (!validPickCode(code)) { toast('Lien de pronostic invalide'); return; }
      if (code === encIds(state.picks) && norm(name) === norm(state.name)) { toast('C’est votre propre pronostic'); return; }
      const ids = decIds(code);
      $('#sheet').innerHTML = `<div class="sheet-inner">
          <button class="sheet-close" data-action="close-sheet" aria-label="Fermer">${ICON.x}</button>
          <p class="eyebrow">Pronostic reçu</p>
          <h2 id="sheet-title">${esc(name || 'Anonyme')}</h2>
          ${picksListHTML(ids)}
          <div class="sheet-actions">
            <button class="btn gold" data-action="import-player" data-code="${code}" data-name="${esc(name)}">${ICON.plus}Ajouter au classement</button>
            ${pickCount() === 0 ? `<button class="btn ghost" data-action="start-own">Faire mon pronostic</button>` : ''}
          </div>
        </div>`;
      showSheet();
    } else if (sp.get('r')) {
      const raw = decodeResults(sp.get('r'));
      if (!raw) { toast('Lien de résultats invalide'); return; }
      const R = normResults(raw);
      const miss = R.order[0] && cand(R.order[0]);
      $('#sheet').innerHTML = `<div class="sheet-inner">
          <button class="sheet-close" data-action="close-sheet" aria-label="Fermer">${ICON.x}</button>
          <p class="eyebrow">Résultats reçus</p>
          <h2 id="sheet-title">${miss ? esc(miss.region) + ' couronnée' : `Top 12 : ${R.top12.size}/12`}</h2>
          <p class="muted">Utiliser ces résultats pour calculer le classement sur cet appareil ?</p>
          <div class="sheet-actions"><button class="btn gold" data-action="use-results" data-code="${esc(sp.get('r'))}">Utiliser ces résultats</button></div>
        </div>`;
      showSheet();
    }
  }

  /* ---------- Clics ---------- */
  let suppressClick = false;
  function onClick(e) {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; return; }
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const cid = +t.dataset.cid;
    switch (t.dataset.action) {
      case 'tab': setTab(t.dataset.tab); break;
      case 'pool': slotOf(cid) >= 0 ? removePick(slotOf(cid)) : addPick(cid); break;
      case 'info': openFiche(cid); break;
      case 'slot': tapSlot(+t.dataset.slot); break;
      case 'unpick': removePick(+t.dataset.slot); break;
      case 'random': randomFill(); break;
      case 'clear':
        if (pickCount() && confirm('Effacer tout votre pronostic ?')) { state.picks = Array(12).fill(null); state.selected = null; commitPicks(); }
        break;
      case 'copy-link': copyText(pickLink()); break;
      case 'share-link':
        navigator.share({ title: 'Mon pronostic Miss France 2027', text: `Mon Top 12 Miss France 2027 (${state.name.trim()}) :`, url: pickLink() }).catch(() => {});
        break;
      case 'close-sheet': closeSheet(); break;
      case 'sheet-pick': addPick(cid); openFiche(cid); break;
      case 'sheet-unpick': removePick(slotOf(cid)); openFiche(cid); break;
      case 'import-player': {
        const r = addPlayer(t.dataset.name, t.dataset.code);
        if (r === 'same') toast('Déjà dans le classement');
        closeSheet(); renderRanking(); setTab('rank');
        break;
      }
      case 'start-own': closeSheet(); setTab('pick'); break;
      case 'add-links': {
        const input = $('#linksInput');
        const links = parseLinks(input.value);
        if (!links.length) { toast('Aucun lien de pronostic trouvé'); break; }
        const res = links.map(l => addPlayer(l.name, l.code, true));
        const added = res.filter(r => r === 'added').length, upd = res.filter(r => r === 'updated').length, bad = res.filter(r => r === 'invalid').length;
        toast([added && `${added} ajouté${added > 1 ? 's' : ''}`, upd && `${upd} mis à jour`, bad && `${bad} invalide${bad > 1 ? 's' : ''}`].filter(Boolean).join(' · ') || 'Déjà dans le classement');
        input.value = '';
        renderRanking();
        break;
      }
      case 'remove-player':
        if (confirm(`Retirer ${t.dataset.name} du classement ?`)) {
          state.players = state.players.filter(p => p.name !== t.dataset.name);
          save(LS.players, state.players);
          renderRanking();
        }
        break;
      case 'save-results': saveResultsForm(); break;
      case 'reset-results':
        state.localResults = null; save(LS.results, null); renderRanking(); renderResForm(); toast('Résultats de results.json');
        break;
      case 'copy-results': copyText(`${baseUrl()}#r=${resultsCode(results())}`, 'Lien des résultats copié'); break;
      case 'use-results':
        state.localResults = decodeResults(t.dataset.code); save(LS.results, state.localResults);
        closeSheet(); renderRanking(); setTab('rank'); toast('Résultats mis à jour');
        break;
    }
  }

  /* ---------- Glisser-déposer (souris et tactile) ---------- */
  let drag = null;
  const ghost = () => $('#ghost');

  function dropTargetAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el && el.closest('[data-drop]');
  }
  function clearOver() { document.querySelectorAll('.drop-over').forEach(n => n.classList.remove('drop-over')); }

  function startDrag() {
    if (!drag || drag.active) return;
    drag.active = true;
    const c = cand(drag.id);
    const g = ghost();
    g.innerHTML = `${avatar(c, 's')}<span><b>${esc(c.region)}</b><small>${esc(c.name)}</small></span>`;
    g.classList.add('show');
    moveGhost(drag.x, drag.y);
    drag.src.classList.add('dragging');
    document.body.classList.add('is-dragging');
    if (navigator.vibrate) try { navigator.vibrate(12); } catch { /* ignore */ }
  }
  function moveGhost(x, y) { ghost().style.transform = `translate(${x - 70}px, ${y - 28}px)`; }

  function endDrag(commit) {
    if (!drag) return;
    clearTimeout(drag.timer);
    if (drag.active) {
      ghost().classList.remove('show');
      drag.src.classList.remove('dragging');
      document.body.classList.remove('is-dragging');
      clearOver();
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      if (commit) {
        const target = dropTargetAt(drag.x, drag.y);
        const from = slotOf(drag.id);
        if (target && target.dataset.drop === 'slot') {
          const to = +target.dataset.slot;
          if (from >= 0 && from !== to) swapSlots(from, to);
          else if (from < 0) placeInSlot(drag.id, to);
        } else if (target && target.dataset.drop === 'pool' && from >= 0) {
          removePick(from);
        }
      }
    }
    drag = null;
  }

  function bindDrag() {
    document.addEventListener('pointerdown', e => {
      if (e.button > 0 || e.target.closest('[data-nodrag]')) return;
      const src = e.target.closest('#tab-pick [data-drag]');
      if (!src) return;
      drag = { src, id: +src.dataset.cid, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, type: e.pointerType, active: false, timer: null };
      if (e.pointerType !== 'mouse') drag.timer = setTimeout(startDrag, 300);
    });
    document.addEventListener('pointermove', e => {
      if (!drag) return;
      drag.x = e.clientX; drag.y = e.clientY;
      const dist = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
      if (!drag.active) {
        if (drag.type === 'mouse' && dist > 6) startDrag();
        else if (drag.type !== 'mouse' && dist > 10) { clearTimeout(drag.timer); drag = null; }
        return;
      }
      moveGhost(e.clientX, e.clientY);
      clearOver();
      const t = dropTargetAt(e.clientX, e.clientY);
      if (t) t.classList.add('drop-over');
      // défilement automatique près des bords
      const edge = 60;
      if (e.clientY < edge) window.scrollBy(0, -12);
      else if (e.clientY > innerHeight - edge) window.scrollBy(0, 12);
    });
    document.addEventListener('pointerup', () => endDrag(true));
    document.addEventListener('pointercancel', () => endDrag(false));
    document.addEventListener('touchmove', e => { if (drag && drag.active) e.preventDefault(); }, { passive: false });
    document.addEventListener('contextmenu', e => { if (e.target.closest('#tab-pick [data-drag]')) e.preventDefault(); });
  }

  /* ---------- Compte à rebours ---------- */
  function renderCountdown() {
    const el = $('#countdown');
    const ms = ELECTION - Date.now();
    const days = Math.ceil(ms / 864e5);
    if (ms > 864e5) el.textContent = `J-${days}`;
    else if (ms > 0) el.textContent = 'C’est ce soir, 21 h 10';
    else if (ms > -6 * 3600e3) el.textContent = 'En direct sur TF1';
    else el.textContent = 'L’élection a eu lieu';
  }

  /* ---------- Démarrage ---------- */
  async function refreshFileResults() {
    try {
      const r = await getJSON('results.json');
      if (JSON.stringify(r) !== JSON.stringify(state.fileResults)) { state.fileResults = r; renderRanking(); }
    } catch { /* pas de results.json */ }
  }

  async function init() {
    try {
      const [cands, winners, recent] = await Promise.all([
        getJSON('data/candidates_2027.json'),
        getJSON('data/winners_1920_2026.json'),
        getJSON('data/recent_placements_2022_2026.json')
      ]);
      state.cands = cands;
      cands.forEach(c => state.byId.set(c.id, c));
      state.winners = winners.winners || [];
      state.replacements = winners.replacements || [];
      state.recent = recent;
    } catch (err) {
      $('main').innerHTML = `<div class="status none"><div><b>Impossible de charger les données</b>
        <p>Ouvrez l’app depuis GitHub Pages ou un petit serveur local (<code>python3 -m http.server</code>) : un fichier ouvert directement ne peut pas lire les JSON.</p>
        <p class="muted small">${esc(err.message)}</p></div></div>`;
      return;
    }
    await refreshFileResults();
    state.localResults = load(LS.results, null);
    state.picks = sanitizePicks(load(LS.picks, []));
    state.name = load(LS.name, '');
    state.players = (load(LS.players, []) || []).filter(p => p && validPickCode(p.code));

    buildPickTab(); buildCandsTab(); buildRankTab();
    renderAll();
    setTab(['pick', 'cands', 'rank'].includes(load(LS.tab, 'pick')) ? load(LS.tab, 'pick') : 'pick');
    document.addEventListener('click', onClick, true);
    $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
    bindDrag();
    renderCountdown();
    setInterval(renderCountdown, 60e3);
    // Pendant la soirée, results.json est relu régulièrement
    setInterval(() => { if (document.visibilityState === 'visible') refreshFileResults(); }, 90e3);
    window.addEventListener('hashchange', handleHash);
    handleHash();
  }

  init();
})();
