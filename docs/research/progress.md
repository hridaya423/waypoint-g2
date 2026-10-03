# G2 transit navigation research

Research date: 3 October 2026. Status: research and proposed plan complete; no implementation started.

The workspace was empty and is not a Git repository. Research files live under `/Users/hridyaagrawal/honey/navigation`.

User wants public transport navigation, bus boarding detection, timely stop-button prompts, train arrival and delay information, hands-free operation, and high performance. User subsequently confirmed London/UK first, gradual international expansion, and iOS/Android as acceptable target platforms. Multiple route choices, including walking alternatives, are now a core requirement.

Verified findings:

- Official Even Hub apps run in the Even phone app WebView and render through SDK containers on G2.
- Official documentation lists phone location updates, raw microphone audio, IMU input and incremental text updates.
- npm registry reports SDK 0.0.16, published 24 September 2026, minimum Even App 2.2.10. The documentation changelog still lists 0.0.14. Downloaded the published README and TypeScript definitions for inspection.
- SDK 0.0.16 fixes repeated timer callbacks; 0.0.15 preserves the source of long-press events.
- Official lifecycle docs claim iOS keeps the WebView running and warn that Android suspension loses memory, audio and location streams. Whole-journey locked-phone testing remains necessary on the user's hardware.
- No public wake-word registration, native background-service control, haptic output, or built-in speech recognition method was found in the inspected API surface. These are not assumed capabilities.
- Transit inference must separate movement, likely route and direction, and exact vehicle identity. No single speed or distance threshold proves boarding.
- TfL offers journey, stop, line, arrival, and vehicle APIs. National Rail Darwin supplies live rail predictions. England's BODS supplies bus schedule and vehicle data. Coverage and identity matching require route-level validation.

Deliverable: `2026-10-03-g2-transit-plan.md` contains provider comparison, lifecycle and hands-free feasibility gates, stop-alert rules, performance targets, a staged build plan and field acceptance criteria, with source links.

Additional verification:

- Official submission guidance requires installed beta builds for locked-phone testing; QR development mode is unsuitable for that check.
- Read-only TfL route 24 API samples returned 202 arrival predictions and an outbound sequence of 35 stops. Snapshots are saved here; these are sample evidence, not comprehensive coverage or freshness validation.
- Saved file references resolve. SDK version/minimum host and TfL sample counts were checked against downloaded evidence.
- No application was built, no hardware tests were run, no accounts were created, and no developer outreach was sent. Performance numbers in the report are proposed targets.

Plan updated with route comparison, mid-journey switching, alert continuity, a coverage matrix and independent iOS/Android qualification. Exact test devices and R1 ownership remain unknown.

Next implementation step: installed-beta locked-phone feasibility experiment and a London walking-alternatives provider trial. No implementation or hardware verification has been performed.

3 October implementation checkpoint: working local app and .ehpk now exist. See ../implementation.md, ../verification.md and ../../README.md for current capability, test evidence and hardware handoff. Research-only status is superseded by the prototype. Physical G2 and installed-beta lifecycle remain unverified.


Graphical release checkpoint: 0.2.0 now implements the glasses-first stop timeline and shared canvas preview. Final build, package, 19 tests and 14 simulator states verified; main-app gesture evidence is in docs/design/glasses-first. See docs/implementation.md for current scope and hardware gates.

0.4.0 checkpoint: quiet glasses guidance and experimental bus boarding/final-walk inference are implemented with undo. Thirty tests, 22 simulator cases and six production gesture flows pass. Physical G2 and locked-phone validation remain outstanding. Current details: ../implementation.md and ../verification.md.

0.5.0: north-up street maps, route tradeoff labels, estimated connection margins, saved destinations and bounded local map caching are implemented. Browser and official simulator checks passed; see ../verification.md for provider limits and remaining hardware validation.
