import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateStaff, useUpdateStaff } from '../../hooks/useStaff';
import { Loader2, Eye, EyeOff, User, KeyRound, Phone, AtSign, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingStaff?: any | null;
}

export default function StaffModal({ isOpen, onClose, editingStaff }: Props) {
  const { t } = useTranslation();
  const { mutateAsync: createStaff, isPending: isCreating } = useCreateStaff();
  const { mutateAsync: updateStaff, isPending: isUpdating } = useUpdateStaff();
  const isPending = isCreating || isUpdating;

  const isEdit = !!editingStaff;

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingStaff) {
        setFullName(editingStaff.fullName || '');
        setUsername(editingStaff.username || '');
        setPassword('');
        setPhone(editingStaff.phone || '');
      } else {
        setFullName('');
        setUsername('');
        setPassword('');
        setPhone('');
      }
      setShowPassword(false);
      setError('');
    }
  }, [editingStaff, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isEdit && password.length < 6) {
      setError(t('staff.err_pwd_length', "Parol kamida 6 ta belgidan iborat bo'lishi kerak."));
      return;
    }

    try {
      if (isEdit) {
        const payload: any = { fullName, username, phone };
        if (password.trim().length > 0) {
          payload.password = password;
        }
        await updateStaff({ id: editingStaff._id, data: payload });
      } else {
        await createStaff({ fullName, username, password, phone });
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('common.error_occurred', 'Xatolik yuz berdi.'));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 w-[95vw] max-w-md max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-500" />
            {isEdit ? t('staff.edit_staff', 'Xodimni Tahrirlash') : t('staff.add_staff', "Yangi Xodim Qo'shish")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2" autoComplete="off">
          {/* F.I.SH */}
          <div className="space-y-1.5">
            <Label className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 text-sm">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              {t('staff.full_name', "To'liq ismi")} *
            </Label>
            <Input
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Abdullayev Sardor"
              autoComplete="off"
              className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 text-sm">
              <AtSign className="w-3.5 h-3.5 text-zinc-400" />
              {t('staff.username', 'Username (Login)')} *
            </Label>
            <Input
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="sardor01"
              autoComplete="off"
              spellCheck={false}
              className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
            />
          </div>

          {/* Parol */}
          <div className="space-y-1.5">
            <Label className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 text-sm">
              <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
              {isEdit ? t('staff.new_password', 'Yangi Parol') : t('staff.password', 'Parol') + ' *'}
            </Label>

            {/* Ko'rinmas input — brauzer autofill'ni aldash */}
            <input type="password" autoComplete="new-password" className="hidden" aria-hidden="true" tabIndex={-1} />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={!isEdit}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isEdit ? t('staff.leave_empty', "O'zgartirmasangiz bo'sh qoldiring") : t('staff.min_6_chars', 'Kamida 6 ta belgi')}
                autoComplete="new-password"
                data-form-type="other"
                className="w-full h-10 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 pr-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye className="h-4 w-4" />
                }
              </button>
            </div>

            {isEdit && (
              <div className="flex items-start gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{t('staff.leave_empty_desc', "Bo'sh qoldirsangiz parol o'zgarmaydi")}</span>
              </div>
            )}

            {!isEdit && password.length > 0 && (
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= i * 3
                        ? password.length >= 10 ? 'bg-emerald-500' : password.length >= 7 ? 'bg-yellow-500' : 'bg-red-400'
                        : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}
                  />
                ))}
                <span className="text-xs text-zinc-400 ml-1">
                  {password.length < 6 ? t('staff.pwd_too_short', 'Juda qisqa') : password.length < 8 ? t('staff.pwd_fair', 'Yetarli') : password.length < 10 ? t('staff.pwd_good', 'Yaxshi') : t('staff.pwd_strong', 'Kuchli')}
                </span>
              </div>
            )}
          </div>

          {/* Telefon */}
          <div className="space-y-1.5">
            <Label className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 text-sm">
              <Phone className="w-3.5 h-3.5 text-zinc-400" />
              {t('staff.phone', 'Telefon raqam')}
            </Label>
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+998901234567"
              autoComplete="off"
              className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Xato */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Tugmalar */}
          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-zinc-600 dark:text-zinc-400 cursor-pointer"
            >
              {t('common.cancel', 'Bekor qilish')}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 min-w-28 cursor-pointer"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEdit ? t('common.save', 'Saqlash') : t('common.add', "Qo'shish")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
