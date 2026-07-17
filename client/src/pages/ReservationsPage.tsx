import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRooms } from '../hooks/useRooms';
import { useReservations, useCreateReservation, useCancelReservation, useDeleteReservation, useConfirmReservation } from '../hooks/useReservations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarCheck, Plus, Trash2, X, CheckCircle2, BanIcon, Loader2, BedDouble, Users, Phone, NotebookText, Search } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/40',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/40',
  checked_in: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
};

const STATUS_LABELS = (t: any): Record<string, string> => ({
  pending: t('reservations.status.pending'),
  confirmed: t('reservations.status.confirmed'),
  cancelled: t('reservations.status.cancelled'),
  checked_in: t('reservations.status.checked_in'),
});

export default function ReservationsPage() {
  const { t } = useTranslation();
  const { data: allRooms, isLoading: loadingRooms } = useRooms();
  const { data: reservations, isLoading } = useReservations();
  const createMutation = useCreateReservation();
  const confirmMutation = useConfirmReservation();
  const cancelMutation = useCancelReservation();
  const deleteMutation = useDeleteReservation();

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form state
  const [form, setForm] = useState<{
    roomId: string;
    guestName: string;
    guestPhone: string;
    numberOfGuests: number | '';
    checkInDate: string;
    checkOutDate: string;
    notes: string;
  }>({
    roomId: '',
    guestName: '',
    guestPhone: '',
    numberOfGuests: 1,
    checkInDate: '',
    checkOutDate: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  // Faqat bo'sh xonalar
  const availableRooms = allRooms?.filter((r: any) => r.status === 'available') || [];

  const filteredReservations = (reservations || []).filter((r: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.guestName?.toLowerCase().includes(q) ||
      r.guestPhone?.toLowerCase().includes(q) ||
      r.room?.roomNumber?.toLowerCase().includes(q)
    );
  });

  const selectedRoom = availableRooms.find((r: any) => r._id === form.roomId);

  const resetForm = () => {
    setForm({ roomId: '', guestName: '', guestPhone: '', numberOfGuests: 1, checkInDate: '', checkOutDate: '', notes: '' });
    setFormError('');
  };

  const handleCreate = () => {
    setFormError('');
    if (!form.roomId) { setFormError("Xona tanlang."); return; }
    if (!form.guestName.trim()) { setFormError("Mehmon ismini kiriting."); return; }
    if (!form.guestPhone.trim()) { setFormError("Telefon raqamini kiriting."); return; }
    if (!form.numberOfGuests || Number(form.numberOfGuests) < 1) { setFormError("Mehmonlar sonini kiriting."); return; }
    if (!form.checkInDate) { setFormError("Kelish sanasini kiriting."); return; }
    if (!form.checkOutDate) { setFormError("Ketish sanasini kiriting."); return; }
    if (new Date(form.checkOutDate) <= new Date(form.checkInDate)) { setFormError("Ketish sanasi kelishidan keyin bo'lishi kerak."); return; }
    if (selectedRoom && Number(form.numberOfGuests) > (selectedRoom.capacity || 1)) {
      setFormError(`Xona sig'imi ${selectedRoom.capacity} ta kishi. Mehmonlar sonini kamaytiring.`);
      return;
    }

    createMutation.mutate(form, {
      onSuccess: () => {
        setCreateOpen(false);
        resetForm();
      },
      onError: (err: any) => {
        setFormError(err.response?.data?.message || 'Xatolik yuz berdi.');
      },
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CalendarCheck className="w-8 h-8 text-violet-500" />
            {t('reservations.title')}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            {t('reservations.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setCreateOpen(true); }}
          className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/20"
        >
          <Plus className="w-4 h-4" />
          {t('reservations.new')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('reservations.search_placeholder')}
          className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 shadow-sm backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
                <TableHead className="font-semibold">{t('reservations.table.room')}</TableHead>
                <TableHead className="font-semibold">{t('reservations.table.guest')}</TableHead>
                <TableHead className="font-semibold">{t('reservations.table.phone')}</TableHead>
                <TableHead className="font-semibold">{t('reservations.table.guests_count')}</TableHead>
                <TableHead className="font-semibold">{t('reservations.table.checkin')}</TableHead>
                <TableHead className="font-semibold">{t('reservations.table.checkout')}</TableHead>
                <TableHead className="font-semibold">{t('reservations.table.status')}</TableHead>
                <TableHead className="font-semibold text-right">{t('reservations.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
                  </TableCell>
                </TableRow>
              ) : filteredReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-zinc-400">
                    {t('reservations.no_reservations')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReservations.map((res: any) => (
                  <TableRow key={res._id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors">
                    <TableCell>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        #{res.room?.roomNumber}
                      </span>
                      <p className="text-xs text-zinc-400">{String(t(`roomType.${res.room?.type}`, res.room?.type))}</p>
                    </TableCell>
                    <TableCell className="font-medium text-zinc-800 dark:text-zinc-200">{res.guestName}</TableCell>
                    <TableCell className="text-zinc-500 text-sm">{res.guestPhone}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        <Users className="w-3.5 h-3.5 text-violet-500" />
                        {res.numberOfGuests} kishi
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(res.checkInDate).toLocaleDateString('uz-UZ')}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(res.checkOutDate).toLocaleDateString('uz-UZ')}
                      <p className="text-xs text-zinc-400">{res.numberOfNights} kun</p>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[res.status] || ''}`}>
                        {STATUS_LABELS(t)[res.status] || res.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {res.status === 'pending' && (
                          <button
                            onClick={() => confirmMutation.mutate(res._id)}
                            disabled={confirmMutation.isPending}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors"
                            title="Tasdiqlash"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(res.status === 'pending' || res.status === 'confirmed') && (
                          <button
                            onClick={() => { if (window.confirm(t('reservations.confirm_cancel', { name: res.guestName }))) cancelMutation.mutate(res._id); }}
                            disabled={cancelMutation.isPending}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors"
                            title={t('reservations.actions.cancel')}
                          >
                            <BanIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => { if (window.confirm(t('reservations.confirm_delete'))) deleteMutation.mutate(res._id); }}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-zinc-200 dark:border-zinc-700 transition-colors"
                          title={t('reservations.actions.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-[540px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-violet-500" />
              {t('reservations.form.title')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
              </div>
            )}

            {/* Xona tanlash */}
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-violet-500" />
                {t('reservations.form.select_room')} *
              </Label>
              <Select value={form.roomId} onValueChange={v => setForm(f => ({ ...f, roomId: v, numberOfGuests: 1 }))}>
                <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800">
                  <SelectValue placeholder={loadingRooms ? t('common.loading') : t('reservations.form.select_room_placeholder')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 max-h-[200px]">
                  {availableRooms.map((room: any) => (
                    <SelectItem key={room._id} value={room._id} className="text-zinc-900 dark:text-zinc-100">
                      #{room.roomNumber} — {String(t(`roomType.${room.type}`, room.type))} ({room.pricePerNight?.toLocaleString()} UZS) · {room.capacity} {t('checkin.members_count', 'joy')}
                    </SelectItem>
                  ))}
                  {availableRooms.length === 0 && (
                    <div className="px-3 py-2 text-sm text-zinc-400">{t('reservations.form.no_rooms')}</div>
                  )}
                </SelectContent>
              </Select>
              {selectedRoom && (
                <p className="text-xs text-violet-600 dark:text-violet-400">
                  {t('reservations.form.capacity_info', { capacity: selectedRoom.capacity, price: selectedRoom.pricePerNight?.toLocaleString() })}
                </p>
              )}
            </div>

            {/* Mehmon ismi */}
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('reservations.form.guest_name')} *</Label>
              <Input
                value={form.guestName}
                onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
                placeholder={t('reservations.form.guest_name_placeholder')}
                className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
              />
            </div>

            {/* Telefon */}
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {t('reservations.form.phone')} *
              </Label>
              <Input
                value={form.guestPhone}
                onChange={e => setForm(f => ({ ...f, guestPhone: e.target.value }))}
                placeholder={t('reservations.form.phone_placeholder')}
                className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
              />
            </div>

            {/* Kishilar soni */}
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-violet-500" />
                {t('reservations.form.guests_count')} *
              </Label>
              <Input
                type="text"
                value={form.numberOfGuests}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setForm(f => ({ ...f, numberOfGuests: val === '' ? '' : Number(val) }));
                }}
                className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
              />
              {selectedRoom && (
                <p className="text-xs text-zinc-400">{t('reservations.form.max_guests', { count: selectedRoom.capacity })}</p>
              )}
            </div>

            {/* Sanalar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-700 dark:text-zinc-300">{t('reservations.form.checkin_date')} *</Label>
                <Input
                  type="text"
                  placeholder={today}
                  value={form.checkInDate}
                  onChange={e => setForm(f => ({ ...f, checkInDate: e.target.value }))}
                  className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700 dark:text-zinc-300">{t('reservations.form.checkout_date')} *</Label>
                <Input
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={form.checkOutDate}
                  onChange={e => setForm(f => ({ ...f, checkOutDate: e.target.value }))}
                  className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                />
              </div>
            </div>

            {/* Izoh */}
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <NotebookText className="w-3.5 h-3.5" />
                {t('reservations.form.notes')}
              </Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={t('reservations.form.notes_placeholder')}
                className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
              <X className="w-4 h-4" /> {t('reservations.form.cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
              {t('reservations.form.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
