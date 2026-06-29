# Changelog

Component versions match the `VERSIONS` registry in `webflow-loader.js`.
Add an entry when you bump a component's version.

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
