import { useEffect, useRef } from "react";
import type { HudScene } from "./hud.ts";
import { drawHud } from "./renderHud.ts";
export function GlassesPreview({ scene }: { scene: HudScene }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(scene);
  useEffect(() => {
    if (canvas.current) drawHud(canvas.current, JSON.parse(key) as HudScene);
  }, [key]);
  return (
    <canvas
      ref={canvas}
      width={576}
      height={288}
      className="glasses-canvas"
      role="img"
      aria-label={`${scene.map ? `North-up ${scene.map.overview ? "route overview" : "walking map"}. ` : ""}${scene.line}. ${scene.title}. ${scene.detail}. ${scene.departure ? `${scene.departure.time}, towards ${scene.departure.destination}.` : ""} ${scene.status}. ${scene.footer}. ${scene.stops.map((s) => `${s.name}, ${s.state}`).join(". ")}`}
    />
  );
}
