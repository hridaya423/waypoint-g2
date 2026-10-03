import { test } from "node:test";
import assert from "node:assert/strict";
import { compareRoutes, connection } from "../src/connections.ts";
import { rehearsalJourney } from "../src/rehearsal.ts";

test("route comparison describes real tradeoffs rather than array order", () => {
  const route = rehearsalJourney("full-trip").route;
  const slower = {
    ...route,
    id: "slower",
    duration: 20,
    legs: route.legs.map((l) => ({
      ...l,
      duration: l.mode === "walking" ? 1 : 18,
    })),
  };
  const result = compareRoutes([slower, route]);
  assert.equal(result[0].label, "Less walking");
  assert.equal(result[1].label, "Fastest");
  assert.equal(result[0].walking, 2);
  assert.equal(result[1].changes, 0);
});
test("connection guidance cannot claim a margin without fresh location", () => {
  const journey = rehearsalJourney("full-trip");
  const result = connection(journey, [], Date.now());
  assert.ok(result);
  assert.match(result.detail, /location/i);
  assert.equal(result.risk, false);
});

test("live connection margin expires and falls back to a labelled timetable", () => {
  const now = Date.now();
  const journey = rehearsalJourney("full-trip", now);
  journey.lastFix = {
    ...journey.route.legs[0].from,
    accuracy: 5,
    timestamp: now,
  };
  journey.quality = "good";
  const leg = journey.route.legs[1];
  leg.direction = "Camden";
  leg.departure = new Date(now + 10 * 60000).toISOString();
  const rows = [
    {
      id: "1",
      line: "24",
      lineId: leg.lineId,
      destination: "Camden",
      expected: now + 60000,
      timestamp: now,
      vehicleId: "",
      platform: "",
    },
    {
      id: "2",
      line: "24",
      lineId: leg.lineId,
      destination: "Camden",
      expected: now + 8 * 60000,
      timestamp: now,
      vehicleId: "",
      platform: "",
    },
  ];
  const live = connection(journey, rows, now)!;
  assert.equal(live.risk, true);
  assert.match(live.detail, /Live stop prediction/);
  assert.match(live.detail, /Later departure/);
  rows.forEach((row) => (row.timestamp -= 100000));
  const stale = connection(journey, rows, now)!;
  assert.equal(stale.risk, false);
  assert.match(stale.detail, /Timetable only/);
  assert.doesNotMatch(stale.detail, /Live/);
  journey.quality = "uncertain";
  assert.doesNotMatch(connection(journey, rows, now)!.title, /spare/);
});
test("rail predictions in another direction do not promise a connection", () => {
  const now = Date.now();
  const journey = rehearsalJourney("full-trip", now);
  journey.lastFix = {
    ...journey.route.legs[0].from,
    accuracy: 5,
    timestamp: now,
  };
  journey.quality = "good";
  const leg = journey.route.legs[1];
  leg.mode = "tube";
  leg.direction = "High Barnet";
  leg.departure = new Date(now + 600000).toISOString();
  const row = {
    id: "1",
    line: "Northern",
    lineId: leg.lineId,
    destination: "Morden",
    expected: now + 60000,
    timestamp: now,
    vehicleId: "",
    platform: "",
  };
  assert.match(connection(journey, [row], now)!.detail, /Timetable only/);
  journey.phase = "arrived";
  assert.equal(connection(journey, [row], now), null);
});
