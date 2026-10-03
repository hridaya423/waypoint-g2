# Waypoint implementation checkpoint

## Current release: 0.5.0

The London-first Even Hub prototype now uses a graphical 576 × 288 glasses display. A four-stop timeline shows passed-stop ticks, current/next markers and a destination target. The adjacent status shows remaining stops, boarding instructions, stop requests and alighting. Swipes browse stops, tap opens full names, and hold returns to live progress. Urgent reminders override browsing. Uncertain location removes inferred progress and allows a separately confirmed manual arrival.

The companion preview uses the same canvas drawing function as the glasses images. `src/hud.ts` selects presentation state; `src/renderHud.ts` draws it; `src/glasses.ts` owns the official SDK bridge. Four 288 × 144 image containers satisfy the SDK image limit. An empty full-display text container captures touch. The sender skips identical tiles and retains only the newest pending scene. Tile updates are sequential, not an atomic display transaction.

The pure journey engine, TfL boundary and storage remain separate. Real TfL routing offers up to three distinct returned alternatives, validated bus stop sequences and waiting departures. Bus boarding and the following walk can advance from location evidence; rail and ambiguous cases remain manual. There is no backend, embedded credential, external font or map dependency.

Validation: 30 tests, strict TypeScript, production build, Prettier and dependency audit pass. The official simulator rendered 22 cases through the SDK image bridge. Main-app gesture scenarios cover browsing, stop acknowledgment, arrival, manual arrival confirmation/cancellation boarding and detected-ride undo. See the verification record and `docs/design/quiet` for captures.

Deliverable: `artifacts/waypoint-0.5.0.ehpk`. SDK 0.0.16; minimum Even App 2.2.10. The package is local and has not been installed on physical glasses.

## Interaction polish

Waiting now shows a stop-letter badge and the earliest fresh prediction for the requested line, with its destination visible. Predictions expire after 90 seconds and past departures disappear. This is a stop prediction, not vehicle matching. Route selection includes changes and walking time; onboard screens name the following leg. Stop details include their position and passed/current/upcoming status.

A 12-second inactivity timer restores live guidance after browsing. It resets on further browsing and clears on leg/phase changes and unmount. Manual arrival uses one confirmation flow on phone and glasses. Ending a journey on the phone has a cancelable confirmation. Loading and resume feedback are visible on G2; resume clears location confidence. Active journey actions remain available while the phone searches for another route.

The image sender skips obsolete remaining tiles when a newer scene arrives. Stop projections are calculated once per HUD selection instead of repeatedly for markers and counts. Repeated identical-scene submissions were verified to produce no additional native image calls. These checks establish behavior, not a hardware speed multiplier.

## Quiet guidance and bus detection

Normal guidance omits gesture instructions. A fixed journey ribbon highlights the current walk/bus/walk leg; walking gives distance and direction priority. Controls live in a collapsed companion disclosure. Detected transitions briefly expose undo, while urgent stop instructions retain priority.

Boarding requires a validated bus sequence, an accurate fix within 25 metres of the boarding stop, then at least three movement samples spanning 12 seconds and 90 metres at 5–25 m/s. Fix accuracy must be within 20 metres, gaps within eight seconds, and the destination more than 100 metres away. A jogging regression led to the stricter speed threshold. These thresholds are uncalibrated field assumptions.

Final-walk detection requires several walking-speed samples on the next walking leg that diverge at least 30 metres from the incoming bus corridor. Shared-road geometry stays manual. A bus turning slowly onto that path can still resemble alighting. Undo disables another inference for the affected leg. Recovery clears motion evidence while retaining correction provenance.

The full-trip rehearsal feeds 31 synthetic fixes through the real engine. Its walk → wait → bus → alight → walk → arrival trace passes without boarding or alighting taps. This does not establish correct-vehicle identity or real-world reliability.

## Next validation

Install on G2 and run the included five-minute lock/location/display diagnostic. Then test a familiar London bus route, recording readability, actual alert delivery, stop timing and reconnection. Longer 30/90-minute endurance checks remain necessary. The simulator cannot establish optical comfort, phone background reliability or battery performance.

Voice destinations, live National Rail delay integration, automatic disruption rerouting and international coverage remain later stages in the research plan. This release does not yet replace Google Maps hands-free.

## Maps, connections and saved destinations

North-up street maps reuse the four-tile canvas renderer. Walking guidance reserves the right side for the next instruction and distance. The overview fits every route leg; alerts, uncertainty and confirmations override it. Browsing returns to live guidance after 12 seconds. Map loading and caching live in `useStreetMap.ts`; geometry parsing, projection and drawing live in `streetMap.ts`. No dependencies were added.

The public Overpass query selects named streets and paths. A broader query exceeded the pilot’s 12,000-way limit on a real London route; the narrower query loaded successfully. Terminal requests encountered 406, 429 and timeout responses; browser/simulator requests succeeded. Street-service failure keeps route geometry and labels the missing context. The most recent area is cached locally for seven days, within a two-million-character write bound. Route bounds over 12 km diagonal remain route-only.

Route comparison labels actual tradeoffs in returned options and shows London departure/arrival times. Connection guidance estimates remaining planned time to the next boarding point. Only fresh line-and-direction-matched predictions supply live departure estimates; other cases use a labelled timetable or report missing data. It is not a vehicle-specific arrival forecast. Alternatives never silently replace an active journey, and a replacement cannot start while still riding.

Saved destinations are local, named and limited to eight. The glasses picker obtains one current fix through the official SDK before searching, leaving route selection explicit. Physical G2 location acquisition remains unverified.

Current verification: 38 tests, three new simulator map cases, six production gesture flows, real TfL comparison and street data, saved-place reload/selection, 390-pixel dark and 320-pixel light layouts, and cached map visibility under browser offline emulation. See verification.md.
