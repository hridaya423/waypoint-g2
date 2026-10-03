# Glasses interaction polish

The wearer is looking between a busy London street and a small monochrome display. Keep the stop timeline; make actions and transitions easier to understand. Smoothness means prompt feedback and fewer gestures, with no animation delaying navigation.

Observed gaps: waiting departures exist only on the phone; route preparation leaves an actionable start screen; browsing requires manual return; manual progression on the phone bypasses confirmation; the glasses omit the following leg. Detail and timeline offsets also refer to different positions.

Retain the existing pure HUD selector and canvas renderer. Add boarding predictions with freshness labels, route-comparison walking/change information, next-leg context, automatic return from browsing, a shared manual-confirmation action, and explicit loading/resume screens. Keep provider data and trust checks at their existing boundary. No new packages or provider framework.

Use the current timeline identity rather than a new dashboard or animated map. Add a distinct detail heading and position indicator so browsing has a visible location. Stop reminders retain priority. The SDK sender should abandon obsolete remaining tiles when a newer scene arrives.

Verify meaningful selector behavior with Node tests, native touch scenarios with the official simulator, and inspect the complete capture sheet. Rebuild the package and record remaining hardware limits.

Checkpoint: implementation and simulator/browser review complete. Release 0.3.0 packages successfully. Current behavior and evidence are recorded in docs/implementation.md and docs/verification.md. Physical-device tests remain the next gate.
