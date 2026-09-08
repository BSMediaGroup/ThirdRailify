import { useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { incrementPoll } from '../polls/client';
import type { Poll } from '../polls/types';
import { EphemeralNotices } from './EphemeralNotices';
import '../styles/poll-increment.css';

export function PollIncrement({ poll, option, disabled, onChanged }: { poll: Poll; option: Poll['options'][number]; disabled: boolean; onChanged: (poll: Poll) => void }) {
  const { csrfToken } = useAuth();
  const [amount, setAmount] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const pending = useRef<{ amount: number; id: string } | null>(null);
  const add = async () => {
    if (busy || disabled || !csrfToken || !Number.isInteger(amount) || amount < 1 || amount > 10000) return;
    if (!pending.current || pending.current.amount !== amount) pending.current = { amount, id: crypto.randomUUID() };
    setBusy(true); setError('');
    try { const result = await incrementPoll(poll.slug, option.id, amount, pending.current.id, csrfToken); pending.current = null; onChanged(result.poll); setNotice(`${amount} vote${amount === 1 ? '' : 's'} added to ${option.label}.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to add votes.'); }
    finally { setBusy(false); }
  };
  return <><div className="poll-increment" role="group" aria-label={`Add votes to ${option.label}`}>
    <button type="button" aria-label={`Decrease votes to add to ${option.label}`} disabled={busy || disabled || amount <= 1} onClick={() => setAmount(n => n - 1)}>−</button>
    <input type="number" min={1} max={10000} step={1} aria-label={`Votes to add to ${option.label}`} value={amount} disabled={busy || disabled} onChange={e => setAmount(Number(e.target.value))} />
    <button type="button" aria-label={`Increase votes to add to ${option.label}`} disabled={busy || disabled || amount >= 10000} onClick={() => setAmount(n => n + 1)}>+</button>
    <button type="button" disabled={busy || disabled || !Number.isInteger(amount) || amount < 1 || amount > 10000} onClick={() => void add()}>{busy ? 'Adding…' : `Add ${amount}`}</button>
  </div><EphemeralNotices notice={notice} error={error} noticeTitle="Votes added" errorTitle="Votes not added" onDismissNotice={() => setNotice('')} onDismissError={() => setError('')} /></>;
}
