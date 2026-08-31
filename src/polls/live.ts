import { useEffect } from "react";
const subscribers = new Set<() => void>(); let timer = 0;
function schedule() { if (timer || !subscribers.size) return; timer = window.setInterval(() => { if (!document.hidden) subscribers.forEach((callback) => callback()); }, 7000); }
export function useCoordinatedPollRefresh(callback: () => void, active = true) { useEffect(() => { if (!active) return; subscribers.add(callback); schedule(); return () => { subscribers.delete(callback); if (!subscribers.size && timer) { window.clearInterval(timer); timer = 0; } }; }, [active, callback]); }
