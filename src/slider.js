/* PazSlider — infinite auto-scrolling marquee (logos, testimonials, etc.).
   Markup:
     <div class="paz-slider-wrapper" data-speed="20">
       <div class="paz-slider-track">
         <div class="paz-slider-item">…</div>
         <div class="paz-slider-item">…</div>
         …
       </div>
     </div>

   - The strip scrolls left and loops forever; it pauses on hover and fades at
     both edges (all in slider.css).
   - data-speed: seconds for one full loop — smaller = faster (default 20).
   - This script duplicates the track's items once so the -50% loop is
     seamless, meaning you add each item only ONCE. If your markup already
     contains a duplicated set, put data-paz-clone="false" on the wrapper.

   Uses the readyState guard (not a bare DOMContentLoaded listener) so it still
   runs when injected late by the loader, after that event has already fired.

   API: PazSlider.refresh() — re-scan the DOM (after injecting sliders).
*/
(function () {
  "use strict";

  const WRAP_SELECTOR = ".paz-slider-wrapper";
  const TRACK_SELECTOR = ".paz-slider-track";

  function setup(wrapper) {
    if (wrapper.dataset.pazSliderReady === "1") return;
    const track = wrapper.querySelector(TRACK_SELECTOR);
    if (!track) return;
    wrapper.dataset.pazSliderReady = "1";

    // Duplicate items once for a seamless loop (opt out if already doubled).
    if (wrapper.getAttribute("data-paz-clone") !== "false") {
      [...track.children].forEach((node) => track.appendChild(node.cloneNode(true)));
    }

    // Per-instance speed: data-speed = seconds for one full loop.
    const speed = parseFloat(wrapper.getAttribute("data-speed"));
    if (!isNaN(speed)) track.style.animationDuration = speed + "s";
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
