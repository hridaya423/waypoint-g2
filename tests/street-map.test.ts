import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cachedStreets,
  loadStreets,
  mapView,
  parseStreets,
  routeBounds,
} from "../src/streetMap.ts";
import { readPlaces, savePlaces } from "../src/storage.ts";
import { rehearsalJourney } from "../src/rehearsal.ts";
const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  },
});
const bounds: [number, number, number, number] = [51.5, -0.14, 51.52, -0.12];
const streets = [
  {
    name: "Charing Cross Road",
    footway: false,
    points: [
      { lat: 51.51, lon: -0.13 },
      { lat: 51.511, lon: -0.131 },
    ],
  },
];
test("street parser rejects invalid geometry and incomplete server responses", () => {
  assert.deepEqual(
    parseStreets({
      elements: [
        {
          tags: { name: "Charing Cross Road", highway: "primary" },
          geometry: streets[0].points,
        },
        {
          geometry: [
            { lat: 91, lon: 0 },
            { lat: 0, lon: 0 },
          ],
        },
      ],
    }),
    streets,
  );
  assert.throws(
    () => parseStreets({ remark: "timeout", elements: [] }),
    /incomplete/,
  );
});
test("cached street geometry loads without network and cannot cover another area", async () => {
  store.set(
    "waypoint-streets-v1",
    JSON.stringify({ bounds, streets, fetchedAt: Date.now() }),
  );
  const controller = new AbortController();
  controller.abort();
  const saved = await loadStreets(bounds, controller.signal);
  assert.equal(saved.saved, true);
  assert.deepEqual(saved.area.streets, streets);
  assert.equal(cachedStreets([50, -1, 52, 1]), null);
  store.set(
    "waypoint-streets-v1",
    JSON.stringify({ bounds, streets, fetchedAt: Date.now() - 8 * 86400000 }),
  );
  assert.equal(cachedStreets(bounds), null);
  store.set("waypoint-streets-v1", '{"streets":[null]}');
  assert.equal(cachedStreets(bounds), null);
});
test("saved destinations persist and reject malformed storage", () => {
  savePlaces([{ name: "Work", destination: "Waterloo" }]);
  assert.deepEqual(readPlaces(), [{ name: "Work", destination: "Waterloo" }]);
  store.set(
    "waypoint-places-v1",
    JSON.stringify([
      { name: "", destination: "x" },
      { name: "Bad", destination: 3 },
      null,
      { name: "Home", destination: "Camden Town" },
    ]),
  );
  assert.deepEqual(readPlaces(), [
    { name: "Home", destination: "Camden Town" },
  ]);
});
test("map view keeps all route legs in overview and limits the walking view", () => {
  const route = rehearsalJourney("full-trip").route;
  assert.ok(routeBounds(route));
  const overview = mapView(route, null, 0, null, true, "Route only");
  assert.equal(overview.paths.length, 3);
  assert.equal(overview.position, null);
  const walk = mapView(route, null, 0, route.legs[0].from, false, "Route only");
  assert.equal(walk.paths.length, 1);
  assert.equal(walk.span, 350);
  route.legs[0].path.push({ lat: 52, lon: -1 });
  assert.equal(routeBounds(route), null);
});
