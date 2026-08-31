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
  if (type === "scan") return <div className="host-topic-instrument host-topic-scan" aria-hidden="true"><span>LIVE INPUT / ACQUIRING</span><div><i /><i /><i /></div><svg viewBox="0 0 460 176"><path className="topic-baseline" d="M20 113H440" /><path className="topic-wave topic-trace" pathLength="1" d="M20 113h47l14-13 16 24 20-43 22 58 27-82 31 59 28-31 26 28h36l19-20 24 36 29-63 34 47h67" /><g className="topic-nodes"><circle cx="117" cy="81" r="5" /><circle cx="286" cy="93" r="5" /><circle cx="373" cy="66" r="5" /></g></svg><small>CH 01&nbsp;&nbsp; / &nbsp;&nbsp;SIGNAL LOCK 92%</small></div>;
  if (type === "case" || type === "mystery") return <div className={`host-topic-instrument host-topic-case host-topic-case--${type}`} aria-hidden="true"><i /><i /><i /><i /><div><span>?</span><b>{type === "case" ? "CASE OPEN" : "LOOK AGAIN"}</b></div><svg viewBox="0 0 460 200"><circle className="topic-orbit" cx="230" cy="100" r="72" /><path className="topic-trace" pathLength="1" d="M48 42 230 100 402 38M84 164 230 100l145 64M48 42l36 122m318-126-27 126" /><path className="topic-trace topic-trace--delay" pathLength="1" d="M84 164 47 118M375 164l41-50" /></svg><small>{type === "case" ? "EVIDENCE PATH / UNRESOLVED" : "UNCERTAINTY MAP / 04 LEADS"}</small></div>;
  if (type === "culture") return <div className="host-topic-instrument host-topic-culture" aria-hidden="true"><svg viewBox="0 0 460 210"><circle className="culture-ring culture-ring--outer" cx="230" cy="105" r="82" /><circle className="culture-ring" cx="230" cy="105" r="58" /><circle className="culture-ring culture-ring--inner" cx="230" cy="105" r="34" /><path className="culture-sector" d="M230 105 230 23A82 82 0 0 1 301 64Z" /><path className="culture-scan" d="M230 105 307 77" /></svg><div><span>CULTURE</span><b>UNDER REVIEW</b></div><small>SPECTRUM / ACTIVE SECTOR 03</small></div>;
  if (type === "detour") return <div className="host-topic-instrument host-topic-detour" aria-hidden="true"><svg viewBox="0 0 460 200"><path className="detour-route-shadow" d="M18 126h72c42 0 35-72 86-72s42 104 96 104 42-82 92-82 40 48 82 48" /><path className="detour-route topic-trace" pathLength="1" d="M18 126h72c42 0 35-72 86-72s42 104 96 104 42-82 92-82 40 48 82 48" /><g><circle cx="90" cy="126" r="6" /><circle cx="176" cy="54" r="6" /><circle cx="272" cy="158" r="6" /><circle cx="364" cy="76" r="6" /><circle cx="446" cy="124" r="7" /></g></svg><span>ROUTE RECALCULATING</span><small>4 COURSE CORRECTIONS / DESTINATION FOUND</small></div>;
  if (type === "wit") return <div className="host-topic-instrument host-topic-wit" aria-hidden="true"><svg viewBox="0 0 460 190"><path className="wit-guide" d="M28 105H432" /><path className="wit-timing topic-trace" pathLength="1" d="M28 105h70v-19h30v19h66v-38h18v38h55l19 0 18-64 18 114 18-50h92" /><g><circle cx="98" cy="105" r="5" /><circle cx="194" cy="105" r="5" /><circle cx="304" cy="105" r="7" /></g></svg><span className="wit-label wit-label--setup">SETUP</span><span className="wit-label wit-label--beat">TIMING</span><span className="wit-label wit-label--point">POINT</span><div><BoltIcon /></div><b>BEAT 03 / OUTPUT SHARP</b></div>;
  return <div className="host-topic-instrument host-topic-identity" aria-hidden="true"><svg viewBox="0 0 460 210"><circle className="identity-orbit" cx="230" cy="105" r="76" /><circle className="identity-orbit identity-orbit--inner" cx="230" cy="105" r="49" /><path className="identity-feed" d="M18 134c54 0 58-35 103-35s48 35 91 35 52-35 94-35 47 35 136 35" /><path className="identity-solo topic-trace" pathLength="1" d="M18 154c63 0 66-11 111-11s52 11 92 11 51-62 93-62 52 62 128 62" /></svg><div><BoltIcon /></div><span>JUST</span><strong>GINA</strong><i>OWN FREQUENCY / LOCKED</i></div>;
}
