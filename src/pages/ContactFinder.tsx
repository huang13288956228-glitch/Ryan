import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Company, Contact } from '../lib/supabase';

interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  jobTitle: string;
  department: string;
  companyId: string;
  tags: string;
  notes: string;
}

const DEPARTMENT_OPTIONS = [
  { value: '销售', label: '销售' },
  { value: '市场', label: '市场' },
  { value: '运营', label: '运营' },
  { value: '财务', label: '财务' },
  { value: '工程', label: '工程' },
  { value: '人力资源', label: '人力资源' },
  { value: '高管', label: '高管' },
  { value: '供应链', label: '供应链' },
  { value: '质量保证', label: '质量保证' },
  { value: '研发', label: '研发' },
  { value: '客户服务', label: '客户服务' },
  { value: '物流', label: '物流' },
  { value: '其他', label: '其他' },
];

const INITIAL_FORM_DATA: ContactFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  linkedinUrl: '',
  jobTitle: '',
  department: '',
  companyId: '',
  tags: '',
  notes: '',
};

export default function ContactFinder() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contactsRes, companiesRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('companies')
          .select('*')
          .eq('user_id', user?.id)
          .order('name', { ascending: true }),
      ]);

      if (contactsRes.error) throw contactsRes.error;
      if (companiesRes.error) throw companiesRes.error;

      setContacts(contactsRes.data || []);
      setCompanies(companiesRes.data || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.phone && contact.phone.includes(searchQuery));

    const matchesCompany = !selectedCompanyId || contact.company_id === selectedCompanyId;

    return matchesSearch && matchesCompany;
  });

  const handleAddClick = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM_DATA);
    setShowModal(true);
  };

  const handleEditClick = (contact: Contact) => {
    setEditingId(contact.id);
    setFormData({
      firstName: contact.first_name,
      lastName: contact.last_name,
      email: contact.email,
      phone: contact.phone || '',
      linkedinUrl: contact.linkedin_url || '',
      jobTitle: contact.job_title || '',
      department: contact.department || '',
      companyId: contact.company_id || '',
      tags: contact.tags?.join(', ') || '',
      notes: contact.notes || '',
    });
    setShowModal(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.companyId) {
      alert('请填写必填字段：名、姓、邮箱、公司');
      return;
    }

    try {
      setSaving(true);
      const contactData = {
        user_id: user?.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        linkedin_url: formData.linkedinUrl || null,
        job_title: formData.jobTitle || null,
        department: formData.department || null,
        company_id: formData.companyId,
        tags: formData.tags ? formData.tags.split(',').map((tag) => tag.trim()) : [],
        notes: formData.notes || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', editingId)
          .eq('user_id', user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('contacts').insert([contactData]);

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

  const handleDelete = async (contactId: string) => {
    if (!confirm('确定要删除此联系人吗？')) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', user?.id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const getCompanyName = (companyId: string) => {
    return companies.find((c) => c.id === companyId)?.name || '未知';
  };

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
          <h1 className="page-title">联系人管理</h1>
          <p className="mt-2 text-sm text-gray-400">管理您的商业联系人和潜在客户信息</p>
        </div>

        {/* Controls */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">搜索联系人</label>
              <input
                type="text"
                placeholder="搜索姓名、邮箱或电话..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">筛选公司</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="input-field w-full"
              >
                <option value="">全部公司</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={handleAddClick} className="btn-primary whitespace-nowrap">
            + 添加联系人
          </button>
        </div>

        {/* Table */}
        {filteredContacts.length === 0 ? (
          <div className="glass-card text-center py-12">
            <p className="text-gray-400">暂无联系人记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header border-b border-blue-500/20">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-blue-200">姓名</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-blue-200">邮箱</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-blue-200">电话</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-blue-200">公司</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-blue-200">职位</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-blue-200">LinkedIn</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-blue-200">标签</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-blue-200">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="table-row border-b border-blue-500/10 hover:bg-blue-500/5">
                    <td className="table-cell px-6 py-4">
                      {contact.first_name} {contact.last_name}
                    </td>
                    <td className="table-cell px-6 py-4 text-blue-300">{contact.email}</td>
                    <td className="table-cell px-6 py-4">{contact.phone || '-'}</td>
                    <td className="table-cell px-6 py-4">{getCompanyName(contact.company_id)}</td>
                    <td className="table-cell px-6 py-4">{contact.job_title || '-'}</td>
                    <td className="table-cell px-6 py-4">
                      {contact.linkedin_url ? (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          查看
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="table-cell px-6 py-4">
                      {contact.tags && contact.tags.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {contact.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="badge-blue text-xs">
                              {tag}
                            </span>
                          ))}
                          {contact.tags.length > 2 && (
                            <span className="badge-slate text-xs">+{contact.tags.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="table-cell px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(contact)}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="text-red-400 hover:text-red-300 text-sm font-medium"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? '编辑联系人' : '添加联系人'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleFormChange}
                placeholder="输入名字"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                姓 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleFormChange}
                placeholder="输入姓氏"
                className="input-field w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              邮箱 <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              placeholder="输入邮箱地址"
              className="input-field w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">电话</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                placeholder="输入电话号码"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">LinkedIn主页</label>
              <input
                type="url"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleFormChange}
                placeholder="https://linkedin.com/in/..."
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">职位</label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleFormChange}
                placeholder="输入职位"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">部门</label>
              <select name="department" value={formData.department} onChange={handleFormChange} className="input-field w-full">
                <option value="">选择部门</option>
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              公司 <span className="text-red-400">*</span>
            </label>
            <select name="companyId" value={formData.companyId} onChange={handleFormChange} className="input-field w-full">
              <option value="">选择公司</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">标签</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleFormChange}
              placeholder="使用逗号分隔多个标签"
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
