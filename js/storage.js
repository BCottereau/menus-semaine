/* =====================================================================
   Sauvegarde locale (localStorage) + fusion entre appareils
   ---------------------------------------------------------------------
   Chaque élément (recette, article du garde-manger, dîner d'un jour,
   case cochée…) a une date de modification dans « stamps » ; les
   suppressions sont mémorisées dans « deleted ». Deux versions des
   données (Mac / téléphone / ajout par Claude) sont ainsi fusionnées
   élément par élément : la modification la plus récente gagne, sans
   rien écraser d'autre.
   ===================================================================== */

const SEED_VERSION = 2;              // incrémenter quand on ajoute des recettes de départ
const TOMBSTONE_DAYS = 365;          // durée de conservation des suppressions
const SHOPPING_KEEP_DAYS = 60;       // au-delà, les cases cochées des anciennes semaines sont oubliées

const blankWeekObj = () => ({ days: Array(7).fill(null), cooked: Array(7).fill(false), cookLog: {}, checked: {}, extras: [] });
const emptyState = () => ({ version: 3, seedVersion: SEED_VERSION, recipes: [], weeks: {}, pantry: [], stamps: {}, deleted: {} });

/*
 * Pour la fusion, l'état est découpé en petits éléments indépendants :
 *   r:<id>             une recette
 *   p:<id>             un article du garde-manger
 *   d:<semaine>:<jour> le dîner d'un jour (recette, « cuisiné », déductions)
 *   c:<semaine>:<clé>  une case cochée de la liste de courses
 *   x:<semaine>:<id>   un article ajouté à la main à la liste
 * stamps[id] = date de dernière modification ; deleted[id] = date de suppression.
 */
function flattenState(s) {
  const m = new Map();
  s.recipes.forEach(r => m.set("r:" + r.id, r));
  s.pantry.forEach(p => m.set("p:" + p.id, p));
  for (const [ws, w] of Object.entries(s.weeks)) {
    for (let i = 0; i < 7; i++) m.set(`d:${ws}:${i}`, { r: w.days[i] || null, c: !!w.cooked[i], l: w.cookLog[i] || null });
    for (const k of Object.keys(w.checked)) if (w.checked[k]) m.set(`c:${ws}:${k}`, true);
    w.extras.forEach(x => m.set(`x:${ws}:${x.id}`, x));
  }
  return m;
}
function unflattenState(m) {
  const s = emptyState();
  for (const [id, e] of m) {
    const t = id[0];
    if (t === "r") s.recipes.push(e);
    else if (t === "p") s.pantry.push(e);
    else {
      const ws = id.slice(2, 12), rest = id.slice(13);
      const w = (s.weeks[ws] ||= blankWeekObj());
      if (t === "d") { const i = +rest; w.days[i] = e.r; w.cooked[i] = !!e.c; if (e.l) w.cookLog[i] = e.l; }
      else if (t === "c") w.checked[rest] = true;
      else if (t === "x") w.extras.push(e);
    }
  }
  return s;
}
const snapshotOf = s => new Map([...flattenState(s)].map(([id, e]) => [id, JSON.stringify(e)]));

/** Remet une structure de données en forme (anciennes sauvegardes, imports, fichier distant). */
function normalizeState(s) {
  s = s && typeof s === "object" ? s : {};
  s.version = 3;
  s.recipes = Array.isArray(s.recipes) ? s.recipes.filter(r => r && r.id) : [];
  s.pantry = Array.isArray(s.pantry) ? s.pantry.filter(p => p && p.id) : [];
  s.weeks = s.weeks && typeof s.weeks === "object" ? s.weeks : {};
  s.stamps = s.stamps && typeof s.stamps === "object" ? s.stamps : {};
  s.deleted = s.deleted && typeof s.deleted === "object" && !s.deleted.recipes ? s.deleted : {};
  for (const k of Object.keys(s.weeks)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) { delete s.weeks[k]; continue; }
    const w = s.weeks[k];
    w.days = Array.isArray(w.days) ? w.days.slice(0, 7) : [];
    while (w.days.length < 7) w.days.push(null);
    w.cooked = Array.isArray(w.cooked) ? w.cooked.slice(0, 7) : [];
    while (w.cooked.length < 7) w.cooked.push(false);
    w.cookLog = w.cookLog || {};
    w.checked = w.checked || {};
    w.extras = Array.isArray(w.extras) ? w.extras.filter(x => x && x.id) : [];
  }
  s.recipes.forEach(r => {
    delete r.updatedAt;
    r.seasons = Array.isArray(r.seasons) && r.seasons.length ? r.seasons : ALL_SEASONS.slice();
    r.ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
    r.steps = Array.isArray(r.steps) ? r.steps : [];
  });
  return s;
}

/**
 * Fusionne deux états élément par élément : la modification la plus récente gagne,
 * une suppression plus récente qu'une modification l'emporte.
 * En cas d'égalité, la version « b » (distante) l'emporte.
 * Résultat trié : même contenu → même texte JSON.
 */
function mergeStates(a, b) {
  a = a || emptyState();
  b = b || emptyState();
  const fa = flattenState(a), fb = flattenState(b);
  const sa = a.stamps || {}, sb = b.stamps || {};
  const del = {};
  for (const src of [a, b]) {
    for (const [id, ts] of Object.entries(src.deleted || {})) del[id] = Math.max(del[id] || 0, +ts || 0);
  }
  const now = Date.now();
  const tombLimit = now - TOMBSTONE_DAYS * 864e5;
  const shopLimit = new Date(now - SHOPPING_KEEP_DAYS * 864e5).toISOString().slice(0, 10);
  const isOldShopping = id => (id[0] === "c" || id[0] === "x") && id.slice(2, 12) < shopLimit;

  const out = new Map(), stamps = {}, deleted = {};
  for (const id of [...new Set([...fa.keys(), ...fb.keys()])].sort()) {
    if (isOldShopping(id)) continue;
    const ta = fa.has(id) ? (sa[id] || 0) : -1;
    const tb = fb.has(id) ? (sb[id] || 0) : -1;
    const ts = Math.max(ta, tb);
    if (del[id] !== undefined && del[id] >= ts) continue;
    delete del[id];
    out.set(id, tb >= ta ? fb.get(id) : fa.get(id));
    if (ts > 0) stamps[id] = ts;
  }
  for (const id of Object.keys(del).sort()) {
    if (del[id] > tombLimit && !isOldShopping(id)) deleted[id] = del[id];
  }
  const s = unflattenState(out);
  s.seedVersion = Math.max(a.seedVersion || 1, b.seedVersion || 1);
  s.stamps = stamps;
  s.deleted = deleted;
  return s;
}
const canonical = s => JSON.stringify(mergeStates(s, null));

const Store = {
  KEY: "menus-semaine-v1",
  lastSnap: null,
  afterSave: null,

  /** Charge l'état ; crée un état neuf au premier lancement. */
  load() {
    let s = null;
    try {
      s = JSON.parse(localStorage.getItem(this.KEY));
    } catch (e) {
      s = null;
    }
    s = (!s || !Array.isArray(s.recipes)) ? this.fresh() : this.migrate(s);
    this.lastSnap = snapshotOf(s);
    return s;
  },

  fresh() {
    const s = emptyState();
    s.recipes = seedRecipes();
    return s;
  },

  /** Normalise et ajoute les nouvelles recettes de départ apparues dans une mise à jour. */
  migrate(s) {
    s = normalizeState(s);
    const from = s.seedVersion || 1;
    if (from < SEED_VERSION) {
      const have = new Set(s.recipes.map(r => r.id));
      seedRecipes(true).forEach(r => {
        if ((r.since || 1) > from && !have.has(r.id) && !s.deleted["r:" + r.id]) { delete r.since; s.recipes.push(r); }
      });
      s.seedVersion = SEED_VERSION;
    }
    return s;
  },

  /** Repère ce qui a changé depuis la dernière sauvegarde, et le date. */
  stamp(s) {
    const now = Date.now();
    const snap = snapshotOf(s);
    s.stamps = s.stamps || {};
    s.deleted = s.deleted || {};
    if (this.lastSnap) {
      for (const [id, json] of snap) {
        if (this.lastSnap.get(id) !== json) { s.stamps[id] = now; delete s.deleted[id]; }
      }
      for (const id of this.lastSnap.keys()) {
        if (!snap.has(id)) { s.deleted[id] = now; delete s.stamps[id]; }
      }
    }
    this.lastSnap = snap;
  },

  write(s) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(s));
      return true;
    } catch (e) {
      alert("Impossible d'enregistrer les données (stockage plein ou navigation privée ?).");
      return false;
    }
  },

  /** Sauvegarde après une action de l'utilisateur. */
  save(s) {
    this.stamp(s);
    const ok = this.write(s);
    if (this.afterSave) this.afterSave();
    return ok;
  },

  /** Sauvegarde d'un état reçu par synchronisation (sans re-dater). */
  saveSynced(s) {
    this.lastSnap = snapshotOf(s);
    return this.write(s);
  }
};

/** Convertit les recettes de départ au format interne. */
function seedRecipes(keepSince = false) {
  return SEED_RECIPES
    .filter(r => keepSince || (r.since || 1) <= SEED_VERSION)
    .map(r => {
      const o = {
        id: r.id,
        name: r.name,
        category: r.category,
        seasons: r.seasons.slice(),
        fish: !!r.fish,
        cookeo: !!r.cookeo,
        cookeoNote: r.cookeoNote || "",
        time: r.time || 30,
        ingredients: r.ing.map(([name, qty, unit, aisle]) => ({ name, qty, unit, aisle })),
        steps: r.steps.slice(),
        notes: r.notes || "",
        source: r.source || "",
        seed: true
      };
      if (keepSince) o.since = r.since || 1;
      return o;
    });
}
