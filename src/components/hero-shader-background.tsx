"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ *
 *  RÉGLAGES DU DÉGRADÉ — modifie uniquement ce bloc
 * ------------------------------------------------------------------ */
export const SHADER_CONFIG = {
  /** color1 / color2 / color3 de ShaderGradient. */
  colors: ["#ff4aba", "#db9f88", "#6e72e1"],

  /** uSpeed — vitesse de l'ondulation. */
  uSpeed: 0.6,

  /** uDensity — finesse du relief. Haut = plis serrés. */
  uDensity: 1.3,

  /** uFrequency — nombre de bandes diagonales. */
  uFrequency: 5.5,

  /** uStrength — profondeur du relief, donc contraste des bandes. */
  uStrength: 4,

  /** uAmplitude — amplitude de la houle. */
  uAmplitude: 1,

  /** rotationZ — inclinaison des bandes, en degrés. */
  rotationZ: 50,

  /** brightness — luminosité générale. */
  brightness: 1.3,

  /** grain — intensité du grain. 0 = lisse, 0.12 = très marqué. */
  grain: 0.09,

  /** cameraZoom — échelle. Bas = plages larges, haut = motif resserré. */
  cameraZoom: 1,
};
/* ------------------------------------------------------------------ */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uColors[3];
uniform float uDensity;
uniform float uFrequency;
uniform float uStrength;
uniform float uAmplitude;
uniform float uRotation;
uniform float uZoom;
uniform float uGrain;
uniform float uBrightness;

// Bruit simplex 2D (Ashima Arts, domaine public) — sert de relief à la houle.
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                 + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                          dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float grainAt(vec2 uv) {
  return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
}

/** Rampe cyclique sur les trois couleurs : c'est elle qui crée les bandes. */
vec3 ramp(float x) {
  float f = fract(x) * 3.0;
  if (f < 1.0) return mix(uColors[0], uColors[1], smoothstep(0.0, 1.0, f));
  if (f < 2.0) return mix(uColors[1], uColors[2], smoothstep(0.0, 1.0, f - 1.0));
  return mix(uColors[2], uColors[0], smoothstep(0.0, 1.0, f - 2.0));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) / max(uZoom, 0.05);

  float t = uTime;

  // Inclinaison des bandes (équivalent de rotationZ sur le plan 3D).
  float a = radians(uRotation);
  vec2 rp = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;

  // Relief de la houle : deux octaves de bruit, comme le déplacement des
  // sommets du plan chez ShaderGradient.
  float n1 = snoise(rp * uDensity * 0.55 + vec2(0.0, t * 0.45));
  float n2 = snoise(rp * uDensity * 1.20 + vec2(t * 0.28, -t * 0.22));
  float relief = n1 * 0.74 + n2 * 0.26;

  // La direction diagonale domine, le relief ne fait qu'onduler les bandes :
  // c'est ce rapport qui distingue des bandes franches d'un nuage informe.
  float bands = rp.x * uFrequency * 0.30
              + relief * uStrength * 0.055
              + sin(rp.y * uFrequency * 0.16 + t * 0.4) * uAmplitude * 0.05
              + t * 0.04;

  vec3 col = ramp(bands);

  // Éclairage : les crêtes s'illuminent, les creux s'assombrissent. C'est ce
  // qui donne le volume et la saturation vive du rendu d'origine.
  float light = 0.80 + 0.42 * relief;
  col *= light * uBrightness;

  col += (grainAt(gl_FragCoord.xy) - 0.5) * uGrain;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function HeroShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Programme:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");

    const flat = SHADER_CONFIG.colors.slice(0, 3).flatMap(hexToRgb);
    gl.uniform3fv(gl.getUniformLocation(program, "uColors"), flat);
    const setF = (name: string, value: number) =>
      gl.uniform1f(gl.getUniformLocation(program, name), value);
    setF("uDensity", SHADER_CONFIG.uDensity);
    setF("uFrequency", SHADER_CONFIG.uFrequency);
    setF("uStrength", SHADER_CONFIG.uStrength);
    setF("uAmplitude", SHADER_CONFIG.uAmplitude);
    setF("uRotation", SHADER_CONFIG.rotationZ);
    setF("uZoom", SHADER_CONFIG.cameraZoom);
    setF("uGrain", SHADER_CONFIG.grain);
    setF("uBrightness", SHADER_CONFIG.brightness);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;

    function resize() {
      if (!canvas || !gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (w === width && h === height) return;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uResolution, w, h);
    }

    let raf = 0;
    const start = performance.now();

    function frame(now: number) {
      if (!gl) return;
      resize();
      const seconds = (now - start) / 1000;
      gl.uniform1f(uTime, reduceMotion ? 0 : seconds * SHADER_CONFIG.uSpeed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }

    function onLost(e: Event) {
      e.preventDefault();
      cancelAnimationFrame(raf);
    }
    function onRestored() {
      width = 0;
      height = 0;
      raf = requestAnimationFrame(frame);
    }

    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    window.addEventListener("resize", resize);

    resize();
    raf = requestAnimationFrame(frame);

    // Ne jamais détruire le contexte ici : un canvas n'en fournit qu'un seul,
    // et React remonte les composants en développement — l'écran resterait noir.
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
