import type { Point } from "./model.ts";
const radians = Math.PI / 180;
export function distance(a: Point, b: Point): number {
  const x = (b.lon - a.lon) * Math.cos(((a.lat + b.lat) / 2) * radians);
  return Math.hypot(x, b.lat - a.lat) * 111_195;
}
export function project(
  point: Point,
  path: Point[],
): { along: number; away: number } {
  let along = 0;
  let best = { along: 0, away: Infinity };
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const scale = Math.cos(point.lat * radians);
    const dx = (b.lon - a.lon) * scale;
    const dy = b.lat - a.lat;
    const px = (point.lon - a.lon) * scale;
    const py = point.lat - a.lat;
    const t = Math.max(
      0,
      Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)),
    );
    const away = Math.hypot(px - dx * t, py - dy * t) * 111_195;
    const length = distance(a, b);
    if (away < best.away) best = { along: along + length * t, away };
    along += length;
  }
  return best;
}
