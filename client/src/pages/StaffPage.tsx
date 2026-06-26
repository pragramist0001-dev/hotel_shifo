import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStaff, useDeleteStaff } from '../hooks/useStaff';
import { Loader2, UserPlus, Shield, Clock, Search, Edit2, Trash2, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import StaffModal from '../components/modals/StaffModal';

export default function StaffPage() {
  const { t } = useTranslation();
  const { data: staff, isLoading } = useStaff();
  const deleteStaff = useDeleteStaff();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter
  const filtered = useMemo(() => {
    if (!staff) return [];
    const q = search.toLowerCase().trim();
    if (!q) return staff;
    return staff.filter((u: any) =>
      u.fullName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  }, [staff, search]);

  const openAdd = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const openEdit = (user: any) => {
    setEditingStaff(user);
    setIsModalOpen(true);
  };

  const handleDelete = (user: any) => {
    if (!window.confirm(t('common.confirm_delete', `"${user.fullName}" xodimini o'chirishni xohlaysizmi?`))) return;
    setDeletingId(user._id);
    deleteStaff.mutate(user._id, {
      onSettled: () => setDeletingId(null),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('staff.title', 'Xodimlar')}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            {t('staff.subtitle', 'Tizim foydalanuvchilari va Reception xodimlarini boshqarish')}
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 flex-shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {t('staff.add_staff', 'Yangi Xodim')}
        </Button>
      </div>

      {/* Search filter */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-md">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('staff.search_placeholder', "Ism, username yoki telefon bo'yicha qidirish...")}
            className="pl-9 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 px-2"
          >
            {t('common.clear_filters', 'Tozalash')}
          </button>
        )}
        <span className="text-sm text-zinc-500 dark:text-zinc-400 flex-shrink-0">
          {filtered.length} {t('staff.staff_count', 'ta xodim')}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 shadow-sm backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-100/80 dark:bg-zinc-900/60">
              <tr>
                <th className="px-6 py-4 font-semibold">{t('staff.table.staff', 'Xodim')}</th>
                <th className="px-6 py-4 font-semibold">{t('staff.table.username', 'Username')}</th>
                <th className="px-6 py-4 font-semibold">{t('staff.table.phone', 'Telefon')}</th>
                <th className="px-6 py-4 font-semibold">{t('staff.table.activity', 'Faoliyat')}</th>
                <th className="px-6 py-4 font-semibold">{t('staff.table.status', 'Holati')}</th>
                <th className="px-6 py-4 font-semibold">{t('staff.table.last_login', 'Oxirgi kirish')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('common.actions', 'Amallar')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-zinc-400 dark:text-zinc-500">
                    {search ? t('common.no_results', 'Natija topilmadi') : t('common.no_data', "Ma'lumot yo'q")}
                  </td>
                </tr>
              ) : (
                filtered.map((user: any) => (
                  <tr
                    key={user._id}
                    className="border-b border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                  >
                    {/* Avatar + Ism */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {user.fullName?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{user.fullName}</p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Shield className="w-3 h-3" />
                            {user.role === 'admin' ? t('staff.role_admin', 'Admin') : t('staff.role_reception', "Qabul bo'limi")}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                        @{user.username}
                      </span>
                    </td>

                    {/* Telefon */}
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {user.phone || <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                    </td>

                    {/* Jami amallar */}
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 text-xs">
                        <Activity className="w-3.5 h-3.5 text-blue-400" />
                        {user.totalActions ?? 0} {t('staff.actions_count', 'ta amal')}
                      </span>
                    </td>

                    {/* Holat */}
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                        user.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                          : 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400'
                      )}>
                        {user.isActive
                          ? <><CheckCircle2 className="w-3 h-3" /> {t('common.active', 'Faol')}</>
                          : <><XCircle className="w-3 h-3" /> {t('common.inactive', 'Nofaol')}</>
                        }
                      </span>
                    </td>

                    {/* Oxirgi faollik */}
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        {user.lastActivity
                          ? new Date(user.lastActivity).toLocaleString('uz-UZ')
                          : t('staff.never_logged_in', 'Hali kirmagan')}
                      </span>
                    </td>

                    {/* Amallar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          {t('common.edit', 'Tahrirlash')}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={deletingId === user._id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 transition-colors disabled:opacity-50"
                        >
                          {deletingId === user._id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                          {t('common.delete', "O'chirish")}
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

      <StaffModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingStaff(null); }}
        editingStaff={editingStaff}
      />
    </div>
  );
}
