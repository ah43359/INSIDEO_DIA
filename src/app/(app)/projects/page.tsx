import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";

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
          <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
          <p className="text-sm text-stone-600">
            Inventario completo de proyectos DIA exploración cargados al sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/rfi_intake_template.xlsx"
            download
            className="inline-flex items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
          >
            Descargar plantilla
          </a>
          <Link
            href="/projects/new"
            className="inline-flex items-center rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-stone-800"
          >
            + Agregar proyecto
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          Error consultando proyectos: {error.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
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
              <tr key={p.id} className="hover:bg-stone-50">
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/projects/${p.id}`}
                    className="text-stone-900 hover:underline"
                  >
                    {p.nombre_proyecto}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-700">
                  {p.clientes?.razon_social ?? "—"}
                </td>
                <td className="px-4 py-3 text-stone-700">
                  {p.region} / {p.provincia} / {p.distrito}
                </td>
                <td className="px-4 py-3 text-stone-700">{p.zona_utm}S</td>
                <td className="px-4 py-3 text-stone-700">
                  {p.commodity?.join(", ") ?? "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {p.componente_inventario?.[0]?.count ?? 0}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {p.components_geom?.[0]?.count ?? 0}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {p.rfi_submissions?.[0]?.count ?? 0}
                </td>
                <td className="px-4 py-3 text-stone-500">
                  {new Date(p.updated_at).toLocaleDateString("es-PE", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
              </tr>
            ))}
            {data && data.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-stone-500"
                >
                  Sin proyectos. Corre{" "}
                  <code className="rounded bg-stone-100 px-1.5 py-0.5">
                    parse_rfi.py --submit
                  </code>{" "}
                  para cargar uno.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
