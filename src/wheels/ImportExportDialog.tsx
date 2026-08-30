import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import packageInfo from "../../package.json";
import { CloseIcon, CopyIcon } from "../components/Icons";
import { useModalDialog } from "./dialog";
import type { Wheel, WheelConfig, WheelEntry } from "./types";
import {
  WHEEL_FILE_FORMAT_VERSION,
  WHEEL_FILE_LIMITS,
  WHEEL_FILE_MIME,
  WHEEL_IMPORT_ACCEPT,
  WHEEL_JSON_MIME,
  copyPortableText,
  createPortableWheel,
  downloadPortableText,
  embedCurrentWheelMedia,
  parseWheelImport,
  safeWheelFilename,
  serializePortableWheel,
  type PortableMediaSet,
  type WheelImportProposal,
  type WheelImportResult,
} from "./portable.mjs";

export type ImportedWheelContent = { title: string; description: string; config: WheelConfig; entries: WheelEntry[]; media: PortableMediaSet; sourceFormat: string };

type ExportSource = Pick<Wheel, "title" | "description" | "config" | "entries" | "media"> & { slug?: string };
type Props = {
  source: ExportSource;
  mode: "new" | "existing";
  canExport?: boolean;
  currentMedia?: Wheel["media"];
  onClose: () => void;
  onApply: (content: ImportedWheelContent) => void;
};

export function ImportExportDialog({ source, mode, canExport = true, currentMedia, onClose, onApply }: Props) {
  const root = useRef<HTMLDivElement>(null); const close = useRef<HTMLButtonElement>(null); const fileInput = useRef<HTMLInputElement>(null);
  const exportBusy = useRef(false);
  const [tab, setTab] = useState<"import" | "export">("import"); const [pasteOpen, setPasteOpen] = useState(false); const [paste, setPaste] = useState(""); const [result, setResult] = useState<WheelImportResult | null>(null); const [selected, setSelected] = useState(0); const [confirming, setConfirming] = useState(false); const [includeMedia, setIncludeMedia] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [dragging, setDragging] = useState(false);
  const requestClose = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]); useModalDialog(root, close, requestClose);
  const proposal = result?.proposals[selected] || null;
  const estimatedBaseBytes = useMemo(() => Math.max(500, JSON.stringify({ title: source.title, description: source.description, config: source.config, entries: source.entries }).length * 1.2), [source]);
  const estimatedMediaBytes = includeMedia ? Number(source.media?.background?.byteSize || 0) + Number(source.media?.centre?.byteSize || 0) + (source.media?.segmentFills || []).reduce((total, asset) => total + asset.byteSize, 0) : 0;

  const parseInput = async (input: string | Uint8Array, sourceName: string) => {
    setBusy(true); setError(""); setNotice(""); setConfirming(false);
    try { const parsed = await parseWheelImport(input, { sourceName, defaultConfig: source.config }); setResult(parsed); setSelected(0); setNotice(`${parsed.formatLabel} detected. Review the conversion before loading it.`); }
    catch (reason) { setResult(null); setError(message(reason)); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  };
  const readFile = async (file: File) => { if (file.size > WHEEL_FILE_LIMITS.fileBytes) { setError("The wheel file exceeds the 18 MB portable-file limit."); return; } try { await parseInput(new Uint8Array(await file.arrayBuffer()), file.name); } catch (reason) { setError(message(reason)); } };
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) void readFile(file); };
  const apply = () => {
    if (!proposal) return;
    if (mode === "existing" && !confirming) { setConfirming(true); return; }
    onApply({ title: proposal.title, description: proposal.description, config: proposal.config, entries: proposal.entries, media: proposal.media, sourceFormat: result?.formatLabel || "Imported JSON" });
  };
  const exportWheel = async (kind: "twl" | "json" | "copy") => {
    if (exportBusy.current) return; exportBusy.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const media = includeMedia ? await embedCurrentWheelMedia(source as Wheel) : { background: null, center: null, segments: [] };
      const portable = await createPortableWheel(source, { media, generatorVersion: packageInfo.version, sourceSlug: source.slug || "" });
      const text = serializePortableWheel(portable);
      if (kind === "copy") { await copyPortableText(text); setNotice("Canonical Third Railify wheel JSON copied."); }
      else { downloadPortableText(text, safeWheelFilename(source.title, kind), kind === "twl" ? WHEEL_FILE_MIME : WHEEL_JSON_MIME); setNotice(`${kind === "twl" ? ".twl" : "JSON"} download prepared locally.`); }
    } catch (reason) { setError(message(reason)); } finally { exportBusy.current = false; setBusy(false); }
  };

  return createPortal(<div className="wheel-modal-backdrop transfer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <div ref={root} className="wheel-modal wheel-transfer-dialog" role="dialog" aria-modal="true" aria-labelledby="wheel-transfer-title">
      <header className="wheel-modal__header"><div><p className="eyebrow">WHEEL CONTROL / PORTABLE FILES</p><h2 id="wheel-transfer-title">Import / Export</h2><span>Content only · authority and official history stay on the server</span></div><button ref={close} type="button" onClick={requestClose} disabled={busy} aria-label="Close Import / Export"><CloseIcon /></button></header>
      {canExport ? <div className="wheel-transfer-tabs" role="tablist" aria-label="Import and export"><button type="button" role="tab" aria-selected={tab === "import"} className={tab === "import" ? "is-active" : ""} onClick={() => setTab("import")}>Import</button><button type="button" role="tab" aria-selected={tab === "export"} className={tab === "export" ? "is-active" : ""} onClick={() => setTab("export")}>Export</button></div> : null}
      <div className="wheel-transfer-body">
        {tab === "import" || !canExport ? <section className="wheel-transfer-import" aria-label="Import wheel content">
          <div className={`wheel-drop-zone${dragging ? " is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={drop}><strong>Drop a wheel file here</strong><span>.twl, .json or Wheel of Names .wheel · detected from content</span><label className="button button--secondary">Choose file<input ref={fileInput} type="file" accept={WHEEL_IMPORT_ACCEPT} onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); }} /></label><button className="button button--ghost button--compact" type="button" onClick={() => setPasteOpen((value) => !value)}>{pasteOpen ? "Close JSON paste" : "Paste JSON"}</button></div>
          {pasteOpen ? <div className="wheel-json-paste"><label htmlFor="wheel-json-paste">Canonical or supported participant JSON</label><textarea id="wheel-json-paste" value={paste} maxLength={WHEEL_FILE_LIMITS.textCharacters} rows={8} spellCheck={false} onChange={(event) => setPaste(event.target.value)} placeholder='{"entries":["Alice","Bob"]}' /><button type="button" className="button button--secondary" disabled={!paste.trim() || busy} onClick={() => void parseInput(paste, "Pasted JSON")}>Review pasted JSON</button></div> : null}
          {result ? <ImportPreview result={result} selected={selected} onSelect={(index) => { setSelected(index); setConfirming(false); }} proposal={proposal} /> : null}
          {proposal && confirming ? <div className="wheel-replace-confirm" role="alert"><strong>Load imported content into this editor?</strong><dl><div><dt>Title</dt><dd>{source.title} → {proposal.title}</dd></div><div><dt>Participants</dt><dd>{source.entries.length} → {proposal.entries.length}</dd></div><div><dt>Custom media</dt><dd>{mediaChange(currentMedia || source.media, proposal.media)}</dd></div></dl><p>Wheel identity, owner, grants, locks and official result history remain unchanged. Nothing is persisted until you press the editor’s existing Save action.</p><div><button type="button" className="button button--secondary" onClick={() => setConfirming(false)}>Back to review</button><button type="button" className="button button--primary" onClick={apply}>Load import into editor</button></div></div> : null}
        </section> : <section className="wheel-transfer-export" aria-label="Export wheel content">
          <div className="wheel-format-card"><p className="eyebrow">THIRD RAILIFY PORTABLE WHEEL</p><h3>.twl format v{WHEEL_FILE_FORMAT_VERSION}</h3><p>UTF-8 JSON with canonical creator-editable settings, entries, ordering and a SHA-256 corruption-detection hash.</p><dl><div><dt>Estimated file</dt><dd>{formatBytes(estimatedBaseBytes + estimatedMediaBytes * 1.34)}</dd></div><div><dt>Media</dt><dd>{includeMedia ? formatBytes(estimatedMediaBytes) : "Not included"}</dd></div></dl></div>
          <label className="wheel-media-export-toggle"><input type="checkbox" checked={includeMedia} onChange={(event) => setIncludeMedia(event.target.checked)} /><span><strong>Include custom background, centre, and referenced segment images</strong><small>Off by default. Each referenced segment asset is embedded once; authorized media is capped at 12 MB total.</small></span></label>
          {!includeMedia ? <p className="wheel-transfer-note">Custom imagery is not included. Media URLs, R2 keys and signed URLs are never exported.</p> : null}
          <div className="wheel-export-actions"><button type="button" className="button button--primary" disabled={busy} onClick={() => void exportWheel("twl")}>Download .twl</button><button type="button" className="button button--secondary" disabled={busy} onClick={() => void exportWheel("json")}>Download JSON</button><button type="button" className="button button--ghost" disabled={busy} onClick={() => void exportWheel("copy")}><CopyIcon /> Copy JSON</button></div>
          <div className="wheel-export-exclusions"><strong>Deliberately excluded</strong><p>Owner/account IDs, grants, permissions, authoritative IDs/slugs/revisions, official results and spin IDs, locks, audits, rate limits, R2 keys, signed URLs, sessions, CSRF, HMAC and secrets.</p></div>
        </section>}
        <aside className="wheel-transfer-privacy"><strong>Import privacy</strong><p>Entries become public if you publish the resulting wheel. Do not import email addresses, payment details, street addresses or sensitive personal information. Files cannot grant access or import official history. External URLs and executable content are ignored or rejected.</p></aside>
      </div>
      {error ? <p className="wheel-alert" role="alert">{error}</p> : null}{notice ? <p className="wheel-notice" role="status">{notice}</p> : null}
      <footer className="wheel-modal__footer"><button type="button" className="button button--secondary" onClick={requestClose} disabled={busy}>Return to editor</button>{tab === "import" && proposal && !confirming ? <button type="button" className="button button--primary" disabled={busy} onClick={apply}>{mode === "new" ? "Use as new wheel" : "Review replacement"}</button> : null}</footer>
    </div>
  </div>, document.body);
}

function ImportPreview({ result, selected, onSelect, proposal }: { result: WheelImportResult; selected: number; onSelect: (index: number) => void; proposal: WheelImportProposal | null }) {
  if (!proposal) return null;
  return <div className="wheel-import-preview"><header><div><p className="eyebrow">DETECTED SOURCE</p><h3>{result.formatLabel}{result.version ? ` v${result.version}` : ""}</h3><span>{result.sourceName}</span></div><b>{proposal.integrityStatus === "verified" ? "Integrity verified" : "No integrity hash"}</b></header>
    {result.proposals.length > 1 ? <label className="wheel-config-picker">Select one wheel configuration<select value={selected} onChange={(event) => onSelect(Number(event.target.value))}>{result.proposals.map((item, index) => <option key={item.sourceIndex} value={index}>{item.title} · {item.entries.length} entries</option>)}</select><small>One configuration loads at a time; the parsed file stays available in this dialog.</small></label> : null}
    <div className="wheel-import-summary"><Summary label="Title" value={proposal.title} /><Summary label="Participants" value={String(proposal.summary.participantCount)} /><Summary label="Active / hidden" value={`${proposal.summary.activeCount} / ${proposal.summary.hiddenCount}`} /><Summary label="Duplicates" value={String(proposal.summary.duplicateLabelCount)} /><Summary label="Weighted" value={`${proposal.summary.weightedEntryCount} · total ${proposal.summary.totalWeight}`} /><Summary label="Colours" value={String(proposal.summary.colourCount)} /><Summary label="Media" value={proposal.summary.mediaDetected ? "Embedded proposal" : "None"} /><Summary label="Description" value={proposal.description ? "Present" : "Empty"} /></div>
    <div className="wheel-conversion-report"><h4>Conversion report</h4><ol>{proposal.messages.map((item, index) => <li className={`is-${item.severity}`} key={`${item.sourceField}-${index}`}><b>{item.severity.toUpperCase()}</b><span><strong>{item.sourceField}</strong> → {item.target}<small>{item.reason}</small></span></li>)}</ol></div>
  </div>;
}
function Summary({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function mediaChange(current: Wheel["media"], incoming: PortableMediaSet) { const currentCount = Number(Boolean(current?.background)) + Number(Boolean(current?.centre)); const incomingCount = Number(Boolean(incoming.background)) + Number(Boolean(incoming.center)); if (!currentCount && !incomingCount) return "No custom media"; if (currentCount && !incomingCount) return "Current custom media will be removed on Save"; return `${incomingCount} imported image${incomingCount === 1 ? "" : "s"} will replace current media on Save`; }
function formatBytes(value: number) { if (value < 1024) return `${Math.ceil(value)} B`; if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`; return `${(value / 1024 / 1024).toFixed(1)} MB`; }
function message(reason: unknown) { return reason instanceof Error ? reason.message : "The wheel file could not be processed."; }
