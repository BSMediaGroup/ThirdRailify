import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { TurnstileWidget } from "../auth/TurnstileWidget";
import { useAuth } from "../auth/AuthProvider";
import { createGoatDraft, finaliseGoatDraft, getGoatConfig, getGoatProducts, uploadGoatMedia } from "../goats/client";
import type { GoatConfig, GoatProduct } from "../goats/types";
import { usePrivacy } from "../privacy/PrivacyProvider";

type DraftFields = { displayName: string; email: string; city: string; region: string; countryCode: string; productId: string; description: string; rating: string; consent: boolean; website: string };
const initial: DraftFields = { displayName: "", email: "", city: "", region: "", countryCode: "", productId: "", description: "", rating: "", consent: false, website: "" };
const steps = ["Identity & photos", "Location & product", "Story", "Review & consent"];

export function GoatSubmitPage() {
  const { categories } = usePrivacy();
  const [params] = useSearchParams();
  const { account } = useAuth();
  const [config, setConfig] = useState<GoatConfig | null>(null);
  const [products, setProducts] = useState<GoatProduct[]>([]);
  const [fields, setFields] = useState<DraftFields>(() => loadLocalDraft(categories.preferences));
  const [step, setStep] = useState(0);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [success, setSuccess] = useState<{ reference: string } | null>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const setToken = useCallback((value: string) => setTurnstileToken(value), []);
  const turnstileError = useCallback((message: string) => setError(message), []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getGoatConfig(controller.signal), getGoatProducts(controller.signal)]).then(([nextConfig, nextProducts]) => {
      setConfig(nextConfig); setProducts(nextProducts);
      const requested = params.get("product") || "";
      if (requested && nextProducts.some((product) => product.id === requested)) setFields((current) => ({ ...current, productId: requested }));
      else if (requested) setError("That product link is not part of the current public catalogue. Choose a product below.");
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Submission configuration is unavailable."));
    return () => controller.abort();
  }, [params]);
  useEffect(() => {
    if (!categories.preferences) return;
    const safe = { displayName: fields.displayName, city: fields.city, region: fields.region, countryCode: fields.countryCode, productId: fields.productId, description: fields.description, rating: fields.rating };
    try { localStorage.setItem("thirdrailify-goats-draft-v2", JSON.stringify(safe)); } catch { /* draft persistence is optional */ }
  }, [categories.preferences, fields]);
  useEffect(() => { firstField.current?.focus(); }, [step]);

  const countries = useMemo(countryOptions, []);
  const product = products.find((entry) => entry.id === fields.productId) || null;
  const update = <K extends keyof DraftFields>(key: K, value: DraftFields[K]) => setFields((current) => ({ ...current, [key]: value }));
  const chooseFile = async (file: File | undefined, setter: (file: File | null) => void, allowAnimatedGif = false) => {
    if (!file) return; setError("");
    try { setProgress("Preparing a safe display image…"); setter(await prepareImage(file, config?.limits.maxImageBytes || 10 * 1024 * 1024, allowAnimatedGif)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The image could not be prepared safely."); }
    finally { setProgress(""); }
  };
  const addGallery = async (files: FileList | null) => {
    if (!files) return;
    try { setError(""); setProgress("Preparing metadata-free gallery images…"); const next = await Promise.all(Array.from(files).slice(0, config?.limits.maxGalleryImages || 5).map((file) => prepareImage(file, config?.limits.maxImageBytes || 10 * 1024 * 1024))); setGallery((current) => [...current, ...next].slice(0, config?.limits.maxGalleryImages || 5)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "A gallery image could not be prepared safely."); }
    finally { setProgress(""); }
  };
  const advance = () => { setError(""); const message = stepError(step, fields, mainImage); if (message) { setError(message); firstField.current?.focus(); return; } setStep((current) => Math.min(3, current + 1)); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    const validation = stepError(3, fields, mainImage); if (validation) { setError(validation); return; }
    if (!config?.submissionEnabled) { setError("GOATS submissions are currently unavailable."); return; }
    if (!config.captchaConfigured || !config.turnstileSiteKey) { setError("Submission verification is not configured. The form is safely unavailable."); return; }
    if (!turnstileToken) { setError("Complete the verification challenge before submitting."); return; }
    setBusy(true);
    try {
      setProgress("Creating a private submission draft…");
      const draft = await createGoatDraft({ turnstileToken, website: fields.website });
      setProgress("Uploading and validating the main image…"); await uploadGoatMedia(draft.draftToken, mainImage as File, "main");
      if (profileImage) { setProgress("Uploading and validating the profile image…"); await uploadGoatMedia(draft.draftToken, profileImage, "profile"); }
      for (let index = 0; index < gallery.length; index += 1) { setProgress(`Uploading gallery image ${index + 1} of ${gallery.length}…`); await uploadGoatMedia(draft.draftToken, gallery[index], "gallery", index); }
      setProgress("Finalising the moderation record…");
      const result = await finaliseGoatDraft({ draftToken: draft.draftToken, ...fields, rating: fields.rating ? Number(fields.rating) : null, consentVersion: config.consentVersion });
      localStorage.removeItem("thirdrailify-goats-draft-v2"); setSuccess({ reference: result.reference }); setProgress("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The submission could not be completed."); setResetKey((current) => current + 1); }
    finally { setBusy(false); }
  };

  if (success) return <main className="goat-submit goat-submit--success"><div className="container"><p className="eyebrow">Submission received</p><h1>Your signal is pending review.</h1><p>Reference <strong>{success.reference}</strong></p><p>Your photos remain private while the Admin moderation team validates media, product identity, consent, and an approximate city-level map point. Publication is never automatic.</p><p>Email delivery is non-blocking and may remain pending if the transactional provider is not configured.</p><div className="button-row"><Link className="button button--primary" to="/goats">Return to GOATS</Link><button type="button" className="button button--secondary" onClick={() => window.location.reload()}>Start another submission</button></div></div></main>;

  return <main className="goat-submit"><section className="goat-submit__hero"><div className="container"><p className="eyebrow">Join the approved community showcase</p><h1>Submit your <span>GOATED drip.</span></h1><p>Four focused steps. Private photos until approval. Approximate locations only.</p></div></section>
    <div className="container goat-submit__layout"><aside><ol className="goat-stepper" aria-label="Submission progress">{steps.map((label, index) => <li key={label} className={index === step ? "is-current" : index < step ? "is-complete" : ""} aria-current={index === step ? "step" : undefined}><span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong></li>)}</ol><div className="goat-privacy-note"><strong>Location privacy</strong><p>Enter city, optional region, and country only. A moderator confirms a deliberately coarse public map point. Never enter a street address.</p></div></aside>
      <form className="goat-submit__form" onSubmit={(event) => void submit(event)} noValidate><header><p>Step {step + 1} of 4</p><h2>{steps[step]}</h2></header>{error ? <div className="goats-error" role="alert">{error}</div> : null}{progress && step !== 3 ? <p className="goat-submit__progress" role="status" aria-live="polite">{progress}</p> : null}
        <div className="goat-honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={fields.website} onChange={(event) => update("website", event.target.value)} /></label></div>
        {step === 0 ? <fieldset><legend>Your public identity and private uploads</legend><label>Public display name<input ref={firstField} required minLength={2} maxLength={80} value={fields.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder={account?.displayName || "GOATED GOAT"} /></label><label>Private email<input required type="email" autoComplete="email" value={fields.email} onChange={(event) => update("email", event.target.value)} /><small>Used for submission status only. Never published or stored in this browser draft. <Link to="/privacy#community-publication" target="_blank">See how GOATS information is handled.</Link></small></label><ImageField label="Main image" required file={mainImage} onChoose={(file) => chooseFile(file, setMainImage)} onRemove={() => setMainImage(null)} /><ImageField label="Profile image" file={profileImage} allowAnimatedGif onChoose={(file) => chooseFile(file, setProfileImage, true)} onRemove={() => setProfileImage(null)} /><label className="goat-upload">Additional gallery images<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => addGallery(event.target.files)} /><small>Up to {config?.limits.maxGalleryImages || 5}. JPG, PNG, or WebP. 10 MB each.</small></label>{gallery.length ? <ol className="goat-upload-list">{gallery.map((file, index) => <li key={`${file.name}-${file.lastModified}`}><span>{file.name}</span><div><button type="button" disabled={index === 0} onClick={() => setGallery(move(gallery, index, index - 1))}>↑</button><button type="button" disabled={index === gallery.length - 1} onClick={() => setGallery(move(gallery, index, index + 1))}>↓</button><button type="button" onClick={() => setGallery(gallery.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div></li>)}</ol> : null}</fieldset> : null}
        {step === 1 ? <fieldset><legend>Approximate location and real product</legend><label>City<input ref={firstField} required maxLength={100} value={fields.city} onChange={(event) => update("city", event.target.value)} /></label><label>State / region <span>Optional</span><input maxLength={100} value={fields.region} onChange={(event) => update("region", event.target.value)} /></label><label>Country<select required value={fields.countryCode} onChange={(event) => update("countryCode", event.target.value)}><option value="">Choose a country</option>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label><label>Owned product<select required value={fields.productId} onChange={(event) => update("productId", event.target.value)}><option value="">Choose from the current catalogue</option>{products.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>{product ? <div className="goat-product-preview">{product.image ? <img src={product.image} alt="" width="100" height="100" /> : null}<div><strong>{product.name}</strong><span>Validated again by the server before moderation.</span></div></div> : null}<p className="goat-field-note">A submission does not prove purchase. Product identity links the story to the real catalogue only.</p></fieldset> : null}
        {step === 2 ? <fieldset><legend>Your story and optional rating</legend><label>Story / review<textarea ref={firstField as unknown as React.RefObject<HTMLTextAreaElement>} required minLength={20} maxLength={2000} rows={9} value={fields.description} onChange={(event) => update("description", event.target.value)} /><small>{fields.description.length} / 2000 · Minimum 20 characters.</small></label><fieldset className="goat-stars"><legend>Product rating <span>Optional</span></legend><div role="radiogroup" aria-label="Optional product rating">{[1,2,3,4,5].map((rating) => <label key={rating}><input type="radio" name="rating" value={rating} checked={fields.rating === String(rating)} onChange={(event) => update("rating", event.target.value)} /><span aria-hidden="true">★</span><small>{rating} star{rating === 1 ? "" : "s"}</small></label>)}<button type="button" onClick={() => update("rating", "")}>Clear rating</button></div></fieldset></fieldset> : null}
        {step === 3 ? <fieldset><legend>Review and consent</legend><dl className="goat-review"><div><dt>Display name</dt><dd>{fields.displayName}</dd></div><div><dt>Private email</dt><dd>{fields.email}</dd></div><div><dt>Images</dt><dd>1 main · {profileImage ? "1" : "0"} profile · {gallery.length} gallery</dd></div><div><dt>Approximate location</dt><dd>{[fields.city, fields.region, countries.find((entry) => entry.code === fields.countryCode)?.name].filter(Boolean).join(", ")}</dd></div><div><dt>Product</dt><dd>{product?.name || "Not selected"}</dd></div><div><dt>Rating</dt><dd>{fields.rating ? `${fields.rating} / 5` : "Not supplied"}</dd></div><div><dt>Story</dt><dd>{fields.description}</dd></div></dl><label className="goat-consent"><input ref={firstField} type="checkbox" checked={fields.consent} onChange={(event) => update("consent", event.target.checked)} /><span>I confirm I have the right to upload this content and consent to private storage and moderation, followed by public display only if approved. I understand my location will be treated approximately and that the current <Link to="/privacy" target="_blank">Privacy Policy</Link> applies.</span></label>{config?.captchaConfigured && config.turnstileSiteKey ? <TurnstileWidget siteKey={config.turnstileSiteKey} action="goat_submission" resetKey={resetKey} onToken={setToken} onUnavailable={turnstileError} /> : <div className="goats-error" role="status">Submission verification is not configured. Production submissions fail closed.</div>}{progress ? <p className="goat-submit__progress" role="status" aria-live="polite">{progress}</p> : null}</fieldset> : null}
        <footer className="goat-submit__actions">{step > 0 ? <button type="button" className="button button--secondary" onClick={() => setStep((current) => current - 1)} disabled={busy}>Back</button> : <Link className="button button--secondary" to="/goats">Cancel</Link>}{step < 3 ? <button type="button" className="button button--primary" onClick={advance}>Continue</button> : <button type="submit" className="button button--primary" disabled={busy || !fields.consent || !turnstileToken}>{busy ? "Submitting…" : "Submit for review"}</button>}</footer>
      </form></div>
  </main>;
}

function ImageField({ label, required, file, allowAnimatedGif = false, onChoose, onRemove }: { label: string; required?: boolean; file: File | null; allowAnimatedGif?: boolean; onChoose: (file?: File) => void | Promise<void>; onRemove: () => void }) {
  const [preview, setPreview] = useState("");
  const acceptsAnimatedGif = allowAnimatedGif;
  useEffect(() => { if (!file) { setPreview(""); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  return <label className="goat-upload">{label} {required ? <span aria-hidden="true">*</span> : <span>Optional</span>}<input type="file" required={required} accept={acceptsAnimatedGif ? "image/jpeg,image/png,image/webp,image/gif" : "image/jpeg,image/png,image/webp"} onChange={(event) => onChoose(event.target.files?.[0])} />{file ? <span className="goat-upload__preview"><img src={preview} alt="Selected preview" width="120" height="120" /><span>{file.name}<small>{formatBytes(file.size)}</small></span><button type="button" onClick={onRemove}>Remove</button></span> : <small>{acceptsAnimatedGif ? "Choose a JPG, PNG, WebP, or animated GIF up to 10 MB." : "Choose a JPG, PNG, or WebP image up to 10 MB."}</small>}</label>;
}

function stepError(step: number, fields: DraftFields, mainImage: File | null) {
  if ((step === 0 || step === 3) && (fields.displayName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(fields.email) || !mainImage)) return "Add a public display name, valid private email, and main image.";
  if ((step === 1 || step === 3) && (fields.city.trim().length < 2 || !/^[A-Z]{2}$/.test(fields.countryCode) || !fields.productId)) return "Choose a city, country, and current catalogue product.";
  if ((step === 2 || step === 3) && fields.description.trim().length < 20) return "Your story must be at least 20 characters.";
  if (step === 3 && !fields.consent) return "Consent is required before submission.";
  return "";
}
function loadLocalDraft(allowStoredPreference: boolean) { try { const value = JSON.parse(allowStoredPreference ? localStorage.getItem("thirdrailify-goats-draft-v2") || "{}" : "{}"); return { ...initial, ...value, email: "", consent: false, website: "" }; } catch { return initial; } }
function countryOptions() { const display = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(undefined, { type: "region" }) : null; const rows: Array<{ code: string; name: string }> = []; for (let first = 65; first <= 90; first += 1) for (let second = 65; second <= 90; second += 1) { const code = String.fromCharCode(first, second); const name = display?.of(code); if (name && name !== code && !name.startsWith("Unknown Region")) rows.push({ code, name }); } return rows.sort((left, right) => left.name.localeCompare(right.name)); }
function move<T>(items: T[], from: number, to: number) { const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; }
function formatBytes(value: number) { return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`; }

async function prepareImage(file: File, maxBytes: number, allowAnimatedGif = false) {
  const accepted = new Set(["image/jpeg", "image/png", "image/webp", ...(allowAnimatedGif ? ["image/gif"] : [])]);
  if (!accepted.has(file.type) || file.size > maxBytes) throw new Error(allowAnimatedGif ? "Profile images must be valid JPG, PNG, WebP, or GIF files no larger than 10 MB." : "Images must be valid JPG, PNG, or WebP files no larger than 10 MB.");
  if (file.type === "image/gif") {
    const header = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    const signature = String.fromCharCode(...header.slice(0, 6));
    const width = header[6] | header[7] << 8;
    const height = header[8] | header[9] << 8;
    if (!new Set(["GIF87a", "GIF89a"]).has(signature) || width < 1 || height < 1 || width > 12000 || height > 12000 || width * height > 50_000_000) throw new Error("The animated GIF is invalid or has unsupported dimensions.");
    return new File([file], "goat-profile.gif", { type: "image/gif", lastModified: file.lastModified });
  }
  if (typeof createImageBitmap !== "function") throw new Error("This browser cannot safely prepare image uploads. Try a current browser.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (bitmap.width < 1 || bitmap.height < 1 || bitmap.width > 12000 || bitmap.height > 12000) throw new Error("Image dimensions must be between 1 and 12,000 pixels.");
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: file.type === "image/png" }); if (!context) throw new Error("This browser cannot safely prepare image uploads.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const outputType = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, .9));
    if (!blob || blob.size < 1 || blob.size > maxBytes) throw new Error("The prepared image is still too large. Choose a smaller image.");
    const extension = outputType === "image/jpeg" ? "jpg" : outputType.split("/")[1];
    return new File([blob], `goat-upload.${extension}`, { type: outputType, lastModified: Date.now() });
  } finally { bitmap.close(); }
}
