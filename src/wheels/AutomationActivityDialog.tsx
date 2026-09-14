import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { entryDisplayLabel } from "../lib/entrant-label.mjs";
import { listWheelActivity } from "./client";
import type { WheelActivityItem } from "./types";

export function AutomationActivityDialog({
  slug,
  onClose,
}: {
  slug: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<WheelActivityItem[]>([]);
  const [cursor, setCursor] = useState<string | null>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const close = useRef<HTMLButtonElement>(null);
  const load = useCallback(async (next = "") => {
    setLoading(true);
    setError("");
    try {
      const payload = await listWheelActivity(slug, next);
      setItems((current) =>
        next ? [...current, ...payload.items] : payload.items,
      );
      setCursor(payload.nextCursor);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Activity is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);
  useEffect(() => {
    void load();
    close.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [load, onClose]);
  return createPortal(
    <div
      className="wheel-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="wheel-modal wheel-activity-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wheel-activity-title"
      >
        <header className="wheel-modal__header">
          <div>
            <p className="eyebrow">WHEEL LEDGER</p>
            <h2 id="wheel-activity-title">Activity</h2>
            <p>
              Safe automation outcomes recorded for this Wheel. Raw chat and
              provider identifiers are never shown here.
            </p>
          </div>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            aria-label="Close activity"
          >
            ×
          </button>
        </header>
        <div className="wheel-activity-dialog__body">
          {error ? (
            <p className="wheel-activity-dialog__error" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && !items.length ? (
            <p className="rail-empty">
              No automation activity has been recorded.
            </p>
          ) : (
            <ol>
              {items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>
                      {item.entrant
                        ? entryDisplayLabel(item.entrant)
                        : "No entrant"}
                    </strong>
                    {item.entrant?.code ? (
                      <code>{item.entrant.code}</code>
                    ) : null}
                  </div>
                  <span>{item.eventType}</span>
                  <b>{item.awardDelta > 0 ? `+${item.awardDelta}` : "0"}</b>
                  <small>
                    {item.outcome.replaceAll("_", " ")} ·{" "}
                    {formatDate(item.createdAt)}
                  </small>
                </li>
              ))}
            </ol>
          )}
          {loading ? <p role="status">Loading activity…</p> : null}
        </div>
        <footer className="wheel-modal__footer">
          {cursor ? (
            <button
              type="button"
              className="button button--secondary"
              disabled={loading}
              onClick={() => void load(cursor)}
            >
              Load more
            </button>
          ) : null}
          <button
            type="button"
            className="button button--primary"
            onClick={onClose}
          >
            Done
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
