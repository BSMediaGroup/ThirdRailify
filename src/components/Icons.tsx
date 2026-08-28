import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function BoltIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M9.1 11.12H5.61L16.16 2l-2.27 6.81h3.54l-2.53 4.07h3.49L7.84 22l2.28-6.81H6.58l2.52-4.07Z" /></svg>;
}

export function ArrowIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M5 19 19 5M8 5h11v11" /></svg>;
}

export function MenuIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

export function CloseIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

export function BagIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>;
}

export function PlayIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m9 7 8 5-8 5V7Z" /></svg>;
}

export function SearchIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></svg>;
}

export function PlusIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M12 5v14M5 12h14" /></svg>;
}

export function MinusIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M5 12h14" /></svg>;
}

export function RadioIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.5 18.5a9 9 0 0 1 0-13M18.5 5.5a9 9 0 0 1 0 13" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></svg>;
}

export function ThumbUpIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3Zm0 0 4.2-7A1.5 1.5 0 0 1 14 3.76V8h5.1a2 2 0 0 1 1.95 2.43l-1.8 8A3.3 3.3 0 0 1 16.03 21H7V10Z" /></svg>;
}

export function ThumbDownIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3Zm0 0 4.2-7A1.5 1.5 0 0 1 14 3.76V8h5.1a2 2 0 0 1 1.95 2.43l-1.8 8A3.3 3.3 0 0 1 16.03 21H7V10Z" transform="rotate(180 12 12)" /></svg>;
}

export function CopyIcon(props: IconProps) {
  return <svg {...base} {...props}><rect x="8" y="8" width="11" height="11" rx="1.5" /><path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-9A1.5 1.5 0 0 0 4 6.5v9A1.5 1.5 0 0 0 5.5 17H8" /></svg>;
}
