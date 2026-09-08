import { useEffect, useRef } from 'react';

// Content refresh is independent of visual animation. Never applies during an accepted spin/editor.
export function useWheelRefresh<T>(key: string, blocked: boolean, read: () => Promise<T>, apply: (value: T) => void) {
  const latest = useRef({ blocked, read, apply }); latest.current = { blocked, read, apply };
  useEffect(() => {
    if (!key || blocked) return;
    let stopped = false, pending = false, timer = 0;
    const refresh = async () => {
      window.clearTimeout(timer);
      if (stopped || pending || document.hidden || latest.current.blocked) return;
      pending = true;
      try { const value = await latest.current.read(); if (!stopped && !latest.current.blocked) latest.current.apply(value); }
      catch { /* Existing content remains visible; the next bounded refresh can recover. */ }
      finally { pending = false; if (!stopped && !document.hidden) timer = window.setTimeout(() => void refresh(), 15000); }
    };
    const wake = () => { if (!document.hidden) void refresh(); else window.clearTimeout(timer); };
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('wheel-content-updated') : null;
    if (channel) channel.onmessage = wake;
    window.addEventListener('focus', wake); document.addEventListener('visibilitychange', wake);
    timer = window.setTimeout(() => void refresh(), 15000);
    return () => { stopped = true; window.clearTimeout(timer); channel?.close(); window.removeEventListener('focus', wake); document.removeEventListener('visibilitychange', wake); };
  }, [key, blocked]);
}
export function publishWheelRefresh() {
  if (typeof BroadcastChannel !== 'function') return;
  const channel = new BroadcastChannel('wheel-content-updated'); channel.postMessage('refresh'); channel.close();
}
