import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Page =
  | 'dashboard' | 'lead-finder' | 'company-intel' | 'contact-finder' | 'crm'
  | 'ai-email' | 'linkedin' | 'whatsapp' | 'ai-translate'
  | 'quotation' | 'meeting' | 'followup' | 'opportunity'
  | 'market-research' | 'import-export';

export interface Company {
  id: string; user_id: string; name: string; website: string | null;
  industry: string | null; country: string | null; city: string | null;
  employees: string | null; revenue: string | null; description: string | null;
  logo_url: string | null; tags: string[]; created_at: string; updated_at: string;
}

export interface Contact {
  id: string; user_id: string; company_id: string | null;
  first_name: string; last_name: string | null; email: string | null;
  phone: string | null; linkedin_url: string | null; role: string | null;
  department: string | null; tags: string[]; notes: string | null;
  created_at: string; updated_at: string;
}

export interface Lead {
  id: string; user_id: string; company_id: string | null;
  contact_id: string | null; source: string; score: number;
  status: string; notes: string | null; created_at: string; updated_at: string;
}

export interface CrmDeal {
  id: string; user_id: string; company_id: string | null;
  contact_id: string | null; title: string; stage: string;
  value: number; currency: string; probability: number;
  expected_close_date: string | null; notes: string | null;
  created_at: string; updated_at: string;
}

export interface Email {
  id: string; user_id: string; contact_id: string | null;
  email_type: string; tone: string; subject: string | null;
  content: string; status: string; created_at: string;
}

export interface LinkedinOutreach {
  id: string; user_id: string; contact_id: string | null;
  profile_url: string; campaign: string | null; status: string;
  connection_message: string | null; follow_up_message: string | null;
  notes: string | null; sent_at: string | null; created_at: string; updated_at: string;
}

export interface WhatsappOutreach {
  id: string; user_id: string; contact_id: string | null;
  phone: string; campaign: string | null; status: string;
  message_template: string | null; last_message: string | null;
  notes: string | null; sent_at: string | null; created_at: string; updated_at: string;
}

export interface QuoteItem { name: string; qty: number; unit: string; price: number; amount: number; }

export interface Quotation {
  id: string; user_id: string; company_id: string | null;
  contact_id: string | null; title: string; items: QuoteItem[];
  currency: string; trade_terms: string; payment_terms: string | null;
  delivery_time: string | null; notes: string | null; valid_days: number;
  status: string; created_at: string; updated_at: string;
}

export interface ActionItem { text: string; assignee: string; done: boolean; }

export interface Meeting {
  id: string; user_id: string; contact_id: string | null;
  deal_id: string | null; title: string; scheduled_at: string;
  duration_min: number; location: string | null; participants: string[];
  agenda: string | null; notes: string | null; transcript: string | null;
  action_items: ActionItem[]; status: string; created_at: string; updated_at: string;
}

export interface Followup {
  id: string; user_id: string; contact_id: string | null;
  deal_id: string | null; type: string; description: string;
  due_at: string; completed_at: string | null; status: string; created_at: string;
}

export interface ScoringFactor { name: string; score: number; weight: number; }

export interface Opportunity {
  id: string; user_id: string; deal_id: string | null;
  company_id: string | null; score: number; risk_level: string;
  factors: ScoringFactor[]; recommendation: string | null;
  created_at: string; updated_at: string;
}

export interface Finding { title: string; detail: string; significance: 'high' | 'medium' | 'low'; }
export interface DataSource { name: string; url: string; accessed_at: string; }

export interface MarketResearch {
  id: string; user_id: string; topic: string; region: string | null;
  industry: string | null; findings: Finding[]; summary: string | null;
  data_sources: DataSource[]; created_at: string; updated_at: string;
}

export interface ImportExportRecord {
  id: string; user_id: string; hs_code: string | null; product_name: string;
  country: string | null; direction: string; volume: number | null;
  value: number | null; currency: string; period: string | null;
  data_source: string | null; notes: string | null; created_at: string;
}
