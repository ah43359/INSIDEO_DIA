"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  FACTOR_DEFS,
  FACTOR_STYLES,
  type FactorKind,
} from "@/lib/monitoreo/eca-registry";
import {
  computeCompleteness,
  getActiveParams,
  summarizeExceedances,
  type ExceedanceItem,
} from "@/lib/monitoreo/factor-checks";
import FactorOverviewCard from "./_components/FactorOverviewCard";
import MonitoreoHeader from "./_components/MonitoreoHeader";
import FactorTabs from "./_components/FactorTabs";
import Pill from "./_components/Pill";
import DistributionBar from "./_components/DistributionBar";
import { InfoCard, DefList } from "./_components/InfoCard";

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

  // ── Per-factor stats (single pass) ────────────────────────────────────────
  type Stats = {
    stationsCount: number;
    paramsCount: number;
    filled: number;
    total: number;
    exceedances: ExceedanceItem[];
  };
  const perFactor = useMemo(() => {
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
        exceedances,
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
      exceedances += s.exceedances.length;
      if (s.stationsCount > 0) factorsWithData += 1;
    }
    return { stationsCount, filled, total, exceedances, factorsWithData };
  }, [perFactor]);

  const factorBadges: Partial<Record<FactorKind, number>> = {};
  for (const [factor, s] of perFactor) factorBadges[factor] = s.exceedances.length;

  // Top exceedances list (cross-factor, sorted by magnitude — here we just show first 5).
  const topExceedances: { factorLabel: string; item: ExceedanceItem; accent: string }[] = [];
  for (const f of FACTOR_DEFS) {
    const list = perFactor.get(f.id)?.exceedances ?? [];
    for (const item of list) {
      topExceedances.push({
        factorLabel: f.label,
        item,
        accent: FACTOR_STYLES[f.id].accent,
      });
    }
  }
  topExceedances.sort((a, b) => a.factorLabel.localeCompare(b.factorLabel));
  const topFive = topExceedances.slice(0, 5);

  // Distribution bar segments — measurements per factor (falls back to stations if none).
  const distributionSegments = FACTOR_DEFS.map((f) => {
    const stats = perFactor.get(f.id);
    return {
      id: f.id,
      label: f.label,
      value: stats?.filled ?? 0,
      color: FACTOR_STYLES[f.id].accent,
    };
  });
  const measurementsTotal = distributionSegments.reduce((s, x) => s + x.value, 0);
  const stationSegments = FACTOR_DEFS.map((f) => ({
    id: f.id,
    label: f.label,
    value: perFactor.get(f.id)?.stationsCount ?? 0,
    color: FACTOR_STYLES[f.id].accent,
  }));
  const showMeasurements = measurementsTotal > 0;

  const completitudPct =
    totals.total === 0 ? 0 : Math.round((totals.filled / totals.total) * 100);

  return (
    <div className="space-y-6">
      <MonitoreoHeader
        breadcrumbs={[
          { label: "Proyectos", href: "/projects" },
          { label: projectName || "Proyecto", href: `/projects/${projectId}` },
          { label: "Resultados de Monitoreo" },
        ]}
        title="Resultados de Monitoreo"
        subtitle={
          <>
            {clientName && <span>{clientName}</span>}
            {clientName && <span className="text-stone-300"> · </span>}
            <span>Calidad ambiental por factor</span>
          </>
        }
        pills={
          <>
            <Pill icon="📅" tone="neutral">
              Campaña: {CAMPAIGN_LABELS[campaign]}
            </Pill>
            <Pill icon="🧭" tone="neutral">
              {totals.factorsWithData} / {FACTOR_DEFS.length} factores
            </Pill>
            <Pill icon="📍" tone="neutral">
              {totals.stationsCount} estaciones
            </Pill>
            <Pill
              icon="📈"
              tone={completitudPct >= 80 ? "ok" : completitudPct >= 40 ? "warn" : "neutral"}
            >
              Completitud {completitudPct}%
            </Pill>
            <Pill
              dotColor={totals.exceedances > 0 ? "#dc2626" : "#10b981"}
              tone={totals.exceedances > 0 ? "danger" : "ok"}
            >
              {totals.exceedances > 0
                ? `${totals.exceedances} excedencias`
                : "Sin excedencias"}
            </Pill>
          </>
        }
      />

      <FactorTabs
        projectId={projectId}
        active="resumen"
        campaign={campaign}
        badges={factorBadges}
      />

      {/* Campaign selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-stone-600">Cambiar campaña:</span>
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

      {/* 3-up info cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        <InfoCard title="Proyecto" icon="📋">
          <DefList
            items={[
              ["Nombre", projectName || "—"],
              ["Cliente", clientName || "—"],
              ["Campaña", CAMPAIGN_LABELS[campaign]],
              [
                "Factores con datos",
                <span key="f" className="tabular-nums">
                  {totals.factorsWithData} / {FACTOR_DEFS.length}
                </span>,
              ],
            ]}
          />
        </InfoCard>

        <InfoCard title="Métricas globales" icon="📊">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Estaciones" value={totals.stationsCount} accent="#0f766e" />
            <Metric
              label="Mediciones"
              value={totals.filled}
              accent="#0369a1"
              hint={`/ ${totals.total}`}
            />
            <Metric
              label="Completitud"
              value={`${completitudPct}%`}
              accent={completitudPct >= 80 ? "#15803d" : completitudPct >= 40 ? "#a16207" : "#525252"}
            />
            <Metric
              label="Excedencias"
              value={totals.exceedances}
              accent={totals.exceedances > 0 ? "#b91c1c" : "#15803d"}
            />
          </div>
        </InfoCard>

        <InfoCard
          title="Excedencias destacadas"
          icon="⚠"
          accent={topFive.length > 0 ? "#b91c1c" : "#15803d"}
          aside={
            topExceedances.length > 5 ? (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                +{topExceedances.length - 5} más
              </span>
            ) : null
          }
        >
          {topFive.length === 0 ? (
            <p className="text-sm text-emerald-700">
              ✓ Ningún parámetro excede el ECA en esta campaña.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {topFive.map((row, i) => (
                <li
                  key={`${row.item.stationCode}-${row.item.paramId}-${i}`}
                  className="flex items-baseline gap-2"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: row.accent }}
                  />
                  <span className="truncate font-medium text-stone-700">
                    {row.item.paramName}
                  </span>
                  <span className="ml-auto whitespace-nowrap text-xs text-stone-400">
                    {row.factorLabel} · {row.item.stationCode}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </InfoCard>
      </div>

      {/* Distribution bar */}
      <DistributionBar
        title={
          showMeasurements
            ? "Distribución de mediciones por factor"
            : "Distribución de estaciones por factor"
        }
        unit={showMeasurements ? "mediciones" : "estaciones"}
        segments={showMeasurements ? distributionSegments : stationSegments}
        emptyLabel="Aún no se han registrado mediciones ni estaciones para esta campaña."
      />

      {/* Factor cards grid */}
      <section>
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
                exceedances: [],
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
                  exceedances={stats.exceedances.length}
                  campaign={campaign}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string | number;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md bg-stone-50 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span
          className="text-xl font-bold leading-tight tabular-nums"
          style={{ color: accent }}
        >
          {value}
        </span>
        {hint && <span className="text-xs text-stone-400 tabular-nums">{hint}</span>}
      </div>
    </div>
  );
}
