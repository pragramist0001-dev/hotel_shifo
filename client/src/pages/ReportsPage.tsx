import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useReports, useCreateReport, useReviewReport, useReportStats, useUpdateReport, useDeleteReport } from '../hooks/useReports';
import { useAuthStore } from '../stores/useAuthStore';
import { Loader2, Plus, FileText, CheckCircle2, Clock, Users, CreditCard, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ReportModal({ isOpen, onClose, editData }: { isOpen: boolean; onClose: () => void; editData?: any }) {
  const { t } = useTranslation();
  const [type, setType] = useState('daily');
  const [content, setContent] = useState('');
  const createReport = useCreateReport();
  const updateReport = useUpdateReport();
  
  const { data: stats, isLoading: isStatsLoading } = useReportStats(!editData ? type : '');

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setType(editData.type);
        setContent(editData.content);
      } else {
        setType('daily');
        setContent('');
      }
    }
  }, [isOpen, editData]);

  useEffect(() => {
    if (isOpen && stats && !editData) {
      let title = type === 'daily' ? 'KUNLIK HISOBOT' : type === 'weekly' ? 'HAFTALIK HISOBOT' : 'OYLIK HISOBOT';
      let dateStr = new Date().toLocaleDateString('uz-UZ');
      
      const text = `📋 ${title} (${dateStr})

👥 Tashriflar va Mijozlar:
- Jami xizmat ko'rsatilgan mijozlar: ${stats.totalGuests} kishi
- Jami xona band qilishlar (Bronlar): ${stats.totalBookings} ta

💰 Moliya va Kirim (Kassaga tushgan pul):
- 💵 Naqd pul: ${stats.cashIncome?.toLocaleString() || 0} UZS
- 💳 Terminal: ${stats.terminalIncome?.toLocaleString() || 0} UZS
- 📱 Click/Payme: ${stats.clickIncome?.toLocaleString() || 0} UZS
- 🏦 Pul ko'chirish: ${stats.transferIncome?.toLocaleString() || 0} UZS
----------------------------------------
🟢 JAMI KIRIM: ${stats.totalIncome.toLocaleString()} UZS

💸 Chiqimlar (Xarajatlar):
----------------------------------------
🔴 JAMI CHIQIM: ${stats.totalExpense?.toLocaleString() || 0} UZS

💵 SOF QOLDIQ (Kirim - Chiqim): ${(stats.totalIncome - (stats.totalExpense || 0)).toLocaleString()} UZS

📝 Qilingan ishlar yuzasidan izohlar, kamchilik va takliflar:
- `;
      setContent(text);
    }
  }, [type, isOpen, stats, editData, t]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (editData) {
      updateReport.mutate({ id: editData._id, data: { type, content } }, {
        onSuccess: () => {
          onClose();
        }
      });
    } else {
      createReport.mutate({ type, content }, {
        onSuccess: () => {
          setContent('');
          setType('daily');
          onClose();
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">{t('reports.write_new', 'Yangi Hisobot Yozish')}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('reports.report_type', 'Hisobot turi')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 bg-transparent text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100" value="daily">{t('reports.daily_report', 'Kunlik Hisobot')}</option>
              <option className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100" value="weekly">{t('reports.weekly_report', 'Haftalik Hisobot')}</option>
              <option className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100" value="monthly">{t('reports.monthly_report', 'Oylik Hisobot')}</option>
            </select>
          </div>
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('reports.report_text', 'Hisobot matni')}</label>
              {isStatsLoading && <span className="text-xs text-emerald-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {t('common.calculating', 'Hisoblanmoqda...')}</span>}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder={t('reports.placeholder', "Qilingan ishlar, kamchiliklar, takliflar...")}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-3 bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel', 'Bekor qilish')}</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createReport.isPending || updateReport.isPending || !content.trim()}>
              {(createReport.isPending || updateReport.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editData ? t('common.save', 'Saqlash') : t('common.submit', "Jo'natish")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);

  const filter: any = {};
  if (filterType) filter.type = filterType;
  if (filterStatus) filter.status = filterStatus;

  const { data: reports, isLoading } = useReports(filter);
  const reviewReport = useReviewReport();
  const deleteReport = useDeleteReport();

  const handleReview = (id: string) => {
    reviewReport.mutate(id);
  };

  const getBadgeType = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'weekly': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'monthly': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  const getBadgeLabel = (type: string) => {
    switch (type) {
      case 'daily': return t('reports.daily', 'Kunlik');
      case 'weekly': return t('reports.weekly', 'Haftalik');
      case 'monthly': return t('reports.monthly', 'Oylik');
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {user?.role === 'admin' ? t('reports.admin_title', 'Xodimlar Hisobotlari') : t('reports.my_reports', 'Mening Hisobotlarim')}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            {user?.role === 'admin' 
              ? t('reports.admin_subtitle', 'Tizimdagi xodimlarning barcha kunlik, haftalik va oylik hisobotlarini nazorat qilish')
              : t('reports.my_subtitle', "O'zingiz tomondan yozilgan va rahbariyatga jo'natilgan hisobotlar")}
          </p>
        </div>
        {user?.role !== 'admin' && (
          <Button 
            onClick={() => {
              setEditingReport(null);
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('reports.new_report', 'Yangi Hisobot')}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-md">
        <select 
          value={filterType} 
          onChange={e => setFilterType(e.target.value)}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100"
        >
          <option className="bg-white dark:bg-zinc-900" value="">{t('common.all_types', 'Barcha turlar')}</option>
          <option className="bg-white dark:bg-zinc-900" value="daily">{t('reports.daily', 'Kunlik')}</option>
          <option className="bg-white dark:bg-zinc-900" value="weekly">{t('reports.weekly', 'Haftalik')}</option>
          <option className="bg-white dark:bg-zinc-900" value="monthly">{t('reports.monthly', 'Oylik')}</option>
        </select>
        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100"
        >
          <option className="bg-white dark:bg-zinc-900" value="">{t('common.all_statuses', 'Barcha holatlar')}</option>
          <option className="bg-white dark:bg-zinc-900" value="submitted">{t('reports.status_submitted', 'Kutilayapdi')}</option>
          <option className="bg-white dark:bg-zinc-900" value="reviewed">{t('reports.status_reviewed', "Ko'rdi")}</option>
        </select>
        <div className="text-sm text-zinc-500 font-medium ml-auto">
          {t('common.total', 'Jami')}: {reports?.length || 0} {t('reports.reports_count', 'ta hisobot')}
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
        ) : reports?.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>{t('reports.no_reports', "Hozircha hisobotlar yo'q")}</p>
          </div>
        ) : (
          reports?.map((report: any) => (
            <div key={report._id} className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    {user?.role === 'admin' && (
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{report.author?.fullName}</span>
                    )}
                    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold border', getBadgeType(report.type))}>
                      {getBadgeLabel(report.type)}
                    </span>
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(report.createdAt).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  {user?.role === 'admin' && (
                    <p className="text-xs text-zinc-500">@{report.author?.username}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Delete button (Admin always, Author if submitted) */}
                  {(user?.role === 'admin' || report.status === 'submitted') && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => {
                        if (window.confirm(t('common.confirm_delete', "Rostdan ham bu hisobotni o'chirasizmi?"))) {
                          deleteReport.mutate(report._id);
                        }
                      }}
                    >
                      {deleteReport.isPending && deleteReport.variables === report._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  )}
                  {/* Edit button (Author only if submitted) */}
                  {(user?.role !== 'admin' && report.status === 'submitted') && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      onClick={() => {
                        setEditingReport(report);
                        setIsModalOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                    {report.status === 'submitted' ? (
                      user?.role === 'admin' ? (
                        <Button size="sm" onClick={() => handleReview(report._id)} disabled={reviewReport.isPending} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50">
                          {reviewReport.isPending && reviewReport.variables === report._id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                          {t('reports.review', 'Tasdiqlash')}
                        </Button>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-semibold">
                          {t('reports.status_submitted', 'Kutilayapdi')}
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('reports.admin_reviewed', "Admin ko'rdi")}
                      </span>
                    )}
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {report.content}
              </div>
              
              {report.stats && (
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold text-sm">{t('reports.guests_count', 'Odamlar soni')}: {report.stats.totalGuests} kishi ({report.stats.totalBookings || 0} ta bron)</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-800/30">
                    <CreditCard className="w-4 h-4" />
                    <span className="font-semibold text-sm">{t('finance.income', 'Kirim')}: {report.stats.totalIncome.toLocaleString()} UZS</span>
                  </div>
                  {(report.stats.totalExpense !== undefined) && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-800/30">
                      <CreditCard className="w-4 h-4" />
                      <span className="font-semibold text-sm">Chiqim: {report.stats.totalExpense.toLocaleString()} UZS</span>
                    </div>
                  )}
                  {(report.stats.totalExpense !== undefined) && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200 rounded-lg border border-zinc-200 dark:border-zinc-700/50">
                      <CreditCard className="w-4 h-4" />
                      <span className="font-semibold text-sm">Sof qoldiq: {(report.stats.totalIncome - report.stats.totalExpense).toLocaleString()} UZS</span>
                    </div>
                  )}
                </div>
              )}

              {report.reviewedBy && (
                <p className="text-xs text-zinc-400 mt-3 flex items-center gap-1">
                  {t('reports.reviewed_by', 'Tasdiqladi')}: <strong>{report.reviewedBy.fullName}</strong>
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <ReportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editData={editingReport} />
    </div>
  );
}
