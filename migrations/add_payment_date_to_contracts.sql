-- Add payment_date column to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_date DATE;
