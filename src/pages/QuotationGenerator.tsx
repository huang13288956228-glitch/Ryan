import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Company, Contact, Quotation, QuoteItem } from '../lib/supabase';


export default function QuotationGenerator() {
  const { user } = useAuth();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [quotationHistory, setQuotationHistory] = useState<Quotation[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [incoterms, setIncoterms] = useState('FOB上海');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [remarks, setRemarks] = useState('');

  // Items state
  const [items, setItems] = useState<QuoteItem[]>([
    { name: '', qty: 0, unit: '件', price: 0, amount: 0 },
  ]);

  const units = ['件', '套', '台', '千克', '平方米'];
  const currencies = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'AUD', 'CAD'];
  const incotermsOptions = ['FOB上海', 'CIF', 'CNF', 'EXW', 'FCA'];

  useEffect(() => {
    if (user) {
      fetchCompanies();
      fetchContacts();
      fetchQuotationHistory();
    }
  }, [user]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchQuotationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;
      setQuotationHistory(data || []);
    } catch (error) {
      console.error('Error fetching quotation history:', error);
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof QuoteItem,
    value: any
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate amount
    if (field === 'qty' || field === 'price') {
      newItems[index].amount =
        parseFloat(String(newItems[index].qty || 0)) *
        parseFloat(String(newItems[index].price || 0));
    }

    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { name: '', qty: 0, unit: '件', price: 0, amount: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      alert('至少需要保留一个项目');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const handleSaveDraft = async () => {
    if (!title || !selectedCompany) {
      alert('请填写报价标题和选择公司');
      return;
    }

    try {
      const quotationData = {
        user_id: user?.id,
        company_id: selectedCompany,
        contact_id: selectedContact || null,
        title: title,
        currency: currency,
        trade_terms: incoterms,
        payment_terms: paymentTerms,
        delivery_time: deliveryTime,
        valid_days: validityDays,
        notes: remarks,
        items: items.filter((item) => item.name),
        status: 'draft',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('quotations')
        .insert([quotationData]);

      if (error) throw error;
      alert('报价已保存为草稿');
      resetForm();
      fetchQuotationHistory();
    } catch (error) {
      console.error('Error saving quotation:', error);
      alert('保存失败，请重试');
    }
  };

  const handleSaveAndFinalize = async () => {
    if (!title || !selectedCompany) {
      alert('请填写报价标题和选择公司');
      return;
    }

    const validItems = items.filter((item) => item.name);
    if (validItems.length === 0) {
      alert('至少需要添加一个产品');
      return;
    }

    try {
      const quotationData = {
        user_id: user?.id,
        company_id: selectedCompany,
        contact_id: selectedContact || null,
        title: title,
        currency: currency,
        trade_terms: incoterms,
        payment_terms: paymentTerms,
        delivery_time: deliveryTime,
        valid_days: validityDays,
        notes: remarks,
        items: validItems,
        status: 'finalized',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('quotations')
        .insert([quotationData]);

      if (error) throw error;
      alert('报价已保存并定稿');
      resetForm();
      fetchQuotationHistory();
    } catch (error) {
      console.error('Error saving quotation:', error);
      alert('保存失败，请重试');
    }
  };

  const resetForm = () => {
    setTitle('');
    setSelectedCompany('');
    setSelectedContact('');
    setCurrency('USD');
    setIncoterms('FOB上海');
    setPaymentTerms('');
    setDeliveryTime('');
    setValidityDays(30);
    setRemarks('');
    setItems([{ name: '', qty: 0, unit: '件', price: 0, amount: 0 }]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="page-header mb-8">
        <h1 className="page-title">报价生成器</h1>
        <p className="text-slate-400 mt-2">快速创建专业外贸报价单</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Left Column - Form */}
        <div className="col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-5">基本信息</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">报价标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如: 不锈钢餐具报价"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">公司</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">-- 选择公司 --</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                      {contact.first_name} {contact.last_name || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">币种</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="input-field w-full"
                >
                  {currencies.map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Shipping & Payment Terms */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-5">交易条款</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">贸易条款</label>
                <select
                  value={incoterms}
                  onChange={(e) => setIncoterms(e.target.value)}
                  className="input-field w-full"
                >
                  {incotermsOptions.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">付款条件</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="例如: T/T 30%预付"
                  className="input-field w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">交货时间</label>
                <input
                  type="text"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="例如: 30天"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">有效期(天)</label>
                <input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                  min="1"
                  max="365"
                  className="input-field w-full"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">备注</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="例如: 货物经过严格检验，所有参数符合标准..."
                rows={3}
                className="input-field w-full resize-none"
              />
            </div>
          </div>

          {/* Items */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-5">产品项目</h2>

            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-3 font-semibold text-slate-200">品名</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-200 w-20">数量</th>
                    <th className="text-center py-3 px-3 font-semibold text-slate-200 w-20">单位</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-200 w-24">单价</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-200 w-24">金额</th>
                    <th className="text-center py-3 px-3 font-semibold text-slate-200 w-16">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-700/30 hover:bg-slate-800/20">
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(index, 'name', e.target.value)
                          }
                          placeholder="产品名称"
                          className="input-field w-full text-sm"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          className="input-field w-full text-sm text-right"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="input-field w-full text-sm"
                        >
                          {units.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            handleItemChange(index, 'price', parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          step="0.01"
                          className="input-field w-full text-sm text-right"
                        />
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-200">
                        {formatCurrency(item.amount || 0)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="btn-danger text-xs px-2 py-1"
                        >
                          移除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={handleAddItem} className="btn-secondary w-full">
              添加项目
            </button>
          </div>

          {/* Totals */}
          <div className="glass-card p-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-right">
                <p className="text-slate-400 text-sm mb-2">小计:</p>
                <p className="text-2xl font-bold text-slate-100">
                  {formatCurrency(calculateSubtotal())} {currency}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm mb-2">合计:</p>
                <p className="text-3xl font-bold text-blue-400">
                  {formatCurrency(calculateTotal())} {currency}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleSaveDraft} className="btn-secondary">
              保存草稿
            </button>
            <button onClick={handleSaveAndFinalize} className="btn-primary">
              保存并定稿
            </button>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="glass-card p-8 h-fit sticky top-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">报价单预览</h2>

          <div className="space-y-4 text-sm">
            {/* Header */}
            <div className="text-center pb-4 border-b border-slate-700/50">
              <p className="text-slate-300 font-medium mb-2">{title || '报价单'}</p>
              <p className="text-xs text-slate-400">
                {companies.find((c) => c.id === selectedCompany)?.name || '公司名称'}
              </p>
            </div>

            {/* Key Info */}
            <div className="grid grid-cols-2 gap-3 text-xs py-4 border-b border-slate-700/50">
              <div>
                <p className="text-slate-400">币种:</p>
                <p className="text-slate-200 font-medium">{currency}</p>
              </div>
              <div>
                <p className="text-slate-400">贸易条款:</p>
                <p className="text-slate-200 font-medium">{incoterms}</p>
              </div>
              <div>
                <p className="text-slate-400">付款条件:</p>
                <p className="text-slate-200 font-medium">{paymentTerms || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">交货期:</p>
                <p className="text-slate-200 font-medium">{deliveryTime || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">有效期:</p>
                <p className="text-slate-200 font-medium">{validityDays}天</p>
              </div>
              <div>
                <p className="text-slate-400">日期:</p>
                <p className="text-slate-200 font-medium">
                  {new Date().toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>

            {/* Items Preview */}
            <div className="py-4 border-b border-slate-700/50">
              <p className="text-slate-400 text-xs font-medium mb-3">产品明细:</p>
              <div className="space-y-2">
                {items
                  .filter((item) => item.name)
                  .map((item, index) => (
                    <div key={index} className="flex justify-between text-xs text-slate-300">
                      <span>{item.name}</span>
                      <span>
                        {item.qty} {item.unit} x {formatCurrency(item.price)} ={' '}
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-4 space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>小计:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-blue-400 pt-2 border-t border-slate-700/50">
                <span>合计:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            {/* Remarks */}
            {remarks && (
              <div className="pt-4 border-t border-slate-700/50">
                <p className="text-slate-400 text-xs font-medium mb-2">备注:</p>
                <p className="text-slate-300 text-xs leading-relaxed">{remarks}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Quotations */}
      <div className="glass-card p-6 mt-8">
        <h2 className="text-xl font-semibold text-slate-100 mb-6">最近报价</h2>

        {quotationHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">标题</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">公司</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-200">金额</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-200">状态</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">日期</th>
                </tr>
              </thead>
              <tbody>
                {quotationHistory.map((quotation) => (
                  <tr
                    key={quotation.id}
                    className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">{quotation.title}</td>
                    <td className="py-3 px-4">
                      {companies.find((c) => c.id === quotation.company_id)?.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-200">
                      {formatCurrency(quotation.items.reduce((sum, item) => sum + (item.amount || 0), 0))} {quotation.currency}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          quotation.status === 'finalized'
                            ? 'badge-green'
                            : 'badge-amber'
                        }`}
                      >
                        {quotation.status === 'finalized' ? '已定稿' : '草稿'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{formatDate(quotation.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p>暂无报价记录</p>
          </div>
        )}
      </div>
    </div>
  );
}
