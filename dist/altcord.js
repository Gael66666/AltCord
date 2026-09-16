(() => {
  const prefix = "altcord";
  const safeStorage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(`${prefix}:${key}`);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`${prefix}:${key}`, JSON.stringify(value));
      } catch {
        // Discord can disable storage in a restricted renderer. Runtime features
        // still work for the current session in that case.
      }
    }
  };
  const styles = new Map();
  const plugins = new Map();
  const enabled = new Set(safeStorage.get("enabled", []));
  const settings = safeStorage.get("settings", {});
  let ready = false;

  const messageFor = error => error instanceof Error ? error.message : String(error);
  const dispatch = name => document.dispatchEvent(new Event(`altcord:${name}`));
  const notify = (message, tone = "normal") => {
    const toast = document.createElement("div");
    toast.className = `altcord-toast ${tone}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.append(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 180);
    }, 2600);
  };

  const api = {
    version: "0.3.0",
    settings: {
      get(pluginId, key, fallback) {
        return settings[pluginId]?.[key] ?? fallback;
      },
      set(pluginId, key, value) {
        settings[pluginId] ??= {};
        settings[pluginId][key] = value;
        safeStorage.set("settings", settings);
        dispatch("settings-changed");
      }
    },
    styles: {
      add(id, css) {
        this.remove(id);
        if (!css?.trim()) return;
        const style = document.createElement("style");
        style.dataset.altcordStyle = id;
        style.textContent = css;
        document.head.append(style);
        styles.set(id, style);
      },
      remove(id) {
        styles.get(id)?.remove();
        styles.delete(id);
      }
    },
    plugins: {
      register(plugin) {
        if (!plugin?.id || typeof plugin.start !== "function") {
          throw new Error("Un plugin AltCord doit fournir id et start().");
        }
        if (plugins.has(plugin.id)) {
          throw new Error(`Le plugin ${plugin.id} est déjà enregistré.`);
        }
        const record = {
          category: "Autre",
          description: "Plugin sans description.",
          ...plugin,
          cleanup: null,
          error: null
        };
        plugins.set(record.id, record);
        if (ready && enabled.has(record.id)) this.enable(record.id);
      },
      list() {
        return [...plugins.values()].map(({ id, name, description, category, cleanup, error }) => ({
          id,
          name,
          description,
          category,
          enabled: Boolean(cleanup),
          error
        }));
      },
      enable(id) {
        const plugin = plugins.get(id);
        if (!plugin || plugin.cleanup) return false;
        plugin.error = null;
        try {
          const cleanup = plugin.start(api);
          plugin.cleanup = typeof cleanup === "function" ? cleanup : () => {};
          enabled.add(id);
          safeStorage.set("enabled", [...enabled]);
          dispatch("plugins-changed");
          notify(`${plugin.name} activé`);
          return true;
        } catch (error) {
          plugin.cleanup = null;
          plugin.error = messageFor(error);
          enabled.delete(id);
          safeStorage.set("enabled", [...enabled]);
          dispatch("plugins-changed");
          notify(`${plugin.name} n’a pas pu être activé`, "error");
          console.error(`[AltCord] plugin ${id}`, error);
          return false;
        }
      },
      disable(id) {
        const plugin = plugins.get(id);
        if (!plugin?.cleanup) return false;
        try {
          plugin.cleanup();
        } catch (error) {
          plugin.error = messageFor(error);
          console.error(`[AltCord] nettoyage du plugin ${id}`, error);
        } finally {
          plugin.cleanup = null;
          enabled.delete(id);
          safeStorage.set("enabled", [...enabled]);
          dispatch("plugins-changed");
        }
        notify(`${plugin.name} désactivé`);
        return true;
      },
      toggle(id) {
        return plugins.get(id)?.cleanup ? this.disable(id) : this.enable(id);
      }
    },
    ui: {
      notify,
      openSettings: () => document.querySelector("#altcord-settings")?.showModal()
    }
  };

  const html = value => {
    const element = document.createElement("span");
    element.textContent = value ?? "";
    return element.innerHTML;
  };

  function mountSettings() {
    if (document.querySelector("#altcord-settings")) return;
    const launcher = document.createElement("button");
    launcher.id = "altcord-launcher";
    launcher.type = "button";
    launcher.title = "Ouvrir les paramètres AltCord";
    launcher.setAttribute("aria-label", "Ouvrir les paramètres AltCord");
    launcher.textContent = "◈";

    const dialog = document.createElement("dialog");
    dialog.id = "altcord-settings";
    dialog.innerHTML = `<section class="ac-shell">
      <aside>
        <div class="ac-brand"><span>◈</span><div><b>AltCord</b><small>Paramètres</small></div></div>
        <nav aria-label="Navigation AltCord">
          <button class="active" data-page="plugins" type="button">Plugins</button>
          <button data-page="themes" type="button">Thèmes</button>
          <button data-page="about" type="button">À propos</button>
        </nav>
        <footer>v${api.version}<br>Tout reste local.</footer>
      </aside>
      <main>
        <header><div><p class="ac-eyebrow">ALTCORD</p><h2 id="ac-title">Plugins</h2><p id="ac-summary" class="ac-summary"></p></div><button class="ac-close" aria-label="Fermer" type="button">×</button></header>
        <section id="ac-plugins" class="ac-page">
          <input id="ac-search" type="search" placeholder="Rechercher un plugin" aria-label="Rechercher un plugin">
          <div id="ac-categories"></div><div id="ac-plugin-list"></div>
        </section>
        <section id="ac-themes" class="ac-page" hidden>
          <p class="ac-copy">Ajoute ton thème CSS. Il reste local et s’applique uniquement dans Discord.</p>
          <label class="ac-css-label">CSS personnel<textarea id="ac-css" placeholder="/* Mon thème */\n:root { --brand-500: #7289da; }"></textarea></label>
          <button id="ac-apply-css" class="ac-primary" type="button">Appliquer le CSS</button>
        </section>
        <section id="ac-about" class="ac-page" hidden>
          <h3>AltCord est indépendant</h3>
          <p class="ac-copy">Ce runtime ne demande, ne lit ni n’envoie aucun token Discord.</p>
          <p class="ac-copy">Les plugins sont isolés : une erreur n’empêche pas les autres de fonctionner.</p>
        </section>
      </main>
    </section>`;

    document.body.append(launcher, dialog);
    const title = dialog.querySelector("#ac-title");
    const summary = dialog.querySelector("#ac-summary");
    const search = dialog.querySelector("#ac-search");
    const categories = dialog.querySelector("#ac-categories");
    const list = dialog.querySelector("#ac-plugin-list");
    let category = "Tous";

    function render() {
      const all = api.plugins.list();
      const query = search.value.trim().toLowerCase();
      const visible = all.filter(plugin =>
        (category === "Tous" || plugin.category === category) &&
        `${plugin.name} ${plugin.description}`.toLowerCase().includes(query)
      );
      const groups = ["Tous", ...new Set(all.map(plugin => plugin.category))];
      const active = all.filter(plugin => plugin.enabled).length;
      summary.textContent = `${active} actif${active > 1 ? "s" : ""} · ${all.length} installé${all.length > 1 ? "s" : ""}`;
      categories.innerHTML = groups.map(group =>
        `<button type="button" data-category="${html(group)}" class="${group === category ? "selected" : ""}">
          ${html(group)} <span>${group === "Tous" ? all.length : all.filter(plugin => plugin.category === group).length}</span>
        </button>`
      ).join("");
      list.innerHTML = visible.length ? visible.map(plugin => `
        <article class="ac-plugin ${plugin.error ? "has-error" : ""}">
          <div><span class="ac-category">${html(plugin.category)}</span><h3>${html(plugin.name)}</h3>
          <p>${html(plugin.description)}</p>${plugin.error ? `<p class="ac-error">Erreur : ${html(plugin.error)}</p>` : ""}</div>
          <label class="ac-switch"><span class="sr-only">${html(plugin.name)}</span>
            <input type="checkbox" data-plugin="${html(plugin.id)}" ${plugin.enabled ? "checked" : ""}><i></i>
          </label>
        </article>`).join("") : `<p class="ac-empty">Aucun plugin ne correspond à cette recherche.</p>`;
    }

    launcher.onclick = () => { dialog.showModal(); render(); };
    dialog.querySelector(".ac-close").onclick = () => dialog.close();
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    dialog.querySelector("nav").onclick = event => {
      const page = event.target.dataset.page;
      if (!page) return;
      dialog.querySelectorAll("nav button").forEach(button => button.classList.toggle("active", button.dataset.page === page));
      dialog.querySelectorAll(".ac-page").forEach(section => { section.hidden = section.id !== `ac-${page}`; });
      title.textContent = event.target.textContent;
      if (page === "plugins") render();
    };
    search.oninput = render;
    categories.onclick = event => {
      const button = event.target.closest("button");
      if (button) { category = button.dataset.category; render(); }
    };
    list.onchange = event => { if (event.target.dataset.plugin) api.plugins.toggle(event.target.dataset.plugin); };
    const css = dialog.querySelector("#ac-css");
    css.value = api.settings.get("custom-css", "css", "");
    dialog.querySelector("#ac-apply-css").onclick = () => {
      api.settings.set("custom-css", "css", css.value);
      api.styles.add("custom-css", css.value);
      if (!api.plugins.list().find(plugin => plugin.id === "custom-css")?.enabled) api.plugins.enable("custom-css");
      notify("CSS appliqué");
    };
    document.addEventListener("altcord:plugins-changed", render);
    document.addEventListener("keydown", event => { if (event.key === "Escape" && dialog.open) dialog.close(); });
  }

  window.AltCord = api;
  window.addEventListener("altcord:ready", () => {
    const startRuntime = () => {
      if (ready) return;
      ready = true;
      enabled.forEach(id => api.plugins.enable(id));
      mountSettings();
      dispatch("mounted");
    };
    if (document.body) startRuntime();
    else document.addEventListener("DOMContentLoaded", startRuntime, { once: true });
  }, { once: true });
  api.styles.add("base", `.altcord-toast{position:fixed;right:20px;bottom:20px;z-index:1000000;padding:10px 14px;border-radius:8px;background:#5865f2;color:#fff;font:600 14px system-ui;opacity:0;transform:translateY(8px);transition:.18s}.altcord-toast.error{background:#d4475d}.altcord-toast.visible{opacity:1;transform:none}#altcord-launcher{position:fixed;right:18px;top:72px;z-index:1000000;width:36px;height:36px;border:0;border-radius:50%;background:#5865f2;color:#fff;font-size:21px;cursor:pointer;box-shadow:0 4px 15px #0006}#altcord-settings{width:min(930px,calc(100vw - 36px));height:min(650px,calc(100vh - 36px));max-height:none;padding:0;border:1px solid #303a59;border-radius:12px;background:#141827;color:#f4f5fb;font:14px system-ui}#altcord-settings::backdrop{background:#000a}.ac-shell{height:100%;display:grid;grid-template-columns:220px 1fr}.ac-shell aside{padding:22px 12px;border-right:1px solid #303a59;background:#101321}.ac-brand{display:flex;gap:10px;align-items:center;padding:0 10px 24px}.ac-brand>span{display:grid;place-items:center;width:31px;height:31px;border-radius:9px;background:#5865f2;font-size:18px}.ac-brand b,.ac-brand small{display:block}.ac-brand small,.ac-shell footer,.ac-copy,.ac-plugin p{color:#a7b0c8}.ac-shell nav{display:grid;gap:4px}.ac-shell nav button{border:0;border-radius:6px;padding:9px 10px;background:transparent;color:#b5bfd8;text-align:left;font:inherit;cursor:pointer}.ac-shell nav button.active,.ac-shell nav button:hover{background:#252c44;color:#fff}.ac-shell footer{position:absolute;bottom:22px;font-size:11px;padding:0 10px}.ac-shell main{padding:28px;overflow:auto}.ac-shell main header{display:flex;justify-content:space-between;align-items:start;margin-bottom:20px}.ac-eyebrow{margin:0;color:#99a8ff;font-size:10px;font-weight:800;letter-spacing:1.3px}.ac-shell h2{margin:2px 0 0;font-size:27px}.ac-summary{margin:3px 0 0;color:#a7b0c8;font-size:12px}.ac-close{border:0;background:transparent;color:#c3cae0;font-size:25px;cursor:pointer}.ac-page[hidden]{display:none}#ac-search{width:100%;padding:11px 12px;border:1px solid #38425f;border-radius:7px;background:#0e1120;color:#fff;font:inherit;outline:none}#ac-categories{display:flex;flex-wrap:wrap;gap:7px;margin:14px 0}#ac-categories button{border:1px solid #35405c;border-radius:20px;padding:5px 9px;background:#1b2133;color:#c3cbe0;font:12px system-ui;cursor:pointer}#ac-categories button.selected{border-color:#7181ff;background:#28335c;color:#fff}.ac-plugin{display:flex;justify-content:space-between;gap:20px;padding:15px;border-bottom:1px solid #2b334d}.ac-plugin.has-error{border-left:2px solid #d4475d}.ac-plugin h3{margin:4px 0;font-size:15px}.ac-plugin p{max-width:550px;margin:0;font-size:12px}.ac-category{color:#aab6ff;font-size:10px;font-weight:800;letter-spacing:.7px}.ac-error{color:#ff9aa9!important;margin-top:7px!important}.ac-switch input{display:none}.ac-switch i{display:block;width:38px;height:22px;border-radius:12px;background:#39415a;cursor:pointer}.ac-switch i::after{content:"";display:block;width:16px;height:16px;margin:3px;border-radius:50%;background:#fff;transition:.15s}.ac-switch input:checked+i{background:#5865f2}.ac-switch input:checked+i::after{transform:translateX(16px)}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.ac-css-label{display:block;font-weight:700}.ac-css-label textarea{display:block;width:100%;min-height:250px;margin-top:8px;padding:12px;border:1px solid #38425f;border-radius:7px;background:#0e1120;color:#fff;font:12px ui-monospace,monospace;resize:vertical}.ac-primary{margin-top:12px;border:0;border-radius:7px;padding:10px 14px;background:#5865f2;color:#fff;font-weight:700;cursor:pointer}.ac-empty{color:#a7b0c8}@media(max-width:650px){#altcord-settings{width:100vw;height:100vh;border:0;border-radius:0}.ac-shell{grid-template-columns:1fr}.ac-shell aside{height:auto;padding:12px;border-right:0;border-bottom:1px solid #303a59}.ac-brand{padding:0}.ac-shell nav{display:flex;margin-top:10px}.ac-shell footer{display:none}.ac-shell main{padding:18px}}`);
})();

window.AltCord.plugins.register( {
  id: "compact",
  name: "Messages compacts",
  category: "Apparence",
  description: "Réduit l'espacement vertical entre les messages.",
  start(AltCord) { AltCord.styles.add("compact", ".altcord-compact [class*=messageListItem]{padding-top:2px!important;padding-bottom:2px!important}"); document.documentElement.classList.add("altcord-compact"); return () => { document.documentElement.classList.remove("altcord-compact"); AltCord.styles.remove("compact"); }; }
});
window.AltCord.plugins.register( {
  id: "timestamps",
  name: "Heure locale",
  category: "Chat",
  description: "Ajoute une heure lisible à côté des messages chargés.",
  start() {
    const decorate = root => root.querySelectorAll?.("time[datetime]").forEach(time => {
      if (time.dataset.altcordTimestamp) return;
      const date = new Date(time.dateTime); if (Number.isNaN(date.valueOf())) return;
      const label = document.createElement("span"); label.className = "altcord-timestamp"; label.textContent = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      time.dataset.altcordTimestamp = "1"; time.after(label);
    });
    decorate(document); const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => node.nodeType === 1 && decorate(node))));
    observer.observe(document.body, { childList: true, subtree: true }); return () => { observer.disconnect(); document.querySelectorAll(".altcord-timestamp").forEach(node => node.remove()); document.querySelectorAll("time[data-altcord-timestamp]").forEach(node => delete node.dataset.altcordTimestamp); };
  }
});
window.AltCord.plugins.register( {
  id: "custom-css",
  name: "CSS personnel",
  category: "Apparence",
  description: "Applique le CSS enregistré dans la console AltCord.",
  start(AltCord) { const css = AltCord.settings.get("custom-css", "css", ""); if (css) AltCord.styles.add("custom-css", css); return () => AltCord.styles.remove("custom-css"); }
});
window.AltCord.plugins.register( {
  id: "hide-typing", name: "Masquer l’indicateur de saisie", category: "Chat",
  description: "Cache le texte indiquant qu’une personne est en train d’écrire.",
  start(AltCord) { AltCord.styles.add("hide-typing", "[class*=typing]{display:none!important}"); return () => AltCord.styles.remove("hide-typing"); }
});
window.AltCord.plugins.register( {
  id: "hide-gifts", name: "Masquer les cadeaux", category: "Apparence",
  description: "Retire les boutons cadeaux de l’interface de discussion.",
  start(AltCord) { AltCord.styles.add("hide-gifts", "[aria-label*=gift i],[aria-label*=cadeau i]{display:none!important}"); return () => AltCord.styles.remove("hide-gifts"); }
});
window.AltCord.plugins.register( {
  id: "hide-new-bar", name: "Masquer la barre de nouveaux messages", category: "Chat",
  description: "Cache la barre qui indique les nouveaux messages non lus.",
  start(AltCord) { AltCord.styles.add("hide-new-bar", "[class*=newMessagesBar]{display:none!important}"); return () => AltCord.styles.remove("hide-new-bar"); }
});
window.AltCord.plugins.register( {
  id: "relaxed-chat", name: "Discussion aérée", category: "Apparence",
  description: "Augmente légèrement l’espacement et la lisibilité des messages.",
  start(AltCord) { AltCord.styles.add("relaxed-chat", "[class*=messageListItem]{margin:3px 0!important}[class*=markup]{line-height:1.55!important}"); return () => AltCord.styles.remove("relaxed-chat"); }
});
window.dispatchEvent(new Event("altcord:ready"));
