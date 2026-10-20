-- Up Migration
-- The bootstrap migration intentionally creates no domain tables. It verifies
-- ordered migration execution while the financial/domain schema remains gated.
SELECT 1;

-- Down Migration
SELECT 1;
