import { useState, useEffect } from 'react';
import { TrendingUp, Phone, Clock, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface StatItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: string;
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'lead' | 'deal' | 'contact' | 'email';
}

interface FollowupItem {
  id: string;
  company: string;
  contact: string;
  dueDate: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
}

const PipelineStage = ({ label, percentage }: { label: string; percentage: number }) => (
  <div className="mb-6">
    <div className="flex justify-between mb-2">
      <span className="text-navy-300 text-sm font-medium">{label}</span>
      <span className="text-blue-400 text-sm font-semibold">{percentage}%</span>
    </div>
    <div className="h-3 bg-navy-800 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} />
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatItem[]>([
    { label: '总线索数', value: 248, icon: <TrendingUp className="w-5 h-5" />, trend: '+12% 本月' },
    { label: '活跃商机', value: 32, icon: <BarChart3 className="w-5 h-5" />, trend: '+3 本周' },
    { label: '待跟进', value: 18, icon: <Clock className="w-5 h-5" />, trend: '3个今日' },
    { label: '转化率', value: 28, icon: <Phone className="w-5 h-5" />, trend: '+2.5%' },
  ]);

  const [activities, setActivities] = useState<ActivityItem[]>([
    { id: '1', title: '新线索添加', description: '来自 Alibaba Export Corp 的新线索', timestamp: '2小时前', type: 'lead' },
    { id: '2', title: '商机更新', description: '张三 标记为 "方案报价" 阶段', timestamp: '3小时前', type: 'deal' },
    { id: '3', title: '邮件发送', description: '已发送报价邮件至 John Smith', timestamp: '4小时前', type: 'email' },
    { id: '4', title: '联系人添加', description: '添加了新的采购经理联系人', timestamp: '6小时前', type: 'contact' },
    { id: '5', title: '线索认证完成', description: 'Tech Innovations Ltd 已认证', timestamp: '1天前', type: 'lead' },
    { id: '6', title: '跟进提醒', description: 'Global Traders Inc 需要跟进', timestamp: '1天前', type: 'contact' },
  ]);

  const [followups, setFollowups] = useState<FollowupItem[]>([
    { id: '1', company: 'Premier Manufacturing', contact: '李明', dueDate: '今天 14:00', type: '电话跟进', priority: 'high' },
    { id: '2', company: 'Tech Solutions Asia', contact: '王刚', dueDate: '明天 10:00', type: '邮件跟进', priority: 'high' },
    { id: '3', company: 'Global Electronics', contact: '张波', dueDate: '后天', type: '视频会议', priority: 'medium' },
    { id: '4', company: 'Sustainable Products', contact: '刘燕', dueDate: '周二', type: '方案讨论', priority: 'medium' },
  ]);

  const getActivityIcon = (type: string) => {
    const baseClass = 'w-2.5 h-2.5 rounded-full';
    switch(type) {
      case 'lead': return <div className={`${baseClass} bg-blue-500`} />;
      case 'deal': return <div className={`${baseClass} bg-green-500`} />;
      case 'contact': return <div className={`${baseClass} bg-purple-500`} />;
      case 'email': return <div className={`${baseClass} bg-amber-500`} />;
      default: return <div className={`${baseClass} bg-navy-500`} />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const badgeClass = priority === 'high' ? 'badge-red' : priority === 'medium' ? 'badge-amber' : 'badge-blue';
    const label = priority === 'high' ? '高' : priority === 'medium' ? '中' : '低';
    return <span className={`${badgeClass} px-2 py-1 text-xs rounded`}>{label}</span>;
  };

  return (
    <div className="min-h-screen bg-navy-950">
      <div className="page-header px-6 py-4 border-b border-navy-800">
        <h1 className="page-title">仪表盘</h1>
        <p className="text-navy-400 text-sm mt-1">欢迎回来，{user?.email?.split('@')[0]}！</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="stat-card glass-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-navy-400 text-sm font-medium mb-2">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
                  {stat.trend && <p className="text-green-400 text-xs">{stat.trend}</p>}
                </div>
                <div className="text-blue-500/40 ml-4">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Sales Pipeline & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline */}
          <div className="lg:col-span-2 glass-card p-6">
            <h2 className="text-white font-semibold mb-6 text-lg">销售管道</h2>
            <div>
              <PipelineStage label="潜在客户" percentage={100} />
              <PipelineStage label="已认证" percentage={85} />
              <PipelineStage label="方案报价" percentage={62} />
              <PipelineStage label="谈判中" percentage={38} />
              <PipelineStage label="成交" percentage={28} />
            </div>
            <div className="mt-6 pt-6 border-t border-navy-700/50">
              <div className="grid grid-cols-5 gap-2 text-center">
                {[
                  { stage: '潜在客户', count: 248 },
                  { stage: '已认证', count: 210 },
                  { stage: '方案报价', count: 154 },
                  { stage: '谈判中', count: 94 },
                  { stage: '成交', count: 70 },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-navy-800/50 rounded-lg">
                    <p className="text-blue-400 font-semibold text-lg">{item.count}</p>
                    <p className="text-navy-400 text-xs mt-1 truncate">{item.stage}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold mb-4 text-lg">关键指标</h2>
            <div className="space-y-4">
              <div className="p-4 bg-navy-800/40 rounded-lg">
                <p className="text-navy-300 text-sm mb-1">平均成交周期</p>
                <p className="text-white text-2xl font-bold">45天</p>
              </div>
              <div className="p-4 bg-navy-800/40 rounded-lg">
                <p className="text-navy-300 text-sm mb-1">这个月商机金额</p>
                <p className="text-green-400 text-2xl font-bold">$248K</p>
              </div>
              <div className="p-4 bg-navy-800/40 rounded-lg">
                <p className="text-navy-300 text-sm mb-1">赢单率</p>
                <p className="text-blue-400 text-2xl font-bold">34%</p>
              </div>
              <div className="p-4 bg-navy-800/40 rounded-lg">
                <p className="text-navy-300 text-sm mb-1">平均订单价值</p>
                <p className="text-amber-400 text-2xl font-bold">$15,8K</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity & Followup */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold mb-4 text-lg">最近动态</h2>
            <div className="space-y-3">
              {activities.map(activity => (
                <div key={activity.id} className="flex gap-3 pb-3 border-b border-navy-800/40 last:border-b-0 last:pb-0">
                  <div className="mt-1">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-navy-400 text-xs truncate">{activity.description}</p>
                    <p className="text-navy-500 text-xs mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Followups */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold mb-4 text-lg">即将跟进</h2>
            <div className="space-y-3">
              {followups.map(item => (
                <div key={item.id} className="p-3 bg-navy-800/30 rounded-lg border border-navy-700/30 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.company}</p>
                      <p className="text-navy-400 text-xs">{item.contact} · {item.type}</p>
                      <p className="text-blue-400 text-xs mt-1 font-medium">{item.dueDate}</p>
                    </div>
                    {getPriorityBadge(item.priority)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
