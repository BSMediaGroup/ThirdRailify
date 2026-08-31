import { Link } from "react-router-dom";
import americanFlag from "../../assets/flags/us.svg";
import canadianFlag from "../../assets/flags/ca.svg";
import ginaHero from "../../assets/people/gina3.webp";
import ginaPortrait from "../../assets/people/gina1x.webp";
import shawnHero from "../../assets/people/shawn3.webp";
import shawnPortrait from "../../assets/people/shawn1x.webp";
import { ArrowIcon, BoltIcon, PlayIcon, RadioIcon } from "../components/Icons";
import { EditorialSignalField } from "../components/SignalField";
import { useMotionGate } from "../hooks/useMotionGate";

type HostKey = "shawn" | "gina";

type HostTopic = {
  eyebrow: string;
  title: string;
  copy: string;
  instrument: "scan" | "case" | "culture" | "detour" | "mystery" | "wit" | "identity";
};

type HostProfile = {
  key: HostKey;
  name: string;
  handle: string;
  role: string;
  heroStrap: string;
  heroCopy: string;
  heroPortrait: string;
  voiceEyebrow: string;
  voiceTitle: string;
  voiceCopy: [string, string];
  voiceStatement: string;
  inputs: string[];
  output: string;
  topics: HostTopic[];
  partner: {
    name: string;
    role: string;
    href: string;
    portrait: string;
    title: string;
    copy: string;
  };
  closing: string;
  closingCopy: string;
};

const profiles: Record<HostKey, HostProfile> = {
  shawn: {
    key: "shawn",
    name: "Shawn",
    handle: "@ThirdRailify",
    role: "Third Railify host",
    heroStrap: "Every tab is open.",
    heroCopy: "News, crime, and pop culture go in. ADHD-shaped commentary and the detours nobody scheduled come back out. Shawn hosts Third Railify like the conversation is already in progress—because it usually is.",
    heroPortrait: shawnHero,
    voiceEyebrow: "How the signal moves",
    voiceTitle: "The long way around is the point.",
    voiceCopy: [
      "The headline gets the door open. Then the questions multiply, the side roads get interesting, and the neat version of the story starts losing pieces.",
      "That is the Shawn lane: take the subject seriously without pretending the conversation has to behave. Chat stays close, the argument stays human, and no useful tangent gets left behind just because it was not on the rundown.",
    ],
    voiceStatement: "Start with the story. Follow the thought. See where the room takes it.",
    inputs: ["News", "Crime", "Pop culture", "Chat"],
    output: "Live commentary",
    topics: [
      { eyebrow: "Current input", title: "News", copy: "Current stories get a live, human read—then meet every question the tidy version forgot to ask.", instrument: "scan" },
      { eyebrow: "Questions remain", title: "Crime", copy: "Cases, motives, contradictions, and the details that keep a straightforward answer from staying straightforward.", instrument: "case" },
      { eyebrow: "No velvet rope", title: "Pop culture", copy: "Flops, spectacles, celebrity logic, and the parts of the culture machine asking to be taken apart in public.", instrument: "culture" },
      { eyebrow: "Route recalculating", title: "The detour", copy: "One thought finds three more. The tangent earns a tangent. Somehow, the show still finds the station.", instrument: "detour" },
    ],
    partner: {
      name: "Gina",
      role: "Third Railify co-host · Just Gina",
      href: "/gina",
      portrait: ginaPortrait,
      title: "No live wire runs solo.",
      copy: "Gina brings the counterpoint, the timing, and a distinct Just Gina perspective. The show works because the other chair can sharpen the point, change the direction, or call the whole thing ridiculous at exactly the right moment.",
    },
    closing: "Follow the story. Keep the detour.",
    closingCopy: "The mic is live most nights around 10 PM Eastern. Pull up the latest transmission and join the argument already underway.",
  },
  gina: {
    key: "gina",
    name: "Gina",
    handle: "@JustGina",
    role: "Third Railify co-host",
    heroStrap: "The rabbit hole has company.",
    heroCopy: "Sass, smarts, humour, mysteries, and culture meet a very sharp raised eyebrow. Gina co-hosts Third Railify while keeping a distinct Just Gina lane for the stories that deserve a closer look.",
    heroPortrait: ginaHero,
    voiceEyebrow: "Look twice · then say it",
    voiceTitle: "Curiosity with a raised eyebrow.",
    voiceCopy: [
      "Some stories need a second look. Some need a better question. A few need somebody to say the obvious part out loud before everyone politely moves on.",
      "That is the Gina lane: smart without becoming sterile, funny without losing the thread, and curious enough to follow a mystery past the first convenient answer. The side-eye is part of the method.",
    ],
    voiceStatement: "Look closer. Keep your sense of humour. Do not waste a perfectly good question.",
    inputs: ["Mysteries", "Culture", "Humour", "Chat"],
    output: "Just Gina perspective",
    topics: [
      { eyebrow: "Closer inspection", title: "Mysteries", copy: "Loose ends, strange turns, conspiracies, and the questions that keep tapping after the easy answer leaves.", instrument: "mystery" },
      { eyebrow: "Read the room", title: "Culture", copy: "The habits, spectacles, and shared obsessions that reveal more than the official explanation intended.", instrument: "culture" },
      { eyebrow: "Delivery system", title: "Sass + humour", copy: "A sharp point lands better with timing. Gina brings both, especially when the story is taking itself too seriously.", instrument: "wit" },
      { eyebrow: "Distinct frequency", title: "Just Gina", copy: "A recognisable lane inside the wider Third Railify universe: curious, direct, and entirely her own.", instrument: "identity" },
    ],
    partner: {
      name: "Shawn",
      role: "Third Railify host",
      href: "/shawn",
      portrait: shawnPortrait,
      title: "The other chair talks back.",
      copy: "Shawn brings Third Railify’s news, crime, and pop-culture current into the room. Gina meets it with the counterpoint that keeps the exchange live, lets chat into the circuit, and gives every planned segment a fair chance to become something else.",
    },
    closing: "Stay curious. Bring the side-eye.",
    closingCopy: "Find Gina with Shawn on Third Railify, live most nights around 10 PM Eastern. The next strange turn is probably already on the rundown—or walking in uninvited.",
  },
};

export function HostPage({ hostKey }: { hostKey: HostKey }) {
  const profile = profiles[hostKey];
  const heroMotion = useMotionGate<HTMLElement>();
  const topicsMotion = useMotionGate<HTMLElement>();
  const closingMotion = useMotionGate<HTMLElement>();

  return (
    <div className={`host-story host-story--${profile.key}`}>
      <section ref={heroMotion.ref} className={`host-profile-hero${heroMotion.active ? " is-active" : ""}`} aria-labelledby={`${profile.key}-title`} data-motion={heroMotion.active ? "active" : "static"}>
        <EditorialSignalField variant={profile.key} context="hero" />
        <div className="host-profile-hero__ambient" aria-hidden="true"><i /><i /><i /></div>
        <div className="container host-profile-hero__layout">
          <div className="host-profile-hero__copy">
            <p className="eyebrow"><i /> {profile.role} · {profile.handle}</p>
            <h1 id={`${profile.key}-title`}><span>{profile.name}.</span><em>{profile.heroStrap}</em></h1>
            <p className="host-profile-hero__lede">{profile.heroCopy}</p>
            <div className="button-row">
              <Link className="button button--primary" to="/watch"><PlayIcon /> Watch the show</Link>
              <a className="button button--secondary" href="#host-profile">Inside the signal <ArrowIcon /></a>
            </div>
            <div className="host-profile-hero__facts" aria-label={`${profile.name} show context`}>
              <span><b>{profile.key === "shawn" ? "HOST" : "CO-HOST"}</b><small>Third Railify</small></span>
              <span><b className="host-profile-hero__country"><img src={profile.key === "shawn" ? canadianFlag : americanFlag} alt="" />{profile.key === "shawn" ? "CA" : "US"}</b><small>{profile.key === "shawn" ? "Canadian · unfiltered" : "American · Massachusetts"}</small></span>
              <span><b>{profile.key === "shawn" ? "LIVE" : "JUST GINA"}</b><small>{profile.key === "shawn" ? "Most nights · 10 PM ET" : "Distinct lane"}</small></span>
            </div>
          </div>
          <HostPortraitStage profile={profile} />
        </div>
        <div className="host-profile-hero__ticker" aria-hidden="true">
          {profile.inputs.map((input) => <span key={input}>{input}<i /></span>)}<strong>{profile.output}</strong>
        </div>
      </section>

      <section className="host-voice" id="host-profile" aria-labelledby={`${profile.key}-voice-title`}>
        <div className="container host-voice__layout">
          <div className="host-voice__copy">
            <p className="eyebrow">{profile.voiceEyebrow}</p>
            <h2 id={`${profile.key}-voice-title`}>{profile.voiceTitle}</h2>
            <div className="host-voice__body"><p>{profile.voiceCopy[0]}</p><p>{profile.voiceCopy[1]}</p></div>
          </div>
          <HostVoiceConsole profile={profile} />
        </div>
      </section>

      <section ref={topicsMotion.ref} className={`host-topics${topicsMotion.active ? " is-active" : ""}`} aria-labelledby={`${profile.key}-topics-title`} data-motion={topicsMotion.active ? "active" : "static"}>
        <div className="container host-section-heading">
          <div><p className="eyebrow">Recurring inputs · no fixed route</p><h2 id={`${profile.key}-topics-title`}>What enters<br /><span>the conversation.</span></h2></div>
          <p>{profile.key === "shawn" ? "The subject changes. The instinct does not: find the live edge, ask the next question, and leave enough room for the conversation to surprise itself." : "The closer look can start anywhere. A mystery, a cultural tell, a sharp joke, or one question that refuses to accept the first answer."}</p>
        </div>
        <div className="container host-topic-grid">
          {profile.topics.map((topic, index) => (
            <article className={`host-topic-card host-topic-card--${topic.instrument}`} key={topic.title}>
              <div className="host-topic-card__meta"><span>0{index + 1} / INPUT</span><strong>{topic.eyebrow}</strong></div>
              <TopicInstrument type={topic.instrument} />
              <div className="host-topic-card__copy"><h3>{topic.title}</h3><p>{topic.copy}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="host-partnership" aria-labelledby={`${profile.key}-partner-title`}>
        <div className="container host-partnership__layout">
          <div className="host-partnership__portrait">
            <span>{profile.partner.role}</span>
            <img src={profile.partner.portrait} alt={`Illustrated portrait of ${profile.partner.name}`} width="1024" height="940" loading="lazy" decoding="async" />
            <div aria-hidden="true"><i /><BoltIcon /><i /></div>
          </div>
          <div className="host-partnership__copy">
            <p className="eyebrow">Two hosts · one live wire</p>
            <h2 id={`${profile.key}-partner-title`}>{profile.partner.title}</h2>
            <p>{profile.partner.copy}</p>
            <div className="button-row">
              <Link className="button button--primary" to={profile.partner.href}>Meet {profile.partner.name} <ArrowIcon /></Link>
              <Link className="button button--secondary" to="/about">About the show</Link>
            </div>
          </div>
        </div>
      </section>

      <section ref={closingMotion.ref} className={`host-closing${closingMotion.active ? " is-active" : ""}`} aria-labelledby={`${profile.key}-closing-title`} data-motion={closingMotion.active ? "active" : "static"}>
        <EditorialSignalField variant={profile.key} context="closing" />
        <div className="host-closing__rails" aria-hidden="true"><i /><i /><i /></div>
        <div className="host-closing__telemetry" aria-hidden="true"><span>TR / {profile.key === "shawn" ? "MIC A" : "MIC B"}</span><i /><strong>{profile.output}</strong></div>
        <div className="container host-closing__inner">
          <RadioIcon />
          <p className="eyebrow">The signal is waiting</p>
          <h2 id={`${profile.key}-closing-title`}>{profile.closing}</h2>
          <p>{profile.closingCopy}</p>
          <div className="button-row"><Link className="button button--primary" to="/watch"><PlayIcon /> Watch Third Railify</Link><Link className="button button--secondary" to="/community">Join the community <ArrowIcon /></Link></div>
        </div>
      </section>
    </div>
  );
}

function HostPortraitStage({ profile }: { profile: HostProfile }) {
  const motion = useMotionGate<HTMLDivElement>();
  return (
    <div ref={motion.ref} className={`host-portrait-stage${motion.active ? " is-active" : ""}`} data-motion={motion.active ? "active" : "static"} aria-label={`Signal portrait of ${profile.name}`}>
      <div className="host-portrait-stage__meta"><span>TR / HOST PROFILE</span><strong>{profile.handle}</strong></div>
      <div className="host-portrait-stage__grid" aria-hidden="true" />
      <div className="host-portrait-stage__rings" aria-hidden="true"><i /><i /><i /></div>
      <div className="host-portrait-stage__rails" aria-hidden="true"><i /><i /><i /><i /></div>
      <img src={profile.heroPortrait} alt={`Illustrated portrait of ${profile.name}`} width="1024" height="1024" decoding="async" />
      <div className="host-portrait-stage__nodes" aria-hidden="true">
        {profile.inputs.map((input, index) => <span className={`host-portrait-stage__node host-portrait-stage__node--${index + 1}`} key={input}><i />{input}</span>)}
      </div>
      <div className="host-portrait-stage__core" aria-hidden="true"><BoltIcon /><span>{profile.key === "shawn" ? "MIC A" : "MIC B"}</span></div>
      <div className="host-portrait-stage__scope" aria-hidden="true">{Array.from({ length: 11 }, (_, index) => <i key={index} />)}</div>
      <div className="host-portrait-stage__status"><span><i /> Signal open</span><b>{profile.output}</b></div>
    </div>
  );
}

function HostVoiceConsole({ profile }: { profile: HostProfile }) {
  return (
    <div className="host-voice-console" aria-label={`${profile.name} signal profile`}>
      <div className="host-voice-console__header"><span>TR / SIGNAL PROFILE</span><strong>INPUTS OPEN</strong></div>
      <div className="host-voice-console__meter" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="host-voice-console__inputs">
        {profile.inputs.map((input, index) => <div key={input}><span>0{index + 1}</span><b>{input}</b><i><em style={{ width: `${58 + index * 10}%` }} /></i></div>)}
      </div>
      <div className="host-voice-console__output"><span>OUTPUT</span><strong>{profile.output}</strong><BoltIcon /></div>
      <p>{profile.voiceStatement}</p>
    </div>
  );
}

function TopicInstrument({ type }: { type: HostTopic["instrument"] }) {
  if (type === "scan") return (
    <div className="host-topic-instrument host-topic-scan" aria-hidden="true">
      <InstrumentChrome channel="CH 01 / LIVE INPUT" status="ACQUIRING" />
      <svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid meet">
        <g className="topic-scale"><path d="M30 58H570M30 108H570M30 158H570" /><text x="32" y="52">+12</text><text x="32" y="102">00</text><text x="32" y="152">-12</text></g>
        <path className="topic-baseline" d="M55 124H565" />
        <path className="topic-wave topic-wave--ghost" d="M55 124h61l17-18 21 35 24-71 28 109 31-137 38 98 35-45 31 29h41l25-27 28 51 33-91 41 67h76" />
        <path className="topic-wave topic-trace" pathLength="1" d="M55 124h61l17-18 21 35 24-71 28 109 31-137 38 98 35-45 31 29h41l25-27 28 51 33-91 41 67h76" />
        <g className="topic-nodes"><circle cx="178" cy="53" r="7" /><circle cx="341" cy="124" r="7" /><circle cx="478" cy="57" r="7" /></g>
        <circle className="topic-packet topic-packet--scan" cx="0" cy="0" r="4" />
      </svg>
      <span className="host-topic-instrument__probe" /><small>SIGNAL LOCK 92% / HUMAN READ ACTIVE</small>
    </div>
  );
  if (type === "case" || type === "mystery") {
    const isMystery = type === "mystery";
    return (
      <div className={`host-topic-instrument host-topic-case host-topic-case--${type}`} aria-hidden="true">
        <InstrumentChrome channel={isMystery ? "04 / UNCERTAINTY MAP" : "02 / EVIDENCE MAP"} status={isMystery ? "CLOSER INSPECTION" : "QUESTIONS REMAIN"} />
        <svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid meet">
          <g className="case-orbits"><circle cx="300" cy="113" r="82" /><circle className="topic-orbit" cx="300" cy="113" r="55" /></g>
          <g className="case-paths">
            <path className="topic-trace" pathLength="1" d={isMystery ? "M62 50 164 165 300 113 454 53 520 168M164 165 112 88M454 53l66 115" : "M58 47 300 113 531 43M108 177 300 113l195 64M58 47l50 130m423-134-36 134"} />
            <path className="topic-trace topic-trace--delay" pathLength="1" d={isMystery ? "M62 50 112 88 300 113M520 168 454 53" : "M108 177 58 132M495 177l52-61"} />
          </g>
          <g className="case-nodes"><circle cx="58" cy="47" r="6" /><circle cx="531" cy="43" r="6" /><circle cx="108" cy="177" r="6" /><circle cx="495" cy="177" r="6" /></g>
          <g className="case-core"><circle cx="300" cy="113" r="48" /><text className="case-core__question" x="300" y="118">?</text><text className="case-core__label" x="300" y="144">{isMystery ? "LOOK AGAIN" : "CASE OPEN"}</text></g>
        </svg>
        <span className="host-topic-instrument__probe" /><small>{isMystery ? "04 LEADS / CERTAINTY WITHHELD" : "EVIDENCE PATH / ANSWER UNRESOLVED"}</small>
      </div>
    );
  }
  if (type === "culture") return (
    <div className="host-topic-instrument host-topic-culture" aria-hidden="true">
      <InstrumentChrome channel="03 / CULTURE SCOPE" status="READ THE ROOM" />
      <svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid meet">
        <g className="culture-crosshair"><path d="M60 113H540M300 21V205" /></g>
        <g className="culture-orbits"><circle className="culture-ring culture-ring--outer" cx="300" cy="113" r="88" /><circle className="culture-ring" cx="300" cy="113" r="64" /><circle className="culture-ring culture-ring--inner" cx="300" cy="113" r="39" /></g>
        <g className="culture-ticks"><path d="M300 15v12M300 199v12M202 113h12M386 113h12M231 44l9 9M360 173l9 9M369 44l-9 9M240 173l-9 9" /></g>
        <path className="culture-sector" d="M300 113 300 25A88 88 0 0 1 376 69Z" /><path className="culture-scan" d="M300 113 382 83" />
        <g className="culture-core"><rect x="238" y="82" width="124" height="62" rx="31" /><text x="300" y="113">CULTURE</text><text className="culture-core__sub" x="300" y="130">UNDER REVIEW</text></g>
      </svg>
      <span className="host-topic-instrument__probe" /><small>SPECTRUM / ACTIVE SECTOR 03</small>
    </div>
  );
  if (type === "detour") return (
    <div className="host-topic-instrument host-topic-detour" aria-hidden="true">
      <InstrumentChrome channel="04 / ROUTE MODEL" status="RECALCULATING" />
      <svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid meet">
        <path className="detour-alt" d="M34 142C120 142 113 70 200 70s92 84 170 84 88-62 196-62" />
        <path className="detour-route-shadow" d="M34 142h86c51 0 43-86 105-86s50 126 116 126 51-99 112-99 48 59 113 59" />
        <path className="detour-route topic-trace" pathLength="1" d="M34 142h86c51 0 43-86 105-86s50 126 116 126 51-99 112-99 48 59 113 59" />
        <g className="detour-nodes"><circle cx="120" cy="142" r="7" /><circle cx="225" cy="56" r="7" /><circle cx="341" cy="182" r="7" /><circle cx="453" cy="83" r="7" /><circle cx="566" cy="142" r="8" /></g>
        <circle className="topic-packet topic-packet--detour" cx="0" cy="0" r="4" />
      </svg>
      <span className="host-topic-instrument__probe" /><small>4 COURSE CORRECTIONS / DESTINATION FOUND</small>
    </div>
  );
  if (type === "wit") return (
    <div className="host-topic-instrument host-topic-wit" aria-hidden="true">
      <InstrumentChrome channel="03 / DELIVERY SYSTEM" status="OUTPUT SHARP" />
      <svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid meet">
        <g className="wit-zones"><rect x="42" y="53" width="154" height="119" /><rect x="196" y="53" width="190" height="119" /><rect x="386" y="53" width="172" height="119" /></g>
        <path className="wit-guide" d="M42 129H558" />
        <path className="wit-timing topic-trace" pathLength="1" d="M42 129h94v-26h38v26h85V76h23v53h62l26 0 23-84 27 151 26-67h112" />
        <g className="wit-nodes"><circle cx="136" cy="129" r="6" /><circle cx="259" cy="129" r="6" /><circle cx="393" cy="129" r="8" /></g>
        <g className="wit-captions"><text x="62" y="71">SETUP</text><text x="218" y="71">TIMING</text><text x="489" y="71">POINT</text></g>
      </svg>
      <div className="host-topic-wit__impact"><BoltIcon /></div><span className="host-topic-instrument__probe" /><small>BEAT 03 / DELIVERY LOCKED</small>
    </div>
  );
  return (
    <div className="host-topic-instrument host-topic-identity" aria-hidden="true">
      <InstrumentChrome channel="04 / DISTINCT FREQUENCY" status="LANE LOCKED" />
      <svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid meet">
        <path className="identity-feed" d="M32 145c68 0 74-42 132-42s61 42 116 42 67-42 120-42 60 42 168 42" />
        <path className="identity-solo topic-trace" pathLength="1" d="M32 165c80 0 84-14 142-14s66 14 117 14 65-80 119-80 66 80 158 80" />
        <g className="identity-rings"><circle className="identity-orbit" cx="320" cy="112" r="83" /><circle className="identity-orbit identity-orbit--inner" cx="320" cy="112" r="54" /></g>
        <g className="identity-lock"><circle cx="320" cy="112" r="38" /><path d="M320 78V57M320 167v-21M286 112h-21M375 112h-21" /><text x="320" y="105">JUST</text><text className="identity-lock__name" x="320" y="130">GINA</text></g>
      </svg>
      <span className="host-topic-instrument__probe" /><small>OWN FREQUENCY / SIGNAL INDEPENDENT</small>
    </div>
  );
}

function InstrumentChrome({ channel, status }: { channel: string; status: string }) {
  return <div className="host-topic-instrument__chrome"><span>{channel}</span><i /><strong>{status}</strong><b><em /><em /><em /></b></div>;
}
