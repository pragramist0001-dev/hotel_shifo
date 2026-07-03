export const printHtml = (htmlContent: string) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Chek</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
          body {
            font-family: 'Space Mono', monospace;
            padding: 20px;
            margin: 0;
            width: 80mm;
            color: #000;
          }
          .receipt-container { width: 100%; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; }
          .header p { margin: 2px 0; font-size: 12px; }
          .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
          .row span { max-width: 50%; word-break: break-all; }
          .row span:last-child { text-align: right; }
          .row.bold { font-weight: bold; font-size: 14px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          @media print {
            body { padding: 0; width: 100%; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          setTimeout(function() {
            window.print();
            window.close();
          }, 300);
        <\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export interface ReceiptData {
  bookingId?: string;
  guestName: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  paidAmount: number;
  paymentAmount?: number;
  paymentMethod: string;
  cashierName: string;
  date: string;
}

export const generateReceiptHtml = (data: ReceiptData): string => {
  const isSpecificPayment = data.paymentAmount !== undefined;
  const debt = Math.max(0, data.totalPrice - data.paidAmount);

  const idRow = data.bookingId
    ? `<div class="row"><span>ID:</span><span>${data.bookingId.slice(-6)}</span></div>`
    : '';

  const paymentNowRow = isSpecificPayment
    ? `<div class="row bold" style="margin-top: 10px;"><span>To'landi (hozir):</span><span>${(data.paymentAmount ?? 0).toLocaleString()} UZS</span></div>`
    : '';

  return `
    <div class="receipt-container">
      <div class="header">
        <img src="${window.location.origin}/logo.jpg" alt="Logo" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 5px; border-radius: 8px;" />
        <h2 style="margin-top: 0;">Sanatory CRM</h2>
        <p>To'lov kvitansiyasi</p>
      </div>

      <div class="divider"></div>

      <div class="row"><span>Sana:</span><span>${data.date}</span></div>
      ${idRow}
      <div class="row"><span>Xodim:</span><span>${data.cashierName}</span></div>

      <div class="divider"></div>

      <div class="row"><span>Mijoz:</span><span>${data.guestName}</span></div>
      <div class="row"><span>Xona:</span><span>${data.roomNumber}</span></div>
      <div class="row"><span>Kelish:</span><span>${data.checkInDate}</span></div>
      <div class="row"><span>Ketish:</span><span>${data.checkOutDate}</span></div>

      <div class="divider"></div>

      <div class="row"><span>Jami summa:</span><span>${data.totalPrice.toLocaleString()} UZS</span></div>
      ${paymentNowRow}
      <div class="row bold" style="margin-top: 10px;">
        <span>Jami to'langan:</span>
        <span>${data.paidAmount.toLocaleString()} UZS</span>
      </div>
      <div class="row"><span>To'lov usuli:</span><span>${data.paymentMethod.toUpperCase()}</span></div>

      <div class="divider"></div>

      <div class="row bold">
        <span>Qolgan qarz:</span>
        <span>${debt.toLocaleString()} UZS</span>
      </div>

      <div class="footer">
        <p>Tashrifingiz uchun rahmat!</p>
        <p>Qayta kelishingizni kutib qolamiz.</p>
      </div>
    </div>
  `;
};

export const handlePrintReceipt = (data: ReceiptData) => {
  const html = generateReceiptHtml(data);
  printHtml(html);
};
