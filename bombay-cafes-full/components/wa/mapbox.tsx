"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { WaMapImpl, type GlLib, type WaMapProps } from "@/components/wa/wa-map";

type Props = Omit<WaMapProps, "gl" | "style" | "accessToken" | "nativeBuildings">;

/**
 * Mapbox basemap. Uses Mapbox Standard, which brings its own 3D buildings and
 * light presets — the closest match to the reference's oblique view.
 */
export function MapboxBasemap(props: Props) {
  return (
    <WaMapImpl
      {...props}
      gl={mapboxgl as unknown as GlLib}
      style="mapbox://styles/mapbox/standard"
      accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      nativeBuildings
    />
  );
}
