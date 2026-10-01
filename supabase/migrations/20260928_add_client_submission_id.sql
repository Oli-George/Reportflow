-- Migration: Add client_submission_id column for idempotent offline sync
-- Run this in Supabase Dashboard -> SQL Editor

ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS client_submission_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_reports_client_submission_id 
ON public.reports (client_submission_id);
