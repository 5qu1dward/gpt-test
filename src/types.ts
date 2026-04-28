import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type GestureName = "Idle" | "Open Palm" | "Pinch" | "Fist";

export type HandState = {
  gesture: GestureName;
  landmarks: NormalizedLandmark[] | null;
  indexTip: { x: number; y: number } | null;
};
