import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Layout from './components/Layout';
import type { Page } from './lib/supabase';

import Dashboard from './pages/Dashboard';
import LeadFinder from './pages/LeadFinder';
import CompanyIntel from './pages/CompanyIntel';
import ContactFinder from './pages/ContactFinder';
import CRM from './pages/CRM';
import AIEmail from './pages/AIEmail';
import LinkedInOutreach from './pages/LinkedInOutreach';
import WhatsAppOutreach from './pages/WhatsAppOutreach';
import AITranslate from './pages/AITranslate';
import QuotationGenerator from './pages/QuotationGenerator';
import MeetingAssistant from './pages/MeetingAssistant';
import FollowupReminders from './pages/FollowupReminders';
import OpportunityScoring from './pages/OpportunityScoring';
import MarketResearch from './pages/MarketResearch';
import ImportExportData from './pages/ImportExportData';

function AppInner() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (loading) return <div className="min-h-screen bg-navy-950 flex items-center justify-center"><span className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>;
  if (!session) return <AuthPage />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'lead-finder': return <LeadFinder />;
      case 'company-intel': return <CompanyIntel />;
      case 'contact-finder': return <ContactFinder />;
      case 'crm': return <CRM />;
      case 'ai-email': return <AIEmail />;
      case 'linkedin': return <LinkedInOutreach />;
      case 'whatsapp': return <WhatsAppOutreach />;
      case 'ai-translate': return <AITranslate />;
      case 'quotation': return <QuotationGenerator />;
      case 'meeting': return <MeetingAssistant />;
      case 'followup': return <FollowupReminders />;
      case 'opportunity': return <OpportunityScoring />;
      case 'market-research': return <MarketResearch />;
      case 'import-export': return <ImportExportData />;
    }
  };

  return <Layout currentPage={page} setPage={setPage}>{renderPage()}</Layout>;
}

export default function App() { return <AuthProvider><AppInner /></AuthProvider>; }
