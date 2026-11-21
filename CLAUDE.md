# TheCyclistDubai Weather: project notes

Live site: https://thecyclistdubai.com/ (GitHub Pages from `main`, workflow `.github/workflows/static.yml`).

## Files
- `index.html`: the whole weather page (HTML, CSS, JS in one file).
- `site-data.js`: sponsors, events and group rides. Edit content here, not in `index.html`.
- `tracks/*.json`: track geometry from OpenStreetMap, refreshed weekly by `.github/workflows/tracks.yml` (`scripts/fetch_tracks.py`).
- `disclaimer.html`: data sources and disclaimer. `quiz.html`: group ride etiquette quiz.

## Rules (from the site owner)
- **When any detail in a card/window changes (time, date, distance, place, pace, links, codes, names), every share output must show the same new detail**: the card on the page, the Share menu row, the share image (`drawCard` / map image), the share message text (`rideText`, `eventText`, `weatherText`, `sponsorText`) and the "next group ride" / "upcoming events" lines inside the weather message. Check all of them before pushing.
- **When the owner adds a new group ride, always ask: is it a one-time ride or recurring (weekly)?** Recurring rides use `weekly: 'Day'`; they move to the same day and time next week automatically as soon as the start time passes. Never ask the owner to update dates of recurring rides. Keep a recurring ride's time unchanged week to week until the owner says otherwise. One-time rides use `date:` and disappear once their start time passes. A recurring ride with a limited run uses `until: 'YYYY-MM-DD'` (TCD Ride: Tuesdays 7:00 AM, Road · 36 km, 30 km/h avg, start BOTS, until 2027-03-23). The Saturday ride was removed.. Rides are always listed soonest first, so the next ride is at the top.
- Prefer changing data in `site-data.js` so the page and all share outputs update together. For a one-off ride change use the ride's `changes` entry, e.g. `'2026-11-21': { time: '06:00' }` or `{ cancelled: true }`.
- Sponsors are **not shown on the website** (no sponsor cards or empty sponsor slots). Sponsors live only in shares: ride shares, weather/map shares and the Share menu's "Sponsor codes" option include every sponsor with link and discount code (from `site-data.js`). Event shares contain only the event details (no sponsors, site link or group link).
- Share messages: do not repeat the WhatsApp group link (it is in the footer once). Weather and ride shares include the site link and all sponsor codes.
- Cards (event, group ride) and the header keep the same height (70px desktop, 126px phone); measure every card, not just the first, after content changes. Corners are rounded rectangles, not round pills.
- Order: the "Group rides" section lists the rides by date (no sponsor card between them). All rides use the identical format: tags "⛑️💡 Lights & helmet mandatory (site-wide rideRule in site-data.js) · type · distance · pace", title "Name · time · place", details "Start · forecast"; the same order of facts in every share output. No "New time" tag.
- Header and selected buttons use the theme variables (`--th-*`): green in the same pattern as the cards (dark forest #052e16 → #14532d → #16a34a, lime glow top-right, dotted route line), lime accent for "Dubai". Change colours there.
- Group ride cards use exactly the header green (`--rd-*` = #052e16 → #14532d → #16a34a, lime glow, lime accents). Ride share images (`drawCard` theme `green`, green brand bar) and the ride rows in the Share menu use the same green.
- Before pushing: run `node --check` on the inline script, preview phone (390px) and desktop widths, then confirm the Pages deploy succeeds (re-run it if GitHub reports "No artifacts named github-pages").
