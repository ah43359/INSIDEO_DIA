declare module "shpjs" {
  type ShpResult =
    | GeoJSON.FeatureCollection
    | GeoJSON.FeatureCollection[];
  /** Default export accepts an ArrayBuffer holding a zipped shapefile. */
  const shp: (buf: ArrayBuffer) => Promise<ShpResult>;
  export default shp;
}
