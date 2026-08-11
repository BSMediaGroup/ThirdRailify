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
