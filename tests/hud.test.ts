import { test } from "node:test";
import assert from "node:assert/strict";
import { hudScene } from "../src/hud.ts";
import { instruction } from "../src/journey.ts";
import { rehearsalJourney } from "../src/rehearsal.ts";
const now = 100000;
test("onboard timeline distinguishes passed stops, next stop and destination", () => {
  const j = rehearsalJourney("stop", now);
  const scene = hudScene(j, instruction(j, now), now);
  assert.equal(scene.kind, "stop");
  assert.equal(scene.remaining, 1);
  assert.deepEqual(
    scene.stops.map((s) => s.state),
    ["passed", "passed", "passed", "destination"],
  );
  const middle = rehearsalJourney("riding", now);
  middle.progress += 30;
  assert.deepEqual(
    hudScene(middle, instruction(middle, now), now).stops.map((s) => s.state),
    ["passed", "passed", "next", "destination"],
  );
});
test("stale fixes hide passed-stop ticks and override a stop alert", () => {
  const j = rehearsalJourney("stop", now);
  const scene = hudScene(j, instruction(j, now + 16000), now + 16000);
  assert.equal(scene.kind, "uncertain");
  assert.equal(scene.remaining, null);
  assert.ok(scene.stops.every((s) => s.state === "unknown"));
});
test("stop acknowledgment is a distinct visible state; urgent alerts override details", () => {
  const j = rehearsalJourney("requested", now);
  assert.equal(hudScene(j, instruction(j, now), now).kind, "requested");
  const alert = rehearsalJourney("stop", now);
  assert.equal(
    hudScene(alert, instruction(alert, now), now, undefined, 0, 0, 20, true)
      .kind,
    "stop",
  );
});
test("details retain full long stop names and arrival has an explicit completion action", () => {
  const j = rehearsalJourney("riding", now);
  j.route.legs[0].stops[1].name = "Hampstead Road / Drummond Street";
  const scene = hudScene(j, instruction(j, now), now, undefined, 0, 0, 0, true);
  assert.equal(scene.kind, "detail");
  assert.equal(scene.title, "Hampstead Road / Drummond Street");
  const end = rehearsalJourney("arrived", now);
  assert.equal(hudScene(end, instruction(end, now), now).footer, "");
});
test("browsing stops clamps at list ends, so reversing direction works immediately", () => {
  const j = rehearsalJourney("riding", now);
  const leg = j.route.legs[0];
  leg.stops = Array.from({ length: 10 }, (_, i) => ({
    ...leg.from,
    id: String(i),
    name: `Stop ${i}`,
    lat: leg.from.lat + i * 0.001,
    lon: leg.from.lon,
  }));
  leg.path = leg.stops;
  leg.to = leg.stops[9];
  j.progress = 400;
  const end = hudScene(j, instruction(j, now), now, undefined, 0, 0, 99);
  const back = hudScene(
    j,
    instruction(j, now),
    now,
    undefined,
    0,
    0,
    end.offset - 1,
  );
  assert.equal(end.stops.at(-1)?.index, 9);
  assert.equal(back.stops.at(-1)?.index, 8);
});
test("unverified stop sequences do not advertise nonexistent stop browsing", () => {
  const j = rehearsalJourney("riding", now);
  j.route.legs[0].stopTracking = false;
  const scene = hudScene(j, instruction(j, now), now);
  assert.equal(scene.stops.length, 0);
  assert.equal(scene.footer, "Stop tracking unavailable");
});
test("remaining stops exclude the stop the vehicle is currently at", () => {
  const j = rehearsalJourney("boarding", now);
  j.phase = "riding";
  const scene = hudScene(j, instruction(j, now), now);
  assert.equal(scene.remaining, 3);
  assert.equal(scene.stops[0].state, "current");
});
test("boarding predictions show fresh matching service and drop expired or stale times", () => {
  const j = rehearsalJourney("boarding", now);
  const arrival = {
    id: "one",
    line: "24",
    lineId: j.route.legs[0].lineId,
    destination: "Hampstead Heath",
    expected: now + 120000,
    timestamp: now,
    vehicleId: "bus",
    platform: "Stop C",
  };
  const scene = (rows: (typeof arrival)[], time = now) =>
    hudScene(j, instruction(j, time), time, undefined, 0, 0, 0, false, rows);
  assert.equal(scene([arrival]).departure?.time, "2 min");
  assert.equal(scene([arrival]).departure?.destination, "Hampstead Heath");
  assert.equal(scene([arrival], now + 70000).departure?.time, "Due");
  assert.equal(scene([arrival], now + 91000).departure, null);
  assert.equal(scene([{ ...arrival, expected: now - 1 }]).departure, null);
  assert.equal(scene([{ ...arrival, lineId: "wrong" }]).departure, null);
  assert.equal(scene([arrival]).stopLetter, "C");
});
test("route choices explain changes and walking; ride context names the following leg", () => {
  const j = rehearsalJourney("riding", now);
  const walk = { ...j.route.legs[0], mode: "walking", duration: 5 };
  j.route.legs.push(walk);
  const riding = hudScene(j, instruction(j, now), now);
  assert.equal(riding.nextLeg, "Then walk 5 min");
  const choice = hudScene(null, instruction(null, now), now, j.route, 1, 2);
  assert.equal(choice.line, "ROUTE 2 / 2");
  assert.equal(choice.status, "Direct ride");
  assert.equal(choice.detail, "5 min walking");
  j.route.legs.push({ ...j.route.legs[0], line: "Northern" });
  assert.equal(
    hudScene(null, instruction(null, now), now, j.route).status,
    "1 change",
  );
});

test("normal guidance is quiet and inferred transitions expose a temporary undo action", () => {
  for (const stage of [
    "boarding",
    "riding",
    "stop",
    "requested",
    "walking",
    "arrived",
  ] as const) {
    const j = rehearsalJourney(stage, now);
    const scene = hudScene(j, instruction(j, now), now);
    assert.equal(scene.footer, "");
    assert.equal(scene.undoAvailable, false);
  }
  const j = rehearsalJourney("riding", now);
  j.autoBoardedAt = now;
  assert.equal(hudScene(j, instruction(j, now), now).undoAvailable, true);
  assert.equal(
    hudScene(j, instruction(j, now + 12001), now + 12001).undoAvailable,
    false,
  );
});
