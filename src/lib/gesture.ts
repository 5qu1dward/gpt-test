import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { GestureName } from "../types";

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;
const WRIST = 0;

function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

export function detectGesture(landmarks: NormalizedLandmark[]): GestureName {
  if (landmarks.length < 21) {
    return "Idle";
  }

  const wrist = landmarks[WRIST];
  const thumbTip = landmarks[THUMB_TIP];
  const indexTip = landmarks[INDEX_TIP];
  const fingerTips = [
    landmarks[INDEX_TIP],
    landmarks[MIDDLE_TIP],
    landmarks[RING_TIP],
    landmarks[PINKY_TIP],
  ];

  // 拇指和食指指尖距离很近，判断为捏合。
  if (distance(thumbTip, indexTip) < 0.055) {
    return "Pinch";
  }

  // 使用 wrist 到各个指尖的归一化距离，做一个轻量的张开/握拳判断。
  const extendedCount = fingerTips.filter((tip) => distance(tip, wrist) > 0.27).length;
  const foldedCount = fingerTips.filter((tip) => distance(tip, wrist) < 0.2).length;

  if (extendedCount >= 3) {
    return "Open Palm";
  }

  if (foldedCount >= 3) {
    return "Fist";
  }

  return "Idle";
}
