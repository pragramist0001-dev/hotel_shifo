import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRooms } from '../hooks/useRooms';
import { useCheckIn } from '../hooks/useBookings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, UserPlus, Trash2, Users, Calculator, Tag, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { handlePrintReceipt } from '../utils/printReceipt';

interface FamilyMember {
  historyNumber: string;
  fullName: string;
  birthYear: number;
  gender: 'male' | 'female';
  relationship?: string;
  customPrice?: number;
  passportSeries?: string;
  dailyExpense?: number; // Kunlik chiqim (UZS/kun)
}

export default function CheckInPage() {
  const { t } = useTranslation();

  const formSchema = z.object({
    roomId: z.string().min(1, t('checkin.select_room')),
    fullName: z.string().min(3, t('checkin.fullname')),
    phone: z.string().min(9, t('checkin.phone')),
    birthYear: z.coerce.number().min(1900).max(new Date().getFullYear()),
    gender: z.enum(['male', 'female']),
    country: z.string().min(2, t('checkin.country')),
    maritalStatus: z.enum(['single', 'married']).optional(),
    historyNumber: z.string().min(1, 'Istoriya raqami majburiy'),
    passportSeries: z.string().optional(),
    checkInDate: z.string().min(1, 'Kelish sanasi majburiy'),
    checkOutDate: z.string().min(1, 'Ketish sanasi majburiy'),
    paymentMethod: z.enum(['cash', 'terminal', 'click', 'transfer']),
    paidAmount: z.coerce.number().min(0),
  });

  type FormData = z.infer<typeof formSchema>;
  const { data: rooms, isLoading: loadingRooms } = useRooms({ status: 'available' });
  const checkInMutation = useCheckIn();
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState('');
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  // === Oila a'zolari ===
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // === Narx sozlamalari ===
  const [mainGuestPrice, setMainGuestPrice] = useState<string>('');
  const [mainDailyExpense, setMainDailyExpense] = useState<string>(''); // Asosiy mehmon kunlik chiqimi
  const [useNegotiated, setUseNegotiated] = useState(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState<string>('');

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      gender: 'male',
      maritalStatus: 'single',
      paymentMethod: 'cash',
      checkInDate: today,
      checkOutDate: tomorrow,
      paidAmount: 0,
      country: 'O\'zbekiston',
    }
  });

  const selectedRoomId = watch('roomId');
  const checkInDate = watch('checkInDate');
  const checkOutDate = watch('checkOutDate');

  const selectedRoom = rooms?.find((r: any) => r._id === selectedRoomId);

  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 1;
    const d1 = new Date(checkInDate);
    const d2 = new Date(checkOutDate);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  };

  const nights = calculateNights();
  const numberOfPeople = 1 + familyMembers.length;

  const effectiveMainPrice = mainGuestPrice
    ? Number(mainGuestPrice)
    : (selectedRoom?.pricePerNight || 0);

  const getMemberPrice = (member: FamilyMember) => {
    if (member.customPrice !== undefined) return member.customPrice;
    return selectedRoom?.pricePerNight || 0; // fallback default
  };

  const mainDailyExpenseNum = Number(mainDailyExpense) || 0;
  const mainTotalWithExpense = (effectiveMainPrice + mainDailyExpenseNum) * nights;
  const membersTotalWithExpense = familyMembers.reduce(
    (sum, m) => sum + (getMemberPrice(m) + (m.dailyExpense || 0)) * nights,
    0
  );
  const calculatedTotal = mainTotalWithExpense + membersTotalWithExpense;

  // Faqat chiqim summasi
  const totalExpenses = (mainDailyExpenseNum * nights) +
    familyMembers.reduce((sum, m) => sum + (m.dailyExpense || 0) * nights, 0);

  const totalPrice = useNegotiated && negotiatedPrice
    ? Number(negotiatedPrice)
    : calculatedTotal;

  // === Oila a'zolarini boshqarish ===
  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, {
      historyNumber: '', fullName: '', birthYear: 2000, gender: 'male',
      relationship: '', customPrice: effectiveMainPrice, passportSeries: '', dailyExpense: 0
    }]);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: string | number) => {
    const updated = [...familyMembers];
    (updated[index] as any)[field] = value;

    if (field === 'birthYear') {
      const age = new Date().getFullYear() - Number(value);
      if (age <= 3) updated[index].customPrice = 0;
      else if (age >= 4 && age <= 13) updated[index].customPrice = 140000;
      else updated[index].customPrice = effectiveMainPrice;
    }

    setFamilyMembers(updated);
  };

  const onSubmit = (data: FormData) => {
    // Kunlik chiqimlar — additionalCharges sifatida
    const additionalCharges: Array<{ description: string; amount: number }> = [];

    if (mainDailyExpenseNum > 0) {
      additionalCharges.push({
        description: `${data.fullName || 'Asosiy mehmon'} — kunlik chiqim (${mainDailyExpenseNum.toLocaleString()} × ${nights} kun)`,
        amount: mainDailyExpenseNum * nights,
      });
    }

    familyMembers.forEach((m) => {
      if ((m.dailyExpense || 0) > 0) {
        additionalCharges.push({
          description: `${m.fullName || 'Hamroh'} — kunlik chiqim (${(m.dailyExpense || 0).toLocaleString()} × ${nights} kun)`,
          amount: (m.dailyExpense || 0) * nights,
        });
      }
    });

    const payload = {
      roomId: data.roomId,
      guestDetails: {
        historyNumber: data.historyNumber,
        fullName: data.fullName,
        phone: data.phone,
        birthYear: data.birthYear,
        gender: data.gender,
        country: data.country,
        maritalStatus: 'single',
        passportSeries: data.passportSeries,
        familyMembers: familyMembers.length > 0 ? familyMembers.map(m => ({
          historyNumber: m.historyNumber,
          fullName: m.fullName,
          birthYear: m.birthYear,
          gender: m.gender,
          relationship: m.relationship,
          passportSeries: m.passportSeries
        })) : undefined,
      },
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      paymentMethod: data.paymentMethod,
      paidAmount: data.paidAmount,
      pricePerPerson: effectiveMainPrice,
      negotiatedPrice: useNegotiated && negotiatedPrice ? Number(negotiatedPrice) : calculatedTotal,
      additionalCharges: additionalCharges.length > 0 ? additionalCharges : undefined,
    };

    checkInMutation.mutate(payload, {
      onSuccess: (res) => {
        setSuccessMsg(res.message);
        setCreatedBooking(res.booking);
        window.scrollTo(0, 0);
      }
    });
  };

  if (successMsg) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <CheckCircle2 className="w-20 h-20 text-emerald-500" />
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t('checkin.success')}</h2>
        <p className="text-zinc-500 dark:text-zinc-400">{successMsg}</p>

        <div className="flex gap-4 mt-4">
          <Button onClick={() => navigate('/rooms')} variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950">
            {t('checkin.back_to_rooms')}
          </Button>
          {createdBooking && (
            <Button
              onClick={() => handlePrintReceipt({
                bookingId: createdBooking._id,
                guestName: createdBooking.guestDetails.fullName,
                roomNumber: createdBooking.room?.roomNumber || selectedRoom?.roomNumber || '-',
                checkInDate: new Date(createdBooking.checkInDate).toLocaleDateString('uz-UZ'),
                checkOutDate: new Date(createdBooking.checkOutDate).toLocaleDateString('uz-UZ'),
                totalPrice: createdBooking.totalPrice,
                paidAmount: createdBooking.paidAmount,
                paymentMethod: createdBooking.paymentMethod,
                cashierName: createdBooking.byReceptionist?.fullName || '-',
                date: new Date().toLocaleString('uz-UZ')
              })}
              className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
            >
              Chek chiqarish
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('checkin.title')}</h2>
        <p className="text-zinc-500 dark:text-zinc-400">{t('checkin.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md space-y-4">
          <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">{t('checkin.personal_info')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.history_number', 'Istoriya raqami (History №)')}</Label>
              <Input {...register('historyNumber')} className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" placeholder="Masalan: 12345 yoki AB-123" />
              {errors.historyNumber && <p className="text-xs text-red-500">{String(errors.historyNumber.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.fullname')}</Label>
              <Input {...register('fullName')} className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" placeholder="John Doe" />
              {errors.fullName && <p className="text-xs text-red-500">{String(errors.fullName.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.phone')}</Label>
              <Input {...register('phone')} className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" placeholder="+998901234567" />
              {errors.phone && <p className="text-xs text-red-500">{String(errors.phone.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.birth_year')}</Label>
              <Input type="text" inputMode="numeric" {...register('birthYear')} className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" placeholder="Masalan: 1990" />
              {errors.birthYear && <p className="text-xs text-red-500">{String(errors.birthYear.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.country')}</Label>
              <Input {...register('country')} className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" placeholder="O'zbekiston, Toshkent" />
              {errors.country && <p className="text-xs text-red-500">{String(errors.country.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.gender')}</Label>
              <Select onValueChange={(v) => setValue('gender', v as 'male' | 'female')} defaultValue="male">
                <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <SelectValue placeholder={t('checkin.gender')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <SelectItem value="male">{t('checkin.gender_male')}</SelectItem>
                  <SelectItem value="female">{t('checkin.gender_female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Pasport seriyasi va raqami</Label>
              <Input {...register('passportSeries')} className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" placeholder="Masalan: AB 1234567" />
              {errors.passportSeries && <p className="text-xs text-red-500">{String(errors.passportSeries.message)}</p>}
            </div>

            {/* Asosiy mehmon uchun maxsus narx va kunlik chiqim */}
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 text-emerald-600 dark:text-emerald-500 font-medium">{t('checkin.main_guest_price')}</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={mainGuestPrice}
                onChange={(e) => setMainGuestPrice(e.target.value)}
                placeholder={selectedRoom ? `${selectedRoom.pricePerNight.toLocaleString()}` : 'Avtomatik xona narxi'}
                className="bg-white dark:bg-zinc-900 border-emerald-300 dark:border-emerald-800 text-zinc-900 dark:text-zinc-100 font-semibold"
              />
            </div>

            {/* Asosiy mehmon kunlik chiqimi */}
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-orange-600 dark:text-orange-400 font-medium">{t('checkin.daily_expense', 'Kunlik chiqim (UZS/kun)')}</span>
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                value={mainDailyExpense}
                onChange={(e) => setMainDailyExpense(e.target.value)}
                placeholder="Masalan: 50000 (ixtiyoriy)"
                className="bg-white dark:bg-zinc-900 border-orange-300 dark:border-orange-800/50 text-zinc-900 dark:text-zinc-100"
              />
              {mainDailyExpenseNum > 0 && nights > 0 && (
                <p className="text-xs text-orange-500 dark:text-orange-400">
                  {mainDailyExpenseNum.toLocaleString()} × {nights} kun = <strong>{(mainDailyExpenseNum * nights).toLocaleString()} UZS</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
                {t('checkin.family_members')}
                {familyMembers.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                    {familyMembers.length} {t('checkin.members_count')}
                  </span>
                )}
              </h3>
            </div>
            <Button
              type="button"
              onClick={addFamilyMember}
              className="flex items-center gap-1 text-sm bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
            >
              <UserPlus className="w-4 h-4" />
              {t('checkin.add_member')}
            </Button>
          </div>

          {familyMembers.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-4">
              {t('checkin.no_members')}
            </p>
          ) : (
            <div className="space-y-4">
              {familyMembers.map((member, index) => (
                <div
                  key={index}
                  className="relative p-4 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                      {index + 2}. {member.fullName || `${t('checkin.companion', 'Hamroh')} ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFamilyMember(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div className="space-y-1 lg:col-span-1">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">{t('checkin.history_num', 'Istoriya №')}</Label>
                      <Input
                        value={member.historyNumber}
                        onChange={(e) => updateFamilyMember(index, 'historyNumber', e.target.value)}
                        placeholder={t('checkin.history_num', 'Istoriya №')}
                        className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1 lg:col-span-1">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">{t('checkin.fullname').replace('*', '')}</Label>
                      <Input
                        value={member.fullName}
                        onChange={(e) => updateFamilyMember(index, 'fullName', e.target.value)}
                        placeholder="Ism Familiya"
                        className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1 lg:col-span-1">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">{t('checkin.passport_series', 'Pasport seriyasi')}</Label>
                      <Input
                        value={member.passportSeries || ''}
                        onChange={(e) => updateFamilyMember(index, 'passportSeries', e.target.value)}
                        placeholder="Masalan: AB 1234567"
                        className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">{t('checkin.birth_year').replace('*', '')}</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={member.birthYear}
                        onChange={(e) => updateFamilyMember(index, 'birthYear', Number(e.target.value))}
                        placeholder="Masalan: 2000"
                        min={1900}
                        max={new Date().getFullYear()}
                        className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">{t('checkin.gender')}</Label>
                      <Select
                        value={member.gender}
                        onValueChange={(v) => updateFamilyMember(index, 'gender', v)}
                      >
                        <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                          <SelectItem value="male">{t('checkin.gender_male')}</SelectItem>
                          <SelectItem value="female">{t('checkin.gender_female')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Kunlik narx */}
                    <div className="space-y-1">
                      <Label className="text-xs text-emerald-600 dark:text-emerald-500 font-semibold">Narx (UZS/kun)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={member.customPrice !== undefined ? member.customPrice : getMemberPrice(member)}
                        onChange={(e) => updateFamilyMember(index, 'customPrice', Number(e.target.value))}
                        className="bg-white dark:bg-zinc-900 border-emerald-300 dark:border-emerald-700 text-zinc-900 dark:text-zinc-100 h-9 text-sm"
                      />
                    </div>
                    {/* Kunlik chiqim */}
                    <div className="space-y-1 lg:col-span-2">
                      <Label className="text-xs text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" /> {t('checkin.daily_expense', 'Kunlik chiqim (UZS/kun)')}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={member.dailyExpense !== undefined ? member.dailyExpense : 0}
                          onChange={(e) => updateFamilyMember(index, 'dailyExpense', Number(e.target.value))}
                          placeholder="0"
                          className="bg-white dark:bg-zinc-900 border-orange-300 dark:border-orange-800/50 text-zinc-900 dark:text-zinc-100 h-9 text-sm"
                        />
                        {(member.dailyExpense || 0) > 0 && nights > 0 && (
                          <span className="text-xs text-orange-500 whitespace-nowrap">
                            = {((member.dailyExpense || 0) * nights).toLocaleString()} UZS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md space-y-4">
          <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">{t('checkin.room_and_payment')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.select_room')}</Label>
              <Select onValueChange={(v) => {
                setValue('roomId', v);
                const rm = rooms?.find((r: any) => r._id === v);
                if (rm && !mainGuestPrice) {
                  setMainGuestPrice(String(rm.pricePerNight));
                }
              }}>
                <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <SelectValue placeholder={loadingRooms ? t('checkin.loading') : t('checkin.select_room')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-h-[300px]">
                  {rooms?.map((room: any) => (
                    <SelectItem key={room._id} value={room._id}>
                      {t('modals.room.number').split(' ')[0]} {room.roomNumber} — {t(`roomType.${room.type}`)} ({room.pricePerNight.toLocaleString()} UZS)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roomId && <p className="text-xs text-red-500">{String(errors.roomId.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('modals.room_detail.check_in').replace(': ', '')}</Label>
              <Input type="date" {...register('checkInDate')} className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('modals.room_detail.check_out').replace(': ', '')}</Label>
              <Input type="date" {...register('checkOutDate')} className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.payment_method')}</Label>
              <Select onValueChange={(v) => setValue('paymentMethod', v as any)} defaultValue="cash">
                <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <SelectItem value="cash">{t('checkin.pay_cash')}</SelectItem>
                  <SelectItem value="terminal">{t('checkin.pay_card')}</SelectItem>
                  <SelectItem value="click">{t('checkin.pay_click')}</SelectItem>
                  <SelectItem value="transfer">{t('checkin.pay_transfer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 space-y-3">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              <Calculator className="w-4 h-4" /> {t('finance.table.amount').split(' ')[0]}
            </p>

            <div className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>{t('checkin.calc_guests')}</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{numberOfPeople}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('checkin.calc_nights')}</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{nights}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-zinc-300 dark:border-zinc-700 pt-1.5">
                <span>{t('checkin.calc_total')}</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {calculatedTotal.toLocaleString()} UZS
                </span>
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('checkin.calc_list')}</p>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                <div className="flex justify-between py-0.5 font-semibold text-zinc-700 dark:text-zinc-300">
                  <span>1. {watch('fullName') ? watch('fullName') : <span className="italic text-zinc-400">{t('checkin.main_guest')}</span>} — <span className="text-zinc-400">Asosiy mehmon</span></span>
                  <span className="font-medium">{effectiveMainPrice.toLocaleString()} UZS/kun</span>
                </div>
                {mainDailyExpenseNum > 0 && (
                  <div className="flex justify-between py-0.5 pl-3 text-orange-500 dark:text-orange-400">
                    <span>↳ {t('checkin.daily_expense', 'Kunlik chiqim').split('(')[0]} × {nights} {t('checkin.nights', 'kun').replace('*', '').replace('?', '').trim()}</span>
                    <span className="font-medium">{(mainDailyExpenseNum * nights).toLocaleString()} UZS</span>
                  </div>
                )}
                {familyMembers.map((m, i) => (
                  <React.Fragment key={i}>
                    <div className="flex justify-between py-0.5">
                      <span>{i + 2}. {m.fullName || <span className="italic text-zinc-400">{t('checkin.companion', 'Hamroh')} {i + 1}</span>} ({m.birthYear})</span>
                      <span className="font-medium">{getMemberPrice(m).toLocaleString()} UZS/kun</span>
                    </div>
                    {(m.dailyExpense || 0) > 0 && (
                      <div className="flex justify-between py-0.5 pl-3 text-orange-500 dark:text-orange-400">
                        <span>↳ {t('checkin.daily_expense', 'Kunlik chiqim').split('(')[0]} × {nights} {t('checkin.nights', 'kun').replace('*', '').replace('?', '').trim()}</span>
                        <span className="font-medium">{((m.dailyExpense || 0) * nights).toLocaleString()} UZS</span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {totalExpenses > 0 && (
              <div className="flex justify-between items-center bg-orange-50 dark:bg-orange-950/20 rounded-lg px-3 py-2 border border-orange-200 dark:border-orange-800/50">
                <span className="flex items-center gap-1.5 text-sm text-orange-600 dark:text-orange-400 font-medium">
                  <ShoppingCart className="w-3.5 h-3.5" /> {t('checkin.total_expenses', 'Jami chiqimlar')} ({nights} {t('checkin.nights', 'kun').replace('*', '').replace('?', '').trim()})
                </span>
                <span className="font-bold text-orange-600 dark:text-orange-400">
                  {totalExpenses.toLocaleString()} UZS
                </span>
              </div>
            )}

            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useNegotiated}
                  onChange={(e) => setUseNegotiated(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <span className="flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400">
                  <Tag className="w-4 h-4" />
                  {t('checkin.apply_discount')}
                </span>
              </label>
              {useNegotiated && (
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-600 dark:text-zinc-400">
                    {t('checkin.discount_price')} — {calculatedTotal.toLocaleString()} UZS
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={negotiatedPrice}
                    onChange={(e) => setNegotiatedPrice(e.target.value)}
                    placeholder={`Masalan: ${Math.round(calculatedTotal * 0.9).toLocaleString()}`}
                    className="bg-white dark:bg-zinc-900 border-orange-400 dark:border-orange-600 text-orange-700 dark:text-orange-300 font-semibold"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{t('checkin.total_sum')}</span>
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {totalPrice.toLocaleString()} UZS
                {useNegotiated && negotiatedPrice && (
                  <span className="ml-2 text-sm text-orange-500 line-through font-normal">{calculatedTotal.toLocaleString()}</span>
                )}
              </span>
            </div>

            <div className="space-y-2">
              <Label className="text-emerald-600 dark:text-emerald-400 font-semibold">{t('checkin.paid_now')}</Label>
              <Input
                type="text"
                inputMode="numeric"
                {...register('paidAmount')}
                placeholder="Masalan: 100000"
                className="bg-white dark:bg-zinc-950 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold"
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={checkInMutation.isPending}
          className="w-full h-12 text-lg bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
        >
          {checkInMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {t('checkin.btn_submit')}
        </Button>
      </form>
    </div>
  );
}
