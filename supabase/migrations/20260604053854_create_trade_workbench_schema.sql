/*
  # Foreign Trade Workbench Schema

  ## New Tables

  ### 1. `inquiries`
  Stores customer inquiry records with kanban status tracking.
  - `id` (uuid, PK)
  - `user_id` (uuid, FK → auth.users)
  - `customer_name` (text) — customer or company name
  - `customer_email` (text)
  - `customer_country` (text)
  - `product` (text) — product of interest
  - `quantity` (text)
  - `notes` (text) — free-form notes
  - `status` (text) — new | following | quoted | closed
  - `created_at`, `updated_at` (timestamptz)

  ### 2. `quotes`
  Stores generated quotation records.
  - `id` (uuid, PK)
  - `user_id` (uuid, FK → auth.users)
  - `inquiry_id` (uuid, FK → inquiries, nullable)
  - `customer_name`, `customer_email`, `customer_country` (text)
  - `items` (jsonb) — array of {name, qty, unit, price, amount}
  - `currency` (text)
  - `notes` (text)
  - `valid_days` (int)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own rows
*/

-- inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_country text NOT NULL DEFAULT '',
  product text NOT NULL DEFAULT '',
  quantity text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own inquiries"
  ON inquiries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inquiries"
  ON inquiries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inquiries"
  ON inquiries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inquiries"
  ON inquiries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inquiry_id uuid REFERENCES inquiries(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_country text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]',
  currency text NOT NULL DEFAULT 'USD',
  notes text NOT NULL DEFAULT '',
  valid_days int NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotes"
  ON quotes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes"
  ON quotes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for common queries
CREATE INDEX IF NOT EXISTS inquiries_user_status_idx ON inquiries(user_id, status);
CREATE INDEX IF NOT EXISTS quotes_user_idx ON quotes(user_id);
