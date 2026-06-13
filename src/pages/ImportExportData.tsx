import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { ImportExportRecord } from '../lib/supabase';
import { Plus, Search, Download, Filter, Trash2, AlertCircle } from 'lucide-react';

interface FilterState {
  hsCode: string;
  country: string;
  direction: 'all' | 'export' | 'import';
  period: string;
}

export default function ImportExportData() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ImportExportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    hsCode: '',
    country: '',
    direction: 'all',
    period: '',
  });

  const [formData, setFormData] = useState({
    hs_code: '',
    product_name: '',
    country: '',
    direction: 'export',
    volume: '',
    value: '',
    currency: 'USD',
    period: '',
    data_source: '',
    notes: '',
  });

  const [countries, setCountries] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchRecords();
      fetchMetadata();
    }
  }, [user]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('import_export_data')
        .select('*')
        .order('period', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const { data } = await supabase
        .from('import_export_data')
        .select('country, period');

      if (data) {
        const uniqueCountries = Array.from(
          new Set(data.map((r) => r.country).filter(Boolean))
        ) as string[];
        const uniquePeriods = Array.from(
          new Set(data.map((r) => r.period).filter(Boolean))
        ) as string[];

        setCountries(uniqueCountries.sort());
        setPeriods(uniquePeriods.sort((a, b) => b.localeCompare(a)));
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase
        .from('import_export_data')
        .insert([
          {
            hs_code: formData.hs_code || null,
            product_name: formData.product_name,
            country: formData.country,
            direction: formData.direction,
            volume: parseFloat(formData.volume) || null,
            value: parseFloat(formData.value) || null,
            currency: formData.currency,
            period: formData.period,
            data_source: formData.data_source,
            notes: formData.notes,
            user_id: user?.id,
          },
        ])
        .select();

      if (error) throw error;

      setRecords([data[0], ...records]);
      setShowModal(false);
      setFormData({
        hs_code: '',
        product_name: '',
        country: '',
        direction: 'export',
        volume: '',
        value: '',
        currency: 'USD',
        period: '',
        data_source: '',
        notes: '',
      });

      // Update metadata
      await fetchMetadata();
    } catch (error) {
      console.error('Error adding record:', error);
      alert('添加记录失败，请重试');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('确认删除此记录？')) return;

    try {
      const { error } = await supabase
        .from('import_export_data')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecords(records.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const getFilteredRecords = () => {
    return records.filter((record) => {
      if (filters.hsCode && !(record.hs_code || '').includes(filters.hsCode)) {
        return false;
      }
      if (filters.country && record.country !== filters.country) {
        return false;
      }
      if (
        filters.direction !== 'all' &&
        record.direction !== filters.direction
      ) {
        return false;
      }
      if (filters.period && record.period !== filters.period) {
        return false;
      }
      return true;
    });
  };

  const getSummaryStats = () => {
    const filtered = getFilteredRecords();
    let exportTotal = 0;
    let importTotal = 0;

    filtered.forEach((record) => {
      if (record.direction === 'export') {
        exportTotal += record.value || 0;
      } else {
        importTotal += record.value || 0;
      }
    });

    // Count countries and products
    const countries = new Set(filtered.map((r) => r.country)).size;
    const products = new Set(filtered.map((r) => r.product_name)).size;

    return {
      exportTotal,
      importTotal,
      countries,
      products,
    };
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

  const formatCurrency = (num: number, currency: string) => {
    return `${num.toFixed(2)} ${currency}`;
  };

  const stats = getSummaryStats();
  const filteredRecords = getFilteredRecords();

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
          <h1 className="page-title text-4xl font-bold text-white mb-2">
            进出口数据
          </h1>
          <p className="text-slate-400">管理和分析您的国际贸易数据</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="stat-card glass-card p-6">
            <p className="text-slate-400 text-sm mb-2">出口总额</p>
            <p className="text-2xl font-bold text-green-300">
              {formatNumber(stats.exportTotal)}
            </p>
            <p className="text-slate-500 text-xs mt-1">USD</p>
          </div>

          <div className="stat-card glass-card p-6">
            <p className="text-slate-400 text-sm mb-2">进口总额</p>
            <p className="text-2xl font-bold text-blue-300">
              {formatNumber(stats.importTotal)}
            </p>
            <p className="text-slate-500 text-xs mt-1">USD</p>
          </div>

          <div className="stat-card glass-card p-6">
            <p className="text-slate-400 text-sm mb-2">主要国家</p>
            <p className="text-2xl font-bold text-purple-300">{stats.countries}</p>
            <p className="text-slate-500 text-xs mt-1">个</p>
          </div>

          <div className="stat-card glass-card p-6">
            <p className="text-slate-400 text-sm mb-2">主要产品</p>
            <p className="text-2xl font-bold text-amber-300">{stats.products}</p>
            <p className="text-slate-500 text-xs mt-1">种</p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-slate-400" />
            <h2 className="text-lg font-semibold text-white">筛选和搜索</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                HS编码
              </label>
              <input
                type="text"
                placeholder="搜索HS编码..."
                value={filters.hsCode}
                onChange={(e) =>
                  setFilters({ ...filters, hsCode: e.target.value })
                }
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                国家
              </label>
              <select
                value={filters.country}
                onChange={(e) =>
                  setFilters({ ...filters, country: e.target.value })
                }
                className="input-field"
              >
                <option value="">所有国家</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                方向
              </label>
              <select
                value={filters.direction}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    direction: e.target.value as FilterState['direction'],
                  })
                }
                className="input-field"
              >
                <option value="all">全部</option>
                <option value="export">出口</option>
                <option value="import">进口</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                时期
              </label>
              <select
                value={filters.period}
                onChange={(e) =>
                  setFilters({ ...filters, period: e.target.value })
                }
                className="input-field"
              >
                <option value="">所有时期</option>
                {periods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() =>
                  setFilters({
                    hsCode: '',
                    country: '',
                    direction: 'all',
                    period: '',
                  })
                }
                className="btn-secondary w-full"
              >
                重置筛选
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={20} />
              添加记录
            </button>
            <button className="btn-secondary inline-flex items-center gap-2">
              <Download size={20} />
              导出
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            {filteredRecords.length === 0 ? (
              <div className="p-12 text-center">
                <AlertCircle className="mx-auto mb-4 text-slate-500" size={48} />
                <p className="text-slate-400">暂无数据</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      HS编码
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      产品
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      国家
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      方向
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">
                      数量
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">
                      金额
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                      币种
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                      时期
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      数据来源
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                        {record.hs_code || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {record.product_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {record.country}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={
                            record.direction === 'export'
                              ? 'badge-blue'
                              : 'badge-amber'
                          }
                        >
                          {record.direction === 'export' ? '出口' : '进口'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 text-right">
                        {record.volume ? record.volume.toLocaleString('zh-CN') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 text-right">
                        {record.value ? record.value.toLocaleString('zh-CN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 text-center">
                        {record.currency}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 text-center">
                        {record.period}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {record.data_source || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Info */}
          {filteredRecords.length > 0 && (
            <div className="px-6 py-4 bg-slate-800/20 border-t border-slate-700">
              <p className="text-sm text-slate-400">
                显示 {filteredRecords.length} 条记录
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Record Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFormData({
            hs_code: '',
            product_name: '',
            country: '',
            direction: 'export',
            volume: '',
            value: '',
            currency: 'USD',
            period: '',
            data_source: '',
            notes: '',
          });
        }}
        title="添加进出口记录"
      >
        <form onSubmit={handleAddRecord} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                HS编码 *
              </label>
              <input
                type="text"
                required
                value={formData.hs_code}
                onChange={(e) =>
                  setFormData({ ...formData, hs_code: e.target.value })
                }
                className="input-field"
                placeholder="例如: 8471.30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                产品名称 *
              </label>
              <input
                type="text"
                required
                value={formData.product_name}
                onChange={(e) =>
                  setFormData({ ...formData, product_name: e.target.value })
                }
                className="input-field"
                placeholder="产品名称"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                国家 *
              </label>
              <input
                type="text"
                required
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                className="input-field"
                placeholder="国家名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                方向 *
              </label>
              <select
                required
                value={formData.direction}
                onChange={(e) =>
                  setFormData({ ...formData, direction: e.target.value })
                }
                className="input-field"
              >
                <option value="export">出口</option>
                <option value="import">进口</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                数量 *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.volume}
                onChange={(e) =>
                  setFormData({ ...formData, volume: e.target.value })
                }
                className="input-field"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                金额 *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                className="input-field"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                币种
              </label>
              <select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                className="input-field"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="AUD">AUD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                时期 *
              </label>
              <input
                type="text"
                required
                value={formData.period}
                onChange={(e) =>
                  setFormData({ ...formData, period: e.target.value })
                }
                className="input-field"
                placeholder="例如: 2024-01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              数据来源
            </label>
            <input
              type="text"
              value={formData.data_source}
              onChange={(e) =>
                setFormData({ ...formData, data_source: e.target.value })
              }
              className="input-field"
              placeholder="例如: 海关总署, 通用贸易"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="input-field min-h-[80px] resize-none"
              placeholder="输入备注信息"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              保存记录
            </button>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setFormData({
                  hs_code: '',
                  product_name: '',
                  country: '',
                  direction: 'export',
                  volume: '',
                  value: '',
                  currency: 'USD',
                  period: '',
                  data_source: '',
                  notes: '',
                });
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
