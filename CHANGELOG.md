# Changelog

Component versions match the `VERSIONS` registry in `webflow-loader.js`.
Add an entry when you bump a component's version.

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
