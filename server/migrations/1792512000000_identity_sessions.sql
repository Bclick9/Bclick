-- Up Migration
-- Identity/session persistence only. No wallet, payments, provider, or financial-domain tables.
CREATE TABLE identity_players (
 id uuid PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL UNIQUE, password_hash text NOT NULL,
 display_name text NOT NULL, country_code char(2) NOT NULL,
 settlement_currency text NOT NULL CHECK (settlement_currency IN ('TND','EUR','USD')),
 language text NOT NULL DEFAULT 'en',
 preferred_display_currency text CHECK (preferred_display_currency IS NULL OR preferred_display_currency IN ('TND','EUR','USD')),
 status text NOT NULL CHECK (status IN ('active','pending','suspended','closed')) DEFAULT 'pending',
 verification_status text NOT NULL CHECK (verification_status IN ('pending','verified','rejected','expired','not_required')) DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX identity_players_status_idx ON identity_players(status);

CREATE TABLE identity_admins (
 id uuid PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL UNIQUE, display_name text NOT NULL,
 password_hash text NOT NULL, status text NOT NULL CHECK (status IN ('active','locked','disabled')),
 mfa_enabled boolean NOT NULL DEFAULT false, totp_secret_encrypted text, totp_pending_secret_encrypted text,
 totp_pending_challenge_id uuid, totp_pending_expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((mfa_enabled = false) OR totp_secret_encrypted IS NOT NULL),
 CHECK ((totp_pending_secret_encrypted IS NULL AND totp_pending_challenge_id IS NULL AND totp_pending_expires_at IS NULL)
    OR (totp_pending_secret_encrypted IS NOT NULL AND totp_pending_expires_at IS NOT NULL))
);

CREATE TABLE identity_sessions (
 id uuid PRIMARY KEY, principal_type text NOT NULL CHECK (principal_type IN ('player','admin')), principal_id uuid NOT NULL,
 token_hash text NOT NULL UNIQUE, session_version integer NOT NULL DEFAULT 1 CHECK (session_version > 0),
 created_at timestamptz NOT NULL DEFAULT now(), authenticated_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 revoked_at timestamptz, mfa_verified boolean NOT NULL DEFAULT false, CHECK (expires_at > created_at)
);
CREATE INDEX identity_sessions_principal_idx ON identity_sessions(principal_type,principal_id) WHERE revoked_at IS NULL;
CREATE INDEX identity_sessions_expiry_idx ON identity_sessions(expires_at) WHERE revoked_at IS NULL;

CREATE TABLE identity_admin_auth_challenges (
 id uuid PRIMARY KEY, admin_id uuid NOT NULL REFERENCES identity_admins(id) ON DELETE CASCADE,
 status text NOT NULL CHECK (status IN ('mfa_required','enrollment_required')), browser_token_hash text NOT NULL,
 enrollment_token_hash text, expires_at timestamptz NOT NULL, attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
 max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10), consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((status = 'mfa_required' AND enrollment_token_hash IS NULL) OR (status = 'enrollment_required' AND enrollment_token_hash IS NOT NULL))
);
CREATE INDEX identity_admin_challenges_expiry_idx ON identity_admin_auth_challenges(expires_at) WHERE consumed_at IS NULL;
CREATE INDEX identity_admin_challenges_admin_idx ON identity_admin_auth_challenges(admin_id) WHERE consumed_at IS NULL;

CREATE TABLE identity_admin_recovery_codes (
 id uuid PRIMARY KEY, admin_id uuid NOT NULL REFERENCES identity_admins(id) ON DELETE CASCADE,
 code_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), consumed_at timestamptz
);
CREATE INDEX identity_admin_recovery_codes_active_idx ON identity_admin_recovery_codes(admin_id) WHERE consumed_at IS NULL;

CREATE TABLE identity_one_time_tokens (
 id uuid PRIMARY KEY, principal_type text NOT NULL CHECK (principal_type = 'player'),
 principal_id uuid NOT NULL REFERENCES identity_players(id) ON DELETE CASCADE,
 token_type text NOT NULL CHECK (token_type IN ('email_verification','password_reset')),
 token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX identity_one_time_tokens_expiry_idx ON identity_one_time_tokens(token_type,expires_at) WHERE consumed_at IS NULL;

CREATE TABLE identity_rate_limits (
 scope text NOT NULL, subject_hash text NOT NULL, window_started_at timestamptz NOT NULL,
 attempt_count integer NOT NULL CHECK (attempt_count > 0), PRIMARY KEY(scope,subject_hash)
);
CREATE TABLE identity_security_audit_events (
 id uuid PRIMARY KEY, action text NOT NULL, actor_type text NOT NULL CHECK (actor_type IN ('player','admin','system')),
 actor_id uuid, subject_type text, subject_id uuid,
 outcome text NOT NULL CHECK (outcome IN ('success','denied','failure')), request_id text NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX identity_security_audit_created_idx ON identity_security_audit_events(created_at DESC);
CREATE INDEX identity_security_audit_actor_idx ON identity_security_audit_events(actor_type,actor_id,created_at DESC);

CREATE TABLE identity_admin_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, display_name text NOT NULL);
CREATE TABLE identity_admin_permissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, description text NOT NULL);
CREATE TABLE identity_admin_role_permissions (
 role_id uuid NOT NULL REFERENCES identity_admin_roles(id) ON DELETE CASCADE,
 permission_id uuid NOT NULL REFERENCES identity_admin_permissions(id) ON DELETE CASCADE,
 PRIMARY KEY(role_id,permission_id)
);
CREATE TABLE identity_admin_account_roles (
 admin_id uuid NOT NULL REFERENCES identity_admins(id) ON DELETE CASCADE,
 role_id uuid NOT NULL REFERENCES identity_admin_roles(id) ON DELETE CASCADE,
 PRIMARY KEY(admin_id,role_id)
);
INSERT INTO identity_admin_roles(code,display_name) VALUES ('project-admin','Project Administrator');
INSERT INTO identity_admin_permissions(code,description) VALUES
 ('admin.session.read','Read the authenticated administrator session'),
 ('admin.players.read','Read player administration records'),
 ('admin.players.write','Change permitted player account fields'),
 ('admin.security.audit.read','Read security audit records'),
 ('admin.security.manage','Manage administrator identity security');
INSERT INTO identity_admin_role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM identity_admin_roles r CROSS JOIN identity_admin_permissions p WHERE r.code='project-admin';

-- Down Migration
DROP TABLE IF EXISTS identity_admin_account_roles;
DROP TABLE IF EXISTS identity_admin_role_permissions;
DROP TABLE IF EXISTS identity_admin_permissions;
DROP TABLE IF EXISTS identity_admin_roles;
DROP TABLE IF EXISTS identity_security_audit_events;
DROP TABLE IF EXISTS identity_rate_limits;
DROP TABLE IF EXISTS identity_one_time_tokens;
DROP TABLE IF EXISTS identity_admin_recovery_codes;
DROP TABLE IF EXISTS identity_admin_auth_challenges;
DROP TABLE IF EXISTS identity_sessions;
DROP TABLE IF EXISTS identity_admins;
DROP TABLE IF EXISTS identity_players;
