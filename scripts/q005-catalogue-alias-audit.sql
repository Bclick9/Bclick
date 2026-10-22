-- Read-only Q-005 legacy-alias audit for local Docker PostgreSQL.
-- This reports candidate evidence only; it does not update aliases or infer provider synonyms.
-- Run from the repository root:
-- Get-Content .\scripts\q005-catalogue-alias-audit.sql | docker compose --env-file .env -f infra/compose/compose.yaml exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'

WITH available_standard AS (
  SELECT DISTINCT
    g.id AS game_id,
    g.game_slug,
    g.title,
    p.name AS catalogue_provider,
    s.source_provider_name,
    s.source_mode,
    s.external_game_id
  FROM public.casino_games g
  JOIN public.casino_providers p ON p.id = g.provider_id
  JOIN public.casino_game_sources s ON s.game_id = g.id AND s.source_code = 'bigbang'
  WHERE g.available = true
    AND s.available = true
    AND s.source_mode = 'standard'
),
per_alias AS (
  SELECT
    a.alias_slug,
    a.resolution_status AS stored_resolution_status,
    a.legacy_title,
    a.legacy_provider,
    stats.exact_title_candidates,
    stats.exact_identity_candidates,
    stats.exact_title_provider_mismatch,
    stats.related_title_candidates,
    CASE
      WHEN a.resolution_status = 'resolved' THEN 'already_resolved'
      WHEN stats.exact_identity_candidates = 1 THEN 'exact_identity_candidate_but_unresolved'
      WHEN stats.exact_identity_candidates > 1 THEN 'multiple_exact_identity_candidates'
      WHEN stats.exact_title_candidates > 0 THEN 'title_found_provider_mismatch'
      WHEN stats.related_title_candidates > 0 THEN 'related_titles_only_manual_review'
      ELSE 'not_found_in_current_standard_catalogue'
    END AS evidence_class,
    stats.candidates
  FROM public.casino_game_legacy_slug_aliases a
  LEFT JOIN LATERAL (
    SELECT
      count(DISTINCT c.game_id) FILTER (
        WHERE lower(btrim(c.title)) = lower(btrim(a.legacy_title))
      ) AS exact_title_candidates,
      count(DISTINCT c.game_id) FILTER (
        WHERE lower(btrim(c.title)) = lower(btrim(a.legacy_title))
          AND lower(btrim(c.catalogue_provider)) = lower(btrim(a.legacy_provider))
      ) AS exact_identity_candidates,
      count(DISTINCT c.game_id) FILTER (
        WHERE lower(btrim(c.title)) = lower(btrim(a.legacy_title))
          AND lower(btrim(c.catalogue_provider)) <> lower(btrim(a.legacy_provider))
      ) AS exact_title_provider_mismatch,
      count(DISTINCT c.game_id) FILTER (
        WHERE strpos(lower(c.title), lower(a.legacy_title)) > 0
           OR strpos(lower(a.legacy_title), lower(c.title)) > 0
      ) AS related_title_candidates,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'gameId', c.game_id,
            'canonicalSlug', c.game_slug,
            'title', c.title,
            'catalogueProvider', c.catalogue_provider,
            'sourceProviderName', c.source_provider_name,
            'sourceMode', c.source_mode,
            'externalGameId', c.external_game_id,
            'titleExact', lower(btrim(c.title)) = lower(btrim(a.legacy_title)),
            'providerExact', lower(btrim(c.catalogue_provider)) = lower(btrim(a.legacy_provider))
          )
          ORDER BY c.external_game_id
        ) FILTER (WHERE c.game_id IS NOT NULL),
        '[]'::jsonb
      ) AS candidates
    FROM available_standard c
    WHERE lower(btrim(c.title)) = lower(btrim(a.legacy_title))
       OR strpos(lower(c.title), lower(a.legacy_title)) > 0
       OR strpos(lower(a.legacy_title), lower(c.title)) > 0
  ) stats ON true
)
SELECT
  alias_slug,
  stored_resolution_status,
  evidence_class,
  legacy_title,
  legacy_provider,
  exact_title_candidates,
  exact_identity_candidates,
  exact_title_provider_mismatch,
  related_title_candidates,
  candidates
FROM per_alias
ORDER BY
  CASE evidence_class
    WHEN 'exact_identity_candidate_but_unresolved' THEN 1
    WHEN 'title_found_provider_mismatch' THEN 2
    WHEN 'multiple_exact_identity_candidates' THEN 3
    WHEN 'related_titles_only_manual_review' THEN 4
    WHEN 'not_found_in_current_standard_catalogue' THEN 5
    ELSE 6
  END,
  alias_slug;
