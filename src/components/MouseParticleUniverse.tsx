import { useEffect, useRef } from "react";

type UniverseParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseSize: number;
  size: number;
  hue: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: "normal" | "trail";
  orbitOffset: number;
};

type Shockwave = {
  x: number;
  y: number;
  radius: number;
  strength: number;
  alpha: number;
};

type Flash = {
  alpha: number;
  radius: number;
};

const NORMAL_COUNT = 1050;
const MAX_TRAIL_PARTICLES = 420;
const LONG_PRESS_MS = 450;
const DOUBLE_CLICK_GUARD_MS = 260;

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  return { width: rect.width, height: rect.height, ratio };
}

function createNormalParticle(width: number, height: number): UniverseParticle {
  return {
    x: randomRange(0, width),
    y: randomRange(0, height),
    vx: randomRange(-0.35, 0.35),
    vy: randomRange(-0.35, 0.35),
    baseSize: randomRange(1, 2.6),
    size: randomRange(1, 2.6),
    hue: randomRange(182, 286),
    alpha: randomRange(0.48, 0.92),
    life: Infinity,
    maxLife: Infinity,
    type: "normal",
    orbitOffset: randomRange(0, Math.PI * 2),
  };
}

function createTrailParticle(x: number, y: number, speed: number): UniverseParticle {
  const life = randomRange(60, 180);
  return {
    x: x + randomRange(-8, 8),
    y: y + randomRange(-8, 8),
    vx: randomRange(-0.8, 0.8) + speed * randomRange(-0.012, 0.012),
    vy: randomRange(-0.8, 0.8) + speed * randomRange(-0.012, 0.012),
    baseSize: randomRange(1.2, 3.4),
    size: randomRange(1.2, 3.4),
    hue: randomRange(188, 292),
    alpha: randomRange(0.62, 0.95),
    life,
    maxLife: life,
    type: "trail",
    orbitOffset: randomRange(0, Math.PI * 2),
  };
}

export function MouseParticleUniverse() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let size = resizeCanvas(canvas);
    let particles: UniverseParticle[] = [];
    const shockwaves: Shockwave[] = [];
    let flash: Flash | null = null;
    let isRebirthing = false;
    let animationId = 0;
    let longPressTimer = 0;
    let lastPointerUp = 0;

    const mouse = {
      x: size.width / 2,
      y: size.height / 2,
      px: size.width / 2,
      py: size.height / 2,
      active: false,
      down: false,
      dragging: false,
      blackHole: false,
      longPressTriggered: false,
      downX: 0,
      downY: 0,
    };

    const seedUniverse = (fadeIn = false) => {
      particles = Array.from({ length: NORMAL_COUNT }, () => {
        const particle = createNormalParticle(size.width, size.height);
        if (fadeIn) particle.alpha = 0.04;
        return particle;
      });
    };

    const addShockwave = (x: number, y: number, strength = 1) => {
      shockwaves.push({ x, y, radius: 0, strength, alpha: 1 });
    };

    const addTrail = (x: number, y: number, speed: number) => {
      const amount = clamp(Math.round(speed / 18), 2, 9);
      for (let i = 0; i < amount; i += 1) {
        particles.push(createTrailParticle(x, y, speed));
      }

      let trailCount = particles.reduce((count, particle) => count + (particle.type === "trail" ? 1 : 0), 0);
      if (trailCount > MAX_TRAIL_PARTICLES) {
        particles = particles.filter((particle) => {
          if (particle.type === "normal") return true;
          if (trailCount <= MAX_TRAIL_PARTICLES) return true;
          trailCount -= 1;
          return false;
        });
      }
    };

    const rebirth = () => {
      if (isRebirthing) return;
      isRebirthing = true;
      flash = { alpha: 0.85, radius: 0 };
      const centerX = size.width / 2;
      const centerY = size.height / 2;

      particles.forEach((particle) => {
        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const length = Math.hypot(dx, dy) || 1;
        particle.vx += (dx / length) * randomRange(7, 18);
        particle.vy += (dy / length) * randomRange(7, 18);
        particle.life = Math.min(Number.isFinite(particle.life) ? particle.life : 38, 38);
        particle.maxLife = Math.min(Number.isFinite(particle.maxLife) ? particle.maxLife : 38, 38);
      });

      window.setTimeout(() => {
        seedUniverse(true);
        isRebirthing = false;
      }, 540);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;
      const speed = Math.hypot(nextX - mouse.x, nextY - mouse.y);

      mouse.px = mouse.x;
      mouse.py = mouse.y;
      mouse.x = nextX;
      mouse.y = nextY;
      mouse.active = true;

      if (mouse.down) {
        if (Math.hypot(mouse.x - mouse.downX, mouse.y - mouse.downY) > 4) {
          mouse.dragging = true;
        }
        addTrail(mouse.x, mouse.y, speed);
      }
    };

    const clearLongPressTimer = () => {
      if (longPressTimer) {
        window.clearTimeout(longPressTimer);
        longPressTimer = 0;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId);
      handlePointerMove(event);
      clearLongPressTimer();
      mouse.down = true;
      mouse.dragging = false;
      mouse.blackHole = false;
      mouse.longPressTriggered = false;
      mouse.downX = mouse.x;
      mouse.downY = mouse.y;

      longPressTimer = window.setTimeout(() => {
        mouse.blackHole = true;
        mouse.longPressTriggered = true;
      }, LONG_PRESS_MS);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      clearLongPressTimer();
      const wasLongPress = mouse.longPressTriggered || mouse.blackHole;
      mouse.down = false;
      mouse.blackHole = false;
      mouse.dragging = false;
      mouse.longPressTriggered = false;

      const now = performance.now();
      if (!wasLongPress && now - lastPointerUp > DOUBLE_CLICK_GUARD_MS) {
        addShockwave(mouse.x, mouse.y);
      }
      lastPointerUp = now;
    };

    const handlePointerLeave = () => {
      clearLongPressTimer();
      mouse.active = false;
      mouse.down = false;
      mouse.blackHole = false;
      mouse.dragging = false;
      mouse.longPressTriggered = false;
    };

    const handleDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      shockwaves.length = 0;
      rebirth();
    };

    const handleResize = () => {
      size = resizeCanvas(canvas);
      seedUniverse(true);
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("dblclick", handleDoubleClick);
    window.addEventListener("resize", handleResize);
    seedUniverse();

    const drawConnections = () => {
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        if (a.type !== "normal") continue;
        for (let j = i + 1; j < Math.min(i + 26, particles.length); j += 1) {
          const b = particles[j];
          if (b.type !== "normal") continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 82) {
            const alpha = (1 - distance / 82) * 0.13;
            ctx.strokeStyle = `rgba(116, 235, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      ctx.setTransform(size.ratio, 0, 0, size.ratio, 0, 0);
      ctx.clearRect(0, 0, size.width, size.height);
      ctx.fillStyle = "rgba(2, 4, 12, 0.28)";
      ctx.fillRect(0, 0, size.width, size.height);

      for (let s = shockwaves.length - 1; s >= 0; s -= 1) {
        const shockwave = shockwaves[s];
        shockwave.radius += 9.5;
        shockwave.alpha *= 0.955;
        if (shockwave.radius > 520 || shockwave.alpha < 0.025) {
          shockwaves.splice(s, 1);
          continue;
        }

        ctx.beginPath();
        ctx.strokeStyle = `rgba(125, 238, 255, ${shockwave.alpha * 0.7})`;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = `rgba(125, 238, 255, ${shockwave.alpha})`;
        ctx.shadowBlur = 24;
        ctx.arc(shockwave.x, shockwave.y, shockwave.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        let mouseBoost = 0;

        if (mouse.active) {
          const dx = mouse.x - particle.x;
          const dy = mouse.y - particle.y;
          const distance = Math.hypot(dx, dy) || 1;
          const range = mouse.blackHole ? 310 : 165;
          if (distance < range) {
            const force = (1 - distance / range) * (mouse.blackHole ? 0.42 : 0.055);
            const orbit = mouse.blackHole ? 0.22 : 0.038;
            particle.vx += (dx / distance) * force + (-dy / distance) * orbit;
            particle.vy += (dy / distance) * force + (dx / distance) * orbit;
            mouseBoost = 1 - distance / range;
          }
        }

        for (let s = 0; s < shockwaves.length; s += 1) {
          const shockwave = shockwaves[s];
          const dx = particle.x - shockwave.x;
          const dy = particle.y - shockwave.y;
          const distance = Math.hypot(dx, dy) || 1;
          const band = Math.abs(distance - shockwave.radius);
          if (band < 34) {
            const push = (1 - band / 34) * shockwave.strength * 1.35;
            particle.vx += (dx / distance) * push;
            particle.vy += (dy / distance) * push;
          }
        }

        particle.vx += Math.sin(performance.now() * 0.0007 + particle.orbitOffset) * 0.008;
        particle.vy += Math.cos(performance.now() * 0.0006 + particle.orbitOffset) * 0.008;
        particle.vx *= particle.type === "trail" ? 0.94 : 0.965;
        particle.vy *= particle.type === "trail" ? 0.94 : 0.965;
        particle.vx = clamp(particle.vx, -9, 9);
        particle.vy = clamp(particle.vy, -9, 9);
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.type === "normal") {
          if (particle.x < -20) particle.x = size.width + 20;
          if (particle.x > size.width + 20) particle.x = -20;
          if (particle.y < -20) particle.y = size.height + 20;
          if (particle.y > size.height + 20) particle.y = -20;
          particle.alpha = clamp(particle.alpha + 0.01, 0.42, 0.95);
        } else {
          particle.life -= 1;
          if (particle.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
        }

        const lifeAlpha = particle.type === "trail" ? particle.life / particle.maxLife : 1;
        const pulse = 1 + Math.sin(performance.now() * 0.004 + particle.orbitOffset) * 0.22;
        particle.size = particle.baseSize * pulse * (1 + mouseBoost * 0.65);
        const alpha = clamp(particle.alpha * lifeAlpha + mouseBoost * 0.32, 0, 1);

        ctx.beginPath();
        ctx.fillStyle = `hsla(${particle.hue}, 92%, ${64 + mouseBoost * 18}%, ${alpha})`;
        ctx.shadowColor = `hsla(${particle.hue}, 96%, 68%, ${alpha})`;
        ctx.shadowBlur = 12 + mouseBoost * 24;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      drawConnections();

      if (mouse.blackHole) {
        const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.08;
        ctx.save();
        ctx.translate(mouse.x, mouse.y);
        ctx.rotate(performance.now() * 0.004);
        for (let i = 0; i < 4; i += 1) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${130 + i * 22}, ${210 - i * 20}, 255, ${0.52 - i * 0.08})`;
          ctx.lineWidth = 2;
          ctx.shadowColor = "rgba(173, 118, 255, 0.95)";
          ctx.shadowBlur = 22;
          ctx.ellipse(0, 0, 26 * pulse + i * 12, 12 * pulse + i * 7, i * 0.72, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (flash) {
        flash.radius += 24;
        flash.alpha *= 0.91;
        ctx.beginPath();
        ctx.fillStyle = `rgba(180, 244, 255, ${flash.alpha * 0.18})`;
        ctx.arc(size.width / 2, size.height / 2, flash.radius, 0, Math.PI * 2);
        ctx.fill();
        if (flash.alpha < 0.02) flash = null;
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      clearLongPressTimer();
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("dblclick", handleDoubleClick);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="mouse-universe-mode">
      <canvas ref={canvasRef} className="mouse-universe-canvas" />
      <div className="mouse-universe-instructions">
        <strong>Mouse Particle Universe</strong>
        <span>移动鼠标：吸附粒子</span>
        <span>点击：冲击波</span>
        <span>长按：黑洞吸附</span>
        <span>拖动：生成星云轨迹</span>
        <span>双击：清屏重生</span>
      </div>
    </div>
  );
}
