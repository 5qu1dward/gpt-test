import { useEffect, useRef, useState } from "react";
import { ParticleScene } from "./components/ParticleScene";
import { initCamera } from "./lib/camera";
import { detectGesture } from "./lib/gesture";
import { createHandLandmarker } from "./lib/handLandmarker";
import type { HandState } from "./types";

const initialHandState: HandState = {
  gesture: "Idle",
  landmarks: null,
  indexTip: null,
};

const DETECTION_INTERVAL_MS = 33;

const gestureText: Record<HandState["gesture"], string> = {
  Idle: "待机",
  "Open Palm": "张开手掌",
  Pinch: "捏合",
  Fist: "握拳",
};

function errorToMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error instanceof Event) return "浏览器资源加载失败，请检查模型文件或网络。";
  return String(error);
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handStateRef = useRef<HandState>(initialHandState);
  const [handState, setHandState] = useState<HandState>(initialHandState);
  const [status, setStatus] = useState("正在初始化摄像头和手势识别模型...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frameId = 0;
    let cancelled = false;
    let lastDetection = 0;
    let lastUiUpdate = 0;
    let lastGesture: HandState["gesture"] = initialHandState.gesture;

    const publishHandState = (nextHandState: HandState) => {
      handStateRef.current = nextHandState;

      const now = performance.now();
      if (nextHandState.gesture !== lastGesture || now - lastUiUpdate > 160) {
        lastGesture = nextHandState.gesture;
        lastUiUpdate = now;
        setHandState(nextHandState);
      }
    };

    const start = async () => {
      const video = videoRef.current;
      if (!video) return;

      try {
        stream = await initCamera(video);
        const handLandmarker = await createHandLandmarker();

        setStatus("摄像头已启动。请移动手部控制粒子，摄像头画面不会作为背景显示。");

        const detect = () => {
          if (cancelled) return;

          if (video.videoWidth > 0 && video.videoHeight > 0) {
            const now = performance.now();

            if (now - lastDetection < DETECTION_INTERVAL_MS) {
              frameId = requestAnimationFrame(detect);
              return;
            }

            lastDetection = now;
            const result = handLandmarker.detectForVideo(video, now);
            const landmarks = result.landmarks[0] ?? null;

            if (landmarks) {
              const gesture = detectGesture(landmarks);
              const indexTip = landmarks[8];
              const previousTip = handStateRef.current.indexTip;
              const smoothedTip = previousTip
                ? {
                    x: previousTip.x + (indexTip.x - previousTip.x) * 0.42,
                    y: previousTip.y + (indexTip.y - previousTip.y) * 0.42,
                  }
                : { x: indexTip.x, y: indexTip.y };

              publishHandState({
                gesture,
                landmarks,
                indexTip: smoothedTip,
              });
            } else {
              publishHandState(initialHandState);
            }
          }

          frameId = requestAnimationFrame(detect);
        };

        detect();
      } catch (err) {
        setError(errorToMessage(err));
        setStatus("启动失败。请检查摄像头权限、localhost 环境，以及模型文件是否可访问。");
      }
    };

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <main className="app-shell">
      <header className="top-bar">
        <h1>手势粒子控制器</h1>
        <div className="gesture-pill">{gestureText[handState.gesture]}</div>
      </header>

      <section className="stage" aria-label="手势粒子控制器">
        <video ref={videoRef} className="camera-feed" playsInline muted />
        <canvas ref={canvasRef} className="hand-overlay" />
        <ParticleScene handStateRef={handStateRef} />

        <div className="status-panel">
          <span>{status}</span>
          {error && <strong>{error}</strong>}
        </div>
      </section>

      <footer className="gesture-help">
        <span>张开手掌：粒子扩散</span>
        <span>捏合手指：粒子聚集</span>
        <span>握拳：粒子暂停</span>
        <span>移动食指：控制位置</span>
      </footer>
    </main>
  );
}
