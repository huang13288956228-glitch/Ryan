import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Followup, Contact, CrmDeal } from '../lib/supabase';

const TYPE_ICONS: Record<string, string> = {
  邮件: '✉️',
  电话: '☎️',
  会议: '📅',
  任务: '✓',
};

const TYPE_LABELS = ['邮件', '电话', '会议', '任务'];

export default function FollowupReminders() {
  const { user } = useAuth();

  // State
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: '邮件',
    description: '',
    contact_id: '',
    deal_id: '',
    due_at: '',
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

      // Fetch followups
      const { data: followupData, error: followupError } = await supabase
        .from('followups')
        .select('*')
        .eq('user_id', user?.id)
        .order('due_at', { ascending: true });

      if (followupError) throw followupError;
      setFollowups(followupData || []);

      // Fetch contacts
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id);

      if (contactError) throw contactError;
      setContacts(contactData || []);

      // Fetch deals
      const { data: dealData, error: dealError } = await supabase
        .from('crm_deals')
        .select('*')
        .eq('user_id', user?.id);

      if (dealError) throw dealError;
      setDeals(dealData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const categorizeReminders = (reminders: Followup[]) => {
    const overdue: Followup[] = [];
    const dueToday: Followup[] = [];
    const upcoming: Followup[] = [];

    reminders
      .filter(r => r.status !== '已完成')
      .forEach(reminder => {
        const dueDate = new Date(reminder.due_at);
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

        if (dueDateOnly < today) {
          overdue.push(reminder);
        } else if (dueDateOnly.getTime() === today.getTime()) {
          dueToday.push(reminder);
        } else if (dueDateOnly <= sevenDaysLater) {
          upcoming.push(reminder);
        }
      });

    return { overdue, dueToday, upcoming };
  };

  const { overdue, dueToday, upcoming } = categorizeReminders(followups);

  const stats = {
    已过期: overdue.length,
    今日到期: dueToday.length,
    即将到期: upcoming.length,
    已完成: followups.filter(f => f.status === '已完成').length,
  };

  // Get contact/deal names
  const getContactName = (contactId: string | null) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return '未知';
    return contact.first_name + ' ' + (contact.last_name || '');
  };

  const getDealName = (dealId: string | null) => {
    return deals.find(d => d.id === dealId)?.title || '未知';
  };

  // Handle add/edit
  const handleOpenModal = (followup?: Followup) => {
    if (followup) {
      setEditingId(followup.id);
      setFormData({
        type: followup.type || '邮件',
        description: followup.description || '',
        contact_id: followup.contact_id || '',
        deal_id: followup.deal_id || '',
        due_at: followup.due_at || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        type: '邮件',
        description: '',
        contact_id: '',
        deal_id: '',
        due_at: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      type: '邮件',
      description: '',
      contact_id: '',
      deal_id: '',
      due_at: '',
    });
  };

  const handleSave = async () => {
    try {
      setError(null);

      if (!formData.description || !formData.due_at) {
        setError('请填写所有必填字段');
        return;
      }

      const data = {
        ...formData,
        user_id: user?.id,
        status: editingId ? undefined : '待处理',
      };

      if (editingId) {
        const { error: err } = await supabase
          .from('followups')
          .update(data)
          .eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('followups')
          .insert([data]);
        if (err) throw err;
      }

      await fetchData();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('followups')
        .update({
          status: '已完成',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (err) throw err;
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    }
  };

  const handlePostpone = async (id: string) => {
    try {
      const reminder = followups.find(f => f.id === id);
      if (!reminder) return;

      const currentDue = new Date(reminder.due_at);
      const newDue = new Date(currentDue.getTime() + 24 * 60 * 60 * 1000);

      const { error: err } = await supabase
        .from('followups')
        .update({ due_at: newDue.toISOString() })
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
        .from('followups')
        .delete()
        .eq('id', id);
      if (err) throw err;
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const ReminderCard = ({ reminder, badgeColor }: { reminder: Followup; badgeColor: string }) => (
    <div className="glass-card p-4 mb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="text-2xl mt-1">{TYPE_ICONS[reminder.type || '邮件']}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium">{reminder.description}</p>
            <div className="flex gap-4 mt-2 text-sm text-gray-400">
              <span>👤 {getContactName(reminder.contact_id)}</span>
              <span>💼 {getDealName(reminder.deal_id)}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`badge-blue ${badgeColor} text-xs`}>
                {formatDateTime(reminder.due_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => handleComplete(reminder.id)}
            className="btn-primary text-sm px-3 py-1 whitespace-nowrap"
          >
            完成
          </button>
          <button
            onClick={() => handlePostpone(reminder.id)}
            className="btn-secondary text-sm px-3 py-1 whitespace-nowrap"
          >
            推迟
          </button>
          <button
            onClick={() => handleDelete(reminder.id)}
            className="text-red-400 hover:text-red-300 text-sm px-3 py-1"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="p-8 text-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="page-header mb-8">
          <h1 className="page-title">跟进提醒</h1>
          <p className="text-gray-400 mt-2">管理和跟踪您的跟进任务</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <div className="text-red-400 text-sm">已过期</div>
            <div className="text-3xl font-bold text-red-300 mt-2">{stats.已过期}</div>
          </div>
          <div className="stat-card">
            <div className="text-amber-400 text-sm">今日到期</div>
            <div className="text-3xl font-bold text-amber-300 mt-2">{stats.今日到期}</div>
          </div>
          <div className="stat-card">
            <div className="text-blue-400 text-sm">即将到期</div>
            <div className="text-3xl font-bold text-blue-300 mt-2">{stats.即将到期}</div>
          </div>
          <div className="stat-card">
            <div className="text-green-400 text-sm">已完成</div>
            <div className="text-3xl font-bold text-green-300 mt-2">{stats.已完成}</div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-300">
            {error}
          </div>
        )}

        {/* Add button */}
        <div className="mb-8">
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary"
          >
            + 添加提醒
          </button>
        </div>

        {/* Overdue Section */}
        {overdue.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
              🔴 已过期 ({overdue.length})
            </h2>
            <div>
              {overdue.map(reminder => (
                <ReminderCard key={reminder.id} reminder={reminder} badgeColor="badge-red" />
              ))}
            </div>
          </div>
        )}

        {/* Due Today Section */}
        {dueToday.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
              🟡 今日到期 ({dueToday.length})
            </h2>
            <div>
              {dueToday.map(reminder => (
                <ReminderCard key={reminder.id} reminder={reminder} badgeColor="badge-amber" />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
              🔵 即将到期 ({upcoming.length})
            </h2>
            <div>
              {upcoming.map(reminder => (
                <ReminderCard key={reminder.id} reminder={reminder} badgeColor="badge-blue" />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {overdue.length === 0 && dueToday.length === 0 && upcoming.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">暂无待处理提醒</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Modal isOpen={true} title={editingId ? '编辑提醒' : '添加提醒'} onClose={handleCloseModal}>
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingId ? '编辑提醒' : '添加提醒'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">类型 *</label>
                <div className="grid grid-cols-4 gap-2">
                  {TYPE_LABELS.map(type => (
                    <button
                      key={type}
                      onClick={() => setFormData(prev => ({ ...prev, type }))}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                        formData.type === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {TYPE_ICONS[type]} {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">描述 *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="input-field w-full"
                  placeholder="输入提醒描述..."
                />
              </div>

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
                <label className="block text-sm font-medium text-gray-300 mb-2">商机</label>
                <select
                  value={formData.deal_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
                  className="input-field w-full"
                >
                  <option value="">选择商机</option>
                  {deals.map(deal => (
                    <option key={deal.id} value={deal.id}>{deal.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">到期时间 *</label>
                <input
                  type="datetime-local"
                  value={formData.due_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_at: e.target.value }))}
                  className="input-field w-full"
                />
              </div>

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
