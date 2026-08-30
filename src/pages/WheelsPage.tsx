import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getCreatorAccess, listPublicStages, listWheels } from "../wheels/client";
import type { StageSummary, WheelSummary } from "../wheels/types";
import { WheelsBrandMark } from "../wheels/WheelsBrandMark";
import { ArrowIcon, BoltIcon } from "../components/Icons";
import "../styles/wheels.css";
import "../styles/wheels-stage.css";

type DirectoryItem = { type: "wheel"; item: WheelSummary } | { type: "stage"; item: StageSummary };

export function WheelsPage() {
  const { account, openAuth } = useAuth();
  const [wheels, setWheels] = useState<WheelSummary[]>([]);
  const [stages, setStages] = useState<StageSummary[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([listWheels(search, sort), listPublicStages(search, sort), account ? getCreatorAccess().catch(() => null) : Promise.resolve(null)])
      .then(([wheelPayload, stagePayload, access]) => {
        if (!active) return;
        setWheels(wheelPayload.items);
        setStages(stagePayload.items);
        setCanCreate(Boolean(access?.canCreate));
        setError("");
      })
      .catch((reason) => active && setError(message(reason)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [account, search, sort]);

  const items = useMemo<DirectoryItem[]>(() => {
    const mixed = [...wheels.map((item) => ({ type: "wheel" as const, item })), ...stages.map((item) => ({ type: "stage" as const, item }))];
    if (sort === "title") return mixed.sort((a, b) => a.item.title.localeCompare(b.item.title));
    if (sort === "participants") return mixed.sort((a, b) => participantTotal(b) - participantTotal(a) || a.item.title.localeCompare(b.item.title));
    return mixed.sort((a, b) => Date.parse(b.item.updatedAt || "") - Date.parse(a.item.updatedAt || "") || directoryOrder(a) - directoryOrder(b));
  }, [stages, wheels, sort]);

  return <div className="wheels-page">
    <section className="wheels-hero"><div className="container wheels-hero__grid"><div><p className="eyebrow">THIRD RAILIFY DRAW CONTROL</p><h1>SPIN THE <em>RAIL.</em></h1><p className="wheels-hero__lede">Public competition Wheels and multi-wheel Stages built for raid calls, giveaways, games, and live show segments—with a clean line between practice and recorded official draws.</p><div className="wheels-hero__actions">{canCreate ? <><Link className="button button--primary" to="/wheels/new"><BoltIcon /> Build a Wheel</Link><Link className="button button--ghost" to="/wheels/stages/new">Build a Stage</Link></> : account ? <span className="wheels-access-note">Creator access is granted by Admin.</span> : <button className="button button--primary" type="button" onClick={() => openAuth("signin")}><BoltIcon /> Log in for creator access</button>}<a className="button button--ghost button--text" href="#wheel-directory">Explore public draws <ArrowIcon /></a></div></div><HeroWheel /></div><div className="wheels-trust-rail"><span><b>PUBLIC</b> View and demo-spin</span><span><b>APPROVED</b> Create Wheels and Stages</span><span><b>OFFICIAL</b> Server-selected and recorded</span></div></section>
    <section id="wheel-directory" className="container wheels-directory"><header><div><p className="eyebrow">PUBLIC SIGNALS</p><h2>Wheels and Stages</h2><p>Every listed item is active and public. Hidden, private, and archived work never appears here.</p></div><div className="wheels-directory__filters"><label><span>Search draws</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or description" /></label><label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Recently updated</option><option value="title">Title A–Z</option><option value="participants">Most participants</option></select></label></div></header>
      {error ? <div className="wheel-alert" role="alert">{error}</div> : loading ? <div className="wheels-empty wheels-empty--loading"><WheelsBrandMark /><span>Tuning the draw signal…</span></div> : !items.length ? <div className="wheels-empty"><WheelsBrandMark /><h3>No public Wheels or Stages are live yet.</h3><p>That is an authoritative empty state. Approved creators can publish the first one.</p></div> : <div className="wheel-card-grid">{items.map((entry, index) => entry.type === "wheel" ? <WheelCard key={`wheel:${entry.item.slug}`} wheel={entry.item} featured={index === 0} /> : <StageCard key={`stage:${entry.item.slug}`} stage={entry.item} featured={index === 0} />)}</div>}
    </section>
    <section className="container wheels-explainer"><article><span>01</span><h2>Practice in public.</h2><p>Anonymous visitors use local cryptographic selection. Demo outcomes are never written to result history.</p></article><article><span>02</span><h2>Draw with authority.</h2><p>Approved spinners choose Official mode. The server selects and persists the winner before motion begins.</p></article><article><span>03</span><h2>Keep the record.</h2><p>Revision, participant snapshot hash, immutable winner label, and audit context remain attached to every official result.</p></article></section>
  </div>;
}

function WheelCard({ wheel, featured = false }: { wheel: WheelSummary; featured?: boolean }) { return <Link className={`wheel-card${featured ? " wheel-card--featured" : ""}`} to={`/wheels/${wheel.slug}`} style={{ "--wheel-a": wheel.palette?.[0] || "#f3c928", "--wheel-b": wheel.palette?.[1] || "#b8182f" } as React.CSSProperties}><div className="wheel-card__orbit" aria-hidden="true"><i /><i /><i /><WheelsBrandMark /></div><div className="wheel-card__copy"><p className="eyebrow">{wheel.officialEnabled ? "OFFICIAL READY" : "PUBLIC DEMO"}</p><h3>{wheel.title}</h3><p>{wheel.description || "A public Third Railify competition Wheel."}</p><div><span>{wheel.participantCount} participants</span>{wheel.weighted ? <span>Weighted</span> : null}<span>{wheel.demoEnabled ? "Demo enabled" : "View only"}</span></div></div><span className="wheel-card__arrow">↗</span></Link>; }

function StageCard({ stage, featured = false }: { stage: StageSummary; featured?: boolean }) {
  return <Link className={`wheel-card wheel-card--stage${featured ? " wheel-card--featured" : ""}`} to={`/wheels/stages/${stage.slug}`}><div className="stage-card__mosaic" aria-hidden="true">{stage.wheels.slice(0, 6).map((wheel, index) => <i key={`${wheel.slug}:${index}`} style={{ "--stage-card-a": wheel.palette?.[0] || "#f3c928", "--stage-card-b": wheel.palette?.[1] || "#b8182f" } as React.CSSProperties}><span /></i>)}</div><div className="wheel-card__copy"><p className="eyebrow">MULTI-WHEEL STAGE</p><h3>{stage.title}</h3><p>{stage.description || "A public multi-wheel Third Railify Stage."}</p><div><span>{stage.wheelCount} {stage.wheelCount === 1 ? "Wheel" : "Wheels"}</span><span>{participantTotal({ type: "stage", item: stage })} participants</span></div></div><span className="wheel-card__arrow">↗</span></Link>;
}

function participantTotal(entry: DirectoryItem) { return entry.type === "wheel" ? entry.item.participantCount : entry.item.wheels.reduce((total, wheel) => total + wheel.participantCount, 0); }
function directoryOrder(entry: DirectoryItem) { return entry.type === "wheel" ? Number(entry.item.directoryOrder || 0) : 0; }
function HeroWheel() { return <div className="hero-wheel" aria-hidden="true"><div className="hero-wheel__rails" /><div className="hero-wheel__ring"><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="hero-wheel__hub"><WheelsBrandMark /></div><div className="hero-wheel__pointer" /></div>; }
function message(reason: unknown) { return reason instanceof Error ? reason.message : "The Wheels directory is unavailable."; }
