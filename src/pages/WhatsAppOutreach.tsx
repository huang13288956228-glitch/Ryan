import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDeepseekAI } from '../hooks/useDeepseekAI';
import { Modal } from '../components/Modal';
import { WhatsappOutreach, Contact } from '../lib/supabase';

export default function WhatsAppOutreach() {
  const { user } = useAuth();
  const { loading: aiLoading, error: aiError, call: callAI } = useDeepseekAI();

  // State
  const [outreaches, setOutreaches] = useState<WhatsappOutreach[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [generating, setGenerating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    contact_id: '',
    phone: '',
    campaign: '',
    message_template: '',
    notes: '',
  });

  // Fetch data
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch outreaches
      const { data: outreachData, error: outreachError } = await supabase
        .from('whatsapp_outreach')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (outreachError) throw outreachError;
      setOutreaches(outreachData || []);

      // Fetch contacts
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id);

      if (contactError) throw contactError;
      setContacts(contactData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    总联系数: outreaches.length,
    已发送: outreaches.filter(o => o.status === '已发送').length,
    已送达: outreaches.filter(o => o.status === '已送达').length,
    已回复: outreaches.filter(o => o.status === '已回复').length,
  };

  // Filter outreaches
  const filteredOutreaches = outreaches.filter(o => {
    const campaign = campaignFilter ? o.campaign === campaignFilter : true;
    const search = searchTerm
      ? o.message_template?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.phone?.includes(searchTerm) ||
        contacts.find(c => c.id === o.contact_id)?.first_name?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return campaign && search;
  });

  // Get campaigns list
  const campaigns = Array.from(new Set(outreaches.map(o => o.campaign).filter((c): c is string => !!c)));

  // Get contact name
  const getContactName = (contactId: string | null) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return '未知';
    return contact.first_name + ' ' + (contact.last_name || '');
  };

  // Handle add/edit
  const handleOpenModal = (outreach?: WhatsappOutreach) => {
    if (outreach) {
      setEditingId(outreach.id);
      setFormData({
        contact_id: outreach.contact_id || '',
        phone: outreach.phone || '',
        campaign: outreach.campaign || '',
        message_template: outreach.message_template || '',
        notes: outreach.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        contact_id: '',
        phone: '',
        campaign: '',
        message_template: '',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      contact_id: '',
      phone: '',
      campaign: '',
      message_template: '',
      notes: '',
    });
  };

  const handleGenerateMessage = async () => {
    try {
      setGenerating(true);
      const aiResponse = await callAI({
        task: 'whatsapp_message',
        payload: {
          contactName: getContactName(formData.contact_id),
          purpose: formData.campaign || 'Introduce and explore collaboration',
        },
      });

      const parsed = JSON.parse(aiResponse);
      setFormData(prev => ({
        ...prev,
        message_template: parsed.message_template || prev.message_template,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      setError(null);

      if (!formData.contact_id || !formData.phone || !formData.message_template) {
        setError('请填写所有必填字段');
        return;
      }

      const data = {
        ...formData,
        user_id: user?.id,
        status: editingId ? undefined : '待发送',
      };

      if (editingId) {
        const { error: err } = await supabase
          .from('whatsapp_outreach')
          .update(data)
          .eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('whatsapp_outreach')
          .insert([data]);
        if (err) throw err;
      }

      await fetchData();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const { error: err } = await supabase
        .from('whatsapp_outreach')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw err;
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除?')) return;
    try {
      const { error: err } = await supabase
        .from('whatsapp_outreach')
        .delete()
        .eq('id', id);
      if (err) throw err;
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      待发送: 'badge-slate',
      已发送: 'badge-blue',
      已送达: 'badge-green',
      已回复: 'badge-purple',
      发送失败: 'badge-red',
    };
    return colors[status] || 'badge-slate';
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="page-header mb-8">
          <h1 className="page-title">WhatsApp 联系</h1>
          <p className="text-gray-400 mt-2">管理您的 WhatsApp 营销活动</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Object.entries(stats).map(([label, value]) => (
            <div key={label} className="stat-card">
              <div className="text-gray-400 text-sm">{label}</div>
              <div className="text-3xl font-bold text-white mt-2">{value}</div>
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-300">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="glass-card mb-6 p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">搜索</label>
              <input
                type="text"
                placeholder="搜索联系人、电话或消息..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">活动</label>
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="input-field w-full"
              >
                <option value="">全部活动</option>
                {campaigns.map(campaign => (
                  <option key={campaign} value={campaign}>{campaign}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => handleOpenModal()}
                className="btn-primary w-full"
              >
                + 添加联系
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">联系人</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">电话</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">活动名称</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">状态</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">消息模板</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">最近消息</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutreaches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  filteredOutreaches.map((outreach) => (
                    <tr key={outreach.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                      <td className="px-6 py-4 text-sm text-white">{getContactName(outreach.contact_id)}</td>
                      <td className="px-6 py-4 text-sm text-blue-400">{outreach.phone}</td>
                      <td className="px-6 py-4 text-sm text-white">{outreach.campaign}</td>
                      <td className="px-6 py-4">
                        <span className={`badge-blue ${getStatusBadgeColor(outreach.status || '')}`}>
                          {outreach.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 truncate max-w-xs">
                        {outreach.message_template?.slice(0, 30)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {outreach.last_message ? new Date(outreach.last_message).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(outreach)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(outreach.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Modal isOpen={true} title={editingId ? '编辑联系' : '添加联系'} onClose={handleCloseModal}>
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingId ? '编辑联系' : '添加联系'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">联系人</label>
                <select
                  value={formData.contact_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_id: e.target.value }))}
                  className="input-field w-full"
                >
                  <option value="">选择联系人</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>{contact.first_name + ' ' + (contact.last_name || '')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">电话号码 *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+86 188 8888 8888"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">活动名称</label>
                <input
                  type="text"
                  value={formData.campaign}
                  onChange={(e) => setFormData(prev => ({ ...prev, campaign: e.target.value }))}
                  placeholder="例：产品推介"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">消息模板 *</label>
                <textarea
                  value={formData.message_template}
                  onChange={(e) => setFormData(prev => ({ ...prev, message_template: e.target.value }))}
                  rows={4}
                  className="input-field w-full"
                  placeholder="输入 WhatsApp 消息模板..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">备注</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="任何其他信息..."
                  className="input-field w-full"
                />
              </div>

              <button
                onClick={handleGenerateMessage}
                disabled={generating || aiLoading}
                className="btn-secondary w-full"
              >
                {generating || aiLoading ? '生成中...' : '✨ AI生成消息'}
              </button>

              {aiError && (
                <div className="bg-red-900/20 border border-red-500/30 rounded p-3 text-red-300 text-sm">
                  {aiError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className="btn-primary flex-1"
                >
                  保存
                </button>
                <button
                  onClick={handleCloseModal}
                  className="btn-secondary flex-1"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
