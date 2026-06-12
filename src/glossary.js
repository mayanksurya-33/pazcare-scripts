(function (global) {
  'use strict';

  var DEFAULTS = {
    container: '#paz-gloss-container',
    data: [],
    summaryField: 'summary',
    fallbackFields: ['meta-description', 'metaDescription', 'meta_description'],
    slugBase: '/glossary/',
    readMoreText: 'Read More',
    showReadMore: true,
    includeDrafts: false,
    includeArchived: false,
    accordion: true,
    defaultOpen: 'none',
    icons: {
      xWhite: 'https://cdn.prod.website-files.com/6145f7146a1337faae24d53f/69e9f8c22d61bca1a3175b18_Vector%20(5).svg',
      xBlack: 'https://cdn.prod.website-files.com/6145f7146a1337faae24d53f/69de0d5958b581d59a83e089_Vector%20(4).svg',
      arrow:  'https://cdn.prod.website-files.com/6145f7146a1337faae24d53f/69d511e39e1be6e9c01ebf96_Frame%20(5).svg'
    }
  };

  function el(tag, className, attrs) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function pickText(fd, cfg) {
    if (!fd) return '';
    var v = fd[cfg.summaryField];
    if (v != null && String(v).trim() !== '') return String(v).trim();
    for (var i = 0; i < cfg.fallbackFields.length; i++) {
      var f = fd[cfg.fallbackFields[i]];
      if (f != null && String(f).trim() !== '') return String(f).trim();
    }
    return '';
  }

  function normalize(items, cfg) {
    return items.filter(function (it) {
      if (!it) return false;
      if (!cfg.includeDrafts && it.isDraft) return false;
      if (!cfg.includeArchived && it.isArchived) return false;
      var fd = it.fieldData || it;
      return (fd.name || '').trim() !== '';
    }).map(function (it) {
      var fd = it.fieldData || it;
      return {
        name: (fd.name || '').trim(),
        slug: (fd.slug || '').trim(),
        summary: pickText(fd, cfg)
      };
    });
  }

  function letterOf(name) {
    var c = name.charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : '#';
  }

  function groupByLetter(items) {
    var map = {};
    items.forEach(function (it) {
      var k = letterOf(it.name);
      (map[k] = map[k] || []).push(it);
    });
    Object.keys(map).forEach(function (k) {
      map[k].sort(function (a, b) { return a.name.localeCompare(b.name); });
    });
    return map;
  }

  function sortedKeys(map) {
    return Object.keys(map).sort(function (a, b) {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
  }

  function buildCard(item, cfg) {
    var card = el('div', 'paz-glossary-card');

    var h = el('h1', 'heading-style-h5');
    h.textContent = item.name;
    card.appendChild(h);

    if (item.summary) {
      var p = el('p', 'text-size-regular text-color-gray');
      p.textContent = item.summary;
      card.appendChild(p);
    }

    if (cfg.showReadMore && item.slug) {
      var a = el('a', 'paz-link text-color-primary w-inline-block',
                { href: cfg.slugBase + item.slug });
      var flex = el('div', 'flex sb');
      var label = el('p', 'text-size-regular');
      label.textContent = cfg.readMoreText;
      var arrow = el('img', null, { src: cfg.icons.arrow, loading: 'lazy', alt: '' });
      flex.appendChild(label);
      flex.appendChild(arrow);
      a.appendChild(flex);
      card.appendChild(a);
    }
    return card;
  }

  function buildGroup(letter, items, cfg, isFirst) {
    var state = cfg.defaultOpen === 'all'                ? 'open'
              : (cfg.defaultOpen === 'first' && isFirst) ? 'open'
              : 'closed';

    var elem = el('div', 'paz-gloss-elem', { 'data-state': state });

    var head = el('div', 'paz-gloss-heading-wrap');
    var h4 = el('h4', 'heading-style-h4 paz-faq-heading');
    h4.textContent = letter;

    var btn = el('div', 'paz-faq-btn-wrapper');
    btn.appendChild(el('img', 'paz-faq-x-icon white', { src: cfg.icons.xWhite, loading: 'lazy', alt: '' }));
    btn.appendChild(el('img', 'paz-faq-x-icon black', { src: cfg.icons.xBlack, loading: 'lazy', alt: '' }));

    head.appendChild(h4);
    head.appendChild(btn);

    var content = el('div', 'paz-gloss-content');
    items.forEach(function (it) { content.appendChild(buildCard(it, cfg)); });

    elem.appendChild(head);
    elem.appendChild(content);
    return elem;
  }

  function wireAccordion(container) {
    if (container.__pazWired) return;
    container.__pazWired = true;
    container.addEventListener('click', function (e) {
      var head = e.target.closest('.paz-gloss-heading-wrap');
      if (!head || !container.contains(head)) return;
      var elem = head.closest('.paz-gloss-elem');
      if (!elem) return;
      elem.setAttribute('data-state',
        elem.getAttribute('data-state') === 'open' ? 'closed' : 'open');
    });
  }

  function render(userCfg) {
    var cfg = {};
    Object.keys(DEFAULTS).forEach(function (k) { cfg[k] = DEFAULTS[k]; });
    Object.keys(userCfg || {}).forEach(function (k) {
      cfg[k] = (k === 'icons')
        ? Object.assign({}, DEFAULTS.icons, userCfg.icons)
        : userCfg[k];
    });

    var container = typeof cfg.container === 'string'
      ? document.querySelector(cfg.container)
      : cfg.container;
    if (!container) { console.warn('[PazGlossary] container not found:', cfg.container); return; }

    var items   = normalize(cfg.data || [], cfg);
    var grouped = groupByLetter(items);
    var keys    = sortedKeys(grouped);

    container.innerHTML = '';
    keys.forEach(function (letter, i) {
      container.appendChild(buildGroup(letter, grouped[letter], cfg, i === 0));
    });

    if (cfg.accordion) wireAccordion(container);
    return { letters: keys, rendered: items.length };
  }

  // Wire the standalone toggle used by non-renderer glossary elements
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.paz-gloss-elem').forEach(function (faq) {
      faq.addEventListener('click', function () {
        var isOpen = this.getAttribute('data-state') === 'open';
        this.setAttribute('data-state', isOpen ? 'closed' : 'open');
      });
    });
  });

  global.PazGlossary = { render: render };
})(window);
