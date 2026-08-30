import type { CSSProperties } from "react";

type SparklingSkyTheme = "watch" | "about";

const skyRegions = [
  { count: 72, kind: "field", x: 50, y: 48, width: 98, height: 94 },
  { count: 32, kind: "cluster", x: 17, y: 24, width: 13, height: 11 },
  { count: 28, kind: "cluster", x: 79, y: 18, width: 15, height: 10 },
  { count: 22, kind: "cluster", x: 64, y: 73, width: 17, height: 12 },
  { count: 14, kind: "cluster", x: 36, y: 57, width: 10, height: 9 },
] as const;

const skyRandom = mulberry32(0x7a11f1e1);
const skyStars = skyRegions.flatMap((region, regionIndex) => Array.from({ length: region.count }, (_, index) => {
  const clustered = region.kind === "cluster";
  const angle = skyRandom() * Math.PI * 2;
  const radius = clustered ? Math.sqrt(skyRandom()) : 0;
  const x = clustered ? region.x + Math.cos(angle) * region.width * radius : 1 + skyRandom() * region.width;
  const y = clustered ? region.y + Math.sin(angle) * region.height * radius : 2 + skyRandom() * region.height;
  const shape = skyRandom() < .18 ? "cross" : "dot";
  const largeDot = shape === "dot" && skyRandom() < .09;
  return {
    key: `${regionIndex}-${index}`,
    shape,
    x: Math.min(99, Math.max(1, x)),
    y: Math.min(97, Math.max(1, y)),
    size: shape === "cross" ? 7 + skyRandom() * 8 : largeDot ? 2.1 + skyRandom() * 1.2 : .8 + skyRandom() * 1.15,
    opacity: .38 + skyRandom() * .57,
    glow: shape === "cross" ? 9 + skyRandom() * 13 : 3 + skyRandom() * 7,
    rotation: -15 + skyRandom() * 30,
    delay: -(skyRandom() * 11.3),
    duration: 3.2 + skyRandom() * 4.3,
    colorIndex: Math.floor(skyRandom() * 5),
  };
}));

function mulberry32(seed: number) {
  return () => {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

const themePalettes: Record<SparklingSkyTheme, readonly string[]> = {
  watch: ["#fff9df", "#ffd85c", "#c39cff", "#dcfbff", "#ffffff"],
  about: ["#fff9df", "#ffd85c", "#67e0e5", "#d8fff8", "#ffffff"],
};

export function SparklingSky({ theme }: { theme: SparklingSkyTheme }) {
  const palette = themePalettes[theme];
  return <div className={`sparkling-sky sparkling-sky--${theme}`} data-star-layout="seeded-clustered" aria-hidden="true">
    <span className="sparkling-sky__veil"><i /><i /><i /></span>
    <span className="sparkling-sky__starfield">
      {skyStars.map((star) => <i key={star.key} className={`sparkling-sky__star sparkling-sky__star--${star.shape}`} style={{ "--sky-x": `${star.x}%`, "--sky-y": `${star.y}%`, "--sky-size": `${star.size}px`, "--sky-opacity": star.opacity, "--sky-glow": `${star.glow}px`, "--sky-rotation": `${star.rotation}deg`, "--sky-delay": `${star.delay}s`, "--sky-duration": `${star.duration}s`, "--sky-color": palette[star.colorIndex] } as CSSProperties} />)}
    </span>
    <span className="sparkling-sky__meteors"><i /><i /><i /></span>
  </div>;
}
