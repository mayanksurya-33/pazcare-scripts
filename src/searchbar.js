(function () {
  "use strict";

  var DEFAULTS = {
    apiBase: "https://webflow-cms-api-ten.vercel.app",
    fields: ["name", "slug"],
    ttl: 10 * 60 * 1000,
  };

  // Resolve once the selector exists in the DOM (handles late/injected elements).
  function waitForEl(selector, timeout) {
    return new Promise(function (resolve) {
      var el = document.querySelector(selector);
      if (el) return resolve(el);
      var obs = new MutationObserver(function () {
        var found = document.querySelector(selector);
        if (found) { obs.disconnect(); resolve(found); }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(function () {
        obs.disconnect();
        resolve(document.querySelector(selector));
      }, timeout || 10000);
    });
  }

  // ----------------------------------------------------------------------
  // Data layer: fetch once, cache in localStorage
  // ----------------------------------------------------------------------

  function cacheKey(cfg) {
    return "wfcms:" + cfg.collection + ":" + cfg.fields.join(",");
  }

  function readCache(key, ttl) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > ttl) return null;
      return parsed.items;
    } catch (e) {
      return null;
    }
  }

  function writeCache(key, items) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), items: items }));
    } catch (e) {}
  }

  function loadCollection(cfg) {
    var key = cacheKey(cfg);
    var cached = readCache(key, cfg.ttl);
    if (cached) return Promise.resolve(cached);

    var url =
      cfg.apiBase +
      "/api/search/" +
      encodeURIComponent(cfg.collection) +
      "?all=1&fields=" +
      encodeURIComponent(cfg.fields.join(","));

    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("WebflowCMS: HTTP " + res.status + " loading " + cfg.collection);
        return res.json();
      })
      .then(function (json) {
        var items = (json.data && json.data.items) || [];
        writeCache(key, items);
        return items;
      });
  }

  // ----------------------------------------------------------------------
  // Search layer: filters the cached items entirely in the browser
  // ----------------------------------------------------------------------

  function CMSSearch(opts) {
    this.input = document.querySelector(opts.input);
    this.results = document.querySelector(opts.results);
    if (!this.input || !this.results) {
      console.warn("WebflowCMS: search input/results element not found", opts.input, opts.results);
      return;
    }

    this.title = opts.title;
    this.url = opts.url;
    this.minQuery = opts.minQuery || 2;
    this.debounceMs = opts.debounce != null ? opts.debounce : 120;
    this.maxResults = opts.maxResults || 50;
    this.activeIndex = -1;
    this.timer = null;

    var self = this;
    this.records = (opts.items || []).map(function (item) {
      var text = opts.searchFields
        ? opts.searchFields
            .map(function (f) {
              return (item.fieldData && item.fieldData[f]) || "";
            })
            .join(" ")
        : self.title(item);
      return { title: self.title(item), url: self.url(item), haystack: String(text).toLowerCase() };
    });

    this.input.placeholder = this.input.placeholder || "Search...";
    this.input.setAttribute("role", "combobox");
    this.input.setAttribute("aria-autocomplete", "list");
    this.input.setAttribute("aria-expanded", "false");
    this.results.setAttribute("role", "listbox");

    this.bind();
  }

  CMSSearch.prototype.bind = function () {
    var self = this;

    this.input.addEventListener("input", function (e) {
      self.activeIndex = -1;
      var q = e.target.value.trim();
      clearTimeout(self.timer);
      if (q.length < self.minQuery) return self.hide();
      self.timer = setTimeout(function () {
        self.render(self.query(q), q);
      }, self.debounceMs);
    });

    this.input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        self.move(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        self.move(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        var items = self.items();
        if (self.activeIndex >= 0 && items[self.activeIndex]) {
          window.location.href = items[self.activeIndex].href;
        }
      } else if (e.key === "Escape") {
        self.hide();
      }
    });

    document.addEventListener("click", function (e) {
      if (!self.results.contains(e.target) && !self.input.contains(e.target)) self.hide();
    });
  };

  CMSSearch.prototype.query = function (q) {
    var needle = q.toLowerCase();
    var hits = [];
    for (var i = 0; i < this.records.length && hits.length < this.maxResults; i++) {
      var idx = this.records[i].haystack.indexOf(needle);
      if (idx !== -1) hits.push({ rec: this.records[i], idx: idx });
    }
    hits.sort(function (a, b) {
      return a.idx - b.idx || a.rec.title.localeCompare(b.rec.title);
    });
    return hits.map(function (h) {
      return h.rec;
    });
  };

  CMSSearch.prototype.items = function () {
    return this.results.querySelectorAll(".search-result-item");
  };

  CMSSearch.prototype.move = function (delta) {
    var items = this.items();
    if (!items.length) return;
    this.activeIndex = (this.activeIndex + delta + items.length) % items.length;
    for (var i = 0; i < items.length; i++) {
      var on = i === this.activeIndex;
      items[i].classList.toggle("is-active", on);
      if (on) items[i].scrollIntoView({ block: "nearest" });
    }
  };

  CMSSearch.prototype.escape = function (t) {
    var d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
  };

  CMSSearch.prototype.highlight = function (text, q) {
    var safe = this.escape(text);
    var rx = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
    return safe.replace(rx, '<span class="highlight">$1</span>');
  };

  CMSSearch.prototype.render = function (results, q) {
    if (!results.length) {
      this.results.innerHTML =
        '<div class="search-no-results"><div class="no-results-icon">🔍</div>' +
        '<div class="no-results-title">No results found</div>' +
        '<div class="no-results-subtitle">Try different keywords.</div></div>';
    } else {
      var self = this;
      var stats =
        '<div class="search-stats"><div class="search-stats-left"><span>Found ' +
        results.length +
        " result" +
        (results.length !== 1 ? "s" : "") +
        "</span></div></div>";
      var html = results
        .map(function (r, i) {
          return (
            '<a href="' +
            self.escape(r.url) +
            '" id="wfcms-result-' +
            i +
            '" class="search-result-item" role="option">' +
            self.highlight(r.title, q) +
            "</a>"
          );
        })
        .join("");
      this.results.innerHTML = stats + html;
      this.items().forEach(function (el, i) {
        el.addEventListener("click", function () {
          self.hide();
        });
        el.addEventListener("mouseenter", function () {
          self.activeIndex = i;
        });
      });
    }
    this.results.style.display = "block";
    this.input.setAttribute("aria-expanded", "true");
  };

  CMSSearch.prototype.hide = function () {
    this.results.style.display = "none";
    this.input.setAttribute("aria-expanded", "false");
    this.activeIndex = -1;
  };

  // ----------------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------------

  var WebflowCMS = {
    init: function (config) {
      var cfg = {};
      for (var k in DEFAULTS) cfg[k] = DEFAULTS[k];
      for (var c in config) cfg[c] = config[c];

      cfg.title = cfg.title || function (i) { return i.fieldData.name; };
      cfg.url = cfg.url || function (i) {
        return window.location.pathname.replace(/\/+$/, "") + "/" + i.fieldData.slug;
      };

      return loadCollection(cfg)
        .then(function (items) {
          if (cfg.saveTo) window[cfg.saveTo] = items;

          if (cfg.search) {
            waitForEl(cfg.search.input).then(function () {
              new CMSSearch(
                Object.assign({ items: items, title: cfg.title, url: cfg.url }, cfg.search)
              );
            });
          }

          if (typeof cfg.onLoad === "function") cfg.onLoad(items);
          return items;
        })
        .catch(function (err) {
          console.error("WebflowCMS.init failed:", err);
          return [];
        });
    },
  };

  window.WebflowCMS = WebflowCMS;
})();
