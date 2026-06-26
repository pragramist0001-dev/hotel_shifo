import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, User, Lock, Phone, UserCircle2, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    phone: user?.phone || '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await api.put('/auth/profile', formData);
      setSuccess(t('profile.success', "Profil ma'lumotlari muvaffaqiyatli yangilandi!"));
      
      // Update global auth store state with new user info
      // we don't have new tokens, just user object
      useAuthStore.setState({ user: data.user });
      
      setFormData(prev => ({ ...prev, password: '' })); // clear password field
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error', 'Xatolik yuz berdi'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('profile.title', 'Profil Sozlamalari')}</h2>
        <p className="text-zinc-500 dark:text-zinc-400">{t('profile.subtitle', "Shaxsiy ma'lumotlaringiz va parolingizni yangilang.")}</p>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-semibold">{t('profile.fullname', 'F.I.SH')}</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircle2 className="h-5 w-5 text-zinc-400" />
                </div>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="pl-10 bg-white dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-semibold">{t('profile.username', 'Login (Username)')}</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-zinc-400" />
                </div>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="pl-10 bg-white dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-semibold">{t('profile.phone', 'Telefon raqam')}</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-zinc-400" />
                </div>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10 bg-white dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Label className="text-zinc-700 dark:text-zinc-300 font-semibold">{t('profile.new_password', 'Yangi Parol (ixtiyoriy)')}</Label>
              <p className="text-xs text-zinc-500 mb-2">{t('profile.password_hint', "Faqatgina parolni o'zgartirmoqchi bo'lsangiz kiriting.")}</p>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-400" />
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-white dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus-visible:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 text-md font-bold tracking-wide bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-all shadow-[0_0_20px_rgba(5,150,105,0.2)] hover:shadow-[0_0_25px_rgba(5,150,105,0.4)] rounded-lg"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {t('profile.save', 'Saqlash va Yangilash')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
