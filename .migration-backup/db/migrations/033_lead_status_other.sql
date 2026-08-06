-- Add 'other' to lead_status enum for leads with incorrect or incomplete details
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'other';
