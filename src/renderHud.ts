import { drawMap } from "./streetMap.ts";
import type { HudScene, HudStop } from "./hud.ts";
export const HUD_WIDTH = 576;
export const HUD_HEIGHT = 288;
export function drawHud(canvas: HTMLCanvasElement, scene: HudScene) {
  if (canvas.width !== HUD_WIDTH) canvas.width = HUD_WIDTH;
  if (canvas.height !== HUD_HEIGHT) canvas.height = HUD_HEIGHT;
  const c = canvas.getContext("2d")!;
  c.lineCap = "butt";
  c.lineJoin = "miter";
  c.fillStyle = "#000";
  c.fillRect(0, 0, 576, 288);
  const ink = (level = 255) => `rgb(0,${level},0)`;
  function text(
    value: string,
    x: number,
    y: number,
    size = 22,
    level = 255,
    weight = 500,
    max = 528,
  ) {
    c.font = `${weight} ${size}px Arial, sans-serif`;
    c.fillStyle = ink(level);
    c.textBaseline = "alphabetic";
    let shown = value;
    while (c.measureText(shown).width > max && shown.length > 0)
      shown = shown.slice(0, -1);
    if (shown !== value) {
      while (c.measureText(shown + "…").width > max && shown.length > 0)
        shown = shown.slice(0, -1);
      shown += "…";
    }
    c.fillText(shown, x, y);
  }
  function wrap(
    value: string,
    x: number,
    y: number,
    size = 23,
    max = 236,
    lines = 3,
    level = 255,
  ) {
    const words = value.split(/\s+/);
    for (let row = 0; row < lines && words.length; row++) {
      if (row === lines - 1) {
        text(words.join(" "), x, y + row * (size + 7), size, level, 500, max);
        break;
      }
      c.font = `500 ${size}px Arial, sans-serif`;
      let line = words.shift()!;
      while (words.length && c.measureText(`${line} ${words[0]}`).width <= max)
        line += ` ${words.shift()}`;
      text(line, x, y + row * (size + 7), size, level, 500, max);
    }
  }

  function circle(x: number, y: number, r: number, level = 255, fill = false) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.strokeStyle = ink(level);
    c.lineWidth = 2;
    c.stroke();
    if (fill) {
      c.fillStyle = ink(level);
      c.fill();
    }
  }
  function tick(x: number, y: number, level = 170) {
    c.strokeStyle = ink(level);
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(x - 5, y);
    c.lineTo(x - 1, y + 4);
    c.lineTo(x + 6, y - 5);
    c.stroke();
  }
  function stop(stop: HudStop, i: number) {
    const y = 83 + i * 44;
    const level =
      stop.state === "passed"
        ? 145
        : stop.state === "future" || stop.state === "unknown"
          ? 185
          : 255;
    if (i < scene.stops.length - 1) {
      c.strokeStyle = ink(85);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(30, y + 11);
      c.lineTo(30, y + 33);
      c.stroke();
    }
    circle(30, y, 10, level, stop.state === "next" || stop.state === "current");
    if (stop.state === "passed") tick(30, y, level);
    if (stop.state === "destination") circle(30, y, 4, 255, true);
    if (stop.state === "next" || stop.state === "current") {
      c.fillStyle = "#000";
      c.beginPath();
      c.arc(30, y, 4, 0, Math.PI * 2);
      c.fill();
    }
    text(
      stop.name,
      52,
      y + 7,
      21,
      level,
      stop.state === "next" ||
        stop.state === "current" ||
        stop.state === "destination"
        ? 600
        : 400,
      222,
    );
  }
  const showDirection = scene.direction && scene.kind !== "route";
  text(
    scene.line,
    20,
    31,
    21,
    255,
    700,
    showDirection ? 200 : scene.rehearsal ? 365 : 500,
  );
  if (showDirection) {
    const x = 36 + Math.min(c.measureText(scene.line).width, 200);
    text(
      scene.direction,
      x,
      31,
      18,
      190,
      400,
      (scene.rehearsal ? 418 : 556) - x,
    );
  }
  if (scene.rehearsal) text("REHEARSAL", 435, 30, 16, 180, 600, 125);
  c.fillStyle = ink(75);
  c.fillRect(20, 45, 536, 1);
  if (scene.map?.overview) {
    drawMap(c, scene.map, 20, 56, 536, 191);
    text(scene.footer, 20, 274, 16, 180, 400, 536);
  } else if (scene.kind === "walk" && scene.map) {
    drawMap(c, scene.map, 20, 56, 274, 191);
    wrap(scene.title, 314, 90, 25, 242, 3);
    text(scene.detail.split(" · ")[0], 314, 215, 38, 255, 600, 242);
    text(scene.footer, 20, 274, 16, 180, 400, 536);
  } else if (scene.kind === "wait") {
    text("BOARD AT", 20, 78, 16, 180, 600);
    wrap(scene.detail, 20, 111, 28, scene.stopLetter ? 432 : 532, 2);
    if (scene.stopLetter) {
      circle(514, 110, 31);
      c.textAlign = "center";
      text(scene.stopLetter, 514, 121, 30, 255, 700, 47);
      c.textAlign = "left";
    }
    c.fillStyle = ink(65);
    c.fillRect(20, 165, 536, 1);
    if (scene.departure) {
      text(scene.departure.time, 20, 218, 44, 255, 600, 180);
      wrap(scene.departure.destination, 210, 194, 22, 346, 2);
      text(
        `${scene.status}${scene.departure.platform ? ` · ${scene.departure.platform}` : ""}`,
        210,
        245,
        16,
        180,
        400,
        346,
      );
    } else {
      text(scene.status, 20, 207, 24, 190, 500, 532);
    }
    text(scene.footer, 20, 274, 17, 210, 500, 536);
  } else if (scene.kind === "detail") {
    text(scene.status, 20, 79, 17, 180, 600, 536);
    wrap(scene.title, 20, 122, 31, 536, 3);
    text(scene.detail, 20, 235, 20, 180, 400, 536);
    text(scene.footer, 20, 274, 16, 180, 500, 536);
  } else if (
    scene.stops.length &&
    ["ride", "stop", "requested", "alight", "uncertain"].includes(scene.kind)
  ) {
    scene.stops.forEach(stop);
    c.fillStyle = ink(60);
    c.fillRect(289, 64, 1, 169);
    if (scene.kind === "stop") {
      text("PRESS STOP", 310, 90, 29, 255, 700, 248);
      text("NOW", 310, 132, 40, 255, 700, 245);
      wrap(scene.destination, 310, 170, 22, 244, 2);
    } else if (scene.kind === "requested") {
      text("STOP PRESSED", 310, 88, 25, 255, 700, 244);
      text("Your stop is next", 310, 125, 21, 190, 500, 244);
      wrap(scene.destination, 310, 171, 24, 244, 2);
    } else if (scene.kind === "alight") {
      text("GET OFF", 310, 93, 32, 255, 700, 244);
      text("AT THIS STOP", 310, 125, 20, 255, 500, 244);
      wrap(scene.destination, 310, 167, 22, 244, 2);
    } else if (scene.kind === "uncertain") {
      text(
        scene.title === "Finding your location" ? "FINDING" : "LOCATION",
        310,
        89,
        22,
        255,
        700,
        244,
      );
      text(
        scene.title === "Finding your location" ? "LOCATION" : "UNCERTAIN",
        310,
        119,
        22,
        255,
        700,
        244,
      );
      text("Get off at", 310, 159, 17, 175, 400, 244);
      wrap(scene.destination, 310, 191, 22, 244, 2);
    } else {
      text(String(scene.remaining ?? "–"), 309, 119, 60, 255, 600, 100);
      text(
        scene.remaining === 1 ? "STOP LEFT" : "STOPS LEFT",
        310,
        145,
        17,
        180,
        600,
        244,
      );
      text("Get off at", 310, 176, 17, 170, 400, 244);
      wrap(scene.destination, 310, 207, 22, 244, 2);
    }
    if (scene.nextLeg && !scene.browsing)
      text(scene.nextLeg, 310, 251, 15, 160, 400, 244);
    text(
      scene.browsing ? "Browsing" : scene.footer,
      20,
      274,
      15,
      170,
      500,
      430,
    );
    if (scene.browsing) text(scene.page, 480, 274, 15, 150, 400, 78);
  } else if (scene.kind === "route") {
    text(scene.title, 20, 115, 60, 255, 600, 270);
    wrap(scene.direction, 310, 91, 25, 240, 2);
    text(scene.status, 310, 143, 18, 180, 400, 244);
    text(scene.detail, 310, 173, 21, 190, 400, 244);
    wrap(scene.destination, 20, 204, 24, 532, 2);
    text(scene.footer, 20, 274, 17, 190, 500, 536);
  } else if (scene.kind === "walk") {
    const left = scene.title.toLowerCase().includes("left"),
      right = scene.title.toLowerCase().includes("right");
    c.strokeStyle = ink();
    c.lineWidth = 5;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    if (left || right) {
      const tip = left ? 34 : 104,
        tail = left ? 84 : 54,
        head = left ? 50 : 88;
      c.moveTo(tail, 159);
      c.lineTo(tail, 96);
      c.lineTo(tip, 96);
      c.moveTo(head, 80);
      c.lineTo(tip, 96);
      c.lineTo(head, 112);
    } else {
      c.moveTo(69, 159);
      c.lineTo(69, 79);
      c.moveTo(49, 101);
      c.lineTo(69, 79);
      c.lineTo(89, 101);
    }
    c.stroke();
    const street = scene.title.replace(/^Turn (left|right) (onto|into) /i, "");
    wrap(street, 133, 101, 30, 422, 3);
    text(scene.detail.split(" · ")[0], 133, 211, 36, 255, 600, 422);
    if (!scene.title.toLowerCase().includes(scene.destination.toLowerCase()))
      text(scene.destination, 20, 244, 19, 180, 400, 536);
    text(scene.footer, 20, 274, 17, 170, 400, 536);
  } else if (scene.kind === "arrived") {
    circle(56, 109, 27, 255);
    tick(56, 109, 255);
    text("You have arrived", 102, 119, 34, 255, 600, 452);
    wrap(scene.destination, 20, 185, 26, 532, 2);
    text(scene.footer, 20, 274, 17, 190, 500, 536);
  } else {
    wrap(scene.title, 20, 100, 32, 532, 3);
    wrap(scene.detail, 20, 209, 22, 532, 2, 190);
    text(scene.footer, 20, 274, 17, 170, 400, 536);
  }
  if (!scene.footer && !scene.browsing && scene.journeyModes.length > 1) {
    const first =
      scene.journeyModes.length <= 4 ? 0 : Math.max(0, scene.journeyIndex - 1);
    let x = 20;
    for (
      let i = first;
      i < Math.min(first + 4, scene.journeyModes.length);
      i++
    ) {
      const label = scene.journeyModes[i];
      c.font = "600 14px Arial, sans-serif";
      const width = Math.min(110, c.measureText(label).width + 24);
      const active = i === scene.journeyIndex;
      if (active) {
        c.strokeStyle = ink(155);
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(x, 257, width, 25, 12);
        c.stroke();
      }
      text(
        label,
        x + 12,
        274,
        14,
        active ? 255 : i < scene.journeyIndex ? 110 : 160,
        active ? 600 : 400,
        width - 24,
      );
      if (i + 1 < scene.journeyModes.length)
        text("›", x + width + 6, 274, 16, 100, 400, 12);
      x += width + 24;
    }
  }
  return canvas;
}
export function hudTiles(scene: HudScene): Uint8Array[] {
  const canvas = drawHud(document.createElement("canvas"), scene);
  const c = canvas.getContext("2d")!;
  return [
    [0, 0],
    [288, 0],
    [0, 144],
    [288, 144],
  ].map(([x, y]) => {
    const pixels = c.getImageData(x, y, 288, 144).data;
    const gray = new Uint8Array(288 * 144);
    for (let i = 0; i < gray.length; i++) gray[i] = pixels[i * 4 + 1];
    return gray;
  });
}
