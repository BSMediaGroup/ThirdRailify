import { useId, type CSSProperties } from 'react';
import { useMotionGate } from '../hooks/useMotionGate';
import '../styles/show-feature-art.css';

type Scene = 'debate' | 'culture' | 'news';

// All artwork is native vector geometry. IDs stay unique across mounted scenes.
export function ShowFeatureArt({ scene }: { scene: Scene }) {
  const id = useId().replace(/:/g, '');
  const motion = useMotionGate<HTMLDivElement>();
  const paint = (name: string) => `url(#${id}-${name})`;
  return <div ref={motion.ref} className={`universe-card__art show-art show-art--${scene}`} data-motion={motion.active ? 'active' : 'static'} aria-hidden="true">
    <div className="show-art__halo show-art__halo--cyan" /><div className="show-art__halo show-art__halo--pink" />
    <svg viewBox="0 0 600 400" fill="none" focusable="false">
      <defs>
        <linearGradient id={`${id}-metal`} x1="-46" y1="0" x2="48" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#292d25" /><stop offset=".2" stopColor="#f2da87" /><stop offset=".38" stopColor="#7f794d" /><stop offset=".62" stopColor="#24291f" /><stop offset=".86" stopColor="#d6be6d" /><stop offset="1" stopColor="#4c4930" /></linearGradient>
        <linearGradient id={`${id}-cyan`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b8ffff" /><stop offset=".3" stopColor="#26c8df" /><stop offset="1" stopColor="#073441" /></linearGradient>
        <linearGradient id={`${id}-pink`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffd3f1" /><stop offset=".3" stopColor="#ed379f" /><stop offset="1" stopColor="#4f0b37" /></linearGradient>
        <linearGradient id={`${id}-case`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#797155" /><stop offset=".15" stopColor="#282a24" /><stop offset=".8" stopColor="#101916" /><stop offset="1" stopColor="#635635" /></linearGradient>
        <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e3ce86" /><stop offset="1" stopColor="#7d713e" /></linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffd451" stopOpacity=".27" /><stop offset="1" stopColor="#ffd451" stopOpacity="0" /></linearGradient>
        <radialGradient id={`${id}-screen`}><stop stopColor="#edebe0" stopOpacity=".32" /><stop offset="1" stopColor="#060b0d" stopOpacity=".68" /></radialGradient>
        <pattern id={`${id}-grid`} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" stroke="#9da99b" strokeOpacity=".08" /></pattern>
        <pattern id={`${id}-scan`} width="4" height="7" patternUnits="userSpaceOnUse"><path d="M0 1H600" stroke="#020707" strokeOpacity=".4" strokeWidth="2" /></pattern>
        <clipPath id={`${id}-crt`}><rect x="178" y="95" width="244" height="188" rx="24" /></clipPath>
        <g id={`${id}-mic`}>
          <ellipse cy="148" rx="52" ry="10" fill="#020805" opacity=".7" />
          <path d="M-36 138Q0 128 36 138L42 146Q0 155-42 146Z" fill={paint('metal')} stroke="#c4b677" />
          <path d="M-8 100V135H8V100" fill={paint('metal')} stroke="#bbae75" />
          <path d="M-53 5V57Q-53 103 0 103T53 57V5" stroke="#141e1c" strokeWidth="12" />
          <path d="M-53 5V57Q-53 103 0 103T53 57V5" stroke="#b6a86a" strokeWidth="4" />
          <rect x="-43" y="-92" width="86" height="168" rx="40" fill={paint('metal')} stroke="#e8d28a" strokeWidth="2" />
          <rect x="-33" y="-81" width="66" height="147" rx="31" fill="#091411" stroke="currentColor" strokeOpacity=".65" />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M-31 ${-60 + i * 10}H31`} stroke={paint('metal')} strokeWidth="5" />)}
          <path d="M-6-79V64H6V-79" fill={paint('metal')} />
          <path d="M-33-55V38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="-52" cy="13" r="8" fill="#101b17" stroke="#bcab6d" strokeWidth="3" /><circle cx="52" cy="13" r="8" fill="#101b17" stroke="#bcab6d" strokeWidth="3" />
        </g>
        <g id={`${id}-glove`}>
          <path d="M-142-27L-94-34-87 31-142 28Z" fill="currentColor" stroke="#0a1c22" strokeWidth="5" />
          <path d="M-108-35L-88-38-78 36-100 38Z" fill="#0c242b" stroke="currentColor" strokeWidth="2" />
          <path d="M-86-29C-71-69 2-77 30-47 49-26 53 9 29 32 11 51-37 58-63 35L-79 30Z" fill="var(--glove-paint)" stroke="currentColor" strokeWidth="2" />
          <path d="M-72 18C-67-8-44-18-30-6-17 4-22 26-40 30" fill="var(--glove-paint)" stroke="#07131c" strokeWidth="4" />
          <path d="M-55-43C-32-61 3-57 17-39M-53 37Q-11 49 18 26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".8" />
          <path d="M-95-19L-84-20M-92-7L-82-8M-90 5L-81 4M-89 17L-78 16" stroke="#b9d1c6" strokeWidth="2" />
        </g>
      </defs>
      <rect width="600" height="400" fill={paint('grid')} />
      <g className="show-art__orbits" stroke="#b7a56a" strokeOpacity=".16"><circle cx="300" cy="200" r="152" /><circle cx="300" cy="200" r="177" strokeDasharray="2 13" /><path d="M0 200H600M300 25V375" /></g>
      {scene === 'debate' ? <>
        <g className="show-art__wave" stroke="#f4d563" strokeWidth="2"><path d="M180 205H212L224 193 234 218 247 174 262 229 278 198 291 204 305 183 321 224 334 182 348 215 360 198 374 205H420" /><path d="M193 205H407" opacity=".25" strokeWidth="14" /></g>
        <g transform="translate(154 193) rotate(-13)"><g className="show-art__mic-left" color="#42d8e9"><use href={`#${id}-mic`} /></g></g>
        <g transform="translate(446 193) rotate(13)"><g className="show-art__mic-right" color="#f660aa"><use href={`#${id}-mic`} /></g></g>
        <g className="show-art__sparks" stroke="#f3d467" strokeWidth="2"><path d="M288 131L294 150M310 139L304 153M294 257L286 279M310 253L320 272" /></g>
        <text x="300" y="311" textAnchor="middle" className="show-art__headline">MAKE YOUR CASE.</text>
      </> : scene === 'culture' ? <>
        <g className="show-art__burst" strokeWidth="2"><path d="M150 131L81 65 108 142 41 119 138 196M163 85L143 37M450 128L523 57 491 145 568 125 467 202M445 292L510 347M149 289L79 342" stroke="#34cbdc" /><path d="M461 96L492 55M127 280L46 301M473 272L555 298M315 60L333 25" stroke="#e743a0" /><path d="M145 111L116 59M456 299L487 349M207 68L193 40" stroke="#eed077" /></g>
        <g className="show-art__tv"><path d="M259 68L224 36M335 68L375 26" stroke="#b4a978" strokeWidth="4" /><circle cx="224" cy="36" r="4" fill="#28bdca" /><circle cx="375" cy="26" r="4" fill="#eb4999" />
          <rect x="151" y="70" width="298" height="268" rx="15" fill={paint('case')} stroke="#baaa68" strokeWidth="2" /><rect x="162" y="81" width="276" height="215" rx="27" fill="#030b0b" stroke="#525747" strokeWidth="4" />
          <g clipPath={paint('crt')}>
            {['#cbc9a8', '#d5b331', '#21bdc9', '#499777', '#d53987', '#a63b43', '#3c4f88'].map((color, i) => <rect key={color} x={178 + i * 35} y="95" width="36" height="188" fill={color} />)}
            <rect x="178" y="242" width="244" height="41" fill="#071411" />{Array.from({ length: 8 }, (_, i) => <rect key={i} x={178 + i * 31} y="249" width="16" height="18" fill="#d9d5c0" />)}
            <rect x="178" y="95" width="244" height="188" fill={paint('screen')} /><rect x="178" y="95" width="244" height="188" fill={paint('scan')} />
            <path className="show-art__scan" d="M178 150H422" stroke="#dcfff0" strokeOpacity=".4" strokeWidth="12" />
            <path d="M300 184L276 95M300 184L345 95M300 184L422 138M300 184L402 283M300 184L224 275M300 184L178 153" stroke="#081612" strokeWidth="2" />
          </g>
          <path d="M174 310H317M174 318H317M174 326H317" stroke="#8c8257" strokeWidth="2" /><circle cx="354" cy="316" r="12" fill="#080f0b" stroke="#a69861" strokeWidth="3" /><circle cx="398" cy="316" r="15" fill="#101912" stroke="#a69861" strokeWidth="3" /><path d="M398 304V310" stroke="#ebd779" strokeWidth="2" />
        </g>
        <g transform="translate(148 216) rotate(-8)" color="#51def0" style={{ '--glove-paint': paint('cyan') } as CSSProperties}><g className="show-art__punch-left"><use href={`#${id}-glove`} /></g></g>
        <g transform="translate(452 216) scale(-1 1) rotate(-8)" color="#fa69b8" style={{ '--glove-paint': paint('pink') } as CSSProperties}><g className="show-art__punch-right"><use href={`#${id}-glove`} /></g></g>
      </> : <>
        <g className="show-art__radio" stroke="#d4b64e">{[55, 76, 98, 120, 143].map((r, i) => <circle key={r} cx="301" cy="155" r={r} opacity={.38 - i * .05} style={{ animationDelay: `${i * -.7}s` }} />)}</g>
        <path d="M442 62L335 315H596Z" fill={paint('beam')} />
        <path d="M545 273L546 80Q539 30 485 38L446 56" stroke="#666349" strokeWidth="5" /><path d="M420 56Q447 24 474 49L492 78Q449 83 416 64Z" fill="#24291b" stroke="#c8b76b" /><ellipse cx="453" cy="67" rx="36" ry="9" transform="rotate(12 453 67)" fill="#f9d371" />
        <ellipse cx="305" cy="307" rx="272" ry="72" fill="#09100e" stroke="#455045" strokeWidth="2" /><ellipse cx="305" cy="296" rx="272" ry="69" fill="#111a16" stroke="#706741" />
        <path d="M58 294Q310 355 551 294M110 261Q300 303 504 261" stroke="#6f7552" strokeOpacity=".25" />
        <g transform="translate(155 303) rotate(-15)"><path d="M-51-44H91V53H-51Z" fill={paint('paper')} stroke="#eed893" /><path d="M-39-29H75M-39-19H75" stroke="#333c29" strokeWidth="4" /><rect x="-38" y="-4" width="40" height="35" fill="#384635" /><path d="M12-3H75M12 6H75M12 15H75M12 24H75M-38 42H75" stroke="#53593b" strokeWidth="3" /></g>
        <g className="show-art__paper" transform="translate(374 320) rotate(14)"><path d="M-40-38H90V47H-40Z" fill={paint('paper')} stroke="#efd48a" /><text x="-28" y="-17" fill="#18271e" fontSize="16" fontWeight="900" fontFamily="monospace">THE DAILY</text><path d="M-28-6H76" stroke="#3c4530" strokeWidth="3" /><rect x="-28" y="5" width="44" height="29" fill="#3b4633" /><path d="M25 7H76M25 16H76M25 25H76M25 34H76" stroke="#626240" strokeWidth="3" /></g>
        <g transform="translate(302 181) scale(.62)" color="#f1d574"><use href={`#${id}-mic`} /></g>
        <g transform="translate(118 235)" stroke="#59c1c7"><path d="M-20-23H20L16 18Q0 29-17 18Z" fill="#0c2627" /><ellipse cy="-23" rx="20" ry="6" fill="#050f0e" /><path d="M20-15C45-21 44 16 18 10" strokeWidth="3" /></g>
        <g transform="translate(472 269)" stroke="#ce599b"><path d="M-20-23H20L16 18Q0 29-17 18Z" fill="#27131f" /><ellipse cy="-23" rx="20" ry="6" fill="#10090e" /><path d="M20-15C45-21 44 16 18 10" strokeWidth="3" /></g>
        <g className="show-art__steam" stroke="#d2d0aa" strokeOpacity=".5" strokeWidth="2"><path d="M118 195C106 181 130 177 119 162M472 226C459 212 483 207 473 192" /></g>
        <g transform="translate(78 308) rotate(24)"><path d="M-25 7V-10C-25-44 30-44 30-10V7" stroke="#979466" strokeWidth="8" /><rect x="-33" y="-5" width="17" height="32" rx="7" fill="#192b29" stroke="#37b4be" /><rect x="20" y="-5" width="17" height="32" rx="7" fill="#192b29" stroke="#c4b777" /></g>
        <g transform="translate(385 259)"><path d="M-28-14H28L39 13H-38Z" fill="#212c22" stroke="#6a7349" />{['#39d7e8', '#f3cf57', '#f355a6'].map((c, i) => <circle className="show-art__led" key={c} cx={i * 21 - 21} cy="0" r="4" fill={c} style={{ animationDelay: `${i * -.7}s` }} />)}</g>
      </>}
      <g className="show-art__dust" fill="#e8d08a">{Array.from({ length: 15 }, (_, i) => <circle key={i} cx={37 + (i * 97) % 530} cy={47 + (i * 61) % 290} r={i % 3 === 0 ? 2 : 1} style={{ animationDelay: `${i * -.4}s` }} />)}</g>
      <path d="M22 53V23H52M548 23H578V53M22 347V377H52M548 377H578V347" stroke="#b6a35e" strokeOpacity=".45" />
      <text x="36" y="45" className="show-art__caption">{scene === 'debate' ? 'TWO SIDES / ONE LIVE WIRE' : scene === 'culture' ? 'CULTURE / COLLISION COURSE' : 'AFTER HOURS / ON AIR'}</text>
      <g transform="translate(526 359)" className="show-art__equalizer" fill="currentColor">{[9, 17, 12, 23, 14, 8].map((height, i) => <rect key={i} x={i * 5} y={-height} width="2" height={height} style={{ animationDelay: `${i * -.2}s` }} />)}</g>
    </svg>
  </div>;
}

