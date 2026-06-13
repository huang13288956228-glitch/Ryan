import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Page } from '../lib/supabase';
import {
  LayoutDashboard, Target, Building2, Users, Kanban,
  Mail, Linkedin, MessageCircle, Languages, FileText,
  Calendar, Bell, TrendingUp, Globe, BarChart3,
  LogOut, Menu, X, ChevronDown, ChevronRight,
} from 'lucide-react';

interface LayoutProps { currentPage: Page; setPage: (page: Page) => void; children: React.ReactNode; }
interface NavGroup { label: string; items: { page: Page; label: string; icon: React.ReactNode }[]; }

const navGroups: NavGroup[] = [
  { label: '总览', items: [{ page: 'dashboard', label: '仪表盘', icon: <LayoutDashboard size={18} /> }] },
  { label: '获客', items: [
    { page: 'lead-finder', label: '线索查找', icon: <Target size={18} /> },
    { page: 'company-intel', label: '企业情报', icon: <Building2 size={18} /> },
    { page: 'contact-finder', label: '联系人查找', icon: <Users size={18} /> },
  ]},
  { label: '销售与CRM', items: [
    { page: 'crm', label: 'CRM客户管理', icon: <Kanban size={18} /> },
    { page: 'opportunity', label: '商机评分', icon: <TrendingUp size={18} /> },
    { page: 'followup', label: '跟进提醒', icon: <Bell size={18} /> },
  ]},
  { label: '触达', items: [
    { page: 'ai-email', label: 'AI邮件', icon: <Mail size={18} /> },
    { page: 'linkedin', label: 'LinkedIn触达', icon: <Linkedin size={18} /> },
    { page: 'whatsapp', label: 'WhatsApp触达', icon: <MessageCircle size={18} /> },
  ]},
  { label: '运营', items: [
    { page: 'ai-translate', label: 'AI翻译', icon: <Languages size={18} /> },
    { page: 'quotation', label: '报价生成器', icon: <FileText size={18} /> },
    { page: 'meeting', label: '会议助手', icon: <Calendar size={18} /> },
  ]},
  { label: '情报', items: [
    { page: 'market-research', label: '市场调研', icon: <Globe size={18} /> },
    { page: 'import-export', label: '进出口数据', icon: <BarChart3 size={18} /> },
  ]},
];

export default function Layout({ currentPage, setPage, children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleGroup = (label: string) => setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-navy-950 border-r border-navy-800/60 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-navy-800/60 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20"><Globe size={16} className="text-white" /></div>
          <div><div className="text-white font-semibold text-sm leading-tight">外贸工作台</div><div className="text-navy-500 text-[10px]">AI智能外贸操作系统</div></div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-navy-400 hover:text-white"><X size={16} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navGroups.map(group => (
            <div key={group.label}>
              <button onClick={() => toggleGroup(group.label)} className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-semibold text-navy-500 uppercase tracking-widest hover:text-navy-400 transition-colors">
                {group.label}{collapsed[group.label] ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
              </button>
              {!collapsed[group.label] && (
                <div className="space-y-0.5 mt-0.5 mb-1">
                  {group.items.map(item => (
                    <button key={item.page} onClick={() => { setPage(item.page); setSidebarOpen(false); }} className={currentPage === item.page ? 'sidebar-item-active' : 'sidebar-item'}>
                      {item.icon}<span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-navy-800/60 p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-xs font-semibold text-navy-200">{(user?.email?.[0] || 'U').toUpperCase()}</div>
            <div className="flex-1 min-w-0"><p className="text-xs text-white truncate">{user?.email}</p></div>
            <button onClick={signOut} className="p-1.5 text-navy-400 hover:text-red-400 transition-colors" title="退出登录"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="shrink-0 h-14 bg-navy-950/80 border-b border-navy-800/60 flex items-center px-4 gap-3 backdrop-blur-sm">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 text-navy-400 hover:text-white transition-colors"><Menu size={18} /></button>
          <h1 className="text-sm font-medium text-white">{navGroups.flatMap(g => g.items).find(i => i.page === currentPage)?.label || '仪表盘'}</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}
