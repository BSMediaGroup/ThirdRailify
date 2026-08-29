import { Link } from "react-router-dom";
import canadianFlag from "../../assets/flags/ca.svg";
import ginaPortrait from "../../assets/people/gina1x.webp";
import shawnPortrait from "../../assets/people/shawn1x.webp";
import { ArrowIcon, BoltIcon, PlayIcon } from "../components/Icons";
import { useMotionGate } from "../hooks/useMotionGate";

const formatModules = [
  {
    key: "aboot",
    number: "01",
    eyebrow: "The bracket",
    title: "Aboot Nothing",
    copy: "Championship brackets for things that never needed a champion: cryptids, condiments, cuts of beef, 90s cartoons, chat picks, and deeply unnecessary rematches.",
  },
  {
    key: "beatdown",
    number: "02",
    eyebrow: "Monday contact sport",
    title: "Pop Culture Beat Down",
    copy: "Friends take on celebrity meltdowns, spectacular flops, and Hollywood nonsense with all the restraint of a ringside argument.",
  },
  {
    key: "news",
    number: "03",
    eyebrow: "The loose agenda",
    title: "News Hangout",
    copy: "It starts with the news, barely talks about the news, then follows everything else until the clock gives up.",
  },
  {
    key: "wildcard",
    number: "04",
    eyebrow: "Unscheduled arrival",
    title: "The Wildcard",
    copy: "Raids, wheels, merch, and whatever tangent walks through the door without an invitation. The switch is always within reach.",
  },
] as const;

export function AboutPage() {
  const formats = useMotionGate<HTMLElement>();
  const community = useMotionGate<HTMLElement>();

  return (
    <div className="about-page">
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-hero__ambient" aria-hidden="true"><i /><i /><i /></div>
        <div className="container about-hero__layout">
          <div className="about-hero__copy">
            <p className="eyebrow"><i /> About Third Railify</p>
            <h1 id="about-title">We grabbed<br />the rail<br /><span>anyway.</span></h1>
            <p className="about-hero__lede">A bad idea found the forbidden topic, built a late-night studio around it, and refused to die. Canadian, unfiltered, and live most nights around 10 PM Eastern—with chat close enough to grab the switch.</p>
            <div className="button-row">
              <Link className="button button--primary" to="/watch"><PlayIcon /> Watch the show</Link>
              <a className="button button--secondary" href="#origin">How it started <ArrowIcon /></a>
            </div>
            <div className="about-hero__facts" aria-label="Third Railify show context">
              <span><b className="about-hero__country"><img src={canadianFlag} alt="" />CA</b><small>Canadian</small></span>
              <span><b>10 PM</b><small>Most nights · Eastern</small></span>
              <span><b>LIVE</b><small>Chat steers</small></span>
            </div>
          </div>
          <HighVoltageNetwork />
        </div>
        <div className="about-hero__ticker" aria-hidden="true"><span>NEWS</span><i /><span>CULTURE</span><i /><span>CHAOS</span><i /><span>CHAT</span><i /><strong>ONE UNPREDICTABLE SHOW</strong></div>
      </section>

      <section className="about-origin" id="origin" aria-labelledby="origin-title">
        <div className="container about-origin__layout">
          <div className="about-origin__heading">
            <p className="eyebrow">Origin story · no safety briefing</p>
            <h2 id="origin-title">A bad idea<br />that refused<br /><span>to die.</span></h2>
            <blockquote>“The topic everybody circles. The one we grabbed anyway.”</blockquote>
          </div>
          <div className="about-origin__story">
            <p>The third rail is the subject you are supposed to leave alone: high voltage, bad for careers, and carefully avoided by anyone with a sensible plan.</p>
            <p>Third Railify touched it. Friends pulled up chairs. A late-night studio took shape. Somewhere along the way, “we should probably stop” stopped being a warning and became the format.</p>
            <div className="origin-warning" aria-label="The Third Railify origin in three stages">
              <div className="origin-warning__header"><span>TR / ORIGIN CIRCUIT</span><strong>DO NOT TOUCH</strong></div>
              <ol>
                <li><span>01</span><div><b>The subject</b><small>Everybody circles it.</small></div></li>
                <li><span>02</span><div><b>The room</b><small>Friends and a late-night studio.</small></div></li>
                <li><span>03</span><div><b>The show</b><small>The bad idea stays live.</small></div></li>
              </ol>
              <div className="origin-warning__rail" aria-hidden="true"><i /><i /><i /><BoltIcon /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-hosts" aria-labelledby="hosts-title">
        <div className="container about-section-heading about-section-heading--hosts">
          <div><p className="eyebrow">Shawn · Canadian / Gina · American (Massachusetts)</p><h2 id="hosts-title">Two people.<br /><span>One derailment.</span></h2></div>
          <p>Between them: the hosting, co-hosting, producing, ADHD commentary, public roasting, and just enough control to send the whole thing off-track on purpose. They talk like actual people and leave room for chat to talk back.</p>
        </div>
        <div className="container host-dynamic">
          <article className="host-panel host-panel--shawn">
            <div className="host-panel__portrait">
              <span className="host-panel__index">HOST / 01</span>
              <img src={shawnPortrait} alt="Illustrated portrait of Shawn" width="1024" height="940" loading="lazy" decoding="async" />
              <div className="host-panel__telemetry" aria-hidden="true"><i /><span>VOICE A</span><i /><span>LIVE</span></div>
            </div>
            <div className="host-panel__copy">
              <p>Third Railify host</p>
              <h3>Shawn</h3>
              <span>One half of the live conversation, the detours, and the arguments that go much further than anyone planned.</span>
              <Link className="text-link" to="/shawn">Meet Shawn <ArrowIcon /></Link>
            </div>
          </article>
          <div className="host-dynamic__junction" aria-hidden="true"><span>CO-HOST / PRODUCE / DERAIL</span><div><i /><BoltIcon /><i /></div><b>CHAT IN THE LOOP</b></div>
          <article className="host-panel host-panel--gina">
            <div className="host-panel__portrait">
              <span className="host-panel__index">HOST / 02</span>
              <img src={ginaPortrait} alt="Illustrated portrait of Gina" width="1024" height="940" loading="lazy" decoding="async" />
              <div className="host-panel__telemetry" aria-hidden="true"><i /><span>VOICE B</span><i /><span>LIVE</span></div>
            </div>
            <div className="host-panel__copy">
              <p>Third Railify co-host</p>
              <h3>Gina</h3>
              <span>The other half of the on-air chemistry, with the show held together for precisely as long as the moment requires.</span>
              <Link className="text-link" to="/gina">Meet Gina <ArrowIcon /></Link>
            </div>
          </article>
        </div>
      </section>

      <section ref={formats.ref} className={`about-formats${formats.active ? " is-active" : ""}`} aria-labelledby="formats-title" data-motion={formats.active ? "active" : "static"}>
        <div className="container about-section-heading">
          <div><p className="eyebrow">Recurring formats · frequent detours</p><h2 id="formats-title">What happens<br /><span>on the rail.</span></h2></div>
          <p>There is a plan. It is printed somewhere. What reaches the screen is a rotating mix of brackets, pop-culture combat, news-shaped hangouts, and whatever arrives unannounced.</p>
        </div>
        <div className="container format-grid">
          {formatModules.map((format) => (
            <article className={`format-card format-card--${format.key}`} key={format.key}>
              <div className="format-card__meta"><span>{format.number} / FORMAT</span><strong>{format.eyebrow}</strong></div>
              <FormatInstrument type={format.key} />
              <div className="format-card__copy"><h3>{format.title}</h3><p>{format.copy}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section ref={community.ref} className={`about-community${community.active ? " is-active" : ""}`} aria-labelledby="community-title" data-motion={community.active ? "active" : "static"}>
        <div className="container about-community__layout">
          <div className="about-community__copy">
            <p className="eyebrow">The third voice in the room</p>
            <h2 id="community-title">Chat has<br /><span>the wheel.</span></h2>
            <p>This is not a polished newsroom or a committee-approved hangout. Shawn and Gina roast each other in public, the audience redirects the conversation, and the people who pull up a chair tend to come back.</p>
            <p>The community is not decoration around the show. It is in the circuit.</p>
            <div className="button-row">
              <Link className="button button--primary" to="/community">Join the community <ArrowIcon /></Link>
              <Link className="button button--secondary" to="/goats">Meet the GOATs</Link>
            </div>
          </div>
          <CommunityCircuit />
        </div>
      </section>

      <section className="about-manifesto" aria-labelledby="manifesto-title">
        <div className="about-manifesto__rails" aria-hidden="true"><i /><i /><i /></div>
        <div className="container about-manifesto__inner">
          <p className="eyebrow">No committee · no fixed destination</p>
          <p className="about-manifesto__statement">We are not entirely sure what this is on any given night.</p>
          <span>That is the point.</span>
          <h2 id="manifesto-title">Grab the rail.<br /><em>Don’t let go.</em></h2>
          <p>Stay for the argument. Stay for the people who actually show up. Always be GOATED, never be mid.</p>
          <div className="button-row">
            <Link className="button button--primary" to="/watch"><PlayIcon /> Watch Third Railify</Link>
            <Link className="button button--secondary" to="/community">Pull up a chair <ArrowIcon /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function HighVoltageNetwork() {
  const motion = useMotionGate<HTMLDivElement>();
  return (
    <div ref={motion.ref} className={`about-network${motion.active ? " is-active" : ""}`} data-motion={motion.active ? "active" : "static"} aria-hidden="true">
      <div className="about-network__meta"><span>TR / LIVE NETWORK</span><strong>HIGH VOLTAGE</strong></div>
      <div className="about-network__grid" />
      <svg viewBox="0 0 620 560" focusable="false">
        <defs>
          <linearGradient id="about-line" x1="0" x2="1"><stop stopColor="#ffd12f" stopOpacity="0" /><stop offset=".48" stopColor="#ffd12f" /><stop offset="1" stopColor="#fff0ae" stopOpacity=".15" /></linearGradient>
          <filter id="about-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g className="about-network__orbits">
          <circle cx="332" cy="286" r="166" />
          <circle cx="332" cy="286" r="112" />
          <path d="M79 478C178 370 236 337 332 286S492 179 567 80" />
        </g>
        <g className="about-network__feeds">
          <path d="M75 112C168 112 218 184 332 286" />
          <path d="M540 120C478 168 423 216 332 286" />
          <path d="M548 446C462 410 408 357 332 286" />
          <path d="M70 442C163 408 223 354 332 286" />
        </g>
        <g className="about-network__pulses" filter="url(#about-glow)">
          <path className="about-network__pulse about-network__pulse--one" d="M75 112C168 112 218 184 332 286" />
          <path className="about-network__pulse about-network__pulse--two" d="M540 120C478 168 423 216 332 286" />
          <path className="about-network__pulse about-network__pulse--three" d="M548 446C462 410 408 357 332 286" />
          <path className="about-network__pulse about-network__pulse--four" d="M70 442C163 408 223 354 332 286" />
        </g>
        <path className="about-network__rail" d="M40 315H574" />
        <path className="about-network__rail-live" d="M40 315H574" />
        <g className="about-network__wave">
          <path d="M88 366h55l16-26 24 54 24-77 28 49h54l18-18 27 35 25-54 27 37h109" />
        </g>
        <g className="about-network__junction">
          <circle cx="332" cy="286" r="58" />
          <circle cx="332" cy="286" r="43" />
        </g>
      </svg>
      <div className="about-network__core"><BoltIcon /><b>ON AIR</b><small>JUNCTION 01</small></div>
      <span className="about-network__node about-network__node--news"><i />NEWS</span>
      <span className="about-network__node about-network__node--culture"><i />CULTURE</span>
      <span className="about-network__node about-network__node--chaos"><i />CHAOS</span>
      <span className="about-network__node about-network__node--chat"><i />CHAT</span>
      <div className="about-network__meter"><span>INPUT</span><i /><i /><i /><i /><i /><strong>UNPREDICTABLE</strong></div>
      <div className="about-network__status"><span><i /> SIGNAL OPEN</span><b>ALL SUBJECTS FEED THE SHOW</b></div>
    </div>
  );
}

function FormatInstrument({ type }: { type: (typeof formatModules)[number]["key"] }) {
  if (type === "aboot") return (
    <div className="format-instrument format-bracket" aria-hidden="true">
      <div><i /><i /><i /><i /></div><span className="format-bracket__line format-bracket__line--one" /><span className="format-bracket__line format-bracket__line--two" /><b>?</b>
    </div>
  );
  if (type === "beatdown") return (
    <div className="format-instrument format-impact" aria-hidden="true">
      <span>MON</span><i /><div><b>POP</b><b>VS</b><b>CULTURE</b></div><i /><span>ROUND</span>
    </div>
  );
  if (type === "news") return (
    <div className="format-instrument format-news-track" aria-hidden="true">
      <div><span>NEWS</span><i /><span>TOPIC 01</span><i /><span>DETOUR</span><i /><span>?</span></div>
      <svg viewBox="0 0 450 100"><path d="M12 52h145c46 0 29 31 74 31h79c43 0 36-60 78-60h50" /><circle cx="158" cy="52" r="5" /><circle cx="310" cy="83" r="5" /></svg>
    </div>
  );
  return (
    <div className="format-instrument format-switch" aria-hidden="true">
      <div className="format-switch__hub"><BoltIcon /></div><i className="format-switch__track format-switch__track--one" /><i className="format-switch__track format-switch__track--two" /><i className="format-switch__track format-switch__track--three" /><span>RAID</span><span>WHEEL</span><span>MERCH</span><b>?</b>
    </div>
  );
}

function CommunityCircuit() {
  return (
    <div className="community-circuit" aria-hidden="true">
      <div className="community-circuit__meta"><span>TR / OPEN LOOP</span><strong>AUDIENCE INPUT ENABLED</strong></div>
      <div className="community-circuit__scope"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="community-circuit__path community-circuit__path--one" />
      <div className="community-circuit__path community-circuit__path--two" />
      <div className="community-circuit__node community-circuit__node--chat"><span>01</span><b>CHAT</b><small>STEERS</small></div>
      <div className="community-circuit__node community-circuit__node--hosts"><span>02</span><b>HOSTS</b><small>RESPOND</small></div>
      <div className="community-circuit__node community-circuit__node--show"><span>03</span><b>SHOW</b><small>DERAILS</small></div>
      <div className="community-circuit__wheel"><div><BoltIcon /></div><span>THE WHEEL</span></div>
      <p>NO FAKE MESSAGES · NO PASSIVE AUDIENCE · LIVE INPUT</p>
    </div>
  );
}
