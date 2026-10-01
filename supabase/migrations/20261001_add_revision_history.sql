-- Migration: Add version and revision_history columns to public.reports
-- Run this in Supabase Dashboard -> SQL Editor

ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS revision_history JSONB DEFAULT '[]'::jsonb;
