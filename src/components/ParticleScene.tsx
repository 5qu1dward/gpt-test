import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { EffectMode, HandPoint, HandState, SwordState } from "../types";

type ParticleSceneProps = {
  handStateRef: { current: HandState };
  effectMode: EffectMode;
};

type SwordParticle = {
  position: THREE.Vector3;
  previous: THREE.Vector3;
  velocity: THREE.Vector3;
  target: THREE.Vector3;
  direction: THREE.Vector3;
  base: THREE.Vector3;
  shootVelocity: THREE.Vector3;
  phase: number;
  radius: number;
  speed: number;
  color: THREE.Color;
  state: SwordState;
};

const SWORD_COUNT = 760;
const NEBULA_PARTICLE_COUNT = 2200;
const WORLD_LIMIT_X = 3.35;
const WORLD_LIMIT_Y = 2.05;
const FORWARD = new THREE.Vector3(0, 0, 1);
const LOCAL_UP = new THREE.Vector3(0, 1, 0);

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createSimpleSwordGeometry() {
  const geometry = new THREE.ConeGeometry(0.035, 0.92, 8, 1, false);
  geometry.rotateX(0);
  return geometry;
}

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

function mapPoint(point: HandPoint | null, fallback = new THREE.Vector3()) {
  if (!point) return fallback.clone();

  return new THREE.Vector3(
    THREE.MathUtils.clamp((0.5 - point.x) * 6.1, -WORLD_LIMIT_X, WORLD_LIMIT_X),
    THREE.MathUtils.clamp((0.5 - point.y) * 3.8, -WORLD_LIMIT_Y, WORLD_LIMIT_Y),
    THREE.MathUtils.clamp(-(point.z ?? 0) * 2.8, -0.8, 1.2),
  );
}

function createSwordParticles() {
  const palette = [0x9ff7ff, 0xf4fbff, 0xffdf8a, 0x69cfff];

  return Array.from({ length: SWORD_COUNT }, (_, index): SwordParticle => {
    const angle = index * 2.399963229728653;
    const radius = randomRange(1.2, 3.4);
    const base = new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle * 1.31) * randomRange(0.4, 1.7),
      Math.sin(angle) * randomRange(0.3, 1.4),
    );

    return {
      position: base.clone(),
      previous: base.clone(),
      velocity: new THREE.Vector3(),
      target: base.clone(),
      direction: FORWARD.clone(),
      base,
      shootVelocity: new THREE.Vector3(),
      phase: randomRange(0, Math.PI * 2),
      radius,
      speed: randomRange(0.75, 1.35),
      color: new THREE.Color(palette[index % palette.length]),
      state: "idle",
    };
  });
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

function normalizeGesture(gesture: HandState["gesture"]) {
  if (gesture === "OpenPalm" || gesture === "Push") return "OpenPalm";
  return gesture;
}

function updateSwordTarget(
  sword: SwordParticle,
  index: number,
  state: SwordState,
  center: THREE.Vector3,
  tip: THREE.Vector3,
  elapsed: number,
  pushIntensity: number,
) {
  const ringIndex = index % 7;
  const layer = Math.floor(index / 7) % 9;
  const angle = index * 2.399963 + elapsed * (state === "charge" ? 1.7 : 0.42) + tip.x * 0.28;

  if (state !== sword.state) {
    sword.state = state;
    if (state === "shoot") {
      const outward = sword.position.clone().sub(center).normalize();
      const direction = outward.lengthSq() > 0.01 ? outward : FORWARD;
      sword.shootVelocity.copy(direction.multiplyScalar(0.24 + pushIntensity * 0.32));
      sword.shootVelocity.z += 0.5 + pushIntensity * 0.65;
    }
  }

  if (state === "array") {
    const radius = 0.75 + ringIndex * 0.22 + Math.sin(elapsed * 1.4 + sword.phase) * 0.05;
    const spiralY = (layer - 4) * 0.18 + Math.sin(angle * 1.7) * 0.08;
    sword.target.set(
      center.x + Math.cos(angle) * radius,
      center.y + spiralY + Math.sin(angle) * radius * 0.38,
      center.z + Math.sin(angle) * 0.45,
    );
  } else if (state === "gather") {
    const tightOrbit = 0.06 + ringIndex * 0.012;
    sword.target.set(
      tip.x + Math.cos(angle * 2.1) * tightOrbit,
      tip.y + Math.sin(angle * 2.1) * tightOrbit,
      tip.z + Math.sin(angle + elapsed * 3) * 0.08,
    );
  } else if (state === "charge") {
    const jitter = 0.045 + Math.sin(elapsed * 15 + sword.phase) * 0.025;
    const radius = 0.55 + ringIndex * 0.06;
    sword.target.set(
      center.x + Math.cos(angle) * radius + Math.sin(elapsed * 24 + sword.phase) * jitter,
      center.y + Math.sin(angle) * radius * 0.62 + Math.cos(elapsed * 21 + sword.phase) * jitter,
      center.z + Math.sin(angle * 2) * 0.24,
    );
  } else if (state === "shoot") {
    sword.target.copy(sword.position).add(sword.shootVelocity);
    if (sword.position.z > 4.6 || Math.abs(sword.position.x) > 5.2 || Math.abs(sword.position.y) > 3.2) {
      const resetAngle = index * 2.399963 + elapsed;
      sword.position.set(
        center.x + Math.cos(resetAngle) * randomRange(1.7, 2.8),
        center.y + Math.sin(resetAngle) * randomRange(0.8, 1.9),
        center.z - randomRange(1.4, 2.2),
      );
      sword.velocity.set(0, 0, 0);
      sword.previous.copy(sword.position);
    }
  } else {
    sword.target.set(
      sword.base.x + Math.sin(elapsed * 0.42 * sword.speed + sword.phase) * 0.18,
      sword.base.y + Math.cos(elapsed * 0.35 * sword.speed + sword.phase) * 0.12,
      sword.base.z + Math.sin(elapsed * 0.31 + sword.phase) * 0.18,
    );
  }
}

function NebulaParticleScene({ handStateRef }: Pick<ParticleSceneProps, "handStateRef">) {
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

    const positions = new Float32Array(NEBULA_PARTICLE_COUNT * 3);
    const velocities = new Float32Array(NEBULA_PARTICLE_COUNT * 3);
    const sphereTargets = new Float32Array(NEBULA_PARTICLE_COUNT * 3);
    const colors = new Float32Array(NEBULA_PARTICLE_COUNT * 3);
    const seeds = new Float32Array(NEBULA_PARTICLE_COUNT);
    const color = new THREE.Color();

    for (let i = 0; i < NEBULA_PARTICLE_COUNT; i += 1) {
      const i3 = i * 3;
      const point = randomPointInSphere(1.3);
      const target = randomPointInSphere(1);
      const hue = (0.54 + Math.random() * 0.42 + target.y * 0.06) % 1;

      positions[i3] = point.x;
      positions[i3 + 1] = point.y;
      positions[i3 + 2] = point.z;
      sphereTargets[i3] = target.x;
      sphereTargets[i3 + 1] = target.y;
      sphereTargets[i3 + 2] = target.z;

      color.setHSL(hue, 0.72 + Math.random() * 0.22, 0.56 + Math.random() * 0.16);
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
      const gesture = normalizeGesture(current.gesture);
      const gestureBoost = gesture === "OpenPalm" ? 1.28 : gesture === "Pinch" ? 1.12 : 1;

      pointerTarget.copy(mapPoint(current.indexTip, pointerTarget));
      smoothTarget.lerp(pointerTarget, current.indexTip ? 0.16 : 0.035);
      points.position.copy(smoothTarget);
      glowPoints.position.copy(smoothTarget);

      const pos = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < NEBULA_PARTICLE_COUNT; i += 1) {
        const i3 = i * 3;
        const x = pos[i3];
        const y = pos[i3 + 1];
        const z = pos[i3 + 2];
        const wave = Math.sin(elapsed * 1.4 + seeds[i]) * 0.002;

        if (gesture === "Pinch") {
          velocities[i3] += -x * 0.007 * step;
          velocities[i3 + 1] += -y * 0.007 * step;
          velocities[i3 + 2] += -z * 0.004 * step;
        } else if (gesture === "OpenPalm") {
          const breathe = 2.35 + Math.sin(elapsed * 1.15 + seeds[i]) * 0.08;
          velocities[i3] += (sphereTargets[i3] * breathe - x) * 0.009 * step;
          velocities[i3 + 1] += (sphereTargets[i3 + 1] * breathe - y) * 0.009 * step;
          velocities[i3 + 2] += (sphereTargets[i3 + 2] * breathe - z) * 0.007 * step;
        } else if (gesture === "Fist") {
          velocities[i3] *= Math.pow(0.88, step);
          velocities[i3 + 1] *= Math.pow(0.88, step);
          velocities[i3 + 2] *= Math.pow(0.88, step);
        } else {
          const orbitScale = 1.18 + Math.sin(elapsed * 0.8 + seeds[i]) * 0.06;
          velocities[i3] += ((sphereTargets[i3] * orbitScale - x) * 0.0014 + wave) * step;
          velocities[i3 + 1] += ((sphereTargets[i3 + 1] * orbitScale - y) * 0.0014 - wave) * step;
          velocities[i3 + 2] += ((sphereTargets[i3 + 2] * orbitScale - z) * 0.0012 + Math.sin(elapsed + seeds[i]) * 0.0005) * step;
        }

        velocities[i3] *= Math.pow(0.962, step);
        velocities[i3 + 1] *= Math.pow(0.962, step);
        velocities[i3 + 2] *= Math.pow(0.962, step);
        pos[i3] += velocities[i3] * step;
        pos[i3 + 1] += velocities[i3 + 1] * step;
        pos[i3 + 2] += velocities[i3 + 2] * step;

        const far = Math.hypot(pos[i3], pos[i3 + 1]);
        const maxRadius = gesture === "OpenPalm" ? 3.25 : 2.85;
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
      material.opacity = gesture === "Fist" ? 0.68 : 0.92;
      glowMaterial.opacity = gesture === "OpenPalm" ? 0.28 : 0.18;
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

function SwordArrayScene({ handStateRef }: Pick<ParticleSceneProps, "handStateRef">) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060a18, 0.055);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 8.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.45));
    renderer.setClearColor(0x050714, 1);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xb9eaff, 1.35));

    const keyLight = new THREE.PointLight(0x79e8ff, 2.1, 14);
    keyLight.position.set(0, 1.2, 4);
    scene.add(keyLight);

    const goldLight = new THREE.PointLight(0xffd27a, 1.1, 12);
    goldLight.position.set(-2.4, -1.2, 3.4);
    scene.add(goldLight);

    const swordGeometry = createSimpleSwordGeometry();

    const swordMaterial = new THREE.MeshBasicMaterial({
      color: 0xf4fbff,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const swordMesh = new THREE.InstancedMesh(swordGeometry, swordMaterial, SWORD_COUNT);
    swordMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    swordMesh.frustumCulled = false;
    scene.add(swordMesh);

    const trailPositions = new Float32Array(SWORD_COUNT * 2 * 3);
    const trailColors = new Float32Array(SWORD_COUNT * 2 * 3);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(trailPositions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    trailGeometry.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));

    const trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const trails = new THREE.LineSegments(trailGeometry, trailMaterial);
    trails.frustumCulled = false;
    scene.add(trails);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x62e7ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.88, 128), ringMaterial);
    scene.add(ring);

    const innerRingMaterial = ringMaterial.clone();
    innerRingMaterial.color.set(0xffdd8a);
    const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.27, 96), innerRingMaterial);
    scene.add(innerRing);

    const swords = createSwordParticles();
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const center = new THREE.Vector3();
    const tip = new THREE.Vector3();
    const smoothCenter = new THREE.Vector3();
    const smoothTip = new THREE.Vector3();

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
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.033);
      const step = delta * 60;
      const elapsed = clock.getElapsedTime();
      const hand = handStateRef.current;
      const state = hand.swordState;

      center.copy(mapPoint(hand.handCenter));
      tip.copy(mapPoint(hand.indexTip, center));
      smoothCenter.lerp(center, hand.handCenter ? 0.16 : 0.035);
      smoothTip.lerp(tip, hand.indexTip ? 0.18 : 0.04);

      const activeCenter = state === "gather" ? smoothTip : smoothCenter;

      for (let i = 0; i < swords.length; i += 1) {
        const sword = swords[i];
        sword.previous.copy(sword.position);

        updateSwordTarget(sword, i, state, activeCenter, smoothTip, elapsed, hand.pushIntensity);

        const attraction = state === "shoot" ? 0.025 : state === "gather" ? 0.052 : state === "charge" ? 0.06 : 0.032;
        sword.velocity.add(sword.target.clone().sub(sword.position).multiplyScalar(attraction * step));
        sword.velocity.multiplyScalar(Math.pow(state === "charge" ? 0.82 : 0.9, step));
        sword.position.add(sword.velocity.clone().multiplyScalar(step));

        if (sword.velocity.lengthSq() > 0.00001) {
          sword.direction.lerp(sword.velocity.clone().normalize(), 0.24);
        } else {
          sword.direction.lerp(FORWARD, 0.04);
        }

        quaternion.setFromUnitVectors(LOCAL_UP, sword.direction.clone().normalize());
        const lengthBoost = state === "shoot" ? 1.42 : state === "charge" ? 1.1 : 1;
        scale.set(0.72, lengthBoost, 0.72);
        matrix.compose(sword.position, quaternion, scale);
        swordMesh.setMatrixAt(i, matrix);
        swordMesh.setColorAt(i, sword.color);

        const t6 = i * 6;
        const tail = sword.position.clone().sub(sword.direction.clone().multiplyScalar(state === "shoot" ? 0.9 : 0.52));
        trailPositions[t6] = sword.position.x;
        trailPositions[t6 + 1] = sword.position.y;
        trailPositions[t6 + 2] = sword.position.z;
        trailPositions[t6 + 3] = tail.x;
        trailPositions[t6 + 4] = tail.y;
        trailPositions[t6 + 5] = tail.z;

        trailColors[t6] = 1;
        trailColors[t6 + 1] = 1;
        trailColors[t6 + 2] = 1;
        trailColors[t6 + 3] = sword.color.r * 0.28;
        trailColors[t6 + 4] = sword.color.g * 0.28;
        trailColors[t6 + 5] = sword.color.b * 0.28;
      }

      swordMesh.instanceMatrix.needsUpdate = true;
      if (swordMesh.instanceColor) swordMesh.instanceColor.needsUpdate = true;
      trailGeometry.attributes.position.needsUpdate = true;
      trailGeometry.attributes.color.needsUpdate = true;

      const ringScale =
        state === "array" ? 1.7 + Math.sin(elapsed * 2) * 0.05 : state === "charge" ? 1.08 + Math.sin(elapsed * 16) * 0.08 : 0.34;
      ring.position.copy(activeCenter);
      ring.scale.setScalar(ringScale);
      ring.rotation.z = elapsed * (state === "charge" ? 3.4 : 0.55);
      ringMaterial.opacity = THREE.MathUtils.lerp(
        ringMaterial.opacity,
        state === "array" || state === "charge" || state === "shoot" ? 0.44 : 0.08,
        0.12,
      );
      ringMaterial.color.set(state === "charge" ? 0xffd071 : state === "shoot" ? 0xf4fbff : 0x62e7ff);

      innerRing.position.copy(state === "gather" ? smoothTip : activeCenter);
      innerRing.scale.setScalar(state === "gather" ? 0.85 + Math.sin(elapsed * 10) * 0.08 : 0.32);
      innerRing.rotation.z = -elapsed * 2.6;
      innerRingMaterial.opacity = THREE.MathUtils.lerp(innerRingMaterial.opacity, state === "gather" ? 0.64 : 0.05, 0.16);

      trailMaterial.opacity = state === "shoot" ? 0.82 : state === "charge" ? 0.54 : 0.42;
      swordMaterial.opacity = state === "shoot" ? 0.96 : state === "charge" ? 0.9 : 0.84;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      swordGeometry.dispose();
      trailGeometry.dispose();
      ring.geometry.dispose();
      innerRing.geometry.dispose();
      swordMaterial.dispose();
      trailMaterial.dispose();
      ringMaterial.dispose();
      innerRingMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [handStateRef]);

  return <div className="particle-scene" ref={mountRef} />;
}

export function ParticleScene({ handStateRef, effectMode }: ParticleSceneProps) {
  if (effectMode === "nebula") {
    return <NebulaParticleScene handStateRef={handStateRef} />;
  }

  return <SwordArrayScene handStateRef={handStateRef} />;
}
