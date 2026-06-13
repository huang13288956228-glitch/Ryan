import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { CrmDeal, Company, Contact } from '../lib/supabase';

type StageKey = 'Prospect' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';

const STAGE_MAP: Record<StageKey, string> = {
  Prospect: '潜在客户',
  Qualified: '已认证',
  Proposal: '方案报价',
  Negotiation: '谈判中',
  'Closed Won': '成交',
  'Closed Lost': '已流失',
};

const STAGE_KEYS: StageKey[] = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CNY', label: 'CNY' },
  { value: 'GBP', label: 'GBP' },
];

interface DealFormData {
  title: string;
  companyId: string;
  contactId: string;
  stage: StageKey;
  probability: number;
  value: string;
  currency: string;
  expectedCloseDate: string;
  notes: string;
}

const INITIAL_FORM_DATA: DealFormData = {
  title: '',
  companyId: '',
  contactId: '',
  stage: 'Prospect',
  probability: 50,
  value: '',
  currency: 'USD',
  expectedCloseDate: '',
  notes: '',
};

export default function CRM() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DealFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dealsRes, companiesRes, contactsRes] = await Promise.all([
        supabase
          .from('crm_deals')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('companies')
          .select('*')
          .eq('user_id', user?.id)
          .order('name', { ascending: true }),
        supabase
          .from('contacts')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
      ]);

      if (dealsRes.error) throw dealsRes.error;
      if (companiesRes.error) throw companiesRes.error;
      if (contactsRes.error) throw contactsRes.error;

      setDeals(dealsRes.data || []);
      setCompanies(companiesRes.data || []);
      setContacts(contactsRes.data || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDealsByStage = (stage: StageKey) => {
    return deals.filter((deal) => deal.stage === stage);
  };

  const calculatePipelineStats = () => {
    let totalValue = 0;
    const stageCounts: Record<StageKey, number> = {
      Prospect: 0,
      Qualified: 0,
      Proposal: 0,
      Negotiation: 0,
      'Closed Won': 0,
      'Closed Lost': 0,
    };

    deals.forEach((deal) => {
      if (deal.stage !== 'Closed Lost') {
        totalValue += deal.value || 0;
      }
      stageCounts[deal.stage as StageKey] = (stageCounts[deal.stage as StageKey] || 0) + 1;
    });

    return { totalValue, stageCounts };
  };

  const getCompanyName = (companyId: string) => {
    return companies.find((c) => c.id === companyId)?.name || '未知';
  };

  const getContactName = (contactId: string | null) => {
    if (!contactId) return '-';
    const contact = contacts.find((c) => c.id === contactId);
    return contact ? `${contact.first_name} ${contact.last_name}` : '-';
  };

  const formatValue = (value: number | null, currency: string) => {
    if (!value) return '0';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
  };

  const getCardBorderColor = (value: number | null) => {
    if (!value) return 'border-red-500/40';
    if (value > 50000) return 'border-green-500/40';
    if (value >= 10000) return 'border-amber-500/40';
    return 'border-red-500/40';
  };

  const getDaysInStage = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleAddClick = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM_DATA);
    setShowModal(true);
  };

  const handleEditClick = (deal: CrmDeal) => {
    setEditingId(deal.id);
    setFormData({
      title: deal.title,
      companyId: deal.company_id || '',
      contactId: deal.contact_id || '',
      stage: deal.stage as StageKey,
      probability: deal.probability || 50,
      value: deal.value?.toString() || '',
      currency: deal.currency || 'USD',
      expectedCloseDate: deal.expected_close_date || '',
      notes: deal.notes || '',
    });
    setShowModal(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'probability') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.companyId || !formData.stage || !formData.value) {
      alert('请填写必填字段：商机名称、公司、阶段、商机金额');
      return;
    }

    try {
      setSaving(true);
      const dealData = {
        user_id: user?.id,
        title: formData.title,
        company_id: formData.companyId,
        contact_id: formData.contactId || null,
        stage: formData.stage,
        probability: formData.probability,
        value: parseFloat(formData.value),
        currency: formData.currency,
        expected_close_date: formData.expectedCloseDate || null,
        notes: formData.notes || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('crm_deals')
          .update(dealData)
          .eq('id', editingId)
          .eq('user_id', user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('crm_deals').insert([dealData]);

        if (error) throw error;
      }

      setShowModal(false);
      setFormData(INITIAL_FORM_DATA);
      await fetchData();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dealId: string) => {
    if (!confirm('确定要删除此商机吗？')) return;

    try {
      const { error } = await supabase
        .from('crm_deals')
        .delete()
        .eq('id', dealId)
        .eq('user_id', user?.id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const { totalValue, stageCounts } = calculatePipelineStats();

  if (loading) {
    return (
      <div className="page-header">
        <p className="text-gray-300">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="page-title">销售管道</h1>
          <p className="mt-2 text-sm text-gray-400">跟踪和管理您的销售机会</p>
        </div>

        {/* Pipeline Summary */}
        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-3 lg:grid-cols-7">
          <div className="glass-card p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">管道总金额</p>
            <p className="mt-2 text-2xl font-bold text-green-400">
              ${formatValue(totalValue, 'USD')}
            </p>
          </div>
          {STAGE_KEYS.map((stage) => (
            <div key={stage} className="glass-card p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{STAGE_MAP[stage]}</p>
              <p className="mt-2 text-2xl font-bold text-blue-300">{stageCounts[stage] || 0}</p>
            </div>
          ))}
        </div>

        {/* Kanban Board */}
        <div className="flex gap-6 pb-8 overflow-x-auto">
          {STAGE_KEYS.map((stage) => {
            const stageDealss = getDealsByStage(stage);
            return (
              <div key={stage} className="flex-shrink-0 w-96">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-blue-200">{STAGE_MAP[stage]}</h3>
                  <p className="text-sm text-gray-400 mt-1">{stageDealss.length} 个商机</p>
                </div>

                <div className="space-y-3 min-h-96">
                  {stageDealss.length === 0 ? (
                    <div className="glass-card p-6 text-center">
                      <p className="text-gray-400 text-sm">暂无商机</p>
                    </div>
                  ) : (
                    stageDealss.map((deal) => (
                      <div
                        key={deal.id}
                        className={`glass-card glass-card-hover border-l-4 ${getCardBorderColor(deal.value)} p-4 cursor-pointer`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-gray-100 text-sm flex-1 line-clamp-2">{deal.title}</h4>
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => handleEditClick(deal)}
                              className="text-blue-400 hover:text-blue-300 text-xs"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(deal.id)}
                              className="text-red-400 hover:text-red-300 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <p className="text-gray-300">
                            <span className="text-gray-400">公司：</span>
                            {getCompanyName(deal.company_id || '')}
                          </p>
                          <p className="text-gray-300">
                            <span className="text-gray-400">联系人：</span>
                            {getContactName(deal.contact_id)}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-blue-500/20">
                            <span className="text-green-400 font-semibold">
                              ${formatValue(deal.value, deal.currency)} {deal.currency}
                            </span>
                            <span className={`px-2 py-1 rounded text-white ${
                              deal.probability >= 75
                                ? 'bg-green-500/30'
                                : deal.probability >= 50
                                  ? 'bg-blue-500/30'
                                  : 'bg-red-500/30'
                            }`}>
                              {deal.probability}%
                            </span>
                          </div>

                          <p className="text-gray-400">
                            在该阶段 {getDaysInStage(deal.created_at)} 天
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Button */}
        <div className="fixed bottom-8 right-8">
          <button onClick={handleAddClick} className="btn-primary rounded-full w-14 h-14 flex items-center justify-center text-xl">
            +
          </button>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? '编辑商机' : '添加商机'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              商机名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              placeholder="输入商机名称"
              className="input-field w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                公司 <span className="text-red-400">*</span>
              </label>
              <select
                name="companyId"
                value={formData.companyId}
                onChange={handleFormChange}
                className="input-field w-full"
              >
                <option value="">选择公司</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">联系人</label>
              <select
                name="contactId"
                value={formData.contactId}
                onChange={handleFormChange}
                className="input-field w-full"
              >
                <option value="">选择联系人</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                阶段 <span className="text-red-400">*</span>
              </label>
              <select
                name="stage"
                value={formData.stage}
                onChange={handleFormChange}
                className="input-field w-full"
              >
                {STAGE_KEYS.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_MAP[stage]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">成交概率 ({formData.probability}%)</label>
              <input
                type="range"
                name="probability"
                min="0"
                max="100"
                step="5"
                value={formData.probability}
                onChange={handleFormChange}
                className="w-full h-2 bg-blue-900/30 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                商机金额 <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleFormChange}
                placeholder="输入金额"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">币种</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleFormChange}
                className="input-field w-full"
              >
                {CURRENCY_OPTIONS.map((curr) => (
                  <option key={curr.value} value={curr.value}>
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">预计成交日期</label>
            <input
              type="date"
              name="expectedCloseDate"
              value={formData.expectedCloseDate}
              onChange={handleFormChange}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">备注</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleFormChange}
              placeholder="输入备注信息"
              className="input-field w-full resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-6">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
              取消
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
