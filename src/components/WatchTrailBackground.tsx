export function WatchTrailBackground() {
  return (
    <div className="watch-trail-bg" aria-hidden="true">
      <i className="watch-trail-bg__wash" />
      <i className="watch-trail-bg__horizon" />
      <svg className="watch-trail-bg__trails" viewBox="0 0 1600 660" preserveAspectRatio="none">
        <path className="watch-trail-bg__trail watch-trail-bg__trail--ghost" d="M-120 552C148 430 312 536 535 408S895 278 1084 352 1390 482 1720 196" />
        <path className="watch-trail-bg__trail watch-trail-bg__trail--ghost" d="M-110 612C190 496 392 616 654 469S1008 353 1170 409 1422 493 1710 312" />
        <path className="watch-trail-bg__trail watch-trail-bg__trail--ghost" d="M-100 472C174 389 330 450 502 341S816 208 1010 278 1366 402 1710 125" />
        <path className="watch-trail-bg__trail watch-trail-bg__trail--ghost" d="M-90 385C238 310 411 354 604 260S951 158 1137 214 1430 318 1690 96" />
        <path className="watch-trail-bg__trail watch-trail-bg__trail--pulse watch-trail-bg__trail--pulse-one" d="M-120 552C148 430 312 536 535 408S895 278 1084 352 1390 482 1720 196" />
        <path className="watch-trail-bg__trail watch-trail-bg__trail--pulse watch-trail-bg__trail--pulse-two" d="M-100 472C174 389 330 450 502 341S816 208 1010 278 1366 402 1710 125" />
        <g className="watch-trail-bg__nodes">
          <circle cx="535" cy="408" r="4" /><circle cx="1010" cy="278" r="3" />
          <circle cx="1170" cy="409" r="4" /><circle cx="1430" cy="318" r="3" />
        </g>
      </svg>
      <div className="watch-trail-bg__constellation">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div>
      <div className="watch-trail-bg__beacon"><i /><i /><span /></div>
      <i className="watch-trail-bg__scanner" />
    </div>
  );
}
