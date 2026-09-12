"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ *
 *  RÉGLAGES — mêmes noms que sur shadergradient.co/customize
 *  Copie-colle les valeurs depuis leur éditeur, elles s'appliquent ici.
 * ------------------------------------------------------------------ */
export const SHADER_CONFIG = {
  // Teintes d'une vraie toile allumée : un blanc chaud qui glisse vers un
  // blanc froid, sans virer au rose ni au violet.
  color1: "#ffab4d",
  color2: "#fff0d2",
  color3: "#7fa8ff",

  uSpeed: 0.35,
  uDensity: 1.3,
  uStrength: 4,

  brightness: 1,
  grain: "off" as "on" | "off",

  cDistance: 3.6,
  cameraZoom: 1,
  fov: 45,

  positionX: -1.4,
  positionY: 0,

  rotationY: 10,
  rotationZ: 50,
};
/* ------------------------------------------------------------------ */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/**
 * Portage du shader « defaults » de ShaderGradient (type plane).
 *
 * L'original déplace les sommets d'un plan 10×10 le long de leur normale,
 * puis colore chaque fragment ainsi :
 *
 *   mix(mix(color1, color2, smoothstep(-3.0, 3.0, vPos.x)), color3, vPos.z)
 *
 * Comme la caméra regarde le plan de face (cPolarAngle 90, cAzimuthAngle 180),
 * on peut retrouver le point du plan visé par chaque pixel sans passer par une
 * scène 3D : c'est ce qui rend ce rendu insensible au défilement, là où la
 * librairie d'origine cessait de dessiner.
 *
 * cnoise est le bruit de Perlin classique repris tel quel de leur source.
 */
const FRAG = `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform float uDensity;
uniform float uStrength;
uniform float uBrightness;
uniform float uGrain;
uniform float uHalfHeight;
uniform vec2  uOffset;
uniform float uRotZ;
uniform float uRotY;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

float grainAt(vec2 uv) {
  return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
}

// three.js mélange les couleurs en espace linéaire puis réencode en sRGB.
// Sans ces deux conversions, le mélange dérive vers des teintes parasites.
vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toSRGB(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

/** Déplacement du sommet, repris à l'identique du vertex shader d'origine. */
float displacement(vec2 planePos, float t) {
  vec3 n = vec3(0.43 * uDensity * planePos.x + t,
                0.43 * uDensity * planePos.y + t,
                t);
  return 0.75 * cnoise(n) * uStrength;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / max(uResolution.y, 1.0);

  // Pixel écran -> point du monde sur le plan de la caméra.
  vec2 world = vec2((uv.x - 0.5) * 2.0 * uHalfHeight * aspect,
                    (uv.y - 0.5) * 2.0 * uHalfHeight);

  // Monde -> repère local du plan : on annule sa position puis ses rotations.
  vec2 local = world - uOffset;
  float cz = cos(-uRotZ), sz = sin(-uRotZ);
  local = mat2(cz, -sz, sz, cz) * local;
  local.x /= max(cos(uRotY), 0.15); // rotationY : raccourci en perspective

  float t = uTime;
  float z = displacement(local, t);

  // La formule de couleur d'origine, mot pour mot, mais en espace linéaire.
  vec3 c1 = toLinear(uColor1);
  vec3 c2 = toLinear(uColor2);
  vec3 c3 = toLinear(uColor3);
  // z couvre environ [-3, 3] : tel quel il extrapole le mélange bien au-delà
  // de la palette. Chez ShaderGradient c'est l'éclairage du matériau qui
  // ramène ces valeurs ; ici on borne le facteur en douceur, ce qui donne le
  // même équilibre entre les trois couleurs sans teinte parasite.
  float mixZ = smoothstep(-2.2, 2.2, z);
  vec3 col = mix(mix(c1, c2, smoothstep(-3.0, 3.0, local.x)), c3, mixZ);

  col = toSRGB(col) * uBrightness;

  if (uGrain > 0.0) {
    col += (grainAt(gl_FragCoord.xy) - 0.5) * uGrain;
  }

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

/**
 * Ce que l'on affiche quand WebGL n'est pas disponible (vieux téléphone,
 * accélération désactivée, contexte perdu) : un dégradé fixe aux mêmes
 * couleurs. Il est posé sous le canvas, qui le recouvre dès qu'il dessine.
 * Sans lui la toile restait noire et le produit avait l'air en panne.
 */
const DEGRADE_FIXE = `linear-gradient(135deg, ${SHADER_CONFIG.color1} 0%, ${SHADER_CONFIG.color2} 48%, ${SHADER_CONFIG.color3} 100%)`;

/** Nombre d'images par seconde : inutile de chauffer le téléphone à 60. */
const IMAGES_PAR_SECONDE = 30;

/**
 * Plafond de pixels calculés par toile.
 * Ce dégradé n'a aucun détail fin : de grands aplats doux. Le calculer à la
 * définition de l'écran ne se voit pas, mais se paie — surtout quand la toile
 * déborde très largement de sa découpe, comme dans les membranes de plafond
 * lumineux, où elle faisait plus de vingt fois la surface montrée.
 */
const PIXELS_MAX = 720_000;

export function HeroShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const conteneur = conteneurRef.current;
    if (!canvas || !conteneur) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    // Pas de WebGL : on laisse voir le dégradé fixe posé dessous.
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

    const c = SHADER_CONFIG;
    const loc = (n: string) => gl.getUniformLocation(program, n);
    const uResolution = loc("uResolution");
    const uTime = loc("uTime");

    gl.uniform3fv(loc("uColor1"), hexToRgb(c.color1));
    gl.uniform3fv(loc("uColor2"), hexToRgb(c.color2));
    gl.uniform3fv(loc("uColor3"), hexToRgb(c.color3));
    gl.uniform1f(loc("uDensity"), c.uDensity);
    gl.uniform1f(loc("uStrength"), c.uStrength);
    gl.uniform1f(loc("uBrightness"), c.brightness);
    gl.uniform1f(loc("uGrain"), c.grain === "on" ? 0.07 : 0);

    // Demi-hauteur visible du plan, d'après la caméra (fov + distance + zoom).
    const halfHeight =
      (c.cDistance * Math.tan((c.fov * Math.PI) / 360)) / Math.max(c.cameraZoom, 0.05);
    gl.uniform1f(loc("uHalfHeight"), halfHeight);
    gl.uniform2f(loc("uOffset"), c.positionX, c.positionY);
    gl.uniform1f(loc("uRotZ"), (c.rotationZ * Math.PI) / 180);
    gl.uniform1f(loc("uRotY"), (c.rotationY * Math.PI) / 180);

    /* --- Quand faut-il dessiner ? ---------------------------------- *
     * Cinq de ces dégradés vivent sur la même page. Chacun ne travaille
     * que s'il est réellement à l'écran, dans un onglet au premier plan,
     * et si le visiteur n'a pas demandé « moins d'animations ».        */
    const reglageAnimations = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationsReduites = reglageAnimations.matches;
    let aLEcran = false;
    let ongletVisible = !document.hidden;

    let width = 0;
    let height = 0;

    function resize() {
      if (!canvas || !gl) return false;
      let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      // On garde la même image, calculée sur moins de pixels quand la toile est
      // grande : l'œil ne fait pas la différence sur un dégradé, la carte
      // graphique si.
      const pixels = rect.width * rect.height * dpr * dpr;
      if (pixels > PIXELS_MAX) dpr *= Math.sqrt(PIXELS_MAX / pixels);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (w === width && h === height) return false;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uResolution, w, h);
      return true;
    }

    let raf = 0;
    let dernierRendu = 0;
    const start = performance.now();
    /** Temps de la dernière image : la reprise repart d'où l'on s'était arrêté. */
    let tempsAnime = 0;

    function dessiner(secondes: number) {
      if (!gl) return;
      // Surtout pas de resize() ici : il lit getBoundingClientRect(), ce qui
      // force le navigateur à recalculer toute la mise en page. À 30 images par
      // seconde et cinq toiles sur la page des plafonds, cela faisait
      // 150 recalculs complets par seconde pendant le défilement. Un
      // ResizeObserver s'en charge, uniquement quand la taille change vraiment.
      gl.uniform1f(uTime, secondes * c.uSpeed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      // On plafonne à 30 images par seconde : l'œil n'y voit rien, la
      // batterie et le processeur graphique, si.
      if (now - dernierRendu < 1000 / IMAGES_PAR_SECONDE) return;
      dernierRendu = now;
      tempsAnime = (now - start) / 1000;
      dessiner(tempsAnime);
    }

    /** Démarre ou arrête la boucle selon l'état du moment. */
    function reglerLaBoucle() {
      const doitTourner = aLEcran && ongletVisible && !animationsReduites;
      if (doitTourner) {
        if (!raf) raf = requestAnimationFrame(frame);
        return;
      }
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      // Arrêté mais visible : on laisse une belle image fixe, pas du noir.
      if (aLEcran) dessiner(animationsReduites ? 0 : tempsAnime);
    }

    const observateur = new IntersectionObserver(
      (entrees) => {
        aLEcran = entrees.some((e) => e.isIntersecting);
        reglerLaBoucle();
      },
      // On repart un peu avant que la toile n'entre à l'écran.
      { rootMargin: "120px" }
    );
    observateur.observe(conteneur);

    function onVisibilite() {
      ongletVisible = !document.hidden;
      reglerLaBoucle();
    }
    function onReglageAnimations(e: MediaQueryListEvent) {
      animationsReduites = e.matches;
      reglerLaBoucle();
    }
    function onResize() {
      // Redessiner une fois même à l'arrêt : sinon la toile reste étirée.
      if (resize() && !raf && aLEcran) dessiner(animationsReduites ? 0 : tempsAnime);
    }

    function onLost(e: Event) {
      e.preventDefault();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    function onRestored() {
      width = 0;
      height = 0;
      reglerLaBoucle();
    }

    const observateurTaille = new ResizeObserver(() => {
      if (resize() && !raf) dessiner(tempsAnime);
    });
    observateurTaille.observe(canvas);

    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilite);
    reglageAnimations.addEventListener("change", onReglageAnimations);

    resize();
    // Première image tout de suite : la toile est éclairée dès l'affichage.
    dessiner(0);
    reglerLaBoucle();

    // En production, on rend le contexte 3D au navigateur : il n'en accepte
    // qu'une quinzaine par onglet, et la page des plafonds en ouvre cinq. Sans
    // cela, un visiteur qui va et vient entre les pages finissait par en
    // accumuler assez pour que le navigateur tue les plus anciens — écran noir
    // sur des toiles encore à l'écran. En développement on n'y touche pas :
    // React remonte les composants, et un canvas ne redonne jamais un contexte
    // neuf une fois le sien perdu.
    return () => {
      if (raf) cancelAnimationFrame(raf);
      observateurTaille.disconnect();
      observateur.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilite);
      reglageAnimations.removeEventListener("change", onReglageAnimations);
      if (process.env.NODE_ENV === "production") {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    };
  }, []);

  return (
    <div
      ref={conteneurRef}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Le filet de sécurité : visible tant que le canvas n'a rien dessiné. */}
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: DEGRADE_FIXE }} />
      <canvas ref={canvasRef} className="relative h-full w-full" />
    </div>
  );
}
