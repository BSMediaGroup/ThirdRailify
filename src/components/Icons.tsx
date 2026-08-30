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

export function TrashIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></svg>;
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

export function RefreshIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M18.2 10A7 7 0 0 0 6.1 7.1L4 10M5.8 14A7 7 0 0 0 17.9 16.9L20 14" /></svg>;
}

export function MailIcon(props: IconProps) {
  return <svg {...base} {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
}

export function BackIcon(props: IconProps) { return <svg {...base} {...props}><path d="m15 18-6-6 6-6M9 12h11" /></svg>; }
export function SoundIcon({ muted = false, ...props }: IconProps & { muted?: boolean }) { return <svg {...base} {...props}><path d="M4 10v4h4l5 4V6L8 10H4Z" />{muted ? <path d="m17 10 4 4m0-4-4 4" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />}</svg>; }
export function PaletteIcon(props: IconProps) { return <svg {...base} {...props}><path d="M12 3a9 9 0 1 0 0 18h1.4a2 2 0 0 0 1.3-3.5 1.8 1.8 0 0 1 1.2-3.1H18A3 3 0 0 0 21 11a9 9 0 0 0-9-8Z" /><circle cx="7.5" cy="11" r=".8" fill="currentColor" /><circle cx="10" cy="7.5" r=".8" fill="currentColor" /><circle cx="14.5" cy="7.5" r=".8" fill="currentColor" /></svg>; }
export function FullscreenIcon(props: IconProps) { return <svg {...base} {...props}><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>; }
export function ShareIcon(props: IconProps) { return <svg {...base} {...props}><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></svg>; }
export function EditIcon(props: IconProps) { return <svg {...base} {...props}><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></svg>; }
export function CrownIcon(props: IconProps) { return <svg {...base} {...props}><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5L3 7ZM6 21h12" /></svg>; }
export function PracticeIcon(props: IconProps) { return <svg {...base} {...props}><path d="M5 6h14v12H5zM8 9h8M8 12h5" /></svg>; }
export function OfficialIcon(props: IconProps) { return <svg {...base} {...props}><path d="m12 3 3 2 3.5.5.5 3.5 2 3-2 3-.5 3.5-3.5.5-3 2-3-2-3.5-.5-.5-3.5-2-3 2-3 .5-3.5L9 5l3-2Z" /><path d="m9 12 2 2 4-4" /></svg>; }
export function ImportIcon(props: IconProps) { return <svg {...base} {...props}><path d="M12 3v12m-4-4 4 4 4-4" /><path d="M5 17v3h14v-3" /></svg>; }
export function CheckIcon(props: IconProps) { return <svg {...base} {...props}><path d="m5 12 4 4L19 6" /></svg>; }
export function EyeOffIcon(props: IconProps) { return <svg {...base} {...props}><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.8 5.2A10.7 10.7 0 0 1 12 5c5.5 0 9 7 9 7a16 16 0 0 1-2.2 3.2M6.2 6.2C4.2 7.5 3 9.4 3 12c0 0 3.5 7 9 7 1.1 0 2.1-.3 3-.7" /></svg>; }
