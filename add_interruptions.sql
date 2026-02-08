-- Add interruptions counter to sleep_entry table
ALTER TABLE sleep_entry ADD COLUMN IF NOT EXISTS interruptions integer DEFAULT 0;