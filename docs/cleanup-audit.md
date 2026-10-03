# Code cleanup audit

Scope: application source, tests, simulator scripts and project configuration. Provider snapshots, generated packages and historical capture files are evidence, not cleanup targets. No dependencies were added or removed.

## Findings and changes

| File                                   | Verdict | Finding and action                                                                             |
| -------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `src/App.tsx`                          | CLEAN   | Native controls and direct rendering; retained.                                                |
| `src/DevicePanel.tsx`                  | CLEAN   | Corrected stale copy claiming all boarding requires a tap.                                     |
| `src/GlassesPreview.tsx`               | CLEAN   | Shared renderer and content-based redraw guard; retained.                                      |
| `src/JourneyPreview.tsx`               | CLEAN   | Removed a stop-state label inside a branch that excludes that state.                           |
| `src/RouteOutline.tsx`                 | CLEAN   | Owns a canvas lifecycle and attribution; retained.                                             |
| `src/connections.ts`                   | CLEAN   | Small calculation boundary with stale-data tests; retained.                                    |
| `src/geo.ts`                           | CLEAN   | Direct distance and path projection; retained.                                                 |
| `src/glasses.ts`                       | CLEAN   | Stateful bridge owns subscriptions and image delivery; retained.                               |
| `src/hud.ts`                           | CLEAN   | Reused the already-filtered ride list.                                                         |
| `src/journey.ts`                       | CLEAN   | Location checks and motion thresholds protect real navigation decisions; retained.             |
| `src/main.tsx`                         | CLEAN   | Minimal entry point; retained.                                                                 |
| `src/model.ts`                         | CLEAN   | Shared domain types; retained.                                                                 |
| `src/rehearsal.ts`                     | CLEAN   | Moved the Journey type reference into the existing type import.                                |
| `src/renderHud.ts`                     | CLEAN   | Removed a one-use title alias.                                                                 |
| `src/storage.ts`                       | CLEAN   | Persistence boundary checks and recovery resets retained.                                      |
| `src/streetMap.ts`                     | CLEAN   | Removed a canvas fill assignment overwritten before drawing.                                   |
| `src/style.css`                        | CLEAN   | Removed unused map, empty-state, compass and HUD-label styles.                                 |
| `src/tfl.ts`                           | CLEAN   | Provider validation, request timeout and stop matching retained.                               |
| `src/useStreetMap.ts`                  | CLEAN   | Owns offline status, debounce and cancellation; retained.                                      |
| `src/useWaypoint.ts`                   | CLEAN   | Removed unused returned setters/action, duplicate rehearsal resets and a redundant null check. |
| `tests/connections.test.ts`            | CLEAN   | Exercises route tradeoffs, stale data and direction mismatch.                                  |
| `tests/hud.test.ts`                    | CLEAN   | Exercises display states, urgency and bounded browsing.                                        |
| `tests/journey.test.ts`                | CLEAN   | Exercises complete transitions and rejected location traces.                                   |
| `tests/storage.test.ts`                | CLEAN   | Exercises recovery confidence and malformed/expired data.                                      |
| `tests/street-map.test.ts`             | CLEAN   | Exercises parsing, cache bounds, saved destinations and framing.                               |
| `tests/tfl.test.ts`                    | CLEAN   | Uses real response fixtures and invalid provider data.                                         |
| `tests/hud-gallery.html`               | CLEAN   | Purpose-built visual fixture; retained.                                                        |
| `scripts/capture-hud.py`               | CLEAN   | Capture and native-call checks retained; platform dependency documented.                       |
| `scripts/check-glasses-interaction.py` | CLEAN   | Gesture delivery and auto-return checks retained.                                              |
| `package.json`                         | CLEAN   | Dependencies have current consumers; retained.                                                 |
| `package-lock.json`                    | CLEAN   | Generated dependency lock; no manual changes.                                                  |
| `app.json`                             | CLEAN   | Permissions match current capabilities; retained.                                              |
| `tsconfig.json`                        | CLEAN   | Strict and unused-code checks enabled; retained.                                               |
| `vite.config.ts`                       | CLEAN   | Minimal build and development settings; retained.                                              |
| `index.html`                           | CLEAN   | Minimal document shell; retained.                                                              |
| `.gitignore`                           | CLEAN   | Dependency, build and secret exclusions; retained.                                             |

Final counts: 36 CLEAN, 0 SUSPICIOUS, 0 INFLATED, 0 CRITICAL. These verdicts assess code clutter, not production readiness or hardware reliability. The stylesheet's obsolete rules were the largest cut. No structural rewrite was justified.

## Separate correctness observation

The waiting HUD selects a fresh arrival by line ID, while connection estimates also match direction. At a station with both directions, the HUD can therefore feature another destination on the same line. It displays that destination, but does not select specifically for the planned direction. This pre-existing behavior needs a focused fix and regression test; it was not silently changed during cleanup.

## Verification checkpoint

All 38 Node tests passed. TypeScript and the Vite production build passed. Prettier passed for source, tests, README and this audit. Inspected the rebuilt app at desktop width in light mode, 390 px in dark mode and 320 px in light mode, including the corrected Device text and stop-detail interaction. README local links and its screenshot resolve. No physical G2 verification was performed.

Net source change: 72 fewer lines across eight files, with no dependency changes. Existing packaged releases were not replaced; run `npm run pack` to package this source.
