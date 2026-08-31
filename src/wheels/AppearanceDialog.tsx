import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EphemeralNotices } from "../components/EphemeralNotices";
import {
  getWheel,
  removeWheelMedia,
  saveWheel,
  uploadWheelMedia,
} from "./client";
import type { Wheel, WheelConfig, WheelMediaAsset, WheelThemePreset } from "./types";
import { WheelCanvas } from "./WheelCanvas";
import { WinnerCelebration } from "./WinnerCelebration";
import {
  applyStylesToEntries,
  movePaletteStyle,
  normalizeCustomPaletteStyles,
  paletteStyleForEntry,
} from "./appearance.mjs";
import { SegmentStyleDialog, SegmentStylePreview } from "./SegmentStyleDialog";
import { SPIN_SOUND_PRESETS, WINNER_SOUND_PRESETS, normalizePaletteStyles, resolvedEntryStyle, solidSegmentStyle, type SegmentStyle } from "./segmentStyles.mjs";
import { spinSoundProfile, winnerSoundProfile } from "./soundPresets.mjs";
import { useModalDialog } from "./dialog";
import { RefreshIcon } from "../components/Icons";
import "../styles/wheels-hotfix.css";

type PaletteOption = {
  key: string;
  label: string;
  kind: string;
  palette: string[];
  styles?: SegmentStyle[];
  pointerAccent: string;
  themePreset: WheelThemePreset;
};
const WHEEL_PALETTES: readonly PaletteOption[] = [
  {
    key: "third-rail-gold",
    label: "Third Rail Gold",
    kind: "Signature 4 tone",
    palette: ["#F3C928", "#B8182F", "#F3F0E5", "#20201A"],
    pointerAccent: "#F3C928",
    themePreset: "third-rail-gold",
  },
  {
    key: "live-wire-red",
    label: "Live Wire Crimson",
    kind: "Signature 4 tone",
    palette: ["#B8182F", "#F05A47", "#F3C928", "#211115"],
    pointerAccent: "#F05A47",
    themePreset: "live-wire-red",
  },
  {
    key: "gina-violet",
    label: "Gina Violet",
    kind: "Signature 4 tone",
    palette: ["#6D3A93", "#A965C7", "#F3C928", "#24162D"],
    pointerAccent: "#C98BE5",
    themePreset: "gina-violet",
  },
  {
    key: "high-voltage-mono",
    label: "High Voltage Mono",
    kind: "Signature 4 tone",
    palette: ["#F3F0E5", "#A8A79F", "#34342E", "#11110E"],
    pointerAccent: "#F3C928",
    themePreset: "high-voltage-mono",
  },
  {
    key: "signal-teal",
    label: "Signal Teal",
    kind: "Signature 4 tone",
    palette: ["#27C9B8", "#0D6F73", "#F3C928", "#172725"],
    pointerAccent: "#5FE5D5",
    themePreset: "signal-teal",
  },
  {
    key: "after-hours",
    label: "After Hours",
    kind: "Signature 4 tone",
    palette: ["#D6A521", "#70452D", "#9B1B36", "#16110F"],
    pointerAccent: "#FFD65B",
    themePreset: "after-hours",
  },
  {
    key: "high-voltage-hazard", label: "High Voltage Hazard", kind: "Patterned 4 tone", palette: ["#11110E", "#F3C928", "#2B2B24", "#D6A521"], pointerAccent: "#F3C928", themePreset: "high-voltage-hazard",
    styles: [{ mode: "pattern", color: "#11110E", pattern: "diagonal-stripes", patternColor: "#F3C928" }, { mode: "pattern", color: "#F3C928", pattern: "zigzag", patternColor: "#11110E" }, { mode: "pattern", color: "#2B2B24", pattern: "third-rail-bolts", patternColor: "#F3C928" }, { mode: "solid", color: "#D6A521" }],
  },
  {
    key: "rail-strike", label: "Rail Strike", kind: "Patterned 4 tone", palette: ["#B8182F", "#11110E", "#F3F0E5", "#6F0C1C"], pointerAccent: "#E13D52", themePreset: "rail-strike",
    styles: [{ mode: "pattern", color: "#B8182F", pattern: "checkers", patternColor: "#11110E" }, { mode: "pattern", color: "#11110E", pattern: "third-rail-bolts", patternColor: "#F3C928" }, { mode: "solid", color: "#F3F0E5" }, { mode: "pattern", color: "#6F0C1C", pattern: "reverse-stripes", patternColor: "#F3F0E5" }],
  },
  {
    key: "goated-circuit", label: "GOATED Circuit", kind: "Patterned 4 tone", palette: ["#5B2C83", "#F3C928", "#252329", "#8A55A8"], pointerAccent: "#C98BE5", themePreset: "goated-circuit",
    styles: [{ mode: "pattern", color: "#5B2C83", pattern: "dots", patternColor: "#F3C928" }, { mode: "pattern", color: "#F3C928", pattern: "triangles", patternColor: "#5B2C83" }, { mode: "pattern", color: "#252329", pattern: "third-rail-bolts", patternColor: "#C98BE5" }, { mode: "solid", color: "#8A55A8" }],
  },
  {
    key: "night-signal", label: "Night Signal", kind: "Patterned 4 tone", palette: ["#071B45", "#0D6F73", "#C9CBC8", "#102A3A"], pointerAccent: "#5FE5D5", themePreset: "night-signal",
    styles: [{ mode: "pattern", color: "#071B45", pattern: "chevrons", patternColor: "#5FE5D5" }, { mode: "pattern", color: "#0D6F73", pattern: "waves", patternColor: "#C9CBC8" }, { mode: "pattern", color: "#C9CBC8", pattern: "checkers", patternColor: "#102A3A" }, { mode: "solid", color: "#102A3A" }],
  },
  {
    key: "red-gold-duo",
    label: "Red / Gold Duo",
    kind: "2 tone",
    palette: ["#B8182F", "#F3C928"],
    pointerAccent: "#F3C928",
    themePreset: "third-rail-gold",
  },
  {
    key: "red-charcoal-gold",
    label: "Red / Charcoal / Gold",
    kind: "3 tone",
    palette: ["#B8182F", "#292A27", "#F3C928"],
    pointerAccent: "#F3C928",
    themePreset: "third-rail-gold",
  },
  {
    key: "silver-gradient",
    label: "Silver Gradient",
    kind: "Tonal 5 step",
    palette: ["#F4F5F2", "#C9CBC8", "#90938F", "#555854", "#242623"],
    pointerAccent: "#D6DEE8",
    themePreset: "high-voltage-mono",
  },
  {
    key: "crimson-gradient",
    label: "Crimson Gradient",
    kind: "Tonal 5 step",
    palette: ["#4D0913", "#7F0D1E", "#B8182F", "#D93A4D", "#F06B62"],
    pointerAccent: "#F05A47",
    themePreset: "live-wire-red",
  },
  {
    key: "blue-red-duo",
    label: "Blue / Red Duo",
    kind: "2 tone",
    palette: ["#2864B7", "#B8182F"],
    pointerAccent: "#79AFFF",
    themePreset: "live-wire-red",
  },
  {
    key: "blue-red-gradient",
    label: "Blue / Red Gradient",
    kind: "Blend 5 step",
    palette: ["#153B6B", "#2864B7", "#633B83", "#9C2348", "#B8182F"],
    pointerAccent: "#79AFFF",
    themePreset: "live-wire-red",
  },
  {
    key: "emerald-gradient",
    label: "Emerald Gradient",
    kind: "Tonal 5 step",
    palette: ["#0B3427", "#0F5A3C", "#16845A", "#35A96F", "#8CCF72"],
    pointerAccent: "#64D99A",
    themePreset: "signal-teal",
  },
  {
    key: "green-gold-duo",
    label: "Green / Gold Duo",
    kind: "2 tone",
    palette: ["#167B50", "#F3C928"],
    pointerAccent: "#F3C928",
    themePreset: "signal-teal",
  },
  {
    key: "gold-gradient",
    label: "Gold Gradient",
    kind: "Tonal 5 step",
    palette: ["#6B4F00", "#9B7200", "#C99B12", "#F3C928", "#FFE477"],
    pointerAccent: "#F3C928",
    themePreset: "third-rail-gold",
  },
  {
    key: "navy-silver-red",
    label: "Navy / Silver / Red",
    kind: "3 tone",
    palette: ["#17304F", "#C9CBC8", "#B8182F"],
    pointerAccent: "#D6DEE8",
    themePreset: "high-voltage-mono",
  },
  {
    key: "electric-blue-white",
    label: "Electric Blue / White",
    kind: "2 tone",
    palette: ["#246BFD", "#F7F9FF"],
    pointerAccent: "#79AFFF",
    themePreset: "high-voltage-mono",
  },
  {
    key: "midnight-blue-white",
    label: "Midnight Blue / White",
    kind: "2 tone",
    palette: ["#082B63", "#F3F6FF"],
    pointerAccent: "#5BA8FF",
    themePreset: "high-voltage-mono",
  },
  {
    key: "cobalt-black",
    label: "Cobalt / Black",
    kind: "2 tone",
    palette: ["#2563EB", "#090B10"],
    pointerAccent: "#60A5FA",
    themePreset: "high-voltage-mono",
  },
  {
    key: "ice-blue-navy-white",
    label: "Ice Blue / Navy / White",
    kind: "3 tone",
    palette: ["#8AD8FF", "#123B73", "#F7FBFF"],
    pointerAccent: "#8AD8FF",
    themePreset: "signal-teal",
  },
  {
    key: "royal-blue-gradient",
    label: "Royal Blue Gradient",
    kind: "Tonal 5 step",
    palette: ["#071B45", "#123B82", "#1E5BC6", "#4385F5", "#9CC7FF"],
    pointerAccent: "#79AFFF",
    themePreset: "high-voltage-mono",
  },
  {
    key: "purple-white",
    label: "Purple / White",
    kind: "2 tone",
    palette: ["#6D3A93", "#F7F2FF"],
    pointerAccent: "#C98BE5",
    themePreset: "gina-violet",
  },
  {
    key: "pink-black",
    label: "Pink / Black",
    kind: "2 tone",
    palette: ["#F04491", "#101014"],
    pointerAccent: "#FF7AB8",
    themePreset: "gina-violet",
  },
  {
    key: "gold-purple",
    label: "Gold / Purple",
    kind: "2 tone",
    palette: ["#F3C928", "#5B2C83"],
    pointerAccent: "#F3C928",
    themePreset: "gina-violet",
  },
  {
    key: "green-black",
    label: "Green / Black",
    kind: "2 tone",
    palette: ["#1DBF73", "#07110D"],
    pointerAccent: "#53E69B",
    themePreset: "signal-teal",
  },
  {
    key: "sky-white-navy",
    label: "Sky / White / Navy",
    kind: "3 tone",
    palette: ["#5DB7FF", "#F8FBFF", "#102A56"],
    pointerAccent: "#8AD8FF",
    themePreset: "signal-teal",
  },
];

const DEFAULT_APPEARANCE_CONFIG: Partial<WheelConfig> = {
  themePreset: "third-rail-gold",
  palette: ["#F3C928", "#B8182F", "#F3F0E5", "#20201A"],
  paletteStyles: ["#F3C928", "#B8182F", "#F3F0E5", "#20201A"].map((color) => ({ mode: "solid", color })),
  pointerAccent: "#F3C928",
  centreTreatment: "bolt",
  backgroundIntensity: "high",
  labelContrast: "light",
  winnerSoundEnabled: true,
  spinSoundPreset: "classic-tick",
  winnerSoundPreset: "gold-rise",
  celebrationEnabled: true,
  confettiEnabled: true,
  fireworksEnabled: true,
  winnerLightingEnabled: true,
  celebrationIntensity: "normal",
  backgroundEnabled: true,
  backgroundFocalX: 50,
  backgroundFocalY: 50,
  backgroundImageOpacity: 72,
  backgroundOverlayIntensity: 58,
};

type AppearanceDraft = Pick<
  Wheel,
  | "title"
  | "description"
  | "visibility"
  | "lifecycle"
  | "config"
  | "entries"
  | "revision"
>;
type Props = {
  wheel: Wheel;
  draft?: AppearanceDraft;
  csrfToken: string;
  onClose: () => void;
  onSaved: (wheel: Wheel) => void;
};
type Tab = "theme" | "background" | "centre" | "celebration";

export function AppearanceDialog({
  wheel,
  draft,
  csrfToken,
  onClose,
  onSaved,
}: Props) {
  const initialConfig = draft?.config || wheel.config;
  const initialEntries = draft?.entries || wheel.entries;
  const root = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const controls = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<Tab>("theme");
  const [config, setConfig] = useState(initialConfig);
  const [entries, setEntries] = useState(initialEntries);
  const [customStyles, setCustomStyles] = useState(() =>
    normalizePaletteStyles(initialConfig.paletteStyles, initialConfig.palette).slice(0, 5),
  );
  const [customAccent, setCustomAccent] = useState(initialConfig.pointerAccent);
  const [customPreviewing, setCustomPreviewing] = useState(
    initialConfig.themePreset === "custom",
  );
  const [customDirty, setCustomDirty] = useState(false);
  const [customOverrides, setCustomOverrides] = useState<Set<string>>(
    () => new Set(),
  );
  const [celebrationPreview, setCelebrationPreview] = useState(false);
  const [background, setBackground] = useState<File | null>(null);
  const [centre, setCentre] = useState<File | null>(null);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [removeCentre, setRemoveCentre] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [segmentEditor, setSegmentEditor] = useState<{ kind: "palette"; index: number } | { kind: "entry"; id: string } | null>(null);
  const [stagedSegmentFiles, setStagedSegmentFiles] = useState<Map<string, File>>(() => new Map());
  const backgroundPreview = useObjectUrl(background);
  const centrePreview = useObjectUrl(centre);
  const segmentPreviewUrls = useObjectUrlMap(stagedSegmentFiles);
  const segmentMedia = useMemo(() => [...(wheel.media.segmentFills || []), ...[...stagedSegmentFiles].map(([id, file]) => ({ id, purpose: "segment_fill" as const, url: segmentPreviewUrls[id] || "", contentType: file.type, byteSize: file.size, width: null, height: null, sha256: "", createdAt: "", fileName: file.name }))], [segmentPreviewUrls, stagedSegmentFiles, wheel.media.segmentFills]);
  const animatedCanvasUnavailable = segmentMedia.some((asset) => asset.contentType === "image/gif") && !("ImageDecoder" in window);
  const visibleEntries = useMemo(
    () =>
      entries
        .filter((entry) =>
          entry.label.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 100),
    [entries, search],
  );
  const requestClose = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  useModalDialog(root, close, requestClose, !segmentEditor && !celebrationPreview);
  const patchConfig = (patch: Partial<WheelConfig>) =>
    setConfig((current) => ({ ...current, ...patch }));
  const selectPalette = (option: PaletteOption) => {
    const styles = option.styles || option.palette.map((color) => solidSegmentStyle(color));
    patchConfig({
      themePreset: option.themePreset,
      palette: option.palette,
      paletteStyles: styles,
      pointerAccent: option.pointerAccent,
    });
    setEntries((current) => applyStylesToEntries(current, styles));
    setCustomPreviewing(false);
    setCustomDirty(false);
    setCustomOverrides(new Set());
  };
  const editCustom = (styles: SegmentStyle[], accent = customAccent) => {
    setCustomStyles(styles);
    setCustomAccent(accent);
    setCustomPreviewing(true);
    setCustomDirty(true);
    setCustomOverrides(new Set());
  };
  const applyCustom = () => {
    try {
      const normalized = normalizeCustomPaletteStyles(customStyles, customAccent);
      setCustomStyles(normalized.styles);
      setCustomAccent(normalized.accent);
      patchConfig({
        themePreset: "custom",
        palette: normalized.styles.map((style) => style.color),
        paletteStyles: normalized.styles,
        pointerAccent: normalized.accent,
      });
      setEntries((current) =>
        applyStylesToEntries(current, normalized.styles),
      );
      setCustomPreviewing(true);
      setCustomDirty(false);
      setCustomOverrides(new Set());
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Custom palette is invalid.",
      );
    }
  };
  const previewConfig = customPreviewing
    ? {
        ...config,
        themePreset: "custom" as const,
        palette: customStyles.map((style) => style.color),
        paletteStyles: customStyles,
        pointerAccent: customAccent,
      }
    : config;
  const previewEntries =
    customPreviewing && customDirty
      ? applyStylesToEntries(entries, customStyles).map((entry) =>
          customOverrides.has(entry.id)
            ? entries.find((candidate) => candidate.id === entry.id) || entry
            : entry,
        )
      : entries;
  const updateStyle = (id: string, style: SegmentStyle) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, colour: style.color, style } : entry)),
    );
    if (customPreviewing && customDirty)
      setCustomOverrides((current) => new Set(current).add(id));
  };
  const resetEntrantStyle = (id: string) =>
    updateStyle(id, paletteStyleForEntry(entries, id, normalizePaletteStyles(previewConfig.paletteStyles, previewConfig.palette)));
  const changeTab = (next: Tab) => {
    setTab(next);
    controls.current?.scrollTo({ top: 0 });
  };
  const stageSegmentFile = (file: File) => { const id = crypto.randomUUID(); setStagedSegmentFiles((current) => new Map(current).set(id, file)); return id; };
  const resetPalette = () => {
    if (entries.some((entry) => entry.style || entry.colour) && !window.confirm("Reset the palette and overwrite participant manual style overrides? Labels and weights will be preserved.")) return;
    const styles = (DEFAULT_APPEARANCE_CONFIG.paletteStyles || []).map((style) => ({ ...style }));
    setConfig((current) => ({ ...current, themePreset: "third-rail-gold", palette: [...(DEFAULT_APPEARANCE_CONFIG.palette || [])], paletteStyles: styles, pointerAccent: DEFAULT_APPEARANCE_CONFIG.pointerAccent || "#F3C928" }));
    setEntries((current) => applyStylesToEntries(current, styles));
    setCustomStyles(styles);
    setCustomAccent(DEFAULT_APPEARANCE_CONFIG.pointerAccent || "#F3C928");
    setCustomPreviewing(false);
    setCustomDirty(false);
    setCustomOverrides(new Set());
    setError("");
  };
  const resetAppearance = () => {
    setConfig((current) => ({ ...current, ...DEFAULT_APPEARANCE_CONFIG }));
    setEntries((current) =>
      current.map((entry) => ({ ...entry, colour: null })),
    );
    setCustomStyles(normalizePaletteStyles(DEFAULT_APPEARANCE_CONFIG.paletteStyles, DEFAULT_APPEARANCE_CONFIG.palette || []));
    setCustomAccent(DEFAULT_APPEARANCE_CONFIG.pointerAccent || "#F3C928");
    setCustomPreviewing(false);
    setCustomDirty(false);
    setCustomOverrides(new Set());
    setBackground(null);
    setCentre(null);
    setRemoveBackground(Boolean(wheel.media.background));
    setRemoveCentre(Boolean(wheel.media.centre));
    setSearch("");
    setError("");
    setStagedSegmentFiles(new Map());
    changeTab("theme");
  };
  const save = async () => {
    if (!wheel.revision) return;
    setBusy(true);
    setError("");
    try {
      const source = draft || wheel;
      const replacements = new Map<string, string>();
      const referenced = new Set([...(config.paletteStyles || []).filter((style) => style.mode === "image").map((style) => style.imageAssetId), ...entries.filter((entry) => entry.style?.mode === "image").map((entry) => (entry.style as Extract<SegmentStyle, { mode: "image" }>).imageAssetId)]);
      for (const [localId, file] of stagedSegmentFiles) if (referenced.has(localId)) { const uploaded = await uploadWheelMedia(wheel.slug, "segment-fill", file, csrfToken, file.name); if (!uploaded.asset) throw new Error("The segment image could not be stored."); replacements.set(localId, uploaded.asset.id); }
      const resolveStyle = (style: SegmentStyle) => style.mode === "image" && replacements.has(style.imageAssetId) ? { ...style, imageAssetId: replacements.get(style.imageAssetId)! } : style;
      const savedConfig = { ...config, paletteStyles: (config.paletteStyles || config.palette.map((color) => solidSegmentStyle(color))).map(resolveStyle) };
      const savedEntries = entries.map((entry) => ({ ...entry, style: entry.style ? resolveStyle(entry.style) : null, colour: entry.style ? resolveStyle(entry.style).color : entry.colour }));
      await saveWheel(
        wheel.slug,
        {
          title: source.title,
          description: source.description,
          visibility: source.visibility,
          lifecycle: source.lifecycle,
          config: savedConfig,
          entries: savedEntries,
          revision: source.revision,
        },
        csrfToken,
      );
      if (removeBackground)
        await removeWheelMedia(wheel.slug, "background", csrfToken);
      if (removeCentre) await removeWheelMedia(wheel.slug, "centre", csrfToken);
      if (background)
        await uploadWheelMedia(
          wheel.slug,
          "background",
          await normalizeImage(background, "background"),
          csrfToken,
        );
      if (centre)
        await uploadWheelMedia(
          wheel.slug,
          "centre",
          await normalizeImage(centre, "centre"),
          csrfToken,
        );
      onSaved((await getWheel(wheel.slug)).wheel);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Appearance could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };
  const previewWinner = previewEntries.find(
    (entry) => entry.state === "active",
  ) ||
    previewEntries[0] || {
      id: "winner-preview",
      label: "WINNER PREVIEW",
      order: 0,
      weight: 1,
      colour: previewConfig.palette[0],
      style: null,
      state: "active" as const,
    };
  return (
    <>
      {createPortal(
        <div
          className="appearance-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) requestClose();
          }}
        >
          <div
            ref={root}
            className="appearance-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appearance-title"
          >
            <header>
              <div>
                <p className="eyebrow">WHEEL CONTROL / APPEARANCE</p>
                <h2 id="appearance-title">Tune the broadcast stage.</h2>
              </div>
              <button
                ref={close}
                type="button"
                onClick={requestClose}
                disabled={busy}
                aria-label="Close appearance without saving"
              >
                ×
              </button>
            </header>
            <div
              className="appearance-dialog__tabs"
              role="tablist"
              aria-label="Appearance sections"
            >
              {(["theme", "background", "centre", "celebration"] as Tab[]).map(
                (item) => (
                  <button
                    key={item}
                    role="tab"
                    aria-selected={tab === item}
                    className={tab === item ? "is-active" : ""}
                    onClick={() => changeTab(item)}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            <div className="appearance-dialog__body">
              <aside
                className="appearance-preview"
                style={
                  {
                    "--wheel-accent": previewConfig.pointerAccent,
                    ...(previewConfig.backgroundEnabled &&
                    !removeBackground &&
                    (backgroundPreview || wheel.media.background?.url)
                      ? {
                          backgroundImage: `linear-gradient(rgba(6,7,4,.55),rgba(6,7,4,.82)),url("${backgroundPreview || wheel.media.background?.url}")`,
                          backgroundPosition: `${previewConfig.backgroundFocalX}% ${previewConfig.backgroundFocalY}%`,
                        }
                      : {}),
                  } as React.CSSProperties
                }
              >
                <WheelCanvas
                  entries={previewEntries}
                  config={previewConfig}
                  rotation={0}
                  durationMs={0}
                  spinning={false}
                  compact
                  segmentMedia={segmentMedia}
                  segmentPreviewUrls={segmentPreviewUrls}
                  centreImageUrl={
                    removeCentre
                      ? null
                      : centrePreview || wheel.media.centre?.url
                  }
                />
                <p>Changes preview here before they are published.</p>
              </aside>
              <section ref={controls} className="appearance-controls">
                {tab === "theme" ? (
                  <>
                    <p className="appearance-help">
                      Choose a Third Railify palette or build a custom 1–5
                      colour sequence. Applying any palette intentionally
                      redistributes every entrant; individual colours can then
                      be edited or reset to their active palette position.
                    </p>
                    {animatedCanvasUnavailable ? <p className="wheel-alert">Animated preview is unavailable in this browser; the image remains usable as a static fill.</p> : null}
                    <div className="palette-repair-actions"><button className="button button--secondary button--compact" type="button" onClick={resetPalette} aria-label="Reset all palette colours"><RefreshIcon /> Reset palette to Third Rail Gold</button><small>Replaces palette colours and complete segment styles locally; Save appearance remains required.</small></div>
                    <div className="palette-grid">
                      {WHEEL_PALETTES.map((option) => {
                        const selected =
                          !customPreviewing && paletteMatches(config, option);
                        return (
                          <button
                            key={option.key}
                            type="button"
                            className={selected ? "is-active" : ""}
                            aria-pressed={selected}
                            onClick={() => selectPalette(option)}
                          >
                            <i>
                              {(option.styles || option.palette.map((color) => solidSegmentStyle(color))).map((style, index) => <SegmentStylePreview key={`${option.key}-${index}`} style={style} media={segmentMedia} previewUrls={segmentPreviewUrls} label={`${option.label} slot ${index + 1}`} />)}
                            </i>
                            <b>{option.label}</b>
                            <small>{option.kind}</small>
                          </button>
                        );
                      })}
                    </div>
                    <CustomPaletteEditor
                      styles={customStyles}
                      accent={customAccent}
                      active={customPreviewing}
                      dirty={customDirty}
                      media={segmentMedia}
                      previewUrls={segmentPreviewUrls}
                      onStyles={(styles) => editCustom(styles)}
                      onEdit={(index) => setSegmentEditor({ kind: "palette", index })}
                      onAccent={(accent) => editCustom(customStyles, accent)}
                      onApply={applyCustom}
                      onReset={() =>
                        editCustom(
                          ["#F3C928", "#B8182F", "#F3F0E5", "#20201A"].map((color) => solidSegmentStyle(color)),
                          "#F3C928",
                        )
                      }
                    />
                    <div className="wheel-accent-control">
                      <div>
                        <b>Current wheel accent</b>
                        <small>
                          Manually tune the rim, selector pointer and background
                          signal after applying a palette.
                        </small>
                      </div>
                      <input
                        aria-label="Wheel accent colour picker"
                        type="color"
                        value={previewConfig.pointerAccent}
                        onChange={(event) => {
                          const value = event.target.value.toUpperCase();
                          if (customPreviewing) editCustom(customStyles, value);
                          else patchConfig({ pointerAccent: value });
                        }}
                      />
                      <HexTextInput label="Wheel accent hex colour" value={previewConfig.pointerAccent} onValid={(value) => { if (customPreviewing) editCustom(customStyles, value); else patchConfig({ pointerAccent: value }); }} />
                    </div>
                    <div className="sound-preset-control">
                      <Toggle label="Generated wheel ticks" checked={config.tickingSoundEnabled} onChange={(value) => patchConfig({ tickingSoundEnabled: value })} />
                      <label>Spin sound preset<select value={config.spinSoundPreset || "classic-tick"} onChange={(event) => patchConfig({ spinSoundPreset: event.target.value as WheelConfig["spinSoundPreset"] })}>{SPIN_SOUND_PRESETS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
                      <button type="button" onClick={() => void previewGeneratedSound("spin", config.spinSoundPreset || "classic-tick")} disabled={!config.tickingSoundEnabled || config.spinSoundPreset === "silent"}>Preview sound</button>
                      <small>Generated locally with Web Audio; preview creates no wheel API request.</small>
                    </div>
                    <div className="entrant-colours">
                      <label>
                        Find entrant
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search by label"
                        />
                      </label>
                      <div>
                        {visibleEntries.map((entry) => {
                          const previewEntry = previewEntries.find(
                            (candidate) => candidate.id === entry.id,
                          );
                          const value = resolvedEntryStyle(previewEntry || entry, previewConfig);
                          return (
                            <article key={entry.id}>
                              <span>
                                <SegmentStylePreview style={value} media={segmentMedia} previewUrls={segmentPreviewUrls} label={`${entry.label} fill`} />
                                {entry.label}
                              </span>
                              <button type="button" className="segment-style-action" onClick={() => setSegmentEditor({ kind: "entry", id: entry.id })}><span>Edit style</span></button>
                              <button
                                type="button"
                                onClick={() => resetEntrantStyle(entry.id)}
                              >
                                Reset
                              </button>
                            </article>
                          );
                        })}
                      </div>
                      {entries.length > 100 && !search ? (
                        <small>
                          Showing the first 100 entrants. Search to edit
                          another.
                        </small>
                      ) : null}
                    </div>
                  </>
                ) : null}
                {tab === "background" ? (
                  <>
                    <p className="appearance-help">
                      Use original artwork only. Images are normalized locally,
                      verified again by Admin, and stored in the existing
                      private R2 authority.
                    </p>
                    <MediaPicker
                      label="Background image"
                      recommendation="Recommended 2400×1350 · PNG, JPG, BMP, WebP or safe SVG · 8 MB max"
                      file={background}
                      existing={wheel.media.background?.url || null}
                      removed={removeBackground}
                      onFile={(file) => {
                        setBackground(file);
                        setRemoveBackground(false);
                      }}
                      onRemove={() => {
                        setBackground(null);
                        setRemoveBackground(true);
                      }}
                    />
                    <label className="check-field">
                      <input
                        type="checkbox"
                        checked={config.backgroundEnabled}
                        onChange={(event) =>
                          patchConfig({
                            backgroundEnabled: event.target.checked,
                          })
                        }
                      />{" "}
                      Show custom background
                    </label>
                    <Range
                      label="Horizontal focal point"
                      value={config.backgroundFocalX}
                      onChange={(value) =>
                        patchConfig({ backgroundFocalX: value })
                      }
                    />
                    <Range
                      label="Vertical focal point"
                      value={config.backgroundFocalY}
                      onChange={(value) =>
                        patchConfig({ backgroundFocalY: value })
                      }
                    />
                    <Range
                      label="Image intensity"
                      value={config.backgroundImageOpacity}
                      onChange={(value) =>
                        patchConfig({ backgroundImageOpacity: value })
                      }
                    />
                    <Range
                      label="Graphite overlay"
                      value={config.backgroundOverlayIntensity}
                      onChange={(value) =>
                        patchConfig({ backgroundOverlayIntensity: value })
                      }
                    />
                  </>
                ) : null}
                {tab === "centre" ? (
                  <>
                    <p className="appearance-help">
                      The default is the full-colour Third Railify zap. Custom
                      artwork scales to fill the circular medallion and is
                      centre-cropped without distortion.
                    </p>
                    <MediaPicker
                      label="Centre image"
                      recommendation="Recommended 1200×1200 · transparent PNG or safe SVG · 4 MB max"
                      file={centre}
                      existing={wheel.media.centre?.url || null}
                      removed={removeCentre}
                      onFile={(file) => {
                        setCentre(file);
                        setRemoveCentre(false);
                      }}
                      onRemove={() => {
                        setCentre(null);
                        setRemoveCentre(true);
                      }}
                    />
                  </>
                ) : null}
                {tab === "celebration" ? (
                  <>
                    <p className="appearance-help">
                      The result always remains visible. These controls affect
                      only the finite broadcast celebration.
                    </p>
                    <Toggle
                      label="Winner celebration"
                      checked={config.celebrationEnabled}
                      onChange={(value) =>
                        patchConfig({ celebrationEnabled: value })
                      }
                    />
                    <div className="sound-preset-control">
                      <label>Winner sound preset<select value={config.winnerSoundPreset || "gold-rise"} onChange={(event) => patchConfig({ winnerSoundPreset: event.target.value as WheelConfig["winnerSoundPreset"] })}>{WINNER_SOUND_PRESETS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
                      <button type="button" onClick={() => void previewGeneratedSound("winner", config.winnerSoundPreset || "gold-rise")} disabled={!config.winnerSoundEnabled || config.winnerSoundPreset === "silent"}>Preview sound</button>
                    </div>
                    <Toggle
                      label="Visible confetti"
                      checked={config.confettiEnabled}
                      onChange={(value) =>
                        patchConfig({ confettiEnabled: value })
                      }
                    />
                    <Toggle
                      label="Fireworks"
                      checked={config.fireworksEnabled !== false}
                      onChange={(value) =>
                        patchConfig({ fireworksEnabled: value })
                      }
                    />
                    <Toggle
                      label="Full-stage lighting"
                      checked={config.winnerLightingEnabled}
                      onChange={(value) =>
                        patchConfig({ winnerLightingEnabled: value })
                      }
                    />
                    <Toggle
                      label="Winner music stinger"
                      checked={config.winnerSoundEnabled}
                      onChange={(value) =>
                        patchConfig({ winnerSoundEnabled: value })
                      }
                    />
                    <label>
                      Celebration intensity
                      <select
                        value={config.celebrationIntensity}
                        onChange={(event) =>
                          patchConfig({
                            celebrationIntensity: event.target
                              .value as WheelConfig["celebrationIntensity"],
                          })
                        }
                      >
                        <option value="subtle">Subtle</option>
                        <option value="normal">Normal</option>
                        <option value="strong">Strong</option>
                      </select>
                      <small className="celebration-profile-copy">
                        {intensityDescription(config.celebrationIntensity)}
                      </small>
                    </label>
                    <button
                      className="button button--secondary celebration-preview-button"
                      type="button"
                      onClick={() => setCelebrationPreview(true)}
                    >
                      Preview celebration
                    </button>
                    <small className="appearance-help">
                      Preview is local only: it creates no spin, result, API
                      request or saved change, and plays no music.
                    </small>
                  </>
                ) : null}
              </section>
            </div>
            <EphemeralNotices error={error} errorTitle="Appearance could not be updated" onDismissError={() => setError("")} />
            <footer>
              <button
                className="button button--secondary appearance-reset"
                type="button"
                onClick={resetAppearance}
                disabled={busy}
              >
                Reset to default
              </button>
              <span className="appearance-dialog__footer-spacer" />
              <button
                className="button button--secondary"
                type="button"
                onClick={requestClose}
                disabled={busy}
              >
                Discard
              </button>
              <button
                className="button button--primary"
                type="button"
                onClick={() => void save()}
                disabled={busy}
              >
                {busy ? "Saving…" : "Save appearance"}
              </button>
            </footer>
          </div>
        </div>,
        document.body,
      )}
      {celebrationPreview ? (
        <WinnerCelebration
          entry={previewWinner}
          official={false}
          message="Winner preview: {winner}"
          celebrationEnabled={config.celebrationEnabled}
          confettiEnabled={config.confettiEnabled}
          fireworksEnabled={config.fireworksEnabled !== false}
          lightingEnabled={config.winnerLightingEnabled}
          intensity={config.celebrationIntensity}
          palette={previewConfig.palette}
          accent={previewConfig.pointerAccent}
          canEdit={false}
          busy={false}
          onClose={() => setCelebrationPreview(false)}
          onAction={() => undefined}
        />
      ) : null}
      {segmentEditor ? <SegmentStyleDialog
        label={segmentEditor.kind === "palette" ? `Custom palette style ${segmentEditor.index + 1}` : entries.find((entry) => entry.id === segmentEditor.id)?.label || "Entrant"}
        value={segmentEditor.kind === "palette" ? customStyles[segmentEditor.index] : resolvedEntryStyle(entries.find((entry) => entry.id === segmentEditor.id)!, previewConfig)}
        media={segmentMedia}
        previewUrls={segmentPreviewUrls}
        onFile={stageSegmentFile}
        onApply={(style) => { if (segmentEditor.kind === "palette") editCustom(customStyles.map((current, index) => index === segmentEditor.index ? style : current)); else updateStyle(segmentEditor.id, style); }}
        onClose={() => setSegmentEditor(null)}
      /> : null}
    </>
  );
}

function CustomPaletteEditor({
  styles,
  accent,
  active,
  dirty,
  media,
  previewUrls,
  onStyles,
  onEdit,
  onAccent,
  onApply,
  onReset,
}: {
  styles: SegmentStyle[];
  accent: string;
  active: boolean;
  dirty: boolean;
  media: WheelMediaAsset[];
  previewUrls: Record<string, string>;
  onStyles: (styles: SegmentStyle[]) => void;
  onEdit: (index: number) => void;
  onAccent: (accent: string) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <section
      className={`custom-palette-card${active ? " is-active" : ""}`}
      aria-label="Custom palette editor"
    >
      <header>
        <div>
          <p className="eyebrow">CUSTOM PALETTE</p>
          <h3>Build your own signal.</h3>
          <small>
            Choose up to five solid, patterned, or image styles plus one wheel accent.
          </small>
        </div>
        <i aria-hidden="true">
          {styles.map((style, index) => <SegmentStylePreview key={index} style={style} media={media} previewUrls={previewUrls} />)}
        </i>
      </header>
      <div className="custom-palette-swatches">
        {styles.map((style, index) => (
          <article key={index}>
            <button type="button" className="segment-style-action" onClick={() => onEdit(index)}><SegmentStylePreview style={style} media={media} previewUrls={previewUrls} label={`Custom palette style ${index + 1}`} /><span><b>Style {index + 1}</b><small>{style.mode === "pattern" ? `Pattern · ${style.pattern}` : style.mode === "image" ? "Custom image" : "Solid colour"}</small></span></button>
            <div>
              <button
                type="button"
                aria-label={`Move custom palette color ${index + 1} left`}
                disabled={index === 0}
                onClick={() => onStyles(movePaletteStyle(styles, index, -1))}
              >
                ←
              </button>
              <button
                type="button"
                aria-label={`Move custom palette color ${index + 1} right`}
                disabled={index === styles.length - 1}
                onClick={() => onStyles(movePaletteStyle(styles, index, 1))}
              >
                →
              </button>
              <button
                type="button"
                aria-label={`Remove custom palette color ${index + 1}`}
                disabled={styles.length === 1}
                onClick={() =>
                  onStyles(
                    styles.filter((_, styleIndex) => styleIndex !== index),
                  )
                }
              >
                ×
              </button>
            </div>
          </article>
        ))}
      </div>
      <button
        className="custom-palette-add"
        type="button"
        disabled={styles.length >= 5}
        onClick={() => onStyles([...styles, solidSegmentStyle("#FFFFFF")])}
      >
        + Add style
      </button>
      <div className="custom-palette-accent">
        <div>
          <b>Accent</b>
          <small>Independent rim, pointer and stage signal.</small>
        </div>
        <input
          aria-label="Custom palette accent picker"
          type="color"
          value={accent}
          onChange={(event) => onAccent(event.target.value.toUpperCase())}
        />
        <HexTextInput label="Custom palette accent hex" value={accent} onValid={onAccent} />
      </div>
      <footer>
        <button type="button" onClick={onReset}>
          Reset custom palette
        </button>
        <button
          className="button button--primary"
          type="button"
          onClick={onApply}
        >
          {dirty
            ? "Apply custom palette"
            : active
              ? "Custom palette applied"
              : "Apply custom palette"}
        </button>
      </footer>
    </section>
  );
}

function intensityDescription(intensity: WheelConfig["celebrationIntensity"]) {
  return intensity === "subtle"
    ? "A restrained burst with lighter confetti and a single firework."
    : intensity === "strong"
      ? "Maximum bounded confetti, multiple fireworks and full stage lighting."
      : "The standard Third Railify winner celebration.";
}

function MediaPicker({
  label,
  recommendation,
  file,
  existing,
  removed,
  onFile,
  onRemove,
}: {
  label: string;
  recommendation: string;
  file: File | null;
  existing: string | null;
  removed: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="media-picker">
      <label>
        {label}
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.bmp,.webp,.svg,image/png,image/jpeg,image/bmp,image/webp,image/svg+xml"
          onChange={(event) => {
            const next = event.target.files?.[0];
            if (next) onFile(next);
          }}
        />
      </label>
      <small>{recommendation}</small>
      <p>
        {file
          ? `Ready: ${file.name}`
          : removed
            ? "Will restore the default treatment"
            : existing
              ? "Current custom image is active"
              : "Using the Third Railify default"}
      </p>
      {(file || existing) && !removed ? (
        <button type="button" onClick={onRemove}>
          Remove custom image
        </button>
      ) : null}
    </div>
  );
}
function Range({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <span className="range-field">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <output>{value}%</output>
      </span>
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="appearance-toggle">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
function HexTextInput({ label, value, onValid }: { label: string; value: string; onValid: (value: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return <input aria-label={label} value={text} pattern="#[0-9A-Fa-f]{6}" onChange={(event) => { const next = event.target.value; setText(next); if (/^#[0-9a-f]{6}$/i.test(next)) onValid(next.toUpperCase()); }} onBlur={() => setText(value)} />;
}
function paletteMatches(config: WheelConfig, option: PaletteOption) {
  const expectedStyles = option.styles || option.palette.map((color) => solidSegmentStyle(color));
  return (
    config.pointerAccent.toUpperCase() === option.pointerAccent &&
    config.palette.length === option.palette.length &&
    config.palette.every(
      (colour, index) => colour.toUpperCase() === option.palette[index],
    ) && JSON.stringify(normalizePaletteStyles(config.paletteStyles, config.palette)) === JSON.stringify(expectedStyles)
  );
}
function useObjectUrlMap(files: Map<string, File>) {
  const urls = useMemo(() => { const next: Record<string, string> = {}; for (const [id, file] of files) next[id] = URL.createObjectURL(file); return next; }, [files]);
  useEffect(() => () => { for (const url of Object.values(urls)) URL.revokeObjectURL(url); }, [urls]);
  return urls;
}
async function previewGeneratedSound(kind: "spin" | "winner", preset: string) {
  const audio = new AudioContext(); await audio.resume(); const nodes: OscillatorNode[] = [];
  if (kind === "spin") { const profile = spinSoundProfile(preset); if (profile) for (let index = 0; index < 5; index += 1) { const oscillator = audio.createOscillator(); const gain = audio.createGain(); const start = audio.currentTime + index * .13; oscillator.type = profile.waveform; oscillator.frequency.value = profile.frequency; oscillator.detune.value = profile.detune; gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(profile.gain, start + profile.attack); gain.gain.exponentialRampToValueAtTime(.0001, start + profile.decay); oscillator.connect(gain).connect(audio.destination); oscillator.start(start); oscillator.stop(start + profile.decay + .02); nodes.push(oscillator); } }
  else { const profile = winnerSoundProfile(preset); if (profile) profile.notes.forEach((frequency, index) => { const oscillator = audio.createOscillator(); const gain = audio.createGain(); const start = audio.currentTime + index * profile.spacing; oscillator.type = profile.waveform; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(profile.gain, start + .018); gain.gain.exponentialRampToValueAtTime(.0001, start + profile.decay); oscillator.connect(gain).connect(audio.destination); oscillator.start(start); oscillator.stop(start + profile.decay + .03); nodes.push(oscillator); }); }
  window.setTimeout(() => { for (const node of nodes) try { node.stop(); } catch { /* already stopped */ } void audio.close(); }, 1600);
}
function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}
async function normalizeImage(file: File, purpose: "background" | "centre") {
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg"))
    return file;
  const bitmap = await createImageBitmap(file);
  const max = purpose === "background" ? 3840 : 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const type = purpose === "centre" ? "image/png" : "image/webp";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, 0.9),
  );
  return blob || file;
}
