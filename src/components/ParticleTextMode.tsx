import { useCallback, useEffect, useRef, useState } from "react";
import type { HandState } from "../types";

type ParticleTextModeProps = {
  handStateRef: { current: HandState };
};

type TextState = "idle" | "formingText" | "exploded" | "reforming" | "streaming";

type TextParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  originX: number;
  originY: number;
  size: number;
  phase: number;
  hue: number;
  alpha: number;
  stream: number;
};

const PRESETS = ["AI", "Sword", "Hello", "Squidward", "万剑归宗"];
const MIN_PARTICLES = 900;
const MAX_PARTICLES = 1800;
const GESTURE_COOLDOWN_MS = 950;

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function sampleTextPoints(text: string, width: number, height: number) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const fontSize = Math.min(width / Math.max(text.length * 0.72, 2.4), height * 0.36, 156);
  ctx.font = `800 ${fontSize}px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif`;
  ctx.fillText(text, width / 2, height / 2);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const points: Array<{ x: number; y: number }> = [];
  const density = width < 720 ? 8 : 7;

  for (let y = 0; y < canvas.height; y += density) {
    for (let x = 0; x < canvas.width; x += density) {
      const alpha = image.data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 90) {
        points.push({ x: x / scale, y: y / scale });
      }
    }
  }

  return points;
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  return { width: rect.width, height: rect.height, ratio };
}

export function ParticleTextMode({ handStateRef }: ParticleTextModeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<TextParticle[]>([]);
  const textRef = useRef(PRESETS[0]);
  const stateRef = useRef<TextState>("formingText");
  const lastGestureAtRef = useRef(0);
  const lastSwipeAtRef = useRef(0);
  const previousHandXRef = useRef<number | null>(null);
  const [text, setText] = useState(PRESETS[0]);

  const formText = useCallback((nextText: string, nextState: TextState = "formingText") => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const points = sampleTextPoints(nextText || "AI", rect.width, rect.height);
    const particleCount = Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, points.length));
    const particles = particlesRef.current;

    while (particles.length < particleCount) {
      particles.push({
        x: randomRange(0, rect.width),
        y: randomRange(0, rect.height),
        vx: 0,
        vy: 0,
        targetX: rect.width / 2,
        targetY: rect.height / 2,
        originX: rect.width / 2,
        originY: rect.height / 2,
        size: randomRange(1.1, 2.7),
        phase: randomRange(0, Math.PI * 2),
        hue: randomRange(185, 285),
        alpha: randomRange(0.66, 1),
        stream: 0,
      });
    }

    particles.length = particleCount;

    for (let i = 0; i < particles.length; i += 1) {
      const point = points.length ? points[i % points.length] : { x: rect.width / 2, y: rect.height / 2 };
      const particle = particles[i];
      particle.targetX = point.x + randomRange(-1.8, 1.8);
      particle.targetY = point.y + randomRange(-1.8, 1.8);
      particle.originX = particle.targetX;
      particle.originY = particle.targetY;
      particle.stream = 0;
    }

    textRef.current = nextText;
    stateRef.current = nextState;
  }, []);

  const explode = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    particlesRef.current.forEach((particle) => {
      const dx = particle.x - centerX;
      const dy = particle.y - centerY;
      const length = Math.hypot(dx, dy) || 1;
      const force = randomRange(8, 20);
      particle.vx += (dx / length) * force;
      particle.vy += (dy / length) * force;
      particle.targetX = particle.x + (dx / length) * randomRange(90, 260);
      particle.targetY = particle.y + (dy / length) * randomRange(60, 190);
    });

    stateRef.current = "exploded";
  }, []);

  const streamOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    particlesRef.current.forEach((particle) => {
      const angle = Math.atan2(particle.y - centerY, particle.x - centerX) + randomRange(-0.34, 0.34);
      particle.stream = randomRange(0.7, 1.5);
      particle.targetX = centerX + Math.cos(angle) * randomRange(rect.width * 0.38, rect.width * 0.85);
      particle.targetY = centerY + Math.sin(angle) * randomRange(rect.height * 0.32, rect.height * 0.8);
      particle.vx += Math.cos(angle) * randomRange(10, 24);
      particle.vy += Math.sin(angle) * randomRange(10, 24);
    });

    stateRef.current = "streaming";
  }, []);

  useEffect(() => {
    formText(text);
  }, [formText, text]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let size = resizeCanvas(canvas);
    let animationId = 0;
    let lastTime = performance.now();

    const handleResize = () => {
      size = resizeCanvas(canvas);
      formText(textRef.current, "reforming");
    };

    window.addEventListener("resize", handleResize);
    formText(textRef.current);

    const animate = (now: number) => {
      animationId = requestAnimationFrame(animate);
      const delta = Math.min((now - lastTime) / 16.67, 2);
      lastTime = now;
      const hand = handStateRef.current;

      if (hand.gesture === "OpenPalm" && now - lastGestureAtRef.current > GESTURE_COOLDOWN_MS) {
        lastGestureAtRef.current = now;
        explode();
      } else if (hand.gesture === "Fist" && now - lastGestureAtRef.current > GESTURE_COOLDOWN_MS) {
        lastGestureAtRef.current = now;
        formText(textRef.current, "reforming");
      } else if (hand.gesture === "Push" && now - lastGestureAtRef.current > GESTURE_COOLDOWN_MS) {
        lastGestureAtRef.current = now;
        streamOut();
      }

      if (hand.handCenter) {
        const previousX = previousHandXRef.current;
        if (previousX !== null && Math.abs(hand.handCenter.x - previousX) > 0.16 && now - lastSwipeAtRef.current > GESTURE_COOLDOWN_MS) {
          lastSwipeAtRef.current = now;
          const currentIndex = PRESETS.indexOf(textRef.current);
          const direction = hand.handCenter.x > previousX ? 1 : -1;
          const next = PRESETS[(currentIndex + direction + PRESETS.length) % PRESETS.length];
          setText(next);
          formText(next, "formingText");
        }
        previousHandXRef.current = hand.handCenter.x;
      } else {
        previousHandXRef.current = null;
      }

      ctx.setTransform(size.ratio, 0, 0, size.ratio, 0, 0);
      ctx.clearRect(0, 0, size.width, size.height);
      ctx.fillStyle = "rgba(3, 6, 16, 0.2)";
      ctx.fillRect(0, 0, size.width, size.height);

      const state = stateRef.current;
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        const driftX = Math.sin(now * 0.0015 + particle.phase) * (state === "exploded" ? 18 : 4.5);
        const driftY = Math.cos(now * 0.0012 + particle.phase) * (state === "exploded" ? 14 : 3.5);
        const targetX = particle.targetX + driftX;
        const targetY = particle.targetY + driftY;
        const pull = state === "exploded" ? 0.012 : state === "streaming" ? 0.018 : 0.052;

        particle.vx += (targetX - particle.x) * pull * delta;
        particle.vy += (targetY - particle.y) * pull * delta;
        particle.vx *= Math.pow(state === "streaming" ? 0.91 : 0.86, delta);
        particle.vy *= Math.pow(state === "streaming" ? 0.91 : 0.86, delta);
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;

        if (state === "streaming") {
          particle.stream *= Math.pow(0.985, delta);
        }

        const pulse = 1 + Math.sin(now * 0.004 + particle.phase) * 0.24 + particle.stream * 0.9;
        const radius = particle.size * pulse;
        const alpha = Math.min(1, particle.alpha + particle.stream * 0.24);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${particle.hue}, 92%, ${62 + particle.stream * 18}%, ${alpha})`;
        ctx.shadowColor = `hsla(${particle.hue}, 96%, 68%, ${0.35 + particle.stream * 0.25})`;
        ctx.shadowBlur = 12 + particle.stream * 18;
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, [explode, formText, handStateRef, streamOut]);

  const applyText = (nextText: string) => {
    setText(nextText);
    formText(nextText, "formingText");
  };

  return (
    <div className="particle-text-mode">
      <canvas ref={canvasRef} className="particle-text-canvas" />
      <div className="text-control-panel">
        <label htmlFor="particle-text-input">Particle Text</label>
        <div className="text-input-row">
          <input
            id="particle-text-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") formText(text, "formingText");
            }}
          />
          <button type="button" onClick={() => formText(text, "formingText")}>
            生成
          </button>
        </div>
        <div className="preset-row">
          {PRESETS.map((preset) => (
            <button key={preset} className={text === preset ? "active" : ""} type="button" onClick={() => applyText(preset)}>
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
