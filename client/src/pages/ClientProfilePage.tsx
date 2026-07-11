import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useClientBookings, useFreezeBooking, useResumeBooking, useDeletePayment } from '../hooks/useBookings';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, User, Phone, MapPin, Calendar, Clock, CreditCard, Receipt, Users, FileText, Snowflake, Play, CreditCard as PaymentIcon, Trash2 } from 'lucide-react';
import { handlePrintReceipt } from '../utils/printReceipt';
import { printAdminReport } from '../utils/printAdminReport';
import { getImageUrl } from '../utils/imageUrl';
import BookingPaymentModal from '@/components/modals/BookingPaymentModal';

export default function ClientProfilePage() {
  const { t } = useTranslation();
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();

  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<any>(null);
  const { mutate: freezeBooking, isPending: isFreezing } = useFreezeBooking();
  const { mutate: resumeBooking, isPending: isResuming } = useResumeBooking();
  const { mutate: deletePayment, isPending: isDeletingPayment } = useDeletePayment();

  const { data, isLoading, error } = useClientBookings(phone || '');

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-10 space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Orqaga
        </Button>
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-zinc-500">{t('common.no_data', 'Mijoz topilmadi yoki xatolik yuz berdi.')}</p>
        </div>
      </div>
    );
  }

  const { client, stats, bookings, payments = [] } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {client.guestImage && (
          <div className="w-16 h-16 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
             <img src={getImageUrl(client.guestImage) || ''} alt={client.fullName} className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {client.fullName}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">{t('clients.client_cabinet', 'Mijoz kabineti')}</p>
        </div>
        <div className="ml-auto">
          <Button 
            onClick={() => printAdminReport(client, stats, bookings)}
            className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            {t('reports.admin_title', 'Adminga Hisobot')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chap panel: Mijoz ma'lumotlari va statistika */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              {t('profile.personal_info', 'Shaxsiy ma\'lumotlar')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-sm text-zinc-500">{t('profile.fullname', 'To\'liq ism')}</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{client.fullName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-sm text-zinc-500">{t('profile.phone', 'Telefon')}</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{client.phone}</p>
                </div>
              </div>
              {client.birthDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-zinc-500">{t('checkin.birth_date', 'Tug\'ilgan sana')}</p>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {new Date(client.birthDate).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                </div>
              )}
              {client.country && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-zinc-500">{t('checkin.country', 'Manzil')}</p>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{client.country}</p>
                  </div>
                </div>
              )}
              {client.passportSeries && (
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-zinc-500">{t('checkin.passport_series', 'Pasport')}</p>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{client.passportSeries}</p>
                  </div>
                </div>
              )}
              {client.historyNumber && (
                <div className="flex items-start gap-3">
                  <Receipt className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-zinc-500">{t('checkin.history_number', 'Istoriya №')}</p>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{client.historyNumber}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-400 mb-4 border-b border-emerald-200 dark:border-emerald-800/50 pb-2">
              {t('reports.subtitle', 'Statistika')}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-700 dark:text-emerald-500">{t('reports.total_visits', 'Jami tashriflar:')}</span>
                <span className="font-bold text-emerald-900 dark:text-emerald-300">{stats.totalVisits} {t('common.count_suffix', 'ta')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-700 dark:text-emerald-500">{t('reports.total_income', 'Jami to\'langan summa (Kirim):')}</span>
                <span className="font-bold text-emerald-900 dark:text-emerald-300">{stats.totalSpent.toLocaleString()} UZS</span>
              </div>
              {stats.totalExpense > 0 && (
                <div className="flex justify-between items-center bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg mt-2 border border-orange-200 dark:border-orange-800">
                  <span className="text-sm text-orange-700 dark:text-orange-400 font-semibold">{t('reports.expenses', 'Sanatoriya chiqimi:')}</span>
                  <span className="font-bold text-orange-700 dark:text-orange-400">{stats.totalExpense.toLocaleString()} UZS</span>
                </div>
              )}
              {stats.totalDebt > 0 && (
                <div className="flex justify-between items-center bg-red-100 dark:bg-red-900/30 p-2 rounded-lg mt-2">
                  <span className="text-sm text-red-700 dark:text-red-400 font-semibold">{t('clients.debt_amount', 'Qarzdorlik:')}</span>
                  <span className="font-bold text-red-700 dark:text-red-400">{stats.totalDebt.toLocaleString()} UZS</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* O'ng panel: Tashriflar tarixi */}
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            Tashriflar tarixi
          </h3>
          
          {bookings.map((booking: any) => {
            const hasSpouse = booking.guestDetails.maritalStatus === 'married' && booking.guestDetails.spouseDetails?.fullName ? 1 : 0;
            const familyCount = 1 + hasSpouse + (booking.guestDetails.familyMembers?.length || 0);

            return (
              <div key={booking._id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-4 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-bold px-3 py-1 rounded-lg">
                      Xona {booking.room?.roomNumber || '?'}
                    </div>
                    <span className="text-sm font-medium text-zinc-500">
                      {new Date(booking.checkInDate).toLocaleDateString('uz-UZ')} — {new Date(booking.checkOutDate).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                  <div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                      booking.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                      booking.status === 'checked_out' ? 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' :
                      booking.status === 'frozen' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
                    }`}>
                      {booking.status === 'active' ? 'Faol' : booking.status === 'checked_out' ? 'Yakunlangan' : booking.status === 'frozen' ? 'Muzlatilgan' : booking.status}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-500">To'lov ma'lumotlari:</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Jami narx:</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{booking.totalPrice?.toLocaleString()} UZS</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">To'langan:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{booking.paidAmount?.toLocaleString()} UZS</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">To'lov turi:</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 uppercase">{booking.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-zinc-500">Qo'shimcha:</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Mehmonlar:</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                        <Users className="w-4 h-4" /> {familyCount} kishi
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Kunlar soni:</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{booking.numberOfNights} kun</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Qabul qildi:</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{booking.byReceptionist?.fullName}</span>
                    </div>
                  </div>
                </div>

                {/* Oila a'zolari */}
                {familyCount > 1 && (() => {
                  const members = booking.guestDetails?.familyMembers || [];
                  const hasSpouseLocal = booking.guestDetails?.maritalStatus === 'married' && booking.guestDetails?.spouseDetails?.fullName;
                  return (
                    <div className="px-6 pb-4">
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Oila a'zolari ro'yxati
                      </p>
                      <div className="space-y-2">
                        {/* Asosiy mehmon */}
                        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-700">
                          {booking.guestDetails?.guestImage ? (
                            <img src={getImageUrl(booking.guestDetails.guestImage) || ''} alt="" className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                              <User className="w-4 h-4 text-zinc-400" />
                            </div>
                          )}
                          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex-1">
                            1. {booking.guestDetails?.fullName}
                          </span>
                          <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">Asosiy</span>
                        </div>
                        {/* Turmush o'rtog'i */}
                        {hasSpouseLocal && (
                          <div className="flex items-center gap-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg px-3 py-2 border border-pink-200 dark:border-pink-900/30">
                            <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                              <User className="w-4 h-4 text-pink-400" />
                            </div>
                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex-1">
                              2. {booking.guestDetails.spouseDetails.fullName}
                            </span>
                            <span className="text-xs text-pink-500 bg-pink-100 dark:bg-pink-900/30 px-2 py-0.5 rounded-full">Turmush o'rtog'i</span>
                          </div>
                        )}
                        {/* Oila a'zolari */}
                        {members.map((m: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-900/30">
                            {m.guestImage ? (
                              <img src={getImageUrl(m.guestImage) || ''} alt="" className="w-8 h-8 rounded-full object-cover border border-blue-200 dark:border-blue-700" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-400" />
                              </div>
                            )}
                            <div className="flex-1">
                              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                {(hasSpouseLocal ? 3 : 2) + i}. {m.fullName}
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
                  );
                })()}

                <div className="bg-zinc-50 dark:bg-zinc-800/20 px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex gap-2">
                    {booking.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                        onClick={() => {
                          if(confirm("Tashrifni muzlatasizmi? Muzlatilgan vaqt hisobga olinmaydi.")) {
                            freezeBooking(booking._id);
                          }
                        }}
                        disabled={isFreezing}
                      >
                        <Snowflake className="w-4 h-4 mr-2" />
                        Muzlatish
                      </Button>
                    )}
                    {booking.status === 'frozen' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                        onClick={() => {
                          if(confirm("Tashrifni qayta faollashtirasizmi?")) {
                            resumeBooking({ id: booking._id, data: {} });
                          }
                        }}
                        disabled={isResuming}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Faollashtirish
                      </Button>
                    )}
                    {(booking.status === 'active' || booking.status === 'frozen') && booking.totalPrice > booking.paidAmount && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => setSelectedBookingForPayment(booking)}
                      >
                        <PaymentIcon className="w-4 h-4 mr-2" />
                        To'lov qilish
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    onClick={() => handlePrintReceipt({
                      bookingId: booking._id,
                      guestName: booking.guestDetails.fullName,
                      roomNumber: booking.room?.roomNumber || '-',
                      checkInDate: new Date(booking.checkInDate).toLocaleDateString('uz-UZ'),
                      checkOutDate: new Date(booking.checkOutDate).toLocaleDateString('uz-UZ'),
                      totalPrice: booking.totalPrice,
                      paidAmount: booking.paidAmount,
                      paymentMethod: booking.paymentMethod || 'cash',
                      cashierName: booking.byReceptionist?.fullName || 'Xodim',
                      date: new Date().toLocaleString('uz-UZ')
                    })}
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Chek nusxasi
                  </Button>
                </div>

                {payments.filter((p: any) => p.relatedBooking === booking._id).length > 0 && (
                  <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/10">
                     <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">To'lovlar va cheklar tarixi:</p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                       {payments.filter((p: any) => p.relatedBooking === booking._id).map((payment: any, idx: number) => (
                         <div key={idx} className="flex flex-col bg-white dark:bg-zinc-800 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
                           <div className="flex justify-between items-center mb-2">
                             <span className="font-bold text-emerald-600 dark:text-emerald-400">{payment.amount.toLocaleString()} UZS</span>
                             <div className="flex items-center gap-2">
                               <span className="text-zinc-500 text-xs uppercase bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-full">{payment.paymentMethod || 'Naqd'}</span>
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="w-6 h-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                 disabled={isDeletingPayment}
                                 onClick={() => {
                                   if(confirm("Bu to'lovni o'chirishni tasdiqlaysizmi? (Chek rasmi bilan birga o'chib ketadi)")) {
                                     deletePayment(payment._id);
                                   }
                                 }}
                                 title="To'lovni bekor qilish"
                               >
                                 {isDeletingPayment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                               </Button>
                             </div>
                           </div>
                           <p className="text-zinc-400 text-xs mb-3">{new Date(payment.date).toLocaleString('uz-UZ')}</p>
                           
                           {payment.receiptImage ? (
                             <div className="mt-auto pt-2 border-t border-zinc-100 dark:border-zinc-700 relative group">
                               <a href={getImageUrl(payment.receiptImage) || '#'} target="_blank" rel="noopener noreferrer" className="block w-full overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                                 <img 
                                   src={getImageUrl(payment.receiptImage) || ''} 
                                   alt="Chek" 
                                   className="w-full h-32 object-cover hover:scale-105 transition-transform"
                                 />
                               </a>
                             </div>
                           ) : (
                             <div className="mt-auto pt-2 border-t border-zinc-100 dark:border-zinc-700 text-center">
                               <p className="text-xs text-zinc-400 py-2 italic">Chek rasmi yuklanmagan</p>
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      <BookingPaymentModal 
        isOpen={!!selectedBookingForPayment}
        onClose={() => setSelectedBookingForPayment(null)}
        booking={selectedBookingForPayment}
      />
    </div>
  );
}
