"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/* =========================================================
   PALETTE — strict black & white.
========================================================= */

const WHITE = 0xffffff;
const NEAR_BLACK = 0x030303;
const ROCK = 0x0a0a0a;
const VOID = 0x000000;

/* =========================================================
   HELPERS
========================================================= */

function tube(points: THREE.Vector3[], radius: number, material: THREE.Material, segments = 96) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 14, false), material);
}

/** Glowing glyph: black lacquered core + slightly-larger white backface shell = crisp rim light. */
function glowShell(mesh: THREE.Mesh, scale = 1.06) {
  const shellMat = new THREE.MeshBasicMaterial({
    color: WHITE,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.9,
  });
  const shell = mesh.clone();
  shell.material = shellMat;
  shell.scale.setScalar(scale);
  const group = new THREE.Group();
  group.add(shell, mesh);
  return group;
}

function coreMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: NEAR_BLACK,
    metalness: 0.9,
    roughness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    emissive: WHITE,
    emissiveIntensity: 0.08,
  });
}

function createContactShadowTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.5)");
  g.addColorStop(0.5, "rgba(255,255,255,0.16)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Renders real, legible code onto a canvas so glass panels show actual text like the reference. */
function createCodeTexture(lines: string[], w = 640, h = 400) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(5,5,5,0.0)";
  ctx.fillRect(0, 0, w, h);

  // traffic-light dots
  const dotY = 34;
  [30, 58, 86].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, dotY, 7, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
  });
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 62);
  ctx.lineTo(w - 24, 62);
  ctx.stroke();

  ctx.font = "500 22px 'SFMono-Regular', Menlo, Consolas, monospace";
  ctx.textBaseline = "top";
  const startY = 92;
  const lineHeight = 34;
  lines.forEach((line, i) => {
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(line.trimStart(), 30 + indent * 10, startY + i * lineHeight);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/* =========================================================
   CODE GLYPHS
========================================================= */

function createBrace(right: boolean, material: THREE.Material) {
  const s = right ? 1 : -1;
  const points = [
    new THREE.Vector3(s * 0.5, 1.3, 0),
    new THREE.Vector3(s * 0.18, 1.3, 0),
    new THREE.Vector3(0, 1.0, 0),
    new THREE.Vector3(0, 0.45, 0),
    new THREE.Vector3(s * 0.24, 0, 0),
    new THREE.Vector3(0, -0.45, 0),
    new THREE.Vector3(0, -1.0, 0),
    new THREE.Vector3(s * 0.18, -1.3, 0),
    new THREE.Vector3(s * 0.5, -1.3, 0),
  ];
  return tube(points, 0.1, material);
}

function createChevron(right: boolean, material: THREE.Material) {
  const s = right ? 1 : -1;
  return tube(
    [
      new THREE.Vector3(s * 0.6, 0.75, 0),
      new THREE.Vector3(-s * 0.55, 0, 0),
      new THREE.Vector3(s * 0.6, -0.75, 0),
    ],
    0.11,
    material
  );
}

function createSlash(material: THREE.Material) {
  return tube(
    [
      new THREE.Vector3(-0.42, -0.8, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.42, 0.8, 0),
    ],
    0.11,
    material
  );
}

/* =========================================================
   GLASS CODE PANEL (now with real text)
========================================================= */

function createCodeWindow(width: number, height: number, lines: string[]) {
  const group = new THREE.Group();

  const glass = new THREE.Mesh(
    new RoundedBoxGeometry(width, height, 0.06, 8, 0.075),
    new THREE.MeshPhysicalMaterial({
      color: NEAR_BLACK,
      metalness: 0.4,
      roughness: 0.1,
      transmission: 0.92,
      thickness: 0.6,
      ior: 1.45,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    })
  );
  group.add(glass);

  const borderMaterial = new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.32 });
  const w2 = width / 2, h2 = height / 2;
  group.add(
    tube(
      [
        new THREE.Vector3(-w2, h2, 0.045),
        new THREE.Vector3(w2, h2, 0.045),
        new THREE.Vector3(w2, -h2, 0.045),
        new THREE.Vector3(-w2, -h2, 0.045),
        new THREE.Vector3(-w2, h2, 0.045),
      ],
      0.008,
      borderMaterial
    )
  );

  const codeTexture = createCodeTexture(lines);
  const codePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.92, height * 0.86),
    new THREE.MeshBasicMaterial({ map: codeTexture, transparent: true, opacity: 0.95 })
  );
  codePlane.position.set(0, -height * 0.02, 0.045);
  group.add(codePlane);

  return group;
}

/* =========================================================
   FLOATING SOLIDS
========================================================= */

function createFloatingCube(size: number) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshPhysicalMaterial({
    color: NEAR_BLACK,
    metalness: 0.3,
    roughness: 0.05,
    transmission: 0.5,
    thickness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.85,
  });
  const cube = new THREE.Mesh(geometry, material);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.65 })
  );
  cube.add(edges);
  return cube;
}

function createRing(radius: number, tubeRadius = 0.01, opacity = 0.32) {
  return new THREE.Mesh(
    new THREE.TorusGeometry(radius, tubeRadius, 8, 200),
    new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity })
  );
}

/* =========================================================
   BACKDROP — eclipse arc + rocky canyon walls
========================================================= */

function createEclipseArc() {
  const group = new THREE.Group();

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(4.4, 64),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  group.add(disc);

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(4.35, 4.55, 96),
    new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
  );
  group.add(glow);

  for (let i = 0; i < 3; i++) {
    const r = 5.2 + i * 0.9;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r, r + 0.015, 128),
      new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.05 - i * 0.012, side: THREE.DoubleSide })
    );
    group.add(ring);
  }

  return group;
}

/** Jagged low-poly canyon silhouette, one on each side, matte and near-black. */
function createRockRidge(mirror: boolean) {
  const points: [number, number][] = [
    [0, -6], [0.4, -3.2], [0.15, -1.6], [0.65, 0.4], [0.3, 2.2],
    [0.9, 3.8], [0.5, 5.6], [1.1, 7.5], [0, 7.5], [0, -6],
  ];
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 3.2, bevelEnabled: false, steps: 1 });
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: ROCK,
    metalness: 0.15,
    roughness: 0.85,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.x = mirror ? -1 : 1;
  return mesh;
}

/* =========================================================
   ATMOSPHERE
========================================================= */

function createParticles(count: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 26;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: WHITE,
      size: 0.022,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
}

function createFloor() {
  const geometry = new THREE.PlaneGeometry(60, 60);
  const material = new THREE.MeshStandardMaterial({ color: VOID, metalness: 0.92, roughness: 0.22 });
  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.85;
  return floor;
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function PremiumBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    /* ---------------- Renderer ---------------- */

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.62;
    Object.assign(renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
    });
    container.appendChild(renderer.domElement);

    /* ---------------- Scene / fog ---------------- */

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(VOID);
    scene.fog = new THREE.FogExp2(VOID, 0.05);

    /* ---------------- Camera ---------------- */

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 200);
    camera.position.set(0, 0.3, 16.5);

    /* ---------------- Environment ---------------- */

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.045).texture;
    scene.environment = env;
    room.dispose();
    pmrem.dispose();

    /* ---------------- Lighting ---------------- */

    scene.add(new THREE.AmbientLight(WHITE, 0.06));

    const key = new THREE.DirectionalLight(WHITE, 1.5);
    key.position.set(-6, 9, 8);
    scene.add(key);

    const rim = new THREE.DirectionalLight(WHITE, 0.6);
    rim.position.set(6, -2, -6);
    scene.add(rim);

    const front = new THREE.PointLight(WHITE, 34, 30);
    front.position.set(0, 2, 7);
    scene.add(front);

    const glow = new THREE.PointLight(WHITE, 22, 18);
    glow.position.set(0, 0.5, -3.5);
    scene.add(glow);

    /* ---------------- Root ---------------- */

    const root = new THREE.Group();
    scene.add(root);

    /* ---------------- Backdrop: eclipse + canyon walls ---------------- */

    const eclipse = createEclipseArc();
    eclipse.position.set(0.5, 5.5, -9);
    root.add(eclipse);

    const leftRidge = createRockRidge(false);
    leftRidge.position.set(-8.6, -4, -4);
    root.add(leftRidge);

    const rightRidge = createRockRidge(true);
    rightRidge.position.set(8.6, -4, -4);
    root.add(rightRidge);

    /* ---------------- Floor ---------------- */

    root.add(createFloor());

    /* ---------------- Central platform ---------------- */

    const platformGeometry = new RoundedBoxGeometry(5.7, 1.2, 0.4, 12, 0.14);
    const platformMaterial = new THREE.MeshPhysicalMaterial({
      color: NEAR_BLACK,
      metalness: 1,
      roughness: 0.09,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(0, -3, -0.8);
    root.add(platform);
    platform.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(platformGeometry),
        new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.7 })
      )
    );

    /* glowing seam around the platform's widest edge */
    const seam = createRing(3.0, 0.02, 0.55);
    seam.rotation.x = Math.PI / 2;
    seam.position.set(0, -3.02, -0.8);
    root.add(seam);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({ map: createContactShadowTexture(), transparent: true, depthWrite: false })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, -3.83, -0.8);
    root.add(shadowPlane);

    /* concentric floor rings */
    const floorRings = [3.7, 4.7, 5.6].map((r, i) => {
      const ring = createRing(r, i === 1 ? 0.01 : 0.014, 0.3 - i * 0.06);
      ring.rotation.x = Math.PI / 2;
      ring.scale.y = i === 1 ? 0.42 : 1;
      ring.position.set(0, -3.3 - i * 0.03, -0.8);
      return ring;
    });
    floorRings.forEach((r) => root.add(r));

    /* orbit ellipse threading through the spheres, tilted like the reference */
    const orbitPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(Math.cos(a) * 5.2, Math.sin(a) * 0.9 + 0.2, Math.sin(a) * 1.6 - 0.5));
    }
    const orbitLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(orbitPoints),
      new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.28 })
    );
    orbitLine.rotation.z = 0.08;
    root.add(orbitLine);

    /* ---------------- Central glyph, black core + white rim glow ---------------- */

    const glyphGroup = new THREE.Group();

    const leftBrace = glowShell(createBrace(false, coreMaterial()));
    leftBrace.position.set(-2.2, 0.5, -0.5);
    leftBrace.scale.setScalar(1.2);
    glyphGroup.add(leftBrace);

    const rightBrace = glowShell(createBrace(true, coreMaterial()));
    rightBrace.position.set(2.2, 0.5, -0.5);
    rightBrace.scale.setScalar(1.2);
    glyphGroup.add(rightBrace);

    const less = glowShell(createChevron(false, coreMaterial()));
    less.position.set(-0.85, 0.5, 0);
    glyphGroup.add(less);

    const greater = glowShell(createChevron(true, coreMaterial()));
    greater.position.set(0.85, 0.5, 0);
    glyphGroup.add(greater);

    const slash = glowShell(createSlash(coreMaterial()));
    slash.position.set(0, 0.5, 0.1);
    glyphGroup.add(slash);

    root.add(glyphGroup);

    /* vertical light column rising behind the glyph */
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.6, 12, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.015, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.set(0, 2.5, -1.5);
    root.add(beam);

    /* ---------------- Glass code panels with real text ---------------- */

    const window1 = createCodeWindow(3.3, 2.15, [
      "const createFuture = () => {",
      "  return {",
      "    code: \"better\",",
      "    design: \"prettier\",",
      "    experience: \"amazing\"",
      "  };",
      "};",
    ]);
    window1.position.set(-5.2, 2.9, -2.8);
    window1.rotation.set(0, 0.16, -0.02);
    root.add(window1);

    const window2 = createCodeWindow(3.3, 2.15, [
      "function buildDream() {",
      "  return [",
      "    \"Code\",",
      "    \"Design\",",
      "    \"Innovation\",",
      "    \"Together\"",
      "  ];",
      "}",
    ]);
    window2.position.set(5.2, 2.9, -2.8);
    window2.rotation.set(0, -0.16, 0.02);
    root.add(window2);

    const window3 = createCodeWindow(2.35, 1.6, [
      "const ideas = {",
      "  ui: true,",
      "  ux: true,",
      "  performance: true",
      "};",
    ]);
    window3.position.set(-5.1, -0.2, -2.2);
    window3.rotation.y = 0.18;
    root.add(window3);

    const window4 = createCodeWindow(2.35, 1.6, [
      "if (passion) {",
      "  create();",
      "  improve();",
      "  repeat();",
      "}",
    ]);
    window4.position.set(5.1, -0.2, -2.2);
    window4.rotation.y = -0.18;
    root.add(window4);

    /* ---------------- Floating solids ---------------- */

    const cubes = [
      { mesh: createFloatingCube(0.72), position: [-6.9, 4.2, -1.5] },
      { mesh: createFloatingCube(0.62), position: [6.9, 4.0, -1.2] },
      { mesh: createFloatingCube(0.5), position: [-7, -1.9, 0] },
      { mesh: createFloatingCube(0.55), position: [7, -2, -0.5] },
    ] as const;
    cubes.forEach(({ mesh, position }) => {
      mesh.position.set(position[0], position[1], position[2]);
      root.add(mesh);
    });

    /* ---------------- Floating spheres ---------------- */

    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: WHITE,
      emissive: WHITE,
      emissiveIntensity: 1.4,
      metalness: 0.6,
      roughness: 0.08,
    });
    const spheres: THREE.Mesh[] = [];
    ([
      [-5.9, 1.6, -0.5],
      [5.9, 1.8, -1],
      [-4.8, -2.1, 0],
      [4.8, -2.1, -0.5],
      [-2.2, 3.3, -1.2],
      [2.4, 3.6, -1.4],
      [0.4, -0.3, 1.4],
    ] as const).forEach(([x, y, z], index) => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(index < 4 ? 0.15 : 0.09, 24, 24),
        sphereMaterial
      );
      sphere.position.set(x, y, z);
      root.add(sphere);
      spheres.push(sphere);
    });

    /* ---------------- Atmosphere ---------------- */

    const particles = createParticles(1400);
    root.add(particles);

    /* ---------------- Post-processing ---------------- */

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.55, 0.7, 0.35);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    /* ---------------- Animation ---------------- */

    const clock = new THREE.Clock();
    const pointer = { x: 0, y: 0 };
    let frame = 0;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };
    window.addEventListener("pointermove", handlePointerMove);

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      root.rotation.y = Math.sin(t * 0.12) * 0.02 + pointer.x * 0.04;
      root.rotation.x = pointer.y * -0.02;
      root.position.y = Math.sin(t * 0.35) * 0.035;

      camera.position.x += (pointer.x * 0.5 - camera.position.x) * 0.02;
      camera.position.y += (0.3 - pointer.y * 0.3 - camera.position.y) * 0.02;
      camera.lookAt(0, 0.2, -1);

      glyphGroup.children[0].rotation.y = Math.sin(t * 0.5) * 0.12;
      glyphGroup.children[1].rotation.y = Math.sin(t * 0.5 + 1) * -0.12;

      floorRings[0].rotation.z = t * 0.1;
      floorRings[1].rotation.z = -t * 0.07;
      floorRings[2].rotation.z = t * 0.06;
      seam.rotation.z = t * 0.05;
      orbitLine.rotation.y = t * 0.05;

      cubes.forEach(({ mesh }, index) => {
        mesh.rotation.x += 0.002 + index * 0.0004;
        mesh.rotation.y += 0.003 + index * 0.0005;
        mesh.position.y += Math.sin(t * 0.5 + index) * 0.0015;
      });

      spheres.forEach((sphere, index) => {
        sphere.position.y += Math.sin(t * 0.7 + index) * 0.001;
      });

      particles.rotation.y = t * 0.008;

      composer.render();
    };
    animate();

    /* ---------------- Resize ---------------- */

    const resize = () => {
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloom.resolution.set(w, h);
    };
    window.addEventListener("resize", resize);

    /* ---------------- Cleanup ---------------- */

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);

      scene.traverse((object) => {
        const obj = object as THREE.Mesh;
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });

      env.dispose();
      renderer.dispose();
      composer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black"
      aria-hidden="true"
      style={{
        // Strong, near-full-frame vignette plus a flat dark tint. This
        // guarantees foreground UI (text, cards) keeps contrast no
        // matter what's happening in the 3D scene underneath — the
        // canvas can never wash out to grey/white in the areas where
        // content sits.
        boxShadow:
          "inset 0 0 14vw rgba(0,0,0,0.95), inset 0 0 30vw rgba(0,0,0,0.55)",
        background:
          "radial-gradient(120% 90% at 50% 20%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0.85) 100%)",
      }}
    />
  );
}
