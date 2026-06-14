-- Deprecated compatibility pointer.
--
-- The runtime schema is maintained by the root setup scripts:
--   - supabase-setup.sql
--   - supabase-storage-setup.sql
--
-- This file intentionally does not create tables because the older short schema
-- is incomplete for the current app.

SELECT 'Run supabase-setup.sql and then supabase-storage-setup.sql from the lexiph root.' AS setup_instruction;
