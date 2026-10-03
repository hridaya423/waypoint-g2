# Maps, connections and saved places

Approved scope: street maps on glasses, meaningful route comparison, connection awareness, saved destinations and cached journey context.

Keep the existing pure journey engine and four-tile renderer. Add bounded OpenStreetMap street geometry from Overpass for the selected route; cache the last downloaded area locally. Render north-up maps with the same canvas on glasses and the companion. Walking uses a local map; an explicit overview fits the whole route. Unavailable streets retain the route with an honest label. Do not use OSM's public raster tile service for offline prefetch.

Compare actual returned routes by duration, walking and changes. Connection estimates combine remaining planned leg duration with the next boarding stop's predictions; uncertain location and stale predictions must not become a claim of a guaranteed connection. Offer a fresh search from the current location without silently replacing the active route.

Save up to eight named destinations locally. Phone shortcuts fill the destination; the glasses idle picker can obtain a current location and search, then retain explicit route selection. Cache the active itinerary and downloaded street area, with visible availability and stale-data states. No offline route calculation or cached live prediction claims.

Verification: pure boundary tests for comparison, connection uncertainty, map parsing/cache and saved-place restoration; real provider sample; browser desktop/mobile light/dark and offline fallback; official simulator walking map/overview/critical-alert precedence. Package only after checks.

Checkpoint: source inspected; implementation starting. Current baseline 0.4.0, 30 tests. No Git repository.

Implementation checkpoint: 0.5.0 implements maps, route labels/times, prediction freshness and direction matching for connection estimates, saved destinations with a glasses picker, and a seven-day local street cache. Thirty-eight tests pass. Three new official simulator map cases and six production gesture flows pass. Real TfL comparison returned two/three options in browser checks; named-street geometry loaded and persisted for Trafalgar Square–Camden Town. A broader all-path query exceeded the pilot limit, so the request now selects named streets/paths. Cached maps remained visible under browser offline emulation. Finish final copy check, packaging and release notes.

Completed: final package 135,636 bytes; preview left at http://localhost:4173/?rehearsal=full-trip. Test saved places removed. No physical-device claims.
