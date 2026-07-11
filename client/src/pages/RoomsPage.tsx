import { useRooms } from '../hooks/useRooms';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/useAuthStore';
import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RoomModal from '../components/modals/RoomModal';
import RoomDetailModal from '../components/modals/RoomDetailModal';
import { getImageUrl } from '../utils/imageUrl';

export default function RoomsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: rooms, isLoading, isError } = useRooms();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);

  // Detail modal
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredRooms = useMemo(() => {
    if (!rooms) return [];
    let result = rooms;

    if (statusFilter && statusFilter !== '__all__') {
      result = result.filter((r: any) => r.status === statusFilter);
    }
    if (search.trim()) {
      result = result.filter((r: any) => r.roomNumber.toLowerCase().includes(search.toLowerCase()));
    }
    return result;
  }, [rooms, search, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-red-500">{t('common.error', 'Xonalarni yuklashda xatolik yuz berdi.')}</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-500 text-emerald-500';
      case 'booked': return 'bg-red-500 text-red-500';
      case 'cleaning': return 'bg-yellow-500 text-yellow-500';
      case 'maintenance': return 'bg-blue-500 text-blue-500';
      default: return 'bg-zinc-500 text-zinc-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return t('rooms.status.available');
      case 'booked': return t('rooms.status.booked');
      case 'cleaning': return t('rooms.status.cleaning');
      case 'maintenance': return t('rooms.status.maintenance');
      default: return t('rooms.status.unknown');
    }
  };

  return (
    <div data-aos="fade-up" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('rooms.title')}</h2>
          <p className="text-zinc-500 dark:text-zinc-400">{t('rooms.subtitle')}</p>
        </div>
        {user?.role === 'admin' && (
          <Button
            onClick={() => { setEditingRoom(null); setIsModalOpen(true); }}
            className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('rooms.add_room')}
          </Button>
        )}
      </div>

      {/* Legend */}
      <div data-aos="fade-up" data-aos-delay="50" className="flex flex-wrap gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-sm text-zinc-600 dark:text-zinc-300">{t('rooms.status.available')}</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-sm text-zinc-600 dark:text-zinc-300">{t('rooms.status.booked')}</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span className="text-sm text-zinc-600 dark:text-zinc-300">{t('rooms.status.cleaning')}</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-sm text-zinc-600 dark:text-zinc-300">{t('rooms.status.maintenance')}</span></div>
        <span className="text-sm text-zinc-400 dark:text-zinc-500 ml-auto italic">{t('rooms.click_detail', "Xona kartasini bosib to'liq ma'lumotni ko'ring")}</span>
      </div>

      {/* Filter paneli */}
      <div data-aos="fade-up" data-aos-delay="50" className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-md flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Filter className="w-4 h-4" />
          <span className="font-medium">{t('common.filters', 'Filterlar:')}</span>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('common.search_room', 'Xona raqami...')}
            className="pl-9 bg-zinc-50 dark:bg-zinc-900/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48 bg-zinc-50 dark:bg-zinc-900/50">
            <SelectValue placeholder={t('common.all_statuses', 'Barcha holatlar')} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-950">
            <SelectItem value="__all__">{t('common.all', 'Barchasi')}</SelectItem>
            <SelectItem value="available">{t('rooms.status.available')}</SelectItem>
            <SelectItem value="booked">{t('rooms.status.booked')}</SelectItem>
            <SelectItem value="cleaning">{t('rooms.status.cleaning')}</SelectItem>
            <SelectItem value="maintenance">{t('rooms.status.maintenance')}</SelectItem>
          </SelectContent>
        </Select>
        
        {(search || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); }}
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline md:ml-auto w-full md:w-auto text-left md:text-right"
          >
            {t('common.clear_filters', 'Filtrlarni tozalash')}
          </button>
        )}
      </div>

      <div data-aos="fade-up" data-aos-delay="100" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredRooms?.map((room: any) => {
          const statusClass = getStatusColor(room.status);
          const [bgColor, textColor] = statusClass.split(' ');

          return (
            <div
              key={room._id}
              onClick={() => setSelectedRoomId(room._id)}
              className="group relative flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all cursor-pointer overflow-hidden active:scale-[0.97]"
            >
              {/* Status bar top */}
              <div className={cn("absolute top-0 left-0 w-full h-1 z-20", bgColor)}></div>

              {/* Total Capacity Badge */}
              {room.capacity > 0 && (
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/40 backdrop-blur-md text-white px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/10 shadow-sm">
                  <Users className="w-3 h-3 opacity-80" />
                  <span>{room.capacity}</span>
                </div>
              )}

              {/* Image */}
              {room.imageUrl ? (
                <div className="w-full h-32 relative overflow-hidden border-b border-zinc-100 dark:border-zinc-800/50">
                  <img
                    src={getImageUrl(room.imageUrl) || ''}
                    alt="Room"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Rasm yuklanmasa, placeholder ko'rsatish
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><span class="text-xs text-zinc-400">Rasm yuklanmadi</span></div>';
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-32 bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center border-b border-zinc-100 dark:border-zinc-800/50">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">{t('common.no_image', "Rasm yo'q")}</span>
                </div>
              )}

              {/* Info */}
              <div className="p-4 flex flex-col items-center justify-center flex-1 relative z-10">
                <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{room.roomNumber}</span>
                <span className={cn("text-[11px] font-semibold mt-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-center flex flex-col items-center gap-0.5 leading-none", textColor)}>
                  <span>{getStatusText(room.status)}</span>
                  {room.status === 'available' && room.capacity > 0 && (
                    <span className="text-[9px] opacity-80 font-normal">
                      {t('rooms.capacity_left', { count: room.capacity - (room.occupiedBeds || 0) }).replace('{{count}}', String(room.capacity - (room.occupiedBeds || 0)))}
                    </span>
                  )}
                </span>

                {/* Band xonada qolgan o'rinlar */}
                {room.status === 'booked' && room.capacity > 0 && (() => {
                  const remaining = room.capacity - (room.occupiedBeds || 0);
                  return remaining > 0 ? (
                    <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                      +{remaining} o'rin bor
                    </span>
                  ) : null;
                })()}

                {room.status === 'booked' && room.currentBookings && room.currentBookings.length > 0 && (
                  <span className="mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-full px-1 text-center">
                    {room.currentBookings.map((b: any) => b.guestDetails?.fullName?.split(' ')[0]).join(', ')}
                  </span>
                )}
                {room.status === 'booked' && !room.currentBookings && room.currentBooking && (
                  <span className="mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-full px-1 text-center">
                    {room.currentBooking.guestDetails?.fullName?.split(' ')[0]}
                  </span>
                )}
                {room.status === 'maintenance' && (
                  <span className="mt-2 text-[10px] text-blue-400 font-medium">{t('rooms.status.maintenance')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Room Detail Modal */}
      <RoomDetailModal
        roomId={selectedRoomId}
        onClose={() => setSelectedRoomId(null)}
        onEdit={(room) => {
          setEditingRoom(room);
          setIsModalOpen(true);
        }}
      />

      <RoomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingRoom={editingRoom} />
    </div>
  );
}
