import { useTransactions, useTransactionSummary, useDeleteTransaction } from '../hooks/useTransactions';
import { Loader2, ArrowUpRight, ArrowDownRight, Wallet, Edit2, Trash2, Calendar, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuthStore } from '../stores/useAuthStore';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import TransactionModal from '../components/modals/TransactionModal';

export default function FinancePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [typeFilter, setTypeFilter] = useState('');
  
  const activeDateRange = dateRange.startDate && dateRange.endDate ? dateRange : undefined;
  
  const { data: summary, isLoading: loadingSummary } = useTransactionSummary(activeDateRange);
  const { data: txData, isLoading: loadingTx } = useTransactions({ 
    limit: 50, 
    ...(activeDateRange || {}),
    ...(typeFilter ? { type: typeFilter } : {})
  });
  const deleteTransaction = useDeleteTransaction();

  const applyQuickFilter = (days: number) => {
    if (days === 0) {
      setDateRange({ startDate: '', endDate: '' });
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    });
  };

  const formatMoney = (amount: number) => {
    return amount?.toLocaleString() + ' UZS';
  };

  const chartData = [
    { name: t('finance.income', 'Daromad'), value: summary?.income?.total || 0, color: '#10b981' },
    { name: t('finance.expense', 'Chiqim'), value: summary?.expense?.total || 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t('finance.title', 'Moliya va Hisobotlar')}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            {t('finance.subtitle', 'Mehmonxona moliyaviy holati va tranzaksiyalar tarixi.')}
          </p>
        </div>
        {user?.role === 'admin' && (
          <Button 
            onClick={() => { setEditingTx(null); setIsModalOpen(true); }}
            className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('finance.add_transaction', 'Yangi Tranzaksiya')}
          </Button>
        )}
      </div>

      {/* FILTERLAR */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end bg-white/70 dark:bg-zinc-950/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant={!dateRange.startDate ? "default" : "outline"} className={!dateRange.startDate ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => applyQuickFilter(0)}>{t('common.all', 'Barchasi')}</Button>
          <Button size="sm" variant="outline" onClick={() => applyQuickFilter(1)}>{t('reports.today', 'Bugun')}</Button>
          <Button size="sm" variant="outline" onClick={() => applyQuickFilter(7)}>{t('reports.this_week', 'Hafta')}</Button>
          <Button size="sm" variant="outline" onClick={() => applyQuickFilter(30)}>{t('reports.this_month', 'Oy')}</Button>
        </div>
        
        <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 shrink-0">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <input 
            type="date" 
            className="h-9 w-[130px] text-sm px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100" 
            value={dateRange.startDate} 
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
          />
          <span className="text-zinc-400">-</span>
          <input 
            type="date" 
            className="h-9 w-[130px] text-sm px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100" 
            value={dateRange.endDate} 
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)}
            className="h-9 text-sm px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100"
          >
            <option value="" className="bg-white dark:bg-zinc-900">{t('common.all', 'Barchasi')}</option>
            <option value="income" className="bg-white dark:bg-zinc-900">{t('finance.income', 'Kirimlar')}</option>
            <option value="expense" className="bg-white dark:bg-zinc-900">{t('finance.expense', 'Chiqimlar')}</option>
          </select>
        </div>
      </div>

      {loadingSummary ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md transition-colors">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('finance.income', 'Jami Daromad')}</h3>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(summary?.income?.total)}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{summary?.income?.count} {t('finance.transactions_count', 'ta tranzaksiya')}</p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md transition-colors">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('finance.expense', 'Jami Chiqim')}</h3>
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatMoney(summary?.expense?.total)}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{summary?.expense?.count} {t('finance.transactions_count', 'ta tranzaksiya')}</p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md transition-colors">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('finance.balance', 'Sof Balans')}</h3>
              <Wallet className="w-4 h-4 text-blue-500" />
            </div>
            <div className={cn(
              "text-2xl font-bold",
              (summary?.balance || 0) >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
            )}>
              {formatMoney(summary?.balance)}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('finance.profit_loss', 'Foyda / Zarar')}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md transition-colors md:col-span-2 overflow-hidden flex flex-col">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">{t('finance.latest_transactions', "So'nggi Tranzaksiyalar")}</h3>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-100 dark:bg-zinc-900/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('finance.table.date')}</th>
                  <th className="px-4 py-3 font-medium">{t('finance.table.description')}</th>
                  <th className="px-4 py-3 font-medium">{t('modals.client.payment_method')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('finance.table.amount')}</th>
                  {user?.role === 'admin' && <th className="px-4 py-3 font-medium text-right">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {loadingTx ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-zinc-500">{t('common.loading', 'Yuklanmoqda...')}</td>
                  </tr>
                ) : txData?.transactions?.map((tx: any) => (
                  <tr key={tx._id} className="border-b border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">{tx.description}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 capitalize">{tx.paymentMethod}</td>
                    <td className={cn(
                      "px-4 py-3 text-right font-bold whitespace-nowrap",
                      tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 mr-1"
                          onClick={() => { setEditingTx(tx); setIsModalOpen(true); }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                          onClick={() => {
                            if (window.confirm(t('common.confirm_delete', "Rostdan ham bu tranzaksiyani o'chirasizmi?"))) {
                              deleteTransaction.mutate(tx._id);
                            }
                          }}
                        >
                          {deleteTransaction.isPending && deleteTransaction.variables === tx._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md transition-colors flex flex-col h-96">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">{t('finance.income', 'Kirim')} / {t('finance.expense', 'Chiqim')}</h3>
          <div className="flex-1 w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatMoney(value)}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#f4f4f5' }}
                  itemStyle={{ color: '#f4f4f5' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('finance.income', 'Daromad')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('finance.expense', 'Chiqim')}</span>
            </div>
          </div>
        </div>
      </div>

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editData={editingTx} />
    </div>
  );
}
