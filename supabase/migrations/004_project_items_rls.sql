-- Migration 003: Add missing RLS policies for project_items
-- Run this in Supabase SQL Editor

-- Allow authenticated users to insert project items
CREATE POLICY "Allow authenticated insert" ON project_items 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Allow authenticated users to update project items
CREATE POLICY "Allow authenticated update" ON project_items 
  FOR UPDATE TO authenticated 
  USING (true);

-- Allow authenticated users to delete project items
CREATE POLICY "Allow authenticated delete" ON project_items 
  FOR DELETE TO authenticated 
  USING (true);
