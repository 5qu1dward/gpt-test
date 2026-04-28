import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const WASM_BASE = "/mediapipe/wasm";

const MODEL_URLS = [
  "/models/hand_landmarker.task",
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
];

function toMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error instanceof Event) {
    const target = error.target as { src?: string; href?: string } | null;
    return `Resource load event failed${target?.src ? `: ${target.src}` : ""}`;
  }
  return String(error);
}

async function modelExists(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return false;

    const header = new Uint8Array(await response.arrayBuffer()).slice(0, 16);
    return header.some((byte, index) => byte === 0x50 && header[index + 1] === 0x4b);
  } catch {
    return false;
  }
}

export async function createHandLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  const errors: string[] = [];

  for (const modelUrl of MODEL_URLS) {
    const isLocalModel = modelUrl.startsWith("/");

    if (isLocalModel && !(await modelExists(modelUrl))) {
      errors.push(`${modelUrl} not found or invalid`);
      continue;
    }

    for (const delegate of ["GPU", "CPU"] as const) {
      try {
        return await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
            delegate,
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
      } catch (error) {
        errors.push(`${delegate} ${modelUrl}: ${toMessage(error)}`);
      }
    }
  }

  throw new Error(
    [
      "MediaPipe HandLandmarker failed to load.",
      "Most likely the hand_landmarker.task model cannot be downloaded.",
      "Fix: download hand_landmarker.task and put it in public/models/hand_landmarker.task, then restart npm run dev.",
      `Details: ${errors.join(" | ")}`,
    ].join(" "),
  );
}
