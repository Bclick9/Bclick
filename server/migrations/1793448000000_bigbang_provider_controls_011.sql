-- Up Migration
-- Migration 011: persist Bclick-owned BigBang tier and availability controls.
-- Current executable support remains Sandbox Standard only. No Premium client,
-- live key, real-play endpoint, wallet callback, or money movement is introduced.
DO $m011_preconditions$
BEGIN
  IF to_regclass('public.casino_providers') IS NULL
     OR to_regclass('public.casino_games') IS NULL
     OR to_regclass('public.casino_game_sources') IS NULL
     OR to_regclass('public.admin_users') IS NULL
     OR to_regclass('public.audit_events') IS NULL
     OR to_regclass('public.roles') IS NULL
     OR to_regclass('public.permissions') IS NULL
     OR to_regclass('public.role_permissions') IS NULL THEN
    RAISE EXCEPTION 'Migration 011 stopped: catalogue, admin RBAC and audit tables are required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE code='project-admin') THEN
    RAISE EXCEPTION 'Migration 011 stopped: project-admin role is missing';
  END IF;
  IF EXISTS (SELECT 1 FROM public.permissions WHERE code='casino.provider-settings.manage') THEN
    RAISE EXCEPTION 'Migration 011 stopped: provider settings permission already exists';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='casino_providers' AND column_name='bclick_enabled')
     OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='casino_games' AND column_name='bclick_enabled') THEN
    RAISE EXCEPTION 'Migration 011 stopped: provider/game control columns already exist';
  END IF;
  IF to_regclass('public.casino_integration_settings') IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 011 stopped: integration settings table already exists';
  END IF;
END
$m011_preconditions$;

ALTER TABLE public.casino_providers
  ADD COLUMN bclick_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN availability_updated_by uuid REFERENCES public.admin_users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD COLUMN availability_updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.casino_games
  ADD COLUMN bclick_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN availability_updated_by uuid REFERENCES public.admin_users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD COLUMN availability_updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE public.casino_integration_settings (
  source_code text PRIMARY KEY CHECK (source_code='bigbang'),
  selected_mode text NOT NULL DEFAULT 'standard' CHECK (selected_mode='standard'),
  updated_by uuid REFERENCES public.admin_users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.casino_integration_settings(source_code,selected_mode)
VALUES ('bigbang','standard');

INSERT INTO public.permissions(code,description)
VALUES ('casino.provider-settings.manage','Manage Bclick-owned casino provider and game availability settings');

-- Grant the new privilege only to the existing project-admin role. Other roles
-- must receive it through a separately reviewed role assignment.
INSERT INTO public.role_permissions(role_id,permission_id)
SELECT r.id,p.id
  FROM public.roles r
  CROSS JOIN public.permissions p
 WHERE r.code='project-admin'
   AND p.code='casino.provider-settings.manage';

-- Down Migration
-- Provider/game flags and audit history affect operator-controlled availability.
-- Do not discard that state through an automatic rollback.
DO $m011_no_unsafe_rollback$
BEGIN
  RAISE EXCEPTION 'Migration 011 rollback refused: preserve saved provider/game controls and audit history; use a reviewed forward migration';
END
$m011_no_unsafe_rollback$;
