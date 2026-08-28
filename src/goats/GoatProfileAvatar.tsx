import { useEffect, useState } from "react";
import type { GoatMedia } from "./types";

export function GoatProfileAvatar({ media, variant = "card" }: { media: GoatMedia | null; variant?: "card" | "detail" }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [media?.url]);

  const showFallback = !media || failed;
  return <span className={`goat-profile-avatar goat-profile-avatar--${variant}${showFallback ? " is-fallback" : ""}`} aria-hidden="true">
    {showFallback ? <span className="goat-profile-avatar__motif"><i className="goat-profile-avatar__horn goat-profile-avatar__horn--left" /><i className="goat-profile-avatar__horn goat-profile-avatar__horn--right" /><i className="goat-profile-avatar__ear goat-profile-avatar__ear--left" /><i className="goat-profile-avatar__ear goat-profile-avatar__ear--right" /><i className="goat-profile-avatar__head" /><i className="goat-profile-avatar__beard" /></span> : <img src={media.url} alt="" loading={variant === "card" ? "lazy" : "eager"} decoding="async" onError={() => setFailed(true)} />}
  </span>;
}
