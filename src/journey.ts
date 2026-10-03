import type { Fix, Instruction, Journey, Route } from "./model.ts";
import { distance, project } from "./geo.ts";
export function startJourney(route: Route): Journey {
  return {
    route,
    legIndex: 0,
    phase: route.legs[0].mode === "walking" ? "walking" : "waiting",
    progress: 0,
    lastFix: null,
    quality: "locating",
    stopAlert: false,
    acknowledged: false,
  };
}
export function confirmBoarding(journey: Journey): Journey {
  return journey.phase === "waiting"
    ? {
        ...journey,
        phase: "riding",
        progress: 0,
        stopAlert: false,
        acknowledged: false,
        motion: undefined,
        autoBoardedAt: undefined,
      }
    : journey;
}
export function nextLeg(journey: Journey): Journey {
  const legIndex = journey.legIndex + 1;
  if (legIndex >= journey.route.legs.length)
    return { ...journey, phase: "arrived", stopAlert: false };
  return {
    ...journey,
    motion: undefined,
    autoBoardedAt: undefined,
    autoAlightedAt: undefined,
    autoBoardingDisabled: false,
    autoAlightingDisabled: false,
    legIndex,
    phase:
      journey.route.legs[legIndex].mode === "walking" ? "walking" : "waiting",
    progress: 0,
    lastFix: null,
    quality: "locating",
    stopAlert: false,
    acknowledged: false,
  };
}
export function undoDetection(journey: Journey): Journey {
  if (
    journey.autoAlightedAt &&
    journey.phase === "walking" &&
    journey.legIndex > 0
  )
    return {
      ...journey,
      legIndex: journey.legIndex - 1,
      phase: "alighting",
      progress: project(
        journey.route.legs[journey.legIndex - 1].to,
        journey.route.legs[journey.legIndex - 1].path,
      ).along,
      lastFix: null,
      quality: "locating",
      motion: undefined,
      autoAlightedAt: undefined,
      autoAlightingDisabled: true,
    };

  if (!journey.autoBoardedAt || journey.phase !== "riding") return journey;
  return {
    ...journey,
    phase: "waiting",
    progress: 0,
    lastFix: null,
    quality: "locating",
    stopAlert: false,
    acknowledged: false,
    motion: undefined,
    autoBoardedAt: undefined,
    autoBoardingDisabled: true,
  };
}
function boarding(journey: Journey, fix: Fix, along: number): Journey {
  const leg = journey.route.legs[journey.legIndex];
  const updated: Journey = { ...journey, lastFix: fix, quality: "good" };
  if (
    leg.mode !== "bus" ||
    !leg.stopTracking ||
    journey.autoBoardingDisabled ||
    fix.accuracy > 20
  )
    return { ...updated, motion: undefined };
  const previous = journey.lastFix;
  const seconds = previous ? (fix.timestamp - previous.timestamp) / 1000 : 0;
  const advance = previous ? along - project(previous, leg.path).along : 0;
  const moving =
    previous &&
    journey.quality === "good" &&
    previous.accuracy <= 20 &&
    seconds > 0 &&
    seconds <= 8 &&
    advance / seconds >= 5 &&
    advance / seconds <= 25;
  const evidence =
    journey.motion?.kind === "boarding" ? journey.motion : undefined;
  if (evidence && moving) {
    const motion = { ...evidence, samples: evidence.samples + 1 };
    if (
      motion.samples >= 3 &&
      fix.timestamp - motion.since >= 12000 &&
      along - motion.origin >= 90 &&
      project(leg.to, leg.path).along - along > 100
    )
      return {
        ...confirmBoarding(updated),
        progress: along,
        autoBoardedAt: fix.timestamp,
      };
    return { ...updated, motion };
  }
  return {
    ...updated,
    motion:
      distance(fix, leg.from) <= 25
        ? { kind: "boarding", since: fix.timestamp, origin: along, samples: 0 }
        : undefined,
  };
}
function alighting(journey: Journey, fix: Fix): Journey | null {
  const bus = journey.route.legs[journey.legIndex];
  const walk = journey.route.legs[journey.legIndex + 1];
  const previous = journey.lastFix;
  if (
    bus.mode !== "bus" ||
    walk?.mode !== "walking" ||
    journey.autoAlightingDisabled ||
    !previous ||
    fix.accuracy > 20 ||
    previous.accuracy > 20
  )
    return null;
  const seconds = (fix.timestamp - previous.timestamp) / 1000;
  const speed = seconds > 0 ? distance(previous, fix) / seconds : Infinity;
  const position = project(fix, walk.path);
  const before = project(previous, walk.path);
  const approach = [...bus.path]
    .reverse()
    .find((p) => distance(p, bus.to) >= 30);
  if (
    !approach ||
    seconds <= 0 ||
    seconds > 8 ||
    speed < 0.4 ||
    speed > 2.5 ||
    (fix.speed !== undefined && fix.speed > 3) ||
    position.away > 20 ||
    position.along < before.along ||
    position.along > 150
  )
    return null;
  const scale = 300 / distance(approach, bus.to);
  const continuation = {
    lat: bus.to.lat + (bus.to.lat - approach.lat) * scale,
    lon: bus.to.lon + (bus.to.lon - approach.lon) * scale,
  };
  if (project(fix, [approach, bus.to, continuation]).away < 30) return null;
  const evidence =
    journey.motion?.kind === "alighting"
      ? journey.motion
      : {
          kind: "alighting" as const,
          since: fix.timestamp,
          origin: position.along,
          samples: 0,
        };
  const motion = { ...evidence, samples: evidence.samples + 1 };
  if (
    motion.samples >= 3 &&
    fix.timestamp - motion.since >= 8000 &&
    position.along - motion.origin >= 10
  )
    return {
      ...nextLeg(journey),
      progress: position.along,
      lastFix: fix,
      quality: "good",
      autoAlightedAt: fix.timestamp,
    };
  return { ...journey, lastFix: fix, quality: "good", motion };
}
export function observe(journey: Journey, fix: Fix, now: number): Journey {
  if (
    journey.phase === "arrived" ||
    (journey.lastFix && fix.timestamp <= journey.lastFix.timestamp)
  )
    return journey;
  if (
    ![fix.lat, fix.lon, fix.timestamp, fix.accuracy].every(Number.isFinite) ||
    Math.abs(fix.lat) > 90 ||
    Math.abs(fix.lon) > 180 ||
    fix.accuracy > 50 ||
    fix.accuracy < 0 ||
    now - fix.timestamp > 15_000 ||
    fix.timestamp > now + 3000
  )
    return { ...journey, quality: "uncertain", motion: undefined };
  const leg = journey.route.legs[journey.legIndex];
  if (journey.phase === "alighting") {
    const walking = alighting(journey, fix);
    if (walking) return walking;
    journey = { ...journey, motion: undefined };
  }
  const position = project(fix, leg.path);
  if (position.away > 60)
    return {
      ...journey,
      lastFix: fix,
      quality: "uncertain",
      motion: undefined,
    };
  if (journey.phase === "waiting")
    return boarding(journey, fix, position.along);
  const seconds = journey.lastFix
    ? Math.max(1, (fix.timestamp - journey.lastFix.timestamp) / 1000)
    : 1;
  const maxJump =
    journey.phase === "walking"
      ? Math.max(80, seconds * 4)
      : Math.max(150, seconds * 35);
  if (
    position.along < journey.progress - 60 ||
    position.along - journey.progress > maxJump
  )
    return {
      ...journey,
      lastFix: fix,
      quality: "uncertain",
      motion: undefined,
    };
  const progress = Math.max(journey.progress, position.along);
  let updated: Journey = {
    ...journey,
    progress,
    lastFix: fix,
    quality: "good",
  };
  if (
    journey.phase === "walking" &&
    distance(fix, leg.to) < 25 &&
    position.along >= project(leg.to, leg.path).along - 35
  )
    return nextLeg(updated);
  if (journey.phase === "riding" && leg.stopTracking && leg.stops.length >= 2) {
    const target = project(leg.to, leg.path).along;
    const previous = project(leg.stops[leg.stops.length - 2], leg.path).along;
    if (progress >= target - 15 && distance(fix, leg.to) >= 30)
      return { ...updated, stopAlert: false, quality: "uncertain" };
    if (
      target - previous > 60 &&
      progress > previous + Math.max(30, fix.accuracy + 15) &&
      progress < target - 15 &&
      leg.mode === "bus"
    )
      updated = { ...updated, stopAlert: true };
    if (distance(fix, leg.to) < 30 && progress > target - 40)
      updated = { ...updated, phase: "alighting", stopAlert: false };
  }
  return updated;
}
export function instruction(journey: Journey | null, now: number): Instruction {
  if (!journey)
    return {
      title: "Ready when you are",
      detail: "Choose a route to begin",
      context: "Waypoint",
      urgent: false,
    };
  const leg = journey.route.legs[journey.legIndex];
  const context = journey.route.rehearsal
    ? "REHEARSAL · simulated location"
    : leg.mode === "walking"
      ? "Walking"
      : `${leg.line} · ${leg.direction}`;
  if (journey.phase === "arrived")
    return {
      title: "You have arrived",
      detail: leg.to.name,
      context,
      urgent: false,
    };
  const fresh =
    journey.lastFix &&
    now - journey.lastFix.timestamp <= 15_000 &&
    journey.quality === "good";
  if (journey.phase === "waiting")
    return {
      title: `Take ${leg.line || leg.mode}`,
      detail: `${leg.from.name}${leg.from.letter ? ` · Stop ${leg.from.letter}` : ""}`,
      context: `${context} · Confirm when aboard`,
      urgent: false,
    };
  if (!fresh)
    return {
      title:
        journey.quality === "locating"
          ? "Finding your location"
          : "Check your surroundings",
      detail: `Next: ${leg.to.name}`,
      context: `${context} · Progress uncertain`,
      urgent: false,
    };
  if (journey.phase === "alighting")
    return {
      title: "Your stop is here",
      detail: "Get off when the vehicle stops",
      context: `${context} · ${leg.to.name}`,
      urgent: true,
    };
  if (journey.stopAlert)
    return {
      title: journey.acknowledged ? "Your stop is next" : "PRESS STOP NOW",
      detail: leg.to.name,
      context,
      urgent: !journey.acknowledged,
    };
  if (journey.phase === "riding") {
    const remaining = leg.stopTracking
      ? leg.stops.filter(
          (stop) => project(stop, leg.path).along > journey.progress + 15,
        ).length
      : null;
    return {
      title: `Get off at ${leg.to.name}`,
      detail:
        remaining === null
          ? "Stop sequence unverified · watch signs"
          : `${remaining} ${remaining === 1 ? "stop" : "stops"} remaining`,
      context,
      urgent: false,
    };
  }
  const next = leg.steps.find(
    (step) => project(step, leg.path).along > journey.progress + 15,
  );
  return {
    title: next?.instruction || leg.summary,
    detail: `${Math.round(distance(journey.lastFix!, next || leg.to) / 10) * 10} m · ${leg.to.name}`,
    context,
    urgent: false,
  };
}
