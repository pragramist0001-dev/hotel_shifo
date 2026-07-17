import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, BedDouble, FileText, CreditCard, Users, LogOut, Sun, Moon, Globe, ClipboardList, MessageCircle, Menu, X, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealTimeEvents } from '../../hooks/useRealTimeEvents';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme-provider';
import { useState } from 'react';
import ChatPanel from '../chat/ChatPanel';

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Real-time Socket.io eventlarini tinglash va Query'larni yangilash
  useRealTimeEvents();

  const navItems = [
    { name: t('nav.dashboard'), path: '/', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['admin', 'reception'] },
    { name: t('nav.rooms'), path: '/rooms', icon: <BedDouble className="w-5 h-5" />, roles: ['admin', 'reception'] },
    { name: t('nav.checkIn'), path: '/check-in', icon: <FileText className="w-5 h-5" />, roles: ['admin', 'reception'] },
    { name: t('nav.reservations', 'Bron (Zanit)'), path: '/reservations', icon: <CalendarCheck className="w-5 h-5" />, roles: ['admin', 'reception'] },
    { name: t('nav.clients', 'Mijozlar'), path: '/clients', icon: <Users className="w-5 h-5" />, roles: ['admin', 'reception'] },
    { name: t('nav.finance'), path: '/finance', icon: <CreditCard className="w-5 h-5" />, roles: ['admin'] },
    { name: t('nav.reports', 'Hisobotlar'), path: '/reports', icon: <ClipboardList className="w-5 h-5" />, roles: ['admin', 'reception'] },
    { name: t('nav.staff'), path: '/staff', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
  ];

  const visibleNavs = navItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex transition-colors">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:bg-white/50 md:dark:bg-zinc-950/50 md:backdrop-blur-md",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className="h-12 w-auto object-contain dark:invert" />
            <span className="text-xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent truncate">
              Sherabod Shifo
            </span>
          </div>
          <button 
            className="md:hidden p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {visibleNavs.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-all",
                    isActive && "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-300/50 dark:border-zinc-700/50"
                  )}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Button>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 px-2 py-3 mb-2 rounded-md bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/80">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {user?.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.fullName}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                    {user?.role === 'admin' ? '👑 Admin' : '🛎️ Qabul bo\'limi'}
                  </p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">{t('profile.my_profile', 'Mening Profilim')}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="destructive" 
            className="w-full bg-red-950/30 text-red-500 hover:bg-red-950/50 hover:text-red-400 border border-red-900/30"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('nav.logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-zinc-950/0 to-zinc-950/0 pointer-events-none"></div>
        
        {/* Header */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 transition-colors">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden mr-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                  <Globe className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                <DropdownMenuItem onClick={() => i18n.changeLanguage('uz')}>O'zbek</DropdownMenuItem>
                <DropdownMenuItem onClick={() => i18n.changeLanguage('ru')}>Русский</DropdownMenuItem>
                <DropdownMenuItem onClick={() => i18n.changeLanguage('en')}>English</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setIsChatOpen(true)} variant="ghost" size="icon" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 relative bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 transition-colors">
              <MessageCircle className="w-5 h-5" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            </Button>
          </div>
        </header>

        {/* Chat Panel */}
        <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 relative z-10">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
