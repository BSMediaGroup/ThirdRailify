import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import danielPortrait from "../../assets/people/daniel-tradition.webp";
import darnellPortrait from "../../assets/people/darnell1.webp";
import davyPortrait from "../../assets/people/davy1.webp";
import { ArrowIcon, BoltIcon, CloseIcon, PlayIcon, RadioIcon } from "../components/Icons";
import { useMotionGate } from "../hooks/useMotionGate";

type FriendKey = "daniel" | "darnell" | "davy";

type FriendProfile = {
  key: FriendKey;
  number: string;
  name: string;
  nickname: string;
  portrait: string;
  portraitAlt: string;
  appearances: string;
  role: string;
  shortBio: string;
  fullBio: string;
  signal: string[];
  links: { label: string; handle: string; href: string }[];
};

const friends: FriendProfile[] = [
  {
    key: "daniel",
    number: "01",
    name: "Daniel Clancy",
    nickname: "CUNT",
    portrait: danielPortrait,
    portraitAlt: "Daniel Clancy holding a glass water pipe and torch",
    appearances: "Most News Hangouts",
    role: "Website builder / designer / professional noise source",
    shortBio: "Cheeky, strident, loud, and very, very silly. Builds the website, designs shit, makes annoying noises, and keeps inventing stupid names for people.",
    fullBio: "Daniel appears on most News Hangouts, where cheeky, strident, loud commentary competes with the annoying noises and whatever stupid nickname he has invented for somebody that week. Off mic, he builds and runs the website and designs the shit that makes the Third Railify universe look like itself. Very capable. Very silly. Often both at once.",
    signal: ["News Hangout", "Web + design", "Unlicensed noises"],
    links: [
      { label: "Rumble", handle: "/danielclancy", href: "https://rumble.com/danielclancy" },
      { label: "YouTube", handle: "@danielclancy", href: "https://youtube.com/@danielclancy" },
      { label: "X", handle: "@danielclancy", href: "https://x.com/danielclancy" },
    ],
  },
  {
    key: "darnell",
    number: "02",
    name: "Darnell Quiggley",
    nickname: "SQUIGGLE",
    portrait: darnellPortrait,
    portraitAlt: "Illustrated portrait of Darnell Quiggley",
    appearances: "Pop Culture Beat Downs / occasional News Hangouts",
    role: "Ex-cop turned actor / straight-edge authority enjoyer",
    shortBio: "Hilariously silly, annoyingly straight edge, and still far too willing to trust authority. A regular in the Pop Culture Beat Down ring.",
    fullBio: "Darnell is a regular on Pop Culture Beat Downs and an occasional News Hangout arrival. An ex-cop turned actor, he brings the deeply inconvenient combination of being genuinely hilarious, aggressively straight edge, and far too willing to believe authority probably knows what it is doing. It rarely does.",
    signal: ["Pop Culture Beat Down", "News Hangout", "Trusts the process"],
    links: [
      { label: "Rumble", handle: "/lightscameracitation", href: "https://rumble.com/lightscameracitation" },
      { label: "X", handle: "@darnellquiggly", href: "https://x.com/darnellquiggly" },
    ],
  },
  {
    key: "davy",
    number: "03",
    name: "Simple Davy",
    nickname: "BAWLZ",
    portrait: davyPortrait,
    portraitAlt: "Portrait of Simple Davy in a dark hoodie",
    appearances: "Most News Hangouts",
    role: "Diabolical humour / evidentiary tweet department",
    shortBio: "A diabolical sense of humour and a direct-message history that should probably be reviewed by the appropriate authorities.",
    fullBio: "Simple Davy appears on most News Hangouts with a diabolical sense of humour and the sort of tweets that feel less like messages and more like evidence. He should probably be in prison for the shit he sends Shawn. Until the paperwork clears, he remains one of the regulars.",
    signal: ["News Hangout", "Diabolical humour", "Tweets as evidence"],
    links: [
      { label: "Rumble", handle: "/user/SimpleDavy", href: "https://rumble.com/user/SimpleDavy" },
      { label: "YouTube", handle: "@OffLabelPod", href: "https://youtube.com/@OffLabelPod" },
    ],
  },
];

export function FriendsPage() {
  const hero = useMotionGate<HTMLDivElement>();
  const roster = useMotionGate<HTMLElement>();
  const close = useMotionGate<HTMLElement>();
  const triggers = useRef<Partial<Record<FriendKey, HTMLButtonElement | null>>>({});
  const [selected, setSelected] = useState<FriendProfile | null>(null);
  const closeProfile = useCallback(() => setSelected(null), []);

  return (
    <div className="friends-page">
      <section className="friends-hero" aria-labelledby="friends-title">
        <div className="friends-hero__ambient" aria-hidden="true"><i /><i /><i /></div>
        <div className="container friends-hero__layout">
          <div className="friends-hero__copy">
            <p className="eyebrow"><i /> Friends of the show / frequent offenders</p>
            <h1 id="friends-title">The regulars.<br /><span>Chaos has a<br />guest list.</span></h1>
            <p className="friends-hero__lede">The third, fourth, and deeply unnecessary extra voices in the room. They arrive for news, pop culture, and a sensible conversation—then help make sure none of those things survive intact.</p>
            <div className="button-row">
              <a className="button button--primary" href="#roster"><RadioIcon /> Meet the regulars</a>
              <Link className="button button--secondary" to="/watch"><PlayIcon /> Watch the show</Link>
            </div>
            <div className="friends-hero__facts" aria-label="Friends of Third Railify context">
              <span><b>03</b><small>Frequent offenders</small></span>
              <span><b>NO FIXED</b><small>Seating plan</small></span>
              <span><b>LIVE</b><small>Bad ideas travel</small></span>
            </div>
          </div>
          <FriendsSignalStage motion={hero} />
        </div>
        <div className="friends-hero__ticker" aria-hidden="true"><span>DANIEL</span><i /><span>DARNELL</span><i /><span>DAVY</span><i /><strong>THREE OPEN MICS / ZERO ADULT SUPERVISION</strong></div>
      </section>

      <section ref={roster.ref} id="roster" className={`friends-roster${roster.active ? " is-active" : ""}`} data-motion={roster.active ? "active" : "static"} aria-labelledby="roster-title">
        <div className="container friends-section-heading">
          <div><p className="eyebrow">Recurring voices / unofficial dossiers</p><h2 id="roster-title">Pull up<br />another <span>mic.</span></h2></div>
          <p>Not hosts. Not exactly guests. These are the people who keep turning up, know where everything is, and have long since lost the right to pretend they are innocent bystanders.</p>
        </div>
        <div className="container friends-roster__grid">
          {friends.map((friend) => (
            <button
              ref={(node) => { triggers.current[friend.key] = node; }}
              className={`friend-card friend-card--${friend.key}`}
              type="button"
              key={friend.key}
              onClick={() => setSelected(friend)}
              aria-haspopup="dialog"
              aria-label={`Open ${friend.name} profile`}
            >
              <span className="friend-card__meta"><b>{friend.number} / REGULAR</b><i>SELECT PROFILE</i></span>
              <span className="friend-card__visual">
                <span className="friend-card__grid" aria-hidden="true" />
                <img src={friend.portrait} alt={friend.portraitAlt} width="900" height="1000" loading="lazy" decoding="async" />
                <span className="friend-card__scan" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
                <span className="friend-card__status"><i /> SIGNAL RECURRING</span>
              </span>
              <span className="friend-card__copy">
                <span className="friend-card__identity"><small>{friend.name}</small><strong>“{friend.nickname}”</strong></span>
                <span className="friend-card__appearance">{friend.appearances}</span>
                <span className="friend-card__bio">{friend.shortBio}</span>
                <span className="friend-card__open">Open dossier <ArrowIcon /></span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section ref={close.ref} className={`friends-close${close.active ? " is-active" : ""}`} data-motion={close.active ? "active" : "static"} aria-labelledby="friends-close-title">
        <div className="friends-close__rails" aria-hidden="true"><i /><i /><i /></div>
        <div className="container friends-close__inner">
          <p className="eyebrow">The room stays open</p>
          <span className="friends-close__kicker">REGULAR DOES NOT MEAN PREDICTABLE</span>
          <h2 id="friends-close-title">The rundown<br />never had<br /><em>room for this.</em></h2>
          <p>See where the conversation starts, where the regulars take it, and how quickly the wheels leave the track.</p>
          <div className="button-row">
            <Link className="button button--primary" to="/watch"><PlayIcon /> Watch Third Railify</Link>
            <Link className="button button--secondary" to="/about">Inside the signal <ArrowIcon /></Link>
          </div>
        </div>
      </section>

      {selected ? <FriendDialog profile={selected} onClose={closeProfile} /> : null}
    </div>
  );
}

function FriendsSignalStage({ motion }: { motion: ReturnType<typeof useMotionGate<HTMLDivElement>> }) {
  return (
    <div ref={motion.ref} className={`friends-signal${motion.active ? " is-active" : ""}`} data-motion={motion.active ? "active" : "static"} aria-hidden="true">
      <div className="friends-signal__meta"><span>TR / OPEN MIC ARRAY</span><strong>3 SIGNALS ACQUIRED</strong></div>
      <div className="friends-signal__grid" />
      <div className="friends-signal__rings"><i /><i /><i /></div>
      <div className="friends-signal__portrait friends-signal__portrait--daniel"><img src={danielPortrait} alt="" width="900" height="1000" decoding="async" /><span>01 / DANIEL</span></div>
      <div className="friends-signal__portrait friends-signal__portrait--darnell"><img src={darnellPortrait} alt="" width="900" height="1000" decoding="async" /><span>02 / DARNELL</span></div>
      <div className="friends-signal__portrait friends-signal__portrait--davy"><img src={davyPortrait} alt="" width="900" height="1000" decoding="async" /><span>03 / DAVY</span></div>
      <div className="friends-signal__rail"><i /></div>
      <div className="friends-signal__bolt"><BoltIcon /><b>OPEN</b></div>
      <div className="friends-signal__scope"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="friends-signal__status"><span><i /> ALL MICS HOT</span><b>NO FIXED SEATING / NO SAFE TOPIC</b></div>
    </div>
  );
}

function FriendDialog({ profile, onClose }: { profile: FriendProfile; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="friend-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialog} className={`friend-dialog friend-dialog--${profile.key}`} role="dialog" aria-modal="true" aria-labelledby={`friend-dialog-${profile.key}-title`} aria-describedby={`friend-dialog-${profile.key}-bio`}>
        <button ref={close} className="friend-dialog__close" type="button" onClick={onClose} aria-label={`Close ${profile.name} profile`}><CloseIcon /></button>
        <div className="friend-dialog__portrait">
          <span className="friend-dialog__index">TR / REGULAR {profile.number}</span>
          <span className="friend-dialog__portrait-grid" aria-hidden="true" />
          <img src={profile.portrait} alt={profile.portraitAlt} width="900" height="1000" decoding="async" />
          <span className="friend-dialog__portrait-status"><i /> SIGNAL IDENTIFIED</span>
        </div>
        <div className="friend-dialog__copy">
          <p className="eyebrow">Friends of the show / dossier {profile.number}</p>
          <h2 id={`friend-dialog-${profile.key}-title`}><span>{profile.name}</span>“{profile.nickname}”</h2>
          <p className="friend-dialog__role">{profile.role}</p>
          <p id={`friend-dialog-${profile.key}-bio`} className="friend-dialog__bio">{profile.fullBio}</p>
          <ul className="friend-dialog__signal" aria-label={`${profile.name} show signals`}>{profile.signal.map((item, index) => <li key={item}><span>0{index + 1}</span>{item}</li>)}</ul>
          <div className="friend-dialog__links" aria-label={`${profile.name} channel and social links`}>
            <span>FOLLOW THE OUTGOING SIGNAL</span>
            {profile.links.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"><span><b>{link.label}</b><small>{link.handle}</small></span><ArrowIcon /></a>)}
          </div>
        </div>
      </div>
    </div>
  );
}
