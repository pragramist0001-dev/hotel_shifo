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
import { Loader2, CheckCircle2, UserPlus, Trash2, Users, Calculator, Tag, ShoppingCart, Camera, Image as ImageIcon, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { handlePrintReceipt } from '../utils/printReceipt';


interface FamilyMember {
  historyNumber: string;
  fullName: string;

  birthDate?: string;
  gender: 'male' | 'female';
  relationship?: string;
  customPrice?: number;
  passportSeries?: string;
  dailyExpense?: number; // Kunlik chiqim (UZS/kun)
  guestImageFile?: File | null;
  guestImagePreview?: string | null;
}

export default function CheckInPage() {
  const { t } = useTranslation();

  const formSchema = z.object({
    roomId: z.string().min(1, t('checkin.select_room')),
    fullName: z.string().min(3, t('checkin.fullname')),
    phone: z.string().min(9, t('checkin.phone')),

    birthDate: z.string().optional(),
    gender: z.enum(['male', 'female']),
    country: z.string().min(2, t('checkin.country')),
    maritalStatus: z.enum(['single', 'married']).optional(),
    historyNumber: z.string().min(1, t('checkin.history_required')),
    passportSeries: z.string().optional(),
    profession: z.string().optional(),
    checkInDate: z.string().min(1, t('checkin.checkin_required')),
    checkInTime: z.string().optional(),
    checkOutDate: z.string().min(1, t('checkin.checkout_required')),
    paymentMethod: z.enum(['cash', 'terminal', 'click', 'transfer']),
    paidAmount: z.coerce.number().min(0),
  });

  type FormData = z.infer<typeof formSchema>;
  const { data: allRooms, isLoading: loadingRooms } = useRooms();
  const rooms = allRooms?.filter((r: any) => r.status === 'available' || r.status === 'booked');
  const checkInMutation = useCheckIn();
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  // === Oila a'zolari ===
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // === Narx sozlamalari ===
  const [mainGuestPrice, setMainGuestPrice] = useState<string>('');
  const [mainDailyExpense, setMainDailyExpense] = useState<string>(''); // Asosiy mehmon kunlik chiqimi
  const [useNegotiated, setUseNegotiated] = useState(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState<string>('');

  // === Rasm yuklash ===
  const [guestImageFile, setGuestImageFile] = useState<File | null>(null);
  const [guestImagePreview, setGuestImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      gender: 'male',
      maritalStatus: 'single',
      paymentMethod: 'cash',
      checkInDate: today,
      checkInTime: new Date().toTimeString().slice(0, 5),
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
  const mainTotalPrice = effectiveMainPrice * nights;
  const membersTotalPrice = familyMembers.reduce(
    (sum, m) => sum + getMemberPrice(m) * nights,
    0
  );
  const calculatedTotal = mainTotalPrice + membersTotalPrice;

  // Faqat chiqim summasi
  const totalExpenses = (mainDailyExpenseNum * nights) +
    familyMembers.reduce((sum, m) => sum + (m.dailyExpense || 0) * nights, 0);

  const totalPrice = useNegotiated && negotiatedPrice
    ? Number(negotiatedPrice)
    : calculatedTotal;

  // === Oila a'zolarini boshqarish ===
  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, {
      historyNumber: '', fullName: '', birthDate: '', gender: 'male',
      relationship: '', customPrice: effectiveMainPrice, passportSeries: '', dailyExpense: 0,
      guestImageFile: null, guestImagePreview: null
    }]);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: any) => {
    const updated = [...familyMembers];
    (updated[index] as any)[field] = value;

    if (field === 'birthDate') {
      const birthYear = new Date(value).getFullYear();
      const age = new Date().getFullYear() - birthYear;
      if (age <= 3) updated[index].customPrice = 0;
      else if (age >= 4 && age <= 13) updated[index].customPrice = 140000;
      else updated[index].customPrice = effectiveMainPrice;
    }

    setFamilyMembers(updated);
  };

  const onSubmit = async (data: FormData) => {
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

    try {
      let guestImageUrl = undefined;

      if (guestImageFile) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('image', guestImageFile);
        const token = localStorage.getItem('accessToken');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiUrl}/upload/image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || t('common.image_upload_error'));
        guestImageUrl = data.url;
      }

      // Hamrohlar rasmlarini yuklash
      const updatedFamilyMembers = await Promise.all(
        familyMembers.map(async (m) => {
          let memberImageUrl = undefined;
          if (m.guestImageFile) {
            const formData = new FormData();
            formData.append('image', m.guestImageFile);
            const token = localStorage.getItem('accessToken');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const res = await fetch(`${apiUrl}/upload/image`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || t('common.image_upload_error'));
            memberImageUrl = data.url;
          }
          return {
            historyNumber: m.historyNumber,
            fullName: m.fullName,
            birthDate: m.birthDate || undefined,
            gender: m.gender,
            relationship: m.relationship,
            passportSeries: m.passportSeries,
            guestImage: memberImageUrl
          };
        })
      );

      const payload = {
        roomId: data.roomId,
        guestDetails: {
          historyNumber: data.historyNumber,
          fullName: data.fullName,
          phone: data.phone,
          birthDate: data.birthDate || undefined,
          gender: data.gender,
          country: data.country,
          profession: data.profession,
          maritalStatus: updatedFamilyMembers.length > 0 ? 'married' : 'single',
          passportSeries: data.passportSeries,
          guestImage: guestImageUrl,
          familyMembers: updatedFamilyMembers.length > 0 ? updatedFamilyMembers : undefined,
        },
        checkInDate: data.checkInDate,
        checkInTime: (data as any).checkInTime || undefined,
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
          setErrorMsg('');
          window.scrollTo(0, 0);
        },
        onError: (err: any) => {
          console.error('CheckIn xatosi:', err);
          setErrorMsg(err.response?.data?.message || err.message || t('common.unknown_error'));
          window.scrollTo(0, 0);
        }
      });
    } catch (error: any) {
      console.error('Submit xatosi:', error);
      setErrorMsg(error.message || t('common.error'));
      window.scrollTo(0, 0);
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (successMsg) {
    // rooms — muvaffaqiyatli check-in dan KEYIN React Query tomonidan yangilanadi (selected xona endi 'booked')
    const availableRooms = rooms || [];
    const availableCount = availableRooms.length;

    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6 max-w-lg mx-auto">
        <CheckCircle2 className="w-20 h-20 text-emerald-500 drop-shadow-lg" />
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t('checkin.success')}</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-center">{successMsg}</p>

        <div className="flex gap-4">
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
              {t('common.print_receipt')}
            </Button>
          )}
        </div>

        {/* Bo'sh xonalar */}
        <div className="w-full mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-md overflow-hidden shadow-sm">
          <div className={`flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 ${availableCount === 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
            <span className="font-semibold text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              🏨 Bo'sh xonalar
            </span>
            <span className={`text-2xl font-black ${availableCount === 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {availableCount} ta
            </span>
          </div>

          {availableCount === 0 ? (
            <div className="px-5 py-4 text-center">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">⚠️ Barcha xonalar band!</p>
              <p className="text-xs text-zinc-400 mt-1">Hozirda bo'sh xona mavjud emas.</p>
            </div>
          ) : (
            <div className="px-5 py-3 flex flex-wrap gap-2">
              {availableRooms.slice(0, 12).map((r: any) => (
                <span
                  key={r._id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold"
                >
                  #{r.roomNumber}
                  {r.capacity > 0 && (
                    <span className="text-emerald-400 dark:text-emerald-600 font-normal">·{r.capacity}o'rin</span>
                  )}
                </span>
              ))}
              {availableRooms.length > 12 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-medium">
                  +{availableRooms.length - 12} ta yana
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-aos="fade-up" className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('checkin.title')}</h2>
        <p className="text-zinc-500 dark:text-zinc-400">{t('checkin.subtitle')}</p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit as any, (formErrors) => {
        console.error('Form validation errors:', formErrors);
        setErrorMsg(t('checkin.validation_error'));
        window.scrollTo(0, 0);
      })} className="space-y-6">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md space-y-4">
          <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">{t('checkin.personal_info')}</h3>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0 space-y-3 flex flex-col items-center">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 flex flex-col items-center justify-center overflow-hidden relative">
                {guestImagePreview ? (
                  <>
                    <img src={guestImagePreview} alt="Guest" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setGuestImageFile(null); setGuestImagePreview(null); }}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-zinc-400 dark:text-zinc-500 flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-xs text-center px-2">{t('checkin.image_optional')}</span>
                  </div>
                )}
              </div>
              <Label className="cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 py-2 px-4 rounded-lg text-sm font-medium transition flex items-center gap-2">
                <Camera className="w-4 h-4" />
                {t('common.upload_image')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setGuestImageFile(file);
                      setGuestImagePreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </Label>
            </div>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.birth_date', 'Tug\'ilgan sana')}</Label>
              <Input type="text" placeholder="12.05.1990" {...register('birthDate')} className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" />
              {errors.birthDate && <p className="text-xs text-red-500">{String(errors.birthDate.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.country')}</Label>
              <Input {...register('country')} className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" placeholder="O'zbekiston, Toshkent" />
              {errors.country && <p className="text-xs text-red-500">{String(errors.country.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.profession')}</Label>
              <Input {...register('profession')} className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" placeholder="O'qituvchi, Shifokor..." />
              {errors.profession && <p className="text-xs text-red-500">{String(errors.profession.message)}</p>}
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
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.passport_series')}</Label>
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
                placeholder={selectedRoom ? `${selectedRoom.pricePerNight.toLocaleString()}` : t('checkin.auto_room_price')}
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
                placeholder={`${t('common.example')}: 50000 (${t('common.optional')})`}
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
                    <div className="space-y-1 lg:col-span-1">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">{t('checkin.image_optional')}</Label>
                      <div className="flex items-center gap-2">
                        {member.guestImagePreview ? (
                          <div className="relative w-9 h-9 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 overflow-hidden shrink-0">
                            <img src={member.guestImagePreview} alt="Guest" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => { updateFamilyMember(index, 'guestImageFile', null); updateFamilyMember(index, 'guestImagePreview', null); }}
                              className="absolute top-0 right-0 bg-red-500/80 text-white p-0.5"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <Label className="cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 h-9 w-9 rounded flex items-center justify-center shrink-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
                            <Camera className="w-4 h-4" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  updateFamilyMember(index, 'guestImageFile', file);
                                  updateFamilyMember(index, 'guestImagePreview', URL.createObjectURL(file));
                                }
                              }}
                            />
                          </Label>
                        )}
                        <span className="text-xs text-zinc-500 dark:text-zinc-500 hidden xl:block">
                          {member.guestImagePreview ? t('common.uploaded') : t('common.upload')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">{t('checkin.birth_date', 'Tug\'ilgan sana')}</Label>
                      <Input
                        type="text"
                        placeholder="12.05.1990"
                        value={member.birthDate || ''}
                        onChange={(e) => updateFamilyMember(index, 'birthDate', e.target.value)}
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
                      <Label className="text-xs text-emerald-600 dark:text-emerald-500 font-semibold">{t('checkin.price_per_day')}</Label>
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
                  {rooms?.filter((room: any) => (room.capacity - (room.occupiedBeds || 0)) >= numberOfPeople).map((room: any) => (
                    <SelectItem key={room._id} value={room._id} className="text-zinc-900 dark:text-zinc-100">
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
              <Label className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <span>⏰</span> {t('checkin.arrival_time', 'Kelgan vaqt (soat)')}
              </Label>
              <Input
                type="time"
                {...register('checkInTime' as any)}
                className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
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
              <div className="flex justify-between items-center">
                <span>{t('checkin.calc_guests')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {numberOfPeople}
                  </span>
                </div>
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
                  <span>1. {watch('fullName') ? watch('fullName') : <span className="italic text-zinc-400">{t('checkin.main_guest')}</span>} — <span className="text-zinc-400">{t('checkin.main_guest')}</span></span>
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
                      <span>{i + 2}. {m.fullName || <span className="italic text-zinc-400">{t('checkin.companion', 'Hamroh')} {i + 1}</span>}</span>
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
                  - {totalExpenses.toLocaleString()} UZS
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
          disabled={checkInMutation.isPending || isUploadingImage}
          className="w-full h-12 text-lg bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
        >
          {(checkInMutation.isPending || isUploadingImage) ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {isUploadingImage ? t('common.uploading_image') : t('checkin.btn_submit')}
        </Button>
      </form>
    </div>
  );
}
