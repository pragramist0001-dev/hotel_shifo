export const printAdminReport = (clientInfo: any, stats: any, bookings: any[]) => {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) return;

  const formatDate = (date: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('uz-UZ');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Faol';
      case 'checked_out': return 'Yakunlangan';
      case 'frozen': return 'Muzlatilgan';
      case 'cancelled': return 'Bekor qilingan';
      default: return status;
    }
  };

  const bookingsHtml = bookings.map((b, index) => {
    const debt = Math.max(0, b.totalPrice - b.paidAmount);
    let familyHtml = '';
    
    if (b.guestDetails.familyMembers && b.guestDetails.familyMembers.length > 0) {
      familyHtml = `
        <div class="family-section">
          <strong>Hamrohlar:</strong>
          <ul>
            ${b.guestDetails.familyMembers.map((m: any) => `<li>${m.fullName} (${m.relationship || 'Hamroh'})</li>`).join('')}
          </ul>
        </div>
      `;
    }

    return `
      <div class="booking-card">
        <div class="booking-header">
          <strong>${index + 1}. Xona: ${b.room?.roomNumber || '?'} (${b.room?.type || 'Nomaʼlum'})</strong>
          <span class="badge ${b.status}">${getStatusText(b.status)}</span>
        </div>
        <table class="details-table">
          <tr>
            <td><strong>Kelish sanasi:</strong> ${formatDate(b.checkInDate)}</td>
            <td><strong>Ketish sanasi:</strong> ${formatDate(b.checkOutDate)}</td>
          </tr>
          <tr>
            <td><strong>Jami narx:</strong> ${b.totalPrice?.toLocaleString()} UZS</td>
            <td><strong>To'langan:</strong> ${b.paidAmount?.toLocaleString()} UZS</td>
          </tr>
          <tr>
            <td><strong>Qarzdorlik:</strong> <span style="color: red;">${debt > 0 ? debt.toLocaleString() + ' UZS' : 'Yo\'q'}</span></td>
            <td><strong>To'lov turi:</strong> ${b.paymentMethod.toUpperCase()}</td>
          </tr>
        </table>
        ${familyHtml}
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>Mijoz Hisoboti - ${clientInfo.fullName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            margin: 0;
            color: #333;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 { margin: 0 0 10px 0; font-size: 24px; text-transform: uppercase; }
          .header p { margin: 0; color: #555; }
          
          .section-title {
            background-color: #f3f4f6;
            padding: 8px 12px;
            border-left: 4px solid #10b981;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            margin-top: 30px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          .info-item {
            font-size: 14px;
          }
          .info-item strong {
            display: inline-block;
            width: 140px;
            color: #555;
          }
          
          .stats-box {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            background-color: #f9fafb;
          }
          .stat-item {
            text-align: center;
          }
          .stat-value {
            font-size: 18px;
            font-weight: bold;
            color: #111;
            display: block;
            margin-top: 5px;
          }
          
          .booking-card {
            border: 1px solid #e5e7eb;
            margin-bottom: 20px;
            border-radius: 6px;
            overflow: hidden;
          }
          .booking-header {
            background-color: #f9fafb;
            padding: 10px 15px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .badge {
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
          }
          .badge.active { background-color: #d1fae5; color: #065f46; }
          .badge.checked_out { background-color: #f3f4f6; color: #374151; }
          .badge.frozen { background-color: #dbeafe; color: #1e40af; }
          
          .details-table {
            width: 100%;
            border-collapse: collapse;
          }
          .details-table td {
            padding: 10px 15px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 13px;
          }
          
          .family-section {
            padding: 10px 15px;
            background-color: #fffbeb;
            font-size: 13px;
          }
          .family-section ul {
            margin: 5px 0 0 0;
            padding-left: 20px;
          }
          
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #888;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          
          @media print {
            body { padding: 0; }
            .booking-card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Mijoz Bo'yicha Hisobot</h1>
          <p>Yaratilgan sana: ${new Date().toLocaleString('uz-UZ')}</p>
        </div>

        <div class="section-title">Shaxsiy ma'lumotlar</div>
        <div class="info-grid">
          <div class="info-item"><strong>F.I.SH:</strong> ${clientInfo.fullName}</div>
          <div class="info-item"><strong>Telefon:</strong> ${clientInfo.phone}</div>
          <div class="info-item"><strong>Tug'ilgan sana:</strong> ${formatDate(clientInfo.birthDate)}</div>
          <div class="info-item"><strong>Manzil:</strong> ${clientInfo.country || '—'}</div>
          <div class="info-item"><strong>Istoriya №:</strong> ${clientInfo.historyNumber || '—'}</div>
          <div class="info-item"><strong>Pasport:</strong> ${clientInfo.passportSeries || '—'}</div>
          <div class="info-item"><strong>Kasbi:</strong> ${clientInfo.profession || '—'}</div>
        </div>

        <div class="section-title">Moliya va Statistika</div>
        <div class="stats-box">
          <div class="stat-item">
            Jami tashriflar
            <span class="stat-value">${stats.totalVisits} ta</span>
          </div>
          <div class="stat-item">
            Jami to'lagan
            <span class="stat-value" style="color: #059669;">${stats.totalSpent?.toLocaleString()} UZS</span>
          </div>
          <div class="stat-item">
            Qarzdorlik
            <span class="stat-value" style="color: #dc2626;">${stats.totalDebt > 0 ? stats.totalDebt.toLocaleString() + ' UZS' : '0 UZS'}</span>
          </div>
        </div>

        <div class="section-title">Tashriflar Tarixi</div>
        ${bookingsHtml.length > 0 ? bookingsHtml : '<p>Tashriflar topilmadi.</p>'}

        <div class="footer">
          <p>Ushbu hisobot Sanatory CRM tizimidan avtomatik yaratildi.</p>
        </div>
        
        <script>
          setTimeout(function() {
            window.print();
          }, 500);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
