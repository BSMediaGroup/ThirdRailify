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
  onActivate: (id: string) => void;
  detailOpen: boolean;
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

function MapLibreGoatsMap({ data, selectedId, onActivate, detailOpen, onFailure }: GoatsMapProps & { onFailure: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, GlMarker>());
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const [mapState, setMapState] = useState<Exclude<MapState, "failed">>("loading");
  const [loadedTileCount, setLoadedTileCount] = useState(0);
  const [sourceFeatureCount, setSourceFeatureCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const features = useMemo(() => validMapFeatures(data), [data]);
  const markerOffsets = useMemo(() => coincidentMarkerOffsets(features), [features]);

  useEffect(() => {
    const viewport = container.current;
    if (!viewport || !webGlSupported()) {
      onFailure();
      return;
    }

    setMapState("loading");
    setLoadedTileCount(0);
    setSourceFeatureCount(0);
    let active = true;
    let resizeFrame = 0;
    let observer: ResizeObserver | null = null;
    let sourceErrors = 0;
    let vectorProbeReady = false;
    const probeController = new AbortController();
    const loadedTiles = new Set<string>();
    const markers = new Map<string, GlMarker>();
    const canonicalCoordinates = new Map(features.map((feature) => [String(feature.properties.id), feature.geometry.coordinates as [number, number]]));

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
        minZoom: -1,
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
      markers.forEach((entry, id) => {
        const coordinates = canonicalCoordinates.get(id);
        if (coordinates) entry.marker.setLngLat(coordinates);
      });
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
      const markerOffset = responsiveMarkerOffset(markerOffsets.get(id), viewport.clientWidth);
      element.dataset.goatsMarkerOffset = markerOffset.join(",");

      const popup = new maplibregl.Popup({
        className: "goats-map-popup",
        closeButton: true,
        closeOnClick: false,
        focusAfterOpen: false,
        maxWidth: window.innerWidth <= 540 ? "240px" : "340px",
        offset: 28,
      }).setLngLat(feature.geometry.coordinates as [number, number]).setDOMContent(createMarkerCard(feature));
      const marker = new maplibregl.Marker({ element, anchor: "bottom", offset: markerOffset })
        .setLngLat(feature.geometry.coordinates as [number, number])
        .addTo(map);
      const openCard = () => {
        markers.forEach((entry, markerId) => {
          if (markerId !== id && entry.popup.isOpen()) entry.popup.remove();
        });
        if (!popup.isOpen()) popup.addTo(map);
        window.requestAnimationFrame(() => keepGlPopupInside(popup, viewport));
      };
      element.addEventListener("click", () => {
        element.focus({ preventScroll: true });
        onActivate(id);
        window.requestAnimationFrame(() => popup.remove());
      });
      element.addEventListener("mouseenter", openCard);
      element.addEventListener("focus", openCard);
      element.addEventListener("mouseleave", () => { if (document.activeElement !== element) popup.remove(); });
      element.addEventListener("blur", () => popup.remove());
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
  }, [features, markerOffsets, onActivate, onFailure]);

  useEffect(() => {
    markersRef.current.forEach(({ element }, id) => element.classList.toggle("is-selected", id === selectedId));
  }, [selectedId]);

  useEffect(() => {
    const resizeMap = window.requestAnimationFrame(() => {
      const map = mapRef.current;
      if (!map) return;
      const center = map.getCenter(); const zoom = map.getZoom();
      map.resize();
      map.jumpTo({ center, zoom });
    });
    if (!expanded) return () => window.cancelAnimationFrame(resizeMap);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = () => {
      setExpanded(false);
      window.requestAnimationFrame(() => expandButton.current?.focus({ preventScroll: true }));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !detailOpen) close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(resizeMap);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [detailOpen, expanded]);

  return <div
    className={`goats-map${mapState === "ready" ? " is-ready" : ""}${expanded ? " is-expanded" : ""}`}
    data-goats-map-engine="maplibre"
    data-goats-map-expanded={expanded ? "true" : "false"}
    data-goats-map-feature-count={features.length}
    data-goats-map-source-feature-count={sourceFeatureCount}
    data-goats-map-state={mapState}
    data-goats-map-tile-count={loadedTileCount}
    role={expanded ? "region" : undefined}
    aria-label={expanded ? "Expanded interactive GOATS map" : undefined}
  >
    <div ref={container} className="goats-map__canvas" aria-label="Interactive map of approximate GOATS locations. Use the listing controls below as the accessible map alternative." />
    {mapState === "loading" ? <div className="goats-map__status" role="status">Loading vector map geography…</div> : null}
    <button type="button" className="goats-map__reset" onClick={() => {
      const map = mapRef.current;
      if (!map) return;
      markersRef.current.forEach(({ marker, popup }, id) => {
        popup.remove();
        const feature = features.find((item) => String(item.properties.id) === id);
        if (feature) marker.setLngLat(feature.geometry.coordinates as [number, number]);
      });
      fitGlFeatures(map, features, expanded);
    }} disabled={!features.length}>Reset results</button>
    <button ref={expandButton} type="button" className="goats-map__expand" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
      <span aria-hidden="true">{expanded ? "×" : "⛶"}</span>{expanded ? "Close expanded map" : "Expand map"}
    </button>
    <div className="goats-map__instructions">Drag to pan. Use the +/− controls to zoom. Locations are deliberately approximate. Listings sharing a point remain available below.</div>
    <CoincidentLocations data={data} onActivate={onActivate} />
    <div className="goats-map__expanded-legend" aria-hidden="true"><span>Global field view</span><i /><small>All active coordinates · Approximate by design</small></div>
  </div>;
}

function LeafletGoatsMap({ data, selectedId, onActivate, detailOpen }: GoatsMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const [mapState, setMapState] = useState<MapState>("loading");
  const [loadedTileCount, setLoadedTileCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const features = useMemo(() => validMapFeatures(data), [data]);
  const markerOffsets = useMemo(() => coincidentMarkerOffsets(features), [features]);

  useEffect(() => {
    const viewport = container.current;
    if (!viewport) return;
    setMapState("loading");
    setLoadedTileCount(0);

    let active = true;
    let successfulTiles = 0;
    let resizeFrame = 0;
    let observer: ResizeObserver | null = null;
    const markers = new Map<string, L.Marker>();
    let map: L.Map;
    try {
      map = L.map(viewport, {
        attributionControl: true,
        center: [20, 0],
        maxBounds: INTERACTION_BOUNDS,
        maxBoundsViscosity: 1,
        maxZoom: 8,
        minZoom: 0,
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
      minZoom: 0,
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
      const [offsetX, offsetY] = responsiveMarkerOffset(markerOffsets.get(id), viewport.clientWidth);
      const icon = L.icon({
        iconUrl: goatPin,
        iconSize: [24, 32],
        iconAnchor: [12 - offsetX, 32 - offsetY],
        tooltipAnchor: [offsetX, -26 + offsetY],
        className: "goats-map__point",
      });
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
        maxWidth: window.innerWidth <= 540 ? 240 : 340,
        minWidth: window.innerWidth <= 540 ? 220 : 300,
        offset: [0, -26],
      });
      marker.on("click", () => {
        marker.getElement()?.focus({ preventScroll: true });
        onActivate(id);
        window.requestAnimationFrame(() => marker.closePopup());
      });
      marker.on("mouseover", () => marker.openPopup());
      marker.on("mouseout", () => { if (document.activeElement !== marker.getElement()) marker.closePopup(); });
      const element = marker.getElement();
      if (element) {
        element.dataset.goatsMarkerId = id;
        element.dataset.goatsMarkerName = feature.properties.displayName;
        element.dataset.goatsMarkerOffset = `${offsetX},${offsetY}`;
        element.setAttribute("aria-label", `Select ${feature.properties.displayName} in ${feature.properties.locationLabel}`);
        element.classList.toggle("is-selected", id === selectedIdRef.current);
        element.addEventListener("focus", () => marker.openPopup());
        element.addEventListener("blur", () => marker.closePopup());
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
  }, [features, markerOffsets, onActivate]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => marker.getElement()?.classList.toggle("is-selected", id === selectedId));
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const resizeMap = window.requestAnimationFrame(() => {
      if (!map) return;
      const center = map.getCenter(); const zoom = map.getZoom();
      map.invalidateSize({ pan: false });
      map.setView(center, zoom, { animate: false });
    });
    if (!expanded) return () => window.cancelAnimationFrame(resizeMap);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = () => {
      setExpanded(false);
      window.requestAnimationFrame(() => expandButton.current?.focus({ preventScroll: true }));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !detailOpen) close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(resizeMap);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [detailOpen, expanded]);

  return <div
    className={`goats-map${mapState === "ready" ? " is-ready" : ""}${expanded ? " is-expanded" : ""}`}
    data-goats-map-engine="leaflet"
    data-goats-map-expanded={expanded ? "true" : "false"}
    data-goats-map-feature-count={features.length}
    data-goats-map-state={mapState}
    data-goats-map-tile-count={loadedTileCount}
    role={expanded ? "region" : undefined}
    aria-label={expanded ? "Expanded interactive GOATS map" : undefined}
  >
    <div ref={container} className="goats-map__canvas" aria-label="Interactive map of approximate GOATS locations. Use the listing controls below as the accessible map alternative." />
    {mapState === "loading" ? <div className="goats-map__status" role="status">Loading map geography…</div> : null}
    {mapState === "failed" ? <MapFallback data={data} selectedId={selectedId} onActivate={onActivate} /> : null}
    <button type="button" className="goats-map__reset" onClick={() => {
      const map = mapRef.current;
      if (!map) return;
      map.stop();
      map.closePopup();
      fitFeatures(map, features, expanded);
    }} disabled={!features.length || mapState === "failed"}>Reset results</button>
    <button ref={expandButton} type="button" className="goats-map__expand" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
      <span aria-hidden="true">{expanded ? "×" : "⛶"}</span>{expanded ? "Close expanded map" : "Expand map"}
    </button>
    <div className="goats-map__instructions">Drag to pan. Use the +/− controls to zoom. Locations are deliberately approximate. Listings sharing a point remain available below.</div>
    <CoincidentLocations data={data} onActivate={onActivate} />
    <div className="goats-map__expanded-legend" aria-hidden="true"><span>Global field view</span><i /><small>All active coordinates · Approximate by design</small></div>
  </div>;
}

function createMarkerCard(feature: GoatMapFeature): HTMLElement {
  const card = document.createElement("article");
  card.className = "goats-map-marker-card";
  card.dataset.goatsMarkerCard = String(feature.properties.id);
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
  const hint = document.createElement("small");
  hint.className = "goats-map-marker-card__hint";
  hint.textContent = "Click for full signal";
  copy.append(signal, title, location, product, hint);
  card.append(copy);
  return card;
}

function MapFallback({ data, selectedId, onActivate }: { data: GoatMapFeatureCollection; selectedId: string; onActivate: (id: string) => void }) {
  return <div className="goats-map-fallback" role="status"><strong>Interactive map could not load.</strong><p>Every approved mapped listing remains available in this location list.</p><ul>{data.features.map((feature) => <li key={feature.properties.id}><button type="button" className={selectedId === feature.properties.id ? "is-selected" : ""} onClick={() => onActivate(feature.properties.id)}><CountryFlag countryCode={feature.properties.countryCode} />{feature.properties.displayName} · {feature.properties.locationLabel}</button></li>)}</ul></div>;
}

function CoincidentLocations({ data, onActivate }: { data: GoatMapFeatureCollection; onActivate: (id: string) => void }) {
  const groups = new Map<string, typeof data.features>();
  for (const feature of data.features) {
    const key = feature.geometry.coordinates.join(",");
    groups.set(key, [...(groups.get(key) || []), feature]);
  }
  const shared = [...groups.values()].filter((items) => items.length > 1);
  if (!shared.length) return null;
  return <details className="goats-map__shared"><summary>Listings sharing an approximate map point</summary>{shared.map((items) => <div key={items[0].geometry.coordinates.join(",")}><strong><CountryFlag countryCode={items[0].properties.countryCode} />{items[0].properties.locationLabel}</strong><ul>{items.map((feature) => <li key={feature.properties.id}><button type="button" onClick={() => onActivate(feature.properties.id)}>{feature.properties.displayName}</button></li>)}</ul></div>)}</details>;
}

function validMapFeatures(data: GoatMapFeatureCollection): GoatMapFeature[] {
  return data.features.filter((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    return Number.isFinite(longitude) && Number.isFinite(latitude) && longitude >= -180 && longitude <= 180 && latitude >= -85.05112878 && latitude <= 85.05112878;
  });
}

function coincidentMarkerOffsets(features: GoatMapFeature[]) {
  const groups = new Map<string, GoatMapFeature[]>();
  for (const feature of features) {
    const [longitude, latitude] = feature.geometry.coordinates;
    const key = `${Number(longitude).toFixed(2)},${Number(latitude).toFixed(2)}`;
    const group = groups.get(key) ?? [];
    group.push(feature);
    groups.set(key, group);
  }

  const offsets = new Map<string, [number, number]>();
  groups.forEach((group) => {
    const ordered = [...group].sort((left, right) => String(left.properties.id).localeCompare(String(right.properties.id)));
    if (ordered.length === 1) {
      offsets.set(String(ordered[0].properties.id), [0, 0]);
      return;
    }
    if (ordered.length === 2) {
      offsets.set(String(ordered[0].properties.id), [-16, 0]);
      offsets.set(String(ordered[1].properties.id), [16, 0]);
      return;
    }
    const radius = Math.max(22, ordered.length * 6);
    ordered.forEach((feature, index) => {
      const angle = (Math.PI * 2 * index) / ordered.length - Math.PI / 2;
      offsets.set(String(feature.properties.id), [Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius)]);
    });
  });
  return offsets;
}

function responsiveMarkerOffset(offset: [number, number] | undefined, width: number): [number, number] {
  const [x, y] = offset ?? [0, 0];
  return width <= 540 ? [Math.round(x * .55), Math.round(y * .55)] : [x, y];
}

function fitFeatures(map: L.Map, features: GoatMapFeature[], expanded = false) {
  if (!features.length) return;
  if (features.length === 1) {
    const [longitude, latitude] = features[0].geometry.coordinates;
    map.setView([latitude, longitude], 5, { animate: false });
    return;
  }
  const longitudes = features.map((feature) => feature.geometry.coordinates[0]);
  if (map.getContainer().clientWidth <= 540 && Math.max(...longitudes) - Math.min(...longitudes) > 180) {
    const latitude = features.reduce((total, feature) => total + feature.geometry.coordinates[1], 0) / features.length;
    const longitude = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
    map.setView([latitude, longitude], 0, { animate: false });
    return;
  }
  const bounds = L.latLngBounds(features.map((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    return L.latLng(latitude, longitude);
  }));
  const padding = mapFitPadding(map.getContainer().clientWidth, expanded);
  map.fitBounds(bounds, { animate: false, maxZoom: 5, padding: [padding, padding] });
}

function fitGlFeatures(map: MapLibreMap, features: GoatMapFeature[], expanded = false) {
  if (!features.length) return;
  if (features.length === 1) {
    map.jumpTo({ center: features[0].geometry.coordinates as [number, number], zoom: 5 });
    return;
  }
  const longitudes = features.map((feature) => feature.geometry.coordinates[0]);
  const width = map.getContainer().clientWidth;
  if (width <= 540 && Math.max(...longitudes) - Math.min(...longitudes) > 180) {
    const latitude = features.reduce((total, feature) => total + feature.geometry.coordinates[1], 0) / features.length;
    const longitude = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
    map.jumpTo({ center: [longitude, latitude], zoom: -.45 });
    map.getContainer().dataset.goatsMapFit = `world:${map.getZoom().toFixed(2)}`;
    return;
  }
  const bounds = features.reduce((result, feature) => result.extend(feature.geometry.coordinates as [number, number]), new maplibregl.LngLatBounds());
  map.fitBounds(bounds, { animate: false, maxZoom: 5, padding: mapFitPadding(width, expanded) });
  map.getContainer().dataset.goatsMapFit = `bounds:${map.getZoom().toFixed(2)}`;
}

function mapFitPadding(width: number, expanded: boolean) {
  if (width <= 540) return expanded ? 34 : 28;
  if (width <= 900) return expanded ? 52 : 44;
  return expanded ? 78 : 64;
}

function keepGlPopupInside(popup: maplibregl.Popup, viewport: HTMLElement) {
  const element = popup.getElement();
  if (!element) return;
  element.style.translate = "";
  const frame = viewport.getBoundingClientRect();
  const bounds = element.getBoundingClientRect();
  const gutter = 8;
  let x = 0; let y = 0;
  if (bounds.left < frame.left + gutter) x = frame.left + gutter - bounds.left;
  else if (bounds.right > frame.right - gutter) x = frame.right - gutter - bounds.right;
  if (bounds.top < frame.top + gutter) y = frame.top + gutter - bounds.top;
  else if (bounds.bottom > frame.bottom - gutter) y = frame.bottom - gutter - bounds.bottom;
  if (x || y) element.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
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
