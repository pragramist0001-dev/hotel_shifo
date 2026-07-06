import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddPayment } from '../../hooks/useBookings';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function BookingPaymentModal({
  isOpen,
  onClose,
  booking
}: {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
}) {
  const { t } = useTranslation();
  const { mutateAsync: addPayment, isPending } = useAddPayment();

  const debt = booking ? Math.max(0, booking.totalPrice - booking.paidAmount) : 0;

  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'cash',
  });

  useEffect(() => {
    if (isOpen && booking) {
      setFormData({
        amount: debt > 0 ? debt.toString() : '',
        paymentMethod: 'cash'
      });
    }
  }, [isOpen, booking, debt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    try {
      await addPayment({
        id: booking._id,
        data: {
          amount: Number(formData.amount),
          paymentMethod: formData.paymentMethod,
        }
      });
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-zinc-100">
            {t('finance.payment', "To'lov qilish")}
          </DialogTitle>
        </DialogHeader>

        {booking && (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 mb-4 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-zinc-500">{t('finance.table.client', 'Mijoz')}:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{booking.guestDetails?.fullName}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-500">{t('checkin.calc_total', 'Jami summa')}:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{booking.totalPrice?.toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-500">{t('finance.table.paid', "To'langan")}:</span>
                <span className="font-medium text-emerald-600">{booking.paidAmount?.toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between font-bold border-t border-zinc-200 dark:border-zinc-700 pt-1 mt-1">
                <span className="text-zinc-700 dark:text-zinc-300">Qolgan qarz:</span>
                <span className={debt > 0 ? "text-red-500" : "text-emerald-500"}>{debt.toLocaleString()} UZS</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-zinc-700 dark:text-zinc-300">{t('finance.table.amount', "Summa")}</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                placeholder="Summani kiriting"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('checkin.payment_method', "To'lov usuli")}</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
              >
                <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <SelectItem value="cash">{t('checkin.pay_cash', 'Naqd')}</SelectItem>
                  <SelectItem value="terminal">{t('checkin.pay_card', 'Terminal (Karta)')}</SelectItem>
                  <SelectItem value="click">{t('checkin.pay_click', 'Click/Payme')}</SelectItem>
                  <SelectItem value="transfer">{t('checkin.pay_transfer', "O'tkazma")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                {t('common.cancel', 'Bekor qilish')}
              </Button>
              <Button type="submit" disabled={isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('finance.save', 'Saqlash')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
