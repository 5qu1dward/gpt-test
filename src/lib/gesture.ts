import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { GestureName, HandMetrics, SwordState } from "../types";

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_TIP = 20;

function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function average(points: NormalizedLandmark[]) {
  const total = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
      z: sum.z + (point.z ?? 0),
    }),
    { x: 0, y: 0, z: 0 },
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: total.z / points.length,
  };
}

export function getHandMetrics(landmarks: NormalizedLandmark[]): HandMetrics | null {
  if (landmarks.length < 21) return null;

  const wrist = landmarks[WRIST];
  const center = average([wrist, landmarks[INDEX_MCP], landmarks[PINKY_MCP]]);
  const palmScale = Math.max(distance(wrist, landmarks[INDEX_MCP]), distance(wrist, landmarks[PINKY_MCP]));
  const averageZ = landmarks.reduce((sum, point) => sum + (point.z ?? 0), 0) / landmarks.length;
  const indexTip = landmarks[INDEX_TIP];

  return {
    center,
    indexTip: { x: indexTip.x, y: indexTip.y, z: indexTip.z ?? 0 },
    averageZ,
    palmScale,
  };
}

export function detectGesture(landmarks: NormalizedLandmark[]): GestureName {
  if (landmarks.length < 21) return "Idle";

  const wrist = landmarks[WRIST];
  const thumbTip = landmarks[THUMB_TIP];
  const indexTip = landmarks[INDEX_TIP];
  const fingerTips = [
    landmarks[INDEX_TIP],
    landmarks[MIDDLE_TIP],
    landmarks[RING_TIP],
    landmarks[PINKY_TIP],
  ];

  if (distance(thumbTip, indexTip) < 0.055) {
    return "Pinch";
  }

  const extendedCount = fingerTips.filter((tip) => distance(tip, wrist) > 0.25).length;
  const foldedCount = fingerTips.filter((tip) => distance(tip, wrist) < 0.18).length;

  if (foldedCount >= 3) {
    return "Fist";
  }

  if (extendedCount >= 3) {
    return "OpenPalm";
  }

  return "Idle";
}

export function detectPush(
  baseGesture: GestureName,
  metrics: HandMetrics,
  previousMetrics: HandMetrics | null,
  threshold: number = 0.18,
): number {
  if (baseGesture !== "OpenPalm" || !previousMetrics) return 0;

  const scaleGrowth = metrics.palmScale - previousMetrics.palmScale;
  const zForward = previousMetrics.averageZ - metrics.averageZ;
  const centerSpeed = Math.hypot(
    metrics.center.x - previousMetrics.center.x,
    metrics.center.y - previousMetrics.center.y,
  );

  const speedOk = centerSpeed > 0.012;
  const scaleOk = scaleGrowth > 0.008;
  const forwardOk = zForward > 0.006;

  const pushScore = scaleGrowth * 8 + zForward * 12 + centerSpeed * 3 + (forwardOk ? 0.15 : 0);

  if (speedOk && (scaleOk || forwardOk)) {
    return pushScore > threshold ? Math.min(pushScore, 1) : 0;
  }

  return 0;
}

export function gestureToSwordState(gesture: GestureName): SwordState {
  if (gesture === "OpenPalm") return "array";
  if (gesture === "Pinch") return "gather";
  if (gesture === "Fist") return "charge";
  if (gesture === "Push") return "shoot";
  return "idle";
}
