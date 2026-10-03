G2 public transport navigation: research and proposed build plan

Researched 3 October 2026. This is a proposed design, not a tested product or an approved implementation specification. The user has confirmed London and the wider UK as the first priority, with gradual international expansion. Both iOS and Android are product targets; either can host the first hardware experiment. Exact test phones and R1 ownership remain unconfirmed. The workspace was empty, so there is no existing application to extend.

Build a journey assistant that keeps the phone in a pocket from departure to arrival. Its defining feature should be dependable guidance through boarding, riding, getting off and transferring. A polished map cannot compensate for a missed stop.

My recommendation is an official Even Hub plugin with journey decisions running locally in the phone's hosted WebView, backed by one small service for transit feeds, credentials and optional speech transcription. Start with London and validate iOS and Android independently. Either platform can host the first experiment; a pass on one does not establish support on the other. Prove a real bus journey with a locked phone before expanding to rail, arbitrary destinations and continuous voice interaction.

**Route choice is part of the core experience, including walking-only journeys.**

Offer a recommended route and one useful alternative by default. Make a third available only when it offers a materially different tradeoff. Examples below are illustrative, not provider results:

| Choice | Walking example | Transit example |
| --- | --- | --- |
| Route 1 | 12 min · 850 m · via High Street | 28 min · bus + Tube · 1 change |
| Route 2 | 15 min · 1.0 km · via the park | 33 min · direct bus · less walking |

On the glasses, show two concise choices and let the wearer select with a swipe/tap or, once voice input is validated, “Route one” and “Route two”. Offer an optional preview showing where the paths differ. Keep route number, duration, distance or transfers, and a distinguishing street/service visible; monochrome route selection cannot depend on color alone. This is a behavioral specification, not a rendered UI.

Walking alternatives must be genuine pedestrian routes. Prefer a meaningful difference in path, distance, steps or crossing count when those attributes are available. Do not label a route quieter, safer, accessible or better lit without supporting data. For transit, compare total arrival time, walking, changes, connection margin and current disruption. Collapse nearly identical choices rather than manufacturing a second option.

Keep the selected route stable while walking. “Other routes” should work both before departure and mid-journey, recalculating from the current trusted position. Preview a switch and explain its consequence before replacing the active route. If a material disruption invalidates the route, present the replacement clearly; do not silently swap routes for tiny ETA changes. While the wearer browses alternatives, the current journey and critical stop alerts remain active. Boarding a vehicle must constrain new alternatives to reachable exits and transfers, rather than planning as though the wearer could immediately leave it.

A route-switch operation replaces the itinerary and its associated stop-alert state together. Reject late network results from the old itinerary. Revalidate departure availability when selecting a transit option; a bus that was available when the choices loaded may have left.

Provider selection now includes a walking-alternatives test. Google documents alternative-route requests, but alternatives may be absent and requests can take longer. Its general documentation is not sufficient proof of useful pedestrian alternatives on our launch journeys. Test actual WALK requests alongside the selected pedestrian provider, including parks, pedestrian bridges and step-free constraints. TfL can supply transit choices; a dedicated walking provider may still be needed. [Google alternative routes](https://developers.google.com/maps/documentation/routes/alternative-routes)

Acceptance cases: two distinct available choices; only one valid route; alternative request failure; stale transit departure; voice ambiguity; switching while walking; browsing during a stop alert; and a new choice invalidated by a disruption. The existing route remains usable if alternatives fail. Alternatives belong in the London core release before broader coverage, with a focused walking-route spike alongside device feasibility.

**Roll out by demonstrated coverage and reliability.**

London comes first: walking, buses, Tube and relevant rail connections. Expand through the UK operator by operator, accounting separately for Scotland, Wales and Northern Ireland rather than treating England's BODS or GB rail data as universal UK coverage. International support follows gradually, selecting cities by usable routing, stop sequences, realtime feeds, pedestrian coverage and field-test access. Prioritize the user's requested developed-country markets, but publish support by city, mode and capability rather than claiming an entire country works because route search succeeds.

Maintain a coverage matrix distinguishing route planning, live departures, vehicle matching, stop reminders, accessibility data and offline guidance. A city with scheduled routing only must not inherit a live-tracking claim. Preserve provider IDs and provenance at the integration boundary; add provider implementations when actual expansion needs them, without building a universal provider framework ahead of the London pilot.

For quality, support status requires a tested phone OS/app/firmware combination and a recorded field result. Prioritize correct guidance, recovery and legibility before optional visual effects. iOS and Android can share journey logic, but each needs its own endurance, reconnection, permissions and microphone tests. Keep the same behavioral expectations across both platforms and state any temporary feature differences explicitly.

**The SDK supports a credible prototype, with several product promises still conditional.**

Even's current Navigate supports walking and cycling and uses Google Maps data. Saved destinations and built-in Even AI can start navigation from the glasses. Public transport would therefore address a documented gap, but the public SDK does not document a way to modify the built-in Navigate app. Plan a separate Hub app. [Official Navigate guide](https://support.evenrealities.com/hc/en-us/articles/14273871101071-Navigate)

G2 has a 576 × 288 display per eye, 16 green brightness levels and microphone input, but no camera or speaker. Hub plugins are web applications hosted on the phone; the glasses provide display and input. The overview describes plugins as available, with AI skills and dashboard surfaces still forthcoming. This limits which first-party capabilities can be assumed available to a third-party app. [Platform overview](https://hub.evenrealities.com/docs/get-started/overview)

| Requirement | Evidence and implication |
| --- | --- |
| Track phone position | `getAppLocation`, `startAppLocationUpdates`, `onAppLocationChanged` and `stopAppLocationUpdates` are published APIs. Location includes coordinates and optional accuracy, speed, heading and timestamp. |
| Request suitable sampling | Options include accuracy, interval and distance filter. These are requests to the host, not a guaranteed delivery rate. |
| Capture speech | `audioControl` supplies PCM audio. Speech recognition and intent handling are application responsibilities. |
| Read movement | `imuControl` and `imuData.x/y/z` exist. Units, reference frame and usefulness for boarding or head gestures require physical validation. |
| Update the display efficiently | Incremental text updates are available. Maps and custom large lettering require the image path rather than arbitrary on-glasses HTML. |
| Control from glasses/ring | Touch and long-press events are published. Optional R1 input is useful but is still manual input. |
| Register a custom “Hey Even” command | No such public method was found in the inspected SDK. Treat as an unanswered platform capability, not a planned dependency. |
| Make G2 speak or vibrate | No SDK audio-output or haptic-output method was found. Do not promise ring vibration either. |
| Start a native background service | No public plugin method was found. The host app owns native execution privileges. |

The method inventory was checked against the published [SDK package](https://www.npmjs.com/package/@evenrealities/even_hub_sdk) and [Device APIs documentation](https://hub.evenrealities.com/docs/build/device-apis). Missing methods mean unsupported by the inspected public interface, not proof that the hardware or private partner APIs can never provide them.

I independently fetched npm metadata and inspected the package README and TypeScript declarations. The registry's latest version was **0.0.16**, published 24 September 2026, with minimum Even App **2.2.10**. The documentation's changelog table still showed 0.0.14. Version 0.0.16 fixes repeated `setTimeout`/`setInterval` callbacks; 0.0.15 preserves long-press input source. Pin the tested version and record phone app and firmware versions alongside field results. Local evidence: [registry metadata](./sdk-registry.json), [published README](./sdk-package-README.md), [type definitions](./sdk-package-dist-index.d.ts). [Documentation changelog](https://hub.evenrealities.com/docs/reference/changelog)

**Locked-phone reliability is the first go/no-go decision.**

Even's lifecycle page says its iOS WebView continues running, while Android can lose in-memory state and streams when suspended. Its QA guide explicitly distinguishes QR development mode from installed beta builds: use beta for locked-phone validation. Those statements are encouraging, but neither proves uninterrupted guidance over a particular 90-minute journey. [Background lifecycle](https://hub.evenrealities.com/docs/build/background-lifecycle), [submission and QA](https://hub.evenrealities.com/docs/ship/app-submission)

Build the first experiment with a location timestamp, sequence counter and scheduled text change. Test for 5, 30 and 90 minutes with the phone locked; then repeat while another phone app runs, after Bluetooth interruption, under low power settings, and while other glasses features interrupt. Measure callback gaps and whether the changed text actually becomes visible. SDK success responses alone cannot prove the wearer saw an alert. Test the installed distribution path, not only the simulator.

Persist the active itinerary, current leg, boarding confidence, relevant stop occurrence, last trusted observations and alert acknowledgement at meaningful transitions. On restart, rebuild from current evidence. Do not replay every expired alert or resume an old countdown as though no time passed. A stale screen should include its last-update time wherever practical. If the entire host stops executing, application code cannot update its own failure warning; that remaining failure must be understood before advertising unattended reliability.

**Hands-free operation has three distinct levels.**

| Level | Proposed behavior | Status |
| --- | --- | --- |
| Phone stays in pocket | Launch/select on G2 or R1; every journey step appears automatically | Best first deliverable, subject to beta lifecycle testing |
| Touch-free within an active journey | Listen for short commands and spoken answers while the navigation session is running | Feasible experiment using microphone capture; recognition, noise, battery and interruptions need measurement |
| Voice launch from any idle state | Say a phrase without opening the plugin first | Public integration unverified; cannot promise this today |

Even AI has a system “Hey Even” wake phrase and controls built-in features. That does not establish third-party command registration. Test plugin coexistence and ask Even for supported launch/intent integration before making system-wide voice launch a commitment. [Even AI guide](https://support.evenrealities.com/hc/en-us/articles/14274515708559-Even-AI)

For the initial voice flow, offer saved destinations such as Home first, then arbitrary places with spoken disambiguation: “Camden Town station or Camden Road station?” During an active session, keep a small command set: “How many stops?”, “I'm on board”, “Repeat”, “Take me home”, “Change route”, and “Cancel journey”. Starting or replacing a journey needs a clear confirmation; routine progress should not require interaction.

Use short capture windows opened by a touch gesture initially. To meet the user's stronger touch-free goal, separately test local voice activity detection and a small keyword recognizer inside the active WebView. Do not call touch-to-talk hands-free. A nod-based answer is another experiment, not a launch requirement: ordinary head movement must not accept the wrong destination.

Avoid continuous cloud transcription. Uncompressed 16 kHz, 16-bit mono audio is 32,000 bytes/second, about 115 MB/hour before network overhead. Local gating can reduce upload but still keeps the microphone and local processing active. Test its battery cost and command accuracy on a noisy bus. Speech interpretation may use a language model, but the route, service identity and stop alerts must come from validated transit data and deterministic journey state.

**The normal journey should advance without menus.**

The following is proposed copy, not live timetable information or a rendered design:

| Situation | Primary instruction | Supporting information |
| --- | --- | --- |
| Walking to a bus | Go to stop C | 180 m · Bus 24 toward Hampstead Heath |
| At the stop | 24 due in 3 min | Check destination: Hampstead Heath |
| Boarding evidence is ambiguous | Are you on the 24? | Say “yes” or confirm on glasses |
| Riding | Get off at your saved stop | 5 stops · about 12 min |
| Target is the next served stop | PRESS STOP NOW | Your stop is next |
| Arriving | Get off here when the bus stops | Then walk to the station |
| Waiting for a train | 18:42 service expected 18:49 | 7 min late · Platform 4 |
| Underground with lost tracking | Get off at King's Cross | Progress uncertain · check station signs |
| Walking the final leg | Turn left onto the named street | Destination 250 m |

The instruction should occupy a stable place on the display. Show route identity/direction and one useful time or stop count beneath it. A glance should answer “What do I do next?” A stop alert temporarily takes priority over the rest of the information. Acknowledgement means the wearer saw the reminder; the app cannot know whether the bus's physical stop button has actually been pressed.

Keep a route overview one gesture away for orientation, but do not continuously stream a map. Follow the actual G2 display constraints: native text has fixed font behavior; black is transparent, and the display has limited containers. Large custom text should be pre-rendered only if hardware tests show native text is insufficient. The phone setup interface should support light and dark mode; G2 uses its monochrome hardware presentation. [Display system](https://hub.evenrealities.com/docs/build/display), [design guidelines](https://hub.evenrealities.com/docs/build/design-guidelines)

**Bus detection must distinguish three questions: are you riding, which route are you riding, and which vehicle is it?**

Start inference only during an explicitly active journey. The itinerary narrows candidates to the planned boarding stop, plausible departures, route branch, direction and target stop. Combine proximity to the boarding stop, sustained departure from it, route-following movement, ordered progress past stops, and fresh vehicle/service observations when available. Speed alone cannot distinguish a bus from a car beside it; a glasses IMU cannot identify a bus number.

Use three operational confidence levels:

- Confirmed by the wearer, with subsequent movement still consistent with the chosen service.
- Strongly inferred from multiple observations and a clear candidate; this may support automatic progression after field calibration.
- Ambiguous, including multiple buses together or overlapping routes. Request one short confirmation and keep the intended destination visible.

Route certainty and physical-vehicle certainty should be stored separately. Onboard guidance can sometimes work without an exact vehicle ID if the route, direction, stop sequence and phone position are sound. Conversely, a departure feed's vehicle ID does not prove the wearer boarded it.

Track progress along the selected route geometry and ordered stop occurrences. A circular route may visit the same stop ID twice, so stop ID alone is insufficient. Require consistent observations before changing direction or declaring an off-route event. Match the actual service's calling pattern: express, short-turn, skipped-stop and diversion behavior must not inherit every stop from a generic line.

**“Press STOP now” should be based on the next served stop.**

The strongest normal trigger is that the bus has passed or departed the previous served stop and the target is next. Give a quieter preparation cue two served stops earlier if useful. Trigger the prominent reminder promptly once the target becomes next, rather than waiting until a universal 100-metre radius. If the rider boards one stop before the target, prompt as soon as boarding and departure are sufficiently established.

On long gaps between stops, combine along-route distance, recent speed, accuracy and fresh predictions to choose a comfortable reminder window. Start field tuning around 30–60 seconds of lead time where that is possible; this is a design hypothesis, not a performance claim or universal rule. Adjacent stops may offer less time. Never delay past the useful point merely to satisfy a preferred time window.

Distance must be measured along the trip's path; straight-line distance can trigger across a river, on the opposite carriageway, or at another branch. Do not interpret every pause in traffic as a stop, or count served stops using acceleration changes. For request stops the bus may pass through, so progression also needs route position and stop order.

Separate “press the stop button”, “your stop is next”, and “get off when the bus stops”. Use the first instruction only for service types known to require stop requests; rail and automatically stopping services need different wording. Never instruct someone to disembark merely because a GPS point crossed a radius.

Each alert belongs to the active journey, leg and target-stop occurrence. Record whether it was shown and acknowledged, preventing duplicate alerts after a timer retry or reconnect. Allow the critical instruction to remain visible through the approach without repeated flashing. If evidence deteriorates, use “Your stop should be next; check the stop display” rather than an unjustified exact instruction.

**Train information needs both service identity and honest timing labels.**

Show planned departure, predicted departure, platform when published, cancellation or delay status, and the selected train's calling points. While riding, emphasize next calling point, intended exit, estimated arrival and onward connection margin. “Delayed by 7 min” should compare planned and predicted times for the same service, station and event. If the provider only says “Delayed”, retain that wording without manufacturing a number.

Treat arrival countdowns as predictions, with source freshness. “Due” does not establish that a vehicle is physically approaching the platform. On frequency-based urban services, a next-train countdown and line disruption status may be more meaningful than a precise lateness figure.

Underground guidance cannot rely on continuous GPS. Cache the selected calling pattern and transfer instructions, use valid service updates if connectivity exists, and preserve uncertainty when it does not. A timer may estimate progress but cannot prove the train has reached a station. Reacquired positioning or an explicit station confirmation should resynchronise the journey. Phone-in-pocket guidance is a realistic goal; perfect automatic underground positioning is an unresolved capability.

For Great Britain, Darwin provides passenger-facing arrival/departure predictions, platforms, delay estimates, service changes and cancellations. National Rail now documents a public JSON Live Departure Board service and access through Rail Data Marketplace. Choose that current interface after subscription verification rather than assuming old SOAP examples are the only option. Rail journey planning is a separate capability from departure boards. [Darwin feeds](https://www.nationalrail.co.uk/developers/darwin-data-feeds/), [JSON service documentation](https://realtime.nationalrail.co.uk/LDBWS/docs/documentation.html), [National Rail journey planner](https://www.nationalrail.co.uk/developers/online-journey-planner-data-feeds/)

**Choose providers for journey monitoring, not just route search.**

| Provider | Why consider it | Decision for this project |
| --- | --- | --- |
| TfL Unified API | London journey planning, routes, stop information, predictions and disruption APIs | Recommended London pilot; validate every selected mode and service |
| Darwin via Rail Data Marketplace | GB rail predictions and service details | Add for rail legs; verify credentials, selected product limits and matching to planner IDs |
| Bus Open Data Service | England bus timetables and vehicle data | Useful outside London; expect operator-specific matching and quality work |
| Agency GTFS plus GTFS Realtime | Shared formats for schedules, service updates and vehicle positions | Preferred expansion where agencies publish adequate feeds |
| HERE Public Transit v8 | Routes, departures, intermediate stops and source-feed mapping options | Strong managed alternative to evaluate against the actual city |
| Google Routes | Transit itineraries with boarding/alighting details and stop count | Useful planner benchmark, but does not by itself solve stop-by-stop vehicle monitoring |
| OpenTripPlanner | Self-hosted multimodal routing from transport feeds and OSM | Defer until provider limitations justify running a routing server |

TfL documents its API groups and access quotas; anonymous access is listed at 50 requests/minute, with a 500-request/minute subscription product available. Treat shared server quota as a real design constraint rather than polling every user's full route independently. [TfL API catalogue](https://api-portal.tfl.gov.uk/apis), [TfL products](https://api-portal.tfl.gov.uk/products)

I made two public, read-only TfL requests. The route 24 arrivals sample returned 202 prediction records, including vehicle IDs, trip IDs, stop IDs, direction, timestamps and expected arrival. The outbound route sequence returned one branch with 35 stops. This validates sample payload availability only. It does not establish citywide completeness, stream freshness over time, GPS vehicle coordinates, or correct boarding inference. Stored evidence: [arrival snapshot](./tfl-line-24-arrivals.json), [route sequence](./tfl-line-24-sequence.json). [Official API specification](https://api.tfl.gov.uk/swagger/docs/v1)

England's BODS guidance describes SIRI-VM vehicle updates at 10–30 second intervals and explains why timetable/vehicle identifier matching matters. These are publication expectations, not an observed latency guarantee. Audit source timestamps and actual matching rates on the chosen operator. Do not generalize England's service to all UK operators. [BODS implementation guide](https://www.gov.uk/government/publications/bus-open-data-implementation-guide/bus-open-data-implementation-guide)

GTFS Realtime distinguishes vehicle positions from trip updates. A feed can provide useful stop predictions without precise vehicle coordinates. Preserve the distinction in the data model and in the UI. [Vehicle positions](https://gtfs.org/documentation/realtime/feed-entities/vehicle-positions/), [trip updates](https://gtfs.org/documentation/realtime/feed-entities/trip-updates/)

HERE's route endpoint explicitly offers intermediate stop details and source-feed mapping, which deserve a coverage test. Google exposes a stop count and boarding/alighting details; its documented transit step is not a complete intermediate-stop monitoring feed. Any proposed combination must prove that provider identities map reliably. [HERE routes](https://docs.here.com/transit/reference/public-transit-api-v8-getroutes), [HERE departures](https://docs.here.com/transit/reference/public-transit-api-v8-getdepartures), [Google transit routes](https://developers.google.com/maps/documentation/routes/transit-route), [Google route schema](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes)

Google's policies impose attribution, display and caching requirements. Check the specific HUD presentation and permitted caching before choosing Google-backed offline behavior. Do not assume content can be moved to an arbitrary map or stored indefinitely. Open data also carries attribution obligations. [Google Routes policies](https://developers.google.com/maps/documentation/routes/policies)

OpenTripPlanner already solves multimodal planning using GTFS/OSM and realtime updates. It is a credible later option, but operating feed ingestion and a graph server would be unnecessary work before a city pilot proves the journey-monitoring problem. [OpenTripPlanner documentation](https://docs.opentripplanner.org/en/latest/)

**Reuse existing work selectively.**

The MIT-licensed [even-transit](https://github.com/langerhans/even-transit) already implements saved connections, departure browsing and trip details using MOTIS. Review it for useful interaction and SDK patterns before building those again. Its README does not establish automatic boarding detection or stop-button alerts.

[JapanTrainTransit-EvenG2](https://github.com/TakaakiIchijo/JapanTrainTransit-EvenG2) demonstrates microphone input, transcription and displaying train itinerary alternatives. It uses an unofficial Japan transit API and older SDK tooling. Its setup suggests a frontend-prefixed transcription key; do not copy that credential pattern into a distributed app. Both projects are implementation references, not evidence that the requested reliability has been achieved.

**Three architectural approaches have materially different costs.**

| Approach | Advantages | Limits |
| --- | --- | --- |
| Hub plugin plus small backend | Official distribution, one app surface, location and journey logic close to the display bridge | Dependent on host lifecycle, microphone access and foreground ownership |
| Native iOS/Android companion plus Hub plugin | Native location/activity APIs and phone notifications under our control | Two applications and a synchronization path; cannot automatically keep the other app's WebView alive |
| Direct BLE client | Potential control outside the host | No public SDK direct-BLE interface; firmware compatibility and protocol maintenance become our responsibility |

Choose the first. A native companion is justified only after a concrete Hub limitation is measured and a supported path back to the display is proven. Android background location has platform restrictions; native iOS location also requires appropriate lifecycle handling. Neither is an automatic fix for a suspended Hub renderer. [Android background location](https://developer.android.com/develop/sensors-and-location/location/background), [Apple background location](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background)

Keep the implementation small: one TypeScript web project, the pinned Even SDK, and one backend deployment. The phone setup page can use native HTML controls initially. Use React only if adopting useful existing project code makes that the smaller route. No routing engine, message broker, account system or database is required merely to demonstrate a personal journey.

The plugin owns the active trip and the next action. Its core consumes an itinerary, timestamped observations, user confirmations and current time, then returns journey state and a display instruction. SDK calls and network parsing sit outside that decision function, allowing recorded journeys to replay without a device.

Use explicit journey states: walking to board, waiting, boarding uncertain, riding, preparing to exit, alighting, transferring, final walk, arrived. Tracking quality is a separate property so losing GPS does not falsely change riding into walking. Cancellation or a deliberate new destination replaces the active itinerary. All callbacks must refer to the active itinerary revision so an old request cannot overwrite the new route.

Persist only what is needed to reconstruct the journey. Preserve provider IDs, service date, direction/branch and stop occurrence; scheduled, predicted and actual times must remain distinct. Record source time separately from retrieval time. Respect agency timezones and service days across midnight. Avoid merging similarly named stations without an explicit mapping.

The backend owns credentials, provider-specific parsing and short-lived shared feed caches where permitted. It returns only the relevant trip/stop data. Keep stop alerts local so they do not require a server round trip when fresh location and cached route geometry are available. Permission whitelisting and CORS are separate gates in Even Hub; both must be configured. [Networking documentation](https://hub.evenrealities.com/docs/build/networking)

Do not trust a client-provided user identifier as backend authentication. Use a supported, verified authentication method or a provisioned private-install credential for the pilot, with bounded access. Keep provider keys server-side, avoid default audio retention, and make raw journey logging opt-in. A navigation session should stop collecting location when it ends.

**Performance work should target alert freshness, battery and recovery.**

Use native text updates for changing instructions; rebuild only when the layout changes. Serialize image transfers and send only the latest useful frame. A critical alert must not queue behind obsolete map renders. The SDK documentation says incremental text updates avoid full-page flicker and image sends must not run concurrently. [Page lifecycle](https://hub.evenrealities.com/docs/build/page-lifecycle)

Initial sampling proposals, to be tuned on hardware:

| Journey phase | Location request | Transit refresh | Display behavior |
| --- | --- | --- | --- |
| Idle | Off | None | Saved destinations only |
| Walking near a decision | High accuracy, roughly 1–2-second request interval | On planning or a meaningful change | Update when maneuver/distance meaningfully changes |
| Waiting at a stop | Reduced movement sampling | Roughly 10–20 seconds where quotas and feed cadence permit | Update changed arrival/status |
| Riding far from exit | Roughly 5–10 seconds | Roughly 15–30 seconds | Quiet, event-driven progress |
| Final two stops | High accuracy, roughly 1–2 seconds | Fresh enough for the source | Immediate state changes; no map animation |
| Underground without a fix | Reduce futile high-accuracy work | Use available connectivity | Stable destination plus uncertainty |

These numbers are proposed requests and refresh policies, not guarantees. Feed rate limits and actual timestamp age take precedence. Countdowns should be derived from event timestamps and current time rather than a decremented counter; missed callbacks then do not accumulate clock drift. Refresh the display only when the displayed value changes.

Use one bounded network request per resource at a time, with timeout and a clear stale-data result. Honor rate-limit responses. Refresh on reconnection and relevant journey transitions. A newer valid observation supersedes an older one even if requests finish out of order. Stop mic/IMU streams when their information is not being used.

Define candidate acceptance targets before optimizing:

| Measure | Initial target, not a measured result |
| --- | --- |
| Local journey decision | p95 under 20 ms on the selected phone |
| Fresh observation to visible critical instruction | p95 under 1 second with active connection; measure actual display, not only the SDK callback |
| Destination query | First usable itinerary within 3 seconds on a normal connection, with visible progress if slower |
| Cached resumption | First meaningful screen within 2 seconds after the bridge becomes ready |
| Critical bus prompt | No wrong-stop or late prompt in the pilot acceptance set; record ambiguity and early reminders separately |
| Duplicate reminders | None after acknowledgement or reconnect in replay tests |
| End-to-end field behavior | Phone remains in pocket after setup and journey launch on every accepted pilot journey |

Measure battery on both phone and G2 with screen locked, comparing a baseline, stock Navigate, our text-first mode and active voice mode on equivalent routes. Report percentage points per hour and test conditions. Set the shipping budget from those observations; inventing a battery-life promise now would hide the main tradeoff.

For network sizing, one request every 15 seconds is 240 requests per active hour. Four independent resources would be 960 requests/hour/user before retries. Shared stop/line caching can reduce provider load substantially. Transcription cost should scale with seconds actually spoken, not journey length. Exact monthly cost remains dependent on city, provider product, active journeys and voice duty cycle; no paid subscriptions were created during this research.

**The most valuable additional features reduce uncertainty at transfers.**

1. Wrong direction or wrong branch detection, with a recovery route. Warn only when evidence supports it; overlapping routes should produce a clarification rather than a confident accusation.
2. Connection protection: estimate arrival at the next platform including walking and an uncertainty buffer, then suggest an alternative if the connection becomes implausible. Do not encourage running for a marginal train.
3. Correct stop letter and station entrance. Add preferred station exits or carriage position only where reliable data or a user-saved preference exists.
4. A quieter route option with fewer changes and a larger transfer margin, alongside fastest arrival. “Best” should account for the wearer's preferences rather than only the shortest predicted duration.
5. Step-free preferences combined with current lift disruptions where available; make missing accessibility data explicit.
6. Offline journey memory and missed-stop recovery. Keep the destination, calling pattern and transfer instructions, then replan once evidence and connectivity permit.

Later, add leave-by reminders for a saved commute, last-service warnings, relevant platform changes, and optional calendar destinations with explicit permission. Defer crowdsourced positioning, automatic announcement transcription, live carriage crowding and global coverage until each has a dependable data source. Do not put these ahead of stop-alert reliability.

**Build in stages that retire uncertainty.**

| Stage | Deliverable | Exit condition |
| --- | --- | --- |
| 0. Device and routing feasibility | Installed beta with location, timed display changes, microphone and reconnect probes; walking-alternatives provider trial | Locked-phone endurance is measured per OS; useful walking alternatives are verified on London routes |
| 1. One real bus journey | Saved origin/destination, correct direction/stop sequence, explicit boarding confirmation, next-stop reminder | Complete the chosen journey without taking out the phone after launch |
| 2. London journey control | Walking/transit route choices and switching; automatic boarding inference with confirmation fallback, repeat suppression and stale-data handling | Route choice works without losing active alerts; difficult traces and physical rides pass |
| 3. Rail and transfers | Train service selection, predictions, platforms, delays, onward walking and underground uncertainty | Mixed bus/rail journeys work, including a missed connection and lost network |
| 4. Voice and arbitrary destinations | Spoken place search, disambiguation, in-session commands | Noisy-vehicle recognition and battery targets pass; clearly document launch limitations |
| 5. Wider release | Additional routes/operators, setup flow, accessible phone UI, privacy and attribution, beta testing | Publish only supported capabilities and coverage; pass Even review requirements |

Stage 0 should be a short experiment before detailed scheduling. Do not assign a confident delivery date until its results and data access are known. Each later stage produces a usable increment; train support and hands-free interaction remain part of the intended product, not discarded requirements.

The test set should include buses bunched together, shared road corridors, both directions at one stop, loops, boarding near the destination, skipped stops, short-turns and diversions. Add traffic pauses, GPS jumps, missing accuracy/timestamps, stale predictions, out-of-order responses, midnight trips and daylight-saving changes. Rail testing needs cancelled services, platform changes, differing calling patterns, tunnels and missed transfers.

Use recorded observations with a human-labelled ground truth and replay the full journey decision boundary. Assert that the system emits the right instruction, at the right phase, at most once where required, and that uncertainty suppresses false precision. Do not merely test helper functions or reproduce the heuristic inside the test. A simulator checks layout and input; real G2 rides establish legibility, timing and endurance. Inspect actual rendered screens in sunlight, at night, while walking and with long stop names.

An initial field pilot could cover 20–30 varied journeys and at least 100 target-stop approaches. This is a debugging gate, not proof of a population-wide reliability rate. Keep separate counts for wrong prompts, late prompts, missed prompts, early prompts, requests for confirmation and phone retrievals. Expand testing before reducing confirmation requirements.

Before hardware validation, record the test phone models/OS versions, Even App and firmware versions, and whether R1 is available. London is the confirmed first launch area, followed by broader UK coverage. Then select a familiar bus journey plus a train connection as the acceptance route. Questions for Even's developer channel are: third-party voice launch, plugin foreground/background ownership, installed-beta location/audio behavior, supported display wake behavior, and any approved native companion integration. No outreach has been sent.

The research supports building the official-plugin prototype. It does not yet support promising perfect passive boarding detection, fully automatic underground progress, all-day background voice activation, or unmissable alerts when the host or Bluetooth connection is unavailable. The first concrete engineering task is the installed-beta locked-phone experiment, followed by one correctly timed bus-stop reminder on a real journey.
