import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import snesIcon from "../../assets/icons/snes-0.svg";
import switchIcon from "../../assets/icons/nintendo-switch-0.svg";
import pcIcon from "../../assets/icons/windowsflat-0.svg";
import playstationIcon from "../../assets/icons/playstation-0.svg";
import { TurnstileWidget } from "../auth/TurnstileWidget";
import { useAuth } from "../auth/AuthProvider";
import { ArrowIcon, BoltIcon, PlayIcon, RadioIcon } from "../components/Icons";
import { normalizeSteamStoreUrl, steamSearchUrl, submitGameSuggestion, useGamingRotation } from "../gaming/client";
import { GAMING_RUMBLE_URL, GAMING_SCHEDULE, type GamingRotationItem } from "../gaming/rotation";
import { useMotionGate } from "../hooks/useMotionGate";
import "../styles/gaming.css";

type SuggestionErrors = Partial<Record<"gameTitle" | "steamUrl" | "pitch" | "verification", string>>;

export function GamingPage() {
  const managedRotation = useGamingRotation();
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
      <GamingHeroField />
      <div className="container gaming-hero__layout">
        <div className="gaming-hero__copy">
          <p className="gaming-eyebrow"><i /> Third Railify / gaming channel</p>
          <div className="gaming-hero__title-lock">
            <h1 id="gaming-title"><small>Third Railify</small><span>Gaming</span></h1>
          </div>
          <p className="gaming-hero__lede">A live managed rotation. Four weekly sessions. One green signal with absolutely no respect for the sensible route.</p>
          <div className="gaming-actions">
            <a className="gaming-button gaming-button--primary" href={GAMING_RUMBLE_URL} target="_blank" rel="noopener noreferrer">Watch Third Railify Gaming <PlayIcon /><span className="sr-only"> (opens in a new tab)</span></a>
            <a className="gaming-button gaming-button--secondary" href="#rotation">Current rotation <ArrowIcon /></a>
          </div>
          <GamingSchedule compact />
        </div>
        <GamingRotationDeck items={managedRotation.items} state={managedRotation.state} />
      </div>
      <div className="gaming-hero__ticker" aria-hidden="true"><span>TRG / SESSION ROUTER</span><i /><span>{managedRotation.state === "ready" ? `${String(managedRotation.items.length).padStart(2, "0")} TITLES IN ROTATION` : managedRotation.state === "loading" ? "READING ROTATION" : managedRotation.state === "empty" ? "ROTATION OPEN" : "SIGNAL UNAVAILABLE"}</span><i /><span>{String(GAMING_SCHEDULE.length).padStart(2, "0")} WEEKLY SESSIONS</span><i /><strong>PLAY / BROADCAST / REPEAT</strong></div>
    </section>

    <section ref={about.ref} className={`gaming-about${about.active ? " is-active" : ""}`} data-motion={about.active ? "active" : "static"} aria-labelledby="gaming-about-title">
      <div className="container gaming-about__layout">
        <div className="gaming-section-copy">
          <p className="gaming-eyebrow">About / another rail entirely</p>
          <h2 id="gaming-about-title">Same signal.<br /><span>Different collision.</span></h2>
          <p>Third Railify Gaming is the gaming arm of the show: live sessions, rotating worlds, co-op panic, solo detours, and the community watching a perfectly reasonable plan become evidence.</p>
          <dl className="gaming-about__facts"><div><dt>Format</dt><dd>Live play</dd></div><div><dt>Rotation</dt><dd>{managedRotation.state === "ready" ? `${managedRotation.items.length} titles` : managedRotation.state === "empty" ? "Queue open" : "Managed live"}</dd></div><div><dt>Destination</dt><dd>Rumble</dd></div></dl>
        </div>
        <GamingSessionLoop />
      </div>
    </section>

    <section ref={rotation.ref} id="rotation" className={`gaming-rotation${rotation.active ? " is-active" : ""}`} data-motion={rotation.active ? "active" : "static"} aria-labelledby="gaming-rotation-title">
      <div className="container gaming-section-heading">
        <div><p className="gaming-eyebrow">Loaded now / Admin-managed programming</p><h2 id="gaming-rotation-title">Current <span>rotation.</span></h2></div>
        <p>The names below are the live programming labels. Store links appear only where the exact Steam catalogue match has been verified.</p>
      </div>
      {managedRotation.state === "ready" ? <div className="container gaming-rotation__grid">{managedRotation.items.map((item) => <RotationCard key={item.id} item={item} />)}</div> : <div className="container gaming-rotation__state" role="status"><BoltIcon /><h3>{managedRotation.state === "loading" ? "Loading Current Rotation" : managedRotation.state === "empty" ? "Rotation queue open" : "Current Rotation unavailable"}</h3><p>{managedRotation.state === "loading" ? "Reading the live Gaming programming authority." : managedRotation.state === "empty" ? "No games are configured in Current Rotation right now." : "The managed Gaming authority could not be reached. The historical hardcoded list is not being substituted."}</p>{managedRotation.state === "unavailable" && <button type="button" className="gaming-button gaming-button--secondary" onClick={() => void managedRotation.retry()}>Try again</button>}</div>}
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
        <header className="gaming-close__header"><p className="gaming-eyebrow"><i /> Next session / queue open</p><span>THIRD RAILIFY / GAMING</span></header>
        <div className="gaming-close__layout">
          <div className="gaming-close__copy">
            <h2 id="gaming-close-title">Controllers ready.<br /><em>Good judgement pending.</em></h2>
            <p>Catch the Gaming signal on Rumble, or put another title into the request queue.</p>
            <div className="gaming-actions"><a className="gaming-button gaming-button--primary" href={GAMING_RUMBLE_URL} target="_blank" rel="noopener noreferrer">Watch on Rumble <PlayIcon /><span className="sr-only"> (opens in a new tab)</span></a><a className="gaming-button gaming-button--secondary" href="#suggest">Suggest a game <ArrowIcon /></a></div>
          </div>
          <div className="gaming-close__console" aria-hidden="true"><span className="gaming-close__orbit" /><span className="gaming-close__orbit gaming-close__orbit--inner" /><div className="gaming-close__controller"><GamingControllerGlyph /></div><span className="gaming-close__console-label">PLAYER / YOU</span><span className="gaming-close__console-caption">TAKE THE NEXT TURN</span></div>
        </div>
        <footer className="gaming-close__footer"><span>SOLO DETOURS. CO-OP CHAOS.</span><div aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div><span>YOUR NEXT SESSION STARTS HERE <ArrowIcon /></span></footer>
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

type RotationState = ReturnType<typeof useGamingRotation>["state"];

function GamingRotationDeck({ items, state }: { items: GamingRotationItem[]; state: RotationState }) {
  const ready = state === "ready";
  const slots = ready ? items.slice(0, 4) : [];
  const status = ready ? "Rotation online" : state === "loading" ? "Reading rotation" : state === "empty" ? "Rotation open" : "Signal unavailable";
  const summary = ready ? `Current Gaming rotation: ${items.length} titles.` : `Current Gaming rotation: ${status.toLowerCase()}.`;
  return <div className="gaming-deck" role="img" aria-label={summary} data-state={state} key={state}>
    <div aria-hidden="true">
      <header className="gaming-deck__header"><div><span>TRG / SESSION ROUTER</span><h2>Rotation deck<span> / 01</span></h2></div><span className="gaming-deck__indicator"><i />{ready ? "INPUT READY" : "STANDBY"}</span></header>
      <div className="gaming-deck__routing">
        <div className="gaming-deck__inputs"><p className="gaming-deck__label">01 / CURRENT ROTATION</p>
          <div className="gaming-deck__slots">{slots.map((game, index) => <div className="gaming-deck__slot" key={game.id} style={{ "--slot": index } as CSSProperties}><span>{String(index + 1).padStart(2, "0")}</span><b title={game.title}>{game.title}</b><i /><svg viewBox="0 0 100 20" preserveAspectRatio="none" focusable="false"><path pathLength="1" d="M0 10H100" vectorEffect="non-scaling-stroke" /></svg></div>)}
            {!ready && <div className="gaming-deck__neutral"><span>{state === "loading" ? "Awaiting managed titles" : state === "empty" ? "Room for the next game" : "Rotation feed unavailable"}</span><small>{state === "loading" ? "Reading the current lineup..." : state === "empty" ? "The next lineup starts here." : "You can still watch on Rumble."}</small></div>}
          </div>
          <span className="gaming-deck__queue">{items.length > 4 && ready ? `+${items.length - 4} QUEUED` : "MANAGED GAME ROTATION"}</span>
        </div>
        <div className="gaming-deck__core"><p className="gaming-deck__label">02 / SESSION CORE</p><div className="gaming-deck__count"><GamingControllerGlyph /><strong>{ready ? String(items.length).padStart(2, "0") : state === "empty" ? "00" : "\u2014"}</strong><span>{ready ? "TITLES ONLINE" : "TITLES / STANDBY"}</span></div><b className="gaming-deck__status">{status}</b></div>
      </div>
      <div className="gaming-deck__output"><span className="gaming-deck__output-port" /><div><span className="gaming-deck__label">03 / BROADCAST DESTINATION</span><strong>RUMBLE <span>/ GAMING</span></strong></div><svg viewBox="0 0 180 36" focusable="false"><path d="M0 18H32l5-4 6 8 7-19 8 30 8-25 7 18 6-8h20l6-5 6 10 6-8 6 3h57" pathLength="1" /></svg><span className="gaming-deck__destination">CHANNEL OUTPUT</span></div>
      <footer className="gaming-deck__footer"><span>ROTATION / SESSION / SIGNAL</span><span>THIRD RAILIFY GAMING</span></footer>
    </div>
  </div>;
}

function GamingHeroField() {
  return <div className="gaming-hero-field" aria-hidden="true"><div className="gaming-hero-field__grid" /><div className="gaming-hero-field__plane" /><svg viewBox="0 0 1600 900" preserveAspectRatio="none" focusable="false"><g className="gaming-hero-field__curves"><path d="M-80 780C360 780 420 870 800 800S1100 620 1680 700" /><path d="M-80 850C380 850 450 930 860 850S1150 700 1680 770" /><path d="M700 -40C1000 80 1220 -20 1680 180" /></g><path className="gaming-hero-field__signal" pathLength="1" d="M-80 780C360 780 420 870 800 800S1100 620 1680 700" /><g className="gaming-hero-field__nodes"><circle cx="800" cy="800" r="3" /><circle cx="1400" cy="700" r="3" /></g></svg></div>;
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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [titleWrapped, setTitleWrapped] = useState(false);
  useEffect(() => {
    const title = titleRef.current;
    if (!title) return;
    const measure = () => setTitleWrapped(title.getBoundingClientRect().height > parseFloat(getComputedStyle(title).lineHeight) * 1.5);
    const observer = new ResizeObserver(measure);
    observer.observe(title);
    measure();
    return () => observer.disconnect();
  }, [item.title]);
  const platformIcon = /\b(snes|super nintendo|super famicom)\b/i.test(item.platform) ? snesIcon
    : /\bswitch\b/i.test(item.platform) ? switchIcon
    : /\b(pc|windows)\b/i.test(item.platform) ? pcIcon
    : /\b(playstation|ps[1-5])\b/i.test(item.platform) ? playstationIcon : null;
  const [coverFailed, setCoverFailed] = useState(false);
  const [artworkShape, setArtworkShape] = useState<"pending" | "poster" | "landscape">("pending");
  const verifiedCover = Boolean(item.artworkUrl && !coverFailed);
  return <article className={`gaming-card gaming-card--${item.visual}`} data-cover={verifiedCover ? "verified" : "fallback"} data-artwork-shape={verifiedCover ? artworkShape : "fallback"}>
    <div className="gaming-card__visual">
      {verifiedCover ? <>
        <span className="gaming-card__artwork-backdrop" aria-hidden="true"><img src={item.artworkUrl!} alt="" loading="lazy" decoding="async" /></span>
        <img className="gaming-card__cover" src={item.artworkUrl!} alt={`${item.title} cover artwork`} width="600" height="900" loading="lazy" decoding="async" onLoad={(event) => setArtworkShape(event.currentTarget.naturalWidth > event.currentTarget.naturalHeight ? "landscape" : "poster")} onError={() => setCoverFailed(true)} />
      </> : <GamingFallbackArt item={item} />}
      <span className="gaming-card__scan" aria-hidden="true" />
      <span className="gaming-card__index">{item.index} / ACTIVE ROTATION</span>
      <span className="gaming-card__status"><i /> IN ROTATION</span>
    </div>
    <div className="gaming-card__body" data-title-wrapped={titleWrapped}>
      <p>{item.genre}</p><h3 ref={titleRef}>{item.title}</h3><span className="gaming-card__platform">{platformIcon && <span className="gaming-card__platform-icon" aria-hidden="true" style={{ maskImage: `url("${platformIcon}")`, WebkitMaskImage: `url("${platformIcon}")` }} />}{item.platform}</span><p className="gaming-card__description">{item.description}</p>
      {(item.steam||item.igdb)&&<footer className="gaming-card__providers">{item.steam&&<div><a href={item.steam.storeUrl} target="_blank" rel="noopener noreferrer">Official Steam listing <ArrowIcon /><span className="sr-only"> for {item.title} (opens in a new tab)</span></a><small>APP {item.steam.appId} / VERIFIED</small></div>}{item.igdb&&<div><a href={item.igdb.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.title} on IGDB (opens in a new tab)`}>IGDB listing <ArrowIcon /></a><small>IGDB {item.igdb.id} / VERIFIED</small></div>}</footer>}
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
  return <div className="gaming-queue-field" aria-hidden="true"><span className="gaming-queue-field__grid" /><svg viewBox="0 0 1400 540" preserveAspectRatio="none"><path pathLength="1" d="M-50 412H218L290 338H524L611 247H832L901 180h232l88-93h230"/><path pathLength="1" d="M-20 475h330l56-55h285l70-73h273l61-64h382"/></svg></div>;
}

function GamingControllerGlyph() {
  return <svg viewBox="0 0 64 42" focusable="false" aria-hidden="true"><path d="M20 8h24c8 0 13 6 15 15l2 10c1 5-5 8-8 4l-8-9H19l-8 9c-3 4-9 1-8-4l2-10C7 14 12 8 20 8Z"/><path d="M18 15v10M13 20h10"/><circle cx="44" cy="17" r="2"/><circle cx="50" cy="23" r="2"/></svg>;
}
