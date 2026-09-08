import { Link } from 'react-router-dom';
import { useMotionGate } from '../hooks/useMotionGate';
import { GalleryHeroAtmosphere } from './GalleryHeroVisuals';
import '../styles/aboot-hero.css';

export function AbootNothingHero() {
  const motion = useMotionGate<HTMLElement>();
  return <section ref={motion.ref} className={`aboot-hero gallery-hero${motion.active ? ' is-motion-active' : ''}`} data-motion={motion.active ? 'active' : 'static'}>
    <GalleryHeroAtmosphere variant="polls" />
    <div className="container aboot-hero__grid">
      <div className="aboot-hero__copy">
        <Link className="aboot-hero__back" to="/polls">← All Polls</Link>
        <p className="eyebrow">THE THIRD RAIL · ABOOT NOTHING</p>
        <h1>Two sides.<br /><em>One loud<br />opinion.</em></h1>
        <p className="aboot-hero__intro">Big questions. Petty rivalries. Absolutely no sitting on the fence. Pick your side and let the audience settle it.</p>
        <div className="aboot-hero__actions"><a className="button button--primary" href="#poll-directory">Find your matchup <span aria-hidden="true">↗</span></a><span>YOUR SIDE. YOUR SAY.</span></div>
      </div>
      <div className="aboot-duel" aria-hidden="true">
        <div className="aboot-duel__orbit" /><div className="aboot-duel__orbit aboot-duel__orbit--inner" />
        <div className="aboot-duel__caption"><i /> THE OPINION ARENA <span>01 / 02</span></div>
        <div className="aboot-duel__cards">
          <div className="aboot-duel__side aboot-duel__side--a"><span className="aboot-duel__index">01 — SIDE A</span><strong>A</strong><div className="aboot-duel__wave">{Array.from({ length: 17 }, (_, i) => <i key={i} style={{ height: `${18 + ((i * 19) % 47)}%`, animationDelay: `${i * -.17}s` }} />)}</div><b>MAKE YOUR<br />CASE.</b><span className="aboot-duel__foot">BACK YOUR SIDE <span>↗</span></span></div>
          <div className="aboot-duel__side aboot-duel__side--b"><span className="aboot-duel__index">02 — SIDE B</span><strong>B</strong><div className="aboot-duel__wave">{Array.from({ length: 17 }, (_, i) => <i key={i} style={{ height: `${18 + ((i * 23) % 47)}%`, animationDelay: `${i * -.23}s` }} />)}</div><b>BEG TO<br />DIFFER.</b><span className="aboot-duel__foot">HAVE YOUR SAY <span>↗</span></span></div>
          <div className="aboot-gallery-hero__mark aboot-duel__vs">VS</div>
        </div>
        <div className="aboot-duel__verdict"><span>TWO PERSPECTIVES</span><i /><b>YOU CALL IT.</b></div>
      </div>
    </div>
    <div className="aboot-hero__rail"><span><b>01</b> PICK YOUR SIDE</span><span><b>02</b> CAST YOUR VOTE</span><span><b>03</b> SEE WHO TAKES IT</span></div>
  </section>;
}
