# Tray transfer stats

**Status:** shipped

The macOS menu bar tray polls Qui for live download/upload speeds and
torrent Active/Total counts. Pause All and Resume All use the same client.

## Behaviour

- The main process uses `QuiApiClient` with Electron `net.fetch` so the
  signed-in BrowserWindow session cookie reaches Qui. Plain Node `fetch`
  does not share that cookie jar.
- Each poll: `GET /api/instances`, then for every instance id
  `GET /api/instances/{id}/transfer-info` and
  `GET /api/instances/{id}/torrents?limit=1&prefer=stale`.
- Speeds sum `dl_info_speed` and `up_info_speed` across instances.
- Active sums `counts.status.running`; Total sums `counts.total` (falls
  back to the torrents response `total` when counts are missing).
- Auth failure (401/403), missing instances, or network errors yield zeros
  so the idle title stays empty (`BR-desktop-04`).
- Pause/Resume All: for each instance,
  `POST /api/instances/{id}/torrents/bulk-action` with
  `{ hashes: [], selectAll: true, action: "pause" | "resume" }`.

There is no `/api/torrents/transfer-info` (or pause-all / resume-all) route.

## Related

- [overview.md](overview.md) — tray menu behaviour
- `BR-desktop-04` — idle title vs live rates formatting
- `BR-desktop-27` — adaptive poll interval
- `BR-desktop-64` — authenticated instance aggregation (this page)
