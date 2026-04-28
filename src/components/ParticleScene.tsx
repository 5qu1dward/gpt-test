import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { HandState } from "../types";

type ParticleSceneProps = {
  handStateRef: { current: HandState };
};

const PARTICLE_COUNT = 2200;
const WORLD_LIMIT_X = 3.15;
const WORLD_LIMIT_Y = 1.95;

function randomPointInSphere(radius: number) {
  const theta = Math.random() * Math.PI * 2;
  const cosPhi = Math.random() * 2 - 1;
  const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
  const r = Math.cbrt(Math.random()) * radius;

  return {
    x: Math.cos(theta) * sinPhi * r,
    y: Math.sin(theta) * sinPhi * r,
    z: cosPhi * r,
  };
}

function createParticleTexture() {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.28, "rgba(255, 255, 255, 0.92)");
  gradient.addColorStop(0.58, "rgba(255, 255, 255, 0.28)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function ParticleScene({ handStateRef }: ParticleSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 7.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const sphereTargets = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = new Float32Array(PARTICLE_COUNT);
    const color = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const i3 = i * 3;
      const point = randomPointInSphere(1.3);
      const target = randomPointInSphere(1);
      const hue = (0.54 + Math.random() * 0.42 + target.y * 0.06) % 1;
      const saturation = 0.72 + Math.random() * 0.22;
      const lightness = 0.56 + Math.random() * 0.16;

      positions[i3] = point.x;
      positions[i3 + 1] = point.y;
      positions[i3 + 2] = point.z;

      sphereTargets[i3] = target.x;
      sphereTargets[i3 + 1] = target.y;
      sphereTargets[i3 + 2] = target.z;

      color.setHSL(hue, saturation, lightness);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      velocities[i3] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
      seeds[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const particleTexture = createParticleTexture();
    const material = new THREE.PointsMaterial({
      size: 0.062,
      map: particleTexture,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const glowMaterial = new THREE.PointsMaterial({
      size: 0.18,
      map: particleTexture,
      transparent: true,
      opacity: 0.18,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    const glowPoints = new THREE.Points(geometry, glowMaterial);
    points.frustumCulled = false;
    glowPoints.frustumCulled = false;
    scene.add(glowPoints);
    scene.add(points);

    const clock = new THREE.Clock();
    const pointerTarget = new THREE.Vector3(0, 0, 0);
    const smoothTarget = new THREE.Vector3(0, 0, 0);

    const resize = () => {
      const width = mount.clientWidth || 800;
      const height = mount.clientHeight || 600;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resize();
    window.addEventListener("resize", resize);

    let animationId = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.033);
      const step = delta * 60;
      const elapsed = clock.getElapsedTime();
      const current = handStateRef.current;
      const gestureBoost = current.gesture === "Open Palm" ? 1.28 : current.gesture === "Pinch" ? 1.12 : 1;

      // MediaPipe coordinates are 0-1. Map them into the visible Three.js world.
      if (current.indexTip) {
        pointerTarget.x = THREE.MathUtils.clamp(
          (0.5 - current.indexTip.x) * 5.2,
          -WORLD_LIMIT_X,
          WORLD_LIMIT_X,
        );
        pointerTarget.y = THREE.MathUtils.clamp(
          (0.5 - current.indexTip.y) * 3.2,
          -WORLD_LIMIT_Y,
          WORLD_LIMIT_Y,
        );
      } else {
        pointerTarget.x = Math.sin(elapsed * 0.45) * 0.75;
        pointerTarget.y = Math.cos(elapsed * 0.35) * 0.45;
      }

      smoothTarget.lerp(pointerTarget, current.indexTip ? 0.16 : 0.035);
      points.position.copy(smoothTarget);
      glowPoints.position.copy(smoothTarget);

      const pos = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i += 1) {
        const i3 = i * 3;
        const x = pos[i3];
        const y = pos[i3 + 1];
        const z = pos[i3 + 2];
        const wave = Math.sin(elapsed * 1.4 + seeds[i]) * 0.002;

        if (current.gesture === "Pinch") {
          velocities[i3] += -x * 0.007 * step;
          velocities[i3 + 1] += -y * 0.007 * step;
          velocities[i3 + 2] += -z * 0.004 * step;
        } else if (current.gesture === "Open Palm") {
          const breathe = 2.35 + Math.sin(elapsed * 1.15 + seeds[i]) * 0.08;
          const targetX = sphereTargets[i3] * breathe;
          const targetY = sphereTargets[i3 + 1] * breathe;
          const targetZ = sphereTargets[i3 + 2] * breathe;

          velocities[i3] += (targetX - x) * 0.009 * step;
          velocities[i3 + 1] += (targetY - y) * 0.009 * step;
          velocities[i3 + 2] += (targetZ - z) * 0.007 * step;
        } else if (current.gesture === "Fist") {
          velocities[i3] *= Math.pow(0.88, step);
          velocities[i3 + 1] *= Math.pow(0.88, step);
          velocities[i3 + 2] *= Math.pow(0.88, step);
        } else {
          const orbitScale = 1.18 + Math.sin(elapsed * 0.8 + seeds[i]) * 0.06;
          const orbitX = sphereTargets[i3] * orbitScale;
          const orbitY = sphereTargets[i3 + 1] * orbitScale;
          const orbitZ = sphereTargets[i3 + 2] * orbitScale;
          velocities[i3] += ((orbitX - x) * 0.0014 + wave) * step;
          velocities[i3 + 1] += ((orbitY - y) * 0.0014 - wave) * step;
          velocities[i3 + 2] += ((orbitZ - z) * 0.0012 + Math.sin(elapsed + seeds[i]) * 0.0005) * step;
        }

        velocities[i3] *= Math.pow(0.962, step);
        velocities[i3 + 1] *= Math.pow(0.962, step);
        velocities[i3 + 2] *= Math.pow(0.962, step);

        pos[i3] += velocities[i3] * step;
        pos[i3 + 1] += velocities[i3 + 1] * step;
        pos[i3 + 2] += velocities[i3 + 2] * step;

        const far = Math.hypot(pos[i3], pos[i3 + 1]);
        const maxRadius = current.gesture === "Open Palm" ? 3.25 : 2.85;
        if (far > maxRadius) {
          const nx = pos[i3] / far;
          const ny = pos[i3 + 1] / far;
          const excess = far - maxRadius;
          const radialVelocity = velocities[i3] * nx + velocities[i3 + 1] * ny;

          pos[i3] -= nx * excess * 0.18;
          pos[i3 + 1] -= ny * excess * 0.18;

          if (radialVelocity > 0) {
            velocities[i3] -= nx * radialVelocity * 0.72;
            velocities[i3 + 1] -= ny * radialVelocity * 0.72;
          }
        }
      }

      geometry.attributes.position.needsUpdate = true;
      material.size = 0.058 * gestureBoost * (1 + Math.sin(elapsed * 2.4) * 0.08);
      glowMaterial.size = 0.18 * gestureBoost * (1 + Math.sin(elapsed * 1.6) * 0.12);
      material.opacity = current.gesture === "Fist" ? 0.68 : 0.92;
      glowMaterial.opacity = current.gesture === "Open Palm" ? 0.28 : 0.18;
      points.rotation.x = Math.sin(elapsed * 0.18) * 0.08;
      points.rotation.y = elapsed * 0.12;
      points.rotation.z = Math.sin(elapsed * 0.25) * 0.025;
      glowPoints.rotation.copy(points.rotation);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      glowMaterial.dispose();
      particleTexture?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [handStateRef]);

  return <div className="particle-scene" ref={mountRef} />;
}
