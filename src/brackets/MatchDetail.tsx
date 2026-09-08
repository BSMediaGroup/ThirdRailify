import { Link } from 'react-router-dom';
import { opponents, type Match } from './model.mjs';
import type { Bracket } from './types';
import { statusLabel } from './status';
import './match-detail.css';
function Trophy() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v2a4 4 0 0 0 5 4M17 5h4v2a4 4 0 0 1-5 4M12 14v4M8 21v-3h8v3M6 21h12" /></svg>; }
export function MatchDetail({ bracket, match, onClose }: { bracket: Bracket; match: Match; onClose: () => void }) {
  const pair = opponents(bracket.graph, match, bracket.decisions), result = bracket.decisions.find(d => d.matchId === match.id), source = bracket.sources[match.id];
  const review = bracket.needsReview.includes(match.id), winner = !review && result ? pair.find(c => c?.id === result.winnerId) : null;
  const provenance = result?.source === 'poll' ? 'Confirmed Poll result' : result?.source === 'bye' ? 'Advanced by bye' : result?.source === 'historical' ? 'Historical result' : 'Manual result';
  return <section className="match-showcase">
    <header className="match-showcase__intro"><p className="bracket-eyebrow">{bracket.graph.presentation.title || 'Aboot Nothing'}</p><h2>The matchup.</h2><span className={`match-showcase__status${winner ? ' is-decided' : ''}`}>{review ? 'Result under review' : winner ? provenance : source ? statusLabel(source.state) : 'Upcoming matchup'}</span>{match.description ? <p className="match-showcase__description">{match.description}</p> : null}</header>
    {winner ? <div className="match-verdict"><span className="match-verdict__icon"><Trophy /></span><div><span className="bracket-eyebrow">{result?.source === 'bye' ? 'Advancing contender' : 'Confirmed winner'}</span><h3>{winner.name}</h3></div><span className="match-verdict__sparkles" aria-hidden="true">&#10022; &#10022; &#10022;</span></div> : review ? <p className="bracket-alert">This result is being reviewed. A winner will be highlighted once the result is confirmed.</p> : null}
    <div className="match-showcase__duel"><span className="match-showcase__vs" aria-hidden="true">VS</span>{pair.map((c,i) => { const won = !!winner && winner.id === c?.id; const score = source?.scores && c ? source.scores[c.id] ?? null : result?.scores[i] ?? null; return <article key={match.slots[i].id} className={`match-contender${won ? ' is-winner' : winner ? ' is-runner-up' : ''}`}>
      <div className="match-contender__art">{c?.image ? <img src={`/api/brackets/media/${c.image}`} alt={`${c.name} artwork`} /> : <span className="match-contender__monogram" aria-hidden="true">{c?.name.slice(0,1) || '?'}</span>}<span className="match-contender__label">{won ? <><Trophy /> {result?.source === 'bye' ? 'ADVANCES' : 'WINNER'}</> : `CONTENDER ${i + 1}`}</span></div>
      <div className="match-contender__body"><h3>{c?.name || (match.slots[i].kind === 'bye' ? 'Explicit bye' : 'Awaiting opponent')}</h3>{c?.description ? <p>{c.description}</p> : null}<div className="match-contender__score"><span>{source?.scores ? 'Poll votes' : result?.source === 'bye' ? 'No votes awarded' : 'Recorded score'}</span><strong>{won ? <Trophy /> : null}{score ?? '\u2014'}</strong></div></div>
    </article>; })}</div>
    <footer className="match-showcase__footer"><p>{result && result.source !== 'poll' ? 'Historical and manual scores are recorded separately from Poll votes.' : source ? 'Follow the linked Poll for the full matchup and voting details.' : 'The next chapter is still to be decided.'}</p><div>{source?.slug ? <Link className="match-showcase__poll" to={`/polls/${source.slug}`}>Open related Poll <span aria-hidden="true">&#8599;</span></Link> : null}<button onClick={onClose}>Back to bracket</button></div></footer>
  </section>;
}
