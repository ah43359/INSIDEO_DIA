"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AreaEfectivaRow } from "@/lib/types";
import {
  deleteAreaEfectiva,
  regenerateAreaEfectiva,
  saveAreaEfectivaGeom,
} from "@/app/(app)/projects/[id]/actions";

interface Props {
  projectId: string;
  areaEfectiva: AreaEfectivaRow | null;
  /** True while the map editor is active. */
  editing: boolean;
  /** Toggle vertex-editing mode on the map. */
  onEditToggle: (next: boolean) => void;
  /** GeoJSON Polygon/MultiPolygon currently in the editor (unsaved). */
  editingGeom: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  /** Resets the editor working copy to the persisted polygon. */
  onResetEditor: () => void;
}

const SOURCE_LABEL: Record<AreaEfectivaRow["source"], string> = {
  auto: "Generado",
  edited: "Editado",
  manual: "Cargado",
};

export default function AreaEfectivaPanel({
  projectId,
  areaEfectiva,
  editing,
  onEditToggle,
  editingGeom,
  onResetEditor,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [bufferM, setBufferM] = useState<number>(areaEfectiva?.buffer_m ?? 100);
  const [error, setError] = useState<string | null>(null);

  function runRegenerate(): void {
    setError(null);
    startTransition(async () => {
      const res = await regenerateAreaEfectiva(projectId, bufferM);
      if (!res.ok) {
        setError(res.message ?? "Error al regenerar.");
        return;
      }
      router.refresh();
    });
  }

  function runSaveEdits(): void {
    if (!editingGeom) return;
    setError(null);
    startTransition(async () => {
      const res = await saveAreaEfectivaGeom(
        projectId,
        JSON.stringify(editingGeom),
      );
      if (!res.ok) {
        setError(res.message ?? "Error al guardar.");
        return;
      }
      onEditToggle(false);
      router.refresh();
    });
  }

  function runDelete(): void {
    if (!confirm("¿Borrar el área efectiva? Se regenerará automáticamente.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteAreaEfectiva(projectId);
      if (!res.ok) {
        setError(res.message ?? "Error al borrar.");
        return;
      }
      router.refresh();
    });
  }

  // ─── Downloads ────────────────────────────────────────────────────────

  function downloadFile(name: string, mime: string, body: string): void {
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function currentGeom(): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
    if (editingGeom) return editingGeom;
    if (!areaEfectiva) return null;
    try {
      return JSON.parse(areaEfectiva.geom_geojson);
    } catch {
      return null;
    }
  }

  function downloadGeoJSON(): void {
    const geom = currentGeom();
    if (!geom) return;
    const feature: GeoJSON.Feature = {
      type: "Feature",
      geometry: geom,
      properties: {
        area_ha: areaEfectiva?.area_ha ?? null,
        buffer_m: areaEfectiva?.buffer_m ?? null,
        source: areaEfectiva?.source ?? "auto",
      },
    };
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [feature],
    };
    downloadFile(
      "area_efectiva.geojson",
      "application/geo+json",
      JSON.stringify(fc, null, 2),
    );
  }

  function polygonRings(
    geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ): GeoJSON.Position[][] {
    if (geom.type === "Polygon") return geom.coordinates;
    return geom.coordinates.flat();
  }

  function downloadKML(): void {
    const geom = currentGeom();
    if (!geom) return;
    const rings = polygonRings(geom);
    const polys = rings
      .map((ring) => {
        const coords = ring
          .map(([lon, lat]) => `${lon.toFixed(8)},${lat.toFixed(8)},0`)
          .join(" ");
        return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
      })
      .join("");
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Área efectiva</name>
    <Placemark>
      <name>Área efectiva</name>
      <MultiGeometry>${polys}</MultiGeometry>
    </Placemark>
  </Document>
</kml>`;
    downloadFile("area_efectiva.kml", "application/vnd.google-earth.kml+xml", kml);
  }

  function downloadCSV(): void {
    const geom = currentGeom();
    if (!geom) return;
    const rings = polygonRings(geom);
    const rows: string[] = ["ring_index,vertex_index,longitude,latitude"];
    rings.forEach((ring, ri) => {
      ring.forEach(([lon, lat], vi) => {
        rows.push(`${ri},${vi},${lon.toFixed(8)},${lat.toFixed(8)}`);
      });
    });
    downloadFile("area_efectiva_vertices.csv", "text/csv", rows.join("\n"));
  }

  // ─── Render ───────────────────────────────────────────────────────────

  const vertexCount = (() => {
    const g = currentGeom();
    if (!g) return 0;
    return polygonRings(g).reduce((sum, r) => sum + Math.max(0, r.length - 1), 0);
  })();

  return (
    <div className="space-y-3 rounded-md border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Área efectiva
        </h3>
        {areaEfectiva && (
          <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-medium text-stone-700">
            {SOURCE_LABEL[areaEfectiva.source]}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Stat label="Área (ha)" value={areaEfectiva ? areaEfectiva.area_ha.toFixed(2) : "—"} />
        <Stat label="Buffer (m)" value={areaEfectiva ? String(areaEfectiva.buffer_m) : "—"} />
        <Stat label="Vértices" value={String(vertexCount)} />
      </div>

      {/* Stale warning: components added/edited after this polygon was generated. */}
      {areaEfectiva?.is_stale && !editing && (
        <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          <p className="font-semibold">El polígono está desactualizado.</p>
          <p>
            Se agregaron o modificaron componentes después de la última generación.
            Hacé click en <b>Regenerar</b> para incluirlos.
          </p>
        </div>
      )}

      {/* Buffer + regenerate */}
      {!editing && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs">
            <span className="text-stone-500">Buffer (m)</span>
            <input
              type="number"
              min={1}
              max={10000}
              step={10}
              value={bufferM}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isNaN(n)) setBufferM(n);
              }}
              className="w-24 rounded border border-stone-300 bg-white px-2 py-1"
            />
          </label>
          <button
            type="button"
            onClick={runRegenerate}
            disabled={pending}
            className="inline-flex items-center rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-stone-800 disabled:opacity-50"
          >
            {pending ? "Generando…" : areaEfectiva ? "Regenerar" : "Generar"}
          </button>
          {areaEfectiva && (
            <button
              type="button"
              onClick={() => onEditToggle(true)}
              disabled={pending}
              className="inline-flex items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm hover:bg-stone-100 disabled:opacity-50"
            >
              Editar polígono
            </button>
          )}
        </div>
      )}

      {/* Edit mode controls */}
      {editing && areaEfectiva && (
        <div className="space-y-2 rounded border border-sky-200 bg-sky-50 p-2 text-xs">
          <p className="font-semibold text-sky-900">Modo edición activo</p>
          <ul className="list-disc pl-4 text-sky-800">
            <li>Arrastrá los puntos azules para mover vértices.</li>
            <li>Click en un punto verde para insertar un vértice.</li>
            <li>Shift + click en un vértice para eliminarlo.</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={runSaveEdits}
              disabled={pending || !editingGeom}
              className="inline-flex items-center rounded-md bg-sky-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-800 disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={onResetEditor}
              disabled={pending}
              className="inline-flex items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm hover:bg-stone-100 disabled:opacity-50"
            >
              Restablecer
            </button>
            <button
              type="button"
              onClick={() => onEditToggle(false)}
              disabled={pending}
              className="inline-flex items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm hover:bg-stone-100 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Downloads */}
      {areaEfectiva && !editing && (
        <div className="space-y-1 border-t border-stone-200 pt-2">
          <p className="text-[10px] uppercase tracking-wide text-stone-500">
            Descargar coordenadas
          </p>
          <div className="flex flex-wrap gap-2">
            <DownloadButton label="GeoJSON" onClick={downloadGeoJSON} />
            <DownloadButton label="KML" onClick={downloadKML} />
            <DownloadButton label="CSV de vértices" onClick={downloadCSV} />
          </div>
        </div>
      )}

      {/* Reset polygon to fresh auto-compute */}
      {areaEfectiva && !editing && (
        <button
          type="button"
          onClick={runDelete}
          disabled={pending}
          className="text-[10px] text-stone-500 underline-offset-2 hover:text-red-700 hover:underline"
        >
          Borrar y regenerar desde cero
        </button>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">
          {error}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-stone-200 bg-white px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className="font-mono text-sm text-stone-900">{value}</div>
    </div>
  );
}

function DownloadButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-md border border-stone-300 bg-white px-2 py-1 text-[11px] font-medium text-stone-900 shadow-sm hover:bg-stone-100"
    >
      ↓ {label}
    </button>
  );
}
