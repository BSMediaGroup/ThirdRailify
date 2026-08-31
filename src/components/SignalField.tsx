import { useMotionGate } from "../hooks/useMotionGate";
import { BoltIcon } from "./Icons";

export function SignalField() {
  const { ref, active } = useMotionGate<HTMLDivElement>();
  return (
    <div ref={ref} className={`signal-field${active ? " is-active" : ""}`} aria-hidden="true">
      <div className="signal-field__grid" />
      <div className="signal-field__halo" />
      {[0, 1, 2].map((rail) => (
        <div className={`signal-rail signal-rail--${rail + 1}`} key={rail}>
          <span className="signal-rail__line" />
          <span className="signal-rail__pulse" />
        </div>
      ))}
      <div className="signal-station signal-station--one"><i /><span>TR / 01</span></div>
      <div className="signal-station signal-station--two"><i /><span>LIVE WIRE</span></div>
      <div className="signal-core"><BoltIcon /><span>THIRD RAIL</span></div>
      <div className="signal-scan" />
    </div>
  );
}

export type EditorialSignalVariant = "shawn" | "gina" | "friends";

export function EditorialSignalField({ variant, context }: { variant: EditorialSignalVariant; context: "hero" | "closing" }) {
  return (
    <div className={`editorial-signal editorial-signal--${variant} editorial-signal--${context}`} aria-hidden="true">
      <div className="editorial-signal__grid" />
      <div className="editorial-signal__bloom" />
      <div className="editorial-signal__beams"><i /><i /><i /></div>
      <svg className="editorial-signal__trace" viewBox="0 0 1200 700" preserveAspectRatio="none">
        {variant === "shawn" ? (
          <>
            <path className="editorial-signal__trace-ghost" d="M-40 468 C130 468 155 365 286 365 S430 530 585 430 760 272 902 347 1055 405 1240 238" />
            <path className="editorial-signal__trace-live" d="M-40 468 C130 468 155 365 286 365 S430 530 585 430 760 272 902 347 1055 405 1240 238" />
          </>
        ) : variant === "gina" ? (
          <>
            <path className="editorial-signal__trace-ghost" d="M-40 540 C132 505 205 596 324 477 S453 245 607 322 702 555 882 432 1015 240 1240 286" />
            <path className="editorial-signal__trace-live" d="M-40 540 C132 505 205 596 324 477 S453 245 607 322 702 555 882 432 1015 240 1240 286" />
          </>
        ) : (
          <>
            <path className="editorial-signal__trace-ghost" d="M-30 560 C176 526 278 414 446 382 S664 400 798 302 1030 220 1230 270" />
            <path className="editorial-signal__trace-ghost editorial-signal__trace-ghost--alt" d="M-20 164 C183 214 295 342 458 368 S688 338 830 430 1045 538 1230 475" />
            <path className="editorial-signal__trace-live" d="M-30 560 C176 526 278 414 446 382 S664 400 798 302 1030 220 1230 270" />
          </>
        )}
      </svg>
      <div className="editorial-signal__orbits"><i /><i /><i /></div>
      <div className="editorial-signal__nodes"><i /><i /><i /><i /><i /></div>
      <div className="editorial-signal__sweep" />
    </div>
  );
}
