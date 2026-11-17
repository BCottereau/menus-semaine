/* =====================================================================
   Menus de la semaine — logique de l'application
   ===================================================================== */
"use strict";

/* ----------------------------- Constantes ----------------------------- */
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const SEASON_LABELS = { printemps: "Printemps", ete: "Été", automne: "Automne", hiver: "Hiver" };
const UNITS = ["g", "kg", "ml", "cl", "l", "pièce", "gousse", "botte", "brin", "feuille", "cube", "boîte",
  "sachet", "tranche", "c. à s.", "c. à c.", "pincée", "poignée"];
const COUNTABLE = new Set(["pièce", "gousse", "botte", "brin", "feuille", "cube", "boîte", "sachet", "tranche", "pincée", "poignée"]);
const UNIT_ALIASES = {
  gr: "g", gramme: "g", grammes: "g", kilo: "kg", kilos: "kg", kgs: "kg",
  litre: "l", litres: "l", ml: "ml", cl: "cl",
  piece: "pièce", pieces: "pièce", pièces: "pièce", pc: "pièce", pcs: "pièce", x: "pièce",
  gousses: "gousse", bottes: "botte", cubes: "cube", boites: "boîte", boîtes: "boîte", boite: "boîte",
  sachets: "sachet", tranches: "tranche", pincées: "pincée", pincee: "pincée", poignées: "poignée",
  "cas": "c. à s.", "c.a.s": "c. à s.", "cs": "c. à s.", "cac": "c. à c.", "c.a.c": "c. à c.", "cc": "c. à c."
};
const PANTRY_QUICK = ["sel", "poivre", "huile d'olive", "huile de colza", "ail", "oignon",
  "farine T45", "riz complet", "spaghetti", "lentilles corail", "sauce soja", "curry",
  "cumin", "bouillon de légumes", "tomates concassées", "moutarde", "œufs", "beurre"];
const RECENT_WEEKS = 3; // en dessous : alerte « déjà fait récemment »

/* ------------------------------ Utilitaires ---------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));

/** Normalise un texte : minuscules, sans accents, espaces simplifiés. */
function norm(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[’`]/g, "'").replace(/œ/g, "oe").replace(/\s+/g, " ").trim();
}
/** Clé de comparaison des ingrédients (singulier approximatif). */
function matchKey(s) {
  return norm(s).split(" ").map(w => (w.length > 3 && /[sx]$/.test(w) && !/ss$/.test(w)) ? w.slice(0, -1) : w).join(" ");
}
/** « farine t45 » correspond à « farine », mais « lait de coco » ne correspond pas à « lait ». */
function namesMatch(a, b) {
  if (a === b) return true;
  const longer = a.length > b.length ? a : b;
  const shorter = longer === a ? b : a;
  if (!shorter || !longer.startsWith(shorter + " ")) return false;
  const rest = longer.slice(shorter.length + 1);
  return !/^(de|du|des|au|aux|a|en|la|le)( |$)/.test(rest) && !rest.startsWith("d'");
}

const isNum = v => v !== null && v !== "" && v !== undefined && !isNaN(v);
function toBase(q, u) {
  q = +q;
  switch (u) {
    case "kg": return { q: q * 1000, u: "g" };
    case "cl": return { q: q * 10, u: "ml" };
    case "l": return { q: q * 1000, u: "ml" };
    default: return { q, u: u || "" };
  }
}
function fmtNum(n) {
  const r = Math.round(n * 100) / 100;
  return String(r).replace(".", ",");
}
function fmtQty(q, u) {
  if (!isNum(q)) return "";
  let v = +q, unit = u || "";
  if (unit === "g" && v >= 1000) { v /= 1000; unit = "kg"; }
  else if (unit === "ml" && v >= 1000) { v /= 1000; unit = "l"; }
  if (COUNTABLE.has(unit) && v > 1) unit = unit === "pièce" ? "pièces" : unit + "s";
  return `${fmtNum(v)} ${unit}`.trim();
}
/** « 1kg », « 400 g », « 1,5 l », « 6 » → {qty, unit} ; chaîne vide → sans quantité. */
function parseQtyUnit(str, defaultUnit = "") {
  const s = String(str || "").trim().toLowerCase().replace(",", ".");
  if (!s) return { qty: null, unit: "" };
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!m) return null;
  let u = m[2].trim().replace(/\.$/, "");
  u = UNIT_ALIASES[u] ?? u;
  if (u && !UNITS.includes(u)) return null;
  return { qty: parseFloat(m[1]), unit: u || defaultUnit || "pièce" };
}

/* -------------------------------- Dates -------------------------------- */
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseIso = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const thisWeek = () => iso(mondayOf(new Date()));
/** Le dimanche, on prépare la semaine suivante. */
function defaultWeekStart() {
  const t = new Date();
  return iso(t.getDay() === 0 ? addDays(mondayOf(t), 7) : mondayOf(t));
}
const weeksBetween = (a, b) => Math.round((parseIso(b) - parseIso(a)) / (7 * 864e5));
const frDate = (d, opts) => d.toLocaleDateString("fr-FR", opts);
function seasonOf(d = new Date()) {
  const m = d.getMonth();
  if (m === 11 || m <= 1) return "hiver";
  if (m <= 4) return "printemps";
  if (m <= 7) return "ete";
  return "automne";
}
/* Saison choisie manuellement (préférence de cet appareil) ou automatique. */
const PREFS_KEY = "menus-prefs-v1";
const prefs = (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) { return {}; } })();
const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } };
const activeSeason = (d = new Date()) => prefs.season || seasonOf(d);
function weekLabel(ws) {
  const diff = weeksBetween(thisWeek(), ws);
  if (diff === 0) return "Cette semaine";
  if (diff === 1) return "Semaine prochaine";
  if (diff === -1) return "Semaine dernière";
  return diff < 0 ? `Il y a ${-diff} semaines` : `Dans ${diff} semaines`;
}

/* -------------------------------- État --------------------------------- */
let state = Store.load();
const save = () => Store.save(state);

const ui = {
  tab: "week",
  weekStart: defaultWeekStart(),
  pickerDay: null,
  filters: {
    recipes: { q: "", season: "", cat: "", meat: "", cookeo: false, quick: false, ings: [] },
    picker: { q: "", season: "current", cat: "", meat: "", cookeo: false, quick: false, ings: [] }
  },
  ideas: { ignoreBasics: true, maxMissing: 3, seasonOnly: false },
  showCovered: false,
  pantryQ: ""
};

const getRecipe = id => state.recipes.find(r => r.id === id);
/** Catégories de départ + celles créées dans les recettes ajoutées. */
function allCategories() {
  const set = new Set(CATEGORIES);
  state.recipes.forEach(r => r.category && set.add(r.category));
  return [...set];
}
const isDinner = r => !NON_DINNER.includes(r.category);
const blankWeek = () => ({ days: Array(7).fill(null), cooked: Array(7).fill(false), cookLog: {}, checked: {}, extras: [], sides: [] });
/** La semaine contient-elle cette recette (dîner ou dessert/goûter/base) ? */
const weekHas = (w, rid) => w.days.includes(rid) || (w.sides || []).some(x => x.r === rid);
const yieldText = r => r.yield || "3 portions";
const getWeek = ws => state.weeks[ws] || blankWeek();
const ensureWeek = ws => (state.weeks[ws] ||= blankWeek());

/* -------------------------- Historique des recettes --------------------- */
function lastMadeBefore(rid, ws) {
  let best = null;
  for (const [k, w] of Object.entries(state.weeks)) {
    if (k < ws && weekHas(w, rid) && (!best || k > best)) best = k;
  }
  return best;
}
function lastMadeInfo(rid, ws) {
  if (weekHas(getWeek(ws), rid)) return { txt: "déjà au planning de cette semaine", warn: true, age: 0 };
  const l = lastMadeBefore(rid, ws);
  if (!l) return { txt: "pas encore cuisiné", warn: false, age: 999 };
  const n = weeksBetween(l, ws);
  return { txt: n === 1 ? "cuisiné la semaine dernière" : `cuisiné il y a ${n} semaines`, warn: n <= RECENT_WEEKS, age: n };
}

/* ------------------------ Rayon deviné automatiquement --------------------- */
/* Ordre important : les expressions précises (« lait de coco ») avant les générales (« lait »). */
const AISLE_RULES = [
  ["sur", /\b(surgel|congel|glace|glaces|frites|sorbet|bâtonnets? de poisson)/],
  ["hyg", /\b(savon|shampo|dentifrice|brosse a dent|papier toilette|essuie|mouchoir|lessive|adoucissant|liquide vaisselle|vaisselle|eponge|sac(s)? poubelle|deodorant|gel douche|coton|rasoir|javel|nettoyant|menager|serviette|protege|couche|lingette|pile|ampoule|aluminium|film etirable|papier cuisson|sac congelation)/],
  ["boi", /\b(eau|jus|soda|biere|vin|cidre|champagne|coca|limonade|kombucha|sirop de (menthe|grenadine)|tisane|infusion)\b/],
  ["epi", /\b(lait de coco|lait d'amande|lait d'avoine|lait de soja|lait de riz|lait de noisette|lait vegetal|creme de coco|pate a tartiner|pate de curry|pate miso|beurre de cacahuete|puree d'amande|sauce tomate|coulis|tomates? concassee|concentre de tomate|tomates? sechee|pois chiches en boite)/],
  ["spi", /\b(sel|poivre|epice|curry|cumin|paprika|cannelle|muscade|curcuma|herbes de provence|ras el hanout|piment|moutarde|sauce soja|ketchup|mayonnaise|vanille|safran|origan|laurier|gingembre en poudre|nuoc)/],
  ["cre", /\b(lait|yaourt|yogourt|fromage|beurre|creme|skyr|mozzarella|comte|emmental|parmesan|feta|chevre|ricotta|mascarpone|camembert|brie|raclette|reblochon|faisselle|petit suisse|kefir)/],
  ["pro", /\b(oeuf|tofu|tempeh|seitan|lentille|pois chiche|pois casse|haricots? (rouge|blanc|noir)|flageolet|edamame|poulet|dinde|boeuf|porc|veau|agneau|canard|jambon|lardon|bacon|saumon|thon|sardine|maquereau|cabillaud|colin|crevette|gambas|poisson|viande|steak|saucisse|chorizo|merguez|proteines? de soja|pst)/],
  ["fec", /\b(pain|baguette|brioche|pate|pates|riz|semoule|quinoa|boulgour|farine|flocon|cereale|muesli|nouille|spaghetti|tagliatelle|coquillette|penne|fusilli|lasagne|gnocchi|tortilla|wrap|biscotte|polenta|sarrasin|crozet|vermicelle|pomme de terre|patate)/],
  ["leg", /\b(pomme|poire|banane|orange|citron|clementine|mandarine|pamplemousse|kiwi|raisin|fraise|framboise|myrtille|cerise|peche|nectarine|abricot|prune|melon|pasteque|ananas|mangue|avocat|figue|grenade|fruit|tomate|salade|laitue|mache|roquette|mesclun|epinard|carotte|poireau|oignon|echalote|ail|courgette|aubergine|poivron|concombre|radis|chou|brocoli|celeri|fenouil|navet|betterave|potiron|potimarron|courge|butternut|champignon|haricot vert|petits? pois|asperge|artichaut|endive|persil|coriandre|basilic|menthe|ciboulette|aneth|thym|romarin|gingembre|legume|pousse|cebette|panais|topinambour|blette)/],
  ["epi", /\b(huile|vinaigre|sucre|conserve|chocolat|cacao|cafe|the|confiture|miel|biscuit|gateau|compote|noix|amande|noisette|pistache|cajou|cacahuete|graine|levure|bouillon|olive|sirop|maizena|fecule|gelatine|agar|raisins? sec|datte|pruneau|chips|apero|cornichon|capre|whey|proteine)/]
];
/** Rayon le plus probable d'un article : d'abord les recettes connues, puis des mots-clés. */
function guessAisle(name) {
  const k = matchKey(name);
  if (!k) return "div";
  const votes = {};
  for (const r of state.recipes) for (const i of r.ingredients) {
    if (matchKey(i.name) === k && AISLES[i.aisle]) votes[i.aisle] = (votes[i.aisle] || 0) + 1;
  }
  const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  if (best) return best[0];
  const n = norm(name);
  for (const [aisle, re] of AISLE_RULES) if (re.test(n)) return aisle;
  for (const r of state.recipes) for (const i of r.ingredients) {
    if (AISLES[i.aisle] && namesMatch(matchKey(i.name), k)) return i.aisle;
  }
  return "div";
}

/* -------------------------------- Placard -------------------------------- */
function findPantry(name, baseUnit) {
  const k = matchKey(name);
  const cands = state.pantry.filter(p => namesMatch(matchKey(p.name), k));
  if (!cands.length) return null;
  cands.sort((a, b) => (matchKey(b.name) === k) - (matchKey(a.name) === k));
  return cands.find(p => isNum(p.qty) && toBase(p.qty, p.unit).u === baseUnit)
    || cands.find(p => !isNum(p.qty))
    || cands[0];
}
function addToPantry(name, qty, unit, fuzzy = false, aisle = "") {
  name = String(name).trim();
  if (!name) return;
  aisle = AISLES[aisle] ? aisle : guessAisle(name);
  const b = isNum(qty) ? toBase(qty, unit) : { q: null, u: "" };
  const k = matchKey(name);
  const p = fuzzy
    ? findPantry(name, b.u)
    : state.pantry.find(x => matchKey(x.name) === k && (!isNum(x.qty) || b.q === null || toBase(x.qty, x.unit).u === b.u));
  if (!p) { state.pantry.push({ id: uid(), name, qty: b.q, unit: b.q === null ? "" : b.u, aisle, addedAt: iso(new Date()) }); return; }
  if (b.q === null) return;
  if (!isNum(p.qty)) { p.qty = b.q; p.unit = b.u; return; }
  const pb = toBase(p.qty, p.unit);
  if (pb.u === b.u) { p.qty = pb.q + b.q; p.unit = pb.u; }
  else state.pantry.push({ id: uid(), name, qty: b.q, unit: b.u, aisle, addedAt: iso(new Date()) });
}
/** Déduit les ingrédients d'une recette des quantités suivies au placard. */
function deductFromPantry(r) {
  const log = [], msgs = [];
  for (const ing of r.ingredients) {
    if (!isNum(ing.qty)) continue;
    const b = toBase(ing.qty, ing.unit);
    const p = findPantry(ing.name, b.u);
    if (!p || !isNum(p.qty)) continue;
    const pb = toBase(p.qty, p.unit);
    if (pb.u !== b.u) continue;
    const used = Math.min(b.q, pb.q);
    p.qty = Math.max(0, pb.q - b.q);
    p.unit = pb.u;
    if (used > 0) p.opened = true;
    log.push({ id: p.id, name: p.name, unit: pb.u, qty: used });
    msgs.push(`${p.name} : ${p.qty > 0 ? fmtQty(p.qty, p.unit) + " restant" : "épuisé"}`);
  }
  return { log, msgs };
}
function restoreToPantry(log) {
  for (const e of log || []) {
    const p = state.pantry.find(x => x.id === e.id);
    if (p && isNum(p.qty) && toBase(p.qty, p.unit).u === e.unit) p.qty = toBase(p.qty, p.unit).q + e.qty;
    else if (!p) state.pantry.push({ id: e.id, name: e.name, qty: e.qty, unit: e.unit });
  }
}

/* --------------------------- Liste de courses --------------------------- */
function computeShopping(ws) {
  const w = getWeek(ws);
  const map = new Map();
  let planned = 0;
  const todo = []; // un plat déjà cuisiné n'est plus à acheter
  w.days.forEach((rid, i) => { const r = rid && getRecipe(rid); if (r && !w.cooked[i]) todo.push(r); });
  (w.sides || []).forEach(x => { const r = getRecipe(x.r); if (r && !x.c) todo.push(r); });
  todo.forEach(r => {
    planned++;
    for (const ing of r.ingredients) {
      if (!ing.name) continue;
      const b = isNum(ing.qty) ? toBase(ing.qty, ing.unit) : { q: null, u: "" };
      const key = matchKey(ing.name) + "|" + b.u;
      let it = map.get(key);
      if (!it) { it = { key, name: ing.name, unit: b.u, qty: b.q, aisle: ing.aisle || "epi", recipes: [] }; map.set(key, it); }
      else if (b.q !== null) it.qty = (it.qty || 0) + b.q;
      if (!it.recipes.includes(r.name)) it.recipes.push(r.name);
    }
  });

  const toBuy = [], covered = [];
  for (const it of map.values()) {
    const p = findPantry(it.name, it.unit);
    if (!p) { toBuy.push(it); continue; }
    if (!isNum(p.qty)) { covered.push({ ...it, note: "au placard" }); continue; }
    const pb = toBase(p.qty, p.unit);
    if (it.qty === null) {
      (pb.q > 0 ? covered : toBuy).push({ ...it, note: pb.q > 0 ? `stock : ${fmtQty(pb.q, pb.u)}` : `${p.name} épuisé` });
    } else if (pb.u === it.unit) {
      const rest = it.qty - pb.q;
      if (rest <= 0) covered.push({ ...it, note: `stock : ${fmtQty(pb.q, pb.u)}` });
      else toBuy.push({ ...it, qty: rest, note: pb.q > 0 ? `besoin ${fmtQty(it.qty, it.unit)} − stock ${fmtQty(pb.q, pb.u)}` : `${p.name} épuisé` });
    } else {
      toBuy.push({ ...it, note: `au placard : ${fmtQty(p.qty, p.unit)}, à vérifier` });
    }
  }
  for (const x of w.extras) {
    toBuy.push({ key: "x:" + x.id, id: x.id, name: x.name, qtyText: x.qty || "", aisle: x.aisle || "div", extra: true, recipes: [] });
  }
  return { toBuy, covered, planned };
}
const itemQty = it => it.extra ? it.qtyText : fmtQty(it.qty, it.unit);

function groupByAisle(items) {
  const groups = {};
  for (const a of Object.keys(AISLES)) groups[a] = [];
  for (const it of items) (groups[it.aisle] || groups.div).push(it);
  for (const a in groups) groups[a].sort((x, y) => x.name.localeCompare(y.name, "fr"));
  return groups;
}

function shoppingText(ws) {
  const w = getWeek(ws);
  const { toBuy } = computeShopping(ws);
  const remaining = toBuy.filter(it => !w.checked[it.key]);
  const groups = groupByAisle(remaining);
  const lines = [`Courses — semaine du ${frDate(parseIso(ws), { day: "numeric", month: "long" })}`, ""];
  const menu = w.days.map((id, i) => id && getRecipe(id) ? `${DAYS[i].slice(0, 3)}. ${getRecipe(id).name}` : null).filter(Boolean)
    .concat((w.sides || []).filter(x => getRecipe(x.r)).map(x => `+ ${getRecipe(x.r).name}`));
  if (menu.length) { lines.push("Menus :", ...menu.map(m => "  " + m), ""); }
  for (const [a, items] of Object.entries(groups)) {
    if (!items.length) continue;
    lines.push(AISLES[a].toUpperCase());
    items.forEach(it => { const q = itemQty(it); lines.push(`☐ ${it.name}${q ? " — " + q : ""}`); });
    lines.push("");
  }
  if (!remaining.length) lines.push("(Rien à acheter)");
  return lines.join("\n").trim();
}

/* ------------------------------- Filtres -------------------------------- */
function matchesFilters(r, f, seasonCtx) {
  if (f.q) {
    const q = norm(f.q);
    if (!norm(r.name).includes(q) && !r.ingredients.some(i => norm(i.name).includes(q))) return false;
  }
  const s = f.season === "current" ? seasonCtx : f.season;
  if (s && !r.seasons.includes(s)) return false;
  if (f.cat && r.category !== f.cat) return false;
  if (f.meat === "non" && r.meat) return false;
  if (f.meat === "oui" && !r.meat) return false;
  if (f.cookeo && !r.cookeo) return false;
  if (f.quick && !(r.time && r.time <= 30)) return false;
  if (f.ings && f.ings.length) {
    const keys = f.ings.map(matchKey);
    if (!r.ingredients.some(i => keys.some(k => namesMatch(matchKey(i.name), k)))) return false;
  }
  return true;
}
const seasonCtxOf = scope => scope === "picker" ? activeSeason(parseIso(ui.weekStart)) : activeSeason();
/** Filtres actifs (hors recherche et raccourcis Cookeo / rapide), sous forme de chips retirables. */
function activeFilterChips(scope) {
  const f = ui.filters[scope], out = [];
  if (f.season) out.push(["season", f.season === "current" ? `De saison (${SEASON_LABELS[seasonCtxOf(scope)]})` : SEASON_LABELS[f.season]]);
  if (f.cat) out.push(["cat", f.cat]);
  if (f.meat) out.push(["meat", f.meat === "non" ? "Végé" : "Viande"]);
  if (f.ings && f.ings.length) out.push(["ings", `Avec : ${f.ings.slice(0, 2).join(", ")}${f.ings.length > 2 ? "…" : ""}`]);
  return out;
}
function filterCount(scope) {
  const f = ui.filters[scope];
  return activeFilterChips(scope).length + (f.cookeo ? 1 : 0) + (f.quick ? 1 : 0);
}
function chipRow(scope) {
  const f = ui.filters[scope], n = filterCount(scope);
  return `<button class="chip" data-action="filter-sheet" data-scope="${scope}" aria-haspopup="dialog">${icon("sliders", 16)} Filtres${n ? `<span class="count" aria-label="${n} actifs">${n}</span>` : ""}</button>
    ${activeFilterChips(scope).map(([k, label]) => `<button class="chip" aria-pressed="true" data-action="chip-clear" data-scope="${scope}" data-key="${k}" aria-label="Retirer le filtre ${esc(label)}">${esc(label)} ${icon("x", 14)}</button>`).join("")}
    <button class="chip" aria-pressed="${f.cookeo}" data-action="chip-toggle" data-scope="${scope}" data-key="cookeo">Cookeo${f.cookeo ? " " + icon("x", 14) : ""}</button>
    <button class="chip" aria-pressed="${f.quick}" data-action="chip-toggle" data-scope="${scope}" data-key="quick">${icon("clock", 16)} Moins de 30 min${f.quick ? " " + icon("x", 14) : ""}</button>`;
}
function filterControls(scope) {
  const f = ui.filters[scope];
  return `<div class="search"><label for="q-${scope}" class="sr-only">Rechercher une recette</label>${icon("search", 20)}
      <input type="search" id="q-${scope}" data-filter="q" data-scope="${scope}" placeholder="Nom ou ingrédient" value="${esc(f.q)}" autocomplete="off"></div>
    <div class="chips" id="chips-${scope}" role="toolbar" aria-label="Filtres">${chipRow(scope)}</div>`;
}
function refreshFilters(scope) {
  const c = $("#chips-" + scope);
  if (c) c.innerHTML = chipRow(scope);
  (scope === "picker" ? renderPickerList : renderRecipeList)();
  if (sheet.open && $("#filterSheet")) openFilterSheet(scope);
}
function openFilterSheet(scope) {
  const f = ui.filters[scope];
  const n = state.recipes.filter(r => (scope !== "picker" || isDinner(r) !== !!ui.pickerSide) && matchesFilters(r, f, seasonCtxOf(scope))).length;
  const seg = (key, opts) => `<div class="seg" role="radiogroup">${opts.map(([v, l]) =>
    `<button role="radio" aria-checked="${f[key] === v}" data-action="set-filter" data-scope="${scope}" data-key="${key}" data-value="${esc(v)}">${esc(l)}</button>`).join("")}</div>`;
  openSheet(`<div id="filterSheet">
    <div class="sheet-head"><h2>Filtres</h2><button class="btn small ghost" data-action="reset-filters" data-scope="${scope}">Réinitialiser</button></div>
    <h3 class="sheet-label">Saison</h3>
    ${seg("season", [["", "Toutes"], ["current", `De saison (${SEASON_LABELS[seasonCtxOf(scope)]})`], ...Object.entries(SEASON_LABELS)])}
    <h3 class="sheet-label">Catégorie</h3>
    <label class="sr-only" for="fs-cat">Catégorie</label>
    <select id="fs-cat" data-filter="cat" data-scope="${scope}"><option value="">Toutes les catégories</option>
      ${allCategories().map(c => `<option ${f.cat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
    <h3 class="sheet-label">Végé ou viande</h3>
    ${seg("meat", [["", "Tout"], ["non", "Végé (pour nous deux)"], ["oui", "Viande"]])}
    <h3 class="sheet-label">Préparation</h3>
    <div class="seg">
      <button aria-pressed="${f.cookeo}" data-action="chip-toggle" data-scope="${scope}" data-key="cookeo">Cookeo</button>
      <button aria-pressed="${f.quick}" data-action="chip-toggle" data-scope="${scope}" data-key="quick">Moins de 30 min</button>
    </div>
    <button class="btn primary full sheet-cta" data-action="close-sheet">Voir ${n} recette${n > 1 ? "s" : ""}</button>
  </div>`, "Filtres");
}

/** Étiquettes neutres (sans code couleur) : catégorie, saisons, Cookeo, viande. */
function badges(r) {
  const seasons = r.seasons.length === 4 ? "Toute l'année" : r.seasons.map(s => SEASON_LABELS[s]).join(", ");
  return `<span class="tag">${esc(r.category)}</span><span class="tag">${seasons}</span>`
    + (r.cookeo ? `<span class="tag">Cookeo</span>` : "")
    + (r.meat ? `<span class="tag">Viande</span>` : "");
}

/** Dernier jour (passé) où la recette était au planning, ou null. */
function lastCookedDate(rid) {
  const today = iso(new Date());
  let best = null;
  for (const [ws, w] of Object.entries(state.weeks)) {
    w.days.forEach((id, i) => {
      if (id !== rid) return;
      const d = iso(addDays(parseIso(ws), i));
      if (d <= today && (!best || d > best)) best = d;
    });
    if ((w.sides || []).some(x => x.r === rid) && ws <= today && (!best || ws > best)) best = ws;
  }
  return best;
}
function lastCookedLabel(rid) {
  const d = lastCookedDate(rid);
  if (!d) return "";
  const days = Math.round((parseIso(iso(new Date())) - parseIso(d)) / 864e5);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Cuisiné hier";
  if (days < 7) return `Il y a ${days} jours`;
  const wk = Math.round(days / 7);
  return wk < 9 ? `Il y a ${wk} sem.` : `Il y a ${Math.round(days / 30)} mois`;
}

/* ------------------------------- Rendu ---------------------------------- */
const RENDERERS = {
  week: renderWeek, shopping: renderShopping, recipes: renderRecipes,
  pantry: renderPantry, ideas: renderIdeas, history: renderHistory
};
/** Onglet de la barre correspondant à l'écran affiché (« Idées » dépend de « Placard »). */
const NAV_OF = { ideas: "pantry" };
function render() {
  document.querySelectorAll(".tab").forEach(s => s.classList.toggle("active", s.id === "tab-" + ui.tab));
  document.querySelectorAll("#tabs button").forEach(b => {
    if (b.dataset.tab === (NAV_OF[ui.tab] || ui.tab)) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  const s = activeSeason();
  const sb = $("#seasonBtn");
  sb.innerHTML = `${icon("leaf", 16)}<span>${SEASON_LABELS[s]}</span>${prefs.season ? "" : `<span class="auto">· auto</span>`}`;
  sb.setAttribute("aria-label", `Saison : ${SEASON_LABELS[s]}${prefs.season ? "" : " (automatique)"}. Changer la saison`);
  RENDERERS[ui.tab]();
  refreshDatalist();
  updateSyncBadge();
}
function refreshDatalist() {
  const names = new Set();
  state.recipes.forEach(r => r.ingredients.forEach(i => i.name && names.add(i.name)));
  state.pantry.forEach(p => names.add(p.name));
  $("#ingNames").innerHTML = [...names].sort((a, b) => a.localeCompare(b, "fr")).map(n => `<option value="${esc(n)}">`).join("");
}
function weekNav() {
  const start = parseIso(ui.weekStart);
  const end = addDays(start, 6);
  return `<div class="week-nav">
    <button class="icon-btn" data-action="week-prev" aria-label="Semaine précédente">‹</button>
    <div class="week-title">
      <strong>${frDate(start, { day: "numeric", month: "short" })} → ${frDate(end, { day: "numeric", month: "short", year: "numeric" })}</strong>
      <small>${weekLabel(ui.weekStart)}${ui.weekStart !== defaultWeekStart() ? ` · <button class="link" data-action="week-today">revenir à la semaine à planifier</button>` : ""}</small>
    </div>
    <button class="icon-btn" data-action="week-next" aria-label="Semaine suivante">›</button>
  </div>`;
}

/* ---------- Onglet Semaine ---------- */
const DAY_SHORT = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];
const BASICS = new Set(["sel", "poivre", "huile d'olive", "huile de colza", "eau", "sel et poivre"].map(matchKey));
const isBasic = ing => ing.aisle === "spi" || BASICS.has(matchKey(ing.name));

/** Ingrédients de la recette présents au placard (stock non nul), « à consommer vite » d'abord. */
function pantryHits(r) {
  const hits = [];
  for (const ing of r.ingredients) {
    if (isBasic(ing)) continue;
    const b = isNum(ing.qty) ? toBase(ing.qty, ing.unit) : { q: null, u: "" };
    const p = findPantry(ing.name, b.u);
    if (!p || (isNum(p.qty) && +p.qty <= 0)) continue;
    if (!hits.some(h => h.p === p)) hits.push({ p, name: ing.name, soon: !!p.soon });
  }
  return hits.sort((a, b) => b.soon - a.soon);
}
const joinFr = arr => arr.length <= 1 ? (arr[0] || "") : arr.slice(0, -1).join(", ") + " et " + arr[arr.length - 1];

/** Pourquoi cette recette est proposée : placard, saison, ancienneté. */
function reasonFor(r, ws) {
  const parts = [];
  const hits = pantryHits(r);
  if (hits.length) {
    const soon = hits.filter(h => h.soon).map(h => h.name);
    parts.push(soon.length ? `Utilise vite : ${joinFr(soon.slice(0, 2))}` : `Utilise ton placard : ${joinFr(hits.slice(0, 2).map(h => h.name))}`);
  }
  const season = activeSeason(parseIso(ws));
  if (r.seasons.length < 4 && r.seasons.includes(season)) parts.push("de saison");
  const age = lastMadeInfo(r.id, ws).age;
  if (age === 999) parts.push("nouvelle recette");
  else if (age >= 6 && age < 999) parts.push(`pas faite depuis ${age} sem.`);
  return parts.join(" · ");
}

/** Note une recette candidate pour le jour i (plus c'est haut, mieux c'est). */
function proposalScore(r, w, i, ws) {
  // Un ingrédient du placard déjà utilisé par un autre jour compte beaucoup moins.
  const taken = new Set();
  w.days.forEach((id, k) => { const o = k !== i && id && getRecipe(id); if (o) pantryHits(o).forEach(h => taken.add(h.p)); });
  const hits = pantryHits(r);
  const age = lastMadeInfo(r.id, ws).age;
  let score = Math.min(age, 12) * 0.5;
  for (const h of hits) if (!taken.has(h.p)) score += h.soon ? 9 : 3;
  const neighbours = [w.days[i - 1], w.days[i + 1]].map(id => id && getRecipe(id)).filter(Boolean);
  if (neighbours.some(n => n.category === r.category)) score -= 8;
  const sameCat = w.days.filter((id, k) => k !== i && id && getRecipe(id) && getRecipe(id).category === r.category).length;
  if (sameCat >= 2) score -= 6;
  return score + Math.random() * 2;
}
/** Recettes éligibles aux propositions automatiques (jamais de viande ni de programme sportif). */
function proposalPool(w, ws, exclude = []) {
  const season = activeSeason(parseIso(ws));
  const used = new Set([...w.days.filter(Boolean), ...exclude]);
  const base = state.recipes.filter(r => isDinner(r) && !r.meat && !MANUAL_ONLY.includes(r.category) && !used.has(r.id));
  const seasonal = base.filter(r => r.seasons.includes(season));
  const fresh = seasonal.filter(r => lastMadeInfo(r.id, ws).age > RECENT_WEEKS);
  return fresh.length ? fresh : seasonal.length ? seasonal : base;
}
function bestFor(w, i, ws, exclude = []) {
  const pool = proposalPool(w, ws, exclude);
  if (!pool.length) return null;
  return pool.map(r => ({ r, s: proposalScore(r, w, i, ws) })).sort((a, b) => b.s - a.s)[0].r;
}

function renderWeek() {
  const ws = ui.weekStart, w = getWeek(ws), start = parseIso(ws);
  const today = iso(new Date());
  const recipes = w.days.map(id => id && getRecipe(id));
  const n = recipes.filter(Boolean).length;
  const nCookeo = recipes.filter(r => r && r.cookeo).length;
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const range = `${start.getDate()}${sameMonth ? "" : " " + frDate(start, { month: "short" })} → ${end.getDate()} ${frDate(end, { month: "short" })}`;

  const days = DAYS.map((d, i) => {
    const date = addDays(start, i);
    const isToday = iso(date) === today;
    const label = `${DAY_SHORT[i]} ${date.getDate()}`;
    const r = recipes[i];
    if (!r) {
      return `<li><button class="day-empty ${isToday ? "today" : ""}" data-action="pick-day" data-day="${i}" aria-label="${d} ${date.getDate()} : choisir un dîner">
        <span class="de-day">${label}${isToday ? ` <span class="pill-today">Aujourd'hui</span>` : ""}</span>
        <span class="de-add">${icon("plus", 18)} Choisir</span></button></li>`;
    }
    const cooked = !!w.cooked[i];
    const lastAge = lastMadeBefore(r.id, ws);
    const age = lastAge ? weeksBetween(lastAge, ws) : null;
    const dup = w.days.filter(x => x === r.id).length > 1;
    const warn = dup ? "Prévu 2 fois cette semaine" : (age !== null && age <= RECENT_WEEKS ? `Déjà fait il y a ${age} sem.` : "");
    const reason = cooked ? "" : reasonFor(r, ws);
    return `<li><article class="day-card ${isToday ? "today" : ""} ${cooked ? "cooked" : ""}" aria-label="${d} ${date.getDate()}">
      <div class="dc-top"><span class="dc-day">${label}</span>${isToday ? `<span class="pill-today">Aujourd'hui</span>` : ""}
</div>
      <button class="dc-title" data-action="view" data-id="${r.id}">${esc(r.name)}</button>
      ${reason ? `<p class="dc-reason">${esc(reason)}</p>` : ""}
      ${warn ? `<p class="dc-warn">${icon("alert", 14)} ${warn}</p>` : ""}
      <div class="dc-actions">
        <button class="btn small ${cooked ? "ok" : ""}" data-action="toggle-cooked" data-day="${i}" aria-pressed="${cooked}">${icon("check", 16)} ${cooked ? "Cuisiné" : "Marquer cuisiné"}</button>
        <span class="dc-icons">
          ${cooked ? "" : `<button class="icon-btn" data-action="swap-day" data-day="${i}" aria-label="Changer de recette (proposer une alternative)" title="Proposer une autre recette">${icon("refresh", 20)}</button>`}
          <button class="icon-btn" data-action="pick-day" data-day="${i}" aria-label="Choisir une recette dans la liste" title="Choisir dans la liste">${icon("list", 20)}</button>
          <button class="icon-btn" data-action="clear-day" data-day="${i}" aria-label="Retirer ce dîner" title="Retirer">${icon("x", 20)}</button>
        </span>
      </div>
    </article></li>`;
  }).join("");

  const missing = 7 - n;
  $("#tab-week").innerHTML = `
    <div class="page-head"><div><h1 id="h-week">Semaine</h1>
      <p class="sub">${weekLabel(ws)}${ws !== defaultWeekStart() ? ` · <button class="link inline" data-action="week-today">revenir à la semaine à planifier</button>` : ""}</p></div></div>
    <div class="week-bar">
      <button class="round-btn" data-action="week-prev" aria-label="Semaine précédente">${icon("chevronLeft", 22)}</button>
      <div class="wb-center"><strong>${range}</strong><span class="wb-count">${n}/7 dîners${nCookeo ? ` · ${nCookeo} Cookeo` : ""}</span></div>
      <button class="round-btn" data-action="week-next" aria-label="Semaine suivante">${icon("chevronRight", 22)}</button>
    </div>
    <div class="progress week-progress" role="progressbar" aria-label="Dîners planifiés" aria-valuemin="0" aria-valuemax="7" aria-valuenow="${n}"><span style="width:${Math.round(n / 7 * 100)}%"></span></div>
    ${missing ? `<button class="propose-btn" data-action="propose">${icon("sparkles", 24)}
      <span><strong>Proposer ${missing === 1 ? "le dîner restant" : `les ${missing} dîners restants`}</strong>
      <small>Selon ton placard, la saison et vos goûts</small></span></button>` : ""}
    <ul class="days-list">${days}</ul>
    ${sidesCard(w)}
    <div class="toolbar">
      <button class="btn" data-action="goto" data-tab="shopping">${icon("cart", 18)} Liste de courses</button>
      ${n ? `<button class="btn ghost" data-action="clear-week">${icon("trash", 18)} Vider la semaine</button>` : ""}
    </div>`;
}

function sidesCard(w) {
  const sides = (w.sides || []).filter(x => getRecipe(x.r));
  return `<div class="sides-head"><h2 class="section-title">Petits-déj, desserts & goûters</h2>
      <button class="btn small pill" data-action="pick-side">${icon("plus", 16)} Ajouter</button></div>
    ${sides.length ? `<ul class="list">${sides.map(x => {
      const r = getRecipe(x.r);
      return `<li class="side-row ${x.c ? "cooked" : ""}">
        <button class="row-item" data-action="view" data-id="${r.id}"><span class="grow"><span class="side-name">${esc(r.name)}</span>
          <span class="meta">${esc(r.category)} · ${esc(yieldText(r))}</span></span></button>
        <button class="icon-btn ${x.c ? "is-done" : ""}" data-action="side-cooked" data-id="${x.id}" aria-pressed="${!!x.c}" aria-label="${x.c ? "Fait (annuler)" : "Marquer comme fait"}">${icon("check", 20)}</button>
        <button class="icon-btn" data-action="side-remove" data-id="${x.id}" aria-label="Retirer ${esc(r.name)}">${icon("x", 20)}</button>
      </li>`;
    }).join("")}</ul>`
    : `<p class="hint">Leurs ingrédients s'ajoutent à la liste de courses.</p>`}`;
}
function openPicker(day, side = false) {
  ui.pickerDay = side ? null : day;
  ui.pickerSide = side;
  const date = side ? null : addDays(parseIso(ui.weekStart), day);
  openModal(`
    <div class="modal-head"><h2>${side ? "Petit-déj, dessert, goûter ou base" : `Dîner du ${DAYS[day].toLowerCase()} ${frDate(date, { day: "numeric", month: "long" })}`}</h2>
      <button class="icon-btn" data-action="close" aria-label="Fermer">${icon("x", 22)}</button></div>
    ${filterControls("picker")}
    <p class="sub" id="pickerCount"></p>
    <div id="pickerList" class="cards one"></div>
    <button class="btn ghost full" data-action="new-recipe">${icon("plus", 18)} Créer une nouvelle recette</button>`);
  renderPickerList();
}
function renderPickerList() {
  const el = $("#pickerList");
  if (!el) return;
  const ws = ui.weekStart;
  const list = state.recipes
    .filter(r => isDinner(r) !== !!ui.pickerSide && matchesFilters(r, ui.filters.picker, activeSeason(parseIso(ws))))
    .map(r => ({ r, info: lastMadeInfo(r.id, ws) }))
    .sort((a, b) => (a.info.warn - b.info.warn) || a.r.name.localeCompare(b.r.name, "fr"));
  const c = $("#pickerCount");
  if (c) c.textContent = `${list.length} recette${list.length > 1 ? "s" : ""}`;
  el.innerHTML = list.map(({ r }) => recipeCard(r, "pick")).join("") || `<p class="empty">Aucune recette ne correspond aux filtres.</p>`;
}

function addSide(rid) {
  const w = ensureWeek(ui.weekStart);
  w.sides = w.sides || [];
  w.sides.push({ id: uid(), r: rid, c: false, l: null });
  save(); render();
}

function markCooked(i) {
  const w = ensureWeek(ui.weekStart);
  const r = getRecipe(w.days[i]);
  if (!r) return;
  if (w.cooked[i]) {
    if (!confirm("Annuler « cuisiné » ? Les quantités déduites seront remises au placard.")) return;
    restoreToPantry(w.cookLog[i]);
    w.cooked[i] = false;
    delete w.cookLog[i];
    toast("Dîner remis à faire");
  } else {
    const { log, msgs } = deductFromPantry(r);
    w.cooked[i] = true;
    w.cookLog[i] = log;
    toast(msgs.length ? "Placard mis à jour : " + msgs.join(" · ") : "Bon appétit !");
  }
  save(); render();
}

/** Remplit les jours vides avec les meilleures propositions (placard, saison, historique, variété). */
function proposeWeek() {
  const ws = ui.weekStart;
  const w = ensureWeek(ws);
  let filled = 0;
  for (let i = 0; i < 7; i++) {
    if (w.days[i]) continue;
    const pick = bestFor(w, i, ws);
    if (!pick) break;
    w.days[i] = pick.id; w.cooked[i] = false;
    filled++;
  }
  save(); render();
  toast(filled ? `${filled} dîner${filled > 1 ? "s" : ""} proposé${filled > 1 ? "s" : ""}` : "Aucune recette disponible");
}
/** ↻ : remplace le dîner du jour i par une autre proposition. */
function swapDay(i) {
  const ws = ui.weekStart, w = ensureWeek(ws);
  const cur = w.days[i];
  const tmp = { ...w, days: w.days.slice() };
  tmp.days[i] = null;
  const alt = bestFor(tmp, i, ws, cur ? [cur] : []);
  if (!alt) return toast("Pas d'autre recette disponible");
  w.days[i] = alt.id; w.cooked[i] = false; delete w.cookLog[i];
  save(); render();
  toast(`${DAYS[i]} : ${alt.name}`, { action: "Annuler", onAction: () => { w.days[i] = cur; save(); render(); } });
}

/* ---------- Onglet Courses ---------- */
function renderShopping() {
  const ws = ui.weekStart, w = getWeek(ws);
  const { toBuy, covered, planned } = computeShopping(ws);
  const total = toBuy.length;
  const done = toBuy.filter(it => w.checked[it.key]).length;
  const groups = groupByAisle(toBuy);
  const start = parseIso(ws), end = addDays(start, 6);
  const range = `${start.getDate()}${start.getMonth() === end.getMonth() ? "" : " " + frDate(start, { month: "short" })} → ${end.getDate()} ${frDate(end, { month: "short" })}`;
  const aisleOptions = Object.entries(AISLES).map(([k, v]) => `<option value="${k}" ${k === "div" ? "selected" : ""}>${v}</option>`).join("");

  let listHtml = "";
  for (const [a, items] of Object.entries(groups)) {
    if (!items.length) continue;
    items.sort((x, y) => (!!w.checked[x.key] - !!w.checked[y.key]));
    const left = items.filter(it => !w.checked[it.key]).length;
    listHtml += `<h2 class="section-title aisle-title">${AISLES[a]}<span>${left}</span></h2><ul class="list">
      ${items.map(it => {
        const sub = [it.note, it.recipes.length ? it.recipes.join(" · ") : ""].filter(Boolean).join(" — ");
        return `<li class="shop-row ${w.checked[it.key] ? "done" : ""}"><label class="row-item">
          <input type="checkbox" data-check="${esc(it.key)}" ${w.checked[it.key] ? "checked" : ""}>
          <span class="grow"><span class="p-title">${esc(it.name)}</span>${sub ? `<span class="meta">${esc(sub)}</span>` : ""}</span>
          <span class="trail shop-qty">${esc(itemQty(it))}</span></label>
          ${it.extra ? `<button class="icon-btn" data-action="del-extra" data-id="${it.id}" aria-label="Supprimer ${esc(it.name)}">${icon("x", 18)}</button>` : ""}</li>`;
      }).join("")}</ul>`;
  }

  $("#tab-shopping").innerHTML = `
    <div class="page-head"><div><h1 id="h-shopping">Courses</h1><p class="sub">${total ? `${total} article${total > 1 ? "s" : ""} · ${done} dans le panier` : "Rien à acheter"}</p></div></div>
    <div class="week-bar">
      <button class="round-btn" data-action="week-prev" aria-label="Semaine précédente">${icon("chevronLeft", 22)}</button>
      <div class="wb-center"><strong>${range}</strong><span class="wb-count">${weekLabel(ws)}</span></div>
      <button class="round-btn" data-action="week-next" aria-label="Semaine suivante">${icon("chevronRight", 22)}</button>
    </div>
    ${planned || w.extras.length ? `
      <div class="progress week-progress" role="progressbar" aria-label="Articles dans le panier" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><span style="width:${total ? Math.round(done / total * 100) : 0}%"></span></div>
      <div class="chips" role="toolbar" aria-label="Exporter la liste">
        <button class="chip" data-action="copy-list">${icon("copy", 16)} Copier</button>
        ${navigator.share ? `<button class="chip" data-action="share-list">${icon("share", 16)} Partager</button>` : ""}
        <button class="chip" data-action="download-list">${icon("download", 16)} Fichier .txt</button>
        <button class="chip" data-action="show-text">${icon("fileText", 16)} Voir le texte</button>
      </div>
      ${listHtml || `<p class="empty">Tout est déjà dans ton placard.</p>`}
    ` : `<div class="empty card">Aucun dîner planifié pour cette semaine.<br><button class="btn primary" data-action="goto" data-tab="week">Planifier la semaine</button></div>`}

    <form id="extraForm" class="extra-form" autocomplete="off">
      <h2 class="section-title">Ajouter un article</h2>
      <div class="row">
        <label class="sr-only" for="extraName">Article</label><input id="extraName" name="name" placeholder="ex : pommes, savon" required list="ingNames">
        <label class="sr-only" for="extraQty">Quantité</label><input id="extraQty" name="qty" placeholder="Quantité" class="qty-input">
      </div>
      <div class="row aisle-row"><label for="extraAisle" class="aisle-label">Rayon <span id="aisleAuto" class="auto-tag" hidden>détecté</span></label>
        <select id="extraAisle" name="aisle" data-guess-for="extraName">${aisleOptions}</select>
        <button class="btn primary">${icon("plus", 18)} Ajouter</button></div>
    </form>

    ${done ? `<div class="toolbar">
      <button class="btn" data-action="stock-checked">${icon("package", 18)} Ranger les articles cochés au placard</button>
      <button class="btn ghost" data-action="uncheck-all">Tout décocher</button></div>` : ""}

    ${covered.length ? `<button class="section-title toggle-title" data-action="toggle-covered" aria-expanded="${ui.showCovered}">
        Déjà au placard · ${covered.length} ${icon(ui.showCovered ? "chevronDown" : "chevronRight", 16)}</button>
      ${ui.showCovered ? `<ul class="list">${covered.map(it => `<li><div class="row-item static"><span class="grow"><span class="p-title">${esc(it.name)}</span>
        <span class="meta">${esc(it.note)}</span></span><span class="trail">${esc(fmtQty(it.qty, it.unit))}</span></div></li>`).join("")}</ul>` : ""}` : ""}
    ${w.cooked.some(Boolean) ? `<p class="hint">Les dîners déjà cuisinés ne sont plus comptés.</p>` : ""}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
    ta.remove();
    return ok;
  }
}
function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- Onglet Recettes ---------- */
function renderRecipes() {
  $("#tab-recipes").innerHTML = `
    <div class="page-head"><div><h1 id="h-recipes">Recettes</h1><p class="sub" id="recipeCount"></p></div>
      <div class="page-head-actions">
        <button class="round-btn" data-action="paste-recipe" aria-label="Coller une recette" title="Coller une recette">${icon("clipboard", 20)}</button>
        <button class="round-btn accent" data-action="new-recipe" aria-label="Nouvelle recette" title="Nouvelle recette">${icon("plus", 22)}</button>
      </div></div>
    ${filterControls("recipes")}
    <div id="recipeList" class="cards"></div>`;
  renderRecipeList();
}
function recipeCard(r, action = "view") {
  const last = lastCookedLabel(r.id);
  const meta = [
    r.time ? `<span>${icon("clock", 15)} ${r.time} min</span>` : "",
    `<span>${icon("users", 15)} ${esc(r.yield || "3 pers.")}</span>`,
    `<span>${icon("list", 15)} ${r.ingredients.length} ingr.</span>`
  ].filter(Boolean).join("");
  const second = r.cookeo ? "Cookeo" : (r.meat ? "Viande" : "");
  return `<button class="recipe-card" data-action="${action}" data-id="${r.id}">
    <span class="rc-title">${esc(r.name)}${last ? "" : `<span class="pill-new">Nouveau</span>`}</span>
    <span class="rc-meta">${meta}</span>
    <span class="rc-foot"><span class="tags"><span class="tag">${esc(r.category)}</span>${second ? `<span class="tag">${second}</span>` : ""}</span>
      ${last ? `<span class="rc-last">${last}</span>` : ""}</span>
  </button>`;
}
function renderRecipeList() {
  const el = $("#recipeList");
  if (!el) return;
  const f = ui.filters.recipes;
  let list = state.recipes.filter(r => matchesFilters(r, f, activeSeason()));
  if (f.ings && f.ings.length) {
    const keys = f.ings.map(matchKey);
    const used = r => r.ingredients.filter(i => keys.some(k => namesMatch(matchKey(i.name), k))).length;
    list.sort((a, b) => used(b) - used(a) || a.name.localeCompare(b.name, "fr"));
  } else list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const total = state.recipes.length;
  $("#recipeCount").textContent = list.length === total ? `${total} recettes` : `${list.length} recette${list.length > 1 ? "s" : ""} sur ${total}`;
  el.innerHTML = list.map(r => recipeCard(r)).join("") || `<p class="empty">Aucune recette ne correspond aux filtres.</p>`;
}

function viewRecipe(id) {
  const r = getRecipe(id);
  if (!r) return;
  const info = lastMadeInfo(r.id, thisWeek());
  const ws = ui.weekStart, w = getWeek(ws), start = parseIso(ws);
  openModal(`
    <div class="modal-head"><h2>${esc(r.name)}</h2><button class="icon-btn" data-action="close" aria-label="Fermer">${icon("x", 22)}</button></div>
    <div class="tags">${badges(r)}</div>
    <p class="rc-meta">${r.time ? `<span>${icon("clock", 15)} ${r.time} min</span>` : ""}<span>${icon("users", 15)} ${esc(yieldText(r))}</span><span>${lastCookedLabel(r.id) || "Jamais cuisinée"}</span></p>
    ${r.cookeo ? `<div class="info-box"><strong>Cookeo :</strong> ${esc(r.cookeoNote || "recette adaptée au Cookeo.")}</div>` : ""}
    ${r.meat ? `<div class="info-box">Viande ou poisson : pour Baptiste.</div>` : ""}
    <h3>Ingrédients <small class="muted">(${esc(yieldText(r))})</small></h3>
    <ul class="ing-list">${r.ingredients.map(i => `<li><span>${esc(i.name)}</span><span class="muted">${esc(isNum(i.qty) ? fmtQty(i.qty, i.unit) : "selon goût")}</span></li>`).join("")}</ul>
    <h3>Préparation</h3>
    <ol class="steps">${r.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
    ${r.notes ? `<p class="note">${esc(r.notes)}</p>` : ""}
    ${r.source ? `<p class="small muted">Source : ${/^https?:\/\//i.test(r.source) ? `<a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">${esc(r.source.replace(/^https?:\/\/(www\.)?/i, "").slice(0, 50))}</a>` : esc(r.source)}</p>` : ""}
    ${!isDinner(r) ? `<div class="card add-to-week">
      <p class="small">Semaine du ${frDate(start, { day: "numeric", month: "short" })} : les ingrédients iront dans la liste de courses.</p>
      <button class="btn primary" data-action="add-side" data-id="${r.id}">${icon("plus", 18)} Ajouter à la semaine</button>
    </div>` : `<div class="card add-to-week">
      <label for="addDay" class="small">Ajouter à la semaine du ${frDate(start, { day: "numeric", month: "short" })} :</label>
      <div class="row">
        <select id="addDay">${DAYS.map((d, i) => `<option value="${i}">${d}${w.days[i] && getRecipe(w.days[i]) ? " (remplace : " + esc(getRecipe(w.days[i]).name.slice(0, 22)) + "…)" : ""}</option>`).join("")}</select>
        <button class="btn primary" data-action="add-to-day" data-id="${r.id}">Ajouter</button>
      </div>
    </div>`}
    <div class="modal-actions">
      <button class="btn" data-action="edit-recipe" data-id="${r.id}">${icon("pencil", 18)} Modifier</button>
      <button class="btn" data-action="dup-recipe" data-id="${r.id}">${icon("copy", 18)} Dupliquer</button>
      <button class="btn danger" data-action="delete-recipe" data-id="${r.id}">${icon("trash", 18)} Supprimer</button>
    </div>`);
}

function ingRow(i = { name: "", qty: "", unit: "g", aisle: "leg" }) {
  return `<div class="ing-row">
    <input name="iname" placeholder="Ingrédient" list="ingNames" value="${esc(i.name)}" aria-label="Ingrédient">
    <input name="iqty" placeholder="Qté" inputmode="decimal" value="${isNum(i.qty) ? String(i.qty).replace(".", ",") : ""}" aria-label="Quantité">
    <select name="iunit" aria-label="Unité">${(UNITS.includes(i.unit) || !i.unit ? UNITS : [i.unit, ...UNITS]).map(u => `<option ${u === i.unit ? "selected" : ""}>${u}</option>`).join("")}</select>
    <select name="iaisle" aria-label="Rayon">${Object.entries(AISLES).map(([k, v]) => `<option value="${k}" ${k === i.aisle ? "selected" : ""}>${v}</option>`).join("")}</select>
    <button type="button" class="icon-btn" data-action="del-ing-row" aria-label="Supprimer l'ingrédient">${icon("x", 20)}</button>
  </div>`;
}
function editRecipe(id, asCopy = false) {
  const src = id ? getRecipe(id) : null;
  const r = src ? clone(src) : {
    id: null, name: "", category: CATEGORIES[0], seasons: [seasonOf()], meat: false, cookeo: false,
    cookeoNote: "", time: 30, ingredients: [{ name: "", qty: "", unit: "g", aisle: "leg" }], steps: [], notes: ""
  };
  if (asCopy) { r.id = null; r.name += " (copie)"; }
  openModal(`
    <form id="recipeForm" data-id="${r.id || ""}">
      <div class="modal-head"><h2>${r.id ? "Modifier la recette" : "Nouvelle recette"}</h2>
        <button type="button" class="icon-btn" data-action="close" aria-label="Fermer">${icon("x", 22)}</button></div>
      <label>Nom<input name="name" required value="${esc(r.name)}"></label>
      <div class="row">
        <label>Catégorie<select name="category">${allCategories().map(c => `<option ${c === r.category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
        <label>Temps (min)<input name="time" type="number" min="0" inputmode="numeric" value="${r.time || ""}"></label>
      </div>
      <label>Rendement (vide = 3 portions)<input name="yield" value="${esc(r.yield || "")}" placeholder="ex : 1 tarte, 12 biscuits, 6 verrines"></label>
      <fieldset><legend>Saisons</legend>
        ${Object.keys(SEASON_LABELS).map(s => `<label class="chk"><input type="checkbox" name="season" value="${s}" ${r.seasons.includes(s) ? "checked" : ""}> ${SEASON_LABELS[s]}</label>`).join("")}
      </fieldset>
      <div class="row">
        <label class="chk"><input type="checkbox" name="meat" ${r.meat ? "checked" : ""}> Viande ou poisson</label>
        <label class="chk"><input type="checkbox" name="cookeo" ${r.cookeo ? "checked" : ""}> Cookeo</label>
      </div>
      <label>Programme Cookeo (si pertinent)<input name="cookeoNote" value="${esc(r.cookeoNote)}" placeholder="ex : Dorer 3 min puis sous pression 10 min"></label>
      <fieldset><legend>Ingrédients pour 3 portions</legend>
        <div id="ingRows">${r.ingredients.map(ingRow).join("")}</div>
        <button type="button" class="btn small" data-action="add-ing-row">${icon("plus", 16)} Ingrédient</button>
      </fieldset>
      <label>Étapes (une par ligne)<textarea name="steps" rows="6">${esc(r.steps.join("\n"))}</textarea></label>
      <label>Notes<textarea name="notes" rows="2">${esc(r.notes)}</textarea></label>
      <label>Source (lien Instagram, livre…)<input name="source" value="${esc(r.source || "")}" placeholder="https://www.instagram.com/…"></label>
      <div class="modal-actions">
        <button type="button" class="btn ghost" data-action="${r.id ? "view" : "close"}" data-id="${r.id || ""}">Annuler</button>
        <button type="submit" class="btn primary">Enregistrer</button>
      </div>
    </form>`);
}
function saveRecipeForm(form) {
  const fd = new FormData(form);
  const names = fd.getAll("iname"), qtys = fd.getAll("iqty"), units = fd.getAll("iunit"), aisles = fd.getAll("iaisle");
  const ingredients = names.map((n, k) => {
    const q = parseFloat(String(qtys[k]).replace(",", "."));
    return { name: n.trim(), qty: isNaN(q) ? null : q, unit: units[k], aisle: aisles[k] };
  }).filter(i => i.name);
  const seasons = fd.getAll("season");
  if (!seasons.length) return alert("Choisissez au moins une saison.");
  if (!ingredients.length) return alert("Ajoutez au moins un ingrédient.");
  const id = form.dataset.id;
  const existing = id && getRecipe(id);
  const r = {
    id: id || uid(),
    name: fd.get("name").trim(),
    category: fd.get("category"),
    seasons,
    meat: fd.get("meat") === "on",
    cookeo: fd.get("cookeo") === "on",
    cookeoNote: fd.get("cookeoNote").trim(),
    time: parseInt(fd.get("time"), 10) || null,
    ingredients,
    steps: fd.get("steps").split("\n").map(s => s.trim()).filter(Boolean),
    notes: fd.get("notes").trim(),
    source: fd.get("source").trim(),
    yield: fd.get("yield").trim(),
    seed: existing ? !!existing.seed : false
  };
  if (existing) state.recipes[state.recipes.indexOf(existing)] = r;
  else state.recipes.push(r);
  save();
  if (ui.pickerSide && !existing) {
    addSide(r.id);
    closeModal();
  } else if (ui.pickerDay !== null && !existing) {
    ensureWeek(ui.weekStart).days[ui.pickerDay] = r.id;
    ui.pickerDay = null;
    save(); closeModal();
  } else viewRecipe(r.id);
  render();
  toast("Recette enregistrée");
}

/* ---------- Onglet Placard ---------- */
function pantryQtyText(p) {
  if (!isNum(p.qty)) return "En stock";
  return +p.qty <= 0 ? "Épuisé" : fmtQty(p.qty, p.unit);
}
function pantryNote(p) {
  const notes = [];
  if (p.addedAt) {
    const d = Math.round((parseIso(iso(new Date())) - parseIso(p.addedAt)) / 864e5);
    notes.push(d <= 0 ? "Ajouté aujourd'hui" : d === 1 ? "Ajouté hier" : `Ajouté il y a ${d} jours`);
  }
  if (p.opened) notes.push("Entamé");
  return notes.join(" · ");
}
function pantryRow(p, withNote) {
  const empty = isNum(p.qty) && +p.qty <= 0;
  const note = withNote ? pantryNote(p) : "";
  return `<li class="swipe" data-id="${p.id}">
    <div class="swipe-bg" aria-hidden="true">${icon("trash", 20)} Supprimer</div>
    <button class="row-item swipe-fg" data-action="pantry-open" data-id="${p.id}" aria-label="${esc(p.name)}, ${esc(pantryQtyText(p))}. Modifier">
      <span class="grow"><span class="p-title">${esc(p.name)}</span>${note ? `<span class="meta">${esc(note)}</span>` : ""}</span>
      <span class="trail"><span class="p-q ${empty ? "is-empty" : ""}">${esc(pantryQtyText(p))}</span>${icon("chevronRight", 18)}</span>
    </button></li>`;
}
function renderPantry() {
  const q = norm(ui.pantryQ);
  const all = state.pantry.slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const items = all.filter(p => !q || norm(p.name).includes(q));
  const soon = items.filter(p => p.soon), stock = items.filter(p => !p.soon);
  const n = state.pantry.length;
  $("#tab-pantry").innerHTML = `
    <div class="page-head"><div><h1 id="h-pantry">Placard</h1><p class="sub">${n} ingrédient${n > 1 ? "s" : ""}</p></div>
      <button class="btn primary pill" data-action="pantry-add-sheet">${icon("plus", 18)} Ajouter</button></div>
    ${n > 8 ? `<div class="search"><label for="pantrySearch" class="sr-only">Rechercher dans le placard</label>${icon("search", 20)}
      <input type="search" id="pantrySearch" placeholder="Rechercher" value="${esc(ui.pantryQ)}" autocomplete="off"></div>` : ""}
    ${soon.length ? `<section class="soon-box" aria-labelledby="soonTitle">
      <h2 class="soon-title" id="soonTitle">${icon("alert", 18)} À consommer vite</h2>
      <ul class="list">${soon.map(p => pantryRow(p, true)).join("")}</ul>
      <button class="link soon-link" data-action="recipes-for-soon">Voir les recettes qui les utilisent ${icon("chevronRight", 16)}</button>
    </section>` : ""}
    ${n ? `${stock.length ? Object.keys(AISLES).map(a => {
        const group = stock.filter(p => (AISLES[p.aisle] ? p.aisle : guessAisle(p.name)) === a);
        return group.length ? `<h2 class="section-title aisle-title">${AISLES[a]}<span>${group.length}</span></h2><ul class="list">${group.map(p => pantryRow(p, false)).join("")}</ul>` : "";
      }).join("") : `<h2 class="section-title">En stock</h2><p class="hint">Rien d'autre${q ? " pour cette recherche" : ""}.</p>`}
      <p class="hint pantry-help">${icon("info", 16)} Sans quantité, un ingrédient est « en stock » ; avec une quantité, elle diminue quand un dîner est marqué cuisiné. Glisser une ligne vers la gauche pour la supprimer.</p>
      <div class="toolbar">
        <button class="btn" data-action="goto" data-tab="ideas">${icon("bulb", 18)} Que cuisiner avec mon placard ?</button>
        ${all.some(p => isNum(p.qty) && +p.qty <= 0) ? `<button class="btn ghost" data-action="pantry-clear-empty">Retirer les épuisés</button>` : ""}
      </div>`
    : `<div class="empty card">Ton placard est vide.<br>Ajoute ce que tu as déjà à la maison : il sera retiré de la liste de courses.
        <br><button class="btn primary" data-action="pantry-add-sheet">${icon("plus", 18)} Ajouter un ingrédient</button></div>`}`;
}
const unitOptions = (sel = "g") => `<option value="">sans quantité</option>${UNITS.map(u => `<option ${u === sel ? "selected" : ""}>${u}</option>`).join("")}`;
function openPantryAddSheet() {
  const present = new Set(state.pantry.map(p => matchKey(p.name)));
  const quick = PANTRY_QUICK.filter(n => !present.has(matchKey(n)));
  openSheet(`<form id="pantryForm" autocomplete="off">
    <h2>Ajouter au placard</h2>
    <label>Ingrédient<input name="name" list="ingNames" placeholder="ex : farine T45" required></label>
    <div class="row"><label>Quantité<input name="qty" inputmode="decimal" placeholder="Quantité"></label>
      <label>Unité<select name="unit">${unitOptions("g")}</select></label></div>
    <label class="chk"><input type="checkbox" name="soon"> À consommer vite</label>
    <button class="btn primary full sheet-cta">Ajouter</button>
    ${quick.length ? `<h3 class="sheet-label">Ajout rapide (en stock, sans quantité)</h3>
      <div class="seg">${quick.map(n => `<button type="button" data-action="pantry-quick" data-name="${esc(n)}">${icon("plus", 14)} ${esc(n)}</button>`).join("")}</div>` : ""}
  </form>`, "Ajouter au placard");
}
function openPantryEditSheet(id) {
  const p = state.pantry.find(x => x.id === id);
  if (!p) return;
  const tracked = isNum(p.qty);
  const disp = tracked ? fmtQty(p.qty, p.unit).replace(/^([\d,]+) (.*)$/, "$1") : "";
  const unitDisp = tracked ? (p.unit === "g" && p.qty >= 1000 ? "kg" : p.unit === "ml" && p.qty >= 1000 ? "l" : p.unit) : "";
  openSheet(`<form id="pantryEditForm" data-id="${p.id}" autocomplete="off">
    <div class="sheet-head"><h2>${esc(p.name)}</h2><span class="muted">${esc(pantryQtyText(p))}</span></div>
    <div class="row"><label>Quantité<input name="qty" inputmode="decimal" placeholder="Quantité" value="${esc(disp)}"></label>
      <label>Unité<select name="unit">${unitOptions(unitDisp)}</select></label></div>
    ${tracked ? `<div class="row use-row"><label>J'en ai utilisé (${esc(p.unit || "pièce")})<input name="used" inputmode="decimal" placeholder="${p.unit === "g" || p.unit === "ml" ? "ex : 400" : "ex : 1"}"></label>
      <button type="button" class="btn" data-action="pantry-use" data-id="${p.id}">${icon("minus", 16)} Utiliser</button></div>` : ""}
    <label class="chk"><input type="checkbox" name="soon" ${p.soon ? "checked" : ""}> À consommer vite</label>
    <button class="btn primary full sheet-cta">Enregistrer</button>
    <button type="button" class="btn danger full" data-action="pantry-del" data-id="${p.id}">${icon("trash", 18)} Supprimer</button>
  </form>`, p.name);
}
/** Suppression sans confirmation, avec « Annuler » pendant 5 s. */
function deletePantryItem(id) {
  const i = state.pantry.findIndex(x => x.id === id);
  if (i < 0) return;
  const [item] = state.pantry.splice(i, 1);
  save(); closeSheet(); render();
  toast(`${item.name} supprimé`, { action: "Annuler", onAction: () => { state.pantry.splice(i, 0, item); save(); render(); } });
}

/* Glisser une ligne du placard vers la gauche pour la supprimer */
(() => {
  let row = null, fg = null, x0 = 0, y0 = 0, dx = 0, swiping = false;
  document.addEventListener("pointerdown", e => {
    const f = e.target.closest(".swipe-fg");
    if (!f || e.pointerType === "mouse" && e.button !== 0) return;
    row = f.closest(".swipe"); fg = f; x0 = e.clientX; y0 = e.clientY; dx = 0; swiping = false;
  });
  document.addEventListener("pointermove", e => {
    if (!fg) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!swiping && Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.5) { swiping = true; row.classList.add("swiping"); }
    if (!swiping) return;
    dx = Math.min(0, mx);
    fg.style.transform = `translateX(${dx}px)`;
  });
  const end = () => {
    if (!fg) return;
    const id = row.dataset.id, del = swiping && dx < -96;
    fg.style.transform = ""; row.classList.remove("swiping");
    if (swiping) { fg.dataset.swiped = "1"; setTimeout(() => { if (fg) delete fg.dataset.swiped; }, 50); }
    const f = fg; fg = null; row = null;
    if (del) deletePantryItem(id); else if (swiping) setTimeout(() => delete f.dataset.swiped, 50);
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);
})();

/* ---------- Onglet Idées de dernière minute ---------- */
function availability(r, ignoreBasics) {
  const missing = [];
  let total = 0, have = 0;
  for (const ing of r.ingredients) {
    if (ignoreBasics && isBasic(ing)) continue;
    total++;
    const b = isNum(ing.qty) ? toBase(ing.qty, ing.unit) : { q: null, u: "" };
    const p = findPantry(ing.name, b.u);
    if (!p) { missing.push(ing.name); continue; }
    if (!isNum(p.qty)) { have++; continue; }
    const pb = toBase(p.qty, p.unit);
    if (b.q === null || pb.u !== b.u) { if (pb.q > 0) have++; else missing.push(ing.name); continue; }
    if (pb.q >= b.q) have++;
    else missing.push(`${ing.name} (manque ${fmtQty(b.q - pb.q, b.u)})`);
  }
  return { missing, total, have };
}
function renderIdeas() {
  const o = ui.ideas;
  const head = `<div class="page-head"><div class="with-back">
      <button class="round-btn" data-action="goto" data-tab="pantry" aria-label="Retour au placard">${icon("chevronLeft", 22)}</button>
      <div><h1 id="h-ideas">Avec mon placard</h1><p class="sub">Recettes réalisables avec ce que tu as</p></div></div></div>`;
  if (!state.pantry.length) {
    $("#tab-ideas").innerHTML = head + `<div class="empty card">Renseigne d'abord ce que tu as à la maison.<br>
      <button class="btn primary" data-action="pantry-add-sheet">${icon("plus", 18)} Ajouter au placard</button></div>`;
    return;
  }
  const s = activeSeason();
  const res = state.recipes
    .filter(r => isDinner(r) && (!o.seasonOnly || r.seasons.includes(s)))
    .map(r => ({ r, a: availability(r, o.ignoreBasics) }))
    .filter(x => x.a.missing.length <= o.maxMissing)
    .sort((x, y) => x.a.missing.length - y.a.missing.length || (y.a.have / y.a.total) - (x.a.have / x.a.total));
  const card = ({ r, a }) => `<article class="card idea">
      <button class="dc-title" data-action="view" data-id="${r.id}">${esc(r.name)}</button>
      <div class="tags"><span class="tag">${esc(r.category)}</span>${r.meat ? `<span class="tag">Viande</span>` : ""}</div>
      <div class="progress" aria-hidden="true"><span style="width:${a.total ? Math.round(a.have / a.total * 100) : 100}%"></span></div>
      <p class="small ${a.missing.length ? "warn-text" : "ok-text"}">${a.missing.length ? `Il manque : ${a.missing.map(esc).join(", ")}` : "Tu as tout ce qu'il faut"}</p>
      <div class="toolbar tight">
        <button class="btn small primary" data-action="tonight" data-id="${r.id}">${icon("utensils", 16)} Pour ce soir</button>
        ${a.missing.length ? `<button class="btn small" data-action="missing-to-list" data-id="${r.id}">${icon("cart", 16)} Manquants à la liste</button>` : ""}
      </div>
    </article>`;
  const ready = res.filter(x => !x.a.missing.length), almost = res.filter(x => x.a.missing.length);
  $("#tab-ideas").innerHTML = head + `
    <div class="seg ideas-opts">
      <button aria-pressed="${o.ignoreBasics}" data-action="idea-opt" data-key="ignoreBasics">Ignorer sel, huiles et épices</button>
      <button aria-pressed="${o.seasonOnly}" data-action="idea-opt" data-key="seasonOnly">De saison uniquement</button>
    </div>
    <label class="inline-select">Il manque au plus
      <select data-idea="maxMissing">${[0, 1, 2, 3, 4, 5].map(n => `<option ${n === o.maxMissing ? "selected" : ""}>${n}</option>`).join("")}</select> ingrédient(s)</label>
    ${ready.length ? `<h2 class="section-title">Réalisables maintenant · ${ready.length}</h2><div class="cards">${ready.map(card).join("")}</div>` : ""}
    ${almost.length ? `<h2 class="section-title">Presque · ${almost.length}</h2><div class="cards">${almost.map(card).join("")}</div>` : ""}
    ${!res.length ? `<p class="empty">Aucune recette avec ces critères : augmente le nombre d'ingrédients manquants autorisés.</p>` : ""}`;
}

/* ---------- Onglet Historique ---------- */
/** Ordre pseudo-aléatoire stable pour la semaine (évite que la liste change à chaque affichage). */
const weeklyShuffle = (arr, salt) => arr.map(x => {
  let h = 0; for (const c of x.id + salt) h = (h * 31 + c.charCodeAt(0)) | 0;
  return [h, x];
}).sort((a, b) => a[0] - b[0]).map(x => x[1]);
function historyRow(r, meta) {
  return `<li class="h-row"><button class="row-item" data-action="view" data-id="${r.id}">
      <span class="grow"><span class="p-title">${esc(r.name)}</span><span class="meta">${esc(meta)}</span></span></button>
    <button class="btn small pill" data-action="add-next-free" data-id="${r.id}" aria-label="Ajouter ${esc(r.name)} au prochain jour libre">${icon("plus", 16)} Semaine</button></li>`;
}
function renderHistory() {
  const cur = thisWeek();
  const weeks = Object.entries(state.weeks).filter(([, w]) => w.days.some(Boolean) || (w.sides || []).length).sort((a, b) => b[0].localeCompare(a[0]));
  const limit = iso(addDays(parseIso(cur), -7 * 12));
  const counts = {};
  for (const [k, w] of weeks) if (k >= limit) w.days.forEach((id, i) => { if (id && w.cooked[i]) counts[id] = (counts[id] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).filter(([id]) => getRecipe(id));
  const s = activeSeason();
  const seasonal = state.recipes.filter(r => isDinner(r) && r.seasons.includes(s));
  const redo = seasonal.map(r => ({ r, d: lastCookedDate(r.id) }))
    .filter(x => x.d && weeksBetween(iso(mondayOf(parseIso(x.d))), cur) > RECENT_WEEKS)
    .sort((a, b) => a.d.localeCompare(b.d)).slice(0, 6);
  const discover = weeklyShuffle(seasonal.filter(r => !r.meat && !MANUAL_ONLY.includes(r.category) && !lastCookedDate(r.id)), cur).slice(0, 5);

  $("#tab-history").innerHTML = `
    <div class="page-head"><div><h1 id="h-history">Historique</h1><p class="sub">${weeks.length} semaine${weeks.length > 1 ? "s" : ""} planifiée${weeks.length > 1 ? "s" : ""}</p></div></div>
    <h2 class="section-title">À refaire pour varier · ${SEASON_LABELS[s]}</h2>
    ${redo.length ? `<ul class="list">${redo.map(({ r }) => historyRow(r, `Dernière fois : ${lastCookedLabel(r.id).toLowerCase()}`)).join("")}</ul>`
      : `<p class="hint">Les recettes déjà cuisinées et pas refaites depuis plus de ${RECENT_WEEKS} semaines apparaîtront ici.</p>`}
    <h2 class="section-title">À découvrir</h2>
    ${discover.length ? `<ul class="list">${discover.map(r => historyRow(r, `${r.category} · jamais cuisinée`)).join("")}</ul>` : `<p class="hint">Tu as déjà tout cuisiné en cette saison !</p>`}
    <h2 class="section-title">Les plus cuisinées · 12 dernières semaines</h2>
    ${top.length ? `<ul class="list">${top.map(([id, n]) => `<li><button class="row-item" data-action="view" data-id="${id}">
        <span class="grow p-title">${esc(getRecipe(id).name)}</span><span class="trail">${n} fois ${icon("chevronRight", 18)}</span></button></li>`).join("")}</ul>`
      : `<p class="hint">Marque un dîner comme cuisiné pour voir tes habitudes ici.</p>`}
    <h2 class="section-title">Semaines</h2>
    ${weeks.length ? `<ul class="list">${weeks.map(([k, w]) => {
      const names = w.days.map(id => id && getRecipe(id)).filter(Boolean).map(r => r.name);
      const done = w.cooked.filter(Boolean).length;
      return `<li><button class="row-item" data-action="open-week" data-week="${k}">
        <span class="grow"><span class="p-title">Semaine du ${frDate(parseIso(k), { day: "numeric", month: "long" })}${k === cur ? ` <span class="pill-new">En cours</span>` : ""}</span>
        <span class="meta">${names.length}/7 dîners${done ? ` · ${done} cuisiné${done > 1 ? "s" : ""}` : ""}${names.length ? " · " + esc(names.slice(0, 2).join(", ")) + (names.length > 2 ? "…" : "") : ""}</span></span>
        <span class="trail">${icon("chevronRight", 18)}</span></button></li>`;
    }).join("")}</ul>` : `<p class="hint">L'historique se remplit au fil des semaines planifiées.</p>`}
    <h2 class="section-title">Données</h2>
    <ul class="list">
      <li><button class="row-item" data-action="sync-settings"><span class="grow"><span class="p-title">Synchronisation Mac ↔ téléphone</span>
        <span class="meta">${esc(syncStatusText())}</span></span><span class="trail">${icon("chevronRight", 18)}</span></button></li>
      <li><button class="row-item" data-action="export-data"><span class="grow p-title">Exporter une sauvegarde (JSON)</span><span class="trail">${icon("download", 18)}</span></button></li>
      <li><button class="row-item" data-action="import-data"><span class="grow p-title">Importer une sauvegarde</span><span class="trail">${icon("upload", 18)}</span></button></li>
      <li><button class="row-item" data-action="reset-recipes"><span class="grow p-title">Restaurer les recettes de départ</span><span class="trail">${icon("refresh", 18)}</span></button></li>
      <li><button class="row-item danger-row" data-action="wipe-all"><span class="grow p-title">Tout effacer</span><span class="trail">${icon("trash", 18)}</span></button></li>
    </ul>`;
}
/** Ajoute une recette au prochain jour libre de la semaine à planifier (ou de la suivante). */
function addToNextFree(rid) {
  const r = getRecipe(rid);
  if (!r) return;
  if (!isDinner(r)) {
    const ws = defaultWeekStart(), w = ensureWeek(ws), id = uid();
    w.sides.push({ id, r: rid, c: false, l: null });
    save(); render();
    return toast(`${r.name} ajouté à la semaine`, { action: "Annuler", onAction: () => { w.sides = w.sides.filter(x => x.id !== id); save(); render(); } });
  }
  const todayIdx = (new Date().getDay() + 6) % 7;
  for (let k = 0; k < 2; k++) {
    const ws = iso(addDays(parseIso(defaultWeekStart()), 7 * k)), w = ensureWeek(ws);
    const from = ws === thisWeek() ? todayIdx : 0;
    for (let i = from; i < 7; i++) {
      if (w.days[i]) continue;
      w.days[i] = rid; w.cooked[i] = false;
      save(); render();
      const label = `${DAYS[i].toLowerCase()} ${addDays(parseIso(ws), i).getDate()}`;
      return toast(`Ajouté au ${label}`, { action: "Annuler", onAction: () => { w.days[i] = null; save(); render(); } });
    }
  }
  toast("Pas de jour libre sur les deux prochaines semaines");
}

/* ---------- Synchronisation (interface) ---------- */
function syncStatusText() {
  const t = Sync.lastSync ? ` (dernière synchro à ${Sync.lastSync.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })})` : "";
  switch (Sync.status) {
    case "off": return "Synchronisation désactivée : les données restent sur cet appareil.";
    case "pending": return "Modifications en attente d'envoi…";
    case "syncing": return "Synchronisation en cours…";
    case "ok": return `Synchronisé avec ${Sync.cfg.owner}/${Sync.cfg.repo}${t}`;
    case "offline": return `Hors ligne. ${Sync.message}`;
    default: return `Problème : ${Sync.message}`;
  }
}
function updateSyncBadge() {
  const b = $("#syncBadge");
  if (!b) return;
  const map = {
    off: ["cloudOff", "Synchronisation désactivée"], pending: ["cloud", "Synchronisation en attente"],
    syncing: ["refresh", "Synchronisation en cours"], ok: ["cloudCheck", "Synchronisé"],
    offline: ["cloudOff", "Hors ligne"], error: ["cloudAlert", "Échec de la synchronisation"]
  };
  const [ic, label] = map[Sync.status] || map.off;
  b.innerHTML = icon(ic, 22);
  b.dataset.state = Sync.status;
  b.setAttribute("aria-label", label);
  b.title = syncStatusText();
}
function openSyncSettings() {
  const c = Sync.cfg;
  const local = location.protocol === "file:";
  openModal(`
    <form id="syncForm" autocomplete="off">
      <div class="modal-head"><h2>Synchronisation</h2><button type="button" class="icon-btn" data-action="close" aria-label="Fermer">${icon("x", 22)}</button></div>
      <p class="small" id="syncState">${esc(syncStatusText())}</p>
      <p class="hint">Les données sont enregistrées dans un fichier d'un dépôt GitHub <strong>privé</strong>. Chaque appareil configuré (Mac, téléphone) lit et écrit ce fichier ; les modifications sont fusionnées automatiquement.</p>
      <label>Compte GitHub<input name="owner" value="${esc(c.owner || "")}" placeholder="ex : BCottereau" required autocapitalize="off"></label>
      <label>Dépôt privé des données<input name="repo" value="${esc(c.repo || "")}" placeholder="ex : menus-donnees" required autocapitalize="off"></label>
      <label>Fichier<input name="path" value="${esc(c.path || "menus.json")}" autocapitalize="off"></label>
      <label>Clé d'accès (fine-grained token)<input name="token" type="password" placeholder="${c.token ? "•••••••• (enregistrée — laisser vide pour la garder)" : "github_pat_…"}" ${c.token ? "" : "required"} autocapitalize="off" spellcheck="false"></label>
      <p class="hint">La clé reste uniquement dans ce navigateur. Créez-la sur github.com → Settings → Developer settings → Fine-grained tokens, limitée au seul dépôt des données, avec la permission « Contents : Read and write ».</p>
      <div class="modal-actions">
        ${Sync.enabled() ? `<button type="button" class="btn danger" data-action="sync-disable">Désactiver</button>
          <button type="button" class="btn" data-action="sync-now">Synchroniser maintenant</button>` : ""}
        <button type="submit" class="btn primary">Enregistrer et synchroniser</button>
      </div>
      ${Sync.enabled() ? `<div class="card add-to-week">
        <strong>Configurer le téléphone en un clic</strong>
        <p class="small">Copiez ce lien et ouvrez-le sur le téléphone (AirDrop, Notes…). Il contient votre clé : ne le partagez avec personne.</p>
        ${local ? `<p class="small warn-text">Vous utilisez la version ouverte depuis un fichier local : ouvrez plutôt l'adresse GitHub Pages pour que le lien fonctionne sur le téléphone.</p>` : ""}
        <button type="button" class="btn" data-action="sync-copy-link">${icon("copy", 18)} Copier le lien de configuration</button>
      </div>` : ""}
    </form>`);
}

/* ---------- Importer une recette collée (format JSON) ---------- */
function openPasteRecipe() {
  openModal(`
    <form id="pasteForm">
      <div class="modal-head"><h2>Coller une recette</h2><button type="button" class="icon-btn" data-action="close" aria-label="Fermer">${icon("x", 22)}</button></div>
      <p class="small">Collez ici le bloc de recette (format JSON) que Claude vous a préparé. Une recette avec le même identifiant est mise à jour.</p>
      <textarea name="json" rows="12" class="export-text" placeholder='{ "name": "…", "ingredients": [ ["farine T45", 250, "g", "fec"] ], "steps": ["…"] }' required></textarea>
      <div class="modal-actions"><button type="submit" class="btn primary">Importer</button></div>
    </form>`);
}
function normalizeRecipe(o) {
  if (!o || typeof o !== "object" || !o.name) throw new Error("Recette sans nom.");
  const ingIn = o.ingredients || o.ing || [];
  const ingredients = ingIn.map(i => {
    const [name, qty, unit, aisle] = Array.isArray(i) ? i : [i.name, i.qty, i.unit, i.aisle];
    return { name: String(name || "").trim(), qty: isNum(qty) ? +qty : null, unit: unit || "", aisle: AISLES[aisle] ? aisle : "epi" };
  }).filter(i => i.name);
  if (!ingredients.length) throw new Error(`« ${o.name} » : aucun ingrédient.`);
  const seasons = (o.seasons || []).filter(x => SEASON_LABELS[x]);
  return {
    id: String(o.id || uid()),
    name: String(o.name).trim(),
    category: String(o.category || "Légumineuses"),
    seasons: seasons.length ? seasons : ALL_SEASONS.slice(),
    meat: !!(o.meat || o.fish),
    cookeo: !!o.cookeo,
    cookeoNote: String(o.cookeoNote || ""),
    time: parseInt(o.time, 10) || 30,
    ingredients,
    steps: (o.steps || []).map(String).filter(Boolean),
    notes: String(o.notes || ""),
    source: String(o.source || ""),
    yield: String(o.yield || ""),
    seed: false
  };
}
function importPastedRecipes(form) {
  let list;
  try {
    const txt = form.json.value.trim().replace(/^```(json)?/i, "").replace(/```$/, "");
    const data = JSON.parse(txt);
    list = (Array.isArray(data) ? data : data.recipes || [data]).map(normalizeRecipe);
  } catch (e) {
    return alert("Impossible de lire la recette : " + e.message);
  }
  for (const r of list) {
    const i = state.recipes.findIndex(x => x.id === r.id);
    if (i >= 0) state.recipes[i] = r; else state.recipes.push(r);
  }
  save(); render();
  if (list.length === 1) viewRecipe(list[0].id); else closeModal();
  toast(`${list.length} recette(s) importée(s)`);
}

/* ------------------------------ Modale / toast --------------------------- */
const modal = $("#modal");
function openModal(html) {
  $("#modalBody").innerHTML = html;
  if (!modal.open) modal.showModal();
  $("#modalBody").scrollTop = 0;
}
function closeModal() { if (modal.open) modal.close(); }
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
modal.addEventListener("close", () => { ui.pickerDay = null; ui.pickerSide = false; });

const sheet = $("#sheet");
function openSheet(html, label = "Options") {
  $("#sheetBody").innerHTML = html;
  sheet.setAttribute("aria-label", label);
  if (!sheet.open) sheet.showModal();
}
function closeSheet() { if (sheet.open) sheet.close(); }
sheet.addEventListener("click", e => { if (e.target === sheet) closeSheet(); });

function openSeasonSheet() {
  const cur = prefs.season || "";
  const opts = [["", "Automatique", `selon la date : ${SEASON_LABELS[seasonOf()]}`]]
    .concat(Object.entries(SEASON_LABELS).map(([k, v]) => [k, v, ""]));
  openSheet(`<h2 id="seasonTitle">Saison</h2>
    <p class="hint">Utilisée pour le filtre « de saison » et les propositions de la semaine.</p>
    <ul class="action-list" role="radiogroup" aria-labelledby="seasonTitle">${opts.map(([k, v, d]) => `<li>
      <button role="radio" aria-checked="${k === cur}" data-action="set-season" data-season="${k}">
        <span>${v}${d ? `<span class="desc">${d}</span>` : ""}</span>${k === cur ? icon("check", 20) : ""}</button></li>`).join("")}</ul>`, "Choisir la saison");
}

let toastTimer;
/** Message bref ; avec opts.action (libellé) et opts.onAction, affiche un bouton (ex. « Annuler »). */
function toast(msg, opts = {}) {
  const t = $("#toast"), btn = $("#toastAction");
  $("#toastMsg").textContent = msg;
  if (opts.action) {
    btn.hidden = false; btn.textContent = opts.action;
    btn.onclick = () => { t.classList.remove("show"); opts.onAction(); };
  } else { btn.hidden = true; btn.onclick = null; }
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), opts.duration || (opts.action ? 5000 : 3800));
}

/* ------------------------------- Actions -------------------------------- */
const ACTIONS = {
  goto: el => { ui.tab = el.dataset.tab; closeModal(); render(); window.scrollTo(0, 0); },
  close: () => closeModal(),
  "week-prev": () => { ui.weekStart = iso(addDays(parseIso(ui.weekStart), -7)); render(); },
  "week-next": () => { ui.weekStart = iso(addDays(parseIso(ui.weekStart), 7)); render(); },
  "week-today": () => { ui.weekStart = defaultWeekStart(); render(); },
  "open-week": el => { ui.weekStart = el.dataset.week; ui.tab = "week"; render(); window.scrollTo(0, 0); },

  "pick-day": el => openPicker(+el.dataset.day),
  "pick-side": () => openPicker(null, true),
  "add-side": el => { addSide(el.dataset.id); closeModal(); toast("Ajouté à la semaine"); },
  "side-cooked": el => {
    const w = ensureWeek(ui.weekStart), x = w.sides.find(s => s.id === el.dataset.id);
    const r = x && getRecipe(x.r);
    if (!r) return;
    if (x.c) {
      if (!confirm("Annuler « fait » ? Les quantités déduites seront remises au placard.")) return;
      restoreToPantry(x.l); x.c = false; x.l = null;
    } else {
      const { log, msgs } = deductFromPantry(r);
      x.c = true; x.l = log;
      toast(msgs.length ? "Placard mis à jour : " + msgs.join(" · ") : "C'est noté");
    }
    save(); render();
  },
  "side-remove": el => {
    const w = ensureWeek(ui.weekStart), x = w.sides.find(s => s.id === el.dataset.id);
    if (!x) return;
    if (x.c) restoreToPantry(x.l);
    w.sides = w.sides.filter(s => s !== x);
    save(); render();
  },
  pick: el => {
    if (ui.pickerSide) { addSide(el.dataset.id); closeModal(); return; }
    ensureWeek(ui.weekStart).days[ui.pickerDay] = el.dataset.id;
    ensureWeek(ui.weekStart).cooked[ui.pickerDay] = false;
    save(); closeModal(); render();
  },
  "clear-day": el => {
    const w = ensureWeek(ui.weekStart), i = +el.dataset.day;
    if (w.cooked[i]) restoreToPantry(w.cookLog[i]);
    w.days[i] = null; w.cooked[i] = false; delete w.cookLog[i];
    save(); render();
  },
  "toggle-cooked": el => markCooked(+el.dataset.day),
  propose: () => proposeWeek(),
  "swap-day": el => swapDay(+el.dataset.day),
  "clear-week": () => {
    if (!confirm("Vider tous les dîners de cette semaine ?")) return;
    const w = ensureWeek(ui.weekStart);
    w.cooked.forEach((c, i) => c && restoreToPantry(w.cookLog[i]));
    Object.assign(w, blankWeek(), { extras: w.extras, sides: w.sides });
    save(); render();
  },

  view: el => viewRecipe(el.dataset.id),
  "new-recipe": () => editRecipe(null),
  "edit-recipe": el => editRecipe(el.dataset.id),
  "dup-recipe": el => editRecipe(el.dataset.id, true),
  "delete-recipe": el => {
    const r = getRecipe(el.dataset.id);
    if (!r || !confirm(`Supprimer « ${r.name} » ?`)) return;
    state.recipes = state.recipes.filter(x => x !== r);
    save(); closeModal(); render(); toast("Recette supprimée.");
  },
  "add-to-day": el => {
    const i = +$("#addDay").value;
    const w = ensureWeek(ui.weekStart);
    w.days[i] = el.dataset.id; w.cooked[i] = false;
    save(); closeModal(); render();
    toast(`Ajouté au ${DAYS[i].toLowerCase()}`);
  },
  "add-ing-row": () => $("#ingRows").insertAdjacentHTML("beforeend", ingRow()),
  "del-ing-row": el => el.closest(".ing-row").remove(),

  "copy-list": async () => toast(await copyText(shoppingText(ui.weekStart)) ? "Liste copiée" : "Copie impossible : utilise « Voir le texte »"),
  "share-list": async () => {
    try { await navigator.share({ title: "Liste de courses", text: shoppingText(ui.weekStart) }); } catch (e) { /* annulé */ }
  },
  "download-list": () => downloadFile(`courses-${ui.weekStart}.txt`, shoppingText(ui.weekStart), "text/plain;charset=utf-8"),
  "show-text": () => openModal(`<div class="modal-head"><h2>Liste en texte</h2><button class="icon-btn" data-action="close" aria-label="Fermer">${icon("x", 22)}</button></div>
      <textarea class="export-text" readonly rows="18">${esc(shoppingText(ui.weekStart))}</textarea>
      <p class="hint">Sélectionnez le texte puis copiez-le.</p>`),
  "toggle-covered": () => { ui.showCovered = !ui.showCovered; render(); },
  "uncheck-all": () => { ensureWeek(ui.weekStart).checked = {}; save(); render(); },
  "del-extra": (el, e) => {
    e.preventDefault();
    const w = ensureWeek(ui.weekStart);
    w.extras = w.extras.filter(x => x.id !== el.dataset.id);
    save(); render();
  },
  "stock-checked": () => {
    const ws = ui.weekStart, w = ensureWeek(ws);
    const items = computeShopping(ws).toBuy.filter(it => w.checked[it.key]);
    if (!items.length) return toast("Coche d'abord les articles achetés");
    if (!confirm(`Ranger ${items.length} article(s) acheté(s) au placard ?\nIls seront déduits quand un dîner sera marqué « cuisiné ».`)) return;
    items.forEach(it => {
      if (it.extra) {
        const v = parseQtyUnit(it.qtyText);
        addToPantry(it.name, v ? v.qty : null, v ? v.unit : "", true, it.aisle);
        w.extras = w.extras.filter(x => x.id !== it.id);
      } else addToPantry(it.name, it.qty, it.unit, true, it.aisle);
      delete w.checked[it.key];
    });
    save(); render(); toast("Courses rangées au placard");
  },

  "pantry-add-sheet": () => openPantryAddSheet(),
  "idea-opt": el => { ui.ideas[el.dataset.key] = !ui.ideas[el.dataset.key]; renderIdeas(); },
  "pantry-open": el => { if (el.dataset.swiped) return; openPantryEditSheet(el.dataset.id); },
  "pantry-quick": el => { addToPantry(el.dataset.name, null, ""); save(); render(); openPantryAddSheet(); toast(`${el.dataset.name} ajouté`); },
  "pantry-del": el => deletePantryItem(el.dataset.id),
  "pantry-use": el => {
    const p = state.pantry.find(x => x.id === el.dataset.id);
    const f = $("#pantryEditForm");
    if (!p || !f) return;
    const v = parseQtyUnit(f.used.value, p.unit);
    if (!v || v.qty === null) return toast("Indique la quantité utilisée, ex : 400");
    const used = toBase(v.qty, v.unit), pb = toBase(p.qty, p.unit);
    if (used.u !== pb.u) return toast(`Unité incompatible avec ${fmtQty(p.qty, p.unit)}`);
    p.qty = Math.max(0, pb.q - used.q); p.unit = pb.u; p.opened = true;
    save(); render(); openPantryEditSheet(p.id);
    toast(`${p.name} : ${p.qty > 0 ? fmtQty(p.qty, p.unit) + " restant" : "épuisé"}`);
  },
  "recipes-for-soon": () => {
    const names = state.pantry.filter(p => p.soon).map(p => p.name);
    Object.assign(ui.filters.recipes, { q: "", season: "", cat: "", meat: "", cookeo: false, quick: false, ings: names });
    ui.tab = "recipes"; render(); window.scrollTo(0, 0);
  },
  "pantry-clear-empty": () => { state.pantry = state.pantry.filter(p => !(isNum(p.qty) && +p.qty <= 0)); save(); render(); },

  tonight: el => {
    const ws = thisWeek(), i = (new Date().getDay() + 6) % 7;
    const w = ensureWeek(ws);
    if (w.days[i] && w.days[i] !== el.dataset.id && getRecipe(w.days[i])
      && !confirm(`Remplacer « ${getRecipe(w.days[i]).name} » prévu ce soir ?`)) return;
    w.days[i] = el.dataset.id; w.cooked[i] = false;
    ui.weekStart = ws; ui.tab = "week";
    save(); closeModal(); render(); window.scrollTo(0, 0);
    toast("Ajouté à ce soir");
  },
  "missing-to-list": el => {
    const r = getRecipe(el.dataset.id);
    const ws = thisWeek(), w = ensureWeek(ws);
    let n = 0;
    for (const ing of r.ingredients) {
      if (ui.ideas.ignoreBasics && isBasic(ing)) continue;
      const b = isNum(ing.qty) ? toBase(ing.qty, ing.unit) : { q: null, u: "" };
      const p = findPantry(ing.name, b.u);
      let need = null;
      if (!p) need = b.q;
      else if (isNum(p.qty) && b.q !== null && toBase(p.qty, p.unit).u === b.u && toBase(p.qty, p.unit).q < b.q) need = b.q - toBase(p.qty, p.unit).q;
      else continue;
      w.extras.push({ id: uid(), name: ing.name, qty: need !== null ? fmtQty(need, b.u) : "", aisle: ing.aisle || "div" });
      n++;
    }
    save(); toast(`${n} article(s) ajouté(s) à la liste de cette semaine.`);
  },

  "season-sheet": () => openSeasonSheet(),
  "add-next-free": el => addToNextFree(el.dataset.id),
  "close-sheet": () => closeSheet(),
  "filter-sheet": el => openFilterSheet(el.dataset.scope),
  "chip-toggle": el => { const f = ui.filters[el.dataset.scope]; f[el.dataset.key] = !f[el.dataset.key]; refreshFilters(el.dataset.scope); },
  "chip-clear": el => { const f = ui.filters[el.dataset.scope]; f[el.dataset.key] = el.dataset.key === "ings" ? [] : ""; refreshFilters(el.dataset.scope); },
  "set-filter": el => { ui.filters[el.dataset.scope][el.dataset.key] = el.dataset.value; refreshFilters(el.dataset.scope); },
  "reset-filters": el => {
    const f = ui.filters[el.dataset.scope];
    Object.assign(f, { season: el.dataset.scope === "picker" ? "current" : "", cat: "", meat: "", cookeo: false, quick: false, ings: [] });
    refreshFilters(el.dataset.scope);
  },
  "set-season": el => {
    prefs.season = el.dataset.season || "";
    if (!prefs.season) delete prefs.season;
    savePrefs(); closeSheet(); render();
    toast(prefs.season ? `Saison : ${SEASON_LABELS[prefs.season]}` : "Saison automatique");
  },
  "paste-recipe": () => openPasteRecipe(),
  "sync-settings": () => openSyncSettings(),
  "sync-now": () => Sync.syncNow(),
  "sync-copy-link": async () => {
    if (!Sync.enabled()) return toast("Enregistrez d'abord la configuration.");
    toast(await copyText(Sync.configLink()) ? "Lien copié : ouvrez-le sur votre téléphone (envoyez-le-vous par AirDrop ou Notes)." : "Copie impossible.");
  },
  "sync-disable": () => {
    if (!confirm("Désactiver la synchronisation sur cet appareil ? Les données restent sur l'appareil et dans GitHub.")) return;
    Sync.disable(); closeModal(); render();
  },
  "export-data": () => downloadFile(`menus-sauvegarde-${iso(new Date())}.json`, JSON.stringify(state, null, 1), "application/json"),
  "import-data": () => $("#importFile").click(),
  "reset-recipes": () => {
    if (!confirm("Restaurer les recettes de départ ?\nVos modifications sur ces recettes seront perdues ; vos propres recettes sont conservées.")) return;
    state.recipes = seedRecipes().concat(state.recipes.filter(r => !r.seed));
    save(); render(); toast("Recettes de départ restaurées.");
  },
  "wipe-all": () => {
    if (!confirm("Effacer TOUTES les données (recettes, plannings, placard) ?" + (Sync.enabled() ? "\nAttention : l'effacement sera aussi appliqué sur vos autres appareils synchronisés." : ""))) return;
    state = Store.fresh(); save(); render(); toast("Données réinitialisées.");
  }
};

/* ---------------------------- Écouteurs globaux ------------------------- */
document.addEventListener("click", e => {
  const tabBtn = e.target.closest("#tabs button");
  if (tabBtn) { ui.tab = tabBtn.dataset.tab; render(); window.scrollTo(0, 0); return; }
  const el = e.target.closest("[data-action]");
  if (!el || !ACTIONS[el.dataset.action]) return;
  if (el.tagName === "BUTTON" && el.type === "submit" && !el.form) e.preventDefault();
  ACTIONS[el.dataset.action](el, e);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && sheet.open) { e.preventDefault(); closeSheet(); }
});

document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.filter) {
    const scope = t.dataset.scope;
    ui.filters[scope][t.dataset.filter] = t.type === "checkbox" ? t.checked : t.value;
    if (t.dataset.filter === "q") (scope === "picker" ? renderPickerList : renderRecipeList)();
    else refreshFilters(scope);
  } else if (t.dataset.idea) {
    ui.ideas[t.dataset.idea] = t.type === "checkbox" ? t.checked : +t.value;
    renderIdeas();
  } else if (t.id === "extraName") {
    const sel = $("#extraAisle");
    if (sel && !sel.dataset.manual) {
      sel.value = t.value.trim() ? guessAisle(t.value) : "div";
      $("#aisleAuto").hidden = !t.value.trim();
    }
  } else if (t.id === "pantrySearch") {
    ui.pantryQ = t.value;
    const pos = t.selectionStart;
    renderPantry();
    const s = $("#pantrySearch"); if (s) { s.focus(); s.setSelectionRange(pos, pos); }
  }
});

document.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.check !== undefined) {
    const w = ensureWeek(ui.weekStart);
    if (t.checked) w.checked[t.dataset.check] = true; else delete w.checked[t.dataset.check];
    save(); renderShopping();
  } else if (t.id === "extraAisle") {
    t.dataset.manual = "1"; $("#aisleAuto").hidden = true;
  } else if (t.name === "iname") {
    // Rayon (et unité) devinés automatiquement
    const row = t.closest(".ing-row");
    const k = matchKey(t.value);
    let known = null;
    for (const r of state.recipes) { known = r.ingredients.find(i => matchKey(i.name) === k); if (known) break; }
    row.querySelector("[name=iaisle]").value = known ? known.aisle : guessAisle(t.value);
    if (known) row.querySelector("[name=iunit]").value = known.unit;
  } else if (t.id === "importFile" && t.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.recipes)) throw new Error("format");
        if (!confirm("Remplacer toutes les données actuelles par celles du fichier ?")) return;
        state = Store.migrate(data); save(); render(); toast("Données importées");
      } catch (err) { alert("Fichier invalide."); }
      t.value = "";
    };
    reader.readAsText(t.files[0]);
  }
});

document.addEventListener("submit", e => {
  const f = e.target;
  if (f.id === "recipeForm") { e.preventDefault(); saveRecipeForm(f); }
  else if (f.id === "pasteForm") { e.preventDefault(); importPastedRecipes(f); }
  else if (f.id === "syncForm") {
    e.preventDefault();
    const fd = new FormData(f);
    Sync.saveCfg({ owner: fd.get("owner"), repo: fd.get("repo"), path: fd.get("path"), token: fd.get("token") || Sync.cfg.token });
    if (!Sync.enabled()) return alert("Renseignez le compte, le dépôt et la clé d'accès.");
    Sync.syncNow().then(() => { if (modal.open && $("#syncForm")) openSyncSettings(); });
  }
  else if (f.id === "pantryForm") {
    e.preventDefault();
    const fd = new FormData(f);
    const raw = String(fd.get("qty")).trim();
    const q = raw ? parseFloat(raw.replace(",", ".")) : null;
    if (raw && isNaN(q)) return toast("Quantité non reconnue (ex : 1 ou 1,5)");
    const unit = q !== null ? (fd.get("unit") || "pièce") : "";
    const name = String(fd.get("name")).trim();
    addToPantry(name, q, unit);
    if (fd.get("soon")) { const p = state.pantry.find(x => matchKey(x.name) === matchKey(name)); if (p) p.soon = true; }
    save(); render(); closeSheet();
    toast(`${name} ajouté au placard`);
  } else if (f.id === "pantryEditForm") {
    e.preventDefault();
    const p = state.pantry.find(x => x.id === f.dataset.id);
    if (!p) return closeSheet();
    const raw = f.qty.value.trim();
    if (!raw || !f.unit.value) { p.qty = null; p.unit = ""; }
    else {
      const v = parseFloat(raw.replace(",", "."));
      if (isNaN(v)) return toast("Quantité non reconnue (ex : 1 ou 1,5)");
      const b = toBase(v, f.unit.value); p.qty = b.q; p.unit = b.u;
    }
    if (f.soon.checked) p.soon = true; else delete p.soon;
    save(); render(); closeSheet();
    toast(`${p.name} mis à jour`);
  } else if (f.id === "extraForm") {
    e.preventDefault();
    const fd = new FormData(f);
    const name = fd.get("name").trim(), aisle = fd.get("aisle") || guessAisle(name);
    ensureWeek(ui.weekStart).extras.push({ id: uid(), name, qty: fd.get("qty").trim(), aisle });
    save(); render();
    toast(`${name} : rayon ${AISLES[aisle]}`);
  }
});

/* -------------------------------- Démarrage ------------------------------ */
let renderPending = false;
/** Ré-affiche après une synchro, sans perturber une saisie en cours. */
function safeRender() {
  const a = document.activeElement;
  if (a && a.closest && a.closest("main") && a.matches("input, textarea, select")) { renderPending = true; return; }
  render();
  if (modal.open && ui.pickerDay !== null) renderPickerList();
}
document.addEventListener("focusout", () => setTimeout(() => { if (renderPending) { renderPending = false; safeRender(); } }, 50));

document.querySelectorAll("[data-icon]").forEach(el => { el.innerHTML = icon(el.dataset.icon, 24); });
$("#brandIcon").innerHTML = icon("utensils", 20);

Store.afterSave = () => Sync.schedule();
Store.save(state);
render();
Sync.init({
  get: () => state,
  set: s => { state = s; Store.saveSynced(state); safeRender(); },
  onStatus: () => {
    updateSyncBadge();
    if (ui.tab === "history" && !modal.open) renderHistory();
    const st = $("#syncState");
    if (st) st.textContent = syncStatusText();
  }
});
