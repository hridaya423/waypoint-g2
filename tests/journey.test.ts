import { test } from "node:test";
import assert from "node:assert/strict";
import {
  startJourney,
  confirmBoarding,
  observe,
  instruction,
  nextLeg,
  undoDetection,
} from "../src/journey.ts";
import type { Route, Stop } from "../src/model.ts";
const stops: Stop[] = [0, 0.001, 0.002, 0.003].map((offset, i) => ({
  lat: 51.5 + offset,
  lon: -0.1,
  id: String(i),
  name: `Stop ${i}`,
  letter: "",
}));
const route: Route = {
  id: "test",
  duration: 5,
  departure: "",
  arrival: "",
  fetchedAt: 1000,
  rehearsal: false,
  legs: [
    {
      mode: "bus",
      summary: "24 to Stop 3",
      direction: "North",
      line: "24",
      lineId: "24",
      from: stops[0],
      to: stops[3],
      duration: 5,
      distance: 340,
      departure: "",
      arrival: "",
      path: stops,
      steps: [],
      stops,
      stopTracking: true,
      disruption: "",
    },
  ],
};
const fix = (lat: number, timestamp: number, accuracy = 5) => ({
  lat,
  lon: -0.1,
  accuracy,
  timestamp,
});
test("boarding is explicit, and passing the penultimate stop triggers the reminder", () => {
  let j = startJourney(route);
  j = observe(j, fix(51.5, 1000), 1000);
  assert.equal(j.phase, "waiting");
  j = confirmBoarding(j);
  j = observe(j, fix(51.501, 6000), 6000);
  assert.equal(j.stopAlert, false);
  j = observe(j, fix(51.502, 11000), 11000);
  assert.equal(j.stopAlert, false);
  j = observe(j, fix(51.5024, 16000), 16000);
  assert.equal(instruction(j, 16000).title, "PRESS STOP NOW");
  assert.equal(
    instruction({ ...j, acknowledged: true }, 16000).title,
    "Your stop is next",
  );
  assert.equal(instruction(j, 40000).urgent, false);
  j = observe(j, fix(51.503, 20000), 20000);
  assert.equal(j.phase, "alighting");
  assert.equal(nextLeg(j).phase, "arrived");
});
test("poor accuracy, stale data, jumps and wrong roads do not trigger stop alerts", () => {
  const start = confirmBoarding(startJourney(route));
  for (const f of [
    fix(51.5025, 1000, 100),
    fix(51.5025, 1000),
    { ...fix(51.5025, 30000), lon: -0.104 },
    fix(51.5025, 30000),
  ]) {
    const j = observe(start, f, 30000);
    assert.equal(j.stopAlert, false);
    assert.equal(j.quality, "uncertain");
  }
});
test("rail never asks for a stop button and unknown sequences stay uncertain", () => {
  for (const mode of ["tube", "bus"]) {
    let j = confirmBoarding(
      startJourney({
        ...route,
        legs: [{ ...route.legs[0], mode, stopTracking: mode === "tube" }],
      }),
    );
    for (let i = 0; i < 6; i++)
      j = observe(j, fix(51.5 + i * 0.0005, 1000 + i * 5000), 1000 + i * 5000);
    assert.notEqual(instruction(j, 26000).title, "PRESS STOP NOW");
  }
});
test("an older callback cannot move the journey backwards", () => {
  const j = observe(
    confirmBoarding(startJourney(route)),
    fix(51.501, 6000),
    6000,
  );
  assert.deepEqual(observe(j, fix(51.5, 1000), 6000), j);
});
test("invalid coordinate and timestamp values cannot establish progress", () => {
  const j = confirmBoarding(startJourney(route));
  for (const bad of [
    { ...fix(51.5, 1000), lat: NaN },
    { ...fix(51.5, 1000), lon: Infinity },
    { ...fix(51.5, 1000), timestamp: NaN },
  ]) {
    const result = observe(j, bad, 1000);
    assert.equal(result.quality, "uncertain");
    assert.equal(result.progress, 0);
    assert.equal(instruction(result, 1000).urgent, false);
  }
});
test("walking arrival advances to boarding, never automatically onto the vehicle", () => {
  const walk = {
    ...route.legs[0],
    mode: "walking",
    to: stops[1],
    path: stops.slice(0, 2),
  };
  let j = startJourney({ ...route, legs: [walk, route.legs[0]] });
  j = observe(j, fix(51.5005, 1000), 1000);
  j = observe(j, fix(51.501, 6000), 6000);
  assert.equal(j.legIndex, 1);
  assert.equal(j.phase, "waiting");
  assert.equal(j.stopAlert, false);
});
test("a fix beyond the destination suppresses a late stop-button request", () => {
  let j = confirmBoarding(startJourney(route));
  for (let i = 0; i < 6; i++)
    j = observe(j, fix(51.5 + i * 0.0005, 1000 + i * 5000), 1000 + i * 5000);
  assert.equal(j.stopAlert, true);
  j = observe(j, fix(51.5034, 32000), 32000);
  assert.equal(j.stopAlert, false);
  assert.equal(j.quality, "uncertain");
  assert.equal(instruction(j, 32000).urgent, false);
});
test("sustained vehicle movement after waiting at the stop detects boarding", () => {
  let j = startJourney(route);
  for (const [lat, time] of [
    [51.5, 1000],
    [51.5003, 5000],
    [51.5006, 9000],
    [51.5009, 13000],
  ])
    j = observe(j, fix(lat, time), time);
  assert.equal(j.phase, "riding");
  assert.ok(j.progress > 90);
});
test("walking, GPS jumps, gaps and joining a route away from its stop cannot auto-board", () => {
  const traces = [
    [
      [51.5, 1000],
      [51.50006, 5000],
      [51.50012, 9000],
      [51.50018, 13000],
    ],
    [
      [51.5, 1000],
      [51.502, 2000],
      [51.5022, 6000],
    ],
    [
      [51.5, 1000],
      [51.5003, 20000],
      [51.5006, 24000],
      [51.5009, 28000],
    ],
    [
      [51.5005, 1000],
      [51.5008, 5000],
      [51.5011, 9000],
      [51.5014, 13000],
    ],
  ];
  for (const trace of traces) {
    let j = startJourney(route);
    for (const [lat, time] of trace) j = observe(j, fix(lat, time), time);
    assert.equal(j.phase, "waiting");
  }
});
test("walking away from the alighting stop onto a diverging path starts the final walk", () => {
  const end = { ...stops[3], lon: -0.102, name: "Destination" };
  const walk = {
    ...route.legs[0],
    mode: "walking",
    from: stops[3],
    to: end,
    path: [stops[3], end],
    stops: [],
    stopTracking: false,
  };
  let j = confirmBoarding(
    startJourney({ ...route, legs: [route.legs[0], walk] }),
  );
  for (const [lat, time] of [
    [51.5, 1000],
    [51.501, 6000],
    [51.502, 11000],
    [51.503, 16000],
  ])
    j = observe(j, fix(lat, time), time);
  assert.equal(j.phase, "alighting");
  for (let i = 1; i <= 9; i++) {
    const time = 16000 + i * 4000;
    j = observe(j, { ...fix(51.503, time), lon: -0.1 - i * 0.0001 }, time);
  }
  assert.equal(j.legIndex, 1);
  assert.equal(j.phase, "walking");
  j = undoDetection(j);
  assert.equal(j.legIndex, 0);
  assert.equal(j.phase, "alighting");
  assert.equal(j.autoAlightingDisabled, true);
  assert.equal(nextLeg(j).phase, "walking");
});

test("undoing inferred boarding keeps the user waiting and disables repeat detection for that leg", () => {
  let j = startJourney(route);
  for (const [lat, time] of [
    [51.5, 1000],
    [51.5003, 5000],
    [51.5006, 9000],
    [51.5009, 13000],
  ])
    j = observe(j, fix(lat, time), time);
  j = undoDetection(j);
  assert.equal(j.phase, "waiting");
  for (const [lat, time] of [
    [51.5, 17000],
    [51.5003, 21000],
    [51.5006, 25000],
    [51.5009, 29000],
  ])
    j = observe(j, fix(lat, time), time);
  assert.equal(j.phase, "waiting");
  assert.equal(confirmBoarding(j).phase, "riding");
});
test("remaining on the bus corridor never automatically starts a parallel final walk", () => {
  const end = { ...stops[3], lat: 51.505 };
  const walk = {
    ...route.legs[0],
    mode: "walking",
    from: stops[3],
    to: end,
    path: [stops[3], end],
    stopTracking: false,
    stops: [],
  };
  let j = confirmBoarding(
    startJourney({ ...route, legs: [route.legs[0], walk] }),
  );
  for (const [lat, time] of [
    [51.5, 1000],
    [51.501, 6000],
    [51.502, 11000],
    [51.503, 16000],
  ])
    j = observe(j, fix(lat, time), time);
  for (let i = 1; i <= 15; i++)
    j = observe(
      j,
      fix(51.503 + i * 0.00006, 16000 + i * 4000),
      16000 + i * 4000,
    );
  assert.equal(j.legIndex, 0);
  assert.equal(j.phase, "alighting");
});
test("a complete walk-bus-walk trace advances in order without boarding or alighting taps", () => {
  const origin = { ...stops[0], lat: 51.4995 };
  const destination = { ...stops[3], lon: -0.102 };
  const first = {
    ...route.legs[0],
    mode: "walking",
    from: origin,
    to: stops[0],
    path: [origin, stops[0]],
    stops: [],
    stopTracking: false,
  };
  const last = {
    ...first,
    from: stops[3],
    to: destination,
    path: [stops[3], destination],
  };
  let j = startJourney({ ...route, legs: [first, route.legs[0], last] });
  for (const [lat, time] of [
    [51.4995, 1000],
    [51.4998, 11000],
    [51.5, 21000],
  ])
    j = observe(j, fix(lat, time), time);
  assert.equal(j.legIndex, 1);
  assert.equal(j.phase, "waiting");
  for (const [lat, time] of [
    [51.5, 25000],
    [51.5003, 29000],
    [51.5006, 33000],
    [51.5009, 37000],
  ])
    j = observe(j, fix(lat, time), time);
  assert.equal(j.phase, "riding");
  for (const [lat, time] of [
    [51.5015, 41000],
    [51.502, 45000],
    [51.5024, 49000],
    [51.503, 53000],
  ])
    j = observe(j, fix(lat, time), time);
  assert.equal(j.phase, "alighting");
  for (let i = 1; i <= 20; i++)
    j = observe(
      j,
      { ...fix(51.503, 53000 + i * 4000), lon: -0.1 - i * 0.0001 },
      53000 + i * 4000,
    );
  assert.equal(j.legIndex, 2);
  assert.equal(j.phase, "arrived");
});

test("rail, unverified stops and lower accuracy do not infer boarding", () => {
  for (const [mode, verified, accuracy] of [
    ["tube", true, 5],
    ["bus", false, 5],
    ["bus", true, 30],
  ] as const) {
    let j = startJourney({
      ...route,
      legs: [{ ...route.legs[0], mode, stopTracking: verified }],
    });
    for (const [lat, time] of [
      [51.5, 1000],
      [51.5003, 5000],
      [51.5006, 9000],
      [51.5009, 13000],
    ])
      j = observe(j, fix(lat, time, accuracy), time);
    assert.equal(j.phase, "waiting");
  }
});
test("jogging along the bus route does not infer a ride", () => {
  let j = startJourney(route);
  for (let i = 0; i <= 8; i++)
    j = observe(j, fix(51.5 + i * 0.00014, 1000 + i * 4000), 1000 + i * 4000);
  assert.equal(j.phase, "waiting");
});
