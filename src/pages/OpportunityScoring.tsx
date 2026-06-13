import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDeepseekAI } from '../hooks/useDeepseekAI';
import { Modal } from '../components/Modal';
import { CrmDeal, Company, Contact, Opportunity, ScoringFactor } from '../lib/supabase';

type StageKey = 'Prospect' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';

const STAGE_MAP: Record<StageKey, string> = {
  Prospect: '潜在客户',
  Qualified: '已认证',
  Proposal: '方案报价',
  Negotiation: '谈判中',
  'Closed Won': '成交',
  'Closed Lost': '已流失',
};

const RISK_LEVEL_MAP: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  low: 'badge-green',
  medium: 'badge-amber',
  high: 'badge-red',
};

interface ScoredOpportunity extends Opportunity {
  deal?: CrmDeal;
  company?: Company;
}

interface AIResponse {
  score: number;
  risk_level: 'low' | 'medium' | 'high';
  factors: ScoringFactor[];
  recommendation: string;
}

export default function OpportunityScoring() {
  const { user } = useAuth();
  const { loading: aiLoading, error: aiError, call: callAI } = useDeepseekAI();
  const [opportunities, setOpportunities] = useState<ScoredOpportunity[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState('');
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setPageLoading(true);
      const [opportunitiesRes, dealsRes, companiesRes, contactsRes] = await Promise.all([
        supabase
          .from('opportunities')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
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

      if (opportunitiesRes.error) throw opportunitiesRes.error;
      if (dealsRes.error) throw dealsRes.error;
      if (companiesRes.error) throw companiesRes.error;
      if (contactsRes.error) throw contactsRes.error;

      const oppsWithData = (opportunitiesRes.data || []).map((opp) => {
        const deal = (dealsRes.data || []).find((d) => d.id === opp.deal_id);
        const company = (companiesRes.data || []).find((c) => c.id === opp.company_id);
        return { ...opp, deal, company };
      });

      setOpportunities(oppsWithData);
      setDeals(dealsRes.data || []);
      setCompanies(companiesRes.data || []);
      setContacts(contactsRes.data || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const calculateStats = () => {
    if (opportunities.length === 0) {
      return { avgScore: 0, highPotential: 0, highRisk: 0 };
    }

    const scores = opportunities.map((opp) => opp.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const highPotential = opportunities.filter((opp) => opp.score >= 75).length;
    const highRisk = opportunities.filter((opp) => opp.risk_level === 'high').length;

    return { avgScore, highPotential, highRisk };
  };

  const getDeal = (dealId: string) => {
    return deals.find((d) => d.id === dealId);
  };

  const getCompany = (companyId: string) => {
    return companies.find((c) => c.id === companyId);
  };

  const getContactInfo = (contactId: string | null) => {
    if (!contactId) return '未知';
    const contact = contacts.find((c) => c.id === contactId);
    return contact
      ? `${contact.first_name} ${contact.last_name} (${contact.email})`
      : '未知';
  };

  const handleEvaluate = async () => {
    if (!selectedDealId) {
      alert('请选择一个商机');
      return;
    }

    const deal = getDeal(selectedDealId);
    if (!deal) return;

    try {
      setEvaluating(true);

      const contactInfo = getContactInfo(deal.contact_id);
      const payload = {
        dealTitle: deal.title,
        company: getCompany(deal.company_id)?.name || '',
        value: deal.value,
        stage: deal.stage,
        notes: deal.notes || '',
        contactInfo,
      };

      const response = await callAI({
        task: 'score_opportunity',
        payload,
      });

      if (!response) {
        alert('评估失败，请重试');
        return;
      }

      let aiData: AIResponse;
      try {
        aiData = JSON.parse(response);
      } catch {
        console.error('AI response parse error:', response);
        alert('AI响应解析失败，请重试');
        return;
      }

      const { error } = await supabase.from('opportunities').insert([
        {
          user_id: user?.id,
          deal_id: selectedDealId,
          company_id: deal.company_id,
          score: aiData.score,
          risk_level: aiData.risk_level,
          factors: aiData.factors || [],
          recommendation: aiData.recommendation,
        },
      ]);

      if (error) throw error;

      setShowModal(false);
      setSelectedDealId('');
      await fetchData();
    } catch (error) {
      console.error('评估失败:', error);
      alert('评估失败，请重试');
    } finally {
      setEvaluating(false);
    }
  };

  const handleDelete = async (opportunityId: string) => {
    if (!confirm('确定要删除此评估吗？')) return;

    try {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', opportunityId)
        .eq('user_id', user?.id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const renderScoreCircle = (score: number) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <svg width="120" height="120" className="transform -rotate-90">
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="rgba(100, 116, 139, 0.3)"
          strokeWidth="3"
        />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.35s ease' }}
        />
        <text
          x="60"
          y="65"
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fill={getScoreColor(score)}
        >
          {score}
        </text>
      </svg>
    );
  };

  const stats = calculateStats();

  if (pageLoading) {
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
          <h1 className="page-title">商机评分</h1>
          <p className="mt-2 text-sm text-gray-400">使用AI对商机进行智能评估和风险分析</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="stat-card">
            <p className="text-gray-400 text-sm">平均评分</p>
            <p className="text-3xl font-bold text-blue-300 mt-2">{stats.avgScore}</p>
          </div>
          <div className="stat-card">
            <p className="text-gray-400 text-sm">高潜力 (≥75)</p>
            <p className="text-3xl font-bold text-green-400 mt-2">{stats.highPotential}</p>
          </div>
          <div className="stat-card">
            <p className="text-gray-400 text-sm">高风险</p>
            <p className="text-3xl font-bold text-red-400 mt-2">{stats.highRisk}</p>
          </div>
        </div>

        {/* Opportunities */}
        {opportunities.length === 0 ? (
          <div className="glass-card text-center py-12">
            <p className="text-gray-400 mb-4">暂无评估记录</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              + 评估商机
            </button>
          </div>
        ) : (
          <div className="grid gap-6 mb-8">
            {opportunities.map((opp) => {
              const deal = opp.deal;
              const company = opp.company;

              return (
                <div key={opp.id} className="glass-card glass-card-hover p-6">
                  <div className="flex gap-6">
                    {/* Score Circle */}
                    <div className="flex-shrink-0 flex items-center justify-center">
                      {renderScoreCircle(opp.score)}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-100">{deal?.title || '未知'}</h3>
                          <p className="text-sm text-gray-400 mt-1">{company?.name || '未知'}</p>
                        </div>
                        <div className="flex gap-2">
                          <span className={`${RISK_LEVEL_COLORS[opp.risk_level]}`}>
                            {RISK_LEVEL_MAP[opp.risk_level]}
                          </span>
                          <button
                            onClick={() => handleDelete(opp.id)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                          >
                            删除
                          </button>
                        </div>
                      </div>

                      {/* Deal Info */}
                      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-gray-400">阶段</p>
                          <p className="text-gray-200 mt-1">
                            {deal?.stage ? STAGE_MAP[deal.stage as StageKey] : '未知'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">金额</p>
                          <p className="text-green-400 font-semibold mt-1">
                            ${deal?.value ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(deal.value) : '0'} {deal?.currency || 'USD'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">概率</p>
                          <p className="text-blue-300 font-semibold mt-1">{deal?.probability || 0}%</p>
                        </div>
                      </div>

                      {/* Factors */}
                      {opp.factors && opp.factors.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-400 mb-2">评估因素</p>
                          <div className="space-y-2">
                            {opp.factors.map((factor, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                <span className="text-sm text-gray-300 flex-1">
                                  {typeof factor === 'string' ? factor : factor.name || ''}
                                </span>
                                <div className="w-24 bg-slate-700/50 rounded h-2">
                                  <div
                                    className={`h-2 rounded ${
                                      typeof factor === 'string'
                                        ? 'bg-blue-500/50'
                                        : factor.score >= 75
                                          ? 'bg-green-500'
                                          : factor.score >= 50
                                            ? 'bg-amber-500'
                                            : 'bg-red-500'
                                    }`}
                                    style={{
                                      width: `${
                                        typeof factor === 'string' ? 50 : Math.min(factor.score || 0, 100)
                                      }%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendation */}
                      {opp.recommendation && (
                        <div className="pt-4 border-t border-blue-500/20">
                          <p className="text-sm text-gray-400 mb-2">建议</p>
                          <p className="text-sm text-gray-200">{opp.recommendation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Button */}
        <div className="flex justify-center">
          <button onClick={() => setShowModal(true)} className="btn-primary">
            + 评估商机
          </button>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="评估商机">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              选择商机 <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedDealId}
              onChange={(e) => setSelectedDealId(e.target.value)}
              className="input-field w-full"
            >
              <option value="">选择商机</option>
              {deals
                .filter((deal) => !opportunities.some((opp) => opp.deal_id === deal.id))
                .map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title} - {getCompany(deal.company_id)?.name || '未知'}
                  </option>
                ))}
            </select>
          </div>

          {selectedDealId && (
            <div className="glass-card p-4 space-y-2 text-sm">
              {(() => {
                const deal = getDeal(selectedDealId);
                if (!deal) return null;

                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">商机名称</span>
                      <span className="text-gray-200">{deal.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">公司</span>
                      <span className="text-gray-200">{getCompany(deal.company_id)?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">金额</span>
                      <span className="text-green-400 font-semibold">
                        ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(deal.value || 0)} {deal.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">阶段</span>
                      <span className="text-gray-200">{STAGE_MAP[deal.stage as StageKey]}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {aiError && (
            <div className="glass-card p-4 bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm">{aiError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-6">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1" disabled={evaluating || aiLoading}>
              取消
            </button>
            <button
              onClick={handleEvaluate}
              disabled={evaluating || aiLoading || !selectedDealId}
              className="btn-primary flex-1"
            >
              {evaluating || aiLoading ? '评估中...' : '开始评估'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
