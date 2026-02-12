-- Add BOQ fields to quote_items
-- Run this in Supabase SQL Editor after 001_initial_schema.sql

-- Add size and image_url to quote_items
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add site_address and revision to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS site_address TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS revision INTEGER DEFAULT 0;

-- Update quantity to allow decimals (for SQM, LM measurements)
ALTER TABLE quote_items ALTER COLUMN quantity TYPE DECIMAL(10,2);

-- Create storage bucket for quote images (run separately in Supabase dashboard or via API)
-- Storage > New bucket > "quote-images" > Public bucket

-- Grant storage access (if using RLS on storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('quote-images', 'quote-images', true);
