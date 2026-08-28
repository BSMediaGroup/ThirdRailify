import { Link } from "react-router-dom";
import ginaHero from "../../assets/people/gina3.webp";
import ginaPortrait from "../../assets/people/gina1x.webp";
import shawnHero from "../../assets/people/shawn3.webp";
import shawnPortrait from "../../assets/people/shawn1x.webp";
import { ArrowIcon, BoltIcon, PlayIcon, RadioIcon } from "../components/Icons";
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
  const topicsMotion = useMotionGate<HTMLElement>();

  return (
    <div className={`host-story host-story--${profile.key}`}>
      <section className="host-profile-hero" aria-labelledby={`${profile.key}-title`}>
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
              <span><b>CA</b><small>Canadian · unfiltered</small></span>
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

      <section className="host-closing" aria-labelledby={`${profile.key}-closing-title`}>
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
  if (type === "scan") return <div className="host-topic-instrument host-topic-scan" aria-hidden="true"><span>LIVE INPUT</span><div><i /><i /><i /></div><svg viewBox="0 0 420 100"><path d="M7 62h68l24-25 31 48 36-68 42 48h45l28-22 31 34 36-48 30 33h55" /></svg></div>;
  if (type === "case" || type === "mystery") return <div className="host-topic-instrument host-topic-case" aria-hidden="true"><i /><i /><i /><div><span>?</span><b>{type === "case" ? "CASE OPEN" : "LOOK AGAIN"}</b></div><svg viewBox="0 0 420 180"><path d="M50 35 205 92 358 36M84 148 205 92l126 58M50 35l34 113m274-112-27 114" /></svg></div>;
  if (type === "culture") return <div className="host-topic-instrument host-topic-culture" aria-hidden="true"><i /><i /><i /><i /><div><span>CULTURE</span><b>UNDER REVIEW</b></div></div>;
  if (type === "detour") return <div className="host-topic-instrument host-topic-detour" aria-hidden="true"><svg viewBox="0 0 440 180"><path d="M18 102h92c48 0 42-62 94-62s43 99 97 99 48-68 121-68" /><circle cx="110" cy="102" r="6" /><circle cx="301" cy="139" r="6" /></svg><span>ROUTE RECALCULATING</span></div>;
  if (type === "wit") return <div className="host-topic-instrument host-topic-wit" aria-hidden="true"><span>SASS</span><i /><div><BoltIcon /></div><i /><span>POINT</span><b>TIMING MATTERS</b></div>;
  return <div className="host-topic-instrument host-topic-identity" aria-hidden="true"><div><BoltIcon /></div><span>JUST</span><strong>GINA</strong><i>OWN FREQUENCY</i></div>;
}
