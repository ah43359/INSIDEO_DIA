"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import maplibregl, { type Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface PeruMapProps {
  geojson: GeoJSON.FeatureCollection;
}

// Peru bounding box (rough): lon -82..-68, lat -18.5..0.1
const PERU_BOUNDS: [[number, number], [number, number]] = [
  [-82, -18.5],
  [-68, 0.1],
];

export default function PeruMap({ geojson }: PeruMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      bounds: PERU_BOUNDS,
      fitBoundsOptions: { padding: 40 },
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));

    map.on("load", () => {
      map.addSource("projects", { type: "geojson", data: geojson });
      map.addLayer({
        id: "projects-circle",
        type: "circle",
        source: "projects",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "features"],
            1, 6,
            10, 12,
            50, 18,
          ],
          "circle-color": "#0f766e",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "projects-label",
        type: "symbol",
        source: "projects",
        layout: {
          "text-field": ["get", "nombre_proyecto"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 12,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#1c1917",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      map.on("click", "projects-circle", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, unknown>;
        const html = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px;">
            <div style="font-weight: 600;">${props.nombre_proyecto}</div>
            <div style="color:#57534e;">${props.titular}</div>
            <div style="color:#57534e;">${props.region} · UTM ${props.zona_utm}S</div>
            <div style="color:#57534e;">${props.features} componentes</div>
            <a href="/projects/${props.project_id}" style="color:#0f766e;text-decoration:underline;display:inline-block;margin-top:4px;">Ver detalle →</a>
          </div>`;
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      });
      map.on("mouseenter", "projects-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "projects-circle", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [geojson, router]);

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-160px)] w-full overflow-hidden rounded-lg border border-stone-200"
    />
  );
}
