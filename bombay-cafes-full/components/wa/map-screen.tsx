"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Compass, Info, Minus, Plus, Search, X } from "lucide-react";
import type { AreaGroup, Spot } from "@/lib/spots";
import {
  AREA_GROUP_LABEL,
  EMPTY_FILTERS,
  areaLabel,
  TOGGLES,
  filterSpots,
  groupAreas,
  isAreaGroup,
  isMapped,
  pad,
  rankSpots,
} from "@/lib/spots";
import type { City } from "@/lib/cities";
import { type GlMapLike, mapControls } from "@/components/wa/wa-map";
import { SpotPanel } from "@/components/wa/spot-panel";

const MapboxBasemap = dynamic(
  () => import("@/components/wa/mapbox").then((m) => m.MapboxBasemap),
  { ssr: false },
);
const MapLibreBasemap = dynamic(
  () => import("@/components/wa/maplibre").then((m) => m.MapLibreBasemap),
  { ssr: false },
);

const HAS_MAPBOX = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

/**
 * The whole city experience: one full-screen tilted map with floating chrome.
 *
 * Layout is the reference's, not a map/list split — the map never gets pushed
 * into a column. Everything else is an overlay: brand card top-left, AREAS
 * top-right, the count/filter pill bottom-centre, legend bottom-left, zoom
 * bottom-right, and the dark spot panel sliding in from the right.
 *
 * State lives in the URL (?area=, ?spot=) so any view is linkable, written with
 * history.replaceState so it costs no re-render and needs no Suspense boundary.
 */
export function MapScreen({
  city,
  spots,
  initialArea,
  initialSpot,
}: {
  city: City;
  spots: Spot[];
  initialArea: string | null;
  initialSpot: string | null;
}) {
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, area: initialArea });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(initialSpot);
  const [panel, setPanel] = useState<"none" | "list" | "detail">(initialSpot ? "detail" : "none");
  const [hovered, setHovered] = useState<Spot | null>(null);
  const [areasOpen, setAreasOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [mapDead, setMapDead] = useState(false);
  const [provider, setProvider] = useState<"mapbox" | "maplibre">(HAS_MAPBOX ? "mapbox" : "maplibre");
  const mapRef = useRef<GlMapLike | null>(null);

  const filtered = useMemo(() => rankSpots(filterSpots(spots, filters)), [spots, filters]);
  const mapped = useMemo(() => filtered.filter(isMapped), [filtered]);
  const awaiting = filtered.length - mapped.length;
  const approximate = useMemo(
    () => mapped.filter((s) => s.locationAccuracy === "approximate").length,
    [mapped],
  );
  const areas = useMemo(() => groupAreas(spots), [spots]);
  const spot = useMemo(() => spots.find((s) => s.slug === selected) ?? null, [spots, selected]);

  const activeFilterCount =
    filters.toggles.length + (filters.minScore > 0 ? 1 : 0) + (filters.query.trim() ? 1 : 0);

  /* ── URL sync ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams();
    if (filters.area) p.set("area", filters.area);
    if (selected) p.set("spot", selected);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [filters.area, selected]);

  /* Deselect if the pick drops out of the filtered set. */
  useEffect(() => {
    if (selected && !filtered.some((s) => s.slug === selected)) {
      setSelected(null);
      if (panel === "detail") setPanel("list");
    }
  }, [filtered, selected, panel]);

  /* Esc closes the panel, then the filter bar. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (panel !== "none") {
        setPanel("none");
        setSelected(null);
      } else if (filtersOpen) setFiltersOpen(false);
      else if (areasOpen) setAreasOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, filtersOpen, areasOpen]);

  const handleReady = useCallback((m: GlMapLike) => {
    mapRef.current = m;
    setReady(true);
  }, []);

  const handleError = useCallback(() => {
    setProvider((p) => {
      if (p === "mapbox") {
        setReady(false);
        return "maplibre";
      }
      setMapDead(true);
      return p;
    });
  }, []);

  const pick = useCallback((s: Spot | null) => {
    setSelected(s?.slug ?? null);
    setPanel(s ? "detail" : "none");
    setHovered(null);
  }, []);

  /**
   * Where the camera starts.
   *
   * Derived from the spots themselves, not a hardcoded city centre: the mean of
   * every mapped position, which for this dataset lands between Bandra and the
   * island city rather than on some notional middle of Mumbai. wa-map then
   * fitBounds() over the same set, so the hardcoded city figures in
   * lib/cities.ts are only ever a fallback for a city with nothing positioned.
   */
  const view = useMemo(() => {
    // A single street gets a close camera; a whole group is left to
    // fitBounds, which frames Bandra or South Bombay properly rather than
    // slamming to zoom 15 on whichever cafe happened to sort first.
    if (filters.area && !isAreaGroup(filters.area)) {
      const first = mapped.find((s) => s.neighborhood === filters.area);
      if (first) return { lat: first.latitude, lng: first.longitude, zoom: 15 };
    }
    if (mapped.length > 0) {
      const lat = mapped.reduce((a, s) => a + s.latitude, 0) / mapped.length;
      const lng = mapped.reduce((a, s) => a + s.longitude, 0) / mapped.length;
      return { lat, lng, zoom: city.zoom };
    }
    return { lat: city.center.lat, lng: city.center.lng, zoom: city.zoom };
  }, [filters.area, mapped, city]);

  const fitKey = `${filters.area ?? "all"}|${filters.minScore}|${filters.toggles.join(",")}|${mapped.length}`;
  const ctl = mapControls(mapRef.current);
  const Basemap = provider === "mapbox" ? MapboxBasemap : MapLibreBasemap;
  const label = areaLabel(filters.area, city.name);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => ctl.flyTo(p.coords.latitude, p.coords.longitude, 15),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#EDEAE2]">
      {/* ── Map ───────────────────────────────────────────────────────────── */}
      {!mapDead && mapped.length > 0 && (
        <Basemap
          spots={mapped}
          selectedSlug={selected}
          onSelect={pick}
          onHover={setHovered}
          view={view}
          fitKey={fitKey}
          onReady={handleReady}
          onError={handleError}
        />
      )}

      {/*
        Fallback ground, deliberately NOT the default experience.
        Only two things reach it: a basemap that failed to load, or a city with
        nothing positioned yet. With the current dataset every live spot has a
        street-level position, so what a visitor sees is the map.
      */}
      {(mapDead || mapped.length === 0) && (
        <div className="absolute inset-0 grid place-items-center bg-[#EDEAE2] px-8 text-center">
          <div className="max-w-sm">
            <p className="font-display text-[22px] text-ink">
              {mapDead
                ? "Map unavailable"
                : filtered.length === 0
                  ? "Nothing matches that"
                  : `${filtered.length} spots, no map yet`}
            </p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-stone-dark">
              {mapDead
                ? "The basemap did not load. Browse the spots — every listing still works."
                : filtered.length === 0
                  ? "No spot matches this search and filter combination. Loosen one, or clear them and start again."
                  : "These listings have no positions yet. Every one of them still works."}
            </p>
            {filtered.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setFilters({ ...EMPTY_FILTERS, area: filters.area });
                  setSearchOpen(false);
                }}
                className="wa-btn wa-btn--solid mt-5"
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPanel("list")}
                className="wa-btn wa-btn--solid mt-5"
              >
                Browse spots
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Loading gate ──────────────────────────────────────────────────── */}
      {!ready && !mapDead && mapped.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-ink">
          <div className="flex flex-col items-center gap-4">
            <p className="font-display text-[clamp(28px,4vw,42px)] text-paper">
              bombay <em className="font-semibold not-italic">cafes</em>
            </p>
            <p className="wa-mono text-paper/45">Loading {city.name}…</p>
          </div>
        </div>
      )}

      {/* ── Brand card, top-left ──────────────────────────────────────────── */}
      <div className="pointer-events-auto absolute left-3 top-3 z-20 w-[min(92vw,360px)] sm:left-4 sm:top-4">
        <div className="wa-card p-4 sm:p-5">
          <h1 className="font-display text-[clamp(1.6rem,4.4vw,2.1rem)] leading-none tracking-tight text-ink2">
            bombay <em className="font-semibold not-italic italic">cafes</em>
          </h1>
          <p className="mt-2 text-[12.5px] leading-snug text-stone-dark">
            Find a cafe you can actually work from.
          </p>
          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setPanel("list");
              }}
              className="wa-btn wa-btn--solid flex-1"
            >
              Browse spots
            </button>
            <button type="button" onClick={locate} className="wa-btn wa-btn--glass">
              Near me
            </button>
          </div>
        </div>
      </div>

      {/* ── AREAS, top-right ──────────────────────────────────────────────── */}
      {/* Steps left of the spot panel on desktop rather than hiding under it:
          the panel is an overlay, and a control you can see but cannot click is
          worse than one that moved. */}
      <div
        className={`absolute top-4 z-20 transition-[right] duration-300 ${
          panel !== "none"
            ? "right-3 md:right-[calc(min(460px,42vw)+1.5rem)]"
            : "right-3 sm:right-5"
        }`}
      >
        <button
          type="button"
          onClick={() => setAreasOpen((v) => !v)}
          aria-expanded={areasOpen}
          className="wa-mono flex items-center gap-1.5 text-ink2 transition-opacity hover:opacity-70"
        >
          {areaLabel(filters.area, "Areas")}
          <span className="text-[13px] leading-none">{areasOpen ? "−" : "+"}</span>
        </button>

        {areasOpen && (
          <div className="wa-card absolute right-0 mt-3 w-[min(88vw,420px)] p-4">
            <div className="grid grid-cols-2 gap-x-5 gap-y-1">
              {(Object.keys(areas) as AreaGroup[]).map((group) => (
                <div key={group}>
                  {/* The heading is the group filter itself — the landing page
                      links straight to ?area=bandra, and the menu should offer
                      the same jump rather than only its streets. */}
                  <button
                    type="button"
                    onClick={() => {
                      setFilters((f) => ({ ...f, area: group }));
                      setAreasOpen(false);
                      setSelected(null);
                      setPanel("list");
                    }}
                    className={`wa-mono -mx-1.5 block w-full rounded px-1.5 pb-1.5 pt-0.5 text-left transition-colors hover:bg-black/[0.06] ${
                      filters.area === group ? "text-ink2" : "text-stone"
                    }`}
                  >
                    {AREA_GROUP_LABEL[group]}
                  </button>
                  <ul>
                    {areas[group].map((a) => (
                      <li key={a.name}>
                        <button
                          type="button"
                          onClick={() => {
                            setFilters((f) => ({ ...f, area: a.name }));
                            setAreasOpen(false);
                            setSelected(null);
                            setPanel("list");
                          }}
                          className={`-mx-1.5 flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left text-[14px] transition-colors hover:bg-black/[0.06] ${
                            filters.area === a.name ? "font-semibold text-ink2" : "text-ink2/80"
                          }`}
                        >
                          <span className="truncate">{a.name}</span>
                          <span className="shrink-0 font-mono text-[10.5px] text-stone">
                            {a.count}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {filters.area && (
              <button
                type="button"
                onClick={() => {
                  setFilters((f) => ({ ...f, area: null }));
                  setAreasOpen(false);
                }}
                className="wa-mono mt-3 border-t border-black/10 pt-3 text-accent"
              >
                Show all of {city.name}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Hover tooltip ─────────────────────────────────────────────────── */}
      {hovered && !selected && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 md:left-auto md:right-[calc(50%-120px)] md:top-24">
          <div className="wa-tip">
            <p className="text-[14px] font-medium">{hovered.name}</p>
            <p className="mt-0.5 font-mono text-[11px] text-paper/60">
              {hovered.workability != null
                ? `${hovered.workability.toFixed(1)} workability`
                : "Not yet rated"}{" "}
              · {hovered.neighborhood}
            </p>
          </div>
        </div>
      )}

      {/* ── Legend, bottom-left ───────────────────────────────────────────── */}
      <div className="absolute bottom-16 left-3 z-20 flex items-center gap-3 sm:bottom-5 sm:left-5">
        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          className="wa-round !h-7 !w-7"
          aria-label="What the scores mean"
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <span className="wa-mono hidden items-center gap-3 text-ink2/70 sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ink2" /> Curated
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full border border-ink2/60 bg-chalk" /> Community
          </span>
          {/* One quiet line, not a full-page banner. The reader can see the map
              and still knows what the pins are worth. */}
          {approximate > 0 && <span className="text-ink2/45">Approximate locations</span>}
        </span>
        {legendOpen && (
          <div className="wa-card absolute bottom-10 left-0 w-[min(88vw,320px)] p-4">
            <p className="wa-mono text-stone">How the score works</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink2/80">
              Each spot gets a workability score out of 5, weighted toward the things that end a
              work session early: whether you can plug in, whether there is somewhere to sit, and
              the wifi. Unrated signals lower our confidence, not the score — a spot is never
              punished for something nobody has published.
            </p>
            {approximate > 0 && (
              <p className="mt-3 border-t border-black/10 pt-3 text-[13px] leading-relaxed text-ink2/70">
                Pins are placed from each cafe&rsquo;s own address at street level — the right
                road, within a couple of hundred metres. Close enough to plan around, not to
                navigate by. Each listing says which street it was read from.
              </p>
            )}
            <Link href="/about" className="wa-mono mt-3 inline-block text-accent">
              More on the method →
            </Link>
          </div>
        )}
      </div>

      {/* ── Zoom, bottom-right ────────────────────────────────────────────── */}
      {ready && (
        <div
          className={`absolute bottom-16 right-3 z-20 flex flex-col items-center gap-1.5 transition-[right] duration-300 sm:bottom-5 sm:right-5 ${
            panel !== "none" ? "wa-offset-r" : ""
          }`}
        >
          <button type="button" onClick={() => ctl.zoomBy(1)} className="wa-ctrl" aria-label="Zoom in">
            <Plus className="h-4 w-4" strokeWidth={2} />
          </button>
          <button type="button" onClick={() => ctl.zoomBy(-1)} className="wa-ctrl" aria-label="Zoom out">
            <Minus className="h-4 w-4" strokeWidth={2} />
          </button>
          <button type="button" onClick={ctl.reset} className="wa-ctrl mt-0.5" aria-label="Reset view">
            <Compass className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ── Count / filter pill, bottom-centre ────────────────────────────── */}
      <div
        className={`absolute bottom-3 left-1/2 z-20 w-[calc(100vw-1.5rem)] -translate-x-1/2 transition-[left] duration-300 sm:bottom-5 sm:w-auto sm:max-w-[calc(100vw-3rem)] ${
          panel !== "none" ? "wa-offset-x md:max-w-[calc(100vw-min(460px,42vw)-4rem)]" : ""
        }`}
      >
        <div className="wa-pill flex items-center gap-1 overflow-hidden px-2 py-1.5">
          <span className="shrink-0 px-2 font-mono text-[12px] tabular-nums text-ink2/70">
            {pad(filtered.length)}
          </span>
          <button
            type="button"
            aria-pressed={!filtersOpen}
            onClick={() => setFiltersOpen(false)}
            className="wa-seg shrink-0"
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
            className="wa-seg shrink-0"
          >
            Filters{activeFilterCount > 0 ? ` ${activeFilterCount}` : ""}
          </button>

          {filtersOpen && (
            <>
              <button
                type="button"
                onClick={() => {
                  setFilters({ ...EMPTY_FILTERS, area: filters.area });
                  setSearchOpen(false);
                }}
                className="wa-round !h-7 !w-7 shrink-0 !border-black/10 !bg-black/[0.05] !shadow-none"
                aria-label="Clear filters"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>

              {/* Score threshold */}
              <div className="flex shrink-0 flex-col items-center px-2">
                <span className="font-mono text-[10px] text-ink2/60">
                  {filters.minScore === 0 ? "Any score" : `${filters.minScore.toFixed(1)}+`}
                </span>
                <input
                  type="range"
                  min={0}
                  max={4.5}
                  step={0.5}
                  value={filters.minScore}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minScore: Number(e.target.value) }))
                  }
                  className="wa-range mt-1 w-24"
                  aria-label="Minimum workability score"
                />
              </div>

              {/* Feature toggles — horizontally scrollable, as the reference does */}
              <div className="wa-rail flex min-w-0 items-center gap-3 px-1">
                {TOGGLES.map((t) => {
                  const on = filters.toggles.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          toggles: on ? f.toggles.filter((x) => x !== t) : [...f.toggles, t],
                        }))
                      }
                      className="wa-tog"
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div className="flex shrink-0 items-center">
                {searchOpen ? (
                  <label className="flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5">
                    <Search className="h-3.5 w-3.5 shrink-0 text-ink2/50" strokeWidth={2} />
                    <input
                      autoFocus
                      value={filters.query}
                      onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                      placeholder="Search spots…"
                      aria-label="Search spots"
                      className="h-7 w-28 bg-transparent text-[13px] text-ink2 placeholder:text-ink2/40 focus:outline-none sm:w-36"
                    />
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="wa-round !h-7 !w-7 !border-black/10 !bg-black/[0.05] !shadow-none"
                    aria-label="Search spots"
                  >
                    <Search className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {filtersOpen && awaiting > 0 && (
          <p className="mt-2 text-center font-mono text-[10.5px] text-ink2/55">
            {awaiting} of {filtered.length} not on the map yet
          </p>
        )}
      </div>

      {/* ── Spot panel ────────────────────────────────────────────────────── */}
      {panel !== "none" && (
        <SpotPanel
          mode={panel === "detail" && spot ? "detail" : "list"}
          spots={filtered}
          spot={spot}
          areaLabel={label}
          onClose={() => {
            setPanel("none");
            setSelected(null);
          }}
          onBack={() => {
            setPanel("list");
            setSelected(null);
          }}
          onPick={(s) => {
            setSelected(s.slug);
            setPanel("detail");
          }}
        />
      )}

      {/* Attribution / credit line, matching the reference's bottom-left byline. */}
      <p className="pointer-events-none absolute bottom-1 left-1/2 z-10 -translate-x-1/2 font-mono text-[9px] text-ink2/35 sm:left-5 sm:translate-x-0">
        © {new Date().getFullYear()} Bombay Cafes
      </p>
    </div>
  );
}
