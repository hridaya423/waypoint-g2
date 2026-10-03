import { useState } from "react";
import { rehearsalStages, type RehearsalStage } from "./rehearsal.ts";
import { GlassesPreview } from "./GlassesPreview.tsx";
import type { useWaypoint } from "./useWaypoint.ts";
import { Outline } from "./RouteOutline.tsx";
export function JourneyPreview({ w }: { w: ReturnType<typeof useWaypoint> }) {
  const [ending, setEnding] = useState(false);
  const route = w.journey?.route ?? w.chosen;
  const phase = w.journey?.phase;
  const action =
    phase === "waiting"
      ? "I’m on board"
      : phase === "alighting"
        ? "I’ve got off"
        : w.journey?.stopAlert
          ? "Stop button pressed"
          : "";
  return (
    <section className="preview" aria-label="Journey preview">
      <div className="hud-label">
        <h2>In your glasses</h2>
      </div>
      <GlassesPreview scene={w.scene} />
      {w.routeMap &&
        !w.frame.urgent &&
        !w.scene.undoAvailable &&
        ["walk", "ride", "wait", "route"].includes(w.scene.kind) && (
          <div className="map-switch" role="group" aria-label="Glasses view">
            <button aria-pressed={!w.overview} onClick={w.returnLive}>
              Guidance
            </button>
            <button aria-pressed={w.overview} onClick={w.showMap}>
              Route map
            </button>
          </div>
        )}
      <details className="gesture-help">
        <summary>Glasses controls</summary>
        <p>
          Swipe to browse routes or stops. Tap to choose, confirm boarding, open
          stop details or confirm getting off. Tap again in stop details for the
          map. Hold to return to live guidance. While walking, tap for the route
          map. Hold to return to guidance. Double-tap to close.
        </p>
        <p>
          GPS can infer boarding and the next walk. Tap a detection message to
          undo. If detection is uncertain, confirm with a tap.
        </p>
      </details>
      {w.journey?.autoBoardedAt && w.journey.phase === "riding" && (
        <button className="text-button" onClick={w.undoDetection}>
          Not on this bus
        </button>
      )}
      {w.journey?.autoAlightedAt && w.journey.phase === "walking" && (
        <button className="text-button" onClick={w.undoDetection}>
          Still on the bus
        </button>
      )}
      {!w.journey && (
        <button
          className="text-button"
          onClick={() => w.showRehearsal("full-trip")}
        >
          Preview a full journey →
        </button>
      )}
      {w.journey?.phase === "riding" &&
        !w.scene.undoAvailable &&
        ["ride", "detail", "uncertain"].includes(w.scene.kind) && (
          <div className="glasses-controls">
            <button
              disabled={w.scene.kind === "uncertain"}
              onClick={() => w.browseStops(-1)}
            >
              ↑ Previous stops
            </button>
            <button onClick={w.act}>
              {w.overview
                ? "Show timeline"
                : w.scene.kind === "detail"
                  ? "Route map"
                  : w.scene.kind === "uncertain"
                    ? "Confirm getting off"
                    : "Stop details"}
            </button>
            <button
              disabled={w.scene.kind === "uncertain"}
              onClick={() => w.browseStops(1)}
            >
              Next stops ↓
            </button>
            <button onClick={w.returnLive}>Live view</button>
          </div>
        )}
      {w.scene.kind === "confirm" && (
        <div className="notice" role="status">
          <strong>{w.scene.title}</strong>
          <div className="buttons">
            <button className="primary" onClick={w.act}>
              Confirm arrival
            </button>
            <button onClick={w.returnLive}>Keep navigating</button>
          </div>
        </div>
      )}
      {w.nextConnection && (
        <div
          className={`connection-card ${w.nextConnection.risk ? "at-risk" : ""}`}
          role="status"
        >
          <strong>{w.nextConnection.title}</strong>
          <p>{w.nextConnection.detail}</p>
          {w.nextConnection.risk && !w.journey?.route.rehearsal && (
            <button
              disabled={w.loading}
              onClick={() => void w.refreshConnections()}
            >
              {w.loading
                ? "Finding alternatives…"
                : "Find alternatives from here"}
            </button>
          )}
        </div>
      )}
      {w.offline && (
        <p className="notice" role="status">
          {w.journey
            ? "Offline · route guidance continues. Live departures unavailable."
            : "Offline · new routes and live departures unavailable."}
        </p>
      )}
      {w.journey && (
        <div className="journey-controls">
          {w.journey.route.rehearsal && (
            <div className="notice">
              <strong>Rehearsal</strong> · Simulated route and location.
              <label className="rehearsal-select">
                Glasses state
                <select
                  aria-label="Rehearsal display state"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value)
                      w.showRehearsal(e.target.value as RehearsalStage);
                  }}
                >
                  <option value="" disabled>
                    Choose a state
                  </option>
                  {rehearsalStages.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={w.stepRehearsal} disabled={phase === "arrived"}>
                {w.journey.route.id === "full-trip"
                  ? "Advance journey →"
                  : phase === "waiting"
                    ? "Simulate boarding"
                    : phase === "alighting"
                      ? "Simulate getting off"
                      : "Move along route →"}
              </button>
            </div>
          )}
          <div className="buttons">
            {action && (
              <button className="primary" onClick={w.act}>
                {action}
              </button>
            )}
            {w.scene.kind !== "confirm" &&
              (phase === "walking" || phase === "riding") && (
                <button onClick={w.confirmArrival}>
                  {phase === "riding"
                    ? "I’ve got off"
                    : "I’ve reached this leg’s destination"}
                </button>
              )}
            {ending && phase !== "arrived" ? (
              <>
                <button
                  onClick={() => {
                    setEnding(false);
                    w.end();
                  }}
                >
                  End this journey
                </button>
                <button onClick={() => setEnding(false)}>Keep journey</button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (phase === "arrived") {
                    setEnding(false);
                    w.end();
                  } else setEnding(true);
                }}
              >
                {phase === "arrived" ? "Done" : "End journey"}
              </button>
            )}
          </div>
          {w.journey.phase === "waiting" && w.arrivals.length > 0 && (
            <div className="arrivals">
              <h3>Live departures at this stop</h3>
              <p className="fine">
                Check the destination before boarding. These are stop
                predictions, not a confirmed vehicle match.
              </p>
              {w.arrivals.map((a) => (
                <div key={a.id}>
                  <span>
                    {a.line} → {a.destination}
                    <small>{a.platform}</small>
                  </span>
                  <strong>
                    {w.now - a.timestamp > 90000
                      ? "Stale"
                      : a.expected < w.now
                        ? "Due / passed"
                        : `${Math.ceil((a.expected - w.now) / 60000)} min`}
                  </strong>
                </div>
              ))}
            </div>
          )}
          {w.arrivalError && <p role="status">{w.arrivalError}</p>}
        </div>
      )}
      {w.routeMap && (
        <details className="map-disclosure" open={!w.journey}>
          <summary>Journey map</summary>
          <Outline map={w.routeMap} />
          {!w.routeMap.streets.length && (
            <button
              onClick={w.retryMap}
              disabled={w.offline || w.mapStatus === "Loading streets…"}
            >
              Retry street map
            </button>
          )}
        </details>
      )}
      {route && (
        <div className="itinerary">
          <div className="section-label">
            <h2>Your journey</h2>
            <span>{route.duration} min planned</span>
          </div>
          {route.legs.map((l, i) => (
            <div
              className={`leg ${w.journey && i === w.journey.legIndex ? "current-leg" : ""} ${w.journey && i < w.journey.legIndex ? "completed-leg" : ""}`}
              aria-current={
                w.journey && i === w.journey.legIndex ? "step" : undefined
              }
              key={i}
            >
              <span className="leg-icon">
                {w.journey && i < w.journey.legIndex
                  ? "✓"
                  : l.mode === "walking"
                    ? "↗"
                    : "▰"}
              </span>
              <div>
                <strong>
                  {l.mode === "walking" ? "Walk" : l.line || l.mode}{" "}
                  <span className="muted">· {l.duration} min</span>
                </strong>
                <p>{l.summary || `${l.from.name} to ${l.to.name}`}</p>
                {l.direction && <p className="muted">Towards {l.direction}</p>}
                {l.disruption && <p className="warning">{l.disruption}</p>}
                {w.journey && l.mode !== "walking" && (
                  <p className="fine">
                    {l.stopTracking
                      ? `${l.stops.length - 1} stops · sequence checked`
                      : "Precise stop reminders unavailable for this leg"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
