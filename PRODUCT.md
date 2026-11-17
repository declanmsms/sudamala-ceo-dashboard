# Product

<!-- impeccable:product-schema 1 -->
<!-- Written from the build brief (sudamala-ceo-dashboard-brief.md). Facts are inferred from that brief, not from a separate interview. -->

## Platform

web

## Stack

Static site: index.html, styles.css, app.js (vanilla ES modules), data.js, map-data.js. No backend, no framework. Hosted on GitHub Pages.

## Users

The CEO and top management of Sudamala Resorts. They read it mostly on a phone, often between meetings, with seconds to spare. Sometimes it is printed in black and white for board meetings.

## Product Purpose

A single-page CEO dashboard with one job: show where the business needs to improve, how much it costs, and who should act. Success = someone who has never seen it can say which resort needs the most help and why in under 10 seconds.

## Positioning

Six boutique luxury resorts across Bali (Sanur, Ubud, Amed), Lombok (Senggigi) and Flores (Komodo, Seraya). Ubud opened October 2026 and has no last-year data, so last-year comparisons are like-for-like and exclude it.

## Capabilities and Constraints

- Filters: period (MTD / QTD / YTD), compare with (budget / last year), focus (all or one resort). Every section re-draws.
- Issues are detected automatically by fixed rules and ranked by severity, then money at stake.
- Real geography from geoBoundaries ADM2, pre-processed at build time.
- Page weight under ~300 KB. Text inserted with textContent only.

## Brand Commitments

Black and white only. Black = needs attention; white or light gray = fine. Never colour alone: always an arrow, a status word and the number.

## Evidence on Hand

Illustrative sample data only (data.js). The page must say: "Example with illustrative sample data, not Sudamala actuals." Do not present any figure as real.

## Product Principles

1. Problems first: the ranked issue list is the most prominent block.
2. Every number carries a comparison and a status word.
3. Plain spoken language; hotel terms spelled out once.
4. Calm and quiet, like an annual report, not a trading screen.

## Accessibility & Inclusion

Text contrast ≥ 4.5:1, nothing under 12px, body 15px desktop / 16px mobile, keyboard-reachable tiles, pins and rows, visible focus, aria-label and a table view for every chart.
