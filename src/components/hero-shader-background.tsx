"use client";

import dynamic from "next/dynamic";

const ShaderGradientCanvas = dynamic(
  () => import("shadergradient").then((m) => m.ShaderGradientCanvas),
  { ssr: false }
);
const ShaderGradient = dynamic(
  () => import("shadergradient").then((m) => m.ShaderGradient),
  { ssr: false }
);

export function HeroShaderBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <ShaderGradientCanvas
        pixelDensity={1}
        fov={45}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <ShaderGradient
          control="props"
          type="plane"
          animate="on"
          uAmplitude={1}
          uDensity={1.3}
          uFrequency={5.5}
          uSpeed={0.4}
          uStrength={4}
          uTime={0}
          color1="#ff5005"
          color2="#dbba95"
          color3="#d0bce1"
          positionX={-1.4}
          positionY={0}
          positionZ={0}
          rotationX={0}
          rotationY={10}
          rotationZ={50}
          reflection={0.1}
          wireframe={false}
          lightType="3d"
          brightness={1.2}
          envPreset="city"
          grain="on"
          cAzimuthAngle={180}
          cPolarAngle={90}
          cDistance={3.6}
          cameraZoom={1}
        />
      </ShaderGradientCanvas>
    </div>
  );
}
