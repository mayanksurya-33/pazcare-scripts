/* PazSlider — auto-scrolling strip (logos, testimonials, etc.), two modes.
   Markup:
     <div class="paz-slider-wrapper" data-speed="20">
       <div class="paz-slider-track">
         <div class="paz-slider-item">…</div>
         <div class="paz-slider-item">…</div>
         …
       </div>
     </div>

   MODE is picked with data-slider on the wrapper:

   - (absent) or data-slider="marquee"  — the original: a continuous CSS scroll
     that pauses on hover and fades at both edges (all in slider.css).
     data-speed = seconds for one full loop, smaller = faster (default 20).

   - data-slider="steps"  — EXPERIMENTAL. Advances ONE item at a time, waits,
     then advances again, forever. Still pauses on hover, and you can drag the
     strip back and forth with mouse or touch; it snaps to the nearest item on
     release and resumes on its own.
       data-step-interval = ms to dwell between steps   (default 2500)
       data-step-duration = ms for the slide itself     (default 500)
       data-step-easing   = any CSS timing function     (default ease-in-out)
     The infinite loop here recycles DOM (the first item is moved to the end
     after each step) rather than rewinding, so it never drifts.
     One step = one .paz-slider-item. If a step moves a whole viewport, your
     item is viewport-wide — give .paz-slider-item its own width, don't leave
     it at 100%.

   Both modes duplicate the track's items so the strip is full, meaning you add
   each item only ONCE. If your markup already contains a duplicated set, put
   data-paz-clone="false" on the wrapper.

   GROUPED MARKUP: a marquee usually wraps its items in duplicate group divs
   (e.g. two .paz-slider-list components of six logos each) so the -50%
   translate lands on a matching half. Stepped mode recycles items instead, so
   those groups would make every "step" jump a whole screen. It therefore
   flattens them at init — items matching .paz-slider-item or
   .paz-slider-list-item are hoisted to be direct children of the track, and
   the group's column-gap / align-items are carried over. Your Webflow markup
   is untouched; only the live DOM changes, and only in stepped mode.
   Override the selector with data-step-target="<css selector>" — useful for a
   CMS Collection List, or to deliberately step by group instead of by item.

   Uses the readyState guard (not a bare DOMContentLoaded listener) so it still
   runs when injected late by the loader, after that event has already fired.

   API: PazSlider.refresh() — re-scan the DOM (after injecting sliders).
*/
(function () {
  "use strict";

  const WRAP_SELECTOR = ".paz-slider-wrapper";
  const TRACK_SELECTOR = ".paz-slider-track";
  const DRAG_THRESHOLD = 5; // px of movement before a gesture counts as a drag

  function num(el, attr, fallback) {
    const v = parseFloat(el.getAttribute(attr));
    return isNaN(v) ? fallback : v;
  }

  /* ---------------- mode: marquee (original behaviour) ---------------- */

  function setupMarquee(wrapper, track) {
    // Per-instance speed: data-speed = seconds for one full loop.
    const speed = num(wrapper, "data-speed", NaN);
    if (!isNaN(speed)) track.style.animationDuration = speed + "s";
  }

  /* ---------------- mode: steps (experimental) ---------------- */

  function setupSteps(wrapper, track) {
    const interval = num(wrapper, "data-step-interval", 2500);
    const duration = num(wrapper, "data-step-duration", 500);
    // Ease-in-out by default: the slide starts and stops gently instead of
    // jumping off the mark, which is what makes it read as smooth.
    const easing = wrapper.getAttribute("data-step-easing") || "cubic-bezier(0.4, 0, 0.2, 1)";

    let offset = 0; // px the track is shifted left by
    let timer = null;
    let hovering = false;
    let dragging = false;

    const gap = () => parseFloat(getComputedStyle(track).columnGap) || 0;

    // How far the track must move for `el` to be fully replaced by the next
    // item. Measured from the live layout (edge of this item to edge of the
    // next) so flex gap AND margins are both accounted for; falls back to
    // width + gap for the last item, which has no next sibling to measure to.
    function advanceOf(el) {
      const next = el.nextElementSibling;
      if (next) {
        const d = next.getBoundingClientRect().left - el.getBoundingClientRect().left;
        if (d > 0.5) return d;
      }
      return el.getBoundingClientRect().width + gap();
    }

    const apply = (animate) => {
      track.style.transition = animate ? `transform ${duration}ms ${easing}` : "none";
      track.style.transform = `translate3d(${-offset}px,0,0)`;
    };

    // Where the track actually is right now (mid-animation this differs from
    // `offset`, which is the target).
    function currentX() {
      const t = getComputedStyle(track).transform;
      if (!t || t === "none") return 0;
      const m3 = t.match(/^matrix3d\((.+)\)$/);
      if (m3) return parseFloat(m3[1].split(",")[12]);
      const m2 = t.match(/^matrix\((.+)\)$/);
      return m2 ? parseFloat(m2[1].split(",")[4]) : 0;
    }

    // Keep `offset` inside the first item's width by recycling items between
    // the ends of the track. This is what makes the loop infinite both ways.
    function normalize() {
      for (let guard = 0; guard < 100; guard++) {
        const first = track.firstElementChild;
        const last = track.lastElementChild;
        if (!first || !last || first === last) break;
        if (offset >= advanceOf(first) - 0.5) {
          offset -= advanceOf(first);
          track.appendChild(first);
        } else if (offset < 0) {
          offset += advanceOf(last);
          track.insertBefore(last, first);
        } else {
          break;
        }
      }
    }

    // Settle after an animated move: drop the transition, recycle, re-apply.
    function settle() {
      normalize();
      apply(false);
      void track.offsetWidth; // flush, so the next animated move transitions
    }

    function animateTo(target, then) {
      offset = target;
      apply(true);
      let done = false;
      const finish = (e) => {
        // transitionend BUBBLES: a link or image inside the strip finishing its
        // own hover/fade transition would otherwise end the step early and snap
        // the track into place. Only the track's own transform counts.
        if (e && (e.target !== track || e.propertyName !== "transform")) return;
        if (done) return;
        done = true;
        track.removeEventListener("transitionend", finish);
        clearTimeout(fallback);
        settle();
        if (then) then();
      };
      // transitionend can also be skipped entirely (background tab, zero-
      // distance move), so back it with a timer.
      const fallback = setTimeout(finish, duration + 50);
      track.addEventListener("transitionend", finish);
    }

    function stop() {
      clearTimeout(timer);
      timer = null;
    }

    function play() {
      stop();
      if (hovering || dragging) return;
      timer = setTimeout(advance, interval);
    }

    function advance() {
      const first = track.firstElementChild;
      if (!first) return;
      animateTo(offset + advanceOf(first), play);
    }

    /* hover — pause the timer (CSS animation-play-state does nothing here).
       Touch pointers are ignored: a tap fires pointerenter, and if the matching
       pointerleave never arrives the strip would stay paused for good. Touch
       gestures already pause via the drag handlers below. */
    wrapper.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "touch") return;
      hovering = true;
      stop();
    });
    wrapper.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "touch") return;
      hovering = false;
      play();
    });

    /* drag — free both directions, snap to the nearest item on release */
    let startX = 0; // where the gesture began, for the drag-vs-click test
    let lastX = 0; // previous pointer position, for the incremental delta
    let moved = 0;

    track.addEventListener("pointerdown", (e) => {
      if (e.button != null && e.button !== 0) return; // left / touch / pen only
      dragging = true;
      moved = 0;
      startX = lastX = e.clientX;
      stop();
      offset = -currentX(); // adopt the live position if a step was mid-flight
      apply(false);
      track.classList.add("is-dragging");
      if (track.setPointerCapture) track.setPointerCapture(e.pointerId);
    });

    // Move by the delta since the last event, not by the distance from the
    // start: normalize() rewrites `offset` whenever an item recycles, so any
    // absolute "start + dx" sum would jump the moment the strip wraps.
    track.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      offset += lastX - e.clientX;
      lastX = e.clientX;
      moved = Math.max(moved, Math.abs(e.clientX - startX));
      normalize();
      apply(false);
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove("is-dragging");
      if (track.releasePointerCapture && e && e.pointerId != null) {
        try {
          track.releasePointerCapture(e.pointerId);
        } catch (err) {
          /* pointer already released */
        }
      }
      // Snap: past the halfway mark of the leading item, go on to the next.
      const first = track.firstElementChild;
      const w = first ? advanceOf(first) : 0;
      animateTo(offset > w / 2 ? w : 0, play);
      // Swallow the click that follows a real drag, so dragging over a link
      // doesn't navigate.
      if (moved > DRAG_THRESHOLD) {
        const swallow = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        track.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => track.removeEventListener("click", swallow, true), 0);
      }
    };

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("dragstart", (e) => e.preventDefault());

    window.addEventListener("resize", () => {
      if (dragging) return;
      settle();
    });

    apply(false);
    play();

    // A step should move ONE item. If it would move most of the strip, the
    // track's direct children aren't the individual items — usually they're
    // group wrappers (the duplicated halves a CSS marquee needs), or an item
    // was left at width:100%. Either way the strip jumps a whole screen per
    // step, so say so instead of leaving it to be spotted by eye.
    const first = track.firstElementChild;
    if (
      first &&
      wrapper.clientWidth > 0 &&
      !wrapper.getAttribute("data-step-target") && // an explicit target means they meant it
      advanceOf(first) >= wrapper.clientWidth * 0.8
    ) {
      console.warn(
        "[paz] slider: one step moves ~a full viewport, so the track's direct " +
          "children aren't individual items. Give each item .paz-slider-item " +
          "or .paz-slider-list-item, or point data-step-target at them.",
        wrapper
      );
    }
  }

  /* ---------------- shared setup ---------------- */

  // What counts as one step, in priority order. A marquee needs its items
  // wrapped in duplicate groups so the -50% translate lands on a matching
  // half; stepped mode recycles items instead, so those groups just make the
  // strip jump a whole screen per "step". Flatten them out of the way.
  const STEP_SELECTORS = [".paz-slider-item", ".paz-slider-list-item"];

  function flatten(wrapper, track) {
    const custom = wrapper.getAttribute("data-step-target");
    let items = null;
    for (const sel of custom ? [custom] : STEP_SELECTORS) {
      const found = track.querySelectorAll(sel);
      if (found.length) { items = [...found]; break; }
    }
    if (!items) return;
    if (items.every((el) => el.parentElement === track)) return; // already flat

    // The spacing and alignment lived on the group wrapper we're about to
    // drop, so carry them over or the logos end up flush against each other.
    const group = items[0].parentElement;
    if (group && group !== track) {
      const from = getComputedStyle(group);
      const colGap = parseFloat(from.columnGap);
      if (colGap > 0 && !(parseFloat(getComputedStyle(track).columnGap) > 0)) {
        track.style.columnGap = colGap + "px";
      }
      if (from.alignItems && from.alignItems !== "normal") {
        track.style.alignItems = from.alignItems;
      }
    }

    // Moving nodes keeps their listeners and Webflow interactions intact.
    const frag = document.createDocumentFragment();
    items.forEach((el) => frag.appendChild(el));
    while (track.firstChild) track.removeChild(track.firstChild);
    track.appendChild(frag);
  }

  function setup(wrapper) {
    if (wrapper.dataset.pazSliderReady === "1") return;
    const track = wrapper.querySelector(TRACK_SELECTOR);
    if (!track) return;
    wrapper.dataset.pazSliderReady = "1";

    const stepped = wrapper.getAttribute("data-slider") === "steps";

    // Before anything measures or clones, so both see real items.
    if (stepped) flatten(wrapper, track);

    // Duplicate items so the strip is full (opt out if already doubled).
    if (wrapper.getAttribute("data-paz-clone") !== "false") {
      const originals = [...track.children];
      if (stepped) {
        // Enough copies to cover the viewport twice — recycling needs the
        // track to overflow, and short lists would otherwise show a gap.
        for (let i = 0; i < 10 && track.scrollWidth < wrapper.clientWidth * 2; i++) {
          originals.forEach((node) => track.appendChild(node.cloneNode(true)));
        }
      } else {
        originals.forEach((node) => track.appendChild(node.cloneNode(true)));
      }
    }

    if (stepped) setupSteps(wrapper, track);
    else setupMarquee(wrapper, track);
  }

  function refresh() {
    document.querySelectorAll(WRAP_SELECTOR).forEach(setup);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }

  window.PazSlider = { refresh: refresh };
})();
