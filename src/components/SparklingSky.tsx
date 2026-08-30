import type { CSSProperties } from "react";

type SparklingSkyTheme = "watch" | "about";

const skyBands = [
  { count: 76, top: 1, depth: 34, offset: 29 },
  { count: 44, top: 30, depth: 38, offset: 257 },
  { count: 24, top: 66, depth: 31, offset: 619 },
] as const;

const skyStars = skyBands.flatMap((band, bandIndex) => Array.from({ length: band.count }, (_, index) => {
  const sequence = band.offset + index;
  const globalIndex = skyBands.slice(0, bandIndex).reduce((total, item) => total + item.count, 0) + index;
  const shape = globalIndex % 9 === 0 || globalIndex % 23 === 0 ? "cross" : "dot";
  return {
    key: `${bandIndex}-${index}`,
    shape,
    x: 1 + ((sequence * 79 + index * 31 + bandIndex * 127) % 991) / 991 * 98,
    y: band.top + ((sequence * 181 + index * 53 + bandIndex * 67) % 983) / 983 * band.depth,
    size: shape === "cross" ? 7 + (sequence % 4) * 2 : sequence % 17 === 0 ? 2.4 : .9 + (sequence % 4) * .32,
    opacity: .38 + (sequence % 7) * .085,
    glow: shape === "cross" ? 9 + (sequence % 5) * 3 : 3 + (sequence % 4) * 2,
    rotation: -12 + (sequence % 7) * 4,
    delay: -((sequence * 19) % 127) / 10,
    duration: 3.4 + ((sequence * 13) % 47) / 10,
  };
}));

export function SparklingSky({ theme }: { theme: SparklingSkyTheme }) {
  return <div className={`sparkling-sky sparkling-sky--${theme}`} aria-hidden="true">
    <span className="sparkling-sky__veil"><i /><i /><i /></span>
    <span className="sparkling-sky__starfield">
      {skyStars.map((star) => <i key={star.key} className={`sparkling-sky__star sparkling-sky__star--${star.shape}`} style={{ "--sky-x": `${star.x}%`, "--sky-y": `${star.y}%`, "--sky-size": `${star.size}px`, "--sky-opacity": star.opacity, "--sky-glow": `${star.glow}px`, "--sky-rotation": `${star.rotation}deg`, "--sky-delay": `${star.delay}s`, "--sky-duration": `${star.duration}s` } as CSSProperties} />)}
    </span>
    <span className="sparkling-sky__meteors"><i /><i /><i /></span>
  </div>;
}
