import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateRoom, useUpdateRoom } from '../../hooks/useRooms';
import { Loader2, UploadCloud, CheckCircle2, Bed, Sparkles, Wrench, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '../../lib/api';
import { useTranslation } from 'react-i18next';

const getStatusOptions = (t: any) => [
  {
    value: 'available',
    label: t('rooms.status_available', "Bo'sh"),
    description: t('rooms.desc_available', 'Xona mehmonlarni qabul qilishga tayyor'),
    color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
    ring: 'ring-emerald-400',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
  },
  {
    value: 'cleaning',
    label: t('rooms.status_cleaning', 'Tozalanmoqda'),
    description: t('rooms.desc_cleaning', 'Xona tozalanish jarayonida'),
    color: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400',
    ring: 'ring-yellow-400',
    icon: Sparkles,
    dot: 'bg-yellow-500',
  },
  {
    value: 'maintenance',
    label: t('rooms.status_maintenance', "Ta'mirlashda"),
    description: t('rooms.desc_maintenance', "Xona ta'mir yoki texnik xizmatda"),
    color: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
    ring: 'ring-blue-400',
    icon: Wrench,
    dot: 'bg-blue-500',
  },
];

export default function RoomModal({ isOpen, onClose, editingRoom }: {
  isOpen: boolean;
  onClose: () => void;
  editingRoom?: any;
}) {
  const { t } = useTranslation();
  const STATUS_OPTIONS = getStatusOptions(t);
  const { mutateAsync: createRoom, isPending: isCreating } = useCreateRoom();
  const { mutateAsync: updateRoom, isPending: isUpdating } = useUpdateRoom();
  const isPending = isCreating || isUpdating;

  const [formData, setFormData] = useState({
    roomNumber: '',
    type: 'standard',
    floor: '1',
    pricePerNight: '',
    description: '',
    imageUrl: '',
    status: 'available',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingRoom) {
      setFormData({
        roomNumber: editingRoom.roomNumber,
        type: editingRoom.type,
        floor: editingRoom.floor.toString(),
        pricePerNight: editingRoom.pricePerNight.toString(),
        description: editingRoom.description || '',
        imageUrl: editingRoom.imageUrl || '',
        status: editingRoom.status === 'booked' ? 'available' : (editingRoom.status || 'available'),
      });
    } else {
      setFormData({ roomNumber: '', type: 'ekonom', floor: '1', pricePerNight: '', description: '', imageUrl: '', status: 'available' });
    }
    setError('');
    setUploadError('');
  }, [editingRoom, isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Hajmni tekshirish (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Rasm hajmi 10MB dan oshmasligi kerak.');
      return;
    }

    // Formatni tekshirish
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setUploadError('Faqat JPG yoki PNG formatdagi rasmlar qabul qilinadi.');
      return;
    }

    try {
      setUploadError('');
      setUploadingImage(true);
      const data = new FormData();
      data.append('image', file); // server 'image' kutadi
      const res = await api.post('/upload/image', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormData(prev => ({ ...prev, imageUrl: res.data.url }));
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || 'Rasm yuklashda xatolik yuz berdi.');
    } finally {
      setUploadingImage(false);
      // input ni reset qilish (qayta xuddi fayl tanlanishi uchun)
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = {
        ...formData,
        floor: Number(formData.floor),
        pricePerNight: Number(formData.pricePerNight),
      };
      if (editingRoom) {
        await updateRoom({ id: editingRoom._id, roomData: data });
      } else {
        await createRoom(data);
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('common.error_occurred', 'Xatolik yuz berdi.'));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Bed className="w-5 h-5 text-emerald-500" />
            {editingRoom ? t('rooms.edit_room', 'Xonani Tahrirlash') : t('rooms.add_room', "Yangi Xona Qo'shish")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">

          {/* Xona raqami va qavat */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('rooms.room_number', 'Xona Raqami')} *</Label>
              <Input
                required
                value={formData.roomNumber}
                onChange={e => setFormData({ ...formData, roomNumber: e.target.value })}
                placeholder="101"
                className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('rooms.floor', 'Qavat')} *</Label>
              <Input
                type="text"
                inputMode="numeric"
                required
                min={1}
                value={formData.floor}
                onChange={e => setFormData({ ...formData, floor: e.target.value })}
                placeholder="Masalan: 1"
                className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Tur va narx */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('rooms.room_type', 'Xona Turi')} *</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <SelectValue placeholder={t('common.select', 'Tanlang')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                  <SelectItem value="ekonom">Ekonom</SelectItem>
                  <SelectItem value="standartplus">Standart Plus</SelectItem>
                  <SelectItem value="lyuks">Lyuks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('rooms.price_per_night', 'Narxi (UZS/Kun)')} *</Label>
              <Input
                type="text"
                inputMode="numeric"
                required
                min={0}
                value={formData.pricePerNight}
                onChange={e => setFormData({ ...formData, pricePerNight: e.target.value })}
                placeholder="Masalan: 500000"
                className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-700 dark:text-zinc-300">{t('rooms.additional_info', "Qo'shimcha Ma'lumot")}</Label>
            <Input
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('rooms.room_info_placeholder', 'Xona haqida qisqacha...')}
              className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* ====== STATUS TANLASH ====== */}
          <div className="space-y-3">
            <Label className="text-zinc-700 dark:text-zinc-300">
              {t('rooms.room_status', 'Xona Holati')}
              {editingRoom?.status === 'booked' && (
                <span className="ml-2 text-xs text-orange-500 font-normal">
                  ({t('rooms.booked_status_warning', "Band xonada status qo'lda o'zgartirilmaydi")})
                </span>
              )}
            </Label>

            <div className="grid grid-cols-1 gap-2">
              {STATUS_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isSelected = formData.status === opt.value;
                const isDisabled = editingRoom?.status === 'booked';

                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && setFormData({ ...formData, status: opt.value })}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left w-full',
                      isSelected
                        ? `${opt.color} border-2 ${opt.ring} ring-2 shadow-sm`
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700',
                      isDisabled && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      isSelected ? 'bg-white/50 dark:bg-black/20' : 'bg-zinc-100 dark:bg-zinc-800'
                    )}>
                      <Icon className={cn('w-4 h-4', isSelected ? '' : 'text-zinc-400 dark:text-zinc-500')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', opt.dot)} />
                        <span className="font-semibold text-sm">{opt.label}</span>
                        {isSelected && (
                          <span className="ml-auto text-xs font-bold opacity-70">✓ {t('rooms.selected', 'Tanlandi')}</span>
                        )}
                      </div>
                      <p className={cn('text-xs mt-0.5', isSelected ? 'opacity-70' : 'text-zinc-400 dark:text-zinc-500')}>
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {editingRoom?.status === 'booked' && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                <Bed className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">
                  {t('rooms.checkout_needed_msg', "Hozir bu xonada mehmon turibdi. Check-out qilinganidan keyin status o'zgartirish mumkin.")}
                </p>
              </div>
            )}
          </div>

          {/* Rasm */}
          <div className="space-y-2">
            <Label className="text-zinc-700 dark:text-zinc-300">
              {t('rooms.room_image', 'Xona Rasmi')}
              <span className="ml-1 text-xs text-zinc-400 font-normal">(JPG, PNG • max 10MB)</span>
            </Label>

            {formData.imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-emerald-300 dark:border-emerald-700 h-36 group">
                <img
                  src={formData.imageUrl}
                  alt="Xona rasmi"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-lg text-xs font-medium text-zinc-800 hover:bg-white transition-colors">
                    <UploadCloud className="w-3.5 h-3.5" />
                    O'zgartirish
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/90 rounded-lg text-xs font-medium text-white hover:bg-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    O'chirish
                  </button>
                </div>
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  ✓ Yuklandi
                </div>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                uploadingImage
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10'
              }`}>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Yuklanmoqda...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6 text-zinc-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Rasm yuklash uchun bosing</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">JPG, PNG • Maksimal 10MB</p>
                    </div>
                  </div>
                )}
              </label>
            )}

            {uploadError && (
              <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                <X className="w-3 h-3" />
                {uploadError}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-600 dark:text-zinc-400">
              {t('common.cancel', 'Bekor qilish')}
            </Button>
            <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 min-w-24">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingRoom ? t('common.save', 'Saqlash') : t('common.add', "Qo'shish")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
