import { useEffect, useRef, useState } from "react";
import { MouseParticleUniverse } from "./components/MouseParticleUniverse";
import { ParticleScene } from "./components/ParticleScene";
import { ParticleTextMode } from "./components/ParticleTextMode";
import { initCamera } from "./lib/camera";
import { detectGesture, gestureToSwordState, getHandMetrics } from "./lib/gesture";
import { createHandLandmarker } from "./lib/handLandmarker";
import type { AppMode, EffectMode, GestureName, HandMetrics, HandState } from "./types";

const initialHandState: HandState = {
  gesture: "Idle",
  swordState: "idle",
  landmarks: null,
  hands: [],
  indexTip: null,
  handCenter: null,
  averageZ: 0,
  palmScale: 0,
  pushIntensity: 0,
};

const DETECTION_INTERVAL_MS = 33;

const gestureText: Record<GestureName, string> = {
  Idle: "Idle",
  OpenPalm: "OpenPalm 张开手掌",
  Pinch: "Pinch 捏合",
  Fist: "Fist 握拳",
  Push: "Push 向前推手",
};

const modeText: Record<AppMode, string> = {
  nebula: "原有粒子",
  sword: "原有剑阵",
  particleText: "粒子文字",
  mouseUniverse: "鼠标粒子宇宙",
};

const modeTitle: Record<AppMode, string> = {
  nebula: "星云粒子 Nebula",
  sword: "万剑归宗 Sword Array",
  particleText: "Particle Text 粒子文字",
  mouseUniverse: "Mouse Particle Universe 鼠标粒子宇宙",
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
  effectMode: AppMode;
  onBack: () => void;
}

export function SwordApp({ effectMode, onBack }: SwordAppProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handStateRef = useRef<HandState>(initialHandState);
  const previousMetricsRef = useRef<HandMetrics | null>(null);
  const pushUntilRef = useRef(0);
  const [handState, setHandState] = useState<HandState>(initialHandState);
  const [activeMode, setActiveMode] = useState<AppMode>(effectMode);
  const [status, setStatus] = useState("正在初始化摄像头和手势识别模型...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveMode(effectMode);
  }, [effectMode]);

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

        setStatus("摄像头已启动。可切换原有粒子、剑阵、粒子文字或鼠标粒子宇宙模式。");

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
              const hands = result.landmarks
                .map((handLandmarks) => getHandMetrics(handLandmarks))
                .filter((handMetrics): handMetrics is HandMetrics => Boolean(handMetrics));
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
                  hands,
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
            返回主页
          </button>
        </div>
        <h1>{modeTitle[activeMode]}</h1>
        <div className="top-actions">
          <div className="effect-switch mode-switch" aria-label="切换视觉模式">
            {(["nebula", "sword", "particleText", "mouseUniverse"] as AppMode[]).map((mode) => (
              <button
                key={mode}
                className={activeMode === mode ? "active" : ""}
                type="button"
                onClick={() => setActiveMode(mode)}
              >
                {modeText[mode]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="stage" aria-label="手势特效控制器">
        <video ref={videoRef} className="camera-feed" playsInline muted />
        {activeMode === "particleText" ? (
          <ParticleTextMode handStateRef={handStateRef} />
        ) : activeMode === "mouseUniverse" ? (
          <MouseParticleUniverse />
        ) : (
          <ParticleScene handStateRef={handStateRef} effectMode={activeMode} />
        )}

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
        {activeMode === "mouseUniverse" ? (
          <>
            <span>移动鼠标：吸附粒子</span>
            <span>点击：冲击波</span>
            <span>长按：黑洞吸附</span>
            <span>拖动：生成星云轨迹</span>
            <span>双击：清屏重生</span>
          </>
        ) : activeMode === "particleText" ? (
          <>
            <span>输入文字或点预设：生成粒子文字</span>
            <span>张开手掌：文字爆炸扩散</span>
            <span>握拳：重新聚合文字</span>
            <span>左右挥手：切换预设</span>
            <span>向前推手：能量流冲击</span>
          </>
        ) : (
          <>
            <span>张开手掌：展开剑阵 / 粒子扩散</span>
            <span>捏合手指：万剑归一 / 粒子聚合</span>
            <span>握拳：蓄力悬停</span>
            <span>向前推掌：飞剑齐射</span>
            <span>移动食指：控制方向</span>
          </>
        )}
      </footer>
    </main>
  );
}
