import { useEffect, useState } from "react";
import type { Route } from "./model.ts";
import {
  cachedStreets,
  loadStreets,
  routeBounds,
  type StreetArea,
} from "./streetMap.ts";
export function useStreetMap(shownRoute?: Route) {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [streetArea, setStreetArea] = useState<StreetArea | null>(null);
  const [mapStatus, setMapStatus] = useState("Loading streets…");
  const [mapRetry, setMapRetry] = useState(0);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    setStreetArea(null);
    if (!shownRoute) return;
    const bounds = routeBounds(shownRoute);
    if (!bounds) {
      setMapStatus("Route only · area too large for the pilot map");
      return;
    }
    const cached = cachedStreets(bounds);
    if (cached) {
      setStreetArea(cached);
      setMapStatus("Street map saved on this device");
      return;
    }
    if (offline) {
      setMapStatus("Offline · street map not saved");
      return;
    }
    setMapStatus("Loading streets…");
    const abort = new AbortController();
    const timer = setTimeout(() => {
      void loadStreets(bounds, abort.signal)
        .then(({ area, saved }) => {
          if (!abort.signal.aborted) {
            setStreetArea(area);
            setMapStatus(
              saved
                ? "Street map saved on this device"
                : "Street map available · could not save locally",
            );
          }
        })
        .catch((e) => {
          if (!abort.signal.aborted)
            setMapStatus(
              e instanceof Error && e.name !== "TimeoutError"
                ? e.message
                : "Street map timed out. Try again shortly.",
            );
        });
    }, 500);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [shownRoute, offline, mapRetry]);
  return {
    offline,
    streetArea,
    mapStatus,
    retryMap: () => setMapRetry((n) => n + 1),
  };
}
