import { useEffect, useRef, useState } from "react";
import { ParticleScene } from "./components/ParticleScene";
import { initCamera } from "./lib/camera";
import { detectGesture, gestureToSwordState, getHandMetrics } from "./lib/gesture";
import { createHandLandmarker } from "./lib/handLandmarker";
import type { EffectMode, GestureName, HandMetrics, HandState } from "./types";

const initialHandState: HandState = {
  gesture: "Idle",
  swordState: "idle",
  landmarks: null,
  indexTip: null,
  handCenter: null,
  averageZ: 0,
  palmScale: 0,
  pushIntensity: 0,
};

const DETECTION_INTERVAL_MS = 33;

const gestureText: Record<GestureName, string> = {
  Idle: "Idle",
  OpenPalm: "OpenPalm 剑阵展开",
  Pinch: "Pinch 万剑归一",
  Fist: "Fist 蓄力悬停",
  Push: "Push 飞剑齐射",
};

const effectText: Record<EffectMode, string> = {
  nebula: "星云粒子",
  sword: "万剑归宗",
};

const titleText: Record<EffectMode, string> = {
  nebula: "星云粒子 Nebula",
  sword: "万剑归宗 Sword Array",
};

function errorToMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error instanceof Event) return "浏览器资源加载失败，请检查模型文件或网络。";
  return String(error);
}

function detectPush(baseGesture: GestureName, metrics: HandMetrics, previousMetrics: HandMetrics | null) {
  if (baseGesture !== "OpenPalm" || !previousMetrics) return 0;

  const scaleGrowth = metrics.palmScale - previousMetrics.palmScale;
  const zForward = previousMetrics.averageZ - metrics.averageZ;
  const centerSpeed = Math.hypot(metrics.center.x - previousMetrics.center.x, metrics.center.y - previousMetrics.center.y);
  const pushScore = scaleGrowth * 7 + zForward * 10 + centerSpeed * 2.5;

  return pushScore > 0.16 ? Math.min(pushScore, 1) : 0;
}

interface SwordAppProps {
  effectMode: "nebula" | "sword";
  onBack: () => void;
}

export function SwordApp({ effectMode, onBack }: SwordAppProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handStateRef = useRef<HandState>(initialHandState);
  const previousMetricsRef = useRef<HandMetrics | null>(null);
  const pushUntilRef = useRef(0);
  const [handState, setHandState] = useState<HandState>(initialHandState);
  const [localEffectMode, setLocalEffectMode] = useState<EffectMode>(effectMode);
  const [status, setStatus] = useState("正在初始化摄像头和手势识别模型...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frameId = 0;
    let cancelled = false;
    let lastDetection = 0;
    let lastUiUpdate = 0;
    let lastGesture: GestureName = initialHandState.gesture;

    const publishHandState = (nextHandState: HandState) => {
      handStateRef.current = nextHandState;

      const now = performance.now();
      if (nextHandState.gesture !== lastGesture || now - lastUiUpdate > 120) {
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

        setStatus("摄像头已启动。可切换星云粒子或万剑归宗效果。");

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
              const metrics = getHandMetrics(landmarks);
              const baseGesture = detectGesture(landmarks);

              if (metrics) {
                const pushIntensity = detectPush(baseGesture, metrics, previousMetricsRef.current);
                if (pushIntensity > 0) {
                  pushUntilRef.current = now + 720;
                }

                const gesture: GestureName = now < pushUntilRef.current ? "Push" : baseGesture;
                previousMetricsRef.current = metrics;

                publishHandState({
                  gesture,
                  swordState: gestureToSwordState(gesture),
                  landmarks,
                  indexTip: metrics.indexTip,
                  handCenter: metrics.center,
                  averageZ: metrics.averageZ,
                  palmScale: metrics.palmScale,
                  pushIntensity: gesture === "Push" ? Math.max(pushIntensity, 0.75) : 0,
                });
              }
            } else {
              previousMetricsRef.current = null;
              pushUntilRef.current = 0;
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
        <div className="back-btn-wrapper">
          <button className="back-btn" onClick={onBack} type="button">
            ← 返回主页
          </button>
        </div>
        <h1>{titleText[effectMode]}</h1>
        <div className="top-actions">
          <div className="effect-switch" aria-label="切换视觉效果">
            {(["nebula", "sword"] as EffectMode[]).map((mode) => (
              <button
                key={mode}
                className={effectMode === mode ? "active" : ""}
                type="button"
                onClick={() => setLocalEffectMode(mode)}
              >
                {effectText[mode]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="stage" aria-label="手势特效控制器">
        <video ref={videoRef} className="camera-feed" playsInline muted />
        <ParticleScene handStateRef={handStateRef} effectMode={localEffectMode} />

        <div className="gesture-badge">
          <span>Gesture</span>
          <strong>{gestureText[handState.gesture]}</strong>
        </div>

        <div className="status-panel">
          <span>{status}</span>
          {error && <strong>{error}</strong>}
        </div>
      </section>

      <footer className="gesture-help">
        <span>张开手掌：展开剑阵 / 粒子扩散</span>
        <span>捏合手指：万剑归一 / 粒子聚集</span>
        <span>握拳：蓄力悬停</span>
        <span>向前推掌：飞剑齐射</span>
        <span>移动食指：控制方向</span>
      </footer>
    </main>
  );
}
