"use client";

import { useState, type ComponentProps } from "react";
import ProjectMap from "@/components/ProjectMap";
import AreaEfectivaPanel from "@/components/AreaEfectivaPanel";
import type { AreaEfectivaRow } from "@/lib/types";

type MapProps = ComponentProps<typeof ProjectMap>;

interface Props
  extends Omit<
    MapProps,
    | "editingAreaEfectiva"
    | "onAreaEfectivaGeomChange"
    | "areaEfectivaEditorResetKey"
  > {
  projectId: string;
  /** Persisted row for the project's área efectiva (or null if none yet). */
  areaEfectivaRow: AreaEfectivaRow | null;
}

/**
 * Client wrapper that owns the área-efectiva editor state and renders
 * the map + the edit/regenerate/download panel together. This is the
 * piece imported from the server-rendered project page.
 */
export default function ProjectMapWithEditor({
  projectId,
  areaEfectivaRow,
  ...mapProps
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editingGeom, setEditingGeom] = useState<
    GeoJSON.Polygon | GeoJSON.MultiPolygon | null
  >(null);
  const [resetKey, setResetKey] = useState(0);

  return (
    <div className="space-y-3">
      <ProjectMap
        {...mapProps}
        editingAreaEfectiva={editing}
        onAreaEfectivaGeomChange={setEditingGeom}
        areaEfectivaEditorResetKey={resetKey}
      />
      <AreaEfectivaPanel
        projectId={projectId}
        areaEfectiva={areaEfectivaRow}
        editing={editing}
        onEditToggle={(next) => {
          setEditing(next);
          if (!next) setEditingGeom(null);
        }}
        editingGeom={editingGeom}
        onResetEditor={() => setResetKey((k) => k + 1)}
      />
    </div>
  );
}
