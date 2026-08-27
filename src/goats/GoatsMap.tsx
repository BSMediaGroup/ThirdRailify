import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import goatPin from "../../assets/icons/goatpin.svg";
import type { GoatMapFeatureCollection } from "./types";

const EMPTY_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#0b0c0e" } },
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
    let clusterMarkers: maplibregl.Marker[] = [];
    let refreshClusterCounts = () => {};
    let resizeObserver: ResizeObserver | null = null;
    const configuredStyle = String(import.meta.env.VITE_GOATS_MAP_STYLE_URL || "").trim();
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: configuredStyle || EMPTY_STYLE,
        center: [0, 20],
        zoom: 1,
        minZoom: 1,
        maxZoom: 15,
        maxBounds: [[-180, -85], [180, 85]],
        renderWorldCopies: false,
        attributionControl: false,
        cooperativeGestures: true,
        trackResize: false,
      });
    } catch { setFailed(true); return; }
    mapRef.current = map;
    map.scrollZoom.disable();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "GOATS locations are approximate" }));
    const markInteraction = () => { interacted.current = true; };
    map.on("dragstart", markInteraction); map.on("zoomstart", markInteraction); map.on("rotatestart", markInteraction);
    map.on("error", (event) => { if (!configuredStyle || !event.error?.message) return; setFailed(true); });
    map.on("load", async () => {
      if (!active) return;
      try {
        const image = await map.loadImage(goatPin);
        if (!active) return;
        if (!map.hasImage("goat-pin")) map.addImage("goat-pin", image.data);
        map.addSource("goats", { type: "geojson", data, cluster: true, clusterMaxZoom: 14, clusterRadius: 52 });
        map.addLayer({ id: "goat-clusters", type: "circle", source: "goats", filter: ["has", "point_count"], paint: { "circle-color": "#e4ff3f", "circle-radius": ["step", ["get", "point_count"], 20, 10, 26, 30, 34], "circle-stroke-color": "#14160f", "circle-stroke-width": 4 } });
        map.addLayer({ id: "goat-points", type: "symbol", source: "goats", filter: ["!", ["has", "point_count"]], layout: { "icon-image": "goat-pin", "icon-size": 0.16, "icon-allow-overlap": true, "icon-anchor": "bottom" } });
        refreshClusterCounts = () => {
          clusterMarkers.forEach((marker) => marker.remove()); clusterMarkers = [];
          const seen = new Set<number>();
          for (const feature of map.queryRenderedFeatures({ layers: ["goat-clusters"] })) {
            const clusterId = Number(feature.properties?.cluster_id); if (!Number.isFinite(clusterId) || seen.has(clusterId) || feature.geometry.type !== "Point") continue; seen.add(clusterId);
            const label = document.createElement("span"); label.className = "goats-map__cluster-count"; label.textContent = String(feature.properties?.point_count_abbreviated || feature.properties?.point_count || ""); label.setAttribute("aria-hidden", "true");
            clusterMarkers.push(new maplibregl.Marker({ element: label, anchor: "center" }).setLngLat(feature.geometry.coordinates as [number, number]).addTo(map));
          }
        };
        map.on("idle", refreshClusterCounts); refreshClusterCounts();
        if (typeof ResizeObserver === "function" && container.current) {
          let observedSize: { width: number; height: number } | null = null;
          resizeObserver = new ResizeObserver(([entry]) => {
            if (!active || !entry) return;
            const next = { width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) };
            if (!observedSize) { observedSize = next; return; }
            if (Math.abs(next.width - observedSize.width) > 1 || Math.abs(next.height - observedSize.height) > 1) setFailed(true);
          });
          resizeObserver.observe(container.current);
        }
        map.on("click", "goat-clusters", async (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ["goat-clusters"] })[0];
          const clusterId = Number(feature?.properties?.cluster_id); const coordinates = feature?.geometry.type === "Point" ? feature.geometry.coordinates as [number, number] : null;
          if (!coordinates || !Number.isFinite(clusterId)) return;
          const source = map.getSource("goats") as GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(clusterId).catch(() => map.getZoom() + 2);
          map.easeTo({ center: coordinates, zoom: Math.min(zoom, 14), duration: 500 });
        });
        map.on("click", "goat-points", (event) => { const id = String(event.features?.[0]?.properties?.id || ""); if (id) onSelect(id); });
        for (const layer of ["goat-clusters", "goat-points"]) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        }
        fitFeatures(map, data);
      } catch { if (active) setFailed(true); }
    });
    return () => { active = false; resizeObserver?.disconnect(); clusterMarkers.forEach((marker) => marker.remove()); map.off("idle", refreshClusterCounts); map.off("dragstart", markInteraction); map.off("zoomstart", markInteraction); map.off("rotatestart", markInteraction); map.remove(); mapRef.current = null; };
  }, [data, onSelect]);

  useEffect(() => {
    const map = mapRef.current; const feature = data.features.find((entry) => String(entry.properties.id) === selectedId);
    if (!map || !feature || interacted.current) return;
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
