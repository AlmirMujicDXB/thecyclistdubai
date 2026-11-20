# TheCyclistDubai Weather: project notes

Live site: https://thecyclistdubai.com/ (GitHub Pages from `main`, workflow `.github/workflows/static.yml`).

## Files
- `index.html`: the whole weather page (HTML, CSS, JS in one file).
- `site-data.js`: sponsors, events and group rides. Edit content here, not in `index.html`.
- `tracks/*.json`: track geometry from OpenStreetMap, refreshed weekly by `.github/workflows/tracks.yml` (`scripts/fetch_tracks.py`).
- `disclaimer.html`: data sources and disclaimer. `quiz.html`: group ride etiquette quiz.

## Rules (from the site owner)
- **When any detail in a card/window changes (time, date, distance, place, pace, links, codes, names), every share output must show the same new detail**: the card on the page, the Share menu row, the share image (`drawCard` / map image), the share message text (`rideText`, `eventText`, `weatherText`, `sponsorText`) and the "next group ride" / "upcoming events" lines inside the weather message. Check all of them before pushing.
- Prefer changing data in `site-data.js` so the page and all share outputs update together. For a one-off ride change use the ride's `changes` entry, e.g. `'2026-11-21': { time: '06:00' }` or `{ cancelled: true }`.
- Share messages: do not repeat the WhatsApp group link (it is in the footer once). Event shares contain only the event details (no sponsors, site link or group link). Weather, ride and sponsor shares include the site link and all sponsor codes.
- Cards (event, group ride, sponsor) and the header keep the same height (70px desktop, 126px phone); measure every card, not just the first, after content changes. Corners are rounded rectangles, not round pills.
- Group rides sit above the Lameda sponsor card (all rides share the same green card design).
- Header and selected buttons use the theme variables (`--th-*`, navy → teal → green, lime accent). Change colours there.
- Before pushing: run `node --check` on the inline script, preview phone (390px) and desktop widths, then confirm the Pages deploy succeeds (re-run it if GitHub reports "No artifacts named github-pages").
