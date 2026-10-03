import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  parseRoutes,
  parsePath,
  matchStops,
  parseArrivals,
} from "../src/tfl.ts";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("../docs/research/tfl-journey-sample.json", import.meta.url),
    "utf8",
  ),
);
const sequence = JSON.parse(
  fs.readFileSync(
    new URL("../docs/research/tfl-line-24-inbound.json", import.meta.url),
    "utf8",
  ),
);
const route = parseRoutes(fixture, 1000)[0];
const index = route.legs.findIndex((l) => l.mode === "bus");
const bus = route.legs[index];
const names = fixture.journeys[0].legs[index].path.stopPoints.map(
  (p: { name: string }) => p.name,
);
test("real TfL route parses, and repeated options collapse", () => {
  assert.ok(route.legs.length > 1);
  assert.equal(route.legs[0].mode, "walking");
  assert.equal(
    parseRoutes({ journeys: [fixture.journeys[0], fixture.journeys[0]] }, 0)
      .length,
    1,
  );
  assert.deepEqual(parseRoutes({ journeys: [{ legs: [{}] }] }, 0), []);
  assert.deepEqual(parsePath("broken"), []);
  assert.deepEqual(parsePath('[[100,0],[51,"x"]]'), []);
});
test("real TfL stop aliases require location, letter and complete ordered names", () => {
  const stops = matchStops(bus, sequence, names);
  assert.equal(stops.length, 12);
  assert.equal(stops[0].id, "490013767C");
  assert.equal(stops.at(-1)?.id, "490015041Y");
  assert.deepEqual(
    matchStops({ ...bus, from: { ...bus.from, letter: "Z" } }, sequence, names),
    [],
  );
  assert.deepEqual(
    matchStops(
      { ...bus, from: { ...bus.from, lat: bus.from.lat + 0.001 } },
      sequence,
      names,
    ),
    [],
  );
  assert.deepEqual(matchStops(bus, sequence, [...names].reverse()), []);
  assert.deepEqual(matchStops(bus, sequence, names.slice(1)), []);
  assert.deepEqual(
    matchStops(
      { ...bus, path: bus.path.map((p) => ({ ...p, lon: p.lon + 0.01 })) },
      sequence,
      names,
    ),
    [],
  );
});
test("malformed arrival timestamps do not become live predictions", () => {
  assert.deepEqual(
    parseArrivals([{ expectedArrival: "bad", timestamp: "bad" }]),
    [],
  );
  const arrivals = parseArrivals([
    {
      id: "2",
      expectedArrival: "2026-10-03T12:05:00Z",
      timestamp: "2026-10-03T12:00:00Z",
    },
    {
      id: "1",
      expectedArrival: "2026-10-03T12:02:00Z",
      timestamp: "2026-10-03T12:00:00Z",
    },
  ]);
  assert.equal(arrivals[0].id, "1");
});
