import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { ChevronRightIcon, ChevronLeftIcon, CloseIcon, MinusIcon, PlusIcon } from "./Icons";
import "../styles/product-lightbox.css";

type Props = { name: string; images: string[]; selected: string; onSelect: (url: string) => void; onClose: () => void };

/** Mounted only while open. Native top-layer modality blocks background interaction. */
export function ProductLightbox({ name, images, selected, onSelect, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const title = useId();
  const index = Math.max(0, images.indexOf(selected));
  const move = (direction: number) => onSelect(images[(index + direction + images.length) % images.length]);

  useEffect(() => {
    const element = dialog.current!;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const body = document.body;
    const properties = ["position", "top", "left", "width", "overflow"] as const;
    const previous = properties.map((key) => [key, body.style.getPropertyValue(key), body.style.getPropertyPriority(key)]);
    const { scrollX, scrollY } = window;
    body.style.position = "fixed"; body.style.top = `-${scrollY}px`; body.style.left = `-${scrollX}px`;
    body.style.width = "100%"; body.style.overflow = "hidden";
    element.showModal(); close.current?.focus();
    return () => {
      element.close();
      previous.forEach(([key, value, priority]) => value ? body.style.setProperty(key, value, priority) : body.style.removeProperty(key));
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const rail = dialog.current?.querySelector(".product-lightbox__rail");
    const active = rail?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (rail && active) rail.scrollLeft = active.offsetLeft - rail.clientWidth / 2 + active.clientWidth / 2;
  }, [selected]);

  return <dialog ref={dialog} className="product-lightbox" aria-modal="true" aria-labelledby={title}
    onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); if (images.length > 1) move(event.key === "ArrowLeft" ? -1 : 1); }
      if (event.key === "Tab") {
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
        const first = buttons[0]; const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
    <header className="product-lightbox__header"><h2 id={title}>{name}</h2><span role="status" aria-live="polite" aria-atomic="true">{index + 1} / {images.length}</span><button ref={close} type="button" aria-label="Close fullscreen gallery" onClick={onClose}><CloseIcon /></button></header>
    <ImageInspection key={selected} url={selected} name={`${name} — image ${index + 1} of ${images.length}`} onSwipe={move} />
    <footer className="product-lightbox__footer">
      {images.length > 1 && <button type="button" aria-label="Previous image" onClick={() => move(-1)}><ChevronLeftIcon /></button>}
      <div className="product-lightbox__rail" aria-label="Fullscreen product views">{images.map((url, slide) => <button type="button" key={url} aria-label={`Show image ${slide + 1} of ${images.length}`} aria-pressed={url === selected} onClick={() => onSelect(url)}><GalleryThumbnail url={url} index={slide} /></button>)}</div>
      {images.length > 1 && <button type="button" aria-label="Next image" onClick={() => move(1)}><ChevronRightIcon /></button>}
    </footer>
  </dialog>;
}

export function GalleryThumbnail({ url, index }: { url: string; index: number }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="product-gallery-error" aria-label={`Image ${index + 1} unavailable`}>{index + 1} ×</span> : <img src={url} alt="" width="72" height="90" loading="lazy" onError={() => setFailed(true)} />;
}

function ImageInspection({ url, name, onSwipe }: { url: string; name: string; onSwipe: (direction: number) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const observer = new ResizeObserver(() => { setPan({ x: 0, y: 0 }); gesture.current = null; });
    if (stage.current) observer.observe(stage.current);
    return () => { observer.disconnect(); gesture.current = null; };
  }, []);
  const changeZoom = (value: number) => { setZoom(value); setPan({ x: 0, y: 0 }); gesture.current = null; };
  const end = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current; gesture.current = null;
    if (!start || start.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const dx = event.clientX - start.x; const dy = event.clientY - start.y;
    if (zoom === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
  };
  return <div className="product-lightbox__inspection">
    <div ref={stage} className="product-lightbox__stage" data-zoom={zoom} style={{ touchAction: zoom > 1 ? "pinch-zoom" : "pan-y pinch-zoom" }}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) { gesture.current = null; return; }
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const start = gesture.current; const frame = stage.current; const img = image.current;
        if (!start || start.id !== event.pointerId || zoom === 1 || !frame || !img || !img.naturalWidth) return;
        const fit = Math.min(frame.clientWidth / img.naturalWidth, frame.clientHeight / img.naturalHeight);
        const maxX = Math.max(0, (img.naturalWidth * fit * zoom - frame.clientWidth) / 2);
        const maxY = Math.max(0, (img.naturalHeight * fit * zoom - frame.clientHeight) / 2);
        setPan({ x: Math.max(-maxX, Math.min(maxX, start.panX + event.clientX - start.x)), y: Math.max(-maxY, Math.min(maxY, start.panY + event.clientY - start.y)) });
      }} onPointerUp={end} onPointerCancel={() => { gesture.current = null; }} onLostPointerCapture={() => { gesture.current = null; }}>
      {failed ? <p role="status">This image is unavailable. Select another view.</p> : <img ref={image} src={url} alt={name} draggable={false} onLoad={() => setLoaded(true)} onError={() => { setFailed(true); changeZoom(1); }} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />}
    </div>
    <div className="product-lightbox__zoom" aria-label="Image zoom"><button type="button" aria-label="Zoom out" disabled={zoom === 1 || failed || !loaded} onClick={() => changeZoom(Math.max(1, zoom - .5))}><MinusIcon /></button><button type="button" aria-label="Reset image to fit" onClick={() => changeZoom(1)}>Fit <span>{Math.round(zoom * 100)}%</span></button><button type="button" aria-label="Zoom in" disabled={zoom === 3 || failed || !loaded} onClick={() => changeZoom(Math.min(3, zoom + .5))}><PlusIcon /></button></div>
  </div>;
}
