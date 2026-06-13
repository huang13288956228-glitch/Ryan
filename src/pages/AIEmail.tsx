import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDeepseekAI } from '../hooks/useDeepseekAI';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { Contact } from '../lib/supabase';


export default function AIEmail() {
  const { user } = useAuth();
  const { loading: aiLoading, error: aiError, call: callAI } = useDeepseekAI();
  const { copied, copy } = useCopyToClipboard();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);

  // Form state
  const [selectedContact, setSelectedContact] = useState('');
  const [emailType, setEmailType] = useState('回复询盘');
  const [tone, setTone] = useState('专业正式');
  const [customerName, setCustomerName] = useState('');
  const [country, setCountry] = useState('');
  const [product, setProduct] = useState('');
  const [requirements, setRequirements] = useState('');

  // Generated email state
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');

  useEffect(() => {
    if (user) {
      fetchContacts();
      fetchEmailHistory();
    }
  }, [user]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id)
        .order('first_name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchEmailHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setEmailHistory(data || []);
    } catch (error) {
      console.error('Error fetching email history:', error);
    }
  };

  const handleGenerateEmail = async () => {
    if (!customerName || !country || !product || !requirements) {
      alert('请填写所有必需字段');
      return;
    }

    const emailTypeMap: Record<string, string> = {
      '回复询盘': 'reply_inquiry', '发送报价': 'send_quote', '跟进邮件': 'follow_up',
      '产品介绍': 'introduce', '感谢邮件': 'thank_you',
    };
    const toneMap: Record<string, string> = {
      '专业正式': 'professional', '友好亲切': 'friendly', '简洁明了': 'concise',
    };

    try {
      const payload = {
        emailType: emailTypeMap[emailType] || emailType,
        tone: toneMap[tone] || tone,
        customerName,
        country,
        product,
        requirements,
      };

      const result = await callAI({ task: 'email', payload });

      // Parse the result - expecting format like "Subject: ...\n\nBody: ..."
      const lines = result.split('\n\n');
      const subjectLine = lines[0]?.replace('Subject: ', '').replace('主题: ', '') || '';
      const bodyText = lines.slice(1).join('\n\n').replace('Body: ', '').replace('正文: ', '');

      setEmailSubject(subjectLine);
      setGeneratedEmail(bodyText);
    } catch (error) {
      console.error('Error generating email:', error);
      alert('邮件生成失败，请重试');
    }
  };

  const handleSaveEmail = async () => {
    if (!emailSubject || !generatedEmail) {
      alert('请先生成邮件');
      return;
    }

    try {
      const { error } = await supabase
        .from('emails')
        .insert([
          {
            user_id: user?.id,
            email_type: emailType,
            subject: emailSubject,
            content: generatedEmail,
            tone: tone,
            contact_id: selectedContact || null,
          },
        ]);

      if (error) throw error;
      alert('邮件已保存到历史');
      fetchEmailHistory();
      resetForm();
    } catch (error) {
      console.error('Error saving email:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!confirm('确认删除此邮件吗？')) return;

    try {
      const { error } = await supabase
        .from('emails')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      fetchEmailHistory();
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('删除失败，请重试');
    }
  };

  const resetForm = () => {
    setSelectedContact('');
    setEmailType('回复询盘');
    setTone('专业正式');
    setCustomerName('');
    setCountry('');
    setProduct('');
    setRequirements('');
    setEmailSubject('');
    setGeneratedEmail('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="page-header mb-8">
        <h1 className="page-title">AI邮件生成</h1>
        <p className="text-slate-400 mt-2">智能生成专业外贸邮件</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Left Column - Form */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-6">邮件配置</h2>

          <div className="space-y-5">
            {/* Contact Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">联系人</label>
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="input-field w-full"
              >
                <option value="">-- 选择或跳过 --</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name + ' ' + (contact.last_name || '')}
                  </option>
                ))}
              </select>
            </div>

            {/* Email Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">邮件类型</label>
              <select
                value={emailType}
                onChange={(e) => setEmailType(e.target.value)}
                className="input-field w-full"
              >
                <option>回复询盘</option>
                <option>发送报价</option>
                <option>跟进邮件</option>
                <option>产品介绍</option>
                <option>感谢邮件</option>
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">语气</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="input-field w-full"
              >
                <option>专业正式</option>
                <option>友好亲切</option>
                <option>简洁明了</option>
              </select>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">客户姓名</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="例如: Mr. Smith"
                className="input-field w-full"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">国家</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="例如: 美国"
                className="input-field w-full"
              />
            </div>

            {/* Product */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">产品</label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="例如: 不锈钢餐具"
                className="input-field w-full"
              />
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">需求详情</label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="描述客户的需求、询盘内容或跟进信息..."
                rows={4}
                className="input-field w-full resize-none"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateEmail}
              disabled={aiLoading}
              className="btn-primary w-full mt-6"
            >
              {aiLoading ? '生成中...' : '生成邮件'}
            </button>

            {aiError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
                {aiError}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          {/* Email Preview */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-6">邮件预览</h2>

            {emailSubject || generatedEmail ? (
              <div className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="text-sm font-medium text-slate-400 block mb-2">主题</label>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 min-h-12 text-slate-200 break-words">
                    {emailSubject || '(生成中...)'}
                  </div>
                </div>

                {/* Body */}
                <div>
                  <label className="text-sm font-medium text-slate-400 block mb-2">正文</label>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 min-h-56 max-h-96 overflow-y-auto text-slate-300 whitespace-pre-wrap leading-relaxed text-sm">
                    {generatedEmail || '(生成中...)'}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => copy(generatedEmail)}
                    className="btn-secondary flex-1"
                  >
                    {copied ? '已复制' : '复制'}
                  </button>
                  <button
                    onClick={handleSaveEmail}
                    className="btn-primary flex-1"
                  >
                    保存到历史
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p>配置表单并点击"生成邮件"查看预览</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email History Table */}
      <div className="glass-card p-6 mt-8">
        <h2 className="text-xl font-semibold text-slate-100 mb-6">邮件历史</h2>

        {emailHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">类型</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">主题</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">语气</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">日期</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">操作</th>
                </tr>
              </thead>
              <tbody>
                {emailHistory.map((email) => (
                  <tr
                    key={email.id}
                    className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="badge-blue px-2 py-1 rounded text-xs">
                        {email.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 truncate max-w-xs">{email.subject}</td>
                    <td className="py-3 px-4">{email.tone}</td>
                    <td className="py-3 px-4">{formatDate(email.created_at)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDeleteEmail(email.id)}
                        className="btn-danger text-xs px-3 py-1"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p>暂无邮件历史</p>
          </div>
        )}
      </div>
    </div>
  );
}
