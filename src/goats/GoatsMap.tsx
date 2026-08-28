import { useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import goatPin from "../../assets/icons/goatpin.svg";
import type { GoatMapFeatureCollection } from "./types";

type MapState = "loading" | "ready" | "failed";
type GoatMapFeature = GoatMapFeatureCollection["features"][number];

const WORLD_BOUNDS = L.latLngBounds([-85.05112878, -180], [85.05112878, 180]);
const TILE_URL = "https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png";

export default function GoatsMap({ data, selectedId, onSelect }: {
  data: GoatMapFeatureCollection;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const lastSelectedRef = useRef(selectedId);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const [mapState, setMapState] = useState<MapState>("loading");
  const [loadedTileCount, setLoadedTileCount] = useState(0);
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
        maxBounds: WORLD_BOUNDS,
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
      marker.bindTooltip(`${feature.properties.displayName} · ${feature.properties.locationLabel}`, { direction: "top", offset: [0, -36] });
      marker.on("click", () => onSelect(id));
      const element = marker.getElement();
      if (element) {
        element.dataset.goatsMarkerId = id;
        element.dataset.goatsMarkerName = feature.properties.displayName;
        element.setAttribute("aria-label", `Select ${feature.properties.displayName} in ${feature.properties.locationLabel}`);
        element.classList.toggle("is-selected", id === selectedIdRef.current);
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
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 5), { duration: 0.45 });
    marker.getElement()?.focus({ preventScroll: true });
  }, [mapState, selectedId]);

  return <div
    className={`goats-map${mapState === "ready" ? " is-ready" : ""}`}
    data-goats-map-engine="leaflet"
    data-goats-map-feature-count={features.length}
    data-goats-map-state={mapState}
    data-goats-map-tile-count={loadedTileCount}
  >
    <div ref={container} className="goats-map__canvas" aria-label="Interactive map of approximate GOATS locations. Use the listing controls below as the accessible map alternative." />
    {mapState === "loading" ? <div className="goats-map__status" role="status">Loading map geography…</div> : null}
    {mapState === "failed" ? <MapFallback data={data} selectedId={selectedId} onSelect={onSelect} /> : null}
    <button type="button" className="goats-map__reset" onClick={() => {
      const map = mapRef.current;
      if (!map) return;
      fitFeatures(map, features);
    }} disabled={!features.length || mapState === "failed"}>Reset results</button>
    <div className="goats-map__instructions">Drag to pan. Use the +/− controls to zoom. Locations are deliberately approximate. Listings sharing a point remain available below.</div>
    <CoincidentLocations data={data} onSelect={onSelect} />
  </div>;
}

function MapFallback({ data, selectedId, onSelect }: { data: GoatMapFeatureCollection; selectedId: string; onSelect: (id: string) => void }) {
  return <div className="goats-map-fallback" role="status"><strong>Interactive map could not load.</strong><p>Every approved mapped listing remains available in this location list.</p><ul>{data.features.map((feature) => <li key={feature.properties.id}><button type="button" className={selectedId === feature.properties.id ? "is-selected" : ""} onClick={() => onSelect(feature.properties.id)}>{feature.properties.displayName} · {feature.properties.locationLabel}</button></li>)}</ul></div>;
}

function CoincidentLocations({ data, onSelect }: { data: GoatMapFeatureCollection; onSelect: (id: string) => void }) {
  const groups = new Map<string, typeof data.features>();
  for (const feature of data.features) {
    const key = feature.geometry.coordinates.join(",");
    groups.set(key, [...(groups.get(key) || []), feature]);
  }
  const shared = [...groups.values()].filter((items) => items.length > 1);
  if (!shared.length) return null;
  return <details className="goats-map__shared"><summary>Listings sharing an approximate map point</summary>{shared.map((items) => <div key={items[0].geometry.coordinates.join(",")}><strong>{items[0].properties.locationLabel}</strong><ul>{items.map((feature) => <li key={feature.properties.id}><button type="button" onClick={() => onSelect(feature.properties.id)}>{feature.properties.displayName}</button></li>)}</ul></div>)}</details>;
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

function logMapFailure(stage: "initialization" | "tiles", error: unknown) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown map error";
  console.error(`GOATS map ${stage} failed: ${detail}`);
}
