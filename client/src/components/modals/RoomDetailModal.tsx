import { X, Bed, DollarSign, Users, Calendar, Clock, AlertTriangle, CheckCircle2, Wrench, Sparkles, CreditCard, Phone, User, MapPin, Loader2, Edit2, ArrowRight, Trash2, UserMinus } from 'lucide-react';
import { useRoomById } from '../../hooks/useRoomById';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUpdateRoomStatus, useDeleteRoom } from '../../hooks/useRooms';
import { useCheckOut, useRemoveMainGuest, useRemoveFamilyMember } from '../../hooks/useBookings';
import { handlePrintReceipt } from '../../utils/printReceipt';
import { Printer } from 'lucide-react';
import { useState } from 'react';
import { getImageUrl } from '../../utils/imageUrl';

// roomType uchun fallback helper
const getRoomTypeLabel = (type: string, t: any): string => {
  const key = `roomType.${type}`;
  const translated = t(key);
  // i18n key topilmasa, xom qiymatni qaytaradi
  if (translated === key) {
    const map: Record<string, string> = {
      ekonom: 'Ekonom', standartplus: 'Standart Plus', lyuks: 'Lyuks',
      budget: 'Ekonom', standard: 'Standart Plus', luxury: 'Lyuks',
      family: 'Oilaviy', vip: 'VIP',
    };
    return map[type] || type;
  }
  return translated;
};

interface Props {
  roomId: string | null;
  onClose: () => void;
  onEdit?: (room: any) => void;
}

const getStatusConfig = (t: any): Record<string, { label: string; color: string; bg: string; icon: any; border: string }> => ({
  available: {
    label: t('rooms.status_available', "Bo'sh"),
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  booked: {
    label: t('rooms.status_booked', 'Band'),
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
    icon: Bed,
  },
  cleaning: {
    label: t('rooms.status_cleaning', 'Tozalanmoqda'),
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950/40',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: Sparkles,
  },
  maintenance: {
    label: t('rooms.status_maintenance', "Ta'mirlashda"),
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    icon: Wrench,
  },
});

function InfoRow({ label, value, icon: Icon, highlight }: { label: string; value: React.ReactNode; icon?: any; highlight?: boolean }) {
  return (
    <div className={cn(
      'flex items-start justify-between gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0',
    )}>
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm min-w-0">
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
      <span className={cn(
        'text-sm font-semibold text-right text-zinc-800 dark:text-zinc-100',
        highlight && 'text-emerald-600 dark:text-emerald-400 text-base'
      )}>
        {value}
      </span>
    </div>
  );
}

export default function RoomDetailModal({ roomId, onClose, onEdit }: Props) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const updateStatus = useUpdateRoomStatus();
  const deleteRoom = useDeleteRoom();
  const checkoutMutation = useCheckOut();
  const removeMainGuestMutation = useRemoveMainGuest();
  const removeFamilyMutation = useRemoveFamilyMember();
  const [removingMemberIndex, setRemovingMemberIndex] = useState<'main' | number | null>(null);

  const { data, isLoading } = useRoomById(roomId);
  const room = data?.room;
  const maintenanceDays = data?.maintenanceDays ?? null;

  const [deleteError, setDeleteError] = useState('');

  const handleDeleteRoom = () => {
    if (!room) return;
    if (room.status === 'booked') {
      setDeleteError(t('rooms.delete_booked_error', "Band xonani o'chirib bo'lmaydi. Avval mijozni check-out qiling."));
      return;
    }
    if (window.confirm(`#${room.roomNumber} xonani rostdan ham o'chirmoqchimisiz?`)) {
      setDeleteError('');
      deleteRoom.mutate(room._id, {
        onSuccess: () => onClose(),
        onError: (err: any) => setDeleteError(err?.response?.data?.message || "O'chirishda xatolik."),
      });
    }
  };

  if (!roomId) return null;

  const statusCfg = room ? getStatusConfig(t)[room.status] : null;
  const StatusIcon = statusCfg?.icon;

  // Booking ma'lumotlari
  const booking = room?.currentBooking;
  const today = new Date();

  const checkOutDate = booking ? new Date(booking.checkOutDate) : null;
  const checkInDate = booking ? new Date(booking.checkInDate) : null;

  const daysLeft = checkOutDate
    ? Math.ceil((checkOutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const daysStayed = checkInDate
    ? Math.ceil((today.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const debt = booking ? Math.max(0, booking.totalPrice - booking.paidAmount) : 0;
  const hasSpouse = booking?.guestDetails?.maritalStatus === 'married' && booking?.guestDetails?.spouseDetails?.fullName ? 1 : 0;
  const familyCount = booking ? 1 + hasSpouse + (booking.guestDetails?.familyMembers?.length || 0) : 0;

  const handleFinishCleaning = () => {
    if (room) {
      updateStatus.mutate({ id: room._id, status: 'available' });
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header image or colored bar */}
        {room?.imageUrl ? (
          <div className="relative w-full h-44 overflow-hidden">
            <img
              src={getImageUrl(room.imageUrl) || ''}
              alt="Room"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
              <div>
                <p className="text-3xl font-black text-white">#{room.roomNumber}</p>
                <p className="text-sm text-zinc-300">{getRoomTypeLabel(room.type, t)} • {room.floor}-{t('rooms.floor_short', 'qavat')}</p>
              </div>
              {statusCfg && StatusIcon && (
                <span className={cn('flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border', statusCfg.color, statusCfg.bg, statusCfg.border)}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusCfg.label}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className={cn('w-full h-28 flex items-center justify-between px-6', statusCfg?.bg)}>
            <div>
              <p className="text-4xl font-black text-zinc-900 dark:text-zinc-100">#{room?.roomNumber ?? '—'}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {room ? `${getRoomTypeLabel(room.type, t)} • ${room.floor}-${t('rooms.floor_short', 'qavat')}` : ''}
              </p>
            </div>
            {statusCfg && StatusIcon && (
              <span className={cn('flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border', statusCfg.color, statusCfg.bg, statusCfg.border)}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusCfg.label}
              </span>
            )}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Admin edit & delete buttons */}
        {user?.role === 'admin' && room && (
          <>
            <button
              onClick={handleDeleteRoom}
              disabled={deleteRoom.isPending}
              className="absolute top-3 right-20 z-20 p-1.5 rounded-full bg-red-600/80 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              title={t('rooms.delete_room', "Xonani o'chirish")}
            >
              {deleteRoom.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { onEdit?.(room); onClose(); }}
              className="absolute top-3 right-11 z-20 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
              title={t('rooms.edit_room', 'Xonani tahrirlash')}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
          ) : !room ? (
            <p className="text-center text-zinc-400 py-8">{t('common.no_data', "Ma'lumot topilmadi")}</p>
          ) : (
            <>
              {/* === XONA ASOSIY MA'LUMOTLARI === */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 px-4 py-1">
                <InfoRow
                  label={t('rooms.price_per_night_short', 'Narx (kechasi)')}
                  value={`${room.pricePerNight.toLocaleString()} UZS`}
                  icon={DollarSign}
                  highlight
                />
                <InfoRow label={t('rooms.type', 'Tur')} value={getRoomTypeLabel(room.type, t)} icon={Bed} />
                <InfoRow label={t('rooms.floor_short', 'Qavat')} value={`${room.floor}-${t('rooms.floor_short', 'qavat')}`} icon={MapPin} />
                <InfoRow label="Sig'imi" value={`${room.capacity || 1} kishi`} icon={Users} />
                {room.amenities?.length > 0 && (
                  <InfoRow
                    label={t('rooms.amenities', 'Qulayliklar')}
                    value={room.amenities.join(', ')}
                    icon={Sparkles}
                  />
                )}
                {room.description && (
                  <InfoRow label={t('rooms.description', 'Tavsif')} value={room.description} icon={AlertTriangle} />
                )}
              </div>

              {/* === BAND LEKIN BOOKING YO'Q (Data inconsistency) === */}
              {room.status === 'booked' && !booking && (
                <div className="rounded-xl border-2 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-orange-700 dark:text-orange-400">Xona band, lekin mijoz yo'q</p>
                      <p className="text-xs text-orange-500 dark:text-orange-500 mt-0.5">
                        Ma'lumotlar bazasida nomuvofiqlik. Xonani majburiy bo'shatish mumkin.
                      </p>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        if (window.confirm(`#${room.roomNumber} xonani majburiy bo'shatmoqchimisiz? Bu xona "Bo'sh" holatiga o'tadi.`)) {
                          updateStatus.mutate(
                            { id: room._id, status: 'available' },
                            { onSuccess: () => onClose() }
                          );
                        }
                      }}
                      disabled={updateStatus.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-orange-500/20"
                    >
                      {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Majburiy bo'shatish (Bo'sh qilish)
                    </button>
                  )}
                  {user?.role !== 'admin' && (
                    <p className="text-xs text-orange-500 dark:text-orange-400 text-center font-medium">
                      ⚠ Faqat admin bu xonani bo'shata oladi. Admin bilan bog'laning.
                    </p>
                  )}
                </div>
              )}

              {/* === BAND BO'LSA === */}
              {room.status === 'booked' && booking && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-1">
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wider pt-2 pb-1">{t('reception.guest_info', "Mehmon ma'lumotlari")}</p>


                  <InfoRow
                    label={t('reception.guest', 'Mehmon')}
                    value={booking.guestDetails?.fullName}
                    icon={User}
                  />
                  <InfoRow
                    label={t('staff.phone', 'Telefon')}
                    value={booking.guestDetails?.phone}
                    icon={Phone}
                  />
                  {booking.guestDetails?.profession && (
                    <InfoRow
                      label="Kasbi"
                      value={booking.guestDetails.profession}
                      icon={User}
                    />
                  )}

                  {booking.guestDetails?.birthDate && (
                    <InfoRow
                      label={t('checkin.birth_date', "Tug'ilgan sana")}
                      value={new Date(booking.guestDetails.birthDate).toLocaleDateString('uz-UZ')}
                      icon={Calendar}
                    />
                  )}
                  <InfoRow
                    label={t('checkin.guests_count', 'Mehmonlar soni')}
                    value={`${familyCount} ${t('checkin.members_count', 'kishi')}`}
                    icon={Users}
                  />

                  {/* Numbered guest list */}
                  <div className="py-2 border-b border-red-100 dark:border-red-900/30">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Mehmonlar ro'yxati:</p>
                    <div className="space-y-1.5">
                      {/* Main guest */}
                      <div className="flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-2 py-1.5">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          1. {booking.guestDetails?.fullName} <span className="text-zinc-400 font-normal">— Asosiy mehmon</span>
                        </span>
                        {familyCount > 1 && (
                          <button
                            onClick={() => {
                              if (confirm(`"${booking.guestDetails?.fullName}" (Asosiy mehmon) chiqib ketayaptimi?`)) {
                                setRemovingMemberIndex('main');
                                removeMainGuestMutation.mutate(booking._id, {
                                  onSuccess: () => { setRemovingMemberIndex(null); },
                                  onError: () => setRemovingMemberIndex(null),
                                });
                              }
                            }}
                            disabled={removingMemberIndex === 'main'}
                            className="ml-2 p-1 rounded text-orange-500 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-40"
                            title="Asosiy mehmonni chiqarish"
                          >
                            {removingMemberIndex === 'main' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      {/* Family members */}
                      {booking.guestDetails?.familyMembers?.map((m: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-2 py-1.5">
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {i + 2}. {m.fullName}
                          </span>
                          <button
                            onClick={() => {
                              if (confirm(`"${m.fullName}" chiqib ketayaptimi?`)) {
                                setRemovingMemberIndex(i);
                                removeFamilyMutation.mutate({ id: booking._id, memberIndex: i }, {
                                  onSuccess: () => setRemovingMemberIndex(null),
                                  onError: () => setRemovingMemberIndex(null),
                                });
                              }
                            }}
                            disabled={removingMemberIndex === i}
                            className="ml-2 p-1 rounded text-orange-500 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-40"
                            title="Hamrohni chiqarish"
                          >
                            {removingMemberIndex === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <InfoRow
                    label={t('reception.checkin_date', 'Kelgan sana')}
                    value={checkInDate?.toLocaleDateString('uz-UZ')}
                    icon={Calendar}
                  />
                  <InfoRow
                    label={t('reception.checkout_date', 'Ketish sanasi')}
                    value={checkOutDate?.toLocaleDateString('uz-UZ')}
                    icon={Calendar}
                  />
                  <InfoRow
                    label={t('rooms.days_stayed', 'Yashagan kunlar')}
                    value={`${daysStayed ?? 0} ${t('rooms.days', 'kun')}`}
                    icon={Clock}
                  />

                  {daysLeft !== null && (
                    <InfoRow
                      label={t('rooms.days_left_to_checkout', 'Ketishga qolgan')}
                      value={
                        daysLeft <= 0
                          ? <span className="text-orange-500 font-bold">{t('rooms.today_late', 'Bugun / Kechikkan!')}</span>
                          : <span>{daysLeft} {t('rooms.days', 'kun')}</span>
                      }
                      icon={ArrowRight}
                    />
                  )}

                  <InfoRow
                    label={t('finance.total_payment', "Jami to'lov")}
                    value={`${booking.totalPrice?.toLocaleString()} UZS`}
                    icon={CreditCard}
                  />
                  <InfoRow
                    label={t('finance.paid', "To'langan")}
                    value={`${booking.paidAmount?.toLocaleString()} UZS`}
                    icon={CreditCard}
                  />

                  <div className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{t('finance.debt', 'Qarz')}</span>
                    </div>
                    {debt > 0 ? (
                      <span className="text-sm font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-0.5 rounded-full">
                        {debt.toLocaleString()} UZS
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t('finance.fully_paid_check', "To'liq to'langan ✓")}</span>
                    )}
                  </div>

                  <InfoRow
                    label={t('finance.payment_method_short', "To'lov turi")}
                    value={booking.paymentMethod?.toUpperCase()}
                    icon={CreditCard}
                  />

                  {booking.byReceptionist && (
                    <InfoRow
                      label={t('rooms.received_by', 'Qabul qildi')}
                      value={booking.byReceptionist.fullName}
                      icon={User}
                    />
                  )}

                  {/* Checkout va xato xabar */}
                  {deleteError && (
                    <div className="px-1 py-2 text-xs text-red-500 dark:text-red-400 text-center font-medium">
                      {deleteError}
                    </div>
                  )}
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => handlePrintReceipt({
                        bookingId: booking._id,
                        guestName: booking.guestDetails?.fullName || '',
                        roomNumber: room.roomNumber || '',
                        checkInDate: checkInDate?.toLocaleDateString('uz-UZ') || '',
                        checkOutDate: checkOutDate?.toLocaleDateString('uz-UZ') || '',
                        totalPrice: booking.totalPrice,
                        paidAmount: booking.paidAmount,
                        paymentMethod: booking.paymentMethod || 'cash',
                        cashierName: booking.byReceptionist?.fullName || user?.fullName || 'Xodim',
                        date: new Date().toLocaleString('uz-UZ')
                      })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      Chek chiqarish
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Rostdan ham bu mehmonni check-out qilmoqchimisiz?')) {
                          checkoutMutation.mutate(
                            { id: booking._id },
                            { onSuccess: () => onClose() }
                          );
                        }
                      }}
                      disabled={checkoutMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50 shadow-lg shadow-red-600/20"
                    >
                      {checkoutMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Clock className="w-5 h-5" />}
                      {t('rooms.checkout_button', "Check-out qilish (Xonani bo'shatish)")}
                    </button>
                  </div>
                </div>
              )}

              {/* === TOZALANMOQDA === */}
              {room.status === 'cleaning' && (
                <div className="rounded-xl border border-yellow-200 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <p className="font-semibold text-yellow-700 dark:text-yellow-400">{t('rooms.room_cleaning', 'Xona tozalanmoqda')}</p>
                  </div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">
                    {t('rooms.cleaning_desc', "Xona tozalanib, mehmon chiqdi. Tozalanish tugashi bilan \"Bo'sh\" qilish mumkin.")}
                  </p>
                  <button
                    onClick={handleFinishCleaning}
                    disabled={updateStatus.isPending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {t('rooms.cleaning_done', "Tozalash tugadi — Bo'sh qilish")}
                  </button>
                </div>
              )}

              {/* === TA'MIRLASHDA === */}
              {room.status === 'maintenance' && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-blue-500" />
                    <p className="font-semibold text-blue-700 dark:text-blue-400">{t('rooms.status_maintenance', "Ta'mirlashda")}</p>
                  </div>
                  {maintenanceDays !== null && (
                    <div className="flex items-center justify-between bg-blue-100 dark:bg-blue-900/30 rounded-lg px-3 py-2">
                      <span className="text-sm text-blue-600 dark:text-blue-400">{t('rooms.maintenance_time', "Ta'mirlashda o'tgan vaqt")}</span>
                      <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
                        {maintenanceDays === 0 ? t('rooms.started_today', 'Bugun boshlandi') : `${maintenanceDays} ${t('rooms.days', 'kun')}`}
                      </span>
                    </div>
                  )}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        updateStatus.mutate({ id: room._id, status: 'available' });
                        onClose();
                      }}
                      disabled={updateStatus.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                    >
                      {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {t('rooms.maintenance_done', "Ta'mirlash tugadi — Bo'sh qilish")}
                    </button>
                  )}
                </div>
              )}

              {/* === BO'SH === */}
              {room.status === 'available' && (
                <button
                  onClick={() => { navigate('/check-in'); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-lg shadow-emerald-600/20"
                >
                  <Bed className="w-4 h-4" />
                  {t('rooms.checkin_to_room', 'Bu xonaga Check-in qilish')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* === ADMIN: XONANI O'CHIRISH === */}
              {user?.role === 'admin' && room.status !== 'booked' && (
                <>
                  {deleteError && (
                    <div className="text-xs text-red-500 dark:text-red-400 text-center font-medium px-2">
                      ⚠ {deleteError}
                    </div>
                  )}
                  <button
                    onClick={handleDeleteRoom}
                    disabled={deleteRoom.isPending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    {deleteRoom.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {t('rooms.delete_room', "Xonani o'chirish")}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
