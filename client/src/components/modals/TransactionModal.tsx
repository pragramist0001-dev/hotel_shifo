import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTransaction, useUpdateTransaction } from '../../hooks/useTransactions';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TransactionModal({ isOpen, onClose, editData }: { isOpen: boolean; onClose: () => void; editData?: any }) {
  const { t } = useTranslation();
  const { mutateAsync: createTx, isPending: isCreating } = useCreateTransaction();
  const { mutateAsync: updateTx, isPending: isUpdating } = useUpdateTransaction();
  const [formData, setFormData] = useState({
    type: 'expense',
    category: 'salary',
    amount: '',
    description: '',
    paymentMethod: 'cash',
  });

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData({
          type: editData.type,
          category: editData.category,
          amount: editData.amount.toString(),
          description: editData.description,
          paymentMethod: editData.paymentMethod || 'cash',
        });
      } else {
        setFormData({ type: 'expense', category: 'salary', amount: '', description: '', paymentMethod: 'cash' });
      }
    }
  }, [isOpen, editData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editData) {
        await updateTx({ id: editData._id, data: { ...formData, amount: Number(formData.amount) } });
      } else {
        await createTx({ ...formData, amount: Number(formData.amount) });
      }
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 w-[95vw] max-w-md max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-zinc-100">{editData ? t('finance.edit_tx', 'Tranzaksiyani Tahrirlash') : t('finance.new_tx', 'Yangi Tranzaksiya')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('finance.type', 'Turi')}</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <SelectValue placeholder={t('common.select', 'Tanlang')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                  <SelectItem value="income">{t('finance.income', 'Kirim')}</SelectItem>
                  <SelectItem value="expense">{t('finance.expense', 'Chiqim')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('finance.amount', 'Summa (UZS)')}</Label>
              <Input 
                type="text"
                inputMode="numeric"
                required 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
                placeholder={t('finance.amount_placeholder', 'Masalan: 150000')}
                className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('finance.category', 'Kategoriya')}</Label>
              <Input 
                required 
                placeholder={t('finance.category_placeholder', 'Masalan: Maosh, Oziq-ovqat')}
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})} 
                className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('finance.payment_method', "To'lov usuli")}</Label>
              <Select value={formData.paymentMethod} onValueChange={(val) => setFormData({...formData, paymentMethod: val})}>
                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <SelectValue placeholder={t('common.select', 'Tanlang')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                  <SelectItem value="cash">{t('reception.cash', 'Naqd')}</SelectItem>
                  <SelectItem value="card">{t('reception.card', 'Karta')}</SelectItem>
                  <SelectItem value="transfer">{t('reception.transfer', "Pul o'tkazma")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-700 dark:text-zinc-300">{t('finance.description', 'Tavsif')}</Label>
            <Input 
              required 
              placeholder={t('finance.desc_placeholder', 'Nima uchun?')}
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
              {t('common.cancel', 'Bekor qilish')}
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
              {(isCreating || isUpdating) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editData ? t('common.save', 'Saqlash') : t('common.add', "Qo'shish")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
