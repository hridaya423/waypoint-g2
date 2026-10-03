# Quiet navigation and automatic bus transitions

Keep the stop timeline and fixed layout. Remove persistent gesture instructions from normal guidance; put the gesture reference in the companion's disclosure. Use the bottom edge for a compact walk/bus/walk journey strip. Confirmation choices and uncertainty messages remain explicit because they change what the wearer should do.

Automatic boarding is an inference, not vehicle identification. Enable it only for a bus with a validated stop sequence, after observing the wearer at the boarding stop, then sustained accurate forward movement on the route. Reject location gaps, jumps, poor accuracy and walking speeds. Show a brief, undoable detected-ride state. A correction disables further automatic boarding for that leg, while a tap can still confirm boarding.

After reaching the alighting stop, automatically enter a following walk only when multiple accurate walking-speed fixes follow that walk and diverge from the bus route. Shared road geometry stays ambiguous and retains explicit confirmation. Never advance based only on the timetable or elapsed time. Rail boarding remains explicit until evidence is adequate.

Keep this logic in the pure journey engine, with transient evidence cleared on restoration. Add trace tests for complete walk → wait → bus → alight → walk, wrong roads, waiting jitter, fast walking, jumps, outages and undo. Verify quiet screens and temporary detection feedback in the official simulator. Thresholds are initial engineering choices and require field calibration.

## Completion checkpoint

0.4.0 implements quiet guidance, the journey ribbon, conditional bus boarding/final-walk inference, undo and the complete rehearsal. Thirty tests, 22 simulator cases and six production gesture flows pass. Package: 130,469 bytes. Field calibration remains the next gate; the current heuristics cannot identify the vehicle. See ../verification.md for evidence.
