/**
 * PDF Generator Utility
 * Generates premium PDF documents from HTML using Puppeteer
 */

const puppeteer = require('puppeteer');

// Cache browser instance for performance
let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    });
  }
  return browserInstance;
}

/**
 * Generate PDF from HTML content
 * @param {string} html - HTML content to convert
 * @param {object} options - PDF options
 * @returns {Buffer} PDF buffer
 */
async function generatePDF(html, options = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 9px; width: 100%; text-align: center; color: #666; padding: 5px 0;">
          <span class="title"></span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 9px; width: 100%; display: flex; justify-content: space-between; padding: 5px 15mm; color: #666; border-top: 1px solid #eee;">
          <span>Document généré le ${new Date().toLocaleDateString('fr-FR')}</span>
          <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>
      `,
      ...options
    });
    
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

/**
 * Generate premium invoice HTML
 */
function generateInvoiceHTML(invoice, clinic, payments, options = {}) {
  const paidTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount_mga || 0), 0);
  const balance = parseFloat(invoice.total_mga) - paidTotal;
  
  const formatCurrency = (amount) => new Intl.NumberFormat('fr-MG').format(amount) + ' Ar';
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('fr-FR') : '-';
  
  const paymentMethodLabels = {
    'CASH': 'Espèces', 'CHEQUE': 'Chèque', 'CARD': 'Carte bancaire',
    'MVOLA': 'MVola', 'ORANGE_MONEY': 'Orange Money', 'AIRTEL_MONEY': 'Airtel Money',
    'BANK_TRANSFER': 'Virement bancaire'
  };
  
  const statusConfig = {
    'PAID': { label: 'PAYÉE', bg: '#dcfce7', color: '#166534' },
    'PARTIAL': { label: 'PARTIEL', bg: '#fef3c7', color: '#92400e' },
    'DRAFT': { label: 'BROUILLON', bg: '#f3f4f6', color: '#374151' },
    'SENT': { label: 'ENVOYÉE', bg: '#dbeafe', color: '#1e40af' },
    'OVERDUE': { label: 'EN RETARD', bg: '#fee2e2', color: '#991b1b' }
  };
  
  const status = statusConfig[invoice.status] || statusConfig['DRAFT'];

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoice.invoice_number}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; 
      font-size: 11px; 
      line-height: 1.5; 
      color: #1f2937;
      background: white;
    }
    .container { padding: 0; max-width: 210mm; margin: 0 auto; }
    
    /* Header Premium */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 25px;
      margin-bottom: 25px;
      border-bottom: 3px solid #2563eb;
    }
    .clinic-info { max-width: 55%; }
    .clinic-logo {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 12px;
    }
    .clinic-name { font-size: 22px; font-weight: 700; color: #1e3a8a; margin-bottom: 8px; }
    .clinic-details { color: #6b7280; font-size: 10px; line-height: 1.6; }
    .clinic-details p { margin: 2px 0; }
    .clinic-legal { margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #9ca3af; }
    
    /* Document Badge */
    .doc-meta { text-align: right; }
    .doc-badge {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      padding: 8px 24px;
      border-radius: 8px;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .doc-number { font-size: 18px; font-weight: 600; color: #1e3a8a; margin-bottom: 8px; }
    .doc-date { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
    .doc-status {
      display: inline-block;
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 8px;
      background: ${status.bg};
      color: ${status.color};
    }
    
    /* Patient Block */
    .patient-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .patient-title { 
      font-size: 12px; 
      font-weight: 600; 
      color: #2563eb; 
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .patient-name { font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 6px; }
    .patient-details { color: #6b7280; font-size: 10px; }
    .patient-details span { display: inline-block; margin-right: 20px; }
    
    /* Table Premium */
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    .items-table thead th {
      background: linear-gradient(135deg, #1e3a8a, #2563eb);
      color: white;
      padding: 12px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table thead th:first-child { border-radius: 8px 0 0 0; }
    .items-table thead th:last-child { border-radius: 0 8px 0 0; text-align: right; }
    .items-table tbody td {
      padding: 12px 10px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
    }
    .items-table tbody tr:nth-child(even) { background: #f8fafc; }
    .items-table tbody tr:hover { background: #f1f5f9; }
    .items-table .code { font-family: monospace; font-weight: 500; color: #2563eb; }
    .items-table .amount { text-align: right; font-weight: 500; }
    .items-table .qty { text-align: center; }
    
    /* Totals Premium */
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 25px; }
    .totals-box { 
      width: 280px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .totals-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 10px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
    }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.subtotal { color: #6b7280; }
    .totals-row.discount { color: #dc2626; }
    .totals-row.total { 
      background: linear-gradient(135deg, #1e3a8a, #2563eb);
      color: white;
      font-size: 14px;
      font-weight: 700;
      padding: 14px 16px;
    }
    .totals-row.paid { color: #059669; font-weight: 500; }
    .totals-row.balance { 
      background: ${balance > 0 ? '#fef3c7' : '#dcfce7'};
      color: ${balance > 0 ? '#92400e' : '#166534'};
      font-weight: 600;
    }
    
    /* Payments Section */
    .payments-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .payments-title { 
      font-size: 12px; 
      font-weight: 600; 
      color: #2563eb; 
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .payment-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: white;
      border-radius: 8px;
      margin-bottom: 8px;
      border: 1px solid #e5e7eb;
    }
    .payment-item:last-child { margin-bottom: 0; }
    .payment-method { font-weight: 500; color: #1f2937; }
    .payment-ref { font-size: 10px; color: #9ca3af; }
    .payment-date { font-size: 10px; color: #6b7280; }
    .payment-amount { font-weight: 600; color: #059669; }
    
    /* Footer Premium */
    .footer-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }
    .footer-conditions {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .footer-conditions h4 { 
      font-size: 11px; 
      font-weight: 600; 
      color: #374151; 
      margin-bottom: 8px; 
    }
    .footer-conditions p { font-size: 10px; color: #6b7280; margin-bottom: 4px; }
    .footer-signature {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
    }
    .signature-box {
      width: 200px;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #9ca3af;
      margin-top: 60px;
      padding-top: 8px;
      font-size: 10px;
      color: #6b7280;
    }
    .footer-thanks {
      text-align: center;
      padding: 20px;
      color: #2563eb;
      font-size: 13px;
      font-weight: 500;
    }
    .footer-legal {
      text-align: center;
      font-size: 9px;
      color: #9ca3af;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="clinic-info">
        <div class="clinic-logo">${(clinic?.name || 'CD').substring(0, 2).toUpperCase()}</div>
        <div class="clinic-name">${clinic?.name || 'Cabinet Dentaire'}</div>
        <div class="clinic-details">
          ${clinic?.address ? `<p>📍 ${clinic.address}</p>` : ''}
          ${clinic?.phone ? `<p>📞 ${clinic.phone}</p>` : ''}
          ${clinic?.email ? `<p>✉️ ${clinic.email}</p>` : ''}
        </div>
        ${(invoice.clinic_nif || invoice.clinic_stat) ? `
        <div class="clinic-legal">
          ${invoice.clinic_nif ? `NIF: ${invoice.clinic_nif}` : ''} 
          ${invoice.clinic_stat ? `| STAT: ${invoice.clinic_stat}` : ''}
        </div>
        ` : ''}
      </div>
      <div class="doc-meta">
        <div class="doc-badge">FACTURE</div>
        <div class="doc-number">${invoice.invoice_number}</div>
        <div class="doc-date">Date: ${formatDate(invoice.invoice_date)}</div>
        ${invoice.due_date ? `<div class="doc-date">Échéance: ${formatDate(invoice.due_date)}</div>` : ''}
        <div class="doc-status">${status.label}</div>
      </div>
    </div>
    
    <!-- Patient -->
    <div class="patient-block">
      <div class="patient-title">👤 Patient</div>
      <div class="patient-name">${invoice.patient?.first_name || ''} ${invoice.patient?.last_name || ''}</div>
      <div class="patient-details">
        ${invoice.patient?.phone_primary ? `<span>📞 ${invoice.patient.phone_primary}</span>` : ''}
        ${invoice.patient?.email ? `<span>✉️ ${invoice.patient.email}</span>` : ''}
      </div>
    </div>
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 15%">Code</th>
          <th style="width: 45%">Désignation</th>
          <th class="qty" style="width: 10%">Qté</th>
          <th class="amount" style="width: 15%">P.U. (Ar)</th>
          <th class="amount" style="width: 15%">Total (Ar)</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((item, i) => `
          <tr>
            <td class="code">${item.procedure_code || `#${i + 1}`}</td>
            <td>${item.description}${item.tooth_number ? ` <small>(Dent ${item.tooth_number})</small>` : ''}</td>
            <td class="qty">${item.quantity}</td>
            <td class="amount">${formatCurrency(item.unit_price_mga)}</td>
            <td class="amount">${formatCurrency(item.total_price_mga)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Totals -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row subtotal">
          <span>Sous-total</span>
          <span>${formatCurrency(invoice.subtotal_mga)}</span>
        </div>
        ${parseFloat(invoice.discount_percentage || 0) > 0 ? `
        <div class="totals-row discount">
          <span>Remise (${invoice.discount_percentage}%)</span>
          <span>-${formatCurrency(invoice.discount_amount_mga)}</span>
        </div>
        ` : ''}
        <div class="totals-row total">
          <span>TOTAL</span>
          <span>${formatCurrency(invoice.total_mga)}</span>
        </div>
        <div class="totals-row paid">
          <span>Payé</span>
          <span>${formatCurrency(paidTotal)}</span>
        </div>
        <div class="totals-row balance">
          <span>Reste à payer</span>
          <span>${formatCurrency(balance)}</span>
        </div>
      </div>
    </div>
    
    <!-- Payments -->
    ${payments.length > 0 ? `
    <div class="payments-section">
      <div class="payments-title">💳 Historique des paiements</div>
      ${payments.map(p => `
        <div class="payment-item">
          <div>
            <div class="payment-method">${paymentMethodLabels[p.payment_method] || p.payment_method}</div>
            ${p.reference_number ? `<div class="payment-ref">Réf: ${p.reference_number}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <div class="payment-amount">+${formatCurrency(p.amount_mga)}</div>
            <div class="payment-date">${formatDate(p.payment_date)}</div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer-section">
      <div class="footer-conditions">
        <h4>Conditions de paiement</h4>
        <p>${invoice.payment_terms || 'Paiement dû à réception de la facture.'}</p>
        <p>Modes de paiement acceptés: Espèces, Chèque, Carte bancaire, MVola, Orange Money, Airtel Money</p>
      </div>
      
      <div class="footer-signature">
        <div class="signature-box">
          <div class="signature-line">Signature du patient</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">Cachet et signature</div>
        </div>
      </div>
      
      <div class="footer-thanks">Merci pour votre confiance ! 🦷</div>
      
      <div class="footer-legal">
        ${clinic?.name || 'Cabinet Dentaire'} - ${clinic?.address || ''} - ${clinic?.phone || ''}
        ${invoice.clinic_nif ? ` | NIF: ${invoice.clinic_nif}` : ''}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate premium quote HTML
 */
function generateQuoteHTML(quote, clinic, options = {}) {
  const formatCurrency = (amount) => new Intl.NumberFormat('fr-MG').format(amount) + ' Ar';
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('fr-FR') : '-';
  
  // Calculate expiry date
  const expiryDate = new Date(quote.invoice_date);
  expiryDate.setDate(expiryDate.getDate() + (quote.validity_days || 30));
  const isExpired = new Date() > expiryDate && !['ACCEPTED', 'CONVERTED'].includes(quote.status);
  
  const statusConfig = {
    'DRAFT': { label: 'BROUILLON', bg: '#f3f4f6', color: '#374151' },
    'SENT': { label: 'ENVOYÉ', bg: '#dbeafe', color: '#1e40af' },
    'ACCEPTED': { label: 'ACCEPTÉ', bg: '#dcfce7', color: '#166534' },
    'REJECTED': { label: 'REFUSÉ', bg: '#fee2e2', color: '#991b1b' },
    'EXPIRED': { label: 'EXPIRÉ', bg: '#fef3c7', color: '#92400e' },
    'CONVERTED': { label: 'CONVERTI', bg: '#e0e7ff', color: '#4338ca' }
  };
  
  const status = statusConfig[quote.status] || statusConfig['DRAFT'];

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devis ${quote.invoice_number}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; 
      font-size: 11px; 
      line-height: 1.5; 
      color: #1f2937;
      background: white;
    }
    .container { padding: 0; max-width: 210mm; margin: 0 auto; }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 120px;
      font-weight: bold;
      color: rgba(5, 150, 105, 0.06);
      pointer-events: none;
      z-index: 0;
      letter-spacing: 10px;
    }
    
    /* Header Premium - Green theme for quotes */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 25px;
      margin-bottom: 25px;
      border-bottom: 3px solid #059669;
      position: relative;
      z-index: 1;
    }
    .clinic-info { max-width: 55%; }
    .clinic-logo {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #059669, #047857);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 12px;
    }
    .clinic-name { font-size: 22px; font-weight: 700; color: #065f46; margin-bottom: 8px; }
    .clinic-details { color: #6b7280; font-size: 10px; line-height: 1.6; }
    .clinic-details p { margin: 2px 0; }
    
    /* Document Badge - Green */
    .doc-meta { text-align: right; }
    .doc-badge {
      display: inline-block;
      background: linear-gradient(135deg, #059669, #047857);
      color: white;
      padding: 8px 24px;
      border-radius: 8px;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .doc-number { font-size: 18px; font-weight: 600; color: #065f46; margin-bottom: 8px; }
    .doc-date { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
    .doc-status {
      display: inline-block;
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 8px;
      background: ${status.bg};
      color: ${status.color};
    }
    .validity-badge {
      display: block;
      margin-top: 10px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 10px;
      background: ${isExpired ? '#fee2e2' : '#dcfce7'};
      color: ${isExpired ? '#991b1b' : '#166534'};
    }
    
    /* Patient Block */
    .patient-block {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 25px;
      position: relative;
      z-index: 1;
    }
    .patient-title { 
      font-size: 12px; 
      font-weight: 600; 
      color: #059669; 
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .patient-name { font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 6px; }
    .patient-details { color: #6b7280; font-size: 10px; }
    
    /* Table Premium - Green */
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; position: relative; z-index: 1; }
    .items-table thead th {
      background: linear-gradient(135deg, #065f46, #059669);
      color: white;
      padding: 12px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table thead th:first-child { border-radius: 8px 0 0 0; }
    .items-table thead th:last-child { border-radius: 0 8px 0 0; text-align: right; }
    .items-table tbody td {
      padding: 12px 10px;
      border-bottom: 1px solid #d1fae5;
      font-size: 11px;
    }
    .items-table tbody tr:nth-child(even) { background: #f0fdf4; }
    .items-table .code { font-family: monospace; font-weight: 500; color: #059669; }
    .items-table .amount { text-align: right; font-weight: 500; }
    .items-table .qty { text-align: center; }
    
    /* Totals Premium - Green */
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 25px; position: relative; z-index: 1; }
    .totals-box { 
      width: 280px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      overflow: hidden;
    }
    .totals-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 10px 16px;
      border-bottom: 1px solid #bbf7d0;
      font-size: 11px;
    }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.subtotal { color: #6b7280; }
    .totals-row.discount { color: #dc2626; }
    .totals-row.total { 
      background: linear-gradient(135deg, #065f46, #059669);
      color: white;
      font-size: 14px;
      font-weight: 700;
      padding: 14px 16px;
    }
    
    /* Footer Premium */
    .footer-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #d1fae5;
      position: relative;
      z-index: 1;
    }
    .footer-conditions {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .footer-conditions h4 { 
      font-size: 11px; 
      font-weight: 600; 
      color: #065f46; 
      margin-bottom: 8px; 
    }
    .footer-conditions p { font-size: 10px; color: #6b7280; margin-bottom: 4px; }
    .footer-signature {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
    }
    .signature-box {
      width: 200px;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #9ca3af;
      margin-top: 60px;
      padding-top: 8px;
      font-size: 10px;
      color: #6b7280;
    }
    .footer-thanks {
      text-align: center;
      padding: 20px;
      color: #059669;
      font-size: 13px;
      font-weight: 500;
    }
    .footer-legal {
      text-align: center;
      font-size: 9px;
      color: #9ca3af;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="watermark">DEVIS</div>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="clinic-info">
        <div class="clinic-logo">${(clinic?.name || 'CD').substring(0, 2).toUpperCase()}</div>
        <div class="clinic-name">${clinic?.name || 'Cabinet Dentaire'}</div>
        <div class="clinic-details">
          ${clinic?.address ? `<p>📍 ${clinic.address}</p>` : ''}
          ${clinic?.phone ? `<p>📞 ${clinic.phone}</p>` : ''}
          ${clinic?.email ? `<p>✉️ ${clinic.email}</p>` : ''}
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-badge">DEVIS</div>
        <div class="doc-number">${quote.invoice_number}</div>
        <div class="doc-date">Date: ${formatDate(quote.invoice_date)}</div>
        <div class="doc-status">${status.label}</div>
        <div class="validity-badge">
          ⏱️ Valable ${quote.validity_days || 30} jours
          <br>Expire le: ${formatDate(expiryDate)}
          ${isExpired ? '<br><strong>⚠️ EXPIRÉ</strong>' : ''}
        </div>
      </div>
    </div>
    
    <!-- Patient -->
    <div class="patient-block">
      <div class="patient-title">👤 Patient</div>
      <div class="patient-name">${quote.patient?.first_name || ''} ${quote.patient?.last_name || ''}</div>
      <div class="patient-details">
        ${quote.patient?.phone_primary ? `<span>📞 ${quote.patient.phone_primary}</span>` : ''}
        ${quote.patient?.email ? `<span>✉️ ${quote.patient.email}</span>` : ''}
      </div>
    </div>
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 15%">Code</th>
          <th style="width: 45%">Désignation</th>
          <th class="qty" style="width: 10%">Qté</th>
          <th class="amount" style="width: 15%">P.U. (Ar)</th>
          <th class="amount" style="width: 15%">Total (Ar)</th>
        </tr>
      </thead>
      <tbody>
        ${quote.items.map((item, i) => `
          <tr>
            <td class="code">${item.procedure_code || `#${i + 1}`}</td>
            <td>${item.description}${item.tooth_number ? ` <small>(Dent ${item.tooth_number})</small>` : ''}</td>
            <td class="qty">${item.quantity}</td>
            <td class="amount">${formatCurrency(item.unit_price_mga)}</td>
            <td class="amount">${formatCurrency(item.total_price_mga)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Totals -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row subtotal">
          <span>Sous-total</span>
          <span>${formatCurrency(quote.subtotal_mga)}</span>
        </div>
        ${parseFloat(quote.discount_percentage || 0) > 0 ? `
        <div class="totals-row discount">
          <span>Remise (${quote.discount_percentage}%)</span>
          <span>-${formatCurrency(quote.discount_amount_mga)}</span>
        </div>
        ` : ''}
        <div class="totals-row total">
          <span>TOTAL</span>
          <span>${formatCurrency(quote.total_mga)}</span>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer-section">
      <div class="footer-conditions">
        <h4>📋 Conditions du devis</h4>
        <p>Ce devis est valable <strong>${quote.validity_days || 30} jours</strong> à compter de sa date d'émission.</p>
        <p>Les prix sont exprimés en Ariary malgache (MGA) et incluent toutes les prestations mentionnées.</p>
        <p>Ce devis ne constitue pas une facture. Un accord écrit est nécessaire pour valider les soins.</p>
      </div>
      
      <div class="footer-signature">
        <div class="signature-box">
          <div class="signature-line">Signature du patient<br>(Bon pour accord)</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">Cachet et signature<br>du praticien</div>
        </div>
      </div>
      
      <div class="footer-thanks">Merci pour votre confiance ! 🦷</div>
      
      <div class="footer-legal">
        ${clinic?.name || 'Cabinet Dentaire'} - ${clinic?.address || ''} - ${clinic?.phone || ''}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// Cleanup on process exit
process.on('exit', async () => {
  if (browserInstance) {
    await browserInstance.close();
  }
});

module.exports = {
  generatePDF,
  generateInvoiceHTML,
  generateQuoteHTML
};
