export type Point = { lat: number; lon: number };
export type Fix = Point & {
  accuracy: number;
  timestamp: number;
  speed?: number;
};
export type Stop = Point & { id: string; name: string; letter: string };
export type Step = Point & { instruction: string; distance: number };
export type Leg = {
  mode: string;
  summary: string;
  direction: string;
  line: string;
  lineId: string;
  from: Stop;
  to: Stop;
  duration: number;
  distance: number;
  departure: string;
  arrival: string;
  path: Point[];
  steps: Step[];
  stops: Stop[];
  stopTracking: boolean;
  disruption: string;
};
export type Route = {
  id: string;
  duration: number;
  departure: string;
  arrival: string;
  legs: Leg[];
  fetchedAt: number;
  rehearsal: boolean;
};
export type Journey = {
  route: Route;
  legIndex: number;
  phase: "walking" | "waiting" | "riding" | "alighting" | "arrived";
  progress: number;
  lastFix: Fix | null;
  quality: "locating" | "good" | "uncertain";
  stopAlert: boolean;
  acknowledged: boolean;
  motion?: {
    kind: "boarding" | "alighting";
    since: number;
    origin: number;
    samples: number;
  };
  autoBoardedAt?: number;
  autoAlightedAt?: number;
  autoBoardingDisabled?: boolean;
  autoAlightingDisabled?: boolean;
};
export type Instruction = {
  title: string;
  detail: string;
  context: string;
  urgent: boolean;
};
export type Arrival = {
  id: string;
  line: string;
  lineId: string;
  destination: string;
  expected: number;
  timestamp: number;
  vehicleId: string;
  platform: string;
};
