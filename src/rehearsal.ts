import { project } from "./geo.ts";
import { startJourney } from "./journey.ts";
import type { Fix, Journey, Route, Stop } from "./model.ts";
export function rehearsalRoute(): Route {
  const stops: Stop[] = [
    {
      lat: 51.51,
      lon: -0.1274,
      id: "demo-0",
      name: "Trafalgar Square",
      letter: "C",
    },
    {
      lat: 51.511,
      lon: -0.128,
      id: "demo-1",
      name: "Leicester Square",
      letter: "",
    },
    {
      lat: 51.512,
      lon: -0.1286,
      id: "demo-2",
      name: "Cambridge Circus",
      letter: "",
    },
    {
      lat: 51.513,
      lon: -0.1292,
      id: "demo-3",
      name: "Tottenham Court Road",
      letter: "",
    },
  ];
  return {
    id: "rehearsal",
    duration: 8,
    departure: "",
    arrival: "",
    fetchedAt: Date.now(),
    rehearsal: true,
    legs: [
      {
        mode: "bus",
        summary: "Rehearse a bus journey",
        direction: "Simulated service",
        line: "24",
        lineId: "24",
        from: stops[0],
        to: stops[3],
        duration: 8,
        distance: 360,
        departure: "",
        arrival: "",
        path: stops,
        stops,
        stopTracking: true,
        steps: [],
        disruption: "",
      },
    ],
  };
}
export const rehearsalStages = [
  "full-trip",
  "detected",
  "boarding",
  "riding",
  "stop",
  "requested",
  "alighting",
  "arrived",
  "uncertain",
  "walking",
] as const;
export type RehearsalStage = (typeof rehearsalStages)[number];
export function rehearsalJourney(
  stage: RehearsalStage,
  now = Date.now(),
): Journey {
  const route = rehearsalRoute();
  if (stage === "full-trip") {
    const bus = route.legs[0];
    const origin = {
      ...bus.from,
      lat: bus.from.lat - 0.0005,
      name: "Starting point",
    };
    const destination = {
      ...bus.to,
      lon: bus.to.lon - 0.002,
      name: "Your destination",
    };
    const walk = {
      ...bus,
      mode: "walking",
      line: "",
      lineId: "",
      direction: "",
      stops: [],
      stopTracking: false,
      duration: 2,
    };
    route.id = "full-trip";
    route.duration = 12;
    route.fetchedAt = now;
    route.legs = [
      {
        ...walk,
        from: origin,
        to: bus.from,
        path: [origin, bus.from],
        summary: "Walk to Trafalgar Square",
        steps: [
          {
            ...bus.from,
            instruction: "Continue to Trafalgar Square",
            distance: 55,
          },
        ],
      },
      bus,
      {
        ...walk,
        from: bus.to,
        to: destination,
        path: [bus.to, destination],
        summary: "Walk to your destination",
        steps: [
          {
            ...destination,
            instruction: "Continue along the street",
            distance: 140,
          },
        ],
      },
    ];
    return startJourney(route);
  }
  const leg = route.legs[0];
  if (stage === "walking") {
    leg.mode = "walking";
    leg.direction = "";
    leg.summary = "Turn left onto Charing Cross Road";
    leg.steps = [{ ...leg.to, instruction: leg.summary, distance: 120 }];
    leg.stopTracking = false;
  }
  const point =
    stage === "boarding" || stage === "walking"
      ? leg.from
      : stage === "riding" || stage === "detected"
        ? leg.stops[1]
        : stage === "stop" || stage === "requested"
          ? { ...leg.stops[2], lat: 51.5124, lon: -0.12884 }
          : leg.to;
  return {
    route,
    legIndex: 0,
    phase:
      stage === "boarding"
        ? "waiting"
        : stage === "walking"
          ? "walking"
          : stage === "alighting"
            ? "alighting"
            : stage === "arrived"
              ? "arrived"
              : "riding",
    progress: project(point, leg.path).along,
    lastFix: { ...point, timestamp: now, accuracy: 5 },
    quality: stage === "uncertain" ? "uncertain" : "good",
    stopAlert: stage === "stop" || stage === "requested",
    acknowledged: stage === "requested",
    autoBoardedAt: stage === "detected" ? now : undefined,
  };
}

export function rehearsalTripFixes(now: number): Fix[] {
  const fix = (lat: number, lon: number, seconds: number): Fix => ({
    lat,
    lon,
    accuracy: 5,
    timestamp: now + seconds * 1000,
  });
  return [
    fix(51.5095, -0.1274, 0),
    fix(51.5098, -0.1274, 10),
    fix(51.51, -0.1274, 20),
    fix(51.51, -0.1274, 24),
    ...[0.0003, 0.0006, 0.0009, 0.0015, 0.002, 0.0024, 0.003].map((delta, i) =>
      fix(51.51 + delta, -0.1274 - delta * 0.6, 28 + i * 4),
    ),
    ...Array.from({ length: 20 }, (_, i) =>
      fix(51.513, -0.1292 - (i + 1) * 0.0001, 56 + i * 4),
    ),
  ];
}
