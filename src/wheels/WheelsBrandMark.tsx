import { useId } from "react";
import zapUrl from "../../assets/icons/trzap-0.svg";

export function WheelsBrandMark({ className = "", label }: { className?: string; label?: string }) {
  const gradient = `wheelsZap${useId().replace(/:/g, "")}`;
  return <svg className={`wheels-brand-mark${className ? ` ${className}` : ""}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} viewBox="0 0 2454 2460" data-brand-source={zapUrl} focusable="false"><defs><linearGradient id={gradient} x1=".24" y1="0" x2=".76" y2="1"><stop offset="0" stopColor="#FFF6B5" /><stop offset=".31" stopColor="#F6D449" /><stop offset=".68" stopColor="#E5AE0B" /><stop offset="1" stopColor="#9B6300" /></linearGradient></defs><path fill={`url(#${gradient})`} d="M875.185,1122.86l-422.419,0l1277.45,-1104.7l-275.226,824.889l428.725,-0l-305.779,493.477l422.419,-0l-1277.45,1104.7l275.226,-824.889l-428.725,0l305.779,-493.477Z" /></svg>;
}
