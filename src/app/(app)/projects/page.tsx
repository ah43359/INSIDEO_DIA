import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import { formatDate } from "@/lib/format";

interface ProjectRow extends Project {
  clientes: { razon_social: string; ruc: string } | null;
  components_geom: { count: number }[];
  componente_inventario: { count: number }[];
  rfi_submissions: { count: number }[];
}

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `*,
       clientes ( razon_social, ruc ),
       components_geom ( count ),
       componente_inventario ( count ),
       rfi_submissions ( count )`,
    )
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Proyectos
          </h1>
          <p className="text-sm text-stone-500">
            Inventario completo de proyectos DIA exploración cargados al sistema.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/rfi_intake_template.xlsx"
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-sm font-medium text-stone-600 shadow-sm transition-all hover:border-stone-300 hover:text-stone-900"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Descargar plantilla
          </a>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Agregar proyecto
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Error consultando proyectos: {error.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="px-4 py-3 font-medium">Proyecto</th>
              <th className="px-4 py-3 font-medium">Titular</th>
              <th className="px-4 py-3 font-medium">Ubicación</th>
              <th className="px-4 py-3 font-medium">UTM</th>
              <th className="px-4 py-3 font-medium">Commodity</th>
              <th className="px-4 py-3 text-right font-medium">Componentes</th>
              <th className="px-4 py-3 text-right font-medium">Geom</th>
              <th className="px-4 py-3 text-right font-medium">Submissions</th>
              <th className="px-4 py-3 font-medium">Actualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(data as ProjectRow[] | null)?.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-emerald-50/30">
                <td className="px-4 py-3.5 font-medium">
                  <Link
                    href={`/projects/${p.id}`}
                    className="text-stone-900 transition-colors hover:text-emerald-600"
                  >
                    {p.nombre_proyecto}
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-stone-600">
                  {p.clientes?.razon_social ?? "—"}
                </td>
                <td className="px-4 py-3.5 text-stone-600">
                  {p.region} / {p.provincia} / {p.distrito}
                </td>
                <td className="px-4 py-3.5 text-stone-600">{p.zona_utm}S</td>
                <td className="px-4 py-3.5">
                  {p.commodity?.[0] ? (
                    <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                      {p.commodity[0]}
                    </span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-stone-700">
                  {p.componente_inventario?.[0]?.count ?? 0}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-stone-700">
                  {p.components_geom?.[0]?.count ?? 0}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-stone-700">
                  {p.rfi_submissions?.[0]?.count ?? 0}
                </td>
                <td className="px-4 py-3.5 text-stone-400">
                  {formatDate(p.updated_at)}
                </td>
              </tr>
            ))}
            {data && data.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-16 text-center text-stone-400"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="mx-auto mb-3 h-10 w-10 text-stone-300">
                    <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zM6 13.25V3.5h8v9.75a.75.75 0 01-1.064.678L9.5 12.2l-3.436 1.728A.75.75 0 016 13.25z" clipRule="evenodd" />
                  </svg>
                  <p>Sin proyectos cargados</p>
                  <p className="mt-1 text-xs">
                    Corre{" "}
                    <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">
                      parse_rfi.py --submit
                    </code>{" "}
                    para cargar uno.
                  </p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
