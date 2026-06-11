// --------------------------------
// SELECTORS & CLASSES — edit here
// --------------------------------
const WRAP_SELECTOR = ".paz-carousel-wrap";
const TRACK_SELECTOR = ".paz-carousel-track";
const LIST_SELECTOR = ".paz-carousel-list";
const SLIDES_SELECTOR = ".paz-carousel-slide";
const DOTS_SELECTOR = ".paz-carousel-dots-container";
const DOT_CLASS = "paz-carousel-dot";
const DOT_FILL_CLASS = "paz-carousel-dot-fill";
const DOT_ACTIVE_CLASS = "is-active";
// --------------------------------

function initSlider(wrapEl, config) {
  const wrap = wrapEl;
  const trackWrap = wrap.querySelector(TRACK_SELECTOR);
  const track = wrap.querySelector(LIST_SELECTOR);
  const slides = [...wrap.querySelectorAll(SLIDES_SELECTOR)];
  const dotsWrap = wrap.querySelector(DOTS_SELECTOR);
  const prevBtn = wrap.querySelector('[data-carousel-btn="prev"]');
  const nextBtn = wrap.querySelector('[data-carousel-btn="next"]');
  const total = slides.length;

  // Only hide arrows if config.arrow is false
  if (!config.arrow) {
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
  }

  if (!trackWrap || !track) {
    console.warn("Slider init failed: missing track or list inside", wrapEl);
    return;
  }

  let current = 0;
  let autoTimer = null;
  let fillTimer = null;
  let touchStartX = 0;
  let touchCurrentX = 0;
  let touchDragging = false;
  let currentOffset = 0;

  function getActiveConfig() {
    if (!config.breakpoints) return config;
    const sorted = Object.keys(config.breakpoints)
      .map(Number)
      .sort((a, b) => a - b);
    for (const bp of sorted) {
      if (window.innerWidth <= bp) {
        return { ...config, ...config.breakpoints[bp] };
      }
    }
    return config;
  }

  function maxVisible() {
    if (!config.breakpoints) return config.visible;
    const bpValues = Object.values(config.breakpoints).map(
      (b) => b.visible || config.visible,
    );
    return Math.max(config.visible, ...bpValues);
  }

  function slideWidth() {
    const { visible, gap } = getActiveConfig();
    return (trackWrap.offsetWidth - gap * (visible - 1)) / visible;
  }

  function setWidths() {
    const { gap } = getActiveConfig();
    const sw = slideWidth();
    wrap.querySelectorAll(SLIDES_SELECTOR).forEach((s) => {
      s.style.width = sw + "px";
      s.style.marginRight = gap + "px";
    });
  }

  function setupInfinite() {
    const cloneCount = maxVisible();
    const cloneStart = slides.slice(-cloneCount).map((s) => s.cloneNode(true));
    const cloneEnd = slides.slice(0, cloneCount).map((s) => s.cloneNode(true));
    cloneStart.forEach((c) => track.insertBefore(c, track.firstChild));
    cloneEnd.forEach((c) => track.appendChild(c));
  }

  function getOffset(idx) {
    const { visible, gap } = getActiveConfig();
    return (config.infinite ? idx + visible : idx) * (slideWidth() + gap);
  }

  function goTo(idx, animate = true) {
    const { speed } = getActiveConfig();
    track.style.transition = animate ? `transform ${speed}ms ease` : "none";
    currentOffset = getOffset(idx);
    track.style.transform = `translateX(-${currentOffset}px)`;
  }

  function loopCheck() {
    if (!config.infinite) return;
    if (current < 0) {
      current = total - 1;
      goTo(current, false);
    } else if (current >= total) {
      current = 0;
      goTo(current, false);
    }
  }

  function next() {
    current++;
    goTo(current);
  }
  function prev() {
    current--;
    goTo(current);
  }

  function startDotFill() {
    const { autoPlay } = getActiveConfig();
    if (!autoPlay || !dotsWrap) return;
    clearInterval(fillTimer);

    const idx = ((current % total) + total) % total;
    const activeDot = dotsWrap.querySelectorAll("." + DOT_CLASS)[idx];
    if (!activeDot) return;

    const fillEl = activeDot.querySelector("." + DOT_FILL_CLASS);
    if (!fillEl) return;

    const steps = 100;
    const interval = (autoPlay * 1000) / steps;
    let progress = 0;

    fillEl.style.width = "0%";
    fillTimer = setInterval(() => {
      progress++;
      fillEl.style.width = progress + "%";
      if (progress >= 100) clearInterval(fillTimer);
    }, interval);
  }

  function resetFills() {
    if (!dotsWrap) return;
    dotsWrap.querySelectorAll("." + DOT_FILL_CLASS).forEach((f) => {
      f.style.width = "0%";
    });
  }

  function buildDots() {
    const { dots } = getActiveConfig();
    if (!dots || !dotsWrap) return;
    dotsWrap.innerHTML = "";
    slides.forEach((_, i) => {
      const d = document.createElement("span");
      d.className = DOT_CLASS + (i === 0 ? ` ${DOT_ACTIVE_CLASS}` : "");
      const fill = document.createElement("span");
      fill.className = DOT_FILL_CLASS;
      d.appendChild(fill);
      d.addEventListener("click", () => {
        clearInterval(fillTimer);
        current = i;
        goTo(i);
        updateDots();
        startDotFill();
      });
      dotsWrap.appendChild(d);
    });
  }

  function updateDots() {
    if (!dotsWrap) return;
    const idx = ((current % total) + total) % total;
    resetFills();
    dotsWrap.querySelectorAll("." + DOT_CLASS).forEach((d, i) => {
      d.classList.toggle(DOT_ACTIVE_CLASS, i === idx);
    });
  }

  function startAuto() {
    const { autoPlay } = getActiveConfig();
    clearInterval(autoTimer);
    if (autoPlay > 0) autoTimer = setInterval(next, autoPlay * 1000);
  }

  // --- touch ---
  track.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
      touchCurrentX = touchStartX;
      touchDragging = true;
      currentOffset = getOffset(current);
      track.style.transition = "none";
    },
    { passive: true },
  );

  track.addEventListener(
    "touchmove",
    (e) => {
      if (!touchDragging) return;
      touchCurrentX = e.touches[0].clientX;
      const diff = touchStartX - touchCurrentX;
      track.style.transform = `translateX(-${currentOffset + diff}px)`;
    },
    { passive: true },
  );

  track.addEventListener("touchend", () => {
    if (!touchDragging) return;
    touchDragging = false;
    const diff = touchStartX - touchCurrentX;
    const threshold = slideWidth() * 0.25;
    if (diff > threshold) next();
    else if (diff < -threshold) prev();
    else goTo(current);
  });

  track.addEventListener("transitionend", () => {
    loopCheck();
    updateDots();
    startDotFill();
  });

  // --- buttons via data attribute, scoped to wrap ---
  prevBtn?.addEventListener("click", () => {
    clearInterval(autoTimer);
    clearInterval(fillTimer);
    prev();
    startAuto();
    startDotFill();
  });

  nextBtn?.addEventListener("click", () => {
    clearInterval(autoTimer);
    clearInterval(fillTimer);
    next();
    startAuto();
    startDotFill();
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setWidths();
      buildDots();
      goTo(current, false);
    }, 100);
  });

  // --- init ---
  setWidths();
  if (config.infinite) setupInfinite();
  buildDots();
  goTo(0, false);
  startAuto();
  startDotFill();
}
