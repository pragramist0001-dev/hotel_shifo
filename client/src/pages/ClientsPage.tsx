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
import { Loader2, Plus, Edit, Trash2, Search, Users, Filter, Snowflake, Play, UserMinus, Printer, UserCog, Camera, Image as ImageIcon, X, User, Phone, MapPin, CreditCard, Clock, ExternalLink } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';
import { useNavigate } from 'react-router-dom';


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
  const navigate = useNavigate();
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

  // === Mijoz detail modal ===
  const [clientDetailOpen, setClientDetailOpen] = useState(false);
  const [detailBooking, setDetailBooking] = useState<any>(null);

  const openClientDetail = (booking: any) => {
    setDetailBooking(booking);
    setClientDetailOpen(true);
  };

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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editGuestData, setEditGuestData] = useState<{
    fullName: string; phone: string; historyNumber: string; passportSeries: string;
    birthDate: string; country: string; guestImage?: string; guestImageFile?: File | null;
    guestImagePreview?: string | null;
  }>({
    fullName: '',
    phone: '',
    historyNumber: '',
    passportSeries: '',
    birthDate: '',
    country: '',
    guestImage: undefined,
    guestImageFile: null,
    guestImagePreview: null,
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
      birthDate: booking.guestDetails.birthDate ? new Date(booking.guestDetails.birthDate).toISOString().split('T')[0] : '',
      country: booking.guestDetails.country || '',
      guestImage: booking.guestDetails.guestImage,
      guestImageFile: null,
      guestImagePreview: booking.guestDetails.guestImage ? getImageUrl(booking.guestDetails.guestImage) : null,
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

  const handleEditGuest = async () => {
    if (!selectedBooking) return;
    
    let finalImageUrl = editGuestData.guestImage;

    try {
      if (editGuestData.guestImageFile) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('image', editGuestData.guestImageFile);
        
        const token = localStorage.getItem('accessToken');
        const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
        
        const res = await fetch(`${apiUrl}/upload/image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Rasm yuklashda xatolik');
        finalImageUrl = data.url;
      }

      updateMutation.mutate(
        { 
          id: selectedBooking._id, 
          data: { 
            guestDetails: {
              ...editGuestData,
              guestImage: finalImageUrl,
              birthDate: editGuestData.birthDate ? new Date(editGuestData.birthDate) : undefined,
            }
          } 
        },
        { onSuccess: () => setEditGuestModalOpen(false) }
      );
    } catch (error) {
      console.error('Edit guest error:', error);
      alert(t('common.image_upload_error_msg', 'Rasm yuklashda xatolik yuz berdi'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(t('clients.delete_confirm', { name }))) return;
    deleteMutation.mutate(id);
  };

  const handleFreeze = (id: string, name: string) => {
    if (!window.confirm(t('clients.freeze_confirm', { name }))) return;
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
      <div data-aos="fade-up" className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-md space-y-3">
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
      <div data-aos="fade-up" data-aos-delay="100" className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 shadow-sm backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
                <TableHead className="font-semibold">{t('clients.table.passport_history', 'Pasport / Istoriya')}</TableHead>
                <TableHead className="font-semibold">{t('clients.table.client', 'Mijoz')}</TableHead>
                <TableHead className="font-semibold">{t('clients.table.room', 'Xona')}</TableHead>
                <TableHead className="font-semibold">{t('clients.table.stay', 'Muddat')}</TableHead>
                <TableHead className="font-semibold">{t('finance.table.amount', 'Summa')}</TableHead>
                <TableHead className="font-semibold">{t('clients.paid', "To'langan")}</TableHead>
                <TableHead className="font-semibold">{t('clients.debt', 'Qarz')}</TableHead>
                <TableHead className="font-semibold">{t('common.status', 'Holat')}</TableHead>
                <TableHead className="text-right font-semibold">{t('common.actions', 'Amallar')}</TableHead>
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
                        <button
                          onClick={() => openClientDetail(booking)}
                          className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline text-left"
                        >
                          {booking.guestDetails.fullName}
                        </button>
                        <p className="text-xs text-zinc-400 mt-0.5">{booking.guestDetails.phone}</p>
                        {familyCount > 1 && (
                          <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full inline-block mt-1">
                            {familyCount} {t('clients.people', 'kishi')}
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
                            title={t('clients.add_payment_tooltip')}
                          >
                            <Plus className="w-3 h-3" /> {t('finance.payment')}
                          </button>
                        )}
                        {booking.status === 'active' && (
                          <>
                            <button
                              onClick={() => openEditGuestModal(booking)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors"
                              title={t('clients.edit_client_tooltip')}
                            >
                              <UserCog className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(booking)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors"
                              title={t('clients.extend_date_tooltip')}
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
                              title={t('clients.print_receipt_tooltip')}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFreeze(booking._id, booking.guestDetails.fullName)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors"
                              title={t('clients.freeze_tooltip')}
                            >
                              <Snowflake className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openRemoveFamilyModal(booking)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors"
                              title={t('clients.remove_guest_tooltip')}
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(t('clients.checkout_confirm', { name: booking.guestDetails.fullName }))) {
                                  checkoutMutation.mutate({ id: booking._id });
                                }
                              }}
                              disabled={checkoutMutation.isPending}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors disabled:opacity-50"
                              title={t('clients.checkout_tooltip')}
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
                            <Play className="w-3 h-3" /> {t('common.resume')}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(booking._id, booking.guestDetails.fullName)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors disabled:opacity-50"
                          title={t('common.delete_tooltip')}
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

      {/* ===== MIJOZ DETAIL MODAL ===== */}
      <Dialog open={clientDetailOpen} onOpenChange={setClientDetailOpen}>
        <DialogContent className="sm:max-w-[620px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Mijoz ma'lumotlari
            </DialogTitle>
          </DialogHeader>

          {detailBooking && (() => {
            const db = detailBooking;
            const familyMembers = db.guestDetails?.familyMembers || [];
            const hasSpouse = db.guestDetails?.maritalStatus === 'married' && db.guestDetails?.spouseDetails?.fullName;
            const familyCount = 1 + (hasSpouse ? 1 : 0) + familyMembers.length;
            const debt = db.totalPrice - db.paidAmount;
            const checkIn = new Date(db.checkInDate);
            const checkOut = new Date(db.checkOutDate);

            return (
              <div className="space-y-4">
                {/* Asosiy mehmon ma'lumotlari */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4">
                  <div className="flex items-start gap-4">
                    {db.guestDetails?.guestImage ? (
                      <img src={getImageUrl(db.guestDetails.guestImage) || ''} alt="Guest" className="w-16 h-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <User className="w-8 h-8 text-zinc-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{db.guestDetails?.fullName}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1 text-sm text-zinc-500"><Phone className="w-3.5 h-3.5" />{db.guestDetails?.phone}</span>
                        {db.guestDetails?.country && <span className="flex items-center gap-1 text-sm text-zinc-500"><MapPin className="w-3.5 h-3.5" />{db.guestDetails?.country}</span>}
                        {db.guestDetails?.passportSeries && <span className="flex items-center gap-1 text-sm text-zinc-500"><CreditCard className="w-3.5 h-3.5" />{db.guestDetails?.passportSeries}</span>}
                        {db.guestDetails?.historyNumber && <span className="flex items-center gap-1 text-sm text-zinc-500">ID: {db.guestDetails?.historyNumber}</span>}
                        {db.guestDetails?.profession && <span className="flex items-center gap-1 text-sm text-zinc-500">{db.guestDetails?.profession}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="text-center">
                      <p className="text-xs text-zinc-400">Xona</p>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">#{db.room?.roomNumber || '?'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-400">Kelgan</p>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{checkIn.toLocaleDateString('uz-UZ')}</p>
                      {db.checkInTime && <p className="text-xs text-blue-500">{db.checkInTime}</p>}
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-400">Ketish</p>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{checkOut.toLocaleDateString('uz-UZ')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-400">Kunlar</p>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{db.numberOfNights} kun</p>
                    </div>
                  </div>
                </div>

                {/* Oila a'zolari */}
                {familyCount > 1 && (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-4">
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Oila a'zolari ({familyCount} kishi)
                    </p>
                    <div className="space-y-2">
                      {/* Asosiy mehmon */}
                      <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
                        {db.guestDetails?.guestImage ? (
                          <img src={getImageUrl(db.guestDetails.guestImage) || ''} alt="" className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                            <User className="w-4 h-4 text-zinc-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            1. {db.guestDetails?.fullName}
                          </span>
                          <span className="ml-2 text-xs text-zinc-400">— Asosiy mehmon</span>
                        </div>
                        <span className="text-xs text-zinc-400">{db.guestDetails?.gender === 'male' ? '👨' : '👩'}</span>
                      </div>
                      {/* Turmush o'rtog'i */}
                      {hasSpouse && (
                        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
                          <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                            <User className="w-4 h-4 text-pink-400" />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                              2. {db.guestDetails.spouseDetails.fullName}
                            </span>
                            <span className="ml-2 text-xs text-zinc-400">— Turmush o'rtog'i</span>
                          </div>
                        </div>
                      )}
                      {/* Oila a'zolari */}
                      {familyMembers.map((m: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
                          {m.guestImage ? (
                            <img src={getImageUrl(m.guestImage) || ''} alt="" className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                              {(hasSpouse ? 3 : 2) + i}. {m.fullName}
                            </span>
                            {m.relationship && <span className="ml-2 text-xs text-zinc-400">— {m.relationship}</span>}
                          </div>
                          <div className="text-right">
                            {m.birthDate && <p className="text-xs text-zinc-400">{new Date(m.birthDate).toLocaleDateString('uz-UZ')}</p>}
                            <span className="text-xs text-zinc-400">{m.gender === 'male' ? '👨' : '👩'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* To'lov ma'lumotlari */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-zinc-400">Jami</p>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{db.totalPrice?.toLocaleString()} UZS</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-400">To'langan</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{db.paidAmount?.toLocaleString()} UZS</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-400">Qarz</p>
                    <p className={`font-bold ${debt > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-400'}`}>
                      {debt > 0 ? `${debt.toLocaleString()} UZS` : '—'}
                    </p>
                  </div>
                </div>

                {/* Amallar */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 gap-1.5"
                    onClick={() => { navigate(`/clients/profile/${encodeURIComponent(db.guestDetails.phone)}`); setClientDetailOpen(false); }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Kabinetga o'tish
                  </Button>

                  {db.status === 'active' && debt > 0 && (
                    <Button size="sm" variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 gap-1.5"
                      onClick={() => { setClientDetailOpen(false); openPaymentModal(db); }}>
                      <Plus className="w-3.5 h-3.5" /> To'lov
                    </Button>
                  )}
                  {db.status === 'active' && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1.5 text-zinc-600"
                        onClick={() => { setClientDetailOpen(false); openEditGuestModal(db); }}>
                        <UserCog className="w-3.5 h-3.5" /> Tahrirlash
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-zinc-600"
                        onClick={() => { setClientDetailOpen(false); openEditModal(db); }}>
                        <Edit className="w-3.5 h-3.5" /> Sana
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-zinc-600"
                        onClick={() => { setClientDetailOpen(false); handlePrintReceipt({ bookingId: db._id, guestName: db.guestDetails.fullName, roomNumber: db.room?.roomNumber || '-', checkInDate: checkIn.toLocaleDateString('uz-UZ'), checkOutDate: checkOut.toLocaleDateString('uz-UZ'), totalPrice: db.totalPrice, paidAmount: db.paidAmount, paymentMethod: db.paymentMethod || 'cash', cashierName: db.byReceptionist?.fullName || user?.fullName || 'Xodim', date: new Date().toLocaleString('uz-UZ') }); }}>
                        <Printer className="w-3.5 h-3.5" /> Chek
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-cyan-600 border-cyan-300"
                        onClick={() => { setClientDetailOpen(false); handleFreeze(db._id, db.guestDetails.fullName); }}>
                        <Snowflake className="w-3.5 h-3.5" /> Muzlatish
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-orange-600 border-orange-300"
                        onClick={() => { setClientDetailOpen(false); openRemoveFamilyModal(db); }}>
                        <UserMinus className="w-3.5 h-3.5" /> Chiqarish
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-purple-600 border-purple-300"
                        onClick={() => { if(window.confirm('Checkout qilmoqchimisiz?')) { checkoutMutation.mutate({ id: db._id }); setClientDetailOpen(false); } }}
                        disabled={checkoutMutation.isPending}>
                        {checkoutMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />} Check-out
                      </Button>
                    </>
                  )}
                  {db.status === 'frozen' && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-blue-600 border-blue-300"
                      onClick={() => { setClientDetailOpen(false); openResumeModal(db); }}>
                      <Play className="w-3.5 h-3.5" /> Faollashtirish
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { setClientDetailOpen(false); handleDelete(db._id, db.guestDetails.fullName); }}
                    disabled={deleteMutation.isPending}>
                    <Trash2 className="w-3.5 h-3.5" /> O'chirish
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">{t('modals.client.pay_debt')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('clients.client_label')}</Label>
              <Input disabled value={selectedBooking?.guestDetails.fullName || ''} className="bg-zinc-50 dark:bg-zinc-900" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('clients.debt_amount')}</Label>
              <Input
                disabled
                value={`${(selectedBooking?.totalPrice - selectedBooking?.paidAmount || 0).toLocaleString()} UZS`}
                className="text-red-500 font-bold bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('clients.payment_amount')}</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={paymentAmount}
                onChange={e => setPaymentAmount(Number(e.target.value))}
                placeholder={t('clients.payment_placeholder')}
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
                  <SelectItem value="cash">{t('common.cash')}</SelectItem>
                  <SelectItem value="terminal">{t('common.terminal')}</SelectItem>
                  <SelectItem value="click">{t('common.click')}</SelectItem>
                  <SelectItem value="transfer">{t('common.transfer')}</SelectItem>
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
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">{t('clients.extend_date')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('clients.new_checkout_date')}</Label>
              <Input
                type="date"
                value={editCheckOutDate}
                onChange={e => setEditCheckOutDate(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {t('clients.extend_date_warning')}
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
            <div className="col-span-2 flex flex-col items-center mb-2">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 flex flex-col items-center justify-center overflow-hidden relative mb-2">
                {editGuestData.guestImagePreview ? (
                  <>
                    <img src={editGuestData.guestImagePreview} alt="Guest" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditGuestData(p => ({...p, guestImageFile: null, guestImagePreview: null, guestImage: undefined}))}
                      className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-zinc-400 flex flex-col items-center">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">{t('common.image')}</span>
                  </div>
                )}
              </div>
              <Label className="cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 py-1.5 px-3 rounded-md text-xs font-medium transition flex items-center gap-1.5">
                <Camera className="w-3 h-3" />
                {t('common.upload_image')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setEditGuestData(p => ({
                        ...p,
                        guestImageFile: file,
                        guestImagePreview: URL.createObjectURL(file)
                      }));
                    }
                  }}
                />
              </Label>
            </div>

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
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.birth_date', 'Tug\'ilgan sana')}</Label>
              <Input
                type="text"
                placeholder="12.05.1990"
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
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.country')}</Label>
              <Input
                value={editGuestData.country}
                onChange={e => setEditGuestData(prev => ({...prev, country: e.target.value}))}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGuestModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleEditGuest} disabled={updateMutation.isPending || isUploadingImage} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {(updateMutation.isPending || isUploadingImage) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume Modal */}
      <Dialog open={resumeModalOpen} onOpenChange={setResumeModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">{t('clients.resume_client')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('clients.new_room')}</Label>
              <Select value={resumeRoomId} onValueChange={setResumeRoomId}>
                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900">
                  <SelectValue placeholder={t('clients.select_room')} />
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
              <Label className="text-zinc-700 dark:text-zinc-300">{t('clients.new_checkout_date')}</Label>
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

      {/* Remove Family Modal */}
      <Dialog open={removeFamilyModalOpen} onOpenChange={setRemoveFamilyModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">{t('clients.remove_family_title')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('clients.remove_family_desc')}</Label>
              <Select value={familyMemberIndex.toString()} onValueChange={v => setFamilyMemberIndex(Number(v))}>
                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950">
                  <SelectItem value="-2">
                    {selectedBooking?.guestDetails?.fullName} ({t('clients.main_guest')})
                  </SelectItem>
                  
                  {selectedBooking?.guestDetails?.maritalStatus === 'married' && selectedBooking?.guestDetails?.spouseDetails?.fullName && (
                    <SelectItem value="-1">
                      {selectedBooking.guestDetails.spouseDetails.fullName} ({t('clients.spouse')})
                    </SelectItem>
                  )}
                  
                  {selectedBooking?.guestDetails?.familyMembers?.map((member: any, index: number) => (
                    <SelectItem key={index} value={index.toString()}>
                      {member.fullName} ({t('clients.family_member')} {index + 1})
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
