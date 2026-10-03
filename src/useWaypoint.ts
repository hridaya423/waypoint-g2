import { hudScene } from "./hud.ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Arrival, Fix, Instruction, Journey, Route } from "./model.ts";
import { Glasses, type GlassesAction } from "./glasses.ts";
import {
  confirmBoarding,
  instruction,
  nextLeg,
  observe,
  startJourney,
  undoDetection,
} from "./journey.ts";
import { findRoutes, getArrivals, PlaceChoice, prepareRoute } from "./tfl.ts";
import {
  rehearsalRoute,
  rehearsalJourney,
  rehearsalStages,
  rehearsalTripFixes,
  type RehearsalStage,
} from "./rehearsal.ts";
import {
  clockTime,
  compareRoutes,
  connection,
  nextBoardingIndex,
} from "./connections.ts";
import { mapView } from "./streetMap.ts";
import { useStreetMap } from "./useStreetMap.ts";
import {
  readPlaces,
  savePlaces,
  type SavedPlace,
  readJourney,
  saveJourney,
} from "./storage.ts";
export const places: Record<string, string> = {
  "Trafalgar Square": "51.5074,-0.1278",
  "Camden Town": "51.539,-0.1426",
  Waterloo: "51.5033,-0.1147",
  "King’s Cross": "51.5308,-0.1238",
  Paddington: "51.5154,-0.1755",
  "London Bridge": "51.5055,-0.0865",
};
const resolvePlace = (name: string) => places[name] || name;
export function useWaypoint() {
  const [savedPlaces, setSavedPlaces] = useState(readPlaces);
  const [savedIndex, setSavedIndex] = useState(0);
  const [overview, setOverview] = useState(false);
  const [from, setFrom] = useState("Trafalgar Square");
  const [to, setTo] = useState("Camden Town");
  const [mode, setMode] = useState("all");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selected, setSelected] = useState(0);
  const [stopOffset, setStopOffset] = useState(0);
  const tripStep = useRef(0);
  const [hudDetail, setHudDetail] = useState(false);
  const [confirmProgress, setConfirmProgress] = useState<{
    legIndex: number;
    phase: Journey["phase"];
  } | null>(null);
  const [journey, setJourney] = useState<Journey | null>(() =>
    rehearsalStages.includes(
      new URLSearchParams(location.search).get("rehearsal") as RehearsalStage,
    )
      ? rehearsalJourney(
          new URLSearchParams(location.search).get(
            "rehearsal",
          ) as RehearsalStage,
        )
      : new URLSearchParams(location.search).has("rehearsal")
        ? startJourney(rehearsalRoute())
        : null,
  );
  const [resume, setResume] = useState<Journey | null>(() => {
    try {
      return readJourney();
    } catch {
      return null;
    }
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [choices, setChoices] = useState<PlaceChoice["choices"]>([]);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [arrivalError, setArrivalError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [device, setDevice] = useState({
    status: "Browser preview",
    connected: false,
    battery: null as number | null,
    error: "",
  });
  const [probe, setProbe] = useState<{
    started: number;
    lastTick: number;
    maxGap: number;
    ticks: number;
    fixes: number;
    lastFix: number;
    audioBytes: number;
  } | null>(null);
  const [probeActive, setProbeActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const glasses = useRef<Glasses | null>(null);
  const probeRunning = useRef(probeActive);
  probeRunning.current = probeActive;
  const microphoneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const operation = useRef<AbortController | null>(null);
  const browseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const gestureAction = useRef<(action: GlassesAction) => void>(() => {});
  const [requestSpec, setRequestSpec] = useState({
    from: resolvePlace(from),
    to: resolvePlace(to),
    mode,
  });
  const acceptFix = useCallback((fix: Fix) => {
    setProbe((p) =>
      p && probeRunning.current
        ? { ...p, fixes: p.fixes + 1, lastFix: fix.timestamp }
        : p,
    );
    setJourney((j) =>
      j && !j.route.rehearsal ? observe(j, fix, Date.now()) : j,
    );
  }, []);
  useEffect(() => {
    const bridge = new Glasses();
    glasses.current = bridge;
    bridge.onState = setDevice;
    bridge.onFix = acceptFix;
    bridge.onAudio = (bytes) =>
      setProbe((p) => (p ? { ...p, audioBytes: p.audioBytes + bytes } : p));
    bridge.onAction = (action) => gestureAction.current(action);
    void bridge.connect();
    return () => {
      clearTimeout(microphoneTimer.current);
      clearTimeout(browseTimer.current);
      operation.current?.abort();
      bridge.dispose();
    };
  }, [acceptFix]);
  const active =
    (journey !== null &&
      journey.phase !== "arrived" &&
      !journey.route.rehearsal) ||
    probeActive;
  useEffect(() => {
    if (!active) return;
    if (glasses.current?.available) {
      void glasses.current.location(true).catch((e) => setError(String(e)));
      return () => {
        void glasses.current?.location(false).catch((e) => setError(String(e)));
      };
    }
    if (!navigator.geolocation) {
      setError("Location is not available in this browser.");
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (p) =>
        acceptFix({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          accuracy: p.coords.accuracy,
          timestamp: p.timestamp,
          speed: p.coords.speed ?? undefined,
        }),
      (e) => setError(`Location unavailable: ${e.message}`),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [active, device.connected, acceptFix]);
  useEffect(() => {
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (probeActive)
        setProbe((p) =>
          p
            ? {
                ...p,
                ticks: p.ticks + 1,
                maxGap: Math.max(p.maxGap, time - p.lastTick),
                lastTick: time,
              }
            : p,
        );
    }, 1000);
    return () => clearInterval(timer);
  }, [probeActive]);
  useEffect(() => {
    if (probeActive && probe && now - probe.started >= 300000)
      setProbeActive(false);
  }, [now, probe, probeActive]);
  useEffect(() => {
    if (!journey) return;
    try {
      saveJourney(journey);
    } catch {
      setError(
        "Journey could not be saved. Recovery after app restart is unavailable.",
      );
    }
  }, [journey]);
  const index = routes.length ? selected % routes.length : 0;
  const chosen = routes[index];
  const comparison = useMemo(() => compareRoutes(routes), [routes]);
  const shownRoute = journey?.route ?? chosen;
  const { streetArea, mapStatus, offline, retryMap } = useStreetMap(shownRoute);
  const boardingIndex = journey ? nextBoardingIndex(journey) : -1;
  const currentLeg =
    journey && boardingIndex >= 0
      ? journey.route.legs[boardingIndex]
      : undefined;
  useEffect(() => {
    setArrivals([]);
    setArrivalError("");
    if (!currentLeg || journey?.route.rehearsal || offline) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const rows = await getArrivals(currentLeg!, abort.signal);
        if (!abort.signal.aborted) {
          setArrivals(rows);
          setArrivalError("");
        }
      } catch (e) {
        if (!abort.signal.aborted)
          setArrivalError(
            e instanceof Error ? e.message : "Arrivals unavailable",
          );
      }
      if (!abort.signal.aborted) timer = setTimeout(refresh, 30000);
    }
    void refresh();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [currentLeg, journey?.route.rehearsal, offline]);
  const freshPosition =
    journey?.lastFix &&
    journey.quality === "good" &&
    (journey.route.rehearsal || now - journey.lastFix.timestamp <= 15000)
      ? journey.lastFix
      : null;
  const routeMap = useMemo(
    () =>
      shownRoute
        ? mapView(
            shownRoute,
            streetArea,
            journey?.legIndex ?? 0,
            freshPosition,
            true,
            mapStatus,
          )
        : null,
    [shownRoute, streetArea, journey?.legIndex, freshPosition, mapStatus],
  );
  const displayTime = journey?.route.rehearsal
    ? (journey.lastFix?.timestamp ?? now)
    : now;
  const nextConnection = journey
    ? connection(journey, offline ? [] : arrivals, displayTime)
    : null;
  let frame: Instruction = instruction(journey, displayTime);
  if (!journey && chosen)
    frame = {
      title: `Route ${index + 1} · ${chosen.duration} min`,
      detail: chosen.legs
        .map((l) =>
          l.mode === "walking" ? `${l.duration} min walk` : l.line || l.mode,
        )
        .join(" / "),
      context: "Swipe to compare · Tap to start",
      urgent: false,
    };
  if (!journey && probeActive && probe)
    frame = {
      title: `Device test · ${Math.floor((now - probe.started) / 1000)}s`,
      detail: `${probe.ticks} ticks · ${probe.fixes} fixes`,
      context: "Keep phone locked · 5 min test",
      urgent: false,
    };
  let scene = hudScene(
    journey,
    frame,
    displayTime,
    probeActive ? undefined : chosen,
    index,
    routes.length,
    stopOffset,
    hudDetail,
    journey?.phase === "waiting" ? arrivals : [],
  );
  if (
    shownRoute &&
    !frame.urgent &&
    !scene.undoAvailable &&
    ["walk", "ride", "wait", "route"].includes(scene.kind)
  ) {
    if (overview || scene.kind === "walk")
      scene = {
        ...scene,
        map: mapView(
          shownRoute,
          streetArea,
          journey?.legIndex ?? 0,
          freshPosition,
          overview,
          mapStatus,
        ),
      };
  }
  if (nextConnection && scene.kind === "ride" && !scene.browsing)
    scene = { ...scene, nextLeg: nextConnection.title };
  if (
    nextConnection?.risk &&
    !scene.undoAvailable &&
    ["walk", "ride", "wait"].includes(scene.kind)
  )
    scene = { ...scene, footer: `Estimate: ${nextConnection.title}` };
  if (!journey && chosen)
    scene = {
      ...scene,
      status: `${comparison[index].label} · ${scene.status}`,
      footer: `${clockTime(chosen.departure)} → ${clockTime(chosen.arrival)}`,
    };
  if (!journey && !probeActive) {
    if (loading || starting)
      scene = {
        ...scene,
        kind: "message",
        map: undefined,
        title: starting ? "Getting your route ready" : "Finding your routes",
        detail: starting
          ? "Checking stops and walking directions"
          : `${from} → ${to}`,
        footer: "This can take a moment",
        stops: [],
      };
    else if (resume)
      scene = {
        ...scene,
        kind: "message",
        map: undefined,
        title: "Continue your journey?",
        detail: resume.route.legs.at(-1)!.to.name,
        footer: "TAP resume · location will be checked",
        stops: [],
      };
    else if (!chosen && savedPlaces.length && !error) {
      const place = savedPlaces[savedIndex % savedPlaces.length];
      scene = {
        ...scene,
        line: `SAVED ${(savedIndex % savedPlaces.length) + 1} / ${savedPlaces.length}`,
        title: place.name,
        detail: place.destination,
        footer: "Swipe to choose · Tap for routes",
      };
    } else if (error)
      scene = {
        ...scene,
        kind: "message",
        map: undefined,
        title: "Route unavailable",
        detail: error,
        footer: "Check the planner on your phone",
        stops: [],
      };
  }
  const isConfirming =
    !!confirmProgress &&
    !!journey &&
    confirmProgress.legIndex === journey.legIndex &&
    confirmProgress.phase === journey.phase &&
    !frame.urgent;
  if (isConfirming && journey)
    scene = {
      ...scene,
      kind: "confirm",
      map: undefined,
      undoAvailable: false,
      title:
        journey.phase === "walking" ? "Have you arrived?" : "Have you got off?",
      detail: journey.route.legs[journey.legIndex].to.name,
      stops: [],
      footer: "TAP confirm    SWIPE cancel",
    };
  function returnLive() {
    setOverview(false);
    clearTimeout(browseTimer.current);
    setStopOffset(0);
    setHudDetail(false);
    setConfirmProgress(null);
  }
  function scheduleLive() {
    clearTimeout(browseTimer.current);
    browseTimer.current = setTimeout(returnLive, 12000);
  }
  useEffect(() => {
    returnLive();
  }, [journey?.legIndex, journey?.phase]);
  function confirmArrival() {
    if (!journey) return;
    clearTimeout(browseTimer.current);
    setConfirmProgress({ legIndex: journey.legIndex, phase: journey.phase });
  }
  function resumeJourney() {
    if (!resume) return;
    returnLive();
    setJourney({
      ...resume,
      motion: undefined,
      quality: "locating",
      lastFix: null,
      stopAlert: false,
    });
    setResume(null);
  }
  function browseStops(direction: number) {
    if (isConfirming) {
      setConfirmProgress(null);
      return;
    }
    if (scene.kind !== "ride" && scene.kind !== "detail") return;
    setOverview(false);
    setStopOffset(scene.offset + direction);
    scheduleLive();
  }
  gestureAction.current = (action) => {
    if (action === "exit") {
      setResume(journey);
      setJourney(null);
      setProbeActive(false);
      setMicActive(false);
      setConfirmProgress(null);
    }
    if (action === "live") returnLive();
    if (action === "select") act();
    if (action === "next" || action === "previous") {
      const direction = action === "next" ? 1 : -1;
      if (journey) browseStops(direction);
      else if (!routes.length && savedPlaces.length)
        setSavedIndex(
          (n) => (n + direction + savedPlaces.length) % savedPlaces.length,
        );
      else
        setSelected(
          (n) => (n + direction + routes.length) % Math.max(1, routes.length),
        );
    }
  };
  const sceneKey = JSON.stringify(scene);
  useEffect(() => {
    glasses.current?.display(JSON.parse(sceneKey));
  }, [sceneKey, device.connected]);

  async function search(
    origin = resolvePlace(from),
    destination = resolvePlace(to),
  ) {
    operation.current?.abort();
    const abort = new AbortController();
    operation.current = abort;
    setStarting(false);
    setLoading(true);
    setError("");
    setChoices([]);
    setRoutes([]);
    const spec = { from: origin, to: destination, mode };
    try {
      const options = await findRoutes(
        spec.from,
        spec.to,
        spec.mode,
        abort.signal,
      );
      if (abort.signal.aborted) return;
      setRoutes(options);
      setSelected(0);
      setRequestSpec(spec);
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(e instanceof Error ? e.message : "Search failed. Try again.");
        if (e instanceof PlaceChoice) setChoices(e.choices);
      }
    } finally {
      if (!abort.signal.aborted) setLoading(false);
    }
  }
  async function start() {
    if (!chosen || starting) return;
    if (journey?.phase === "riding" || journey?.phase === "alighting") {
      setError("Finish this ride before starting a different route.");
      return;
    }
    operation.current?.abort();
    const abort = new AbortController();
    operation.current = abort;
    setLoading(false);
    setStarting(true);
    setError("");
    try {
      const route = await prepareRoute(
        chosen,
        requestSpec.from,
        requestSpec.to,
        requestSpec.mode,
        abort.signal,
      );
      if (!abort.signal.aborted) {
        setStopOffset(0);
        setHudDetail(false);
        setJourney(startJourney(route));
        setResume(null);
      }
    } catch (e) {
      if (!abort.signal.aborted)
        setError(e instanceof Error ? e.message : "Unable to start.");
    } finally {
      if (!abort.signal.aborted) setStarting(false);
    }
  }
  function act() {
    if (probeActive || (!journey && (loading || starting))) return;
    if (!journey && resume) {
      resumeJourney();
      return;
    }
    if (!journey && !chosen && savedPlaces.length) {
      void navigateSaved(savedPlaces[savedIndex % savedPlaces.length]);
      return;
    }
    if (!journey) {
      void start();
      return;
    }
    if (scene.undoAvailable) {
      setJourney(undoDetection(journey));
      returnLive();
      return;
    }
    if (isConfirming) {
      setConfirmProgress(null);
      setStopOffset(0);
      setHudDetail(false);
      setJourney(nextLeg(journey));
      return;
    }
    if (
      (journey.phase === "walking" && scene.kind === "uncertain") ||
      (journey.phase === "riding" &&
        (scene.kind === "uncertain" ||
          !journey.route.legs[journey.legIndex].stopTracking))
    ) {
      confirmArrival();
      return;
    }
    if (scene.kind === "walk") {
      setOverview((v) => !v);
      scheduleLive();
      return;
    }
    if (journey.phase === "arrived") {
      end();
      return;
    }
    if (journey.phase === "riding" && !journey.stopAlert) {
      if (overview) {
        setOverview(false);
        setHudDetail(false);
      } else if (hudDetail) {
        setHudDetail(false);
        setOverview(true);
      } else setHudDetail(true);
      scheduleLive();
      return;
    }
    setJourney((j) => {
      if (!j) return j;
      if (j.phase === "waiting") return confirmBoarding(j);
      if (j.phase === "alighting") return nextLeg(j);
      if (j.stopAlert) return { ...j, acknowledged: true };
      return j;
    });
  }
  function end() {
    setOverview(false);
    operation.current?.abort();
    setStarting(false);
    setLoading(false);
    setJourney(null);
    setConfirmProgress(null);
    setStopOffset(0);
    setHudDetail(false);
    setResume(null);
    setArrivals([]);
    try {
      saveJourney(null);
    } catch {
      setError("Could not clear the saved journey.");
    }
  }
  function showRehearsal(stage: RehearsalStage) {
    end();
    tripStep.current = 0;
    setJourney(rehearsalJourney(stage));
  }
  function stepRehearsal() {
    if (journey?.route.id === "full-trip") {
      const fix = rehearsalTripFixes(journey.route.fetchedAt)[
        tripStep.current++
      ];
      if (fix) setJourney(observe(journey, fix, fix.timestamp));
      return;
    }
    setJourney((j) => {
      if (!j || !j.route.rehearsal) return j;
      if (j.phase === "waiting")
        return confirmBoarding({
          ...j,
          lastFix: {
            ...j.route.legs[0].from,
            timestamp: Date.now() - 5000,
            accuracy: 5,
          },
        });
      if (j.phase === "alighting") return nextLeg(j);
      const lat = Math.min(51.513, (j.lastFix?.lat ?? 51.51) + 0.0004);
      const fix = {
        lat,
        lon: -0.1274 - (lat - 51.51) * 0.6,
        accuracy: 5,
        timestamp: Date.now(),
      };
      return observe(j, fix, Date.now());
    });
  }
  async function currentOrigin() {
    if (!glasses.current) throw new Error("Location is not ready");
    const fix = await glasses.current.currentLocation();
    if (
      ![fix.lat, fix.lon, fix.accuracy, fix.timestamp].every(Number.isFinite) ||
      Math.abs(fix.lat) > 90 ||
      Math.abs(fix.lon) > 180 ||
      fix.accuracy < 0 ||
      fix.accuracy > 100 ||
      Date.now() - fix.timestamp > 30000 ||
      fix.timestamp > Date.now() + 3000
    )
      throw new Error(
        "Location is not accurate enough yet. Try again outside.",
      );
    return `${fix.lat.toFixed(6)},${fix.lon.toFixed(6)}`;
  }
  async function locate() {
    try {
      setFrom(await currentOrigin());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Location unavailable");
    }
  }
  async function navigateSaved(place: SavedPlace) {
    if (loading || starting || journey) return;
    operation.current?.abort();
    const abort = new AbortController();
    operation.current = abort;
    setLoading(true);
    setError("");
    setTo(place.destination);
    try {
      const origin = await currentOrigin();
      if (abort.signal.aborted) return;
      setFrom(origin);
      await search(origin, resolvePlace(place.destination));
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(e instanceof Error ? e.message : "Location unavailable");
        setLoading(false);
      }
    }
  }
  function saveDestination(name: string) {
    const place = {
      name: name.trim().slice(0, 40),
      destination: to.trim().slice(0, 200),
    };
    if (!place.name || !place.destination) return;
    if (
      savedPlaces.length >= 8 &&
      !savedPlaces.some(
        (p) => p.name.toLowerCase() === place.name.toLowerCase(),
      )
    ) {
      setError(
        "Eight destinations are saved. Remove one before adding another.",
      );
      return;
    }
    const updated = [
      ...savedPlaces.filter(
        (p) => p.name.toLowerCase() !== place.name.toLowerCase(),
      ),
      place,
    ].slice(-8);
    try {
      savePlaces(updated);
      setSavedPlaces(updated);
      setError("");
    } catch {
      setError("Destination could not be saved on this device.");
    }
  }
  function removeDestination(name: string) {
    const updated = savedPlaces.filter((p) => p.name !== name);
    try {
      savePlaces(updated);
      setSavedPlaces(updated);
    } catch {
      setError("Saved destination could not be removed.");
    }
  }
  async function refreshConnections() {
    if (!freshPosition) {
      setError("A fresh location is needed to find alternatives.");
      return;
    }
    const origin = `${freshPosition.lat},${freshPosition.lon}`;
    const destination = journey?.route.legs.at(-1)?.to;
    if (!destination) return;
    setFrom(origin);
    setTo(destination.name);
    await search(origin, `${destination.lat},${destination.lon}`);
  }
  function showMap() {
    setHudDetail(false);
    setOverview(true);
    scheduleLive();
  }

  async function microphone() {
    try {
      if (!probe)
        setProbe({
          started: Date.now(),
          lastTick: Date.now(),
          maxGap: 0,
          ticks: 0,
          fixes: 0,
          lastFix: 0,
          audioBytes: 0,
        });
      await glasses.current?.microphone(true);
      setMicActive(true);
      microphoneTimer.current = setTimeout(() => {
        void glasses.current
          ?.microphone(false)
          .catch((e) => setError(String(e)));
        setMicActive(false);
      }, 10000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone test failed.");
    }
  }
  function runProbe() {
    setProbe({
      started: Date.now(),
      lastTick: Date.now(),
      maxGap: 0,
      ticks: 0,
      fixes: 0,
      lastFix: 0,
      audioBytes: 0,
    });
    setProbeActive(true);
  }
  function exportProbe() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: "0.5.0",
            sdk: "0.0.16",
            userAgent: navigator.userAgent,
            device,
            probe,
            note: "Callback measurements only. Hardware visibility must be confirmed by the wearer.",
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "waypoint-device-test.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return {
    comparison,
    savedPlaces,
    saveDestination,
    removeDestination,
    overview,
    showMap,
    routeMap,
    mapStatus,
    offline,
    nextConnection,
    refreshConnections,
    retryMap,
    from,
    setFrom,
    to,
    setTo,
    mode,
    setMode,
    routes,
    chosen,
    index,
    setSelected,
    journey,
    resume,
    error,
    choices,
    loading,
    starting,
    frame,
    scene,
    returnLive,
    confirmArrival,
    undoDetection: () => setJourney((j) => (j ? undoDetection(j) : j)),
    resumeJourney,
    browseStops,
    device,
    probe,
    probeActive,
    setProbeActive,
    micActive,
    now,
    arrivals,
    arrivalError,
    search,
    start,
    act,
    end,
    stepRehearsal,
    showRehearsal,
    locate,
    runProbe,
    microphone,
    exportProbe,
  };
}
