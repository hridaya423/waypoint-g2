import type { Arrival, Journey, Route } from "./model.ts";
import { project } from "./geo.ts";
export const clockTime = (value: string | number) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London",
      })
    : "–";
};
export function compareRoutes(routes: Route[]) {
  const options = routes.map((route) => ({
    route,
    walking: route.legs
      .filter((l) => l.mode === "walking")
      .reduce((n, l) => n + l.duration, 0),
    changes: Math.max(
      0,
      route.legs.filter((l) => l.mode !== "walking").length - 1,
    ),
  }));
  const fastest = Math.min(...options.map((o) => o.route.duration));
  const leastWalk = Math.min(...options.map((o) => o.walking));
  const leastChanges = Math.min(...options.map((o) => o.changes));
  return options.map((o) => ({
    ...o,
    label:
      options.length === 1
        ? "Available route"
        : o.route.duration === fastest
          ? "Fastest"
          : o.walking === leastWalk &&
              options.some((other) => other.walking > o.walking)
            ? "Less walking"
            : o.changes === leastChanges &&
                options.some((other) => other.changes > o.changes)
              ? "Fewer changes"
              : "Alternative",
  }));
}
export function nextBoardingIndex(journey: Journey): number {
  if (journey.phase === "arrived") return -1;
  return journey.route.legs.findIndex(
    (l, i) =>
      l.mode !== "walking" &&
      (i > journey.legIndex ||
        (i === journey.legIndex && journey.phase === "waiting")),
  );
}
export function connection(journey: Journey, arrivals: Arrival[], now: number) {
  const legIndex = nextBoardingIndex(journey);
  if (legIndex < 0) return null;
  const leg = journey.route.legs[legIndex];
  const name = leg.line || leg.mode;
  const base = {
    legIndex,
    title: `Next: ${name}`,
    detail: "Check location to estimate your connection",
    risk: false,
  };
  if (
    !journey.lastFix ||
    journey.quality !== "good" ||
    now - journey.lastFix.timestamp > 15000
  )
    return base;
  let remaining = 0;
  for (let i = journey.legIndex; i < legIndex; i++) {
    const current = journey.route.legs[i];
    const length = project(current.to, current.path).along;
    const fraction =
      i === journey.legIndex && length > 0
        ? Math.max(0, 1 - journey.progress / length)
        : 1;
    remaining += current.duration * fraction;
  }
  const ready = now + remaining * 60000;
  const directionKey = (name: string) =>
    name
      .toLowerCase()
      .replace(/\bstation\b/g, "")
      .replace(/[^a-z0-9]/g, "");
  const direction = directionKey(leg.direction);
  const fresh = arrivals
    .filter(
      (a) =>
        a.lineId === leg.lineId &&
        now - a.timestamp <= 90000 &&
        a.timestamp <= now + 3000 &&
        a.expected >= now &&
        direction !== "" &&
        directionKey(a.destination) === direction,
    )
    .sort((a, b) => a.expected - b.expected);
  const prediction = fresh[0];
  const departure = prediction?.expected ?? Date.parse(leg.departure);
  if (!Number.isFinite(departure))
    return {
      ...base,
      detail: `About ${Math.ceil(remaining)} min to ${leg.from.name} · departure unavailable`,
    };
  const margin = Math.floor((departure - ready) / 60000);
  const source = prediction ? "Live stop prediction" : "Timetable only";
  const onward = fresh.find((a) => a.expected >= ready + 120000);
  return {
    ...base,
    title:
      margin < 0
        ? `${name} connection at risk`
        : margin < 2
          ? `${name} · tight connection`
          : `${name} · about ${margin} min spare`,
    risk: margin < 2,
    detail: `${source} · ${clockTime(departure)} at ${leg.from.name}${prediction?.destination ? ` towards ${prediction.destination}` : ""}. ${margin < 0 && onward ? `Later departure ${clockTime(onward.expected)}.` : `About ${Math.ceil(remaining)} min to reach the stop, using planned travel time.`}`,
  };
}
