import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Meeting } from '../lib/supabase';
import { ChevronDown, Plus, Clock, MapPin, User, AlertCircle } from 'lucide-react';

export default function MeetingAssistant() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'details'>('upcoming');

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    duration: 30,
    location: '',
    contact_id: '',
    deal_id: '',
    agenda: '',
    attendees: '',
  });

  const [contacts, setContacts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchMeetings();
      fetchContacts();
      fetchDeals();
    }
  }, [user]);

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .order('first_name');
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchDeals = async () => {
    try {
      const { data } = await supabase
        .from('crm_deals')
        .select('id, title')
        .order('title');
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  };

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const meetingDateTime = new Date(`${formData.date}T${formData.time}`).toISOString();

      const { data, error } = await supabase
        .from('meetings')
        .insert([
          {
            title: formData.title,
            scheduled_at: meetingDateTime,
            duration_min: formData.duration,
            location: formData.location,
            contact_id: formData.contact_id || null,
            deal_id: formData.deal_id || null,
            agenda: formData.agenda,
            participants: formData.attendees ? formData.attendees.split(',').map(p => p.trim()) : [],
            status: '已安排',
            user_id: user?.id,
          },
        ])
        .select();

      if (error) throw error;

      setMeetings([...meetings, data[0]]);
      setShowModal(false);
      setFormData({
        title: '',
        date: '',
        time: '',
        duration: 30,
        location: '',
        contact_id: '',
        deal_id: '',
        agenda: '',
        attendees: '',
      });
    } catch (error) {
      console.error('Error adding meeting:', error);
    }
  };

  const handleUpdateMeetingStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('meetings')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setMeetings(
        meetings.map((m) => (m.id === id ? { ...m, status } : m))
      );
    } catch (error) {
      console.error('Error updating meeting:', error);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMeetings(meetings.filter((m) => m.id !== id));
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  };

  const getStatsData = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = meetings.filter(
      (m) => new Date(m.scheduled_at) >= tomorrow && m.status !== '已取消'
    ).length;

    const todayCount = meetings.filter((m) => {
      const mDate = new Date(m.scheduled_at);
      return mDate >= today && mDate < tomorrow && m.status !== '已取消';
    }).length;

    const completed = meetings.filter((m) => m.status === '已完成').length;
    const total = meetings.length;

    return [
      { label: '即将开始', value: upcoming, color: 'bg-blue-500/20 text-blue-300' },
      { label: '今天', value: todayCount, color: 'bg-amber-500/20 text-amber-300' },
      { label: '已完成', value: completed, color: 'bg-green-500/20 text-green-300' },
      { label: '总计', value: total, color: 'bg-slate-500/20 text-slate-300' },
    ];
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      '已安排': 'badge-blue',
      '进行中': 'badge-amber',
      '已完成': 'badge-green',
      '已取消': 'badge-red',
    };
    return colors[status] || 'badge-slate';
  };

  const stats = getStatsData();

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-slate-600 border-t-blue-400 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="page-title text-4xl font-bold text-white mb-2">会议助手</h1>
          <p className="text-slate-400">管理您的商务会议和后续跟进</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card p-6">
              <p className="text-slate-400 text-sm mb-2">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Add Meeting Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={20} />
            安排会议
          </button>
        </div>

        {/* Meetings List */}
        <div className="space-y-4">
          {meetings.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <AlertCircle className="mx-auto mb-4 text-slate-500" size={48} />
              <p className="text-slate-400">暂无会议记录</p>
            </div>
          ) : (
            meetings.map((meeting) => (
              <div key={meeting.id} className="glass-card-hover p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{meeting.title}</h3>
                      <span className={`badge-${getStatusColor(meeting.status).split('-')[1]}`}>
                        {meeting.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-slate-400 text-sm mb-3">
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        {formatTime(meeting.scheduled_at)}
                      </div>
                      {meeting.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          {meeting.location}
                        </div>
                      )}
                      <div className="text-slate-500">
                        时长: {meeting.duration_min} 分钟
                      </div>
                    </div>
                    {meeting.participants && meeting.participants.length > 0 && (
                      <div className="flex items-center gap-1 text-slate-400 text-sm">
                        <User size={16} />
                        {meeting.participants.join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Status Actions */}
                  <div className="ml-4 flex gap-2">
                    <select
                      value={meeting.status}
                      onChange={(e) =>
                        handleUpdateMeetingStatus(meeting.id, e.target.value)
                      }
                      className="input-field text-sm py-1 px-2 text-slate-300"
                    >
                      <option>已安排</option>
                      <option>进行中</option>
                      <option>已完成</option>
                      <option>已取消</option>
                    </select>
                    <button
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      className="btn-danger py-1 px-3 text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* Expandable Details */}
                <button
                  onClick={() =>
                    setExpandedMeeting(
                      expandedMeeting === meeting.id ? null : meeting.id
                    )
                  }
                  className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      expandedMeeting === meeting.id ? 'rotate-180' : ''
                    }`}
                  />
                  {expandedMeeting === meeting.id ? '隐藏详情' : '查看详情'}
                </button>

                {expandedMeeting === meeting.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                    {meeting.agenda && (
                      <div>
                        <p className="text-slate-400 text-sm font-semibold mb-1">议程</p>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap">
                          {meeting.agenda}
                        </p>
                      </div>
                    )}
                    {meeting.notes && (
                      <div>
                        <p className="text-slate-400 text-sm font-semibold mb-1">会议记录</p>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap">
                          {meeting.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Meeting Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="安排会议"
      >
        <form onSubmit={handleAddMeeting} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              会议主题 *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input-field"
              placeholder="输入会议主题"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                日期 *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                时间 *
              </label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                时长
              </label>
              <select
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: Number(e.target.value) })
                }
                className="input-field"
              >
                <option value={15}>15 分钟</option>
                <option value={30}>30 分钟</option>
                <option value={60}>1 小时</option>
                <option value={90}>1.5 小时</option>
                <option value={120}>2 小时</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                地点
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="input-field"
                placeholder="会议地点"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                联系人
              </label>
              <select
                value={formData.contact_id}
                onChange={(e) =>
                  setFormData({ ...formData, contact_id: e.target.value })
                }
                className="input-field"
              >
                <option value="">选择联系人</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name || ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                关联商机
              </label>
              <select
                value={formData.deal_id}
                onChange={(e) =>
                  setFormData({ ...formData, deal_id: e.target.value })
                }
                className="input-field"
              >
                <option value="">选择商机</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              议程
            </label>
            <textarea
              value={formData.agenda}
              onChange={(e) =>
                setFormData({ ...formData, agenda: e.target.value })
              }
              className="input-field min-h-[80px] resize-none"
              placeholder="输入会议议程"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              参会人员
            </label>
            <input
              type="text"
              value={formData.attendees}
              onChange={(e) =>
                setFormData({ ...formData, attendees: e.target.value })
              }
              className="input-field"
              placeholder="输入参会人员名称，用逗号分隔"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              保存会议
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
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
