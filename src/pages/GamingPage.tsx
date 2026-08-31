import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { TurnstileWidget } from "../auth/TurnstileWidget";
import { useAuth } from "../auth/AuthProvider";
import { ArrowIcon, BoltIcon, PlayIcon, RadioIcon } from "../components/Icons";
import { normalizeSteamStoreUrl, steamSearchUrl, submitGameSuggestion } from "../gaming/client";
import { GAMING_ROTATION, GAMING_RUMBLE_URL, GAMING_SCHEDULE, type GamingRotationItem } from "../gaming/rotation";
import { useMotionGate } from "../hooks/useMotionGate";
import "../styles/gaming.css";

type SuggestionErrors = Partial<Record<"gameTitle" | "steamUrl" | "pitch" | "verification", string>>;

export function GamingPage() {
  const hero = useMotionGate<HTMLElement>();
  const about = useMotionGate<HTMLElement>();
  const rotation = useMotionGate<HTMLElement>();
  const request = useMotionGate<HTMLElement>();
  const close = useMotionGate<HTMLElement>();

  useEffect(() => {
    document.documentElement.classList.add("theme-gaming");
    return () => document.documentElement.classList.remove("theme-gaming");
  }, []);

  return <div className="gaming-page">
    <section ref={hero.ref} className={`gaming-hero${hero.active ? " is-active" : ""}`} data-motion={hero.active ? "active" : "static"} aria-labelledby="gaming-title">
      <GamingField context="hero" />
      <div className="container gaming-hero__layout">
        <div className="gaming-hero__copy">
          <p className="gaming-eyebrow"><i /> Sub-brand online / session rotation armed</p>
          <h1 id="gaming-title"><small>Third Railify</small><span>Gaming</span></h1>
          <p className="gaming-hero__lede">Four active titles. Four weekly sessions. One green signal with absolutely no respect for the sensible route.</p>
          <div className="gaming-actions">
            <a className="gaming-button gaming-button--primary" href={GAMING_RUMBLE_URL} target="_blank" rel="noopener noreferrer">Watch Third Railify Gaming <PlayIcon /><span className="sr-only"> (opens in a new tab)</span></a>
            <a className="gaming-button gaming-button--secondary" href="#rotation">Current rotation <ArrowIcon /></a>
          </div>
          <GamingSchedule compact />
        </div>
        <GamingSignalInstrument />
      </div>
      <div className="gaming-hero__ticker" aria-hidden="true"><span>INPUT LOCKED</span><i /><span>04 ACTIVE TITLES</span><i /><span>04 WEEKLY SESSIONS</span><i /><strong>THIRD RAILIFY GAMING / SIGNAL ROUTED</strong></div>
    </section>

    <section ref={about.ref} className={`gaming-about${about.active ? " is-active" : ""}`} data-motion={about.active ? "active" : "static"} aria-labelledby="gaming-about-title">
      <div className="container gaming-about__layout">
        <div className="gaming-section-copy">
          <p className="gaming-eyebrow">About / another rail entirely</p>
          <h2 id="gaming-about-title">Same signal.<br /><span>Different collision.</span></h2>
          <p>Third Railify Gaming is the gaming arm of the show: live sessions, rotating worlds, co-op panic, solo detours, and the community watching a perfectly reasonable plan become evidence.</p>
          <dl className="gaming-about__facts"><div><dt>Format</dt><dd>Live play</dd></div><div><dt>Rotation</dt><dd>Four titles</dd></div><div><dt>Destination</dt><dd>Rumble</dd></div></dl>
        </div>
        <GamingSessionLoop />
      </div>
    </section>

    <section ref={rotation.ref} id="rotation" className={`gaming-rotation${rotation.active ? " is-active" : ""}`} data-motion={rotation.active ? "active" : "static"} aria-labelledby="gaming-rotation-title">
      <div className="container gaming-section-heading">
        <div><p className="gaming-eyebrow">Loaded now / four active slots</p><h2 id="gaming-rotation-title">Current <span>rotation.</span></h2></div>
        <p>The names below are the live programming labels. Store links appear only where the exact Steam catalogue match has been verified.</p>
      </div>
      <div className="container gaming-rotation__grid">
        {GAMING_ROTATION.map((item) => <RotationCard key={item.title} item={item} />)}
      </div>
    </section>

    <section ref={request.ref} id="suggest" className={`gaming-request${request.active ? " is-active" : ""}`} data-motion={request.active ? "active" : "static"} aria-labelledby="gaming-request-title">
      <GamingField context="request" />
      <div className="container gaming-request__layout">
        <div className="gaming-request__copy">
          <p className="gaming-eyebrow">Audience input / request channel</p>
          <h2 id="gaming-request-title">Pitch the next<br /><span>derailment.</span></h2>
          <p>Send the title. Add a Steam link if you have the exact one. Make your case if the case can survive contact with the room.</p>
          <ol><li><span>01</span>Enter the game</li><li><span>02</span>Check the store listing</li><li><span>03</span>Transmit the request</li></ol>
        </div>
        <GameSuggestionForm />
      </div>
    </section>

    <section ref={close.ref} className={`gaming-close${close.active ? " is-active" : ""}`} data-motion={close.active ? "active" : "static"} aria-labelledby="gaming-close-title">
      <GamingQueueField />
      <div className="container gaming-close__inner">
        <p className="gaming-eyebrow">Next session / queue open</p>
        <span className="gaming-close__load">SESSION LOADING <i><b /></i> 76%</span>
        <h2 id="gaming-close-title">Controllers ready.<br /><em>Good judgement pending.</em></h2>
        <p>Catch the Gaming signal on Rumble, or put another title into the request queue.</p>
        <div className="gaming-actions"><a className="gaming-button gaming-button--primary" href={GAMING_RUMBLE_URL} target="_blank" rel="noopener noreferrer">Watch on Rumble <PlayIcon /><span className="sr-only"> (opens in a new tab)</span></a><a className="gaming-button gaming-button--secondary" href="#suggest">Suggest a game <ArrowIcon /></a></div>
      </div>
    </section>
  </div>;
}

function GamingSchedule({ compact = false }: { compact?: boolean }) {
  return <div className={`gaming-schedule${compact ? " gaming-schedule--compact" : ""}`} aria-label="Third Railify Gaming weekly schedule">
    <header><RadioIcon /><span>Weekly session rail</span><b>2 PM</b></header>
    <div>{GAMING_SCHEDULE.map((slot) => <span key={slot.day}><strong>{slot.day}</strong><small>{slot.time}</small><i /></span>)}</div>
  </div>;
}

function GamingSignalInstrument() {
  return <div className="gaming-instrument" aria-hidden="true">
    <header><span>TRG / ROUTING CORE</span><b><i /> SIGNAL READY</b></header>
    <div className="gaming-instrument__viewport">
      <span className="gaming-instrument__grid" />
      <svg viewBox="0 0 620 620" focusable="false">
        <circle className="gaming-instrument__orbit gaming-instrument__orbit--outer" cx="310" cy="310" r="236" />
        <circle className="gaming-instrument__orbit gaming-instrument__orbit--inner" cx="310" cy="310" r="148" />
        <path className="gaming-instrument__route gaming-instrument__route--one" pathLength="1" d="M310 310C231 235 186 178 128 118" />
        <path className="gaming-instrument__route gaming-instrument__route--two" pathLength="1" d="M310 310C394 227 438 174 500 122" />
        <path className="gaming-instrument__route gaming-instrument__route--three" pathLength="1" d="M310 310C221 390 177 433 123 500" />
        <path className="gaming-instrument__route gaming-instrument__route--four" pathLength="1" d="M310 310C394 388 443 438 503 500" />
        <path className="gaming-instrument__wave" pathLength="1" d="M72 310h54l18-38 24 76 28-102 27 127 27-88 28 46 28-42 26 26 27-73 29 134 27-108 27 63 28-21h56" />
      </svg>
      <div className="gaming-instrument__core"><BoltIcon /><small>GAMING</small><strong>04</strong><span>ACTIVE SLOTS</span></div>
      {GAMING_ROTATION.map((game, index) => <span className={`gaming-instrument__slot gaming-instrument__slot--${index + 1}`} key={game.title}><i />{game.index} / {game.title}</span>)}
      <span className="gaming-instrument__sweep" />
    </div>
    <footer><span>INPUT / 100%</span><i /><span>FRAME / LOCKED</span><i /><span>QUEUE / OPEN</span></footer>
  </div>;
}

function GamingSessionLoop() {
  return <div className="gaming-loop" aria-label="Gaming session loop: input, chaos, broadcast, repeat">
    <header><span>SESSION LOOP / CONTINUOUS</span><b>GREEN PATH</b></header>
    <div className="gaming-loop__diagram" aria-hidden="true">
      <svg viewBox="0 0 560 360" focusable="false"><path pathLength="1" d="M96 180C96 90 184 52 280 52s184 38 184 128-88 128-184 128S96 270 96 180Z" /><path className="gaming-loop__return" pathLength="1" d="M450 236c-62 83-268 86-339-4" /></svg>
      <span className="gaming-loop__node gaming-loop__node--input"><i>01</i><b>INPUT</b><small>Controller armed</small></span>
      <span className="gaming-loop__node gaming-loop__node--chaos"><i>02</i><b>CHAOS</b><small>Plan discarded</small></span>
      <span className="gaming-loop__node gaming-loop__node--broadcast"><i>03</i><b>BROADCAST</b><small>Signal outbound</small></span>
      <span className="gaming-loop__core"><GamingControllerGlyph /><b>TRG</b></span>
      <span className="gaming-loop__packet" />
    </div>
    <footer><span>SOLO + CO-OP</span><span>LIVE BY DEFAULT</span><span>REPEAT UNTIL SENSIBLE</span></footer>
  </div>;
}

function RotationCard({ item }: { item: GamingRotationItem }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const verifiedCover = Boolean(item.steam && !coverFailed);
  return <article className={`gaming-card gaming-card--${item.visual}`} data-cover={verifiedCover ? "verified" : "fallback"}>
    <div className="gaming-card__visual">
      {verifiedCover ? <img src={item.steam!.coverUrl} alt={`${item.title} cover art from the official Steam store`} width="600" height="900" loading="lazy" decoding="async" onError={() => setCoverFailed(true)} /> : <GamingFallbackArt item={item} />}
      <span className="gaming-card__scan" aria-hidden="true" />
      <span className="gaming-card__index">{item.index} / ACTIVE ROTATION</span>
      <span className="gaming-card__status"><i /> IN ROTATION</span>
    </div>
    <div className="gaming-card__body">
      <p>{item.genre}</p><h3>{item.title}</h3><span className="gaming-card__platform">PC via Steam</span><p className="gaming-card__description">{item.description}</p>
      <footer>{item.steam ? <a href={item.steam.storeUrl} target="_blank" rel="noopener noreferrer">Official Steam listing <ArrowIcon /><span className="sr-only"> for {item.steam.canonicalTitle} (opens in a new tab)</span></a> : <span>Store mapping pending verification</span>}<small>{item.steam ? `APP ${item.steam.appId} / VERIFIED` : "BRANDED ART / NO STORE LINK"}</small></footer>
    </div>
  </article>;
}

function GamingFallbackArt({ item }: { item: GamingRotationItem }) {
  const initials = item.title.split(" ").map((word) => word[0]).join("").slice(0, 3);
  return <div className="gaming-card__fallback" role="img" aria-label={`Third Railify Gaming fallback artwork for ${item.title}`}><span className="gaming-card__fallback-grid" /><i /><b>{initials}</b><small>TRG / SLOT {item.index}</small></div>;
}

function GameSuggestionForm() {
  const { account, config, csrfToken } = useAuth();
  const [gameTitle, setGameTitle] = useState("");
  const [steamUrl, setSteamUrl] = useState("");
  const [pitch, setPitch] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [errors, setErrors] = useState<SuggestionErrors>({});
  const [backendError, setBackendError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState("");
  const siteKey = config?.turnstileSiteKey || "";
  const searchUrl = useMemo(() => steamSearchUrl(gameTitle), [gameTitle]);
  const acceptToken = useCallback((token: string) => setTurnstileToken(token), []);
  const unavailable = useCallback((message: string) => setErrors((current) => ({ ...current, verification: message })), []);

  const validate = () => {
    const next: SuggestionErrors = {};
    const title = gameTitle.trim();
    if (title.length < 2 || title.length > 120) next.gameTitle = "Enter a game title between 2 and 120 characters.";
    if (steamUrl.trim() && !normalizeSteamStoreUrl(steamUrl)) next.steamUrl = "Use an exact https://store.steampowered.com/app/... URL.";
    if (pitch.trim().length > 1000) next.pitch = "Keep the pitch to 1,000 characters or fewer.";
    if (!turnstileToken) next.verification = "Complete the human verification before transmitting.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true); setBackendError("");
    try {
      const response = await submitGameSuggestion({ gameTitle: gameTitle.trim(), steamUrl: normalizeSteamStoreUrl(steamUrl), pitch: pitch.trim(), website: "", turnstileToken }, account ? csrfToken : "");
      setReceipt(response.reference);
    } catch (reason) {
      setBackendError(reason instanceof Error ? reason.message : "The request signal could not be sent. Try again.");
      setTurnstileToken(""); setResetKey((value) => value + 1);
    } finally { setBusy(false); }
  };

  if (receipt) return <div className="gaming-request__success" role="status"><span><BoltIcon /></span><p>Signal received.</p><h3>The request entered the queue.</h3><small>Reference {receipt}</small><button className="gaming-button gaming-button--secondary" type="button" onClick={() => { setReceipt(""); setGameTitle(""); setSteamUrl(""); setPitch(""); setTurnstileToken(""); setResetKey((value) => value + 1); }}>Pitch another game <ArrowIcon /></button></div>;

  return <form className="gaming-form" onSubmit={submit} noValidate>
    <header><div><span>REQUEST CHANNEL</span><b><i /> READY FOR INPUT</b></div><p>{account ? `Signed in as ${account.displayName}. Your account will be attached server-side.` : "Guest requests are welcome. No email address required."}</p></header>
    {backendError ? <div className="gaming-form__alert" role="alert">{backendError}</div> : null}
    <label className="gaming-field"><span><b>01</b> Game title <em>Required</em></span><input name="gameTitle" value={gameTitle} onChange={(event) => setGameTitle(event.target.value)} maxLength={120} autoComplete="off" aria-invalid={Boolean(errors.gameTitle)} aria-describedby={errors.gameTitle ? "gaming-title-error" : undefined} placeholder="What should enter the rotation?" />{errors.gameTitle ? <small id="gaming-title-error" role="alert">{errors.gameTitle}</small> : null}</label>
    <div className="gaming-form__steam-head"><span><b>02</b> Steam listing <em>Optional</em></span><a href={searchUrl} target="_blank" rel="noopener noreferrer" aria-label={`Search Steam for ${gameTitle.trim() || "a game"} in a new tab`}>Search Steam <ArrowIcon /></a></div>
    <label className="gaming-field gaming-field--url"><span className="sr-only">Steam Store URL</span><input name="steamUrl" type="url" inputMode="url" value={steamUrl} onChange={(event) => setSteamUrl(event.target.value)} maxLength={300} aria-invalid={Boolean(errors.steamUrl)} aria-describedby={errors.steamUrl ? "gaming-steam-error" : "gaming-steam-help"} placeholder="https://store.steampowered.com/app/..." /><small id={errors.steamUrl ? "gaming-steam-error" : "gaming-steam-help"} role={errors.steamUrl ? "alert" : undefined}>{errors.steamUrl || "Paste the exact listing. Manual title requests still work without it."}</small></label>
    <label className="gaming-field"><span><b>03</b> Why should we play it? <em>Optional</em></span><textarea name="pitch" value={pitch} onChange={(event) => setPitch(event.target.value)} maxLength={1000} rows={5} aria-invalid={Boolean(errors.pitch)} aria-describedby="gaming-pitch-count" placeholder="Make the case. Keep it sharp." /><small id="gaming-pitch-count" className={errors.pitch ? "is-error" : ""}>{errors.pitch || `${pitch.length} / 1,000 characters`}</small></label>
    <label className="gaming-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <div className="gaming-form__verification">{siteKey ? <TurnstileWidget siteKey={siteKey} action="thirdrailify-gaming-suggestion" resetKey={resetKey} onToken={acceptToken} onUnavailable={unavailable} /> : <p role="status">Human verification is not configured in this environment. Suggestions are safely unavailable.</p>}{errors.verification ? <small role="alert">{errors.verification}</small> : null}</div>
    <button className="gaming-form__submit" type="submit" disabled={busy || !siteKey}><RadioIcon />{busy ? "Transmitting…" : "Submit request"}<span>Encrypted route / Admin inbox</span></button>
  </form>;
}

function GamingField({ context }: { context: "hero" | "request" }) {
  return <div className={`gaming-field-art gaming-field-art--${context}`} aria-hidden="true"><span className="gaming-field-art__grid" /><span className="gaming-field-art__scan" /><svg viewBox="0 0 1600 800" preserveAspectRatio="xMidYMid slice" focusable="false"><path className="gaming-field-art__trace" pathLength="1" d="M-50 585C171 403 326 614 516 410S828 206 1037 402s374 66 646-126"/><path className="gaming-field-art__trace gaming-field-art__trace--two" pathLength="1" d="M-80 253C172 416 384 130 613 297s392 160 554-9 319-92 521 48"/><g><circle cx="516" cy="410" r="5"/><circle cx="1037" cy="402" r="5"/><circle cx="1331" cy="294" r="5"/></g></svg></div>;
}

function GamingQueueField() {
  return <div className="gaming-queue-field" aria-hidden="true"><span className="gaming-queue-field__grid" /><div>{Array.from({ length: 7 }, (_, index) => <i key={index} />)}</div><svg viewBox="0 0 1400 540" preserveAspectRatio="none"><path pathLength="1" d="M-50 412H218L290 338H524L611 247H832L901 180h232l88-93h230"/><path pathLength="1" d="M-20 475h330l56-55h285l70-73h273l61-64h382"/></svg></div>;
}

function GamingControllerGlyph() {
  return <svg viewBox="0 0 64 42" focusable="false" aria-hidden="true"><path d="M20 8h24c8 0 13 6 15 15l2 10c1 5-5 8-8 4l-8-9H19l-8 9c-3 4-9 1-8-4l2-10C7 14 12 8 20 8Z"/><path d="M18 15v10M13 20h10"/><circle cx="44" cy="17" r="2"/><circle cx="50" cy="23" r="2"/></svg>;
}
