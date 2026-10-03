import { useState } from "react";
import { JourneyPreview } from "./JourneyPreview.tsx";
import { places, useWaypoint } from "./useWaypoint.ts";
import { DevicePanel } from "./DevicePanel.tsx";
import "./style.css";
import { clockTime } from "./connections.ts";
export default function App() {
  const w = useWaypoint();
  const [tab, setTab] = useState("journey");
  const [placeName, setPlaceName] = useState("");
  const [theme, setTheme] = useState("system");
  return (
    <div className="app" data-theme={theme}>
      <header>
        <a className="brand" href="#">
          <span>↗</span> Waypoint<span className="beta">G2</span>
        </a>
        <nav aria-label="Main">
          <button
            className={tab === "journey" ? "active" : ""}
            onClick={() => setTab("journey")}
          >
            Journey
          </button>
          <button
            className={tab === "device" ? "active" : ""}
            onClick={() => setTab("device")}
          >
            Device
          </button>
        </nav>
        <select
          aria-label="Colour theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="system">System theme</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </header>
      <main>
        <div className="page-title">
          <h1>{tab === "journey" ? "Your journey" : "Your glasses"}</h1>
          <span className="connection">
            <i className={w.device.connected ? "online" : ""} />
            {w.device.status}
          </span>
        </div>
        {w.error && (
          <div className="notice" role="alert">
            {w.error}
          </div>
        )}
        {w.device.error && (
          <div className="notice" role="alert">
            {w.device.error}
          </div>
        )}
        {tab === "journey" ? (
          <div className="layout">
            <section className="planner" aria-label="Journey planner">
              {w.resume && !w.journey && (
                <div className="notice">
                  A saved journey is available.
                  <div className="buttons">
                    <button onClick={w.resumeJourney}>Resume</button>
                    <button onClick={w.end}>Discard</button>
                  </div>
                </div>
              )}
              {!!w.savedPlaces.length && (
                <div
                  className="saved-shortcuts"
                  aria-label="Saved destinations"
                >
                  {w.savedPlaces.map((place) => (
                    <button
                      key={place.name}
                      onClick={() => w.setTo(place.destination)}
                    >
                      {place.name}
                      <span>↗</span>
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void w.search();
                }}
              >
                <label>
                  From
                  <div className="input-row">
                    <input
                      required
                      value={w.from}
                      onChange={(e) => w.setFrom(e.target.value)}
                      list="places"
                    />
                    <button
                      type="button"
                      onClick={w.locate}
                      aria-label="Use current location"
                    >
                      ◎
                    </button>
                  </div>
                </label>
                <label>
                  To
                  <input
                    required
                    value={w.to}
                    onChange={(e) => w.setTo(e.target.value)}
                    list="places"
                  />
                </label>
                <datalist id="places">
                  {Object.keys(places).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </datalist>
                <div className="segmented" aria-label="Transport mode">
                  {[
                    ["all", "All transport"],
                    ["bus", "Bus"],
                    ["walking", "Walking"],
                  ].map(([id, label]) => (
                    <button
                      type="button"
                      key={id}
                      aria-pressed={w.mode === id}
                      onClick={() => w.setMode(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  className="primary wide"
                  disabled={w.loading || w.starting}
                >
                  {w.loading ? "Finding routes…" : "Find routes"}
                  <span>↗</span>
                </button>
              </form>
              <details className="saved-editor">
                <summary>Saved destinations</summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    w.saveDestination(placeName);
                    setPlaceName("");
                  }}
                >
                  <label>
                    Name
                    <input
                      value={placeName}
                      required
                      maxLength={40}
                      placeholder="Home, Work…"
                      onChange={(e) => setPlaceName(e.target.value)}
                    />
                  </label>
                  <button disabled={!w.to.trim()}>Save destination</button>
                </form>
                {w.savedPlaces.map((place) => (
                  <div className="saved-place" key={place.name}>
                    <span>
                      <strong>{place.name}</strong>
                      <small>{place.destination}</small>
                    </span>
                    <button
                      aria-label={`Remove ${place.name}`}
                      onClick={() => w.removeDestination(place.name)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </details>
              {w.choices.map((c) => (
                <button
                  className="choice"
                  key={`${c.side}${c.id}`}
                  onClick={() =>
                    c.side === "from" ? w.setFrom(c.id) : w.setTo(c.id)
                  }
                >
                  {c.side}: {c.name}
                </button>
              ))}
              <div className="section-label">
                <h2>{w.routes.length ? "Your options" : "Find a route"}</h2>
                {!!w.routes.length && <span>{w.routes.length} routes</span>}
              </div>
              {!w.routes.length && (
                <p className="muted">
                  London addresses, stations or postcodes.
                </p>
              )}
              <div
                className="routes"
                role="radiogroup"
                aria-label="Route options"
              >
                {w.comparison.map(
                  ({ route: r, label, walking, changes }, i) => (
                    <button
                      key={r.id}
                      role="radio"
                      aria-checked={w.index === i}
                      className={`route ${w.index === i ? "selected" : ""}`}
                      onClick={() => w.setSelected(i)}
                    >
                      <span className="route-top">
                        <strong>
                          {r.duration} <small>min</small>
                        </strong>
                        <span>{label}</span>
                      </span>
                      <span className="route-modes">
                        {r.legs
                          .filter((l) => l.mode !== "walking")
                          .map((l) => l.line || l.mode)
                          .join(" → ") || "Walk all the way"}
                      </span>
                      <span className="route-times">
                        {clockTime(r.departure)} <span>→</span>{" "}
                        {clockTime(r.arrival)}
                      </span>
                      <span className="muted">
                        {walking} min walking ·{" "}
                        {changes === 0
                          ? "No changes"
                          : `${changes} ${changes === 1 ? "change" : "changes"}`}
                      </span>
                      {r.legs.some((l) => l.disruption) && (
                        <span className="warning">Disruption reported</span>
                      )}
                    </button>
                  ),
                )}
              </div>
              {w.chosen &&
                (!w.journey ||
                  !["riding", "alighting"].includes(w.journey.phase)) && (
                  <button
                    className="primary wide"
                    disabled={w.starting || w.loading}
                    onClick={() => void w.start()}
                  >
                    {w.starting
                      ? "Checking this route…"
                      : w.journey
                        ? "Use selected route"
                        : "Start journey"}
                    <span>→</span>
                  </button>
                )}
            </section>
            <JourneyPreview w={w} />
          </div>
        ) : (
          <DevicePanel w={w} />
        )}
        <footer>
          <span>Waypoint · London prototype</span>
          <a
            href="https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service"
            target="_blank"
            rel="noreferrer"
          >
            Powered by TfL Open Data ↗
          </a>
        </footer>
      </main>
    </div>
  );
}
