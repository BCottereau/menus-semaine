/* =====================================================================
   Synchronisation Mac ↔ téléphone via un dépôt GitHub privé
   ---------------------------------------------------------------------
   Les données sont stockées dans un fichier JSON (par défaut menus.json)
   d'un dépôt privé, lu et écrit avec l'API GitHub et une clé d'accès
   personnelle (fine-grained token limité à ce seul dépôt).
   La clé reste uniquement dans le navigateur de chaque appareil.
   ===================================================================== */

function b64encodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decodeUtf8(b64) {
  const bin = atob(String(b64).replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

const Sync = {
  KEY: "menus-sync-v1",
  DEBOUNCE_MS: 2500,
  POLL_MS: 120000,
  cfg: {},
  status: "off",
  message: "",
  lastSync: null,
  timer: null,
  running: false,
  again: false,
  hooks: {},

  init(hooks) {
    this.hooks = hooks;
    this.cfg = this.loadCfg();
    this.readConfigLink();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") this.syncNow();
    });
    window.addEventListener("online", () => this.syncNow());
    setInterval(() => { if (document.visibilityState === "visible") this.syncNow(); }, this.POLL_MS);
    if (this.enabled()) this.syncNow(); else this.setStatus("off");
  },

  enabled() { return !!(this.cfg.owner && this.cfg.repo && this.cfg.token); },
  loadCfg() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch (e) { return {}; }
  },
  saveCfg(c) {
    this.cfg = {
      owner: String(c.owner || "").trim(),
      repo: String(c.repo || "").trim(),
      path: String(c.path || "menus.json").trim() || "menus.json",
      token: String(c.token || "").trim()
    };
    try { localStorage.setItem(this.KEY, JSON.stringify(this.cfg)); } catch (e) { /* ignore */ }
  },
  disable() {
    this.cfg = {};
    try { localStorage.removeItem(this.KEY); } catch (e) { /* ignore */ }
    this.setStatus("off");
  },

  /** Lien à ouvrir sur le téléphone pour y recopier la configuration. */
  configLink() {
    const payload = b64encodeUtf8(JSON.stringify(this.cfg));
    return location.origin + location.pathname + "#config=" + encodeURIComponent(payload);
  },
  readConfigLink() {
    const m = location.hash.match(/^#config=(.+)$/);
    if (!m) return;
    history.replaceState(null, "", location.pathname + location.search); // retire la clé de l'adresse
    try {
      const c = JSON.parse(b64decodeUtf8(decodeURIComponent(m[1])));
      if (c.owner && c.repo && c.token
        && confirm(`Activer la synchronisation avec le dépôt ${c.owner}/${c.repo} sur cet appareil ?`)) {
        this.saveCfg(c);
      }
    } catch (e) {
      alert("Lien de configuration invalide.");
    }
  },

  setStatus(status, message = "") {
    this.status = status;
    this.message = message;
    if (this.hooks.onStatus) this.hooks.onStatus();
  },

  /** Appelé après chaque modification locale. */
  schedule() {
    if (!this.enabled()) return;
    clearTimeout(this.timer);
    if (!this.running) this.setStatus("pending");
    this.timer = setTimeout(() => this.syncNow(), this.DEBOUNCE_MS);
  },

  url() {
    const path = this.cfg.path.split("/").map(encodeURIComponent).join("/");
    return `https://api.github.com/repos/${encodeURIComponent(this.cfg.owner)}/${encodeURIComponent(this.cfg.repo)}/contents/${path}`;
  },
  headers() {
    return {
      Authorization: `Bearer ${this.cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  },
  errorText(status) {
    if (status === 401) return "Clé d'accès invalide ou expirée.";
    if (status === 403) return "Accès refusé : la clé doit avoir le droit « Contents : Read and write » sur ce dépôt.";
    if (status === 404) return "Dépôt introuvable, ou la clé n'y a pas accès.";
    return `Erreur GitHub (${status}).`;
  },

  async fetchRemote() {
    const res = await fetch(`${this.url()}?t=${Date.now()}`, { headers: this.headers(), cache: "no-store" });
    if (res.status === 404) return { data: null, sha: null };
    if (!res.ok) throw new Error(this.errorText(res.status));
    const j = await res.json();
    if (!j.content) {
      if (j.size > 0) throw new Error("Fichier de données trop volumineux (plus de 1 Mo).");
      return { data: null, sha: j.sha };
    }
    let data;
    try { data = JSON.parse(b64decodeUtf8(j.content)); } catch (e) { throw new Error(`Le fichier ${this.cfg.path} du dépôt n'est pas un JSON valide.`); }
    return { data: normalizeState(data), sha: j.sha };
  },

  /** Envoie l'état ; renvoie false si le fichier a changé entre-temps (conflit). */
  async pushRemote(state, sha) {
    const device = /iPhone|iPad|Android/i.test(navigator.userAgent) ? "téléphone" : "ordinateur";
    const body = {
      message: `Menus : mise à jour depuis ${device}`,
      content: b64encodeUtf8(JSON.stringify(state, null, 1) + "\n")
    };
    if (sha) body.sha = sha;
    const res = await fetch(this.url(), {
      method: "PUT",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.status === 409 || res.status === 422) return false;
    if (!res.ok) throw new Error(this.errorText(res.status));
    return true;
  },

  async syncNow() {
    if (!this.enabled()) return;
    clearTimeout(this.timer);
    if (!navigator.onLine) {
      this.setStatus("offline", "Hors ligne : les modifications seront envoyées au retour de la connexion.");
      return;
    }
    if (this.running) { this.again = true; return; }
    this.running = true;
    this.setStatus("syncing");
    try {
      let done = false;
      for (let attempt = 0; attempt < 4 && !done; attempt++) {
        const remote = await this.fetchRemote();
        const merged = mergeStates(this.hooks.get(), remote.data);
        if (!remote.data || canonical(merged) !== canonical(remote.data)) {
          if (!(await this.pushRemote(merged, remote.sha))) continue; // conflit : on recommence
        }
        // Applique localement, en gardant ce qui a été modifié pendant l'échange
        const current = this.hooks.get();
        const finalState = mergeStates(current, merged);
        if (canonical(finalState) !== canonical(current)) this.hooks.set(finalState);
        if (canonical(finalState) !== canonical(merged)) this.again = true;
        done = true;
      }
      if (!done) throw new Error("Conflit persistant avec un autre appareil, nouvel essai bientôt.");
      this.lastSync = new Date();
      this.setStatus("ok");
    } catch (e) {
      const offline = e instanceof TypeError; // fetch impossible (réseau)
      this.setStatus(offline ? "offline" : "error", offline ? "Connexion impossible, nouvel essai plus tard." : e.message);
    } finally {
      this.running = false;
      if (this.again) { this.again = false; this.schedule(); }
    }
  }
};
