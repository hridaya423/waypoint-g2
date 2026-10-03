import type { Point, Route } from "./model.ts";
import { distance } from "./geo.ts";
export type Street = { name: string; footway: boolean; points: Point[] };
export type StreetArea = {
  bounds: [number, number, number, number];
  streets: Street[];
  fetchedAt: number;
};
export type MapView = {
  paths: Point[][];
  stops: Point[];
  position: Point | null;
  center: Point;
  span: number;
  streets: Street[];
  overview: boolean;
  status: string;
};
const cacheKey = "waypoint-streets-v1";
export function routeBounds(route: Route): StreetArea["bounds"] | null {
  const points = route.legs.flatMap((l) =>
    l.path.length ? l.path : [l.from, l.to],
  );
  if (!points.length) return null;
  const south = Math.min(...points.map((p) => p.lat)) - 0.003;
  const north = Math.max(...points.map((p) => p.lat)) + 0.003;
  const west = Math.min(...points.map((p) => p.lon)) - 0.004;
  const east = Math.max(...points.map((p) => p.lon)) + 0.004;
  if (distance({ lat: south, lon: west }, { lat: north, lon: east }) > 12000)
    return null;
  return [south, west, north, east];
}
function validPoint(p: unknown): p is Point {
  if (!p || typeof p !== "object") return false;
  const point = p as Point;
  return (
    Number.isFinite(point.lat) &&
    Math.abs(point.lat) <= 90 &&
    Number.isFinite(point.lon) &&
    Math.abs(point.lon) <= 180
  );
}
export function parseStreets(value: unknown): Street[] {
  if (
    !value ||
    typeof value !== "object" ||
    !("elements" in value) ||
    !Array.isArray(value.elements)
  )
    throw new Error("Street data is unavailable");
  if ("remark" in value)
    throw new Error("Street service returned an incomplete map");
  if (value.elements.length > 12000)
    throw new Error("Street area is too detailed for the pilot map");
  return value.elements.flatMap((way: unknown) => {
    if (!way || typeof way !== "object") return [];
    const w = way as {
      tags?: { name?: unknown; highway?: unknown };
      geometry?: unknown;
    };
    if (
      !Array.isArray(w.geometry) ||
      !w.geometry.every(validPoint) ||
      w.geometry.length < 2
    )
      return [];
    return [
      {
        name: typeof w.tags?.name === "string" ? w.tags.name.slice(0, 100) : "",
        footway: ["footway", "path", "steps", "pedestrian"].includes(
          String(w.tags?.highway),
        ),
        points: w.geometry.map((p) => ({ lat: p.lat, lon: p.lon })),
      },
    ];
  });
}
export function cachedStreets(bounds: StreetArea["bounds"]): StreetArea | null {
  try {
    const area: StreetArea = JSON.parse(
      localStorage.getItem(cacheKey) || "null",
    );
    if (
      !area ||
      !Array.isArray(area.bounds) ||
      area.bounds.length !== 4 ||
      !area.bounds.every(Number.isFinite) ||
      !Number.isFinite(area.fetchedAt) ||
      Date.now() - area.fetchedAt > 7 * 86400000 ||
      area.fetchedAt > Date.now() + 3000 ||
      area.bounds[0] > bounds[0] ||
      area.bounds[1] > bounds[1] ||
      area.bounds[2] < bounds[2] ||
      area.bounds[3] < bounds[3] ||
      !Array.isArray(area.streets) ||
      !area.streets.every(
        (s) =>
          typeof s.name === "string" &&
          typeof s.footway === "boolean" &&
          Array.isArray(s.points) &&
          s.points.length >= 2 &&
          s.points.every(validPoint),
      )
    )
      return null;
    return area;
  } catch {
    return null;
  }
}
export async function loadStreets(
  bounds: StreetArea["bounds"],
  signal: AbortSignal,
): Promise<{ area: StreetArea; saved: boolean }> {
  const cached = cachedStreets(bounds);
  if (cached) return { area: cached, saved: true };
  const query = `[out:json][timeout:20][maxsize:16777216];way["highway"~"^(primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|footway|path|steps|cycleway)$"]["name"](${bounds.join(",")});out geom;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]),
  });
  if (!response.ok)
    throw new Error("Street map unavailable. Route guidance still works.");
  const area = {
    bounds,
    streets: parseStreets(await response.json()),
    fetchedAt: Date.now(),
  };
  if (!area.streets.length)
    throw new Error("No streets returned for this area");
  let saved = false;
  const json = JSON.stringify(area);
  if (json.length < 2000000) {
    try {
      localStorage.setItem(cacheKey, json);
      saved = true;
    } catch {
      saved = false;
    }
  }
  return { area, saved };
}
export function mapView(
  route: Route,
  area: StreetArea | null,
  legIndex: number,
  position: Point | null,
  overview: boolean,
  status: string,
): MapView {
  const paths = route.legs.map((l) =>
    l.path.length ? l.path : [l.from, l.to],
  );
  const all = paths.flat();
  const center = overview
    ? {
        lat:
          (Math.min(...all.map((p) => p.lat)) +
            Math.max(...all.map((p) => p.lat))) /
          2,
        lon:
          (Math.min(...all.map((p) => p.lon)) +
            Math.max(...all.map((p) => p.lon))) /
          2,
      }
    : (position ?? route.legs[legIndex].from);
  const span = overview
    ? Math.max(300, ...all.map((p) => distance(center, p) * 2.3))
    : 350;
  return {
    paths: overview ? paths : [paths[legIndex]],
    stops: overview
      ? route.legs.flatMap((l) => [l.from, l.to])
      : [route.legs[legIndex].to],
    position,
    center: {
      lat: Math.round(center.lat * 10000) / 10000,
      lon: Math.round(center.lon * 10000) / 10000,
    },
    span,
    streets: (area?.streets ?? []).filter((s) => {
      const radius = span / 111195;
      return (
        Math.min(...s.points.map((p) => p.lat)) < center.lat + radius &&
        Math.max(...s.points.map((p) => p.lat)) > center.lat - radius &&
        Math.min(...s.points.map((p) => p.lon)) < center.lon + radius * 2 &&
        Math.max(...s.points.map((p) => p.lon)) > center.lon - radius * 2
      );
    }),
    overview,
    status,
  };
}
export function drawMap(
  c: CanvasRenderingContext2D,
  map: MapView,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  c.save();
  c.beginPath();
  c.rect(x, y, width, height);
  c.clip();
  c.fillStyle = "#000";
  c.fillRect(x, y, width, height);
  const scale = Math.min(width, height) / map.span;
  const xy = (p: Point) => [
    x +
      width / 2 +
      (p.lon - map.center.lon) *
        Math.cos((map.center.lat * Math.PI) / 180) *
        111195 *
        scale,
    y + height / 2 - (p.lat - map.center.lat) * 111195 * scale,
  ];
  const path = (points: Point[]) => {
    c.beginPath();
    points.forEach((p, i) => {
      const [px, py] = xy(p);
      if (!i) c.moveTo(px, py);
      else c.lineTo(px, py);
    });
    c.stroke();
  };
  c.lineCap = "round";
  c.lineJoin = "round";
  for (const street of map.streets) {
    if (street.footway && (map.overview || !street.name)) continue;
    c.strokeStyle = street.footway ? "#002800" : "#004500";
    c.lineWidth = street.footway ? 0.8 : 1.4;
    c.setLineDash([]);
    path(street.points);
  }
  c.setLineDash([]);
  c.strokeStyle = "#000";
  c.lineWidth = 8;
  map.paths.forEach(path);
  c.strokeStyle = "#00ff00";
  c.lineWidth = 4;
  map.paths.forEach(path);
  for (const stop of map.stops) {
    const [px, py] = xy(stop);
    c.beginPath();
    c.arc(px, py, 5, 0, 2 * Math.PI);
    c.fillStyle = "#000";
    c.fill();
    c.strokeStyle = "#00ff00";
    c.lineWidth = 2;
    c.stroke();
  }
  const labels: [number, number][] = [];
  if (!map.overview)
    for (const street of map.streets) {
      if (!street.name || labels.length >= 2) continue;
      const [px, py] = xy(street.points[Math.floor(street.points.length / 2)]);
      if (
        px < x + 30 ||
        px > x + width - 100 ||
        py < y + 35 ||
        py > y + height - 30 ||
        labels.some(
          ([lx, ly]) => Math.abs(lx - px) < 110 && Math.abs(ly - py) < 35,
        )
      )
        continue;
      c.font = "12px Arial";
      c.lineWidth = 3;
      c.strokeStyle = "#000";
      const label =
        street.name.length > 20 ? street.name.slice(0, 19) + "…" : street.name;
      c.fillStyle = "#000";
      c.fillRect(px - 2, py - 12, c.measureText(label).width + 4, 16);
      c.fillStyle = "#008500";
      c.strokeText(label, px, py);
      c.fillText(label, px, py);
      labels.push([px, py]);
    }
  if (map.position) {
    const [px, py] = xy(map.position);
    c.beginPath();
    c.arc(px, py, 7, 0, Math.PI * 2);
    c.fillStyle = "#00ff00";
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = "#000";
    c.stroke();
  }
  c.fillStyle = "#000";
  c.fillRect(x, y, 40, 23);
  c.fillRect(x, y + height - 22, width, 22);
  c.font = "600 13px Arial";
  c.fillStyle = "#00bb00";
  c.fillText("N ↑", x + 10, y + 18);
  c.font = "12px Arial";
  c.fillStyle = "#00aa00";
  c.fillText(
    map.streets.length
      ? "© OpenStreetMap contributors"
      : map.status === "Loading streets…"
        ? map.status
        : "Route only · streets unavailable",
    x + 8,
    y + height - 7,
  );
  c.restore();
}
