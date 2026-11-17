# Changelog

Component versions match the `VERSIONS` registry in `webflow-loader.js`.
Add an entry when you bump a component's version.

## glossary 1.4 — 2026-11-17
- Heading levels fixed. Letter headings were `h4` and card titles were `h1`, so every entry was a top-level heading nested inside a lower-level one — the outline read backwards, and a page of 80 terms emitted 80 `h1`s alongside the page's own.
- Letters are now `h2` and card titles `h3`. The `heading-style-h4` / `heading-style-h5` classes are untouched, so nothing changes visually — those classes carry the type styling in Webflow, independent of the tag.

## glossary 1.3 — 2026-11-04
- Letter groups now pad their last row with invisible filler cards (`div.paz-glossary-card.not-vis`, `aria-hidden`) so every row holds `cardsPerRow` slots — default 3. A letter with 5 entries used to end on a row of 2 stretched across the full width.
- Fillers are divs rather than anchors, so they add no tab stop and nothing is clickable. `.not-vis` is `visibility: hidden` (not `display: none`, which would collapse the slot and defeat the padding) and scoped under `.paz-gloss-content` so it can't collide with a site-wide `.not-vis` in Webflow.
- `cardsPerRow` is configurable; set it to 1 to switch the padding off.
- `.paz-gloss-content` now carries the 3-column grid itself. It was never 3-up in Webflow — a lone card stretched the full width — so the filler padding had no columns to pad into and did nothing visible. Two-class selector so it outranks the site stylesheet; 2-up under 991px and 1-up under 767px, with fillers dropped below 3 columns so they can't add empty height.

## glossary 1.2 — 2026-09-22
- New Read More arrow icon (`icons.arrow` now points at `6ab282ea…_arrow-icon.svg`, the coral one). Changed at the `DEFAULTS.icons` source rather than at the call site, so a page passing its own `icons.arrow` still overrides it.

## loop 1.0 — 2026-09-03
- New component: an auto-advancing one-way loop for a stack of content blocks, one item at a time. Extracted from the inline embed on the platform section and split into `loop.js` + `loop.css`.
- Built for loops that live inside a **hidden tab panel**, which is what rules out the obvious implementations. No clones and no pixel measurement: items are `flex: 0 0 100%` inside a `width: 100%` track, so `translateX(-k*100%)` is exactly k items whatever the container is doing. A `display: none` panel measures 0, so anything measured would resolve to 0 and strand the track off-screen.
- The step is timed rather than driven by `transitionend`. That event bubbles from content inside the items, and never fires at all if the tab is hidden mid-step — which left the track stuck at `-100%` forever.
- Rotates DOM instead of tracking an index: after each step the leading items move to the end and the track snaps back to 0.
- Indicator dots are generated (no markup needed) and hide with `data-dots="false"`. Colours via `data-dot-color` / `data-dot-fill`, applied as custom properties so `loop.css` keeps the defaults (`#fff` / `#9d72ff`) and a page can retheme without a specificity fight. The active dot carries a white ring so the fill reads on any card colour, and the dots row has 2px of padding so that ring isn't clipped by the wrapper's `overflow: hidden`.
- Clicking a dot animates rather than snapping, and takes the shorter way round — dot 3 of 6 from dot 4 slides back one item, not forward five. Backwards works by moving k nodes to the front and starting the track at `-k*100%` with no transition, so animating to 0 slides rightward; the reshuffle is never visible. Duration scales sub-linearly (`speed + (k-1)*100`, capped at 900ms) so a long jump doesn't drag.
- Autoplay and dot clicks share one `slide(k, backward)` path, so the two can't drift apart.
- Dots know which item is showing because each item is stamped with its original index once at setup — read back off `track.firstElementChild` rather than kept in a counter that could desync from the rotation.
- Only advances while on screen (IntersectionObserver, 0.2 threshold), so an inactive tab panel never advances where nobody can see it.
- Dots are `<button type="button">` so they can't submit a surrounding Webflow form, and carry `aria-label` + `aria-current`.

## tabs 1.1 — 2026-09-03
- Optional per-tab side image, matched by ORDER like everything else in this component: `.paz-tab-media` on a box, `.paz-tab-img` on one image per tab, and the Nth tab shows the Nth image. Was an inline embed (`PazTabMedia`); folded in here because a tab changing its own media is tab-owned behaviour, and a separate script on the page is one more thing to lose to a copy-paste.
- The media box normally sits **outside** `.paz-tabs` (a sibling column), so it's found by walking up from the group to the first ancestor that contains one. Resolved once per group and cached in a `WeakMap`, so a tab change doesn't re-walk the tree.
- Hidden with an inline `display: none` for the same reason the panels are: the `hidden` attribute alone only sets `display: none` via the UA stylesheet, which any display rule on the image's own Webflow classes beats.
- One image per tab rather than swapping `src`, so Webflow's `srcset`/`sizes` stay intact and there's no load flicker mid-switch. The active image also gets `is-active` if you want to style it.
- Fewer images than tabs is fine — a tab with no image at its index leaves whatever is showing in place, so a section with a single image behaves exactly as it did in 1.0.
- No markup or behaviour change for tabs without a `.paz-tab-media` box: the feature costs them one cached lookup per group.

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
