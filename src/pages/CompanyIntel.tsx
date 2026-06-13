import { useState, useEffect } from 'react';
import { supabase, Company } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { Search, Plus, Trash2, FileEdit as Edit2, ExternalLink, Users, TrendingUp, Loader, Globe } from 'lucide-react';

const INDUSTRIES = [
  { value: 'manufacturing', label: '制造业' },
  { value: 'electronics', label: '电子' },
  { value: 'medical-device', label: '医疗器械' },
  { value: 'furniture', label: '家具' },
  { value: 'chemical', label: '化工' },
  { value: 'new-energy', label: '新能源' },
  { value: 'trading', label: '贸易' },
  { value: 'robotics', label: '机器人' },
  { value: 'machinery', label: '机械' },
  { value: 'other', label: '其他' },
];

const EMPLOYEE_RANGES = [
  { value: '1-10', label: '1-10人' },
  { value: '11-50', label: '11-50人' },
  { value: '51-200', label: '51-200人' },
  { value: '201-500', label: '201-500人' },
  { value: '501-1000', label: '501-1000人' },
  { value: '1000+', label: '1000人以上' },
];

const COUNTRIES = [
  'China', 'United States', 'Germany', 'Japan', 'South Korea', 'India',
  'Vietnam', 'Thailand', 'Indonesia', 'Philippines', 'Mexico', 'Brazil',
  'Canada', 'United Kingdom', 'France', 'Italy', 'Spain', 'Netherlands',
  'Singapore', 'Malaysia', 'Taiwan', 'Hong Kong',
];

export default function CompanyIntel() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: '',
    country: '',
    city: '',
    employees: '',
    revenue: '',
    tags: '',
    description: '',
  });

  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load companies on mount
  useEffect(() => {
    if (user) {
      loadCompanies();
    }
  }, [user]);

  // Filter companies when search changes
  useEffect(() => {
    filterCompanies();
  }, [searchQuery, companies]);

  const loadCompanies = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data as Company[]);
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterCompanies = () => {
    if (!searchQuery.trim()) {
      setFilteredCompanies(companies);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = companies.filter(company =>
      company.name.toLowerCase().includes(query) ||
      (company.website && company.website.toLowerCase().includes(query)) ||
      (company.country && company.country.toLowerCase().includes(query)) ||
      (company.city && company.city.toLowerCase().includes(query))
    );
    setFilteredCompanies(filtered);
  };

  const getIndustryLabel = (industry: string) => {
    return INDUSTRIES.find(i => i.value === industry)?.label || industry;
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      name: '',
      website: '',
      industry: '',
      country: '',
      city: '',
      employees: '',
      revenue: '',
      tags: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setIsEditing(true);
    setEditingId(company.id);
    setFormData({
      name: company.name,
      website: company.website || '',
      industry: company.industry || '',
      country: company.country || '',
      city: company.city || '',
      employees: company.employees || '',
      revenue: company.revenue || '',
      tags: company.tags?.join(', ') || '',
      description: company.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !formData.name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        website: formData.website.trim() || null,
        industry: formData.industry || null,
        country: formData.country || null,
        city: formData.city.trim() || null,
        employees: formData.employees || null,
        revenue: formData.revenue.trim() || null,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        description: formData.description.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (isEditing && editingId) {
        const { error } = await supabase
          .from('companies')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('companies')
          .insert({
            user_id: user.id,
            ...payload,
          });

        if (error) throw error;
      }

      setIsModalOpen(false);
      await loadCompanies();
    } catch (err) {
      console.error('Failed to save company:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (companyId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
      setDeleteConfirm(null);
      await loadCompanies();
    } catch (err) {
      console.error('Failed to delete company:', err);
    }
  };

  const handleAddContact = (company: Company) => {
    // Placeholder for adding contact functionality
    alert(`添加联系人: ${company.name}`);
  };

  const handleCreateDeal = (company: Company) => {
    // Placeholder for creating deal functionality
    alert(`创建商机: ${company.name}`);
  };

  return (
    <div className="min-h-screen bg-navy-950">
      <div className="page-header px-6 py-4 border-b border-navy-800">
        <h1 className="page-title">公司情报</h1>
        <p className="text-navy-400 text-sm mt-1">管理和追踪潜在客户信息</p>
      </div>

      <div className="p-6">
        {/* Search & Action Bar */}
        <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
            <input
              type="text"
              placeholder="搜索公司名称、网址或地点..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <button
            onClick={openAddModal}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            添加公司
          </button>
        </div>

        {/* Companies Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-navy-400">加载中...</p>
            </div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-navy-400 mb-4">
              {searchQuery ? '没有找到匹配的公司' : '还没有公司，开始添加吧！'}
            </p>
            {!searchQuery && (
              <button
                onClick={openAddModal}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2"
              >
                <Plus className="w-4 h-4" />
                添加第一个公司
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.map(company => (
              <div key={company.id} className="glass-card-hover glass-card p-5 hover:border-blue-500/50 transition-all group">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg truncate group-hover:text-blue-400 transition-colors">
                      {company.name}
                    </h3>
                    {company.industry && (
                      <span className="badge-blue px-2 py-1 text-xs mt-2 inline-block">
                        {getIndustryLabel(company.industry)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(company)}
                      className="p-1.5 text-blue-500 hover:bg-blue-500/20 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(company.id)}
                      className="p-1.5 text-red-500 hover:bg-red-500/20 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="space-y-2 mb-4 text-sm">
                  {company.country && (
                    <div className="flex items-center gap-2 text-navy-300">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <span>{company.country}</span>
                      {company.city && <span className="text-navy-500">·</span>}
                      {company.city && <span>{company.city}</span>}
                    </div>
                  )}

                  {company.website && (
                    <div className="flex items-center gap-2">
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 truncate flex items-center gap-1"
                      >
                        网站
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {company.employees && (
                    <div className="flex items-center gap-2 text-navy-300">
                      <Users className="w-3.5 h-3.5 text-purple-500" />
                      <span>{company.employees}</span>
                    </div>
                  )}

                  {company.revenue && (
                    <div className="flex items-center gap-2 text-navy-300">
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                      <span>{company.revenue}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {company.tags && company.tags.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-navy-700/30">
                    <div className="flex flex-wrap gap-2">
                      {company.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="badge-slate px-2 py-1 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                      {company.tags.length > 3 && (
                        <span className="badge-slate px-2 py-1 text-xs rounded">
                          +{company.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {company.description && (
                  <p className="text-navy-300 text-xs mb-4 line-clamp-2">
                    {company.description}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddContact(company)}
                    className="flex-1 btn-secondary text-xs py-1.5 rounded"
                  >
                    添加联系人
                  </button>
                  <button
                    onClick={() => handleCreateDeal(company)}
                    className="flex-1 btn-primary text-xs py-1.5 rounded"
                  >
                    创建商机
                  </button>
                </div>

                {/* View Details Link */}
                <button className="w-full mt-2 text-blue-400 hover:text-blue-300 text-xs font-medium py-1.5 transition-colors">
                  查看详情 →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          title={isEditing ? '编辑公司' : '添加公司'}
          onClose={() => setIsModalOpen(false)}
          wide={true}
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
                disabled={saving || !formData.name.trim()}
                className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader className="w-4 h-4 animate-spin" />}
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="公司名称 *"
              value={formData.name}
              onChange={v => setFormData({ ...formData, name: v })}
              placeholder="输入公司名称"
            />
            <FormField
              label="网站"
              value={formData.website}
              onChange={v => setFormData({ ...formData, website: v })}
              placeholder="www.example.com"
            />
            <SelectField
              label="行业"
              value={formData.industry}
              onChange={v => setFormData({ ...formData, industry: v })}
              options={[{ value: '', label: '选择行业' }, ...INDUSTRIES]}
            />
            <SelectField
              label="国家"
              value={formData.country}
              onChange={v => setFormData({ ...formData, country: v })}
              options={[
                { value: '', label: '选择国家' },
                ...COUNTRIES.map(c => ({ value: c, label: c }))
              ]}
            />
            <FormField
              label="城市"
              value={formData.city}
              onChange={v => setFormData({ ...formData, city: v })}
              placeholder="输入城市"
            />
            <SelectField
              label="员工规模"
              value={formData.employees}
              onChange={v => setFormData({ ...formData, employees: v })}
              options={[{ value: '', label: '选择规模' }, ...EMPLOYEE_RANGES]}
            />
            <FormField
              label="营收规模"
              value={formData.revenue}
              onChange={v => setFormData({ ...formData, revenue: v })}
              placeholder="例如: ¥50M-100M"
            />
            <FormField
              label="标签"
              value={formData.tags}
              onChange={v => setFormData({ ...formData, tags: v })}
              placeholder="用逗号分隔，例如: 采购商,高端,活跃"
            />
          </div>
          <div>
            <label className="block text-navy-200 text-sm font-medium mb-1.5">公司简介</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="输入公司简介和备注..."
              className="input-field min-h-[100px] resize-none"
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
            <p className="text-navy-300">您确定要删除这个公司吗？此操作无法撤销。</p>
          </Modal>
        )}
      </div>
    </div>
  );
}
