import type { Arrival, Instruction, Journey, Route } from "./model.ts";
import type { MapView } from "./streetMap.ts";
import { project } from "./geo.ts";
export type HudStop = {
  name: string;
  state: "passed" | "current" | "next" | "future" | "destination" | "unknown";
  index: number;
};
export type HudScene = {
  map?: MapView;
  kind:
    | "confirm"
    | "detail"
    | "message"
    | "route"
    | "walk"
    | "wait"
    | "ride"
    | "stop"
    | "requested"
    | "alight"
    | "arrived"
    | "uncertain";
  line: string;
  direction: string;
  title: string;
  detail: string;
  destination: string;
  stops: HudStop[];
  remaining: number | null;
  footer: string;
  rehearsal: boolean;
  page: string;
  browsing: boolean;
  offset: number;
  nextLeg: string;
  stopLetter: string;
  departure: { time: string; destination: string; platform: string } | null;
  status: string;
  journeyModes: string[];
  journeyIndex: number;
  undoAvailable: boolean;
};
export function hudScene(
  journey: Journey | null,
  frame: Instruction,
  now: number,
  route?: Route,
  routeIndex = 0,
  routeCount = 0,
  offset = 0,
  detail = false,
  arrivals: Arrival[] = [],
): HudScene {
  const base: HudScene = {
    kind: "message",
    line: "WAYPOINT",
    direction: "",
    title: frame.title,
    detail: frame.detail,
    destination: "",
    stops: [],
    remaining: null,
    footer: "",
    rehearsal: false,
    page: "",
    browsing: false,
    offset: 0,
    nextLeg: "",
    stopLetter: "",
    departure: null,
    status: "",
    journeyModes: [],
    journeyIndex: 0,
    undoAvailable: false,
  };
  if (!journey) {
    if (!route) return base;
    const rides = route.legs.filter((l) => l.mode !== "walking");
    const changes = Math.max(0, rides.length - 1);
    return {
      ...base,
      kind: "route",
      status: rides.length
        ? changes
          ? `${changes} ${changes === 1 ? "change" : "changes"}`
          : "Direct ride"
        : "On foot",
      line: `ROUTE ${routeIndex + 1} / ${routeCount}`,
      title: `${route.duration} min`,
      direction:
        rides
          .map((l) => (l.mode === "bus" ? `Bus ${l.line}` : l.line || l.mode))
          .join(" → ") || "Walking",
      detail: `${route.legs.filter((l) => l.mode === "walking").reduce((n, l) => n + l.duration, 0)} min walking`,
      destination: route.legs.at(-1)!.to.name,
      footer: "",
    };
  }
  const leg = journey.route.legs[journey.legIndex];
  const fresh =
    !!journey.lastFix &&
    now - journey.lastFix.timestamp <= 15000 &&
    journey.quality === "good";
  const kind =
    journey.phase === "arrived"
      ? "arrived"
      : journey.phase === "waiting"
        ? "wait"
        : !fresh
          ? "uncertain"
          : journey.phase === "walking"
            ? "walk"
            : journey.phase === "alighting"
              ? "alight"
              : journey.stopAlert
                ? journey.acknowledged
                  ? "requested"
                  : "stop"
                : "ride";
  const following = journey.route.legs[journey.legIndex + 1];
  const nextLeg = following
    ? following.mode === "walking"
      ? `Then walk ${following.duration} min`
      : `Then take ${following.line || following.mode}`
    : "";
  const prediction = arrivals
    .filter(
      (a) =>
        a.lineId === leg.lineId &&
        now - a.timestamp <= 90000 &&
        a.timestamp <= now + 3000 &&
        a.expected >= now,
    )
    .sort((a, b) => a.expected - b.expected)[0];
  const scene: HudScene = {
    ...base,
    kind,
    journeyModes: journey.route.legs.map((l) =>
      l.mode === "walking" ? "Walk" : l.line || l.mode,
    ),
    journeyIndex: journey.legIndex,
    nextLeg,
    stopLetter: leg.from.letter,
    departure:
      kind === "wait" && prediction
        ? {
            time:
              prediction.expected - now < 60000
                ? "Due"
                : `${Math.ceil((prediction.expected - now) / 60000)} min`,
            destination: prediction.destination,
            platform: prediction.platform,
          }
        : null,
    status:
      kind === "wait"
        ? arrivals.length
          ? prediction
            ? "Live estimate"
            : "Live times out of date"
          : "No live times"
        : `Leg ${journey.legIndex + 1} / ${journey.route.legs.length}`,
    line:
      leg.mode === "walking"
        ? "WALK"
        : `${leg.mode === "bus" ? "BUS " : ""}${leg.line || leg.mode}`.toUpperCase(),
    direction: leg.direction,
    title: frame.title,
    detail: kind === "wait" ? leg.from.name : frame.detail,
    destination: leg.to.name,
    rehearsal: journey.route.rehearsal,
    footer: kind === "uncertain" ? "Progress paused" : "",
  };
  const detected =
    journey.phase === "riding"
      ? journey.autoBoardedAt
      : journey.phase === "walking"
        ? journey.autoAlightedAt
        : undefined;
  if (detected && now - detected < 12000 && fresh && !frame.urgent) {
    scene.undoAvailable = true;
    scene.footer = `${journey.phase === "riding" ? "Ride" : "Walking"} detected · Tap to undo`;
  }
  if (!leg.stopTracking && kind === "ride")
    return { ...scene, footer: "Stop tracking unavailable" };
  if (!leg.stopTracking || leg.mode === "walking" || kind === "arrived")
    return scene;
  const positions = leg.stops.map((stop) => project(stop, leg.path).along);
  const all = leg.stops.map(
    (stop, index): HudStop => ({
      name: stop.name,
      index,
      state:
        kind === "uncertain"
          ? "unknown"
          : index === leg.stops.length - 1
            ? "destination"
            : fresh && positions[index] < journey.progress - 15
              ? "passed"
              : fresh && Math.abs(positions[index] - journey.progress) <= 15
                ? "current"
                : "future",
    }),
  );
  const next = all.findIndex((s) => s.state !== "passed");
  if (next >= 0 && all[next].state === "future" && fresh)
    all[next].state = "next";
  const liveStart = Math.max(0, Math.min(all.length - 4, next - 1));
  const canBrowse =
    kind === "ride" && !journey.stopAlert && !scene.undoAvailable;
  const start = Math.max(
    0,
    Math.min(Math.max(0, all.length - 4), liveStart + (canBrowse ? offset : 0)),
  );
  if (detail && kind === "ride" && !scene.undoAvailable) {
    const focused = all[Math.min(all.length - 1, Math.max(0, next + offset))];
    return {
      ...scene,
      kind: "detail",
      title: focused.name,
      status: `${focused.state === "passed" ? "PASSED" : focused.state === "current" ? "AT THIS STOP" : focused.state === "destination" ? "GET OFF HERE" : "UPCOMING"} · ${focused.index + 1} / ${all.length}`,
      detail: `Get off at ${scene.destination}`,
      footer: "",
      stops: [],
      page: `${focused.index + 1} / ${all.length}`,
      offset: focused.index - next,
    };
  }
  return {
    ...scene,
    stops: all.slice(start, start + 4),
    remaining: fresh
      ? positions.filter((along) => along > journey.progress + 15).length
      : null,
    page: `${start + 1}–${Math.min(start + 4, all.length)} / ${all.length}`,
    browsing: canBrowse && start !== liveStart,
    offset: start - liveStart,
  };
}
