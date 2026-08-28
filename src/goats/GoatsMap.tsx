import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import goatPin from "../../assets/icons/goatpin.svg";
import type { GoatMapFeatureCollection } from "./types";

const DEFAULT_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "openfreemap-natural-earth": {
      type: "raster",
      tiles: ["https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 6,
      attribution: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap",
    },
  },
  layers: [
    { id: "goats-map-background", type: "background", paint: { "background-color": "#080906" } },
    {
      id: "openfreemap-natural-earth",
      type: "raster",
      source: "openfreemap-natural-earth",
      paint: { "raster-opacity": 0.82, "raster-saturation": -0.45, "raster-contrast": 0.18, "raster-brightness-max": 0.56 },
    },
  ],
};

export default function GoatsMap({ data, selectedId, onSelect }: {
  data: GoatMapFeatureCollection;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const interacted = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!container.current || !webGlSupported()) { setFailed(true); return; }
    let active = true;
    let locationMarkers: maplibregl.Marker[] = [];
    let refreshLocationMarkers = () => {};
    let loadTimeout = 0;
    const configuredStyle = String(import.meta.env.VITE_GOATS_MAP_STYLE_URL || "").trim();
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: configuredStyle || DEFAULT_MAP_STYLE,
        center: [0, 20],
        zoom: 1,
        minZoom: 1,
        maxZoom: 15,
        renderWorldCopies: false,
        attributionControl: false,
        cooperativeGestures: true,
        trackResize: true,
      });
    } catch (error) { logMapFailure("initialization", error); setFailed(true); return; }
    mapRef.current = map;
    map.scrollZoom.disable();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "GOATS locations are approximate" }));
    const markInteraction = (event: { originalEvent?: unknown }) => { if (event.originalEvent) interacted.current = true; };
    map.on("dragstart", markInteraction); map.on("zoomstart", markInteraction); map.on("rotatestart", markInteraction);
    map.on("error", (event) => { if (event.error?.message) console.warn(`GOATS map resource warning: ${event.error.message}`); });
    loadTimeout = window.setTimeout(() => { if (active) { logMapFailure("load", new Error("Map style load timed out")); setFailed(true); } }, 12_000);
    map.on("load", async () => {
      if (!active) return;
      window.clearTimeout(loadTimeout);
      try {
        refreshLocationMarkers = () => {
          locationMarkers.forEach((marker) => marker.remove());
          locationMarkers = clusterMapFeatures(map, data).map((group) => {
            const element = document.createElement("button");
            element.type = "button";
            if (group.features.length > 1) {
              element.className = "goats-map__cluster-count";
              element.textContent = String(group.features.length);
              element.setAttribute("aria-label", `Zoom into ${group.features.length} nearby GOATS listings`);
              element.addEventListener("click", () => map.easeTo({ center: group.coordinates, zoom: Math.min(map.getZoom() + 2, 14), duration: 500 }));
            } else {
              const feature = group.features[0];
              element.className = "goats-map__point";
              element.setAttribute("aria-label", `Select ${feature.properties.displayName} in ${feature.properties.locationLabel}`);
              const image = document.createElement("img"); image.src = goatPin; image.alt = ""; image.width = 37; image.height = 50; element.append(image);
              element.addEventListener("click", () => onSelect(String(feature.properties.id)));
            }
            return new maplibregl.Marker({ element, anchor: group.features.length > 1 ? "center" : "bottom" }).setLngLat(group.coordinates).addTo(map);
          });
        };
        map.on("moveend", refreshLocationMarkers);
        map.on("resize", refreshLocationMarkers);
        map.once("idle", () => { if (!active) return; refreshLocationMarkers(); if (container.current) container.current.dataset.mapReady = "true"; });
        fitFeatures(map, data);
      } catch (error) { if (active) { logMapFailure("load", error); setFailed(true); } }
    });
    return () => { active = false; window.clearTimeout(loadTimeout); locationMarkers.forEach((marker) => marker.remove()); map.off("moveend", refreshLocationMarkers); map.off("resize", refreshLocationMarkers); map.off("dragstart", markInteraction); map.off("zoomstart", markInteraction); map.off("rotatestart", markInteraction); map.remove(); mapRef.current = null; };
  }, [data, onSelect]);

  useEffect(() => {
    const map = mapRef.current; const feature = data.features.find((entry) => String(entry.properties.id) === selectedId);
    if (!map || container.current?.dataset.mapReady !== "true" || !feature || interacted.current) return;
    map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: Math.max(map.getZoom(), 5), duration: 450 });
  }, [data, selectedId]);

  if (failed) return <MapFallback data={data} selectedId={selectedId} onSelect={onSelect} />;
  return <div className="goats-map"><div ref={container} className="goats-map__canvas" aria-label="Approximate GOATS locations. Use the listing controls below as the accessible map alternative." /><button type="button" className="goats-map__reset" onClick={() => { const map = mapRef.current; if (!map) return; interacted.current = false; fitFeatures(map, data); }} disabled={!data.features.length}>Reset results</button><div className="goats-map__instructions">Use two fingers or Ctrl + scroll to zoom. Locations are deliberately approximate. Listings sharing a point remain available below.</div><CoincidentLocations data={data} onSelect={onSelect} /></div>;
}

function MapFallback({ data, selectedId, onSelect }: { data: GoatMapFeatureCollection; selectedId: string; onSelect: (id: string) => void }) {
  return <div className="goats-map-fallback" role="status"><strong>Map view is unavailable.</strong><p>Every approved mapped listing remains available in this location list.</p><ul>{data.features.map((feature) => <li key={feature.properties.id}><button type="button" className={selectedId === feature.properties.id ? "is-selected" : ""} onClick={() => onSelect(feature.properties.id)}>{feature.properties.displayName} · {feature.properties.locationLabel}</button></li>)}</ul></div>;
}

function CoincidentLocations({ data, onSelect }: { data: GoatMapFeatureCollection; onSelect: (id: string) => void }) {
  const groups = new Map<string, typeof data.features>(); for (const feature of data.features) { const key = feature.geometry.coordinates.join(","); groups.set(key, [...(groups.get(key) || []), feature]); }
  const shared = [...groups.values()].filter((items) => items.length > 1); if (!shared.length) return null;
  return <details className="goats-map__shared"><summary>Listings sharing an approximate map point</summary>{shared.map((items) => <div key={items[0].geometry.coordinates.join(",")}><strong>{items[0].properties.locationLabel}</strong><ul>{items.map((feature) => <li key={feature.properties.id}><button type="button" onClick={() => onSelect(feature.properties.id)}>{feature.properties.displayName}</button></li>)}</ul></div>)}</details>;
}

function fitFeatures(map: MapLibreMap, data: GoatMapFeatureCollection) {
  if (!data.features.length) return;
  const bounds = new maplibregl.LngLatBounds(); for (const feature of data.features) bounds.extend(feature.geometry.coordinates as [number, number]);
  if (data.features.length === 1) map.jumpTo({ center: data.features[0].geometry.coordinates as [number, number], zoom: 5 });
  else map.fitBounds(bounds, { padding: 64, maxZoom: 6, duration: 0 });
}

function webGlSupported() {
  try { const canvas = document.createElement("canvas"); return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")); } catch { return false; }
}

function clusterMapFeatures(map: MapLibreMap, data: GoatMapFeatureCollection) {
  const buckets = new Map<string, typeof data.features>();
  for (const feature of data.features) {
    const point = map.project(feature.geometry.coordinates as [number, number]);
    const key = `${Math.floor(point.x / 58)},${Math.floor(point.y / 58)}`;
    buckets.set(key, [...(buckets.get(key) || []), feature]);
  }
  return [...buckets.values()].map((features) => ({
    features,
    coordinates: [
      features.reduce((sum, feature) => sum + feature.geometry.coordinates[0], 0) / features.length,
      features.reduce((sum, feature) => sum + feature.geometry.coordinates[1], 0) / features.length,
    ] as [number, number],
  }));
}

function logMapFailure(stage: "initialization" | "load", error: unknown) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown map error";
  console.error(`GOATS map ${stage} failed: ${detail}`);
}
