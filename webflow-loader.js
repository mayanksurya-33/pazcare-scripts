/* ============================================================
   PAZCARE COMPONENT LOADER  (version registry + on-demand loader)

   Load on every page via ONE tag in Webflow → Project Settings →
   Custom Code → FOOTER:
     <script src="<host>/webflow-loader.js"></script>

   Runs on every page, but only downloads a component when a page
   asks for it via pazUse(). Your per-page config stays on the page.

   TO SHIP A FIX: bump that component's version below
   (e.g. carousel "1.0" -> "1.1") and republish the loader.
   ============================================================ */
(() => {
  "use strict";

  // ---- single source of truth: one version per component ----
  const VERSIONS = {
    carousel:  "1.0",
    modal:     "1.0",
    searchbar: "1.0",
    glossary:  "1.0",
    tabs:      "1.0",
    slider:    "1.0",
  };

  const BASE    = "https://cdn.jsdelivr.net/gh/mayanksurya-33/pazcare-scripts@main/dist/";
  const HAS_CSS = { modal: true, searchbar: true, glossary: true, slider: true }; // carousel & tabs ship no CSS

  const loaded = {};   // name -> true once its JS has executed
  const queue  = {};   // name -> array of init callbacks waiting on it

  const url = (name, ext) => `${BASE}${name}.min.${ext}?v=${VERSIONS[name] || "1.0"}`;

  // run every init callback queued for a component (after its JS is ready)
  const run = (name) => {
    (queue[name] || []).forEach((fn) => {
      try { fn(); } catch (e) { console.error(`[paz] init error for ${name}`, e); }
    });
    queue[name] = [];
  };

  const ensureCSS = (name) => {
    if (!HAS_CSS[name] || document.querySelector(`link[data-paz="${name}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url(name, "css");
    link.dataset.paz = name;
    document.head.appendChild(link);
  };

  const ensureJS = (name) => {
    if (loaded[name]) { run(name); return; }
    if (document.querySelector(`script[data-paz="${name}"]`)) return; // already loading
    const script = document.createElement("script");
    script.src = url(name, "js");
    script.dataset.paz = name;
    script.onload = () => { loaded[name] = true; run(name); };
    document.head.appendChild(script);
  };

  // ---- the only API a page needs ----
  //   pazUse("carousel", () => initSlider(el, { visible: 3, gap: 32, ... }));
  //   pazUse("modal");   // self-initializing components need no callback
  window.pazUse = (name, init) => {
    if (!VERSIONS[name]) { console.warn(`[paz] unknown component: ${name}`); return; }
    if (init) (queue[name] = queue[name] || []).push(init);
    ensureCSS(name);
    ensureJS(name);
    if (loaded[name]) run(name);
  };
})();
