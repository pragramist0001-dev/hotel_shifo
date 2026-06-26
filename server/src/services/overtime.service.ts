/**
 * Overtime (kech check-out) to'lovini hisoblash servisi.
 *
 * Qoidalar:
 * - Standart check-out vaqti: 12:00
 * - Har bir qo'shimcha soat: kunlik narxning 10%
 * - 6 soatdan oshsa: to'liq 1 kunlik narx qo'shiladi
 */

export interface OvertimeResult {
  overtimeHours: number;
  overtimeCharge: number;
  isOvertime: boolean;
}

export const calculateOvertime = (
  checkOutDate: Date,
  actualCheckOutTime: Date,
  pricePerNight: number
): OvertimeResult => {
  const scheduledCheckout = new Date(checkOutDate);
  scheduledCheckout.setHours(12, 0, 0, 0); // Check-out vaqti 12:00

  const diffMs = actualCheckOutTime.getTime() - scheduledCheckout.getTime();

  if (diffMs <= 0) {
    return { overtimeHours: 0, overtimeCharge: 0, isOvertime: false };
  }

  const overtimeHours = Math.ceil(diffMs / (1000 * 60 * 60));

  let overtimeCharge: number;
  if (overtimeHours > 6) {
    // 6 soatdan oshsa, to'liq 1 kunlik narx
    overtimeCharge = pricePerNight;
  } else {
    // Har bir soat uchun 10%
    overtimeCharge = Math.round(pricePerNight * 0.1 * overtimeHours);
  }

  return { overtimeHours, overtimeCharge, isOvertime: true };
};
