/*
# Trade Workbench Full Platform Schema

Creates tables for all 14 core modules of the Trade Workbench SaaS platform.

## New Tables

1. **companies** - Company Intelligence data (firmographics, industry, website)
2. **contacts** - Contact Finder data (name, email, phone, LinkedIn, role, company FK)
3. **leads** - Lead Finder data (source, score, status, company/contact FKs)
4. **crm_deals** - CRM pipeline deals (stage, value, probability, company/contact FKs)
5. **emails** - AI Email Generator history (type, tone, content, contact FK)
6. **linkedin_outreach** - LinkedIn campaign tracking (profile, status, messages)
7. **whatsapp_outreach** - WhatsApp campaign tracking (phone, status, messages)
8. **quotations** - Quotation Generator (items JSON, currency, terms)
9. **meetings** - Meeting Assistant (datetime, participants, notes, transcript, action items JSON)
10. **followups** - Follow-up Reminders (due date, type, status, contact FK)
11. **opportunities** - Opportunity Scoring (score, risk, factors JSON, deal FK)
12. **market_research** - Market Research reports (topic, region, findings JSON)
13. **import_export_data** - Import/Export Data records (HS code, country, product, volume, value)

## Existing Tables (preserved)

- **inquiries** - Already exists, preserved
- **quotes** - Already exists, preserved (new `quotations` table is separate for the Quotation Generator module)

## Security

- All tables have RLS enabled.
- All policies use `auth.uid() = user_id` for owner-scoped access.
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE).
- user_id defaults to `auth.uid()` so frontend inserts omit it.
*/

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  website text,
  industry text,
  country text,
  city text,
  employees text,
  revenue text,
  description text,
  logo_url text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);

DROP POLICY IF EXISTS "select_own_companies" ON companies;
CREATE POLICY "select_own_companies" ON companies FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_companies" ON companies;
CREATE POLICY "insert_own_companies" ON companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_companies" ON companies;
CREATE POLICY "update_own_companies" ON companies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_companies" ON companies;
CREATE POLICY "delete_own_companies" ON companies FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  linkedin_url text,
  role text,
  department text,
  tags text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);

DROP POLICY IF EXISTS "select_own_contacts" ON contacts;
CREATE POLICY "select_own_contacts" ON contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_contacts" ON contacts;
CREATE POLICY "insert_own_contacts" ON contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_contacts" ON contacts;
CREATE POLICY "update_own_contacts" ON contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_contacts" ON contacts;
CREATE POLICY "delete_own_contacts" ON contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual',
  score int DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(user_id, status);

DROP POLICY IF EXISTS "select_own_leads" ON leads;
CREATE POLICY "select_own_leads" ON leads FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_leads" ON leads;
CREATE POLICY "insert_own_leads" ON leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_leads" ON leads;
CREATE POLICY "update_own_leads" ON leads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_leads" ON leads;
CREATE POLICY "delete_own_leads" ON leads FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- CRM DEALS
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'prospect',
  value numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  probability int DEFAULT 0,
  expected_close_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_crm_deals_user ON crm_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(user_id, stage);

DROP POLICY IF EXISTS "select_own_crm_deals" ON crm_deals;
CREATE POLICY "select_own_crm_deals" ON crm_deals FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_crm_deals" ON crm_deals;
CREATE POLICY "insert_own_crm_deals" ON crm_deals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_crm_deals" ON crm_deals;
CREATE POLICY "update_own_crm_deals" ON crm_deals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_crm_deals" ON crm_deals;
CREATE POLICY "delete_own_crm_deals" ON crm_deals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- EMAILS (AI Email Generator History)
-- ============================================================
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  email_type text NOT NULL,
  tone text DEFAULT 'professional',
  subject text,
  content text NOT NULL,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_emails_user ON emails(user_id);

DROP POLICY IF EXISTS "select_own_emails" ON emails;
CREATE POLICY "select_own_emails" ON emails FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_emails" ON emails;
CREATE POLICY "insert_own_emails" ON emails FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_emails" ON emails;
CREATE POLICY "update_own_emails" ON emails FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_emails" ON emails;
CREATE POLICY "delete_own_emails" ON emails FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- LINKEDIN OUTREACH
-- ============================================================
CREATE TABLE IF NOT EXISTS linkedin_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  profile_url text NOT NULL,
  campaign text,
  status text NOT NULL DEFAULT 'pending',
  connection_message text,
  follow_up_message text,
  notes text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE linkedin_outreach ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_linkedin_user ON linkedin_outreach(user_id);

DROP POLICY IF EXISTS "select_own_linkedin_outreach" ON linkedin_outreach;
CREATE POLICY "select_own_linkedin_outreach" ON linkedin_outreach FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_linkedin_outreach" ON linkedin_outreach;
CREATE POLICY "insert_own_linkedin_outreach" ON linkedin_outreach FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_linkedin_outreach" ON linkedin_outreach;
CREATE POLICY "update_own_linkedin_outreach" ON linkedin_outreach FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_linkedin_outreach" ON linkedin_outreach;
CREATE POLICY "delete_own_linkedin_outreach" ON linkedin_outreach FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- WHATSAPP OUTREACH
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  phone text NOT NULL,
  campaign text,
  status text NOT NULL DEFAULT 'pending',
  message_template text,
  last_message text,
  notes text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE whatsapp_outreach ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_whatsapp_user ON whatsapp_outreach(user_id);

DROP POLICY IF EXISTS "select_own_whatsapp_outreach" ON whatsapp_outreach;
CREATE POLICY "select_own_whatsapp_outreach" ON whatsapp_outreach FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_whatsapp_outreach" ON whatsapp_outreach;
CREATE POLICY "insert_own_whatsapp_outreach" ON whatsapp_outreach FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_whatsapp_outreach" ON whatsapp_outreach;
CREATE POLICY "update_own_whatsapp_outreach" ON whatsapp_outreach FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_whatsapp_outreach" ON whatsapp_outreach;
CREATE POLICY "delete_own_whatsapp_outreach" ON whatsapp_outreach FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- QUOTATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  title text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  currency text DEFAULT 'USD',
  trade_terms text DEFAULT 'FOB Shanghai',
  payment_terms text,
  delivery_time text,
  notes text,
  valid_days int DEFAULT 30,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_quotations_user ON quotations(user_id);

DROP POLICY IF EXISTS "select_own_quotations" ON quotations;
CREATE POLICY "select_own_quotations" ON quotations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_quotations" ON quotations;
CREATE POLICY "insert_own_quotations" ON quotations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_quotations" ON quotations;
CREATE POLICY "update_own_quotations" ON quotations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_quotations" ON quotations;
CREATE POLICY "delete_own_quotations" ON quotations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- MEETINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES crm_deals(id) ON DELETE SET NULL,
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_min int DEFAULT 30,
  location text,
  participants jsonb DEFAULT '[]',
  agenda text,
  notes text,
  transcript text,
  action_items jsonb DEFAULT '[]',
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_meetings_user ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(user_id, scheduled_at);

DROP POLICY IF EXISTS "select_own_meetings" ON meetings;
CREATE POLICY "select_own_meetings" ON meetings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_meetings" ON meetings;
CREATE POLICY "insert_own_meetings" ON meetings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_meetings" ON meetings;
CREATE POLICY "update_own_meetings" ON meetings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_meetings" ON meetings;
CREATE POLICY "delete_own_meetings" ON meetings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- FOLLOW-UPS
-- ============================================================
CREATE TABLE IF NOT EXISTS followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES crm_deals(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'email',
  description text NOT NULL,
  due_at timestamptz NOT NULL,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_followups_user ON followups(user_id);
CREATE INDEX IF NOT EXISTS idx_followups_due ON followups(user_id, due_at);

DROP POLICY IF EXISTS "select_own_followups" ON followups;
CREATE POLICY "select_own_followups" ON followups FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_followups" ON followups;
CREATE POLICY "insert_own_followups" ON followups FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_followups" ON followups;
CREATE POLICY "update_own_followups" ON followups FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_followups" ON followups;
CREATE POLICY "delete_own_followups" ON followups FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- OPPORTUNITIES (Scoring)
-- ============================================================
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES crm_deals(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  score int NOT NULL DEFAULT 0,
  risk_level text DEFAULT 'medium',
  factors jsonb DEFAULT '[]',
  recommendation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_opportunities_user ON opportunities(user_id);

DROP POLICY IF EXISTS "select_own_opportunities" ON opportunities;
CREATE POLICY "select_own_opportunities" ON opportunities FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_opportunities" ON opportunities;
CREATE POLICY "insert_own_opportunities" ON opportunities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_opportunities" ON opportunities;
CREATE POLICY "update_own_opportunities" ON opportunities FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_opportunities" ON opportunities;
CREATE POLICY "delete_own_opportunities" ON opportunities FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- MARKET RESEARCH
-- ============================================================
CREATE TABLE IF NOT EXISTS market_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  region text,
  industry text,
  findings jsonb DEFAULT '[]',
  summary text,
  data_sources jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE market_research ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_market_research_user ON market_research(user_id);

DROP POLICY IF EXISTS "select_own_market_research" ON market_research;
CREATE POLICY "select_own_market_research" ON market_research FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_market_research" ON market_research;
CREATE POLICY "insert_own_market_research" ON market_research FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_market_research" ON market_research;
CREATE POLICY "update_own_market_research" ON market_research FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_market_research" ON market_research;
CREATE POLICY "delete_own_market_research" ON market_research FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- IMPORT/EXPORT DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS import_export_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  hs_code text,
  product_name text NOT NULL,
  country text,
  direction text NOT NULL DEFAULT 'export',
  volume numeric,
  value numeric,
  currency text DEFAULT 'USD',
  period text,
  data_source text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE import_export_data ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_import_export_user ON import_export_data(user_id);
CREATE INDEX IF NOT EXISTS idx_import_export_hs ON import_export_data(user_id, hs_code);

DROP POLICY IF EXISTS "select_own_import_export_data" ON import_export_data;
CREATE POLICY "select_own_import_export_data" ON import_export_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_import_export_data" ON import_export_data;
CREATE POLICY "insert_own_import_export_data" ON import_export_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_import_export_data" ON import_export_data;
CREATE POLICY "update_own_import_export_data" ON import_export_data FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_import_export_data" ON import_export_data;
CREATE POLICY "delete_own_import_export_data" ON import_export_data FOR DELETE TO authenticated USING (auth.uid() = user_id);
