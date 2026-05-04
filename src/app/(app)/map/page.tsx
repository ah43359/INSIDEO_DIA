import { createClient } from "@/lib/supabase/server";
import PeruMap from "@/components/PeruMap";

export default async function MapPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("all_project_centroids");

  const geojson = (data ?? {
    type: "FeatureCollection",
    features: [],
  }) as GeoJSON.FeatureCollection;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mapa Perú</h1>
        <p className="text-sm text-stone-600">
          Centroide de cada proyecto cargado. Click para ver detalle.
        </p>
      </header>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          Error consultando proyectos: {error.message}
        </div>
      ) : null}

      <PeruMap geojson={geojson} />

      <p className="text-xs text-stone-500">
        {geojson.features.length} proyecto
        {geojson.features.length === 1 ? "" : "s"} con geometría cargada.
      </p>
    </div>
  );
}
