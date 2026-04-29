import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type GestureName = "Idle" | "OpenPalm" | "Pinch" | "Fist" | "Push";

export type SwordState = "idle" | "array" | "gather" | "charge" | "shoot";

export type EffectMode = "nebula" | "sword";

export type AppMode = EffectMode | "particleText" | "mouseUniverse";

export type HandPoint = {
  x: number;
  y: number;
  z?: number;
};

export type HandMetrics = {
  center: HandPoint;
  indexTip: HandPoint;
  averageZ: number;
  palmScale: number;
};

export type HandState = {
  gesture: GestureName;
  swordState: SwordState;
  landmarks: NormalizedLandmark[] | null;
  hands: HandMetrics[];
  indexTip: HandPoint | null;
  handCenter: HandPoint | null;
  averageZ: number;
  palmScale: number;
  pushIntensity: number;
};
