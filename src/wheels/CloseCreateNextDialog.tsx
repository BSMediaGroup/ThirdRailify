import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { closeAndCreateNext } from "./client";
import type { Wheel, WheelEntry } from "./types";
import { entryDisplayLabel } from "../lib/entrant-label.mjs";

export function CloseCreateNextDialog({
  wheel,
  winner,
  resultId,
  csrfToken,
  onCancel,
}: {
  wheel: Wheel;
  winner?: WheelEntry;
  resultId: string;
  csrfToken: string;
  onCancel: () => void;
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(`${wheel.title} - Next`);
  const [copyParticipants, setCopyParticipants] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!wheel.revision || confirmation !== "CLOSE") return;
    setBusy(true);
    setError("");
    try {
      const payload = await closeAndCreateNext(
        wheel.slug,
        {
          revision: wheel.revision,
          resultId,
          title,
          copyParticipants,
          idempotencyKey: crypto.randomUUID(),
        },
        csrfToken,
      );
      navigate(`/wheels/${payload.successorSlug}/edit`, { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The Wheel could not be closed.",
      );
      setBusy(false);
    }
  };
  return createPortal(
    <div className="wheel-modal-backdrop" role="presentation">
      <section
        className="wheel-modal close-next-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="close-next-title"
      >
        <header className="wheel-modal__header">
          <div>
            <p className="eyebrow">OFFICIAL RESULT</p>
            <h2 id="close-next-title">Close &amp; create next</h2>
            <p>
              This preserves the official winner, closes this Wheel into Past
              Wheels, and creates a private draft successor. Visual settings,
              media, access, and disabled automation definitions are copied.
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cancel">
            ×
          </button>
        </header>
        <div className="close-next-dialog__body">
          {error ? <p role="alert">{error}</p> : null}
          <div className="close-next-summary">
            <div><small>Closing wheel</small><strong>{wheel.title}</strong></div>
            <span aria-hidden="true">→</span>
            <div><small>Recorded winner</small><strong>{winner ? entryDisplayLabel(winner) : "Official result"}</strong><em>{winner?.code || resultId}</em></div>
          </div>
          <div className="close-next-copied">
            <small>COPIED INTO PRIVATE DRAFT</small>
            <span>Theme &amp; appearance</span><span>Media &amp; sounds</span><span>Access</span><span>Disabled automations</span>
          </div>
          <label>
            <span>Successor title</span>
            <input
              value={title}
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="close-next-copy">
            <input
              type="checkbox"
              checked={copyParticipants}
              onChange={(event) => setCopyParticipants(event.target.checked)}
            />
            <span>
              <b>Copy current participants</b>
              <small>
                Off by default. When enabled, names, weights, state, media,
                style, and appearance are copied with fresh entry IDs and
                entrant codes.
              </small>
            </span>
          </label>
          <label>
            <span>Type CLOSE to confirm</span>
            <input
              value={confirmation}
              autoComplete="off"
              onChange={(event) =>
                setConfirmation(event.target.value.toUpperCase())
              }
            />
          </label>
          <p>
            <b>Not copied:</b> results, activity receipts, counters, source
            bindings, roster contributions, or active automation state.
          </p>
        </div>
        <footer className="wheel-modal__footer">
          <button
            className="button button--secondary"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="button button--primary"
            type="button"
            onClick={() => void submit()}
            disabled={busy || confirmation !== "CLOSE" || !title.trim()}
          >
            {busy ? "Closing…" : "Close & create private draft"}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
