import type { Journey } from "./model.ts";
const key = "waypoint-journey-v1";
export function saveJourney(journey: Journey | null) {
  if (journey && !journey.route.rehearsal && journey.phase !== "arrived")
    localStorage.setItem(key, JSON.stringify(journey));
  else localStorage.removeItem(key);
}
export function readJourney(): Journey | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Journey;
    if (
      !j ||
      !j.route ||
      !Array.isArray(j.route.legs) ||
      !j.route.legs.length ||
      !Number.isInteger(j.legIndex) ||
      j.legIndex < 0 ||
      j.legIndex >= j.route.legs.length ||
      !["walking", "waiting", "riding", "alighting"].includes(j.phase) ||
      !Number.isFinite(j.progress) ||
      j.progress < 0 ||
      typeof j.stopAlert !== "boolean" ||
      typeof j.acknowledged !== "boolean" ||
      typeof j.route.id !== "string" ||
      !Number.isFinite(j.route.fetchedAt) ||
      Date.now() - j.route.fetchedAt > 4 * 3600_000
    )
      return null;
    for (const l of j.route.legs) {
      if (
        !l ||
        ![l.from, l.to, ...l.path, ...l.stops, ...l.steps].every(
          (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon),
        ) ||
        ![
          l.summary,
          l.direction,
          l.line,
          l.lineId,
          l.mode,
          l.from.name,
          l.to.name,
        ].every((s) => typeof s === "string") ||
        !l.stops.every((s) => typeof s.name === "string") ||
        !l.steps.every((s) => typeof s.instruction === "string") ||
        typeof l.stopTracking !== "boolean"
      )
        return null;
    }
    return {
      ...j,
      quality: "locating",
      lastFix: null,
      stopAlert: false,
      motion: undefined,
      autoBoardedAt: Number.isFinite(j.autoBoardedAt)
        ? j.autoBoardedAt
        : undefined,
      autoAlightedAt: Number.isFinite(j.autoAlightedAt)
        ? j.autoAlightedAt
        : undefined,
    };
  } catch {
    return null;
  }
}

export type SavedPlace = { name: string; destination: string };
const placesKey = "waypoint-places-v1";
export function readPlaces(): SavedPlace[] {
  try {
    const values: unknown = JSON.parse(localStorage.getItem(placesKey) || "[]");
    return Array.isArray(values)
      ? values
          .filter(
            (p): p is SavedPlace =>
              !!p &&
              typeof p.name === "string" &&
              p.name.trim().length > 0 &&
              p.name.length <= 40 &&
              typeof p.destination === "string" &&
              p.destination.trim().length > 0 &&
              p.destination.length <= 200,
          )
          .slice(0, 8)
      : [];
  } catch {
    return [];
  }
}
export function savePlaces(places: SavedPlace[]) {
  localStorage.setItem(placesKey, JSON.stringify(places.slice(0, 8)));
}
