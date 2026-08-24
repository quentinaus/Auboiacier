"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ *
 *  RÉGLAGES DU DÉGRADÉ — modifie uniquement ce bloc
 * ------------------------------------------------------------------ */
export const SHADER_CONFIG = {
  /** Les trois couleurs mélangées, en hexadécimal. */
  colors: ["#ff4aba", "#db9f88", "#6e72e1"],

  /** Vitesse du mouvement. 0 = figé, 0.15 = lent, 0.6 = rapide. */
  speed: 0.33,

  /** Luminosité générale. 1 = neutre, 1.3 = éclatant, 0.8 = assourdi. */
  brightness: 1.3,

  /** Douceur des transitions. Bas = zones franches, haut = fondu très doux.
   *  Plage utile : 0.6 (contrasté) à 2.5 (très fondu). */
  softness: 1.35,

  /** Taille des zones de couleur. Bas = grandes plages, haut = plus de zones.
   *  Plage utile : 0.6 à 2.0. */
  scale: 1.0,

  /** Intensité du grain. 0 = lisse, 0.12 = très granuleux. */
  grain: 0.055,

  /** Amplitude de l'ondulation. 0 = dégradé net, 0.5 = très ondulé. */
  waviness: 0.22,
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
uniform float uSoftness;
uniform float uScale;
uniform float uGrain;
uniform float uWaviness;
uniform float uBrightness;

// Bruit simplex 2D (Ashima Arts, domaine public) — sert uniquement à faire
// onduler doucement les centres de couleur, jamais à texturer directement.
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

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * uScale;

  float t = uTime;

  // Ondulation douce du point observé : le dégradé respire sans se marbrer.
  p += uWaviness * vec2(snoise(p * 0.7 + t * 0.20),
                        snoise(p * 0.7 + vec2(4.3, 1.9) - t * 0.17));

  // Trois foyers de couleur en déplacement lent sur des trajectoires ouvertes.
  vec2 c0 = vec2(-0.45 + 0.30 * sin(t * 0.51),
                  0.32 + 0.22 * cos(t * 0.43));
  vec2 c1 = vec2( 0.48 + 0.26 * cos(t * 0.37),
                  0.18 + 0.30 * sin(t * 0.59));
  vec2 c2 = vec2( 0.05 + 0.34 * sin(t * 0.29 + 1.7),
                 -0.42 + 0.24 * cos(t * 0.47 + 0.8));

  // Pondération par distance inverse : un mélange continu, sans frontière.
  float e = 2.0 * uSoftness;
  float w0 = 1.0 / (pow(dot(p - c0, p - c0), e * 0.5) + 0.012);
  float w1 = 1.0 / (pow(dot(p - c1, p - c1), e * 0.5) + 0.012);
  float w2 = 1.0 / (pow(dot(p - c2, p - c2), e * 0.5) + 0.012);
  float sum = w0 + w1 + w2;

  vec3 col = (uColors[0] * w0 + uColors[1] * w1 + uColors[2] * w2) / sum;

  col *= uBrightness;
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
    gl.uniform1f(gl.getUniformLocation(program, "uSoftness"), SHADER_CONFIG.softness);
    gl.uniform1f(gl.getUniformLocation(program, "uScale"), SHADER_CONFIG.scale);
    gl.uniform1f(gl.getUniformLocation(program, "uGrain"), SHADER_CONFIG.grain);
    gl.uniform1f(gl.getUniformLocation(program, "uWaviness"), SHADER_CONFIG.waviness);
    gl.uniform1f(gl.getUniformLocation(program, "uBrightness"), SHADER_CONFIG.brightness);

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
      gl.uniform1f(uTime, reduceMotion ? 0 : seconds * SHADER_CONFIG.speed);
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
