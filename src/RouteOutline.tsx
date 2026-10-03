import { useEffect, useRef } from "react";
import { drawMap, type MapView } from "./streetMap.ts";
export function Outline({ map }: { map: MapView }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (context) drawMap(context, map, 0, 0, 600, 360);
  }, [map]);
  return (
    <div className="route-map">
      <canvas
        ref={canvas}
        width={600}
        height={360}
        role="img"
        aria-label="North-up street map with the selected route and boarding points"
      />
      <div className="map-caption">
        <span>{map.status}</span>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
      </div>
    </div>
  );
}
