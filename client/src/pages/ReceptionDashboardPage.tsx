import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useRooms } from '../hooks/useRooms';
import { useBookings, useActiveBookings } from '../hooks/useBookings';
import { useDashboardStats } from '../hooks/useDashboard';
import { useReports } from '../hooks/useReports';
import { useSocketStore } from '../stores/useSocketStore';
import {
  BedDouble, CheckSquare, Clock, AlertTriangle, UserPlus, ArrowRight,
  Loader2, Users, Calendar, TrendingUp, Wifi, WifiOff, DollarSign,
  Activity, LogIn, LogOut, Wrench, Sparkles, CheckCircle2,
  Search, Filter, X, ChevronDown, ChevronUp, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import RoomDetailModal from '../components/modals/RoomDetailModal';

// ——— Stat kartochkasi ———
function StatCard({ label, value, sub, icon: Icon, colorClass, onClick }: {
  label: string; value: React.ReactNode; sub?: string;
  icon: any; colorClass: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={cn(
      'rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 p-5 shadow-sm backdrop-blur-md flex items-center gap-4 transition-all',
      onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
    )}>
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner', colorClass)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ——— Status badge ———
function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    active: { label: t('common.active', 'Faol'), cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', Icon: CheckCircle2 },
    checked_out: { label: t('reception.checked_out', 'Chiqdi'), cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400', Icon: LogOut },
    cancelled: { label: t('common.cancelled', 'Bekor'), cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', Icon: AlertTriangle },
  };
  const cfg = map[status] ?? map.cancelled;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.cls)}>
      <cfg.Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// ——— Filter chip ———
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
        active
          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
          : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
      )}
    >
      {children}
    </button>
  );
}

// ——— Quick date range ———
function getRange(type: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  if (type === 'today') return { from: today, to: end };
  if (type === 'week') {
    const from = new Date(today); from.setDate(today.getDate() - 7);
    return { from, to: end };
  }
  if (type === 'month') {
    const from = new Date(today); from.setDate(today.getDate() - 30);
    return { from, to: end };
  }
  return null;
}

const fmt = (d: string) => new Date(d).toLocaleDateString('uz-UZ');

export default function ReceptionDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { isConnected } = useSocketStore();

  // — Asosiy ma'lumotlar —
  const { data: rooms } = useRooms();
  const { data: activeBookings } = useActiveBookings();
  const { data: allBookings, isLoading: bookingsLoading } = useBookings();
  const { data: stats } = useDashboardStats();
  const { data: reports } = useReports();

  // ——— FILTER STATE ———
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateType, setDateType] = useState<'checkin' | 'checkout'>('checkin');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [quickRange, setQuickRange] = useState('');
  const [payFilter, setPayFilter] = useState('all'); // all | paid | debt
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const applyQuick = (type: string) => {
    const r = getRange(type);
    if (!r) { setDateFrom(''); setDateTo(''); setQuickRange(''); return; }
    setDateFrom(r.from.toISOString().split('T')[0]);
    setDateTo(r.to.toISOString().split('T')[0]);
    setQuickRange(type);
  };

  // ——— FILTERED BOOKINGS ———
  const filtered = useMemo(() => {
    if (!allBookings) return [];
    let list = [...allBookings];

    // Status
    if (statusFilter !== 'all') list = list.filter(b => b.status === statusFilter);

    // To'lov
    if (payFilter === 'paid') list = list.filter(b => b.totalPrice - b.paidAmount <= 0);
    if (payFilter === 'debt') list = list.filter(b => b.totalPrice - b.paidAmount > 0);

    // Sana oralig'i
    if (dateFrom || dateTo) {
      list = list.filter(b => {
        const raw = dateType === 'checkin' ? b.checkInDate : b.checkOutDate;
        const d = new Date(raw);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      });
    }

    // Qidiruv
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.guestDetails?.fullName?.toLowerCase().includes(q) ||
        b.guestDetails?.phone?.toLowerCase().includes(q) ||
        b.room?.roomNumber?.toString().includes(q)
      );
    }

    return list;
  }, [allBookings, statusFilter, payFilter, dateFrom, dateTo, dateType, search]);

  const hasFilter = statusFilter !== 'all' || payFilter !== 'all' || dateFrom || dateTo || search;
  const clearFilter = () => {
    setStatusFilter('all'); setPayFilter('all');
    setDateFrom(''); setDateTo(''); setSearch(''); setQuickRange('');
  };

  // — Xona holatlari —
  const available = rooms?.filter((r: any) => r.status === 'available').length ?? 0;
  const booked = rooms?.filter((r: any) => r.status === 'booked').length ?? 0;
  const cleaning = rooms?.filter((r: any) => r.status === 'cleaning').length ?? 0;
  const maintenance = rooms?.filter((r: any) => r.status === 'maintenance').length ?? 0;
  const totalRooms = rooms?.length ?? 0;
  const occupancyRate = totalRooms > 0 ? Math.round((booked / totalRooms) * 100) : 0;

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const checkingOutToday = activeBookings?.filter((b: any) => {
    const d = new Date(b.checkOutDate);
    return d >= todayStart && d <= todayEnd;
  }) ?? [];

  const debtBookings = activeBookings?.filter((b: any) => b.totalPrice - b.paidAmount > 0) ?? [];
  const totalDebt = debtBookings.reduce((s: number, b: any) => s + (b.totalPrice - b.paidAmount), 0);
  const overdueBookings = activeBookings?.filter((b: any) => new Date(b.checkOutDate) < todayStart) ?? [];

  // — Statlar hisoblash (filtered)
  const filteredActive = filtered.filter(b => b.status === 'active').length;
  const filteredCheckedOut = filtered.filter(b => b.status === 'checked_out').length;
  const filteredDebt = filtered.filter(b => b.totalPrice - b.paidAmount > 0).length;

  return (
    <div className="space-y-5">

      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
              {t('reception.welcome', 'Xush kelibsiz')}, {user?.fullName?.split(' ')[0]}! 👋
            </h2>
            <span className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
              isConnected
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-500 border-red-200 dark:border-red-800'
            )}>
              {isConnected ? <><Wifi className="w-3 h-3" /> {t('common.realtime', 'Real-time')}</> : <><WifiOff className="w-3 h-3" /> {t('common.disconnected', 'Ulanmagan')}</>}
            </span>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            {now.toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/check-in')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/25 hover:-translate-y-0.5"
        >
          <UserPlus className="w-4 h-4" /> {t('checkin.new_checkin', 'Yangi Check-in')} <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ===== XONA HOLATLARI ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t('rooms.status_available', "Bo'sh")} value={`${available}/${totalRooms}`} sub={`${occupancyRate}% ${t('rooms.booked', 'band')}`} icon={BedDouble} colorClass="bg-emerald-500" onClick={() => navigate('/rooms')} />
        <StatCard label={t('rooms.status_booked', 'Band')} value={booked} sub={`${activeBookings?.length ?? 0} ${t('common.guest', 'mehmon')}`} icon={Users} colorClass="bg-red-500" onClick={() => navigate('/rooms')} />
        <StatCard label={t('rooms.status_cleaning', 'Tozalanmoqda')} value={cleaning} sub={t('reception.checked_out_msg', "Check-out bo'ldi")} icon={Sparkles} colorClass="bg-yellow-500" onClick={() => navigate('/rooms')} />
        <StatCard label={t('rooms.status_maintenance', "Ta'mirlashda")} value={maintenance} sub={t('reception.maintenance_msg', 'Texnik xizmat')} icon={Wrench} colorClass="bg-blue-500" onClick={() => navigate('/rooms')} />
      </div>

      {/* ===== ADMIN STATISTIKA ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-zinc-950/60 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">{t('reception.today_income', 'Bugungi daromad')}</p>
          </div>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{(stats?.today?.income ?? 0).toLocaleString()} UZS</p>
        </div>
        <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-zinc-950/60 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <LogIn className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">{t('reception.today_checkins', 'Bugun kelganlar')}</p>
          </div>
          <p className="text-lg font-black text-blue-700 dark:text-blue-400">{stats?.today?.checkIns ?? 0} ta</p>
        </div>
        <div className={cn('rounded-xl border p-4 shadow-sm bg-gradient-to-br',
          checkingOutToday.length > 0
            ? 'border-yellow-100 dark:border-yellow-900/40 from-yellow-50 to-white dark:from-yellow-950/20 dark:to-zinc-950/60'
            : 'border-zinc-200 dark:border-zinc-800 from-zinc-50 to-white dark:from-zinc-900/20 dark:to-zinc-950')}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className={cn('w-4 h-4', checkingOutToday.length > 0 ? 'text-yellow-500' : 'text-zinc-400')} />
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">{t('reception.today_checkouts', 'Bugun ketadiganlar')}</p>
          </div>
          <p className={cn('text-lg font-black', checkingOutToday.length > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-zinc-700 dark:text-zinc-300')}>
            {checkingOutToday.length} ta
          </p>
        </div>
        <div className={cn('rounded-xl border p-4 shadow-sm bg-gradient-to-br',
          totalDebt > 0
            ? 'border-red-100 dark:border-red-900/40 from-red-50 to-white dark:from-red-950/20 dark:to-zinc-950/60'
            : 'border-zinc-200 dark:border-zinc-800 from-zinc-50 to-white dark:from-zinc-900/20 dark:to-zinc-950')}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={cn('w-4 h-4', totalDebt > 0 ? 'text-red-500' : 'text-zinc-400')} />
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">{t('reception.total_debt', 'Umumiy qarz')}</p>
          </div>
          <p className={cn('text-lg font-black', totalDebt > 0 ? 'text-red-700 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300')}>
            {totalDebt > 0 ? `${totalDebt.toLocaleString()} UZS` : '—'}
          </p>
        </div>
      </div>

      {/* ===== FILTER PANEL ===== */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 backdrop-blur-md overflow-hidden shadow-sm">

        {/* Header */}
        <button
          onClick={() => setShowFilter(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">{t('reception.filter_guests', 'Mehmonlarni filterlash')}</span>
            {hasFilter && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                {filtered.length} ta
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasFilter && (
              <span
                onClick={e => { e.stopPropagation(); clearFilter(); }}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X className="w-3 h-3" /> {t('common.clear_filters', 'Tozalash')}
              </span>
            )}
            {showFilter ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </div>
        </button>

        {/* Filter body */}
        {showFilter && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 space-y-4">

            {/* Qidiruv */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('reception.search_placeholder', "Ism, telefon, xona raqami bo'yicha qidirish...")}
                className="pl-9 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Holat filterlari */}
              <div>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">{t('reception.occupancy_status', 'Bandlik holati')}</p>
                <div className="flex flex-wrap gap-2">
                  <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>📋 {t('common.all', 'Barchasi')}</Chip>
                  <Chip active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>🟢 {t('reception.active_now', 'Faol (hozir)')}</Chip>
                  <Chip active={statusFilter === 'checked_out'} onClick={() => setStatusFilter('checked_out')}>🚪 {t('reception.checked_out_full', 'Chiqib ketgan')}</Chip>
                  <Chip active={statusFilter === 'cancelled'} onClick={() => setStatusFilter('cancelled')}>❌ {t('reception.cancelled_full', 'Bekor qilingan')}</Chip>
                </div>
              </div>

              {/* To'lov filterlari */}
              <div>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">{t('reception.payment_status', "To'lov holati")}</p>
                <div className="flex flex-wrap gap-2">
                  <Chip active={payFilter === 'all'} onClick={() => setPayFilter('all')}>💳 {t('common.all', 'Barchasi')}</Chip>
                  <Chip active={payFilter === 'paid'} onClick={() => setPayFilter('paid')}>✅ {t('reception.fully_paid', "To'liq to'langan")}</Chip>
                  <Chip active={payFilter === 'debt'} onClick={() => setPayFilter('debt')}>⚠️ {t('reception.has_debt', 'Qarzi bor')}</Chip>
                </div>
              </div>
            </div>

            {/* Sana filterlari */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{t('reception.by_date', "Sana bo'yicha")}</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setDateType('checkin')}
                    className={cn('text-xs px-2.5 py-1 rounded-lg border transition-colors',
                      dateType === 'checkin'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                    )}
                  >
                    {t('reception.checkin_date', 'Kelish sanasi')}
                  </button>
                  <button
                    onClick={() => setDateType('checkout')}
                    className={cn('text-xs px-2.5 py-1 rounded-lg border transition-colors',
                      dateType === 'checkout'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                    )}
                  >
                    {t('reception.checkout_date', 'Ketish sanasi')}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <Chip active={quickRange === 'today'} onClick={() => applyQuick(quickRange === 'today' ? '' : 'today')}>📅 {t('reception.today', 'Bugun')}</Chip>
                <Chip active={quickRange === 'week'} onClick={() => applyQuick(quickRange === 'week' ? '' : 'week')}>📆 {t('reception.last_7_days', 'Oxirgi 7 kun')}</Chip>
                <Chip active={quickRange === 'month'} onClick={() => applyQuick(quickRange === 'month' ? '' : 'month')}>🗓️ {t('reception.last_30_days', 'Oxirgi 30 kun')}</Chip>
              </div>

              {/* Custom range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">{t('common.from', 'Dan')}</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={e => { setDateFrom(e.target.value); setQuickRange(''); }}
                    className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">{t('common.to', 'Gacha')}</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={e => { setDateTo(e.target.value); setQuickRange(''); }}
                    className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Natijalar */}
            {hasFilter && (
              <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex gap-4 text-xs text-zinc-500">
                  <span>🟢 {t('common.active', 'Faol')}: <strong className="text-zinc-800 dark:text-zinc-200">{filteredActive}</strong></span>
                  <span>🚪 {t('reception.checked_out', 'Chiqdi')}: <strong className="text-zinc-800 dark:text-zinc-200">{filteredCheckedOut}</strong></span>
                  <span>⚠️ {t('reception.debt', 'Qarz')}: <strong className="text-zinc-800 dark:text-zinc-200">{filteredDebt}</strong></span>
                  <span className="text-emerald-600 font-bold">{t('common.total', 'Jami')}: {filtered.length}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== FILTER NATIJASI JADVAL ===== */}
      {hasFilter && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                {t('reception.filter_results', 'Filter natijalari')}
                <span className="ml-2 text-zinc-400 font-normal">({filtered.length} {t('common.count', 'ta')})</span>
              </span>
            </div>
          </div>

          {bookingsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-zinc-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
              {t('reception.no_guests_found', 'Filtrga mos mehmon topilmadi')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs text-zinc-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">{t('reception.guest', 'Mehmon')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('reception.room', 'Xona')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('reception.checkin', 'Kelish')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('reception.checkout', 'Ketish')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('reception.total', 'Jami')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('reception.debt', 'Qarz')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('reception.status', 'Holat')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b: any) => {
                    const debt = b.totalPrice - b.paidAmount;
                    const familyCount = 1 + (b.guestDetails?.familyMembers?.length || 0);
                    return (
                      <tr
                        key={b._id}
                        onClick={() => setSelectedRoomId(b.room?._id)}
                        className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3">
                          <div>
                            <p className="font-semibold text-zinc-800 dark:text-zinc-200">{b.guestDetails?.fullName}</p>
                            <p className="text-xs text-zinc-400">{b.guestDetails?.phone}</p>
                            {familyCount > 1 && (
                              <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full">
                                {familyCount} {t('checkin.members_count', 'kishi')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                            #{b.room?.roomNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{fmt(b.checkInDate)}</td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{fmt(b.checkOutDate)}</td>
                        <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                          {b.totalPrice.toLocaleString()} UZS
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {debt > 0
                            ? <span className="text-red-600 dark:text-red-400 font-bold">{debt.toLocaleString()} UZS</span>
                            : <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                          }
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== KECHIKKAN OGOHLANTIRUV ===== */}
      {overdueBookings.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/20 overflow-hidden shadow-sm">
          <div className="px-5 py-3 bg-red-100 dark:bg-red-900/30 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <h3 className="font-bold text-red-700 dark:text-red-400 text-sm">{t('reception.late_guests', 'Kechikkan mehmonlar')} — {overdueBookings.length} {t('common.count', 'ta')}</h3>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-900/30">
            {overdueBookings.map((b: any) => {
              const days = Math.ceil((todayStart.getTime() - new Date(b.checkOutDate).getTime()) / (1000 * 60 * 60 * 24));
              const debt = b.totalPrice - b.paidAmount;
              return (
                <div
                  key={b._id}
                  onClick={() => setSelectedRoomId(b.room?._id)}
                  className="px-5 py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-red-100/50 dark:hover:bg-red-900/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-red-200 dark:bg-red-800/40 flex items-center justify-center text-xs font-black text-red-700 dark:text-red-300 flex-shrink-0">
                      {(b.room as any)?.roomNumber}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-red-800 dark:text-red-200 text-sm truncate">{b.guestDetails?.fullName}</p>
                      <p className="text-xs text-red-500 dark:text-red-400">{days} {t('reception.days_late', 'kun kechikdi')} · {b.guestDetails?.phone}</p>
                    </div>
                  </div>
                  {debt > 0 && (
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800/50 flex-shrink-0">
                      {debt.toLocaleString()} UZS {t('reception.debt', 'qarz')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== 3 USTUNLI JADVAL / WIDGETLAR ===== */}
      {!hasFilter && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Bugun check-out */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 bg-yellow-50/60 dark:bg-yellow-950/10">
              <Calendar className="w-4 h-4 text-yellow-500" />
              <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
                {t('reception.today_checkout_list', 'Bugun check-out')} <span className="text-yellow-500 font-normal">({checkingOutToday.length})</span>
              </h3>
            </div>
            {checkingOutToday.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-sm">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                {t('reception.no_today_checkout', "Bugun check-out yo'q")}
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                {checkingOutToday.map((b: any) => {
                  const debt = b.totalPrice - b.paidAmount;
                  const familyCount = 1 + (b.guestDetails?.familyMembers?.length || 0);
                  return (
                    <div
                      key={b._id}
                      onClick={() => setSelectedRoomId(b.room?._id)}
                      className="px-5 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-xs font-black text-yellow-700 dark:text-yellow-400 flex-shrink-0">
                          {(b.room as any)?.roomNumber}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm truncate">{b.guestDetails?.fullName}</p>
                          <p className="text-xs text-zinc-400">{b.guestDetails?.phone} · {familyCount} {t('checkin.members_count', 'kishi')}</p>
                        </div>
                      </div>
                      {debt > 0
                        ? <span className="text-xs font-bold text-red-600 dark:text-red-400 flex-shrink-0">{debt.toLocaleString()} UZS</span>
                        : <span className="text-xs text-emerald-600 flex-shrink-0 font-medium">✓ {t('reception.fully_paid', "To'liq")}</span>
                      }
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aktiv mehmonlar */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/30">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
                  {t('reception.active_guests', 'Aktiv mehmonlar')} <span className="text-red-500 font-normal">({activeBookings?.length ?? 0})</span>
                </h3>
              </div>
              <button onClick={() => navigate('/rooms')} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                {t('reception.rooms', 'Xonalar')} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {!activeBookings || activeBookings.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-sm">
                <BedDouble className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                {t('reception.no_active_guests', "Faol mehmon yo'q")}
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                {activeBookings.map((b: any) => {
                  const debt = b.totalPrice - b.paidAmount;
                  const checkOut = new Date(b.checkOutDate);
                  const daysLeft = Math.ceil((checkOut.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const familyCount = 1 + (b.guestDetails?.familyMembers?.length || 0);
                  const isLate = daysLeft <= 0;
                  const isSoon = daysLeft === 1;
                  return (
                    <div
                      key={b._id}
                      onClick={() => setSelectedRoomId(b.room?._id)}
                      className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0',
                        isLate ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                      )}>
                        {(b.room as any)?.roomNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm truncate">{b.guestDetails?.fullName}</p>
                          {familyCount > 1 && <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full">+{familyCount - 1}</span>}
                        </div>
                        <p className={cn('text-xs mt-0.5', isLate ? 'text-red-500 font-bold' : isSoon ? 'text-orange-500' : 'text-zinc-400')}>
                          {isLate ? `⚠️ ${t('reception.late_warning', 'Kechikkan!')}` : isSoon ? `⏰ ${t('reception.tomorrow_warning', 'Ertaga')}` : `${daysLeft} ${t('reception.days_left', 'kun qoldi')}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <StatusBadge status={b.status} />
                        {debt > 0 && <span className="text-xs text-red-500 font-medium">{debt.toLocaleString()}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Mening Hisobotlarim */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-blue-50/60 dark:bg-blue-900/10">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
                  {t('reception.my_last_reports', "So'nggi Hisobotlarim")}
                </h3>
              </div>
              <button onClick={() => navigate('/reports')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                {t('common.view_all', 'Barchasi')} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {!reports || reports.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-sm flex flex-col items-center">
                <FileText className="w-8 h-8 mb-2 text-zinc-300 dark:text-zinc-600" />
                {t('reception.no_reports', "Hozircha hisobot yo'q")}
                <button onClick={() => navigate('/reports')} className="mt-2 text-blue-500 hover:underline">{t('reception.write_new', 'Yangi yozish')}</button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                {reports.slice(0, 5).map((r: any) => (
                  <div key={r._id} onClick={() => navigate('/reports')} className="px-5 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-400">
                        {r.type === 'daily' ? t('reports.daily', 'Kunlik') : r.type === 'weekly' ? t('reports.weekly', 'Haftalik') : t('reports.monthly', 'Oylik')}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(r.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {r.content}
                    </p>
                    <div className="mt-2 flex justify-end">
                      {r.status === 'submitted' ? (
                        <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded">{t('reports.status_submitted', 'Kutilayapdi')}</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{t('reports.status_reviewed', "Ko'rdi")}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Detail Modal */}
      <RoomDetailModal
        roomId={selectedRoomId}
        onClose={() => setSelectedRoomId(null)}
      />
    </div>
  );
}
