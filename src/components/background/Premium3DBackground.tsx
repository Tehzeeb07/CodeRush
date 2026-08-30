"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/* ------------------------------------------------------------------ */
/* Palette — deep navy / midnight with electric blue, cyan, violet,    */
/* and a whisper of premium gold.                                      */
/* ------------------------------------------------------------------ */
const PALETTE = {
  bg: 0x030712,
  steel: 0x131e38,
  electric: 0x2563eb,
  cyan: 0x22d3ee,
  violet: 0x8b5cf6,
  gold: 0xd4af37,
} as const;

type SymbolChar = "{" | "}" | "<" | ">" | "/";

/** fractional part helper used for seamless looping motion */
function fract(x: number): number {
  return x - Math.floor(x);
}

/** Small deterministic PRNG so composition is identical on every load. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth rounded brace centerline (~1.9 units tall, 2D in XY). */
function bracePath(mirror: boolean): THREE.CurvePath<THREE.Vector3> {
  const s = mirror ? -1 : 1;
  const v = (x: number, y: number) => new THREE.Vector3(s * x, y, 0);
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(new THREE.LineCurve3(v(0.38, 0.95), v(0.14, 0.95)));
  path.add(new THREE.CubicBezierCurve3(v(0.14, 0.95), v(0, 0.95), v(0, 0.82), v(0, 0.6)));
  path.add(new THREE.LineCurve3(v(0, 0.6), v(0, 0.18)));
  path.add(new THREE.CubicBezierCurve3(v(0, 0.18), v(0, 0), v(0.28, 0), v(0.42, 0)));
  path.add(new THREE.CubicBezierCurve3(v(0.42, 0), v(0.28, 0), v(0, 0), v(0, -0.18)));
  path.add(new THREE.LineCurve3(v(0, -0.18), v(0, -0.6)));
  path.add(new THREE.CubicBezierCurve3(v(0, -0.6), v(0, -0.82), v(0, -0.95), v(0.14, -0.95)));
  path.add(new THREE.LineCurve3(v(0.14, -0.95), v(0.38, -0.95)));
  return path;
}

function chevronPath(mirror: boolean): THREE.CurvePath<THREE.Vector3> {
  const s = mirror ? -1 : 1;
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(
    new THREE.LineCurve3(
      new THREE.Vector3(s * 0.34, 0.7, 0),
      new THREE.Vector3(-s * 0.34, 0, 0)
    )
  );
  path.add(
    new THREE.LineCurve3(
      new THREE.Vector3(-s * 0.34, 0, 0),
      new THREE.Vector3(s * 0.34, -0.7, 0)
    )
  );
  return path;
}

function slashPath(): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(
    new THREE.LineCurve3(new THREE.Vector3(-0.3, -0.72, 0), new THREE.Vector3(0.3, 0.72, 0))
  );
  return path;
}

/** Build an elegant rounded "neon tube" glyph from a centerline path. */
function tubeGlyph(path: THREE.CurvePath<THREE.Vector3>, radius: number, material: THREE.Material) {
  const group = new THREE.Group();
  const tubeGeo = new THREE.TubeGeometry(path, 96, radius, 12, false);
  group.add(new THREE.Mesh(tubeGeo, material));
  const capGeo = new THREE.SphereGeometry(radius * 1.02, 12, 12);
  for (const p of [path.getPoint(0), path.getPoint(1)]) {
    const cap = new THREE.Mesh(capGeo, material);
    cap.position.copy(p);
    group.add(cap);
  }
  return group;
}

function createCodeSymbol(char: SymbolChar, material: THREE.Material): THREE.Group {
  switch (char) {
    case "{":
      return tubeGlyph(bracePath(false), 0.085, material);
    case "}":
      return tubeGlyph(bracePath(true), 0.085, material);
    case "<":
      return tubeGlyph(chevronPath(false), 0.1, material);
    case ">":
      return tubeGlyph(chevronPath(true), 0.1, material);
    case "/":
      return tubeGlyph(slashPath(), 0.1, material);
  }
}

type Animatable = { update: (t: number) => void };

/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */

const PARTICLE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute float aSpeed;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec3 p = position;
    // seamless slow vertical drift with wrap + gentle horizontal sway
    p.y = mod(p.y + 8.0 + uTime * aSpeed, 16.0) - 8.0;
    p.x += sin(uTime * aSpeed * 1.6 + aPhase) * 0.55;
    p.z += cos(uTime * aSpeed * 1.1 + aPhase * 2.0) * 0.4;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aScale * uPixelRatio * (15.0 / max(0.001, -mv.z));
    vColor = aColor;
    vFade = smoothstep(26.0, 6.0, -mv.z) * (0.55 + 0.45 * sin(uTime * 0.4 + aPhase * 3.0));
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = smoothstep(0.5, 0.06, d);
    gl_FragColor = vec4(vColor, a * max(vFade, 0.0) * 0.8);
  }
`;

const HOLO_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HOLO_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float scan = 0.75 + 0.25 * sin(vUv.y * 46.0 - uTime * 1.1);
    float sweepPos = fract(uTime * 0.06);
    float sweep = exp(-pow((vUv.y - sweepPos) * 7.0, 2.0)) * 0.7;
    vec2 b = min(vUv, 1.0 - vUv);
    float border = smoothstep(0.09, 0.005, min(b.x, b.y));
    float grid = max(
      smoothstep(0.48, 0.5, abs(fract(vUv.x * 5.0) - 0.5)),
      smoothstep(0.44, 0.5, abs(fract(vUv.y * 3.0) - 0.5))
    ) * 0.16;
    float alpha = (0.045 + border * 0.4 + sweep + grid) * scan * uOpacity;
    gl_FragColor = vec4(uColor * (0.75 + border * 0.6 + sweep), alpha);
  }
`;

const BACKDROP_VERT = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BACKDROP_FRAG = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vec3 dir = normalize(vPos);
    vec3 top = vec3(0.010, 0.018, 0.048);
    vec3 bottom = vec3(0.022, 0.050, 0.105);
    vec3 col = mix(bottom, top, smoothstep(-0.55, 0.75, dir.y));
    float g1 = exp(-pow(length(dir.xy - vec2(-0.55, 0.30)) * 2.1, 2.0));
    col += vec3(0.045, 0.020, 0.085) * g1;
    float g2 = exp(-pow(length(dir.xy - vec2(0.62, -0.22)) * 2.4, 2.0));
    col += vec3(0.006, 0.040, 0.075) * g2;
    float g3 = exp(-pow(length(dir.xy - vec2(0.05, 0.55)) * 3.0, 2.0));
    col += vec3(0.010, 0.022, 0.045) * g3;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function Premium3DBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      return; // WebGL unavailable — leave the dark CSS background only
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    container.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.bg);
    scene.fog = new THREE.FogExp2(PALETTE.bg, 0.02);

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 0, 17.5);

    /* Environment — premium studio reflections on metallic/glass surfaces */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
    scene.environment = envTexture;

    /* ------------------------------- Lights ------------------------- */
    scene.add(new THREE.AmbientLight(0x1b2650, 1.1));
    scene.add(new THREE.HemisphereLight(0x2a3a72, 0x05060f, 0.55));

    const keyLight = new THREE.DirectionalLight(0xcfdcff, 0.55);
    keyLight.position.set(-6, 9, 8);
    scene.add(keyLight);

    const cyanLight = new THREE.PointLight(PALETTE.cyan, 55, 0, 2);
    cyanLight.position.set(-8.5, 3.5, 5);
    scene.add(cyanLight);

    const violetLight = new THREE.PointLight(PALETTE.violet, 65, 0, 2);
    violetLight.position.set(9, -3, 4.5);
    scene.add(violetLight);

    const goldLight = new THREE.PointLight(PALETTE.gold, 12, 0, 2);
    goldLight.position.set(4, 6, -3);
    scene.add(goldLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 0.35);
    rimLight.position.set(8, -6, -6);
    scene.add(rimLight);

    /* --------------------- Gradient deep-space backdrop -------------- */
    const backdrop = new THREE.Mesh(
      new THREE.SphereGeometry(80, 32, 32),
      new THREE.ShaderMaterial({
        vertexShader: BACKDROP_VERT,
        fragmentShader: BACKDROP_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      })
    );
    scene.add(backdrop);

    const disposables: Array<{ dispose: () => void }> = [];
    const animatables: Animatable[] = [];
    const sceneRoot = new THREE.Group();
    scene.add(sceneRoot);

    /* ================= Floating 3D code symbols ===================== */
    const symbolSpecs: Array<{
      char: SymbolChar;
      pos: [number, number, number];
      scale: number;
      color: number;
      emissiveIntensity: number;
    }> = [
      { char: "{", pos: [-6.8, 2.6, -2.0], scale: 1.45, color: 0x0e1c36, emissiveIntensity: 0.45 },
      { char: "}", pos: [6.9, 3.1, -3.0], scale: 1.25, color: 0x0e1c36, emissiveIntensity: 0.35 },
      { char: "<", pos: [-9.3, -2.2, -1.0], scale: 1.05, color: 0x140f2e, emissiveIntensity: 0.4 },
      { char: ">", pos: [9.4, -1.6, -2.0], scale: 1.1, color: 0x0e1c36, emissiveIntensity: 0.4 },
      { char: "/", pos: [4.9, -4.6, 0.5], scale: 0.9, color: 0x0e1c36, emissiveIntensity: 0.35 },
      { char: "{", pos: [9.8, 3.9, -6.0], scale: 0.8, color: 0x241d08, emissiveIntensity: 0.5 },
      { char: "<", pos: [-4.6, 5.4, -5.0], scale: 0.65, color: 0x0e1c36, emissiveIntensity: 0.3 },
      { char: ">", pos: [-9.8, 1.8, -7.0], scale: 0.8, color: 0x140f2e, emissiveIntensity: 0.35 },
      { char: "/", pos: [7.6, 5.7, -8.0], scale: 0.7, color: 0x0e1c36, emissiveIntensity: 0.35 },
    ];

    const symbolTints = [PALETTE.cyan, PALETTE.electric, PALETTE.violet, PALETTE.gold];
    symbolSpecs.forEach((spec, i) => {
      const mat = new THREE.MeshPhysicalMaterial({
        color: spec.color,
        metalness: 0.92,
        roughness: 0.24,
        emissive: symbolTints[i % 4],
        emissiveIntensity: spec.emissiveIntensity,
        envMapIntensity: 1.1,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25,
      });
      disposables.push(mat);
      const symbol = createCodeSymbol(spec.char, mat);
      symbol.position.set(...spec.pos);
      symbol.scale.setScalar(spec.scale);
      symbol.rotation.set(0, i % 2 === 0 ? 0.35 : -0.3, i % 3 === 0 ? 0.08 : -0.06);
      symbol.traverse((o) => {
        if (o instanceof THREE.Mesh) disposables.push(o.geometry);
      });
      sceneRoot.add(symbol);

      const baseY = spec.pos[1];
      const baseRx = symbol.rotation.x;
      const baseRy = symbol.rotation.y;
      const speed = 0.12 + (i % 5) * 0.03;
      const phase = i * 1.7;
      animatables.push({
        update(t) {
          symbol.position.y = baseY + Math.sin(t * speed + phase) * 0.22;
          symbol.rotation.x = baseRx + Math.sin(t * speed * 0.8 + phase) * 0.1;
          symbol.rotation.y = baseRy + Math.cos(t * speed * 0.6 + phase * 1.3) * 0.16;
        },
      });
    });

    /* ================= Glass + metallic data cubes =================== */
    const cubeSpecs: Array<{
      pos: [number, number, number];
      size: number;
      glass: boolean;
      tint: number;
    }> = [
      { pos: [-5.4, -3.4, 0.5], size: 1.35, glass: true, tint: 0x8fd0ff },
      { pos: [5.8, -3.0, -1.5], size: 1.15, glass: true, tint: 0xa5b8ff },
      { pos: [-8.2, 4.2, -4.0], size: 1.0, glass: false, tint: PALETTE.steel },
      { pos: [10.2, 1.2, -3.0], size: 0.85, glass: true, tint: 0x9fe8ff },
      { pos: [-2.8, 5.8, -8.0], size: 0.9, glass: false, tint: 0x1a2440 },
      { pos: [3.9, 5.4, -6.5], size: 0.75, glass: true, tint: 0xb8c8ff },
    ];

    cubeSpecs.forEach((spec, i) => {
      const geo = new RoundedBoxGeometry(spec.size, spec.size, spec.size, 4, spec.size * 0.09);
      disposables.push(geo);
      const mat = spec.glass
        ? new THREE.MeshPhysicalMaterial({
            color: spec.tint,
            metalness: 0,
            roughness: 0.06,
            transmission: 0.92,
            thickness: spec.size * 1.1,
            ior: 1.42,
            transparent: true,
            opacity: 0.9,
            envMapIntensity: 1.2,
            clearcoat: 1,
            clearcoatRoughness: 0.08,
            emissive: i % 2 === 0 ? PALETTE.cyan : PALETTE.electric,
            emissiveIntensity: 0.05,
          })
        : new THREE.MeshStandardMaterial({
            color: spec.tint,
            metalness: 1,
            roughness: 0.22,
            envMapIntensity: 1.0,
          });
      disposables.push(mat);
      const cube = new THREE.Mesh(geo, mat);
      cube.position.set(...spec.pos);
      cube.rotation.set(i * 0.7, i * 1.1, i * 0.4);
      sceneRoot.add(cube);

      const speed = 0.1 + (i % 4) * 0.025;
      const phase = i * 2.1;
      const baseY = spec.pos[1];
      animatables.push({
        update(t) {
          cube.rotation.x = t * speed + phase;
          cube.rotation.y = t * speed * 0.7 + phase * 1.4;
          cube.rotation.z = Math.sin(t * speed * 0.9 + phase) * 0.18;
          cube.position.y = baseY + Math.sin(t * speed * 1.4 + phase * 2.0) * 0.28;
        },
      });
    });

    /* ================= Small floating tech spheres =================== */
    const sphereSpecs: Array<{ pos: [number, number, number]; r: number; gold: boolean }> = [
      { pos: [-3.6, 3.9, -1.0], r: 0.34, gold: false },
      { pos: [4.4, 3.4, -0.5], r: 0.28, gold: false },
      { pos: [-7.8, -4.6, -3.0], r: 0.42, gold: false },
      { pos: [8.6, -4.4, -4.0], r: 0.5, gold: true },
      { pos: [2.9, -5.6, -2.0], r: 0.24, gold: false },
    ];
    sphereSpecs.forEach((spec, i) => {
      const geo = new THREE.SphereGeometry(spec.r, 32, 32);
      disposables.push(geo);
      const mat = spec.gold
        ? new THREE.MeshStandardMaterial({
            color: 0x8a6d1f,
            metalness: 1,
            roughness: 0.18,
            emissive: PALETTE.gold,
            emissiveIntensity: 0.12,
            envMapIntensity: 1.4,
          })
        : new THREE.MeshStandardMaterial({
            color: 0x9fb4d8,
            metalness: 1,
            roughness: 0.1,
            envMapIntensity: 1.3,
          });
      disposables.push(mat);
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(...spec.pos);
      sceneRoot.add(sphere);
      const speed = 0.14 + (i % 3) * 0.04;
      const phase = i * 2.6;
      const base = new THREE.Vector3(...spec.pos);
      animatables.push({
        update(t) {
          sphere.position.set(
            base.x + Math.sin(t * speed + phase) * 0.35,
            base.y + Math.sin(t * speed * 1.3 + phase * 1.7) * 0.25,
            base.z + Math.cos(t * speed * 0.8 + phase) * 0.3
          );
        },
      });
    });

    /* ============ Thin glowing circuit-board structures ============= */
    const traceMat = new THREE.MeshStandardMaterial({
      color: 0x0c1526,
      metalness: 0.85,
      roughness: 0.35,
      emissive: PALETTE.electric,
      emissiveIntensity: 0.22,
      envMapIntensity: 0.8,
    });
    disposables.push(traceMat);

    const padMat = new THREE.MeshStandardMaterial({
      color: 0x16233f,
      metalness: 0.9,
      roughness: 0.3,
      emissive: PALETTE.cyan,
      emissiveIntensity: 0.3,
    });
    disposables.push(padMat);

    function buildCircuit(points: [number, number, number][], baseZ: number) {
      const group = new THREE.Group();
      const path = new THREE.CurvePath<THREE.Vector3>();
      const segGeo = new THREE.BoxGeometry(1, 0.022, 0.022);
      const padGeo = new THREE.SphereGeometry(0.055, 10, 10);
      disposables.push(segGeo, padGeo);
      const dir = new THREE.Vector3();
      const xAxis = new THREE.Vector3(1, 0, 0);
      for (let i = 0; i < points.length - 1; i++) {
        const a = new THREE.Vector3(points[i][0], points[i][1], baseZ);
        const b = new THREE.Vector3(points[i + 1][0], points[i + 1][1], baseZ);
        const seg = new THREE.Mesh(segGeo, traceMat);
        dir.subVectors(b, a);
        seg.scale.x = dir.length();
        seg.position.copy(a).addScaledVector(dir, 0.5);
        seg.quaternion.setFromUnitVectors(xAxis, dir.clone().normalize());
        group.add(seg);
        path.add(new THREE.LineCurve3(a, b));
      }
      for (const p of points) {
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(p[0], p[1], baseZ);
        group.add(pad);
      }
      // glowing pulse that travels back and forth along the circuit
      const pulseMat = new THREE.MeshBasicMaterial({ color: PALETTE.cyan });
      disposables.push(pulseMat);
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), pulseMat);
      group.add(pulse);
      disposables.push(pulse.geometry);
      const dur = 7 + Math.random() * 5;
      const phase = Math.random() * 10;
      const tmp = new THREE.Vector3();
      animatables.push({
        update(t) {
          const u = Math.abs((fract(t / dur + phase) * 2) - 1); // ping-pong 0..1..0
          path.getPointAt(u, tmp);
          pulse.position.copy(tmp);
          pulseMat.opacity = 0.4 + 0.6 * Math.abs(Math.sin(u * Math.PI));
          pulseMat.transparent = true;
        },
      });
      return group;
    }

    sceneRoot.add(
      buildCircuit(
        [
          [-10.6, -5.4, 0],
          [-8.2, -5.4, 0],
          [-8.2, -3.9, 0],
          [-6.1, -3.9, 0],
          [-6.1, -2.6, 0],
        ],
        -0.5
      )
    );
    sceneRoot.add(
      buildCircuit(
        [
          [5.2, 2.1, 0],
          [7.4, 2.1, 0],
          [7.4, 3.6, 0],
          [9.9, 3.6, 0],
        ],
        -2.5
      )
    );
    sceneRoot.add(
      buildCircuit(
        [
          [8.2, -4.9, 0],
          [10.1, -4.9, 0],
          [10.1, -3.2, 0],
          [11.4, -3.2, 0],
          [11.4, -1.9, 0],
        ],
        -5.5
      )
    );
    sceneRoot.add(
      buildCircuit(
        [
          [-11.2, 0.4, 0],
          [-9.0, 0.4, 0],
          [-9.0, 1.8, 0],
          [-11.6, 1.8, 0],
        ],
        -7.5
      )
    );

    /* ========= Floating nodes connected with elegant lines ========== */
    const nodeRng = mulberry32(1337);
    const NODE_COUNT = 44;
    const nodePositions: THREE.Vector3[] = [];
    let guard = 0;
    while (nodePositions.length < NODE_COUNT && guard < 4000) {
      guard++;
      const x = (nodeRng() * 2 - 1) * 13.5;
      const y = (nodeRng() * 2 - 1) * 7.5;
      const z = -3 - nodeRng() * 11;
      // keep the central UI area clean
      if (Math.abs(x) < 3.4 && Math.abs(y) < 2.8) continue;
      nodePositions.push(new THREE.Vector3(x, y, z));
    }

    // connections between nearby nodes
    const linePairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
    const linePts: number[] = [];
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < 4.4 && linePairs.length < 70) {
          linePairs.push([nodePositions[i], nodePositions[j]]);
          linePts.push(
            nodePositions[i].x, nodePositions[i].y, nodePositions[i].z,
            nodePositions[j].x, nodePositions[j].y, nodePositions[j].z
          );
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePts, 3));
    disposables.push(lineGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x2f5fd0,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposables.push(lineMat);
    sceneRoot.add(new THREE.LineSegments(lineGeo, lineMat));

    // nodes as soft glowing points
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        nodePositions.flatMap((p) => [p.x, p.y, p.z]),
        3
      )
    );
    const nodeScales = new Float32Array(nodePositions.length);
    for (let i = 0; i < nodePositions.length; i++) nodeScales[i] = 2.2 + nodeRng() * 2.4;
    nodeGeo.setAttribute("aScale", new THREE.BufferAttribute(nodeScales, 1));
    disposables.push(nodeGeo);
    const nodeMat = new THREE.PointsMaterial({
      color: 0x7dd8ff,
      size: 0.09,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposables.push(nodeMat);
    sceneRoot.add(new THREE.Points(nodeGeo, nodeMat));

    // soft light pulses traveling along the connections (ping-pong = seamless)
    const pulseGeo = new THREE.SphereGeometry(0.05, 10, 10);
    disposables.push(pulseGeo);
    for (let k = 0; k < 9; k++) {
      const pair = linePairs[Math.floor(nodeRng() * linePairs.length)];
      if (!pair) break;
      const [a, b] = pair;
      const color = k % 3 === 0 ? 0x9fe8ff : 0x6ea8ff;
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      disposables.push(mat);
      const dot = new THREE.Mesh(pulseGeo, mat);
      sceneRoot.add(dot);
      const dur = 5 + nodeRng() * 6;
      const phase = nodeRng() * 10;
      animatables.push({
        update(t) {
          const u = Math.abs(fract(t / dur + phase) * 2 - 1);
          dot.position.lerpVectors(a, b, u);
          mat.opacity = 0.15 + 0.75 * Math.sin(u * Math.PI);
        },
      });
    }

    /* ================= Drifting code particles ======================= */
    const PARTICLE_COUNT = 620;
    const pRng = mulberry32(9021);
    const pPos = new Float32Array(PARTICLE_COUNT * 3);
    const pScale = new Float32Array(PARTICLE_COUNT);
    const pSpeed = new Float32Array(PARTICLE_COUNT);
    const pPhase = new Float32Array(PARTICLE_COUNT);
    const pColor = new Float32Array(PARTICLE_COUNT * 3);
    const cCyan = new THREE.Color(0x4fd8f0);
    const cBlue = new THREE.Color(0x4f7ff0);
    const cViolet = new THREE.Color(0x9b7bf5);
    const cGold = new THREE.Color(0xe8c56a);
    const cWhite = new THREE.Color(0xdfe8ff);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pPos[i * 3] = (pRng() * 2 - 1) * 15;
      pPos[i * 3 + 1] = (pRng() * 2 - 1) * 8;
      pPos[i * 3 + 2] = -9 + pRng() * 13;
      pScale[i] = 0.5 + Math.pow(pRng(), 2.2) * 2.6; // mostly tiny, a few larger
      pSpeed[i] = 0.06 + pRng() * 0.16;
      pPhase[i] = pRng() * Math.PI * 2;
      const r = pRng();
      const c = r < 0.3 ? cCyan : r < 0.6 ? cBlue : r < 0.78 ? cViolet : r < 0.83 ? cGold : cWhite;
      pColor[i * 3] = c.r;
      pColor[i * 3 + 1] = c.g;
      pColor[i * 3 + 2] = c.b;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    particleGeo.setAttribute("aScale", new THREE.BufferAttribute(pScale, 1));
    particleGeo.setAttribute("aSpeed", new THREE.BufferAttribute(pSpeed, 1));
    particleGeo.setAttribute("aPhase", new THREE.BufferAttribute(pPhase, 1));
    particleGeo.setAttribute("aColor", new THREE.BufferAttribute(pColor, 3));
    disposables.push(particleGeo);
    const particleMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: dpr },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(particleMat);
    const particles = new THREE.Points(particleGeo, particleMat);
    sceneRoot.add(particles);
    animatables.push({
      update(t) {
        particleMat.uniforms.uTime.value = t;
      },
    });

    /* ================= Holographic panels ============================ */
    const holoSpecs: Array<{
      pos: [number, number, number];
      rot: [number, number, number];
      size: [number, number];
      color: number;
      opacity: number;
    }> = [
      { pos: [-8.8, -5.0, -2.0], rot: [0.05, 0.5, -0.06], size: [2.7, 1.65], color: 0x38bdf8, opacity: 0.55 },
      { pos: [8.9, 4.6, -3.0], rot: [-0.04, -0.55, 0.05], size: [2.4, 1.5], color: 0x8b5cf6, opacity: 0.45 },
      { pos: [-3.2, 6.9, -10.0], rot: [0.1, 0.2, 0.03], size: [2.0, 1.25], color: 0x3b82f6, opacity: 0.4 },
      { pos: [11.6, -2.7, -7.0], rot: [0.03, -0.7, -0.04], size: [1.8, 1.1], color: 0x22d3ee, opacity: 0.4 },
      { pos: [-11.8, 4.4, -9.0], rot: [0.06, 0.6, 0.05], size: [1.7, 1.05], color: 0x60a5fa, opacity: 0.35 },
    ];
    const holoGeo = new THREE.PlaneGeometry(1, 1);
    disposables.push(holoGeo);
    holoSpecs.forEach((spec, i) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: HOLO_VERT,
        fragmentShader: HOLO_FRAG,
        uniforms: {
          uTime: { value: i * 3.1 },
          uOpacity: { value: spec.opacity },
          uColor: { value: new THREE.Color(spec.color) },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      disposables.push(mat);
      const panel = new THREE.Mesh(holoGeo, mat);
      panel.position.set(...spec.pos);
      panel.scale.set(spec.size[0], spec.size[1], 1);
      panel.rotation.set(...spec.rot);
      sceneRoot.add(panel);

      const baseOpacity = spec.opacity;
      const phase = i * 2.3;
      animatables.push({
        update(t) {
          mat.uniforms.uTime.value = t;
          mat.uniforms.uOpacity.value = baseOpacity * (0.72 + 0.28 * Math.sin(t * 0.25 + phase));
        },
      });
    });

    /* ============ Large subtle structures in the far background ====== */
    const farIcoGeo = new THREE.IcosahedronGeometry(11, 1);
    disposables.push(farIcoGeo);
    const farIcoMat = new THREE.MeshBasicMaterial({
      color: 0x2b4a9e,
      wireframe: true,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
    });
    disposables.push(farIcoMat);
    const farIco = new THREE.Mesh(farIcoGeo, farIcoMat);
    farIco.position.set(-12, -5, -24);
    sceneRoot.add(farIco);

    const farIco2Geo = new THREE.IcosahedronGeometry(15, 1);
    disposables.push(farIco2Geo);
    const farIco2 = new THREE.Mesh(farIco2Geo, farIcoMat);
    farIco2.position.set(13, 7, -30);
    farIco2.scale.setScalar(1.35);
    sceneRoot.add(farIco2);

    const ringGeo = new THREE.TorusGeometry(7, 0.025, 8, 140);
    disposables.push(ringGeo);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x3b6fd8,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposables.push(ringMat);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(11, -6, -16);
    ring.rotation.set(1.1, 0.5, 0.3);
    sceneRoot.add(ring);

    animatables.push({
      update(t) {
        farIco.rotation.y = t * 0.012;
        farIco.rotation.x = 0.4 + Math.sin(t * 0.02) * 0.06;
        farIco2.rotation.y = -t * 0.009;
        farIco2.rotation.z = t * 0.006;
        ring.rotation.z = 0.3 + t * 0.02;
      },
    });

    /* ================= Post-processing (subtle bloom) ================ */
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(dpr);
    composer.setSize(container.clientWidth, container.clientHeight);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.32, // strength — deliberately subtle
      0.75, // radius
      0.78  // threshold — only bright highlights bloom
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    /* ============ Gentle parallax + cinematic render loop ============ */
    const mouse = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    let paused = document.hidden;
    const onVisibility = () => {
      paused = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const clock = new THREE.Clock();
    let rafId = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderFrame = () => {
      const t = clock.getElapsedTime();
      for (const a of animatables) a.update(t);

      // slow breathing light intensities — no flashing, just atmosphere
      cyanLight.intensity = 55 * (0.85 + 0.15 * Math.sin(t * 0.21));
      violetLight.intensity = 65 * (0.85 + 0.15 * Math.sin(t * 0.17 + 2.1));

      // very subtle camera drift + cursor parallax
      const targetX = Math.sin(t * 0.043) * 0.45 + mouse.x * 0.55;
      const targetY = Math.sin(t * 0.057 + 1.3) * 0.28 - mouse.y * 0.35;
      camera.position.x += (targetX - camera.position.x) * 0.025;
      camera.position.y += (targetY - camera.position.y) * 0.025;
      camera.lookAt(0, 0, 0);

      composer.render();
    };

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      if (paused) return;
      renderFrame();
    };

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.setSize(w, h);
      if (reduceMotion) renderFrame();
    };
    window.addEventListener("resize", onResize);

    if (reduceMotion) {
      // single static frame — still beautiful, zero motion
      renderFrame();
    } else {
      tick();
    }

    /* ============================== Cleanup ========================== */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments) {
          obj.geometry?.dispose?.();
        }
      });
      for (const d of disposables) d.dispose();
      pmrem.dispose();
      envTexture.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ background: "#030712" }}
    >
      {/* radial vignette: darkest at the center so dashboard UI stays readable */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 58% 52% at 50% 50%, rgba(3,7,18,0.9) 0%, rgba(3,7,18,0.55) 46%, rgba(3,7,18,0) 80%)",
        }}
      />
      {/* soft top/bottom fades to ground the layout */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{ background: "linear-gradient(to bottom, rgba(3,7,18,0.55), transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{ background: "linear-gradient(to top, rgba(3,7,18,0.65), transparent)" }}
      />
    </div>
  );
}









