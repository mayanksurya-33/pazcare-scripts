/* PazTabs — reusable tabs engine (index-matched).
   Buttons and panels are paired by ORDER — no ids, no data attributes:
     <div class="paz-tabs">
       <div class="paz-tab-nav">
         <a class="paz-tab">Plans</a>      // 1st button -> 1st panel
         <a class="paz-tab">Claims</a>     // 2nd button -> 2nd panel
       </div>
       <div class="paz-tab-panel">…</div>  // 1st panel
       <div class="paz-tab-panel">…</div>  // 2nd panel
     </div>

   Tabs are .paz-tab inside the group; panels are .paz-tab-panel inside the
   group. The Nth tab shows the Nth panel — just keep them in the same order.
   Panels can sit anywhere inside the group as long as their order matches.

   First tab opens by default — or mark one button with data-paz-default.
   Arrow keys move between tabs (Home/End jump to the ends).

   API: PazTabs.open(index [, group])  — activate a tab by its 0-based index.
          group: optional .paz-tabs element or selector (defaults to the first
          tabs group on the page).
        PazTabs.refresh()             — re-scan the DOM (after injecting tabs).

   Style everything in your own CSS — the script only adds an `is-active` class
   to the active tab + panel (style it as you wish) and toggles panel
   visibility. The only built-in visual is a short fade-in on the panel,
   applied via inline styles so no stylesheet is required.
*/
(function () {
  "use strict";

  const GROUP_SELECTOR = ".paz-tabs";
  const TAB_SELECTOR = ".paz-tab";
  const PANEL_SELECTOR = ".paz-tab-panel";
  const NAV_SELECTOR = ".paz-tab-nav";
  const ACTIVE_CLASS = "is-active";
  const FADE_MS = 220;

  let gid = 0; // group counter — used to mint aria ids when none are present

  // Elements matching `sel` that belong to THIS group — not ones nested in a
  // child .paz-tabs group. Document order is preserved, which is exactly what
  // index matching relies on.
  function scopedAll(group, sel) {
    return [...group.querySelectorAll(sel)].filter(
      (el) => el.closest(GROUP_SELECTOR) === group,
    );
  }

  const tabsIn = (group) => scopedAll(group, TAB_SELECTOR);
  const panelsIn = (group) => scopedAll(group, PANEL_SELECTOR);

  // Hide a panel with an INLINE display:none. The `hidden` attribute alone
  // isn't enough — it only sets display:none via the UA stylesheet, which any
  // display rule on the panel's own classes (e.g. Webflow's flex/grid) beats,
  // leaving the "hidden" panel rendered on top as an empty box. An inline
  // style wins over class rules, so this actually hides it.
  function hidePanel(panel) {
    panel.hidden = true;
    panel.style.display = "none";
  }

  // Fade a panel in via inline styles (no stylesheet needed). `animate` is
  // false on the initial sweep so the default panel just appears.
  function showPanel(panel, animate) {
    panel.hidden = false;
    panel.style.display = ""; // restore the panel's own (Webflow) display value
    if (!animate) {
      panel.style.opacity = "";
      panel.style.transform = "";
      panel.style.transition = "";
      return;
    }
    panel.style.transition = "none";
    panel.style.opacity = "0";
    panel.style.transform = "translateY(6px)";
    // next frame: flip on the transition so it actually animates
    requestAnimationFrame(function () {
      panel.style.transition =
        "opacity " + FADE_MS + "ms ease, transform " + FADE_MS + "ms ease";
      panel.style.opacity = "1";
      panel.style.transform = "translateY(0)";
    });
  }

  // Activate the tab at `idx` within `group`, deactivating the rest. The Nth
  // tab is paired with the Nth panel.
  //   opts.animate — fade the panel in (skipped on the initial sweep).
  //   opts.focus   — move focus to the tab (true for keyboard nav; false for
  //                  clicks/programmatic so the page doesn't jump/scroll).
  function activate(group, idx, opts) {
    opts = opts || {};
    const tabs = tabsIn(group);
    const panels = panelsIn(group);
    tabs.forEach((t, i) => {
      const panel = panels[i];
      const on = i === idx;
      t.classList.toggle(ACTIVE_CLASS, on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.setAttribute("tabindex", on ? "0" : "-1");
      if (panel) {
        panel.classList.toggle(ACTIVE_CLASS, on);
        if (on) showPanel(panel, opts.animate);
        else hidePanel(panel);
      }
    });
    if (opts.focus && tabs[idx]) tabs[idx].focus();
    group.dispatchEvent(
      new CustomEvent("paz:tab:change", {
        bubbles: true,
        detail: { index: idx },
      }),
    );
  }

  // Public: open a tab by its 0-based index. `groupRef` is an optional
  // .paz-tabs element or selector; defaults to the first tabs group on the page.
  function open(index, groupRef) {
    const group =
      typeof groupRef === "string"
        ? document.querySelector(groupRef)
        : groupRef || document.querySelector(GROUP_SELECTOR);
    if (!group) return;
    if (tabsIn(group)[index]) activate(group, index, { animate: true });
  }

  function setupGroup(group) {
    if (group.dataset.pazTabsReady === "1") return;
    group.dataset.pazTabsReady = "1";

    const tabs = tabsIn(group);
    const panels = panelsIn(group);
    if (!tabs.length) return;
    if (tabs.length !== panels.length) {
      console.warn(
        "PazTabs: " + tabs.length + " tabs but " + panels.length +
          " panels — pair them 1:1 (extras are ignored)",
        group,
      );
    }

    const nav = group.querySelector(NAV_SELECTOR);
    if (nav) nav.setAttribute("role", "tablist");

    const base = "paz-tabs-" + gid++;
    tabs.forEach((btn, i) => {
      const panel = panels[i];
      btn.setAttribute("role", "tab");
      if (!btn.id) btn.id = base + "-tab-" + i;
      if (panel) {
        panel.setAttribute("role", "tabpanel");
        if (!panel.id) panel.id = base + "-panel-" + i;
        btn.setAttribute("aria-controls", panel.id);
        panel.setAttribute("aria-labelledby", btn.id);
      }
    });

    // Initial tab: explicit data-paz-default, else a pre-set is-active, else
    // the first tab.
    let initial = tabs.findIndex((t) => t.hasAttribute("data-paz-default"));
    if (initial === -1)
      initial = tabs.findIndex((t) => t.classList.contains(ACTIVE_CLASS));
    if (initial === -1) initial = 0;
    activate(group, initial, { animate: false });
  }

  function moveFocus(group, fromTab, dir) {
    const tabs = tabsIn(group);
    const i = tabs.indexOf(fromTab);
    if (i === -1) return;
    let target;
    if (dir === "home") target = 0;
    else if (dir === "end") target = tabs.length - 1;
    else target = (i + dir + tabs.length) % tabs.length;
    activate(group, target, { animate: true, focus: true });
  }

  document.addEventListener("click", function (e) {
    const tab = e.target.closest(TAB_SELECTOR);
    if (!tab) return;
    const group = tab.closest(GROUP_SELECTOR);
    if (!group) return;
    e.preventDefault();
    activate(group, tabsIn(group).indexOf(tab), { animate: true });
  });

  document.addEventListener("keydown", function (e) {
    const tab = e.target.closest(TAB_SELECTOR);
    if (!tab) return;
    const group = tab.closest(GROUP_SELECTOR);
    if (!group) return;
    const map = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
      Home: "home",
      End: "end",
    };
    const dir = map[e.key];
    if (dir === undefined) return;
    e.preventDefault();
    moveFocus(group, tab, dir);
  });

  function refresh() {
    document.querySelectorAll(GROUP_SELECTOR).forEach(setupGroup);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }

  window.PazTabs = { open: open, refresh: refresh };
})();
