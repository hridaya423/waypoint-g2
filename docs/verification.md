# Verification record · 3 October 2026

This record describes a prototype, not a field-qualified navigation release.

## Earlier 0.1.0 evidence

The text-container implementation and rehearsal swipe behavior described below are historical. The 0.2.0 record at the end supersedes them.

## Automated evidence

Twelve Node tests cover explicit boarding, the penultimate-stop reminder, acknowledgment and arrival, poor accuracy, stale fixes, route jumps, wrong roads, out-of-order callbacks, invalid numeric values, walking-to-boarding transition, destination overshoot, session recovery, expired/corrupt storage, real TfL route parsing, alternative deduplication, alias reconciliation and malformed prediction timestamps.

The stop-alias regression test was mutation-checked: reverting endpoint reconciliation to exact ID equality produced one failing test. Restoring reconciliation returned all tests to passing. This test uses captured TfL responses, not invented API shapes.

TypeScript strict checking and the Vite production build passed. The full dependency audit reported zero vulnerabilities after upgrading Vite to 7.3.6. Final package/build results are recorded in the implementation checkpoint.

## Manual evidence

Chrome UI testing returned two real all-transport routes and two real bus routes for Trafalgar Square → Camden Town. Light and dark layouts were rendered and inspected. The complete browser rehearsal reached PRESS STOP NOW, acknowledged it, reached the alighting screen and completed arrival.

The official Even Hub simulator 0.9.5 accepted SDK 0.0.16 containers and touch input. Downward swipe advanced the rehearsal and the 576 × 288 framebuffer displayed PRESS STOP NOW with the target stop. The initial ready screen also rendered without clipping. Raw screenshots use transparency; the `*-visible.png` copies composite the same framebuffer over black for inspection. No content was redrawn.

The simulator's compact companion view was inspected at its 600 CSS-pixel width. The desktop Chrome screenshot capture was distorted and too small for detailed pixel comparison, so exact desktop typography and 390-pixel phone rendering remain a narrower visual-validation gap. Controls and returned text were separately verified through the accessibility tree.

The in-app browser rejected localhost with ERR_BLOCKED_BY_CLIENT. Native Chrome was used for interaction testing; the simulator's documented screenshot API supplied clear compact-layout and glasses captures.

## Integration findings

TfL's accepted rail journey mode is `national-rail`, not `train`. The original request returned HTTP 400; the corrected request returned real alternatives in Chrome.

The journey API returned boarding ID `490013767A` and destination `490000036S` for an example bus leg. The line sequence represented the same physical points as `490013767C` and `490015041Y`, with matching C/Y stop letters and near-identical coordinates. A strict match rejected useful stop tracking. The implementation now allows bus endpoint reconciliation only within 20 metres with an identical nonempty stop letter, followed by exact ordered intermediate names, complete count, and monotonic route-geometry validation. Ambiguous candidates remain unsupported. Live preparation then returned 12 validated stops for route 29.

The CLI could not fetch its compatibility metadata and fell back to Even App 2.2.6. The installed SDK package explicitly declares minAppVersion 2.2.10. The manifest therefore sets 2.2.10; packaging confirmed it retained that stricter floor.

## Structural review

Scope: all new application source and tests. No pre-existing application code or Git baseline existed. The review used Ponytail, Architect, Code Deslop and Thermo-Nuclear Code Review.

The large initial UI was split by its actual responsibilities into the planner, journey preview, schematic and device diagnostic. Duplicate journey URL construction was consolidated. The unused geometry helper was removed. Network response checks remain at the provider boundary; the journey decision function is independent of React, network and SDK. There is no speculative provider framework or backend.

The controller is intentionally one module for this small pilot. A separate diagnostic controller becomes worthwhile if device testing expands beyond the present counter and audio-byte probe. No structural blocker remains for this prototype. Verdict: APPROVE.

## Unverified

Physical G2 display/wake behavior, installed beta startup, permissions and exit lifecycle, actual location timestamps/accuracy, phone lock, OS suspension, battery draw, Bluetooth recovery, microphone delivery, crowds/traffic/parallel-road matching and real stop timing. No claim of fully hands-free navigation or Google Maps replacement follows from the checks above.

Final display refinement: a production-build simulator capture exposed a transient mixed frame when three text containers updated in sequence. The display now uses one text container and one SDK text update per changed instruction. This removes the application-level title/detail split and reduces bridge calls. The phone preview retains its separate visual hierarchy. Hardware-level presentation timing remains unverified.

Visual comparison with the generated reference: retained the restrained green/neutral palette, planner/preview hierarchy and route choices. Intentional departures are the honest geometry-only schematic, explicit rehearsal/device status, and system typography. The compact view stacks the same content. The generated reference is direction, not a claim of an available street-map integration.

Final production verification: rebuilt and packaged successfully after the single-container change. Twelve tests passed again. The production app served on port 4173 was loaded into simulator 0.9.5, advanced with seven downward inputs, and captured showing REHEARSAL, PRESS STOP NOW and Tottenham Court Road together. Captured console contained no errors or unhandled rejections. Final package size: 123,554 bytes.


## 0.2.0 graphical display verification

The final source passed 19 Node tests, strict TypeScript, production bundling, Prettier and a zero-vulnerability npm audit. Packaging produced a 127,476-byte package with minimum Even App 2.2.10. Seven additional tests cover presentation state, uncertain progress, acknowledgment, long names, list boundaries, unsupported stop sequences and counts at a current stop.

`scripts/capture-hud.py` captured 14 official simulator framebuffers: idle, route choice, walking, boarding, riding, STOP, acknowledged, alighting, arrived, uncertain, long-name detail, a captured real 12-stop London itinerary, browsing its final stops, and illustrative rail layout. All were visually inspected in `docs/design/glasses-first/contact-sheet.png`; no clipping or overlapping content was observed. Long names truncate in the timeline and remain available in the detail screen. Rehearsals are visibly labelled. The rail fixture demonstrates layout only, not real railway data.

`scripts/check-glasses-interaction.py` exercises the main app, separately from the renderer gallery. It verifies event delivery and captures the resulting screens for browsing/details, stop acknowledgment, arrival/finish, uncertain-location confirmation/cancellation/manual arrival, and boarding. These captures were visually inspected. Both helpers require the development server on 5173, the installed macOS ARM64 simulator and Python Pillow; they own and terminate their simulator processes on port 9898.

The simulator exposed two input issues: a small capture container received taps but not swipes, and system click events omitted their zero-valued event type. A full-display blank capture container and explicit handling of the observed event shape restored both interactions. Subsequent captures show native swipes changing the selected stop and long press restoring the live timeline.

The graphical sender uses four legal-sized image tiles, skips identical tiles and coalesces pending scenes. There is no animation loop. Simulator bridge timing is not physical Bluetooth latency. Sequential tiles can briefly form a mixed frame; atomic presentation, brightness, optical legibility and battery consumption require hardware measurement.

The compact companion screenshot `companion-first.png` was inspected with the glasses canvas first in the layout. Exact 390-pixel phone typography and physical iOS/Android Even host behavior remain unverified. All earlier physical-device limitations still apply.


## 0.3.0 interaction polish

21 tests pass, including fresh/stale/expired/wrong-line departure selection and route-change/next-leg presentation. Strict TypeScript and production packaging pass; Prettier passes and npm audit reports zero vulnerabilities. SDK and minimum app versions remain unchanged.

The official simulator captured 18 cases in `docs/design/polish`. This includes 17 visual states and an identical-scene update check. The boarding display has been inspected with live predictions and expired predictions. The stop badge is centered, departure destination and freshness guidance remain visible, and the London onboard view shows its following four-minute walking leg. No invalid image size or console errors were found.

The production app on port 4173 passed the five native gesture scenarios. The riding scenario additionally waits 12.5 seconds after entering details and asserts that the resulting framebuffer exactly matches the earlier live view. Three extra identical scene submissions in the renderer fixture leave the native call count at five: container creation plus four initial images.

The in-app browser worked in this session. A real TfL search returned two Northern line alternatives and selecting the second changed the glasses preview. Desktop light layout, 390-pixel dark layout, 320-pixel light layout, arrival confirmation/cancellation and end-journey cancellation were inspected. Keyboard Enter opened manual-arrival confirmation. A duplicate confirmation action found during this review was removed. These checks narrow the earlier companion-layout gap; they do not validate a physical phone's Even host.

Structural review retained the current HUD/renderer/SDK boundaries and added no dependencies. Presentation uses actual prediction freshness; it does not invent vehicle matching or live onboard ETAs. Sequential image presentation and all physical-device limits remain.

Final package: artifacts/waypoint-0.3.0.ehpk, 129,030 bytes. The final production companion exposes exactly one Confirm arrival button; cancel restores Stop details. Dependency metadata matches the installed lock and the audit remains clean.


## 0.4.0 quiet guidance and automatic transitions

30 tests pass, including sustained bus movement, jogging rejection, poor accuracy, location gaps/jumps, rail exclusions, divergent and shared-road alighting, undo and recovery. The complete synthetic walk → bus → walk trace reaches arrival without boarding/alighting taps. TypeScript and production packaging pass. The final package is `artifacts/waypoint-0.4.0.ehpk`, 130,469 bytes, with minimum Even App 2.2.10.

The official simulator completed 22 cases (21 visual states and an identical-frame deduplication check) in `docs/design/quiet`. Screens were inspected for quiet footers, prominent walking distance, the fixed three-leg ribbon, stop reminders and temporary detection feedback. The production app passed six native gesture flows, including detected-ride undo and the 12.5-second return-to-live framebuffer assertion. No console errors were reported. Repeated identical scenes retained five native calls.

The companion full-trip rehearsal was advanced through walking, riding, alighting, final walking and arrival in the browser. Its compact light and dark layouts were inspected, including the walking distance and journey ribbon. Earlier responsive checks remain recorded above.

Structural review retains inference and correction in the pure journey engine, presentation in the HUD/renderer, and subscriptions in the controller. No dependencies or provider framework were added. Permanent tutorial copy moved to a disclosure. Motion evidence is transient; recovery retains the ability to correct an inferred transition.

Automatic detection is experimental. Synthetic traces cannot prove which bus the wearer boarded. Slow traffic and short legs may need a tap; a bus moving along the following footpath can resemble alighting. Physical G2 readability, real-world calibration, locked-phone endurance and voice destinations remain unverified or unimplemented.


## 0.5.0 maps and journey context

38 tests pass. New coverage includes route tradeoffs, uncertain connection estimates, stale and wrong-direction predictions, geometry parsing, incomplete Overpass responses, cached map retrieval with an already-aborted network signal, area/age rejection, saved-place restoration and map framing. Two initial behavioral tests failed as expected before implementation. TypeScript and production packaging pass; dependency audit reports zero production vulnerabilities.

The official simulator rendered walking map, full-route overview and route-only fallback in `docs/design/maps`. All completed through five native calls, with no console errors. The final captures were inspected; minor-path clutter was reduced and attribution separated from geometry. The six production input scenarios passed, with the riding scenario extended through details → map → timeline and the 12.5-second return-to-live assertion.

Browser checks used actual TfL Trafalgar Square → Camden Town results, switched between returned alternatives, and loaded named OpenStreetMap streets for the route. A test destination survived reload, appeared in the glasses picker and repopulated To through its shortcut. Networking was disabled through browser emulation; the downloaded map stayed visible and departures were marked unavailable. Networking was restored. Desktop light, 390-pixel dark and 320-pixel light layouts were inspected.

Provider findings: an all-path request for the real route exceeded the 12,000-way pilot bound; selecting named streets and paths resolved it. Command-line Overpass requests received 406/429/timeouts while browser/simulator requests succeeded. This evidence supports a prototype integration, not a provider reliability guarantee. No public OSM raster tiles are prefetched. Attribution is visible on glasses and linked in the companion.

Structural review covered the new map/data/cache boundary, connection calculations, saved storage and controller/UI changes. The map-loading lifecycle was separated from the growing journey controller; domain estimates remain pure, provider parsing stays at the boundary, and the established canvas/SDK split is retained. No additional dependency or generic provider framework. Verdict: APPROVE.

Maps are north-up, not calibrated head-relative maps. Connection margins are estimates from planned travel time and stop predictions; exact vehicle matching, train delay integration and automatic rerouting remain unimplemented. Cache covers the last downloaded bounded area, not a whole city or offline route calculation. Physical G2 optics, latency, power use, saved-place location acquisition and phone-lock endurance remain unverified.

Sources: [OpenStreetMap attribution and licence](https://www.openstreetmap.org/copyright), [Overpass API and public-instance usage](https://wiki.openstreetmap.org/wiki/Overpass_API), [public raster tile policy](https://operations.osmfoundation.org/policies/tiles/).

Final 0.5.0 package: 135,636 bytes, minimum Even App 2.2.10. Verification-only saved places were removed from both local preview origins.
