import { useEffect, useRef, type RefObject } from "react";

export function useModalDialog(root: RefObject<HTMLElement>, initialFocus: RefObject<HTMLElement>, onEscape: () => void, active = true) {
  const escape = useRef(onEscape);
  const activated = useRef(false);
  escape.current = onEscape;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null; const priorOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = priorOverflow; previous?.focus(); };
  }, []);

  useEffect(() => {
    if (!active) return;
    if (!activated.current) { activated.current = true; initialFocus.current?.focus(); }
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); escape.current(); return; }
      if (event.key !== "Tab" || !root.current) return;
      const items = [...root.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter((item) => !item.hidden && item.offsetParent !== null);
      if (!items.length) return; const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [active, initialFocus, root]);
}
