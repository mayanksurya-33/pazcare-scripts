/* PazLoop — auto-advancing one-way loop. One item at a time, forever.
   Markup:
     <div class="paz-loop" data-interval="3000" data-speed="600">
       <div class="paz-loop-track">
         <div class="paz-loop-item">…</div>
         <div class="paz-loop-item">…</div>
         …
       </div>
     </div>

   Attributes on the wrapper:
     data-interval  — ms an item is held before the next step (default 3000)
     data-speed     — ms a one-item step takes                (default 600)
     data-dots      — "false" to hide the indicator dots      (default on)
     data-dot-color — inactive dot colour                     (default #fff)
     data-dot-fill  — active dot colour                       (default #9d72ff)

   Infinite with no clones: after each step the leading items are moved to the
   end and the track snaps back to 0. Distances are percentages of the track's
   own width and items are flex:0 0 100%, so -k*100% is exactly k items and
   nothing is ever measured in pixels — which is what lets a loop sit inside a
   hidden tab panel without breaking. Only runs while on screen.

   The dots need to know which item is showing, which the rotation itself
   doesn't track. Each item is stamped with its ORIGINAL index once at setup,
   so the current one is just track.firstElementChild's stamp — derived from
   the DOM rather than a counter that could drift out of step with it.

   Needs loop.css (the loader auto-loads it). API: PazLoop.init() re-scans the
   DOM after injecting loops.
*/
(function () {
  "use strict";

  const WRAP = ".paz-loop";
  const TRACK = ".paz-loop-track";
  const DOTS_CLASS = "paz-loop-dots";
  const DOT_CLASS = "paz-loop-dot";
  const ACTIVE_CLASS = "is-active";
  const MAX_DUR = 900; // ceiling for a multi-item jump

  function setup(wrap) {
    if (wrap.dataset.pazLoopReady === "1") return;
    const track = wrap.querySelector(TRACK);
    if (!track || track.children.length < 2) return;
    wrap.dataset.pazLoopReady = "1";

    const hold = +wrap.getAttribute("data-interval") || 3000;
    const speed = +wrap.getAttribute("data-speed") || 600;
    let timer;
    let busy = false; // true while a slide is mid-flight

    // Stamp original positions once — the rotation reorders the nodes, but a
    // node's stamp never changes, so it always says which dot it owns.
    const items = [...track.children];
    items.forEach((el, i) => {
      el.dataset.pazLoopIndex = i;
    });
    const total = items.length;
    const dots = buildDots(wrap, total, jump);

    const indexOfNode = (node) => (node ? +node.dataset.pazLoopIndex || 0 : 0);

    function mark(idx) {
      if (!dots) return;
      dots.forEach((d, i) => {
        d.classList.toggle(ACTIVE_CLASS, i === idx);
        d.setAttribute("aria-current", i === idx ? "true" : "false");
      });
    }

    // One code path for the autoplay and for dot clicks, so the two can't
    // drift apart. Slides k items in a single transition, then rotates k nodes
    // and snaps back to 0.
    function slide(k, backward) {
      if (busy || k < 1) return;
      busy = true;
      // Sub-linear so one item keeps its feel and a long jump doesn't drag.
      const dur = Math.min(speed + (k - 1) * 100, MAX_DUR);
      const ease = "transform " + dur + "ms cubic-bezier(.4,0,.2,1)";

      if (backward) {
        // Move k nodes from the end to the front, then start the track k items
        // to the LEFT with no transition — animating to 0 then slides
        // rightward, a real reverse. The viewer never sees the reshuffle.
        for (let b = 0; b < k; b++) {
          track.insertBefore(track.lastElementChild, track.firstElementChild);
        }
        track.style.transition = "none";
        track.style.transform = "translateX(-" + k * 100 + "%)";
        void track.offsetWidth; // commit the start frame before animating off it
        mark(indexOfNode(track.firstElementChild));
        requestAnimationFrame(function () {
          track.style.transition = ease;
          track.style.transform = "translateX(0)";
        });
        setTimeout(function () {
          track.style.transition = "none";
          busy = false;
        }, dur + 20);
        return;
      }

      // Mark the INCOMING item as the slide begins — it's the one the viewer
      // watches arrive, so the dot moves with it rather than after it.
      mark(indexOfNode(track.children[k]));
      track.style.transition = ease;
      track.style.transform = "translateX(-" + k * 100 + "%)";
      // Timed rather than transitionend: that event bubbles from content inside
      // the items, and never fires at all if the tab is hidden mid-slide —
      // which would leave the track stuck off-screen forever.
      setTimeout(function () {
        track.style.transition = "none";
        for (let f = 0; f < k; f++) track.appendChild(track.firstElementChild);
        track.style.transform = "translateX(0)";
        void track.offsetWidth; // commit the snap before the next step
        busy = false;
      }, dur);
    }

    const step = () => slide(1, false);

    // Dots that look clickable should be clickable. Takes the shorter way
    // round, so dot 3 of 6 from dot 4 slides back one item, not forward five.
    function jump(target) {
      if (busy) return;
      const cur = indexOfNode(track.firstElementChild);
      if (target === cur) return;
      const fwd = (target - cur + total) % total;
      const back = total - fwd;
      fwd <= back ? slide(fwd, false) : slide(back, true);
      play(); // restart the dwell so the clicked item gets a full hold
    }

    function play() {
      clearInterval(timer);
      timer = setInterval(step, hold + speed);
    }
    function pause() {
      clearInterval(timer);
    }

    mark(indexOfNode(track.firstElementChild));

    // Only runs while on screen. An inactive tab panel never intersects, so it
    // can't advance where nobody can see it.
    if (window.IntersectionObserver) {
      new IntersectionObserver(
        (e) => {
          e[0].isIntersecting ? play() : pause();
        },
        { threshold: 0.2 },
      ).observe(wrap);
    } else play();
  }

  // Appended after the track, inside the wrap. The track is a flex row, so its
  // height is already the tallest item's — the dots sit at a fixed spot and
  // don't shift as items of different heights rotate through.
  function buildDots(wrap, total, onPick) {
    if (wrap.getAttribute("data-dots") === "false") return null;
    const box = document.createElement("div");
    box.className = DOTS_CLASS;
    const color = wrap.getAttribute("data-dot-color");
    const fill = wrap.getAttribute("data-dot-fill");
    // Only set what was asked for — otherwise loop.css keeps its defaults.
    if (color) box.style.setProperty("--paz-dot", color);
    if (fill) box.style.setProperty("--paz-dot-fill", fill);
    const made = [];
    for (let i = 0; i < total; i++) {
      const d = document.createElement("button");
      d.type = "button"; // never submit a surrounding Webflow form
      d.className = DOT_CLASS;
      d.setAttribute("aria-label", "Go to item " + (i + 1));
      d.addEventListener("click", () => onPick(i));
      box.appendChild(d);
      made.push(d);
    }
    wrap.appendChild(box);
    return made;
  }

  function init() {
    document.querySelectorAll(WRAP).forEach(setup);
  }

  window.PazLoop = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
