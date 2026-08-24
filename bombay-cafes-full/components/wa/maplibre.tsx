"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { WaMapImpl, type GlLib, type WaMapProps } from "@/components/wa/wa-map";

type Props = Omit<WaMapProps, "gl" | "style" | "accessToken" | "nativeBuildings">;

/**
 * Keyless fallback: MapLibre GL over OpenFreeMap Positron, warmed toward the
 * reference palette and given its own extruded-building layer in wa-map.
 *
 * This is why the product never shows a dead grey box. Without a Mapbox token
 * you still get a real, tilted, pannable 3D map.
 */
export function MapLibreBasemap(props: Props) {
  return (
    <WaMapImpl
      {...props}
      gl={maplibregl as unknown as GlLib}
      style="https://tiles.openfreemap.org/styles/positron"
    />
  );
}
