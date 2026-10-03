import type { Arrival, Leg, Point, Route, Stop } from "./model.ts";
import { distance, project } from "./geo.ts";
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string =>
  typeof value === "string" ? value : "";
const number = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
const nameKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
function point(value: unknown): Point | null {
  const p = record(value);
  return typeof p.lat === "number" &&
    typeof p.lon === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lon) <= 180
    ? { lat: p.lat, lon: p.lon }
    : null;
}
function stop(value: unknown): Stop | null {
  const p = record(value);
  const position = point(p);
  return position
    ? {
        ...position,
        id: text(p.individualStopId) || text(p.id) || text(p.naptanId),
        name: text(p.commonName) || text(p.name),
        letter: text(p.stopLetter),
      }
    : null;
}
export function parsePath(value: unknown): Point[] {
  if (typeof value !== "string") return [];
  try {
    return list(JSON.parse(value)).flatMap((pair) =>
      Array.isArray(pair) && pair.length >= 2
        ? point({ lat: pair[0], lon: pair[1] }) || []
        : [],
    );
  } catch {
    return [];
  }
}
export function parseRoutes(value: unknown, now: number): Route[] {
  const seen = new Set<string>();
  return list(record(value).journeys)
    .flatMap((entry, routeIndex) => {
      const journey = record(entry);
      const rawLegs = list(journey.legs);
      const legs: Leg[] = rawLegs.flatMap((value) => {
        const l = record(value);
        const from = stop(l.departurePoint);
        const to = stop(l.arrivalPoint);
        if (!from || !to) return [];
        const option = record(list(l.routeOptions)[0]);
        const instruction = record(l.instruction);
        return [
          {
            mode: text(record(l.mode).id),
            summary: text(instruction.summary),
            direction: text(list(option.directions)[0]),
            line: text(option.name),
            lineId: text(record(option.lineIdentifier).id),
            from,
            to,
            duration: number(l.duration),
            distance: number(l.distance),
            departure: text(l.departureTime),
            arrival: text(l.arrivalTime),
            path: parsePath(record(l.path).lineString),
            steps: list(instruction.steps).flatMap((value) => {
              const step = record(value);
              const location = point({
                lat: step.latitude,
                lon: step.longitude,
              });
              return location
                ? [
                    {
                      ...location,
                      instruction:
                        `${text(step.descriptionHeading)} ${text(step.streetName)}`.trim() ||
                        "Continue",
                      distance: number(step.distance),
                    },
                  ]
                : [];
            }),
            stops: [],
            stopTracking: false,
            disruption: l.isDisrupted
              ? list(l.disruptions)
                  .map((d) => text(record(d).description))
                  .filter(Boolean)
                  .join(" · ") || "Service disruption reported"
              : "",
          },
        ];
      });
      if (!legs.length || legs.length !== rawLegs.length) return [];
      const key = legs
        .map(
          (l) =>
            `${l.mode}:${l.lineId}:${l.from.id}:${l.to.id}:${l.path.map((p) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join(";")}`,
        )
        .join("|");
      if (seen.has(key)) return [];
      seen.add(key);
      return [
        {
          id: `tfl-${now}-${routeIndex}`,
          duration: number(journey.duration),
          departure: text(journey.startDateTime),
          arrival: text(journey.arrivalDateTime),
          legs,
          fetchedAt: now,
          rehearsal: false,
        },
      ];
    })
    .sort((a, b) => a.duration - b.duration)
    .slice(0, 3);
}
export class PlaceChoice extends Error {
  choices: { side: "from" | "to"; id: string; name: string }[];
  constructor(choices: { side: "from" | "to"; id: string; name: string }[]) {
    super("Choose the matching place below, then find routes again.");
    this.choices = choices;
  }
}
async function request(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`https://api.tfl.gov.uk${path}`, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
      : AbortSignal.timeout(12000),
  });
  if (response.status === 300) {
    const body = record(await response.json());
    const choices = (["from", "to"] as const).flatMap((side) =>
      list(record(body[`${side}LocationDisambiguation`]).disambiguationOptions)
        .slice(0, 6)
        .flatMap((value) => {
          const p = record(record(value).place);
          const id = text(p.icsCode) || text(p.naptanId);
          return id ? [{ side, id, name: text(p.commonName) }] : [];
        }),
    );
    if (choices.length) throw new PlaceChoice(choices);
    throw new Error(
      "That place is ambiguous. Try a station name, postcode or coordinates.",
    );
  }
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "TfL is busy. Wait a minute before trying again."
        : `TfL could not return this journey (${response.status}). Try a London station or postcode.`,
    );
  return response.json();
}
function journeyPath(from: string, to: string, mode: string): string {
  const modes =
    mode === "walking"
      ? "walking"
      : mode === "bus"
        ? "bus,walking"
        : "bus,tube,dlr,overground,elizabeth-line,national-rail,tram,walking";
  return `/Journey/JourneyResults/${encodeURIComponent(from.trim())}/to/${encodeURIComponent(to.trim())}?mode=${modes}&journeyPreference=LeastTime`;
}
export async function findRoutes(
  from: string,
  to: string,
  mode: string,
  signal?: AbortSignal,
): Promise<Route[]> {
  const body = await request(journeyPath(from, to, mode), signal);
  const routes = parseRoutes(body, Date.now());
  if (!routes.length)
    throw new Error(
      "No routes found. Try a closer destination or another transport mode.",
    );
  return routes;
}
function sameStop(candidate: Stop, endpoint: Stop, mode: string): boolean {
  return (
    candidate.id === endpoint.id ||
    (mode === "bus" &&
      endpoint.letter !== "" &&
      candidate.letter === endpoint.letter &&
      distance(candidate, endpoint) < 20)
  );
}
export function matchStops(
  leg: Leg,
  sequence: unknown,
  expectedNames: string[],
): Stop[] {
  const candidates = list(record(sequence).stopPointSequences).flatMap(
    (value) => {
      const stops = list(record(value).stopPoint).flatMap((p) => stop(p) || []);
      const results: Stop[][] = [];
      for (let start = 0; start < stops.length; start++) {
        if (!sameStop(stops[start], leg.from, leg.mode)) continue;
        const end = stops.findIndex(
          (p, index) => index > start && sameStop(p, leg.to, leg.mode),
        );
        if (end < 0) continue;
        const segment = stops.slice(start, end + 1);
        const actual = segment.slice(1).map((s) => nameKey(s.name));
        const expected = expectedNames.map(nameKey);
        if (
          actual.length !== expected.length ||
          !actual.every((name, index) => name === expected[index])
        )
          continue;
        let previousAlong = -1;
        if (
          !segment.every((s) => {
            const projected = project(s, leg.path);
            const valid =
              projected.away < 60 && projected.along >= previousAlong;
            previousAlong = projected.along;
            return valid;
          })
        )
          continue;
        results.push(segment);
      }
      return results;
    },
  );
  return candidates.length === 1 ? candidates[0] : [];
}
export async function prepareRoute(
  route: Route,
  from: string,
  to: string,
  mode: string,
  signal?: AbortSignal,
): Promise<Route> {
  const body = record(await request(journeyPath(from, to, mode), signal));
  const freshRoutes = parseRoutes(body, Date.now());
  const same = freshRoutes.find(
    (r) =>
      r.legs.length === route.legs.length &&
      r.legs.every(
        (l, i) =>
          l.mode === route.legs[i].mode &&
          l.lineId === route.legs[i].lineId &&
          l.from.id === route.legs[i].from.id &&
          l.to.id === route.legs[i].to.id &&
          distance(l.from, route.legs[i].from) < 40 &&
          distance(l.to, route.legs[i].to) < 40,
      ),
  );
  if (!same)
    throw new Error(
      "This option has changed. Find routes again to see current departures.",
    );
  const raw = list(body.journeys).find((j) => {
    const parsed = parseRoutes({ journeys: [j] }, 0)[0];
    return (
      parsed &&
      parsed.legs.length === same.legs.length &&
      parsed.legs.every(
        (l, i) =>
          l.lineId === same.legs[i].lineId &&
          l.from.id === same.legs[i].from.id &&
          l.to.id === same.legs[i].to.id,
      )
    );
  });
  const rawLegs = list(record(raw).legs);
  const legs = await Promise.all(
    same.legs.map(async (leg, index) => {
      if (leg.mode === "walking" || !leg.lineId || leg.disruption) return leg;
      const names = list(record(record(rawLegs[index]).path).stopPoints).map(
        (p) => text(record(p).name),
      );
      const directions = ["inbound", "outbound"];
      const sequences = await Promise.allSettled(
        directions.map((dir) =>
          request(
            `/Line/${encodeURIComponent(leg.lineId)}/Route/Sequence/${dir}`,
            signal,
          ),
        ),
      );
      const matches = sequences
        .flatMap((result) =>
          result.status === "fulfilled"
            ? [matchStops(leg, result.value, names)]
            : [],
        )
        .filter((stops) => stops.length > 1);
      const unique = new Map(
        matches.map((stops) => [stops.map((s) => s.id).join("|"), stops]),
      );
      const stops = unique.size === 1 ? [...unique.values()][0] : [];
      return {
        ...leg,
        from: stops[0] ?? leg.from,
        to: stops.at(-1) ?? leg.to,
        stops,
        stopTracking: stops.length > 1,
      };
    }),
  );
  return { ...same, legs };
}
export function parseArrivals(value: unknown): Arrival[] {
  return list(value)
    .flatMap((value) => {
      const a = record(value);
      const expected = Date.parse(text(a.expectedArrival));
      const timestamp = Date.parse(text(a.timestamp));
      return Number.isFinite(expected) && Number.isFinite(timestamp)
        ? [
            {
              id: text(a.id),
              line: text(a.lineName),
              lineId: text(a.lineId),
              destination: text(a.destinationName) || text(a.towards),
              expected,
              timestamp,
              vehicleId: text(a.vehicleId),
              platform: text(a.platformName),
            },
          ]
        : [];
    })
    .sort((a, b) => a.expected - b.expected);
}
export async function getArrivals(
  leg: Leg,
  signal?: AbortSignal,
): Promise<Arrival[]> {
  if (!leg.from.id) return [];
  return parseArrivals(
    await request(
      `/StopPoint/${encodeURIComponent(leg.from.id)}/Arrivals`,
      signal,
    ),
  )
    .filter((a) => !leg.lineId || a.lineId === leg.lineId)
    .slice(0, 6);
}
