import { BoltIcon } from "./Icons";

export function GalleryHeroAtmosphere({ variant }: { variant: "wheels" | "polls" }) {
  return (
    <div className={`gallery-hero__atmosphere gallery-hero__atmosphere--${variant}`} aria-hidden="true">
      <div className="gallery-hero__grid-field" />
      <div className="gallery-hero__aurora" />
      <svg className="gallery-hero__traces" viewBox="0 0 1600 760" preserveAspectRatio="none">
        {variant === "wheels" ? (
          <>
            <path className="gallery-hero__trace gallery-hero__trace--ghost" d="M-80 530 C150 530 238 484 390 484 S640 552 810 430 1068 250 1250 352 1430 480 1680 238" />
            <path className="gallery-hero__trace gallery-hero__trace--ghost gallery-hero__trace--fine" d="M-40 248 C150 296 240 394 420 384 S675 246 840 338 1070 532 1240 420 1450 272 1660 330" />
            <path className="gallery-hero__trace gallery-hero__trace--live" d="M-80 530 C150 530 238 484 390 484 S640 552 810 430 1068 250 1250 352 1430 480 1680 238" />
          </>
        ) : (
          <>
            <path className="gallery-hero__trace gallery-hero__trace--ghost" d="M-40 560 C160 560 210 440 370 440 S590 575 760 410 1010 232 1190 360 1390 525 1660 245" />
            <path className="gallery-hero__trace gallery-hero__trace--ghost gallery-hero__trace--fine" d="M-40 204 C170 230 292 350 438 354 S666 256 824 342 1054 528 1246 406 1455 244 1660 304" />
            <path className="gallery-hero__trace gallery-hero__trace--live" d="M-40 560 C160 560 210 440 370 440 S590 575 760 410 1010 232 1190 360 1390 525 1660 245" />
          </>
        )}
      </svg>
      <div className="gallery-hero__nodes">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div>
      <div className="gallery-hero__sweep" />
      <div className="gallery-hero__scanlines" />
    </div>
  );
}

export function PollSignalDiagram() {
  return (
    <div className="poll-signal-diagram" aria-hidden="true">
      <div className="poll-signal-diagram__halo" />
      <div className="poll-signal-diagram__orbit poll-signal-diagram__orbit--outer"><i /><i /></div>
      <div className="poll-signal-diagram__orbit poll-signal-diagram__orbit--inner"><i /><i /></div>
      <svg className="poll-signal-diagram__links" viewBox="0 0 620 560" preserveAspectRatio="none">
        <path d="M36 154 C120 154 126 222 218 222" />
        <path d="M36 408 C124 408 130 340 218 340" />
        <path d="M402 280 C478 280 486 280 586 280" />
        <path className="is-live" d="M36 154 C120 154 126 222 218 222 M36 408 C124 408 130 340 218 340 M402 280 C478 280 486 280 586 280" />
      </svg>
      <div className="poll-signal-source poll-signal-source--web"><i /><span>WEB INPUT</span><b>OPEN</b></div>
      <div className="poll-signal-source poll-signal-source--rumble"><i /><span>RUMBLE CHAT</span><b>LIVE</b></div>
      <div className="poll-signal-console">
        <header><span><i /> AUDIENCE SIGNAL</span><b>REFRESHING</b></header>
        <div className="poll-signal-console__question"><small>LIVE CHOICE / 04</small><strong>READ THE ROOM</strong></div>
        <div className="poll-signal-console__options">
          <span><i /><b>A</b><em>42%</em></span>
          <span><i /><b>B</b><em>28%</em></span>
          <span><i /><b>C</b><em>19%</em></span>
          <span><i /><b>D</b><em>11%</em></span>
        </div>
        <footer><span>ONE CURRENT VOTE / SOURCE</span><b>SYNC 00:03</b></footer>
      </div>
      <div className="poll-signal-result"><span>LEADING</span><strong>A</strong><i><BoltIcon /></i><b>42%</b></div>
      <div className="poll-signal-diagram__caption"><span>TR / LIVE CHOICE</span><strong>AUTHORITATIVE RESULT BUS</strong></div>
    </div>
  );
}
