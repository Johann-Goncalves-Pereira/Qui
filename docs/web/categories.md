# Set Category create-and-assign

**Status:** shipped

## Concern

The torrent **Set Category** dialog lets the user pick an existing category or type a
new name. qBittorrent only assigns categories that already exist: `torrents/setCategory`
returns HTTP 409 when the name is missing. Qui must create a typed new name before
assigning it.

## Rules

- A typed, non-empty category name that is not already in the dialog’s category list
  is created with `POST /instances/{id}/categories` on each target instance, then
  assigned with the bulk `setCategory` action.
- An empty category string only clears the category (`setCategory` with `""`). It does
  not call create.
- A name that is already listed is assigned only; create is skipped.
- Typed names are trimmed before create or assign.
- If create fails because the category already exists (race or stale list), assign still
  proceeds when the category is present on the instance.
- After a successful create, instance metadata caches are invalidated so the sidebar
  refreshes.

## Upstream Docker Alignment

- **Target Architectural Layer:** Web UI `web/`
- **Upstream Layout Coupling:** Low
- **Potential Breakage Vectors:** Upstream may change dialog copy or bulk-action wiring;
  create remains a separate API from assign.
- **Defensive Guardrails & Isolation:** Create-then-assign lives in the bulk-action
  request helper; browser and Electron share the same path.
- **Future Upstream Sync Impact:** Prefer keeping create-then-assign if upstream still
  calls `setCategory` alone for typed names.
