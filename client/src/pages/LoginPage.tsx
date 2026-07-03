import { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import api from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, User, Lock, HeartPulse } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    } catch (err: any) {
      setError(err.response?.data?.message || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100 via-zinc-50 to-zinc-50 dark:from-emerald-950/30 dark:via-zinc-950 dark:to-zinc-950 transition-colors"></div>
      
      <Card className="w-full max-w-md relative z-10 border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
        <CardHeader className="space-y-3 text-center pb-8 pt-8">
          <div className="mx-auto w-32 h-32 rounded-2xl overflow-hidden mb-2 shadow-md border border-zinc-200 dark:border-zinc-800/50 bg-white">
            <img src="/logo.jpg" alt="Sanatory Logo" className="w-full h-full object-contain" />
          </div>
          <CardDescription className="text-zinc-500 dark:text-zinc-400 font-medium">
            {t('login.subtitle')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-zinc-700 dark:text-zinc-300 font-semibold">{t('login.username')}</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                </div>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="pl-10 h-12 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-500 transition-all rounded-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-700 dark:text-zinc-300 font-semibold">{t('login.password')}</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 pr-10 h-12 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-500 transition-all rounded-lg"
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
          </CardContent>
          <CardFooter className="pb-8 pt-4">
            <Button 
              type="submit" 
              className="w-full h-12 text-md font-bold tracking-wide bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-all shadow-[0_0_20px_rgba(5,150,105,0.2)] hover:shadow-[0_0_25px_rgba(5,150,105,0.4)] rounded-lg"
              disabled={loading}
            >
              {loading ? t('login.btn_loading') : t('login.btn_login')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
