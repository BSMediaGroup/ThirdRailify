import { useState } from 'react';
import { entryAngles } from './engine.mjs';
import type { WheelEntry } from './types';
import './entrant-avatars.css';

export function EntrantAvatar({ url }: { url?: string | null }) {
  const [failed, setFailed] = useState('');
  const image = typeof url === 'string' && /^https:\/\//i.test(url) && failed !== url;
  return <span className="entrant-avatar" aria-hidden="true">{image ? <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailed(url)} /> : <svg viewBox="0 0 48 48" role="presentation"><circle cx="24" cy="24" r="23" fill="#181810" stroke="#f3c928" strokeWidth="2" /><circle cx="24" cy="17" r="7" fill="#f3c928" /><path d="M11 37c0-8 6-12 13-12s13 4 13 12" fill="#f3c928" /></svg>}</span>;
}

export function WheelAvatarLayer({ entries, mode }: { entries: WheelEntry[]; mode: string }) {
  if (mode === 'names') return null;
  return <div className="wheel-avatar-layer" aria-hidden="true">{entryAngles(entries).map(({ entry, start, end, centre }) => {
    const radius = mode === 'both' ? 18 : 29;
    const size = Math.min(mode === 'both' ? 8 : 12, 2 * radius * Math.sin(Math.min(Math.PI, end - start) / 2) * .8);
    if (size < 1.5) return null;
    return <div key={entry.id} className="wheel-avatar-position" style={{ left: `${50 + Math.sin(centre) * radius}%`, top: `${50 - Math.cos(centre) * radius}%`, width: `${size}%`, height: `${size}%` }}><EntrantAvatar url={entry.avatarUrl} /></div>;
  })}</div>;
}
