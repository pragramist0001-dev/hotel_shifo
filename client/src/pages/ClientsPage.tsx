import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBookings, useUpdateBooking, useDeleteBooking, useAddPayment, useFreezeBooking, useResumeBooking, useRemoveFamilyMember, useRemoveSpouse, useRemoveMainGuest, useCheckOut } from '../hooks/useBookings';
import { useRooms } from '../hooks/useRooms';
import { useAuthStore } from '../stores/useAuthStore';
import { handlePrintReceipt } from '../utils/printReceipt';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Edit, Trash2, Search, Users, Filter, Snowflake, Play, UserMinus, Printer, UserCog } from 'lucide-react';


// Move these inside component or use translation functions below
const STATUS_OPTS = [
  { value: 'all', label: 'common.all' },
  { value: 'active', label: 'clients.active_clients' },
  { value: 'checked_out', label: 'clients.checked_out' },
  { value: 'cancelled', label: 'clients.cancelled' },
  { value: 'frozen', label: 'clients.frozen' },
];

const PAYMENT_OPTS = [
  { value: 'all', label: 'common.all' },
  { value: 'paid', label: 'clients.paid' },
  { value: 'partially_paid', label: 'clients.partially_paid' },
  { value: 'unpaid', label: 'clients.unpaid' },
];

export default function ClientsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: bookings, isLoading } = useBookings();
  const updateMutation = useUpdateBooking();
  const deleteMutation = useDeleteBooking();
  const addPaymentMutation = useAddPayment();
  const freezeMutation = useFreezeBooking();
  const resumeMutation = useResumeBooking();
  const removeFamilyMutation = useRemoveFamilyMember();
  const removeSpouseMutation = useRemoveSpouse();
  const removeMainGuestMutation = useRemoveMainGuest();
  const checkoutMutation = useCheckOut();

  const { data: availableRooms } = useRooms({ status: 'available' });

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [removeFamilyModalOpen, setRemoveFamilyModalOpen] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [editCheckOutDate, setEditCheckOutDate] = useState<string>('');

  const [resumeRoomId, setResumeRoomId] = useState<string>('');
  const [resumeCheckOut, setResumeCheckOut] = useState<string>('');

  const [familyMemberIndex, setFamilyMemberIndex] = useState<number>(0);

  // Edit Guest Info states
  const [editGuestModalOpen, setEditGuestModalOpen] = useState(false);
  const [editGuestData, setEditGuestData] = useState({
    fullName: '',
    phone: '',
    historyNumber: '',
    passportSeries: '',
    birthYear: '',
    birthDate: '',
    country: '',
  });

  // === FILTERLAR ===
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const filtered = useMemo(() => {
    if (!bookings) return [];
    let result = bookings;

    if (statusFilter && statusFilter !== 'all') {
      result = result.filter((b: any) => b.status === statusFilter);
    }
    if (paymentFilter && paymentFilter !== 'all') {
      result = result.filter((b: any) => b.paymentStatus === paymentFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((b: any) =>
        b.guestDetails?.fullName?.toLowerCase().includes(q) ||
        b.guestDetails?.phone?.toLowerCase().includes(q) ||
        b.guestDetails?.passportSeries?.toLowerCase().includes(q) ||
        String(b.room?.roomNumber ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [bookings, search, statusFilter, paymentFilter]);

  // === PAGINATION ===
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, paymentFilter]);

  const openPaymentModal = (booking: any) => {
    setSelectedBooking(booking);
    setPaymentAmount(booking.totalPrice - booking.paidAmount);
    setPaymentMethod('cash');
    setPaymentModalOpen(true);
  };

  const openEditModal = (booking: any) => {
    setSelectedBooking(booking);
    setEditCheckOutDate(new Date(booking.checkOutDate).toISOString().split('T')[0]);
    setEditModalOpen(true);
  };

  const openEditGuestModal = (booking: any) => {
    setSelectedBooking(booking);
    setEditGuestData({
      fullName: booking.guestDetails.fullName || '',
      phone: booking.guestDetails.phone || '',
      historyNumber: booking.guestDetails.historyNumber || '',
      passportSeries: booking.guestDetails.passportSeries || '',
      birthYear: booking.guestDetails.birthYear?.toString() || '',
      birthDate: booking.guestDetails.birthDate ? new Date(booking.guestDetails.birthDate).toISOString().split('T')[0] : '',
      country: booking.guestDetails.country || '',
    });
    setEditGuestModalOpen(true);
  };

  const handleAddPayment = () => {
    if (!selectedBooking) return;
    const amountToPay = Number(paymentAmount);
    addPaymentMutation.mutate(
      { id: selectedBooking._id, data: { amount: amountToPay, paymentMethod } },
      { onSuccess: () => {
          setPaymentModalOpen(false);
          handlePrintReceipt({
            bookingId: selectedBooking._id,
            guestName: selectedBooking.guestDetails.fullName,
            roomNumber: selectedBooking.room?.roomNumber || '-',
            checkInDate: new Date(selectedBooking.checkInDate).toLocaleDateString('uz-UZ'),
            checkOutDate: new Date(selectedBooking.checkOutDate).toLocaleDateString('uz-UZ'),
            totalPrice: selectedBooking.totalPrice,
            paidAmount: selectedBooking.paidAmount + amountToPay,
            paymentAmount: amountToPay,
            paymentMethod,
            cashierName: user?.fullName || 'Xodim',
            date: new Date().toLocaleString('uz-UZ')
          });
      } }
    );
  };

  const handleEditBooking = () => {
    if (!selectedBooking) return;
    updateMutation.mutate(
      { id: selectedBooking._id, data: { checkOutDate: editCheckOutDate } },
      { onSuccess: () => setEditModalOpen(false) }
    );
  };

  const handleEditGuest = () => {
    if (!selectedBooking) return;
    updateMutation.mutate(
      { 
        id: selectedBooking._id, 
        data: { 
          guestDetails: {
            ...editGuestData,
            birthYear: editGuestData.birthYear ? Number(editGuestData.birthYear) : undefined,
            birthDate: editGuestData.birthDate ? new Date(editGuestData.birthDate) : undefined,
          }
        } 
      },
      { onSuccess: () => setEditGuestModalOpen(false) }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`"${name}" ni o'chirmoqchimisiz?`)) return;
    deleteMutation.mutate(id);
  };

  const handleFreeze = (id: string, name: string) => {
    if (!window.confirm(`"${name}" ning xonasini bo'shatib, qolgan pulini muzlatib qo'ymoqchimisiz?`)) return;
    freezeMutation.mutate(id);
  };

  const openResumeModal = (booking: any) => {
    setSelectedBooking(booking);
    setResumeRoomId('');
    setResumeCheckOut('');
    setResumeModalOpen(true);
  };

  const handleResume = () => {
    if (!selectedBooking || !resumeRoomId || !resumeCheckOut) return;
    resumeMutation.mutate(
      { id: selectedBooking._id, data: { roomId: resumeRoomId, checkOutDate: resumeCheckOut } },
      { onSuccess: () => setResumeModalOpen(false) }
    );
  };

  const openRemoveFamilyModal = (booking: any) => {
    setSelectedBooking(booking);
    // If there are multiple people, we want to allow removing the main guest or family members.
    // Let's default to family member 0, or main guest if there are no family members (though in that case they should just use check-out).
    const hasSpouse = booking.guestDetails.maritalStatus === 'married' && booking.guestDetails.spouseDetails?.fullName;
    setFamilyMemberIndex(hasSpouse ? -1 : (booking.guestDetails.familyMembers?.length > 0 ? 0 : -2));
    setRemoveFamilyModalOpen(true);
  };

  const handleRemoveFamily = () => {
    if (!selectedBooking) return;
    
    if (familyMemberIndex === -2) {
      const familyCount = selectedBooking.guestDetails.familyMembers?.length || 0;
      const hasSpouse = selectedBooking.guestDetails.maritalStatus === 'married' && selectedBooking.guestDetails.spouseDetails?.fullName;
      
      if (familyCount === 0 && !hasSpouse) {
        // Bu yagona odam, xonani bo'shatish kerak
        if (confirm(t('rooms.checkout_confirm', 'Bu yagona mehmon. Xonani butunlay bo\'shatmoqchimisiz?'))) {
          checkoutMutation.mutate({ id: selectedBooking._id });
          setRemoveFamilyModalOpen(false);
        }
      } else {
        removeMainGuestMutation.mutate(
          selectedBooking._id,
          { onSuccess: () => setRemoveFamilyModalOpen(false) }
        );
      }
    } else if (familyMemberIndex === -1) {
      removeSpouseMutation.mutate(
        selectedBooking._id,
        { onSuccess: () => setRemoveFamilyModalOpen(false) }
      );
    } else {
      removeFamilyMutation.mutate(
        { id: selectedBooking._id, memberIndex: familyMemberIndex },
        { onSuccess: () => setRemoveFamilyModalOpen(false) }
      );
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('uz-UZ');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  const hasFilters = search || (statusFilter && statusFilter !== 'all') || (paymentFilter && paymentFilter !== 'all');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('clients.title', 'Mijozlar')}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            {t('clients.subtitle', "Barcha bandliklar va ularning to'lov holati")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 bg-white/70 dark:bg-zinc-900/50 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <Users className="w-4 h-4" />
          <span>{t('common.status', 'Jami').split(' ')[0]}: <strong className="text-zinc-800 dark:text-zinc-200">{bookings?.length ?? 0}</strong></span>
        </div>
      </div>

      {/* Filter paneli */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-md space-y-3">
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-1">
          <Filter className="w-4 h-4" />
          <span className="font-medium">{t('common.filters', 'Filter va qidiruv')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Qidiruv */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('clients.search_placeholder', 'Ism, telefon, xona, pasport...')}
              className="pl-9 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
              <SelectValue placeholder={t('common.status', 'Bandlik holati')} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              {STATUS_OPTS.map(o => (
                <SelectItem key={o.value} value={o.value}>{t(o.label, o.label)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* To'lov filter */}
          <Select value={paymentFilter || 'all'} onValueChange={(v) => setPaymentFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
              <SelectValue placeholder={t('clients.table.payment', "To'lov holati")} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              {PAYMENT_OPTS.map(o => (
                <SelectItem key={o.value} value={o.value}>{t(o.label, o.label)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {filtered.length} {t('common.results_found', 'ta natija topildi')}
            </span>
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setPaymentFilter(''); }}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {t('common.clear_filters', 'Filtrlarni tozalash')}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 shadow-sm backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
                <TableHead className="font-semibold">Pasport / Istoriya</TableHead>
                <TableHead className="font-semibold">{t('clients.table.client')}</TableHead>
                <TableHead className="font-semibold">{t('clients.table.room')}</TableHead>
                <TableHead className="font-semibold">{t('clients.table.stay')}</TableHead>
                <TableHead className="font-semibold">{t('finance.table.amount')}</TableHead>
                <TableHead className="font-semibold">{t('clients.paid')}</TableHead>
                <TableHead className="font-semibold">{t('clients.debt')}</TableHead>
                <TableHead className="font-semibold">{t('common.status')}</TableHead>
                <TableHead className="text-right font-semibold">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((booking: any) => {
                const debt = booking.totalPrice - booking.paidAmount;
                const hasSpouse = booking.guestDetails?.maritalStatus === 'married' && booking.guestDetails?.spouseDetails?.fullName ? 1 : 0;
                const familyCount = 1 + hasSpouse + (booking.guestDetails?.familyMembers?.length || 0);
                return (
                  <TableRow key={booking._id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          {booking.guestDetails.passportSeries || '-'}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium">
                          ID: {booking.guestDetails.historyNumber || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{booking.guestDetails.fullName}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{booking.guestDetails.phone}</p>
                        {familyCount > 1 && (
                          <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full inline-block mt-1">
                            {familyCount} kishi
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        #{booking.room?.roomNumber}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      <div>{formatDate(booking.checkInDate)}</div>
                      <div className="text-zinc-400">→ {formatDate(booking.checkOutDate)}</div>
                      <div className="text-xs text-zinc-400">{booking.numberOfNights} {t('checkin.nights').replace('?', '').replace('*', '')}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {booking.totalPrice.toLocaleString()} UZS
                    </TableCell>
                    <TableCell className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {booking.paidAmount.toLocaleString()} UZS
                    </TableCell>
                    <TableCell>
                      {debt > 0 ? (
                        <span className="text-red-600 dark:text-red-400 font-bold">{debt.toLocaleString()} UZS</span>
                      ) : (
                        <span className="text-zinc-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {booking.status === 'active' ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                          {t('clients.active_clients').split(' ')[0]}
                        </span>
                      ) : booking.status === 'checked_out' ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          {t('clients.checked_out', 'Chiqib ketgan')}
                        </span>
                      ) : booking.status === 'frozen' ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                          {t('clients.frozen', 'Muzlatilgan')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/40">
                          {t('clients.cancelled', 'Bekor qilingan')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        {booking.status === 'active' && debt > 0 && (
                          <button
                            onClick={() => openPaymentModal(booking)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 transition-colors"
                            title="To'lov qo'shish"
                          >
                            <Plus className="w-3 h-3" /> To'lov
                          </button>
                        )}
                        {booking.status === 'active' && (
                          <>
                            <button
                              onClick={() => openEditGuestModal(booking)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors"
                              title="Mijozni tahrirlash"
                            >
                              <UserCog className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(booking)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors"
                              title="Sanani uzaytirish"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrintReceipt({
                                bookingId: booking._id,
                                guestName: booking.guestDetails.fullName,
                                roomNumber: booking.room?.roomNumber || '-',
                                checkInDate: new Date(booking.checkInDate).toLocaleDateString('uz-UZ'),
                                checkOutDate: new Date(booking.checkOutDate).toLocaleDateString('uz-UZ'),
                                totalPrice: booking.totalPrice,
                                paidAmount: booking.paidAmount,
                                paymentMethod: booking.paymentMethod || 'cash',
                                cashierName: booking.byReceptionist?.fullName || user?.fullName || 'Xodim',
                                date: new Date().toLocaleString('uz-UZ')
                              })}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors"
                              title="Chek chiqarish"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFreeze(booking._id, booking.guestDetails.fullName)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors"
                              title="Muzlatish (Vaqtinchalik ketish)"
                            >
                              <Snowflake className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openRemoveFamilyModal(booking)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors"
                              title="Mehmonni chiqarib yuborish"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`"${booking.guestDetails.fullName}" ni checkout qilmoqchimisiz?`)) {
                                  checkoutMutation.mutate({ id: booking._id });
                                }
                              }}
                              disabled={checkoutMutation.isPending}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors disabled:opacity-50"
                              title="Check-out (Chiqib ketdi)"
                            >
                              {checkoutMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="text-xs font-bold">CO</span>}
                            </button>
                          </>
                        )}
                        {booking.status === 'frozen' && (
                          <button
                            onClick={() => openResumeModal(booking)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/50 transition-colors"
                          >
                            <Play className="w-3 h-3" /> Davom etish
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(booking._id, booking.guestDetails.fullName)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors disabled:opacity-50"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-zinc-400">
                    {hasFilters ? t('common.no_results', 'Natija topilmadi') : t('common.no_data', "Ma'lumot yo'q")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Oldingi
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                className={currentPage === page ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Keyingi
          </Button>
        </div>
      )}

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">{t('modals.client.pay_debt')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Mijoz</Label>
              <Input disabled value={selectedBooking?.guestDetails.fullName || ''} className="bg-zinc-50 dark:bg-zinc-900" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Qarz miqdori</Label>
              <Input
                disabled
                value={`${(selectedBooking?.totalPrice - selectedBooking?.paidAmount || 0).toLocaleString()} UZS`}
                className="text-red-500 font-bold bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">To'lanayotgan summa</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={paymentAmount}
                onChange={e => setPaymentAmount(Number(e.target.value))}
                placeholder="Masalan: 500000"
                className="bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('modals.client.payment_method')}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950">
                  <SelectItem value="cash">Naqd pul</SelectItem>
                  <SelectItem value="terminal">Terminal</SelectItem>
                  <SelectItem value="click">Click</SelectItem>
                  <SelectItem value="transfer">Pul o'tkazma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddPayment} disabled={addPaymentMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {addPaymentMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal (Sana) */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">Ketish sanasini uzaytirish</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Yangi ketish sanasi</Label>
              <Input
                type="date"
                value={editCheckOutDate}
                onChange={e => setEditCheckOutDate(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Sanani o'zgartirsangiz jami summa va qarz avtomatik qayta hisoblanadi.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleEditBooking} disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Guest Info Modal */}
      <Dialog open={editGuestModalOpen} onOpenChange={setEditGuestModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">{t('clients.edit_client', 'Mijoz ma\'lumotlarini tahrirlash')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.fullname').replace('*', '')}</Label>
              <Input
                value={editGuestData.fullName}
                onChange={e => setEditGuestData(prev => ({...prev, fullName: e.target.value}))}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.phone').replace('*', '')}</Label>
              <Input
                value={editGuestData.phone}
                onChange={e => setEditGuestData(prev => ({...prev, phone: e.target.value}))}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.history_num', 'Istoriya №')}</Label>
              <Input
                value={editGuestData.historyNumber}
                onChange={e => setEditGuestData(prev => ({...prev, historyNumber: e.target.value}))}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.birth_year').replace('*', '')}</Label>
              <Input
                type="number"
                value={editGuestData.birthYear}
                onChange={e => setEditGuestData(prev => ({...prev, birthYear: e.target.value}))}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.birth_date', 'Tug\'ilgan sana')}</Label>
              <Input
                type="date"
                value={editGuestData.birthDate}
                onChange={e => setEditGuestData(prev => ({...prev, birthDate: e.target.value}))}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.passport_series', 'Pasport seriyasi')}</Label>
              <Input
                value={editGuestData.passportSeries}
                onChange={e => setEditGuestData(prev => ({...prev, passportSeries: e.target.value}))}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-zinc-700 dark:text-zinc-300">Mamlakat</Label>
              <Input
                value={editGuestData.country}
                onChange={e => setEditGuestData(prev => ({...prev, country: e.target.value}))}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGuestModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleEditGuest} disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume Modal */}
      <Dialog open={resumeModalOpen} onOpenChange={setResumeModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">Mijozni davom ettirish</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Yangi Xona</Label>
              <Select value={resumeRoomId} onValueChange={setResumeRoomId}>
                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900">
                  <SelectValue placeholder="Xona tanlang..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950">
                  {availableRooms?.map((r: any) => (
                    <SelectItem key={r._id} value={r._id}>
                      #{r.roomNumber} - {r.type} ({r.pricePerNight.toLocaleString()} UZS)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Yangi ketish sanasi</Label>
              <Input
                type="date"
                value={resumeCheckOut}
                onChange={e => setResumeCheckOut(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
              {selectedBooking?.frozenBalance > 0 && (
                <p className="text-xs text-blue-500 font-medium">
                  Mijozning muzlatilgan {selectedBooking.frozenBalance.toLocaleString()} UZS puli yangi xonaga hisoblanadi.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResumeModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleResume} disabled={resumeMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {resumeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('common.save', 'Davom ettirish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Family Member Modal */}
      <Dialog open={removeFamilyModalOpen} onOpenChange={setRemoveFamilyModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">Mehmonni chiqarish</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Ushbu mehmon erta chiqib ketsa, uning qolgan barcha kunlari avtomatik qolgan mehmonlarga qo'shiladi va ketish sanasi uzayadi. Agar bu oxirgi mehmon bo'lsa, xona butunlay bo'shatiladi.
            </p>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Qaysi mehmon ketyapti?</Label>
              <Select
                value={String(familyMemberIndex)}
                onValueChange={(val) => setFamilyMemberIndex(Number(val))}
              >
                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900">
                  <SelectValue placeholder="Mehmonni tanlang..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950">
                  <SelectItem value="-2">
                    {selectedBooking?.guestDetails.fullName} (Asosiy mehmon)
                  </SelectItem>
                  {selectedBooking?.guestDetails.maritalStatus === 'married' && selectedBooking?.guestDetails.spouseDetails?.fullName && (
                    <SelectItem value="-1">
                      {selectedBooking.guestDetails.spouseDetails.fullName} (Turmush o'rtog'i)
                    </SelectItem>
                  )}
                  {selectedBooking?.guestDetails.familyMembers?.map((m: any, idx: number) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {m.fullName} ({m.relationship || 'Hamroh'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveFamilyModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleRemoveFamily} disabled={removeFamilyMutation.isPending || removeSpouseMutation.isPending || removeMainGuestMutation.isPending || checkoutMutation.isPending} className="bg-orange-600 hover:bg-orange-700 text-white">
              {(removeFamilyMutation.isPending || removeSpouseMutation.isPending || removeMainGuestMutation.isPending || checkoutMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('common.save', 'Tasdiqlash')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
