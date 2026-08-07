# Changelog

Component versions match the `VERSIONS` registry in `webflow-loader.js`.
Add an entry when you bump a component's version.

## carousel 1.2 — 2026-08-07
- New `peek` config (px, default 0): leaves that much of the NEXT slide visible at the right edge as a "there's more" hint. Slides shrink to make room — `peek` reserves the strip plus the gap in front of it, so `visible` full slides + gaps + `peek` add up to the track width exactly.
- Works per breakpoint like any other option (`breakpoints: { 768: { visible: 1, peek: 24 } }`).
- With `infinite`, one extra slide is cloned on each end when a peek is configured anywhere — the peek slot sits one position further right, and without the extra clone it showed a blank sliver while animating past the last slide. `setupInfinite()` and `getOffset()` now share a single `cloneCount()` so they can't drift apart.
- Slide width is clamped to at least 1px, so an oversized `peek` can't produce negative widths.
- `peek: 0` (or omitting it) is byte-for-byte the 1.1 sizing and clone count — existing carousels are unaffected.

## slider 1.1 — 2026-07-31
- New **experimental** stepped mode, opt in with `data-slider="steps"` on the wrapper. Advances one item at a time with a dwell between steps instead of scrolling continuously.
  - `data-step-interval` (ms between steps, default 2500), `data-step-duration` (ms per slide, default 500), `data-step-easing` (any CSS timing function, default `cubic-bezier(0.4, 0, 0.2, 1)`).
  - Step distance is measured from the live layout (leading edge of one item to the next), so flex `gap` **and** margins both count. `.paz-slider-item` gets `flex: 0 0 auto` so items size to content — an item left at `width: 100%` resolves against the wrapper and makes every step move a whole viewport.
  - `transitionend` is filtered to the track's own `transform`. It bubbles, so a link or image inside the strip finishing its own hover transition would otherwise end the step early and snap the track into place (looked like a hard jerk mid-slide).
  - Infinite loop recycles DOM (first item moves to the end after each step) rather than rewinding, so it can't drift out of sync.
  - Drag with mouse or touch, both directions; snaps to the nearest item on release and resumes on its own. `touch-action: pan-y` keeps vertical page scroll working, and the click after a real drag is swallowed so dragging over a link doesn't navigate.
  - Hover-pause is preserved — in this mode JS pauses the step timer (CSS `animation-play-state` has nothing to pause).
  - Clones items until the track covers twice the viewport, since recycling needs the track to overflow.
  - **Handles the existing grouped marquee markup with no Designer changes.** A marquee wraps its items in duplicate group divs (two `.paz-slider-list` component instances of six logos each) so the `-50%` translate lands on a matching half; stepped mode recycles instead, so those groups made every step jump a whole screen. It now flattens them at init — `.paz-slider-item` / `.paz-slider-list-item` are hoisted to be direct children of the track, carrying the group's `column-gap` and `align-items` across — and only in stepped mode, so marquee sliders keep their groups. `data-step-target="<selector>"` overrides which elements count as a step (CMS Collection Lists, or deliberately stepping by group).
  - Warns in the console when one step would move ≥80% of the viewport, which means the track's direct children aren't individual items. Suppressed when `data-step-target` is set, since that's then intentional.
- Default behaviour is unchanged: with no `data-slider` (or `data-slider="marquee"`) the pure-CSS marquee, `data-speed`, and `data-paz-clone` all behave exactly as in 1.0.

## accordion 1.0 — 2026-06-26
- New component (was a stub): FAQ accordion. Click a `.paz-faq-elem` to toggle `data-state`; CSS expands `.paz-faq-answer` and spins `.paz-faq-btn-wrapper`. Uses click delegation (no `DOMContentLoaded`) + a one-time bind guard so it survives late loading and double-includes.

## accordion 1.0 — 2026-06-26
- New component (was a stub): FAQ accordion. Click a `.paz-faq-elem` to toggle `data-state`; CSS expands `.paz-faq-answer` and spins `.paz-faq-btn-wrapper`. Click delegation (no `DOMContentLoaded`) + one-time bind guard so it survives late loading and double-includes.
- Smooth height via `interpolate-size: allow-keywords` animating `max-height` to `max-content` (no fixed cap / clipping); falls back to instant open in browsers without it.

## carousel 1.1 — 2026-06-24
- Dots: start empty (no more all-filled on load), clear leftover partial fills on rapid clicks, and keep the active dot filled when autoplay is off.
- Fix resting position for responsive + infinite carousels (offset now uses the real clone count).
- Re-mark the active dot after resize.

## glossary 1.1 — 2026-06-24
- Cards render as a full-card link (`a.paz-glossary-card w-inline-block`) with the read-more as an inner div.

## v1.0 — baseline
All components shipped at 1.0: carousel, modal, searchbar, glossary, tabs.
(accordion is a stub — not shipped.)

<!-- Add new entries above this line, newest first. -->
