"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  FACTOR_DEFS,
  type FactorKind,
} from "@/lib/monitoreo/eca-registry";
import {
  computeCompleteness,
  getActiveParams,
  summarizeExceedances,
} from "@/lib/monitoreo/factor-checks";
import FactorOverviewCard from "./_components/FactorOverviewCard";
import KpiTile from "./_components/KpiTile";

type MeasurementCampaign = "linea_base" | "construccion" | "operacion" | "cierre";

const CAMPAIGN_LABELS: Record<MeasurementCampaign, string> = {
  linea_base: "Línea Base",
  construccion: "Construcción",
  operacion: "Operación",
  cierre: "Cierre",
};

interface StationRow {
  id: string;
  project_id: string;
  station_code: string;
  kind: string;
  campaign: string | null;
}

interface MeasurementRow {
  id: string;
  station_id: string;
  station_code: string;
  parameters: Record<string, { value: number; unit: string }>;
}

export default function MonitoreoHubPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [stations, setStations] = useState<StationRow[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [campaign, setCampaign] = useState<MeasurementCampaign>("linea_base");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [projRes, stationRes, measRes] = await Promise.all([
        supabase
          .from("projects")
          .select("nombre_proyecto, clientes(razon_social)")
          .eq("id", projectId)
          .single(),
        supabase
          .from("project_sampling_stations")
          .select("id, project_id, station_code, kind, campaign")
          .eq("project_id", projectId),
        supabase.rpc("get_measurements_for_project", {
          p_project_id: projectId,
          p_campaign: campaign,
        }),
      ]);
      if (cancelled) return;
      if (projRes.data) {
        setProjectName(projRes.data.nombre_proyecto ?? "");
        setClientName(
          (projRes.data.clientes as { razon_social?: string } | null)?.razon_social ?? "",
        );
      }
      if (stationRes.data) setStations(stationRes.data as StationRow[]);
      if (measRes.data) setMeasurements(measRes.data as MeasurementRow[]);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, campaign]);

  // Per-factor stats derived once.
  const perFactor = useMemo(() => {
    type Stats = {
      stationsCount: number;
      paramsCount: number;
      filled: number;
      total: number;
      exceedances: number;
    };
    const out = new Map<FactorKind, Stats>();
    for (const f of FACTOR_DEFS) {
      const factorStations = stations.filter((s) => s.kind === f.id);
      const stationCodes = factorStations.map((s) => s.station_code);
      const factorMeasurements = measurements.filter((m) => {
        const sta = stations.find((s) => s.id === m.station_id);
        return sta?.kind === f.id;
      });
      const results: Record<string, Record<string, string | number>> = {};
      for (const m of factorMeasurements) {
        const sta = stations.find((s) => s.id === m.station_id);
        const code = sta?.station_code ?? m.station_code;
        if (!results[code]) results[code] = {};
        for (const [paramId, paramData] of Object.entries(m.parameters)) {
          results[code][paramId] = paramData.value;
        }
      }
      const completeness = computeCompleteness({
        factor: f.id,
        stationCodes,
        results,
      });
      const exceedances = summarizeExceedances({
        factor: f.id,
        stationCodes,
        results,
      });
      const activeParams = getActiveParams(f.id);
      out.set(f.id, {
        stationsCount: factorStations.length,
        paramsCount: activeParams.length,
        filled: completeness.filled,
        total: completeness.total,
        exceedances: exceedances.length,
      });
    }
    return out;
  }, [stations, measurements]);

  const totals = useMemo(() => {
    let stationsCount = 0;
    let filled = 0;
    let total = 0;
    let exceedances = 0;
    let factorsWithData = 0;
    for (const [, s] of perFactor) {
      stationsCount += s.stationsCount;
      filled += s.filled;
      total += s.total;
      exceedances += s.exceedances;
      if (s.stationsCount > 0) factorsWithData += 1;
    }
    return { stationsCount, filled, total, exceedances, factorsWithData };
  }, [perFactor]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="text-xs text-stone-500 hover:text-stone-800"
          >
            ← {projectName || "Proyecto"}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">
            Resultados de Monitoreo
          </h1>
          <p className="text-sm text-stone-500">
            {clientName && <span>{clientName} · </span>}
            <span>Calidad ambiental por factor</span>
          </p>
        </div>
      </div>

      {/* Campaign selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-stone-600">Campaña:</span>
        {Object.entries(CAMPAIGN_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setCampaign(key as MeasurementCampaign)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              campaign === key
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Totals strip */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile label="Factores con datos" value={`${totals.factorsWithData} / ${FACTOR_DEFS.length}`} icon="🧭" />
          <KpiTile label="Estaciones totales" value={totals.stationsCount} icon="📍" />
          <KpiTile
            label="Completitud global"
            value={
              totals.total === 0
                ? "—"
                : `${Math.round((totals.filled / totals.total) * 100)}%`
            }
            hint={`${totals.filled} / ${totals.total} celdas`}
            icon="📈"
          />
          <KpiTile
            label="Excedencias"
            value={totals.exceedances}
            icon={totals.exceedances > 0 ? "⚠" : "✓"}
            accent={totals.exceedances > 0 ? "#b91c1c" : "#15803d"}
          />
        </div>
      )}

      {/* Factor cards grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Factores ambientales
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FACTOR_DEFS.map((f) => (
              <div
                key={f.id}
                className="h-44 animate-pulse rounded-lg border border-stone-200 bg-white"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FACTOR_DEFS.map((f) => {
              const stats = perFactor.get(f.id) ?? {
                stationsCount: 0,
                paramsCount: 0,
                filled: 0,
                total: 0,
                exceedances: 0,
              };
              return (
                <FactorOverviewCard
                  key={f.id}
                  projectId={projectId}
                  factor={f}
                  stationsCount={stats.stationsCount}
                  paramsCount={stats.paramsCount}
                  filled={stats.filled}
                  total={stats.total}
                  exceedances={stats.exceedances}
                  campaign={campaign}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
