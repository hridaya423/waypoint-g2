import { test } from "node:test";
import assert from "node:assert/strict";
import { readJourney, saveJourney } from "../src/storage.ts";
import {
  startJourney,
  confirmBoarding,
  undoDetection,
} from "../src/journey.ts";
import { rehearsalRoute } from "../src/rehearsal.ts";
let stored: string | null = null;
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      stored = value;
    },
    removeItem: () => {
      stored = null;
    },
  },
});
test("resume discards location confidence and never restores an urgent reminder", () => {
  const j = confirmBoarding(
    startJourney({ ...rehearsalRoute(), rehearsal: false }),
  );
  saveJourney({
    ...j,
    quality: "good",
    autoBoardedAt: Date.now(),
    motion: { kind: "boarding", since: Date.now(), origin: 0, samples: 2 },
    stopAlert: true,
    lastFix: { lat: 51.5, lon: -0.1, accuracy: 5, timestamp: Date.now() },
  });
  const restored = readJourney();
  assert.equal(restored?.quality, "locating");
  assert.equal(restored?.lastFix, null);
  assert.equal(restored?.stopAlert, false);
  assert.equal(restored?.phase, "riding");
  assert.equal(restored?.motion, undefined);
  assert.ok(restored?.autoBoardedAt);
  assert.equal(undoDetection(restored!).phase, "waiting");
  saveJourney(startJourney(rehearsalRoute()));
  assert.equal(readJourney(), null);
});
test("malformed and expired saved journeys are ignored", () => {
  for (const value of ["bad", "{}", '{"route":{"legs":[null]}}']) {
    stored = value;
    assert.equal(readJourney(), null);
  }
  const j = startJourney({
    ...rehearsalRoute(),
    rehearsal: false,
    fetchedAt: Date.now() - 5 * 3600000,
  });
  saveJourney(j);
  assert.equal(readJourney(), null);
});
