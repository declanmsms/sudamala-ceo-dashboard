# Sudamala Resorts CEO dashboard (sample data)

A single-page, CEO dashboard in Sudamala lagoon teal: where the business needs to improve, how much it costs, and who should act.
**Example with illustrative sample data, not Sudamala actuals.**

- Static site: `index.html`, `styles.css`, `app.js`, `data.js`, `map-data.js`. No build step, no backend.
- Replace `data.js` with real figures; the page reads only its exports.
- `map-data.js` is generated from geoBoundaries (IDN ADM2) by `node tools/build-map.js <geojson>`.
- Filters are kept in the URL (`?period=ytd&compare=ly&focus=ubud`), so a link opens the same view.
- Run locally: `npx http-server . -p 5173` and open http://localhost:5173.
- Screenshots at 390px and 1440px are in `screenshots/`.
