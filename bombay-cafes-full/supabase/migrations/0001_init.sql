-- ─────────────────────────────────────────────────────────────────────────────
-- Bombay Cafes — initial schema
--
-- Three tables, one job each:
--   spots             the cafes, with the four source signals and the
--                     qualitative layer the UI actually prints
--   spot_feedback     anonymous reports on how a spot was for working. This is
--                     the mechanism that lets scores improve; it never mutates
--                     a published score directly
--   spot_submissions  new cafes people suggest, never auto-published
--
-- Design notes:
--  · Deliberately NOT normalised. Every read is "give me all active spots" and
--    every write is a whole row, so one wide table is faster and simpler.
--  · Coordinates are NULLABLE and arrive last. The product is fully usable
--    without them — see scripts/geocode-cafes.ts.
--  · The workability score is NOT stored. It is computed from lib/spots.ts so
--    the weighting can be retuned without a migration or a backfill.
--  · Scores are 1-5 and nullable; the qualitative `*_label` columns are what
--    the panel renders. Both exist because the score drives ranking and the
--    label drives comprehension — "Scarce" tells you to bring a charged
--    laptop, "2/5" does not.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

create type area_group as enum ('bandra', 'south-bombay');

-- Which layer a listing came from. Drives pin fill and the map legend.
create type data_layer as enum ('curated', 'ai-analysis');

create type verification_status as enum ('unverified', 'editorial', 'verified', 'needs_review');

-- How much to trust a coordinate pair. 'approximate' is street/block level,
-- read off the cafe's own address; 'verified' means a geocoder resolved the
-- full address. Stored rather than inferred, so the UI never has to guess.
create type location_accuracy as enum ('approximate', 'verified');

create type review_status as enum ('pending', 'approved', 'rejected');

create table spots (
  id                  uuid primary key default uuid_generate_v4(),
  slug                text unique not null,
  name                text not null,

  area                area_group not null,
  neighborhood        text not null,
  address             text not null default '',
  -- NULL until positioned. A normal, expected state: the spot shows up
  -- everywhere except the map.
  latitude            double precision,
  longitude           double precision,
  -- Never NULL when a position exists — see spots_coords_need_accuracy. An
  -- unlabelled coordinate is the failure this column prevents: it would read
  -- as surveyed when it was read off a street name.
  location_accuracy   location_accuracy,
  -- What the approximate pin was anchored to, e.g. 'Waroda Road, Ranwar'.
  location_anchor     text,

  website             text,
  instagram           text,
  google_maps_url     text,
  opening_hours       text,

  editorial_note      text not null default '',
  why_we_recommend    text not null default '',

  -- Source signals, 1-5, null = not rated. Never default these to a number.
  -- quiet is stored as QUIETNESS (5 = calmest) so every signal points the
  -- same way and the weighted mean needs no inversion.
  wifi_score          smallint check (wifi_score between 1 and 5),
  charging_score      smallint check (charging_score between 1 and 5),
  quiet_score         smallint check (quiet_score between 1 and 5),
  seating_score       smallint check (seating_score between 1 and 5),
  work_score          smallint check (work_score between 1 and 5),

  -- The sourced sentence behind each factual signal. NULL = no source found.
  wifi_evidence       text,
  charging_evidence   text,
  quiet_evidence      text,
  seating_evidence    text,
  work_evidence       text,

  -- The qualitative layer the panel prints.
  wifi_label          text,
  charging_label      text,
  charging_note       text,
  noise_label         text,
  seating_label       text,
  seating_styles      text,
  stay_label          text,
  peak_crowd          text,
  avg_food_cost       text,

  -- Derived filter toggles (Outlets, Fast WiFi, Roomy, No time limit).
  toggles             text[] not null default '{}',
  tags                text[] not null default '{}',

  data_layer          data_layer not null default 'curated',
  verification_status verification_status not null default 'editorial',
  sources             text[] not null default '{}',
  last_verified_at    date,
  data_note           text,

  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- A spot flagged for review must say what is in doubt: the panel renders
-- data_note to the reader, and an unexplained flag is worse than no flag.
alter table spots
  add constraint spots_flagged_needs_note
  check (verification_status <> 'needs_review' or data_note is not null);

-- Latitude and longitude travel together. A half-set position is a bug, and the
-- geocoding script relies on IS NULL on both to find its work.
alter table spots
  add constraint spots_coords_paired
  check ((latitude is null) = (longitude is null));

-- A factual signal may only carry a score when the evidence that supports it is
-- stored alongside. work_score is exempt: it is our editorial read, which is the
-- product, not a measurement.
alter table spots
  add constraint spots_factual_scores_need_evidence
  check (
    (wifi_score     is null or wifi_evidence     is not null) and
    (charging_score is null or charging_evidence is not null) and
    (quiet_score    is null or quiet_evidence    is not null) and
    (seating_score  is null or seating_evidence  is not null)
  );

-- A coordinate must declare how good it is. Without this, an approximate pin
-- and a surveyed one are indistinguishable in the database, and the honest
-- label in the UI becomes a matter of who remembered to set it.
alter table spots
  add constraint spots_coords_need_accuracy
  check ((latitude is null) = (location_accuracy is null));

create index spots_active_idx       on spots (is_active);
create index spots_area_idx         on spots (area) where is_active;
create index spots_neighborhood_idx on spots (neighborhood) where is_active;
-- Drives scripts/geocode-cafes.ts: everything not yet surveyed — both the
-- unpositioned rows and the approximate ones waiting to be upgraded.
create index spots_unverified_pos_idx on spots (slug)
  where location_accuracy is distinct from 'verified';

-- ── Feedback ─────────────────────────────────────────────────────────────────
-- Anonymous by design. Requiring an account before someone can say "the wifi
-- was bad" would kill the mechanism that keeps the scores honest.
create table spot_feedback (
  id         uuid primary key default uuid_generate_v4(),
  spot_slug  text not null references spots (slug) on delete cascade,
  wifi       text check (wifi in ('Poor', 'Okay', 'Good', 'Great')),
  charging   text check (charging in ('None', 'Few', 'Good', 'Plenty')),
  noise      text check (noise in ('Very quiet', 'Quiet', 'Moderate', 'Loud')),
  status     review_status not null default 'pending',
  created_at timestamptz not null default now(),
  -- An empty report is not data.
  constraint spot_feedback_not_empty
    check (wifi is not null or charging is not null or noise is not null)
);

create index spot_feedback_slug_idx   on spot_feedback (spot_slug, created_at desc);
create index spot_feedback_status_idx on spot_feedback (status, created_at desc);

-- ── Submissions ──────────────────────────────────────────────────────────────
create table spot_submissions (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  location        text not null,
  google_maps_url text,
  why             text not null,
  submitter_name  text not null,
  submitter_email text not null,
  status          review_status not null default 'pending',
  reviewer_note   text,
  created_at      timestamptz not null default now()
);

create index spot_submissions_status_idx on spot_submissions (status, created_at desc);

-- ── updated_at ───────────────────────────────────────────────────────────────
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger spots_touch_updated_at
  before update on spots
  for each row execute function touch_updated_at();

-- ── Row-level security ───────────────────────────────────────────────────────
-- Anonymous visitors read active spots, and insert feedback and submissions.
-- They can read neither table back: feedback is unmoderated text and
-- submissions carry an email address. Every other write goes through the
-- service role, which bypasses RLS and only ever runs server-side.
alter table spots enable row level security;
alter table spot_feedback enable row level security;
alter table spot_submissions enable row level security;

create policy "public reads active spots"
  on spots for select
  using (is_active = true);

create policy "anyone may leave feedback"
  on spot_feedback for insert
  with check (true);

create policy "anyone may submit a spot"
  on spot_submissions for insert
  with check (true);
