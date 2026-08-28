import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapSourceDataEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import goatPin from "../../assets/icons/goatpin.svg";
import { CountryFlag } from "./CountryFlag";
import { createCountryFlagElement } from "./countryFlags";
import type { GoatMapFeatureCollection } from "./types";

type MapState = "loading" | "ready" | "failed";
type GoatMapFeature = GoatMapFeatureCollection["features"][number];

const WORLD_BOUNDS = L.latLngBounds([-85.05112878, -180], [85.05112878, 180]);
const INTERACTION_BOUNDS = L.latLngBounds([-85.05112878, -270], [85.05112878, 270]);
const TILE_URL = "https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png";
const VECTOR_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

maplibregl.setWorkerUrl(maplibreWorkerUrl);

type GoatsMapProps = {
  data: GoatMapFeatureCollection;
  selectedId: string;
  onSelect: (id: string) => void;
};

type GlMarker = {
  element: HTMLButtonElement;
  marker: maplibregl.Marker;
  popup: maplibregl.Popup;
};

export default function GoatsMap(props: GoatsMapProps) {
  const [fallbackEngine, setFallbackEngine] = useState(false);
  const useFallbackEngine = useCallback(() => setFallbackEngine(true), []);

  return fallbackEngine
    ? <LeafletGoatsMap {...props} />
    : <MapLibreGoatsMap {...props} onFailure={useFallbackEngine} />;
}

function MapLibreGoatsMap({ data, selectedId, onSelect, onFailure }: GoatsMapProps & { onFailure: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, GlMarker>());
  const lastSelectedRef = useRef(selectedId);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const [mapState, setMapState] = useState<Exclude<MapState, "failed">>("loading");
  const [loadedTileCount, setLoadedTileCount] = useState(0);
  const [sourceFeatureCount, setSourceFeatureCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const features = useMemo(() => validMapFeatures(data), [data]);

  useEffect(() => {
    const viewport = container.current;
    if (!viewport || !webGlSupported()) {
      onFailure();
      return;
    }

    setMapState("loading");
    setLoadedTileCount(0);
    setSourceFeatureCount(0);
    lastSelectedRef.current = selectedIdRef.current;
    let active = true;
    let resizeFrame = 0;
    let observer: ResizeObserver | null = null;
    let sourceErrors = 0;
    let vectorProbeReady = false;
    const probeController = new AbortController();
    const loadedTiles = new Set<string>();
    const markers = new Map<string, GlMarker>();

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: viewport,
        style: VECTOR_STYLE_URL,
        attributionControl: false,
        center: [0, 20],
        dragRotate: false,
        maxPitch: 0,
        maxZoom: 16,
        minZoom: 1,
        pitchWithRotate: false,
        renderWorldCopies: false,
        scrollZoom: false,
        touchPitch: false,
        trackResize: true,
        zoom: 1,
      });
    } catch (error) {
      logMapFailure("initialization", error);
      onFailure();
      return;
    }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), "top-left");
    map.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: "GOATS locations are approximate",
    }), "bottom-right");

    const markReadyWhenRendered = () => {
      if (!active || !vectorProbeReady || !map.isStyleLoaded() || loadedTiles.size < 1 || markers.size !== features.length) return;
      const bounds = viewport.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const renderedFeatures = map.queryRenderedFeatures().length;
      if (renderedFeatures < 1) {
        if (sourceErrors > 0) onFailure();
        return;
      }
      setSourceFeatureCount(renderedFeatures);
      setLoadedTileCount(loadedTiles.size);
      setMapState("ready");
    };

    const onSourceData = (event: MapSourceDataEvent) => {
      if (!active || event.sourceId !== "openmaptiles" || !event.coord) return;
      const tile = event.coord.canonical;
      loadedTiles.add(`${tile.z}/${tile.x}/${tile.y}`);
      setLoadedTileCount(loadedTiles.size);
      window.requestAnimationFrame(markReadyWhenRendered);
    };
    const onMapError = (event: maplibregl.ErrorEvent) => {
      if (!active) return;
      const sourceId = "sourceId" in event ? String(event.sourceId || "") : "";
      if (sourceId === "openmaptiles") sourceErrors += 1;
      if (!map.isStyleLoaded() && !sourceId) {
        logMapFailure("style", event.error);
        onFailure();
      }
    };
    const onMoveEnd = () => {
      const center = map.getCenter();
      const longitude = Math.max(-179, Math.min(179, center.lng));
      const latitude = Math.max(-84, Math.min(84, center.lat));
      if (longitude !== center.lng || latitude !== center.lat) map.jumpTo({ center: [longitude, latitude] });
    };
    map.on("sourcedata", onSourceData);
    map.on("error", onMapError);
    map.on("idle", markReadyWhenRendered);
    map.on("moveend", onMoveEnd);

    for (const feature of features) {
      const id = String(feature.properties.id);
      const element = document.createElement("button");
      element.type = "button";
      element.className = "goats-map__point goats-map__point--gl";
      element.dataset.goatsMarkerId = id;
      element.dataset.goatsMarkerName = feature.properties.displayName;
      element.setAttribute("aria-label", `Select ${feature.properties.displayName} in ${feature.properties.locationLabel}`);
      element.classList.toggle("is-selected", id === selectedIdRef.current);
      const image = document.createElement("img");
      image.src = goatPin;
      image.alt = "";
      image.width = 24;
      image.height = 32;
      element.append(image);

      const popup = new maplibregl.Popup({
        anchor: "bottom",
        className: "goats-map-popup",
        closeButton: true,
        closeOnClick: false,
        focusAfterOpen: false,
        maxWidth: "340px",
        offset: [0, -34],
      }).setLngLat(feature.geometry.coordinates as [number, number]).setDOMContent(createMarkerCard(feature));
      const marker = new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat(feature.geometry.coordinates as [number, number])
        .addTo(map);
      const openCard = () => {
        markers.forEach((entry, markerId) => {
          if (markerId !== id && entry.popup.isOpen()) entry.popup.remove();
        });
        if (!popup.isOpen()) popup.addTo(map);
      };
      element.addEventListener("click", () => {
        onSelect(id);
        openCard();
        map.easeTo({
          center: marker.getLngLat(),
          duration: 0,
          essential: true,
          offset: [0, window.innerWidth <= 540 ? 92 : 0],
          zoom: Math.max(map.getZoom(), window.innerWidth <= 540 ? 4 : 5),
        });
      });
      element.addEventListener("mouseenter", openCard);
      element.addEventListener("focus", openCard);
      markers.set(id, { element, marker, popup });
    }
    markersRef.current = markers;
    fitGlFeatures(map, features);
    void verifyVectorSource(probeController.signal).then(() => {
      if (!active) return;
      vectorProbeReady = true;
      markReadyWhenRendered();
    }).catch((error) => {
      if (!active || probeController.signal.aborted) return;
      logMapFailure("tiles", error);
      onFailure();
    });

    observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        if (!active) return;
        map.resize();
        markReadyWhenRendered();
      });
    });
    observer.observe(viewport);

    return () => {
      active = false;
      probeController.abort();
      observer?.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      map.off("sourcedata", onSourceData);
      map.off("error", onMapError);
      map.off("idle", markReadyWhenRendered);
      map.off("moveend", onMoveEnd);
      markers.forEach(({ marker, popup }) => {
        popup.remove();
        marker.remove();
      });
      map.remove();
      markersRef.current = new Map();
      mapRef.current = null;
    };
  }, [features, onFailure, onSelect]);

  useEffect(() => {
    markersRef.current.forEach(({ element }, id) => element.classList.toggle("is-selected", id === selectedId));
    const map = mapRef.current;
    const selected = markersRef.current.get(selectedId);
    const changed = lastSelectedRef.current !== selectedId;
    lastSelectedRef.current = selectedId;
    if (!map || !selected || mapState !== "ready" || !changed) return;
    markersRef.current.forEach((entry, id) => {
      if (id !== selectedId && entry.popup.isOpen()) entry.popup.remove();
    });
    const openSelected = () => {
      if (selectedIdRef.current !== selectedId) return;
      if (!selected.popup.isOpen()) selected.popup.addTo(map);
      selected.element.focus({ preventScroll: true });
    };
    map.once("moveend", openSelected);
    map.easeTo({
      center: selected.marker.getLngLat(),
      duration: 450,
      essential: true,
      zoom: Math.max(map.getZoom(), 5),
    });
  }, [mapState, selectedId]);

  useEffect(() => {
    const resizeMap = window.requestAnimationFrame(() => {
      const map = mapRef.current;
      if (!map) return;
      map.resize();
      const selected = markersRef.current.get(selectedIdRef.current);
      if (expanded && selected?.popup.isOpen()) {
        map.jumpTo({
          center: selected.marker.getLngLat(),
          zoom: Math.max(map.getZoom(), 4),
        });
      }
    });
    if (!expanded) return () => window.cancelAnimationFrame(resizeMap);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = () => {
      setExpanded(false);
      window.requestAnimationFrame(() => expandButton.current?.focus({ preventScroll: true }));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(resizeMap);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  return <div
    className={`goats-map${mapState === "ready" ? " is-ready" : ""}${expanded ? " is-expanded" : ""}`}
    data-goats-map-engine="maplibre"
    data-goats-map-expanded={expanded ? "true" : "false"}
    data-goats-map-feature-count={features.length}
    data-goats-map-source-feature-count={sourceFeatureCount}
    data-goats-map-state={mapState}
    data-goats-map-tile-count={loadedTileCount}
    role={expanded ? "dialog" : undefined}
    aria-modal={expanded || undefined}
    aria-label={expanded ? "Expanded interactive GOATS map" : undefined}
  >
    <div ref={container} className="goats-map__canvas" aria-label="Interactive map of approximate GOATS locations. Use the listing controls below as the accessible map alternative." />
    {mapState === "loading" ? <div className="goats-map__status" role="status">Loading vector map geography…</div> : null}
    <button type="button" className="goats-map__reset" onClick={() => {
      const map = mapRef.current;
      if (!map) return;
      markersRef.current.forEach(({ popup }) => popup.remove());
      fitGlFeatures(map, features);
    }} disabled={!features.length}>Reset results</button>
    <button ref={expandButton} type="button" className="goats-map__expand" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
      <span aria-hidden="true">{expanded ? "×" : "⛶"}</span>{expanded ? "Close expanded map" : "Expand map"}
    </button>
    <div className="goats-map__instructions">Drag to pan. Use the +/− controls to zoom. Locations are deliberately approximate. Listings sharing a point remain available below.</div>
    <CoincidentLocations data={data} onSelect={onSelect} />
  </div>;
}

function LeafletGoatsMap({ data, selectedId, onSelect }: GoatsMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const lastSelectedRef = useRef(selectedId);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const [mapState, setMapState] = useState<MapState>("loading");
  const [loadedTileCount, setLoadedTileCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const features = useMemo(() => validMapFeatures(data), [data]);

  useEffect(() => {
    const viewport = container.current;
    if (!viewport) return;
    setMapState("loading");
    setLoadedTileCount(0);
    lastSelectedRef.current = selectedIdRef.current;

    let active = true;
    let successfulTiles = 0;
    let resizeFrame = 0;
    let observer: ResizeObserver | null = null;
    const markers = new Map<string, L.Marker>();
    const icon = L.icon({
      iconUrl: goatPin,
      iconSize: [24, 32],
      iconAnchor: [12, 32],
      tooltipAnchor: [0, -26],
      className: "goats-map__point",
    });

    let map: L.Map;
    try {
      map = L.map(viewport, {
        attributionControl: true,
        center: [20, 0],
        maxBounds: INTERACTION_BOUNDS,
        maxBoundsViscosity: 1,
        maxZoom: 8,
        minZoom: 1,
        scrollWheelZoom: false,
        worldCopyJump: false,
        zoom: 1,
        zoomControl: true,
      });
    } catch (error) {
      logMapFailure("initialization", error);
      setMapState("failed");
      return;
    }
    mapRef.current = map;

    const markReadyWhenRendered = () => {
      if (!active || successfulTiles < 1 || markers.size !== features.length) return;
      const bounds = viewport.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) setMapState("ready");
    };

    const tiles = L.tileLayer(TILE_URL, {
      attribution: '<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://openmaptiles.org">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      bounds: WORLD_BOUNDS,
      maxNativeZoom: 6,
      maxZoom: 8,
      minZoom: 1,
      noWrap: true,
    });
    tiles.on("tileload", () => {
      if (!active) return;
      successfulTiles += 1;
      setLoadedTileCount(successfulTiles);
      markReadyWhenRendered();
    });
    tiles.on("load", () => {
      if (!active) return;
      if (successfulTiles === 0) {
        logMapFailure("tiles", new Error("Every requested basemap tile failed"));
        setMapState("failed");
      } else {
        markReadyWhenRendered();
      }
    });
    tiles.addTo(map);

    for (const feature of features) {
      const id = String(feature.properties.id);
      const [longitude, latitude] = feature.geometry.coordinates;
      const marker = L.marker([latitude, longitude], {
        alt: `Select ${feature.properties.displayName} in ${feature.properties.locationLabel}`,
        icon,
        keyboard: true,
        riseOnHover: true,
        title: feature.properties.displayName,
      }).addTo(map);
      marker.bindPopup(createMarkerCard(feature), {
        autoPanPadding: [24, 24],
        className: "goats-map-popup",
        closeButton: true,
        maxWidth: 340,
        minWidth: 300,
        offset: [0, -26],
      });
      marker.on("click", () => {
        onSelect(id);
        marker.openPopup();
      });
      marker.on("mouseover", () => marker.openPopup());
      const element = marker.getElement();
      if (element) {
        element.dataset.goatsMarkerId = id;
        element.dataset.goatsMarkerName = feature.properties.displayName;
        element.setAttribute("aria-label", `Select ${feature.properties.displayName} in ${feature.properties.locationLabel}`);
        element.classList.toggle("is-selected", id === selectedIdRef.current);
        element.addEventListener("focus", () => marker.openPopup());
      }
      markers.set(id, marker);
    }
    markersRef.current = markers;
    fitFeatures(map, features);
    markReadyWhenRendered();

    observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        if (!active) return;
        map.invalidateSize({ pan: false });
        markReadyWhenRendered();
      });
    });
    observer.observe(viewport);

    return () => {
      active = false;
      observer?.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      markers.forEach((marker) => marker.off());
      tiles.off();
      map.remove();
      markersRef.current = new Map();
      mapRef.current = null;
    };
  }, [features, onSelect]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => marker.getElement()?.classList.toggle("is-selected", id === selectedId));
    const map = mapRef.current;
    const marker = markersRef.current.get(selectedId);
    const changed = lastSelectedRef.current !== selectedId;
    lastSelectedRef.current = selectedId;
    if (!map || !marker || mapState !== "ready" || !changed) return;
    map.stop();
    map.closePopup();
    map.once("moveend", () => {
      if (selectedIdRef.current !== selectedId) return;
      marker.openPopup();
      marker.getElement()?.focus({ preventScroll: true });
    });
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 5), { duration: 0.45 });
  }, [mapState, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const resizeMap = window.requestAnimationFrame(() => {
      if (!map) return;
      const selectedMarker = markersRef.current.get(selectedIdRef.current);
      const reopenCard = selectedMarker?.isPopupOpen() || false;
      map.invalidateSize({ pan: false });
      if (expanded && window.innerWidth <= 540 && selectedMarker) {
        map.setView(selectedMarker.getLatLng(), Math.max(map.getZoom(), 2), { animate: false });
      }
      if (reopenCard && selectedMarker) {
        selectedMarker.closePopup();
        selectedMarker.openPopup();
      }
    });
    if (!expanded) return () => window.cancelAnimationFrame(resizeMap);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = () => {
      setExpanded(false);
      window.requestAnimationFrame(() => expandButton.current?.focus({ preventScroll: true }));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(resizeMap);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  return <div
    className={`goats-map${mapState === "ready" ? " is-ready" : ""}${expanded ? " is-expanded" : ""}`}
    data-goats-map-engine="leaflet"
    data-goats-map-expanded={expanded ? "true" : "false"}
    data-goats-map-feature-count={features.length}
    data-goats-map-state={mapState}
    data-goats-map-tile-count={loadedTileCount}
    role={expanded ? "dialog" : undefined}
    aria-modal={expanded || undefined}
    aria-label={expanded ? "Expanded interactive GOATS map" : undefined}
  >
    <div ref={container} className="goats-map__canvas" aria-label="Interactive map of approximate GOATS locations. Use the listing controls below as the accessible map alternative." />
    {mapState === "loading" ? <div className="goats-map__status" role="status">Loading map geography…</div> : null}
    {mapState === "failed" ? <MapFallback data={data} selectedId={selectedId} onSelect={onSelect} /> : null}
    <button type="button" className="goats-map__reset" onClick={() => {
      const map = mapRef.current;
      if (!map) return;
      map.stop();
      map.closePopup();
      fitFeatures(map, features);
    }} disabled={!features.length || mapState === "failed"}>Reset results</button>
    <button ref={expandButton} type="button" className="goats-map__expand" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
      <span aria-hidden="true">{expanded ? "×" : "⛶"}</span>{expanded ? "Close expanded map" : "Expand map"}
    </button>
    <div className="goats-map__instructions">Drag to pan. Use the +/− controls to zoom. Locations are deliberately approximate. Listings sharing a point remain available below.</div>
    <CoincidentLocations data={data} onSelect={onSelect} />
  </div>;
}

function createMarkerCard(feature: GoatMapFeature): HTMLElement {
  const card = document.createElement("article");
  card.className = "goats-map-marker-card";
  card.dataset.goatsMarkerCard = String(feature.properties.id);

  const media = feature.properties.imageUrl ? document.createElement("img") : document.createElement("span");
  media.className = "goats-map-marker-card__media";
  if (media instanceof HTMLImageElement) {
    media.src = feature.properties.imageUrl || "";
    media.alt = "";
    media.loading = "lazy";
    media.addEventListener("error", () => {
      const fallback = document.createElement("span");
      fallback.className = "goats-map-marker-card__media goats-map-marker-card__media--fallback";
      fallback.textContent = "TR / GOAT";
      media.replaceWith(fallback);
    }, { once: true });
  } else {
    media.classList.add("goats-map-marker-card__media--fallback");
    media.textContent = "TR / GOAT";
  }
  card.append(media);

  const copy = document.createElement("div");
  copy.className = "goats-map-marker-card__copy";
  const signal = document.createElement("span");
  signal.className = "goats-map-marker-card__signal";
  signal.textContent = `Approved signal · ${feature.properties.countryCode}`;
  const title = document.createElement("strong");
  title.textContent = feature.properties.displayName;
  const location = document.createElement("span");
  location.className = "goats-map-marker-card__location";
  location.append(createCountryFlagElement(feature.properties.countryCode), document.createTextNode(feature.properties.locationLabel));
  const product = document.createElement("span");
  product.className = "goats-map-marker-card__product";
  product.textContent = feature.properties.product.name;
  const excerpt = document.createElement("p");
  excerpt.textContent = feature.properties.excerpt;
  const link = document.createElement("a");
  link.href = `/goats/${encodeURIComponent(feature.properties.slug)}`;
  link.textContent = "View GOAT listing ↗";
  copy.append(signal, title, location, product, excerpt, link);
  card.append(copy);
  return card;
}

function MapFallback({ data, selectedId, onSelect }: { data: GoatMapFeatureCollection; selectedId: string; onSelect: (id: string) => void }) {
  return <div className="goats-map-fallback" role="status"><strong>Interactive map could not load.</strong><p>Every approved mapped listing remains available in this location list.</p><ul>{data.features.map((feature) => <li key={feature.properties.id}><button type="button" className={selectedId === feature.properties.id ? "is-selected" : ""} onClick={() => onSelect(feature.properties.id)}><CountryFlag countryCode={feature.properties.countryCode} />{feature.properties.displayName} · {feature.properties.locationLabel}</button></li>)}</ul></div>;
}

function CoincidentLocations({ data, onSelect }: { data: GoatMapFeatureCollection; onSelect: (id: string) => void }) {
  const groups = new Map<string, typeof data.features>();
  for (const feature of data.features) {
    const key = feature.geometry.coordinates.join(",");
    groups.set(key, [...(groups.get(key) || []), feature]);
  }
  const shared = [...groups.values()].filter((items) => items.length > 1);
  if (!shared.length) return null;
  return <details className="goats-map__shared"><summary>Listings sharing an approximate map point</summary>{shared.map((items) => <div key={items[0].geometry.coordinates.join(",")}><strong><CountryFlag countryCode={items[0].properties.countryCode} />{items[0].properties.locationLabel}</strong><ul>{items.map((feature) => <li key={feature.properties.id}><button type="button" onClick={() => onSelect(feature.properties.id)}>{feature.properties.displayName}</button></li>)}</ul></div>)}</details>;
}

function validMapFeatures(data: GoatMapFeatureCollection): GoatMapFeature[] {
  return data.features.filter((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    return Number.isFinite(longitude) && Number.isFinite(latitude) && longitude >= -180 && longitude <= 180 && latitude >= -85.05112878 && latitude <= 85.05112878;
  });
}

function fitFeatures(map: L.Map, features: GoatMapFeature[]) {
  if (!features.length) return;
  if (features.length === 1) {
    const [longitude, latitude] = features[0].geometry.coordinates;
    map.setView([latitude, longitude], 5, { animate: false });
    return;
  }
  const bounds = L.latLngBounds(features.map((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    return L.latLng(latitude, longitude);
  }));
  map.fitBounds(bounds, { animate: false, maxZoom: 6, padding: [64, 64] });
}

function fitGlFeatures(map: MapLibreMap, features: GoatMapFeature[]) {
  if (!features.length) return;
  if (features.length === 1) {
    map.jumpTo({ center: features[0].geometry.coordinates as [number, number], zoom: 5 });
    return;
  }
  const bounds = features.reduce((result, feature) => result.extend(feature.geometry.coordinates as [number, number]), new maplibregl.LngLatBounds());
  map.fitBounds(bounds, { animate: false, maxZoom: 6, padding: 64 });
}

function webGlSupported() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

async function verifyVectorSource(signal: AbortSignal) {
  const tileJsonResponse = await fetch("https://tiles.openfreemap.org/planet", { signal });
  if (!tileJsonResponse.ok) throw new Error(`OpenFreeMap TileJSON returned HTTP ${tileJsonResponse.status}`);
  const tileJson = await tileJsonResponse.json() as { tiles?: string[] };
  const template = tileJson.tiles?.[0];
  if (!template) throw new Error("OpenFreeMap TileJSON did not expose a vector tile template");
  const tileUrl = template.replace("{z}", "0").replace("{x}", "0").replace("{y}", "0");
  const tileResponse = await fetch(tileUrl, { signal });
  if (!tileResponse.ok) throw new Error(`OpenFreeMap vector probe returned HTTP ${tileResponse.status}`);
  if ((await tileResponse.arrayBuffer()).byteLength < 1) throw new Error("OpenFreeMap vector probe returned an empty tile");
}

function logMapFailure(stage: "initialization" | "style" | "tiles", error: unknown) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown map error";
  console.error(`GOATS map ${stage} failed: ${detail}`);
}
