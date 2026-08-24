"use client";

import { useEffect, useRef } from "react";
import type { MappedSpot } from "@/lib/spots";

/**
 * The map.
 *
 * Two deliberate departures from a generic Mapbox setup, both taken from the
 * reference:
 *
 * 1. TILTED. A fixed pitch and bearing, with 3D building extrusion at street
 *    zoom. The map is the interface here, not a locator inset, and the oblique
 *    view is most of why it reads as a place rather than a diagram.
 * 2. DOM TEARDROP MARKERS carrying the workability score, not GL circles. The
 *    number has to be legible at rest, and marker fill distinguishes the
 *    curated layer from the community-scored one. No clustering — overlapping
 *    pins in a dense lane are honest, and clustering would hide the numbers
 *    that are the entire point.
 *
 * mapbox-gl and maplibre-gl are API-compatible across everything used here, so
 * one implementation drives both basemaps.
 */

export const WA_PITCH = 55;
export const WA_BEARING = -17.6;

interface GlMarker {
  setLngLat: (ll: [number, number]) => GlMarker;
  addTo: (m: GlMapLike) => GlMarker;
  remove: () => void;
  getElement: () => HTMLElement;
}
export interface GlMapLike {
  on: (...a: unknown[]) => void;
  once: (...a: unknown[]) => void;
  remove: () => void;
  resize: () => void;
  easeTo: (o: Record<string, unknown>) => void;
  flyTo: (o: Record<string, unknown>) => void;
  fitBounds: (b: [[number, number], [number, number]], o?: Record<string, unknown>) => void;
  getZoom: () => number;
  getStyle: () => { layers?: { id: string; type: string }[] };
  addLayer: (spec: unknown, before?: string) => void;
  getLayer: (id: string) => unknown;
  setPaintProperty: (l: string, p: string, v: unknown) => void;
  isStyleLoaded: () => boolean;
}
export interface GlLib {
  Map: new (o: Record<string, unknown>) => GlMapLike;
  Marker: new (o?: Record<string, unknown>) => GlMarker;
}

export interface WaMapProps {
  spots: MappedSpot[];
  selectedSlug: string | null;
  onSelect: (spot: MappedSpot | null) => void;
  onHover?: (spot: MappedSpot | null) => void;
  /** Camera target. Ignored while a spot is selected. */
  view: { lat: number; lng: number; zoom: number };
  /** Changes when the filtered set changes, triggering a fit-to-results. */
  fitKey: string;
  onReady?: (map: GlMapLike) => void;
  onError?: () => void;
  /** Injected by the wrapper. */
  gl: GlLib;
  style: string;
  accessToken?: string;
  /** True for Mapbox Standard, which owns its own 3D buildings. */
  nativeBuildings?: boolean;
}

export function WaMapImpl({
  spots,
  selectedSlug,
  onSelect,
  onHover,
  view,
  fitKey,
  onReady,
  onError,
  gl,
  style,
  accessToken,
  nativeBuildings = false,
}: WaMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GlMapLike | null>(null);
  const markersRef = useRef<Map<string, GlMarker>>(new Map());
  const spotsRef = useRef(spots);
  const selRef = useRef(selectedSlug);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const readyRef = useRef(false);
  spotsRef.current = spots;
  selRef.current = selectedSlug;
  onSelectRef.current = onSelect;
  onHoverRef.current = onHover;

  /* ── markers ───────────────────────────────────────────────────────────── */
  const renderMarkers = (map: GlMapLike) => {
    const seen = new Set<string>();

    for (const spot of spotsRef.current) {
      seen.add(spot.slug);
      if (markersRef.current.has(spot.slug)) continue;

      const wrap = document.createElement("div");
      wrap.className = "wa-pin-wrap";

      const pin = document.createElement("button");
      pin.type = "button";
      pin.className =
        "wa-pin" +
        (spot.dataLayer === "ai-analysis" ? " wa-pin--light" : "") +
        (spot.slug === selRef.current ? " is-selected" : "");
      pin.setAttribute(
        "aria-label",
        `${spot.name}, ${spot.neighborhood}${
          spot.workability != null ? `, ${spot.workability} out of 5 for working` : ""
        }`,
      );

      const val = document.createElement("span");
      val.className = "wa-pin__v";
      // An unscored spot gets an empty span; CSS draws a dot so the pin keeps
      // its silhouette rather than becoming a blank blob.
      val.textContent = spot.workability != null ? spot.workability.toFixed(1) : "";
      pin.appendChild(val);

      pin.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(spot);
      });
      pin.addEventListener("mouseenter", () => onHoverRef.current?.(spot));
      pin.addEventListener("mouseleave", () => onHoverRef.current?.(null));
      pin.addEventListener("focus", () => onHoverRef.current?.(spot));
      pin.addEventListener("blur", () => onHoverRef.current?.(null));

      wrap.appendChild(pin);
      const marker = new gl.Marker({ element: wrap, anchor: "center" })
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(map);
      markersRef.current.set(spot.slug, marker);
    }

    // Drop markers for spots that filtered out.
    for (const [slug, marker] of markersRef.current) {
      if (!seen.has(slug)) {
        marker.remove();
        markersRef.current.delete(slug);
      }
    }
  };

  /* ── init ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const box = boxRef.current;
    if (!box || mapRef.current) return;

    if (accessToken) (gl as unknown as { accessToken?: string }).accessToken = accessToken;

    let map: GlMapLike;
    try {
      map = new gl.Map({
        container: box,
        style,
        center: [view.lng, view.lat],
        zoom: view.zoom,
        pitch: WA_PITCH,
        bearing: WA_BEARING,
        maxPitch: 72,
        antialias: true,
        attributionControl: { compact: true },
      });
    } catch {
      onError?.();
      return;
    }
    mapRef.current = map;

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(box);

    let styleUp = false;
    let readyFired = false;
    const fireReady = () => {
      if (readyFired) return;
      readyFired = true;
      readyRef.current = true;
      onReady?.(map);
    };
    map.once("idle", fireReady);
    // Never hold the UI behind a slow tile server.
    const timer = setTimeout(fireReady, 6500);

    map.on("error", (e: unknown) => {
      const err = (e as { error?: { message?: string; status?: number } })?.error;
      const msg = err?.message ?? "";
      const auth = /token|unauthorized|forbidden/i.test(msg) || err?.status === 401 || err?.status === 403;
      const net = /failed to fetch|networkerror|load failed|could not load/i.test(msg);
      // Once the style is up, a dropped tile or glyph is cosmetic. Only a
      // failure before that means this basemap is unusable.
      if (auth || (!styleUp && net)) onError?.();
      else if (!styleUp) console.error("[map]", err ?? e);
    });

    map.on("load", () => {
      styleUp = true;

      if (!nativeBuildings) {
        // Warm the basemap toward the reference's paper-ish palette.
        const paint = (layer: string, prop: string, val: string) => {
          try {
            if (map.getLayer(layer)) map.setPaintProperty(layer, prop, val);
          } catch {
            /* layer absent in this style version */
          }
        };
        paint("background", "background-color", "#EDEAE2");
        paint("water", "fill-color", "#AFC7DA");
        paint("landcover_wood", "fill-color", "#D6E1C7");
        paint("park", "fill-color", "#D6E1C7");
        paint("landuse_residential", "fill-color", "#E9E5DC");
        paint("building", "fill-color", "#E2DED4");

        // Extruded buildings under the first label layer, so labels stay legible.
        const firstSymbol = map.getStyle().layers?.find((l) => l.type === "symbol")?.id;
        try {
          map.addLayer(
            {
              id: "wa-buildings",
              type: "fill-extrusion",
              source: "openmaptiles",
              "source-layer": "building",
              minzoom: 13.5,
              filter: ["match", ["geometry-type"], ["MultiPolygon", "Polygon"], true, false],
              paint: {
                "fill-extrusion-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "render_height"],
                  0,
                  "#E7E3D9",
                  40,
                  "#DAD5CA",
                  120,
                  "#CAC4B8",
                ],
                "fill-extrusion-height": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13.5,
                  0,
                  15.5,
                  ["get", "render_height"],
                ],
                "fill-extrusion-base": [
                  "case",
                  ["has", "render_min_height"],
                  ["get", "render_min_height"],
                  0,
                ],
                "fill-extrusion-opacity": 0.94,
              },
            },
            firstSymbol,
          );
        } catch {
          /* extrusion unsupported — the flat map still renders */
        }
      }

      renderMarkers(map);
    });

    // DOM markers do not need the style, so add them eagerly too — this is
    // what stops pins being lost to load-event timing races.
    renderMarkers(map);
    map.on("click", () => onSelectRef.current(null));

    // Capture the marker map now: by cleanup time the ref may point elsewhere.
    const markers = markersRef.current;
    return () => {
      clearTimeout(timer);
      ro.disconnect();
      markers.forEach((m) => m.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // Mount-only; every prop is handled by its own effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── spots changed ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (map) renderMarkers(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots]);

  /* ── selection: toggle the class, fly in close ─────────────────────────── */
  useEffect(() => {
    for (const [slug, marker] of markersRef.current) {
      const el = marker.getElement();
      const on = slug === selectedSlug;
      el.querySelector(".wa-pin")?.classList.toggle("is-selected", on);
      // The library gives every marker its own stacking context, so a z-index
      // on the inner pin cannot lift it above a neighbouring marker. At city
      // zoom the Bandra cluster overlaps heavily, and a selected pin buried
      // under three others is indistinguishable from nothing happening — so
      // raise the wrapper the library actually positions.
      el.style.zIndex = on ? "4" : "";
    }
    const map = mapRef.current;
    if (!map || !selectedSlug) return;
    const spot = spots.find((s) => s.slug === selectedSlug);
    if (!spot) return;
    map.flyTo({
      center: [spot.longitude, spot.latitude],
      zoom: 16.4,
      pitch: 60,
      bearing: WA_BEARING,
      // Nudge left so the pin is not hidden behind the right-hand panel.
      padding: { right: typeof window !== "undefined" && window.innerWidth >= 900 ? 460 : 0 },
      duration: 1900,
      curve: 1.6,
      essential: true,
    });
  }, [selectedSlug, spots]);

  /* ── fit to the filtered set ───────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedSlug || spots.length === 0) return;

    const apply = () => {
      if (spots.length === 1) {
        map.flyTo({
          center: [spots[0].longitude, spots[0].latitude],
          zoom: 15.4,
          pitch: WA_PITCH,
          bearing: WA_BEARING,
          duration: 1300,
          essential: true,
        });
        return;
      }
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;
      for (const s of spots) {
        minLng = Math.min(minLng, s.longitude);
        maxLng = Math.max(maxLng, s.longitude);
        minLat = Math.min(minLat, s.latitude);
        maxLat = Math.max(maxLat, s.latitude);
      }
      // Several spots on one lane collapse the bounds to a point; pad so
      // fitBounds does not slam to max zoom.
      if (maxLng - minLng < 0.004) {
        minLng -= 0.002;
        maxLng += 0.002;
      }
      if (maxLat - minLat < 0.004) {
        minLat -= 0.002;
        maxLat += 0.002;
      }
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 90, maxZoom: 15, pitch: WA_PITCH, bearing: WA_BEARING, duration: 1200 },
      );
    };
    if (readyRef.current) apply();
    else map.once("idle", apply);
    // Keyed on fitKey so panning by hand is not undone on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  /* ── external camera moves (area switch) ───────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedSlug) return;
    map.flyTo({
      center: [view.lng, view.lat],
      zoom: view.zoom,
      pitch: WA_PITCH,
      bearing: WA_BEARING,
      duration: 1500,
      curve: 1.5,
      essential: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.lat, view.lng, view.zoom]);

  /**
   * h-full w-full, not just inset-0.
   *
   * maplibre-gl.css / mapbox-gl.css add `.maplibregl-map { position: relative }`
   * to this element once the map mounts, and that stylesheet is injected after
   * Tailwind's utilities — so `absolute` loses and `inset-0` stops resolving,
   * leaving the container 0px tall and the canvas at its 300px default. Sizing
   * it explicitly survives the override.
   */
  return (
    <div
      ref={boxRef}
      className="absolute inset-0 h-full w-full"
      aria-label="Map of cafes in Mumbai"
    />
  );
}

/** Imperative handle the shell uses for the zoom and reset controls. */
export function mapControls(map: GlMapLike | null) {
  return {
    zoomBy: (d: number) => map?.easeTo({ zoom: (map.getZoom?.() ?? 12) + d, duration: 280 }),
    reset: () => map?.easeTo({ pitch: WA_PITCH, bearing: WA_BEARING, duration: 600 }),
    flyTo: (lat: number, lng: number, zoom = 15) =>
      map?.flyTo({
        center: [lng, lat],
        zoom,
        pitch: WA_PITCH,
        bearing: WA_BEARING,
        duration: 1800,
        essential: true,
      }),
  };
}
