# Glasses-first redesign

The wearer should see what stop comes next, what has passed, where to get off and whether to act, within a glance at 576 × 288. The previous text-only display is the anti-reference. The website now serves the glasses experience.

Considered: native text/list controls (efficient but fixed typography and unreliable symbol coverage); native text with a separate icon strip (good transfers but limited hierarchy and independently updated labels); a shared monochrome canvas with four SDK-size image tiles (precise typography, drawn circles/checks, exact preview and reusable state layouts). Implement the canvas after testing its actual SDK path. Images must remain within 288 × 144. Keep one invisible event-capture text container. No animation or continuous map repainting. Coalesce stale pending frames and skip identical tile bytes.

Visual direction: a transit strip with ticks inside circles for passed stops, a strong hollow next-stop marker, a distinct destination target, and a large right-side status. Four visible stops at a time. Brightness carries hierarchy, shapes carry state. Urgent STOP replaces the right-side status; it never removes the destination. Uncertain location removes inferred progress ticks. Rehearsal stays visibly labelled.

The glasses view also owns route comparison, walking, waiting, alighting, completion and uncertainty. Swipes browse routes before starting and stops while riding; critical alerts override browsing. Long press returns to the live view. The phone preview uses the same drawing function and dimensions, not a separately styled approximation.

Acceptance: real simulator screenshots for idle/route choice, walking, boarding, mid-ride, STOP, acknowledged, alighting, arrival and uncertain tracking; working glasses touch input; stop ticks follow trusted progress; stale fixes cannot show confident progress; long stop names remain accessible; no invalid image size or bridge errors. Build/test/package and checkpoint evidence. Physical comfort and battery measurements remain hardware-dependent and must not be represented as measured.
