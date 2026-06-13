import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDeepseekAI } from '../hooks/useDeepseekAI';
import { Modal } from '../components/Modal';
import { MarketResearch as MarketResearchType, Finding, DataSource } from '../lib/supabase';
import { Search, Plus, Zap, ChevronDown, AlertCircle } from 'lucide-react';

interface ResearchCardData extends MarketResearchType {
  findings: Finding[];
  data_sources: DataSource[];
}

const REGIONS = ['北美', '欧洲', '亚太', '拉丁美洲', '中东', '非洲'];
const INDUSTRIES = [
  '制造业',
  '电子',
  '医疗器械',
  '家具',
  '化工',
  '新能源',
  '贸易',
  '机器人',
  '机械',
  '其他',
];

export default function MarketResearch() {
  const { user } = useAuth();
  const { loading: aiLoading, error: aiError, call: callAI } = useDeepseekAI();
  const [research, setResearch] = useState<ResearchCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    topic: '',
    region: '',
    industry: '',
  });

  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchResearch();
    }
  }, [user]);

  const fetchResearch = async () => {
    try {
      const { data, error } = await supabase
        .from('market_research')
        .select(
          `
          *,
          findings:research_findings(*),
          data_sources:research_data_sources(*)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResearch(data || []);
    } catch (error) {
      console.error('Error fetching research:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWithAI = async () => {
    if (!formData.topic || !formData.region || !formData.industry) {
      alert('请填写所有必填字段');
      return;
    }

    setAiGenerating(true);
    try {
      const result = await callAI({
        task: 'market_research',
        payload: {
          topic: formData.topic,
          region: formData.region,
          industry: formData.industry,
        },
      });

      const parsed = JSON.parse(result);
      setFormData((prev) => ({
        ...prev,
        ...parsed,
      }));
    } catch (error) {
      console.error('AI generation error:', error);
      alert('AI 生成失败，请重试');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveResearch = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: researchData, error: researchError } = await supabase
        .from('market_research')
        .insert([
          {
            topic: formData.topic,
            region: formData.region,
            industry: formData.industry,
            summary: (formData as any).summary || '',
            user_id: user?.id,
          },
        ])
        .select();

      if (researchError) throw researchError;

      const researchId = researchData[0].id;

      // Save findings
      if ((formData as any).findings && Array.isArray((formData as any).findings)) {
        const findings = ((formData as any).findings as any[]).map((f) => ({
          research_id: researchId,
          title: f.title || '',
          detail: f.detail || f.finding_text || f,
          significance: f.significance || 'medium',
        }));

        const { error: findingsError } = await supabase
          .from('research_findings')
          .insert(findings);

        if (findingsError) throw findingsError;
      }

      // Save data sources
      if ((formData as any).data_sources && Array.isArray((formData as any).data_sources)) {
        const sources = ((formData as any).data_sources as any[]).map((s) => ({
          research_id: researchId,
          name: s.name || s.source_name || s,
          url: s.url || s.source_url || '',
          accessed_at: new Date().toISOString(),
        }));

        const { error: sourcesError } = await supabase
          .from('research_data_sources')
          .insert(sources);

        if (sourcesError) throw sourcesError;
      }

      await fetchResearch();
      setShowModal(false);
      setFormData({ topic: '', region: '', industry: '' });
    } catch (error) {
      console.error('Error saving research:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDeleteResearch = async (id: string) => {
    if (!confirm('确认删除此研究记录？')) return;

    try {
      const { error } = await supabase
        .from('market_research')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setResearch(research.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting research:', error);
    }
  };

  const getSignificanceColor = (significance: string) => {
    const colors: Record<string, string> = {
      '高': 'badge-red',
      '中': 'badge-amber',
      '低': 'badge-green',
    };
    return colors[significance] || 'badge-slate';
  };

  const filteredResearch = research.filter((r) =>
    r.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-slate-600 border-t-blue-400 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="page-title text-4xl font-bold text-white mb-2">市场调研</h1>
          <p className="text-slate-400">发现市场机会，研究行业趋势</p>
        </div>

        {/* Search and Actions */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
              size={20}
            />
            <input
              type="text"
              placeholder="搜索调研主题..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={20} />
            新建调研
          </button>
        </div>

        {/* Research Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResearch.length === 0 ? (
            <div className="col-span-full glass-card p-12 text-center">
              <AlertCircle className="mx-auto mb-4 text-slate-500" size={48} />
              <p className="text-slate-400">
                {searchTerm ? '未找到匹配的调研记录' : '暂无调研记录'}
              </p>
            </div>
          ) : (
            filteredResearch.map((item) => (
              <div
                key={item.id}
                className="glass-card-hover p-6 cursor-pointer transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                      {item.topic}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="badge-blue">{item.region}</span>
                      <span className="badge-purple">{item.industry}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteResearch(item.id);
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    删除
                  </button>
                </div>

                <p className="text-slate-300 text-sm line-clamp-2 mb-4">
                  {item.summary || '暂无摘要'}
                </p>

                <div className="text-slate-500 text-xs mb-4">
                  {item.findings && item.findings.length > 0 && (
                    <span>发现 {item.findings.length} 条</span>
                  )}
                  {item.findings && item.findings.length > 0 && item.data_sources && item.data_sources.length > 0 && (
                    <span> · </span>
                  )}
                  {item.data_sources && item.data_sources.length > 0 && (
                    <span>数据源 {item.data_sources.length}</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                  <span className="text-slate-500 text-xs">
                    {formatDate(item.created_at)}
                  </span>
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === item.id ? null : item.id)
                    }
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs transition-colors"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${
                        expandedId === item.id ? 'rotate-180' : ''
                      }`}
                    />
                    详情
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedId === item.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                    {item.summary && (
                      <div>
                        <p className="text-slate-400 text-xs font-semibold mb-2">
                          摘要
                        </p>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap">
                          {item.summary}
                        </p>
                      </div>
                    )}

                    {item.findings && item.findings.length > 0 && (
                      <div>
                        <p className="text-slate-400 text-xs font-semibold mb-2">
                          主要发现
                        </p>
                        <div className="space-y-2">
                          {item.findings.map((finding, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-800/50 p-2 rounded text-sm text-slate-300 flex items-start gap-2"
                            >
                              <span
                                className={`badge-sm ${getSignificanceColor(
                                  finding.significance
                                )}`}
                              >
                                {finding.significance}
                              </span>
                              <span className="flex-1">
                                {finding.detail}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.data_sources && item.data_sources.length > 0 && (
                      <div>
                        <p className="text-slate-400 text-xs font-semibold mb-2">
                          数据来源
                        </p>
                        <div className="space-y-1">
                          {item.data_sources.map((source, idx) => (
                            <div key={idx} className="text-xs text-slate-400">
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  {source.name}
                                </a>
                              ) : (
                                <span>{source.name}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Research Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFormData({ topic: '', region: '', industry: '' });
        }}
        title="新建调研"
      >
        <form onSubmit={handleSaveResearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              调研主题 *
            </label>
            <input
              type="text"
              required
              value={formData.topic}
              onChange={(e) =>
                setFormData({ ...formData, topic: e.target.value })
              }
              className="input-field"
              placeholder="输入调研主题"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                地区 *
              </label>
              <select
                required
                value={formData.region}
                onChange={(e) =>
                  setFormData({ ...formData, region: e.target.value })
                }
                className="input-field"
              >
                <option value="">选择地区</option>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                行业 *
              </label>
              <select
                required
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                className="input-field"
              >
                <option value="">选择行业</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AI Generation Section */}
          <div className="bg-blue-950/30 border border-blue-900 rounded-lg p-4">
            <button
              type="button"
              onClick={generateWithAI}
              disabled={aiLoading || aiGenerating || !formData.topic || !formData.region || !formData.industry}
              className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiGenerating ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  生成中...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  AI 生成调研
                </>
              )}
            </button>
            {aiError && (
              <p className="text-red-400 text-xs mt-2">{aiError}</p>
            )}
            {(formData as any).summary && (
              <div className="mt-3 text-xs text-blue-300">
                ✓ AI 已生成内容
              </div>
            )}
          </div>

          {/* Summary */}
          {(formData as any).summary && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                摘要
              </label>
              <textarea
                value={(formData as any).summary}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    summary: e.target.value,
                  } as any)
                }
                className="input-field min-h-[100px] resize-none"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={!formData.topic || !formData.region || !formData.industry}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存调研
            </button>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setFormData({ topic: '', region: '', industry: '' });
              }}
              className="btn-secondary flex-1"
            >
              取消
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
