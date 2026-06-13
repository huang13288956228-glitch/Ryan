import { useState, useEffect } from 'react';
import { supabase, Lead, Company } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { Search, Plus, Trash2, FileEdit as Edit2, Loader } from 'lucide-react';

interface LeadWithCompany extends Lead {
  companies?: { name: string } | null;
}

const SOURCES = [
  { value: 'manual', label: '手动录入' },
  { value: 'exhibition', label: '展会' },
  { value: 'website', label: '网站' },
  { value: 'referral', label: '转介绍' },
  { value: 'cold-start', label: '冷启动' },
];

const STATUSES = [
  { value: 'new', label: '新线索' },
  { value: 'contacted', label: '已联系' },
  { value: 'qualified', label: '已认证' },
  { value: 'lost', label: '已流失' },
];

export default function LeadFinder() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadWithCompany[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    source: 'manual',
    score: 50,
    notes: '',
  });

  // Confirm delete state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Record<string, string>>({});

  // Load leads and companies
  useEffect(() => {
    if (!user) return;
    loadLeads();
  }, [user]);

  // Filter leads when search/filter changes
  useEffect(() => {
    filterLeads();
  }, [searchQuery, sourceFilter, statusFilter, leads]);

  const loadLeads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, companies(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLeads(data as LeadWithCompany[]);

      // Cache company names
      const companyMap: Record<string, string> = {};
      (data as LeadWithCompany[]).forEach(lead => {
        if (lead.companies) {
          const compName = typeof lead.companies === 'object' && 'name' in lead.companies ? lead.companies.name : '';
          if (lead.company_id) companyMap[lead.company_id] = compName;
        }
      });
      setCompanies(companyMap);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = [...leads];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => {
        const companyName = lead.companies && typeof lead.companies === 'object' && 'name' in lead.companies
          ? (lead.companies.name || '').toLowerCase()
          : '';
        return companyName.includes(query);
      });
    }

    if (sourceFilter) {
      filtered = filtered.filter(lead => lead.source === sourceFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    setFilteredLeads(filtered);
  };

  const getScoreBadge = (score: number) => {
    let badgeClass = 'badge-red';
    if (score >= 70) badgeClass = 'badge-green';
    else if (score >= 40) badgeClass = 'badge-amber';

    return (
      <span className={`${badgeClass} px-2 py-1 text-xs rounded font-semibold`}>
        {score}分
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { badge: string; label: string }> = {
      new: { badge: 'badge-blue', label: '新线索' },
      contacted: { badge: 'badge-purple', label: '已联系' },
      qualified: { badge: 'badge-green', label: '已认证' },
      lost: { badge: 'badge-slate', label: '已流失' },
    };
    const statusInfo = statusMap[status] || { badge: 'badge-blue', label: status };
    return <span className={`${statusInfo.badge} px-2 py-1 text-xs rounded`}>{statusInfo.label}</span>;
  };

  const getSourceLabel = (source: string) => {
    return SOURCES.find(s => s.value === source)?.label || source;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ companyName: '', source: 'manual', score: 50, notes: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (lead: LeadWithCompany) => {
    setIsEditing(true);
    setEditingId(lead.id);
    const companyName = lead.companies && typeof lead.companies === 'object' && 'name' in lead.companies
      ? (lead.companies.name || '')
      : '';
    setFormData({
      companyName,
      source: lead.source,
      score: lead.score,
      notes: lead.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !formData.companyName.trim()) return;

    setSearching(true);
    try {
      let companyId: string | null = null;

      // Check if company exists
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', formData.companyName.trim())
        .single();

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        // Create new company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            user_id: user.id,
            name: formData.companyName.trim(),
          })
          .select('id')
          .single();

        if (companyError) throw companyError;
        companyId = newCompany.id;
      }

      // Save or update lead
      if (isEditing && editingId) {
        const { error } = await supabase
          .from('leads')
          .update({
            company_id: companyId,
            source: formData.source,
            score: formData.score,
            notes: formData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leads')
          .insert({
            user_id: user.id,
            company_id: companyId,
            source: formData.source,
            score: formData.score,
            status: 'new',
            notes: formData.notes,
          });

        if (error) throw error;
      }

      setIsModalOpen(false);
      await loadLeads();
    } catch (err) {
      console.error('Failed to save lead:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadId);
      if (error) throw error;
      setDeleteConfirm(null);
      await loadLeads();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950">
      <div className="page-header px-6 py-4 border-b border-navy-800">
        <h1 className="page-title">线索管理</h1>
      </div>

      <div className="p-6">
        {/* Search & Filters */}
        <div className="glass-card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
              <input
                type="text"
                placeholder="搜索公司名称..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field pl-10 w-full"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="input-field"
            >
              <option value="">全部来源</option>
              {SOURCES.map(source => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">全部状态</option>
              {STATUSES.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={openAddModal}
          className="btn-primary mb-6 inline-flex items-center gap-2 px-4 py-2"
        >
          <Plus className="w-4 h-4" />
          添加线索
        </button>

        {/* Leads Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-navy-400">加载中...</p>
            </div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-navy-400 mb-4">
              {searchQuery || sourceFilter || statusFilter ? '没有找到匹配的线索' : '还没有线索，开始添加吧！'}
            </p>
            {!searchQuery && !sourceFilter && !statusFilter && (
              <button
                onClick={openAddModal}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2"
              >
                <Plus className="w-4 h-4" />
                添加第一个线索
              </button>
            )}
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header border-b border-navy-700/50">
                    <th className="table-cell text-left">公司</th>
                    <th className="table-cell text-left">来源</th>
                    <th className="table-cell text-center">评分</th>
                    <th className="table-cell text-left">状态</th>
                    <th className="table-cell text-left">创建时间</th>
                    <th className="table-cell text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, idx) => {
                    const companyName = lead.companies && typeof lead.companies === 'object' && 'name' in lead.companies
                      ? (lead.companies.name || '')
                      : '';
                    return (
                      <tr key={lead.id} className={`table-row border-b border-navy-700/30 hover:bg-navy-800/40 transition-colors ${idx % 2 === 0 ? 'bg-navy-900/20' : ''}`}>
                        <td className="table-cell text-white font-medium">{companyName}</td>
                        <td className="table-cell text-navy-400 text-sm">{getSourceLabel(lead.source)}</td>
                        <td className="table-cell text-center">{getScoreBadge(lead.score)}</td>
                        <td className="table-cell">{getStatusBadge(lead.status)}</td>
                        <td className="table-cell text-navy-400 text-sm">{formatDate(lead.created_at)}</td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(lead)}
                              className="p-1.5 text-blue-500 hover:bg-blue-500/20 rounded transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(lead.id)}
                              className="p-1.5 text-red-500 hover:bg-red-500/20 rounded transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          title={isEditing ? '编辑线索' : '添加线索'}
          onClose={() => setIsModalOpen(false)}
          actions={
            <div className="flex gap-2 justify-end w-full">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary px-4 py-2"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={searching || !formData.companyName.trim()}
                className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {searching && <Loader className="w-4 h-4 animate-spin" />}
                {searching ? '保存中...' : '保存'}
              </button>
            </div>
          }
        >
          <FormField
            label="公司名称"
            value={formData.companyName}
            onChange={v => setFormData({ ...formData, companyName: v })}
            placeholder="输入公司名称"
          />
          <SelectField
            label="线索来源"
            value={formData.source}
            onChange={v => setFormData({ ...formData, source: v })}
            options={SOURCES}
          />
          <div>
            <label className="block text-navy-200 text-sm font-medium mb-3">
              线索评分: <span className="text-blue-400">{formData.score}</span>分
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.score}
              onChange={e => setFormData({ ...formData, score: parseInt(e.target.value) })}
              className="w-full h-2 bg-navy-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-navy-500 mt-1">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
          <div>
            <label className="block text-navy-200 text-sm font-medium mb-1.5">备注</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="添加备注..."
              className="input-field min-h-[80px] resize-none"
            />
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <Modal
            isOpen={true}
            title="确认删除"
            onClose={() => setDeleteConfirm(null)}
            actions={
              <div className="flex gap-2 justify-end w-full">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="btn-secondary px-4 py-2"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="btn-danger px-4 py-2"
                >
                  确认删除
                </button>
              </div>
            }
          >
            <p className="text-navy-300">您确定要删除这条线索吗？此操作无法撤销。</p>
          </Modal>
        )}
      </div>
    </div>
  );
}
