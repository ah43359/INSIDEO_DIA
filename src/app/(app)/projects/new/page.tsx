import Link from "next/link";
import { importRfi } from "./actions";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewProjectPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link
          href="/projects"
          className="text-sm text-stone-500 hover:text-stone-900"
        >
          ← Proyectos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Importar proyecto
        </h1>
        <p className="text-sm text-stone-600">
          Sube el RFI .xlsx que el cliente devolvió + el archivo de componentes
          georreferenciados. El sistema valida, normaliza y guarda todo en la
          base de datos.
        </p>
      </header>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-700">
          1. Plantilla en blanco (opcional)
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Si aún no has enviado el RFI al cliente, descarga la plantilla y
          envíala. El cliente la llena y te la devuelve.
        </p>
        <a
          href="/rfi_intake_template.xlsx"
          download
          className="mt-3 inline-flex items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
        >
          Descargar plantilla .xlsx
        </a>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-700">
          2. Subir RFI lleno + componentes
        </h2>

        <form action={importRfi} className="mt-4 space-y-5" encType="multipart/form-data">
          <div className="space-y-2">
            <label
              htmlFor="rfi"
              className="block text-sm font-medium text-stone-700"
            >
              RFI .xlsx
              <span className="ml-1 text-red-600">*</span>
            </label>
            <input
              id="rfi"
              name="rfi"
              type="file"
              accept=".xlsx"
              required
              className="block w-full text-sm text-stone-700 file:mr-4 file:rounded-md file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-stone-800"
            />
            <p className="text-xs text-stone-500">
              Generado a partir de la plantilla. Cliente, proyecto, inventario y
              demás secciones llenas.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="components"
              className="block text-sm font-medium text-stone-700"
            >
              Componentes georreferenciados
              <span className="ml-1 text-red-600">*</span>
            </label>
            <input
              id="components"
              name="components"
              type="file"
              accept=".csv,.geojson,.json,.kml,.kmz,.zip"
              required
              className="block w-full text-sm text-stone-700 file:mr-4 file:rounded-md file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-stone-800"
            />
            <ul className="space-y-1 text-xs text-stone-500">
              <li>
                <strong>.kmz</strong> / <strong>.kml</strong> — Google Earth.
                El nombre del Placemark va a <code>nombre</code>; el tipo se
                deduce del nombre (PF-* → plataforma, ACC-* → acceso, etc.) o
                del campo ExtendedData.tipo si existe.
              </li>
              <li>
                <strong>.zip</strong> (shapefile) — debe contener al menos
                <code> .shp + .shx + .dbf</code> (y <code>.prj</code> si la
                proyección no es 4326). Atributos esperados:
                <code> nombre, tipo, area_m2, longitud_tunel_m</code>.
              </li>
              <li>
                <strong>.csv</strong> — columnas:{" "}
                <code>nombre, tipo, este, norte, area_m2, longitud_tunel_m</code>.
                Coordenadas en UTM (zona del proyecto), reproyectadas a 4326.
              </li>
              <li>
                <strong>.geojson</strong> — FeatureCollection en EPSG:4326.
              </li>
            </ul>
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-700"
          >
            Importar y guardar
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-600">
        <p className="font-medium text-stone-700">Llenar en línea (próximo)</p>
        <p className="mt-1">
          Pronto podrás llenar el RFI directamente en la web sin .xlsx. Por
          ahora, usa la plantilla.
        </p>
      </section>
    </div>
  );
}
