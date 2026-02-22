/**
 * PDF Generator Utility using PDFKit
 * Generates premium PDF documents with logo and QR code
 */

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const https = require('https');
const http = require('http');

// Colors
const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1e3a8a',
  success: '#059669',
  successDark: '#065f46',
  warning: '#d97706',
  danger: '#dc2626',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  text: '#1f2937'
};

/**
 * Fetch image buffer from URL
 */
async function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve(null);
    
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        return resolve(null);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

/**
 * Generate QR code as buffer
 */
async function generateQRBuffer(data) {
  try {
    return await QRCode.toBuffer(data, { 
      width: 80, 
      margin: 1,
      color: { dark: '#1f2937', light: '#ffffff' }
    });
  } catch (e) {
    return null;
  }
}

/**
 * Generate premium invoice PDF with logo and QR code
 */
async function generateInvoicePDF(invoice, clinic, payments) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Facture ${invoice.invoice_number}`,
          Author: clinic?.name || 'Cabinet Dentaire'
        }
      });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      
      const paidTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount_mga || 0), 0);
      const balance = parseFloat(invoice.total_mga) - paidTotal;
      
      const formatCurrency = (amount) => new Intl.NumberFormat('fr-MG').format(amount) + ' Ar';
      const formatDate = (date) => date ? new Date(date).toLocaleDateString('fr-FR') : '-';
      
      const paymentMethodLabels = {
        'CASH': 'Espèces', 'CHEQUE': 'Chèque', 'CARD': 'Carte',
        'MVOLA': 'MVola', 'ORANGE_MONEY': 'Orange Money', 'AIRTEL_MONEY': 'Airtel Money',
        'BANK_TRANSFER': 'Virement'
      };
      
      // Fetch logo
      let logoBuffer = null;
      if (clinic?.logo_url) {
        logoBuffer = await fetchImageBuffer(clinic.logo_url);
      }
      
      // ===== HEADER =====
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, 45, { width: 55, height: 55 });
        } catch (e) {
          // Fallback to initials
          doc.save()
             .roundedRect(50, 50, 50, 50, 10)
             .fillColor(COLORS.primary)
             .fill();
          doc.fillColor('white')
             .fontSize(20)
             .font('Helvetica-Bold')
             .text((clinic?.name || 'CD').substring(0, 2).toUpperCase(), 50, 65, { width: 50, align: 'center' });
          doc.restore();
        }
      } else {
        doc.save()
           .roundedRect(50, 50, 50, 50, 10)
           .fillColor(COLORS.primary)
           .fill();
        doc.fillColor('white')
           .fontSize(20)
           .font('Helvetica-Bold')
           .text((clinic?.name || 'CD').substring(0, 2).toUpperCase(), 50, 65, { width: 50, align: 'center' });
        doc.restore();
      }
      
      // Clinic info
      doc.fillColor(COLORS.primaryDark)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text(clinic?.name || 'Cabinet Dentaire', 110, 55);
      
      doc.fillColor(COLORS.gray)
         .fontSize(9)
         .font('Helvetica');
      let yPos = 75;
      if (clinic?.address) { doc.text(clinic.address, 110, yPos); yPos += 12; }
      if (clinic?.phone) { doc.text(`Tél: ${clinic.phone}`, 110, yPos); yPos += 12; }
      if (clinic?.email) { doc.text(clinic.email, 110, yPos); yPos += 12; }
      
      if (clinic?.nif_number || clinic?.stat_number) {
        doc.fontSize(8).fillColor('#9ca3af');
        if (clinic?.nif_number) doc.text(`NIF: ${clinic.nif_number}`, 110, yPos);
        if (clinic?.stat_number) doc.text(`STAT: ${clinic.stat_number}`, 200, yPos);
      }
      
      // Document badge (right side)
      doc.save()
         .roundedRect(400, 50, 145, 35, 5)
         .fillColor(COLORS.primary)
         .fill();
      doc.fillColor('white')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('FACTURE', 400, 60, { width: 145, align: 'center' });
      doc.restore();
      
      // Invoice number & dates
      doc.fillColor(COLORS.primaryDark)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(invoice.invoice_number, 400, 95, { width: 145, align: 'center' });
      
      doc.fillColor(COLORS.gray)
         .fontSize(9)
         .font('Helvetica')
         .text(`Date: ${formatDate(invoice.invoice_date)}`, 400, 115, { width: 145, align: 'center' });
      
      if (invoice.due_date) {
        doc.text(`Échéance: ${formatDate(invoice.due_date)}`, 400, 127, { width: 145, align: 'center' });
      }
      
      // Status badge
      const statusColors = {
        'PAID': { bg: '#dcfce7', text: '#166534', label: 'PAYÉE' },
        'PARTIAL': { bg: '#fef3c7', text: '#92400e', label: 'PARTIEL' },
        'DRAFT': { bg: '#f3f4f6', text: '#374151', label: 'BROUILLON' },
        'SENT': { bg: '#dbeafe', text: '#1e40af', label: 'ENVOYÉE' }
      };
      const status = statusColors[invoice.status] || statusColors['DRAFT'];
      
      doc.save()
         .roundedRect(435, 140, 75, 18, 9)
         .fillColor(status.bg)
         .fill();
      doc.fillColor(status.text)
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(status.label, 435, 145, { width: 75, align: 'center' });
      doc.restore();
      
      // Separator line
      doc.moveTo(50, 175).lineTo(545, 175).strokeColor(COLORS.primary).lineWidth(2).stroke();
      
      // ===== PATIENT BLOCK =====
      doc.save()
         .roundedRect(50, 190, 495, 60, 8)
         .fillColor('#f8fafc')
         .fill()
         .strokeColor('#e2e8f0')
         .stroke();
      doc.restore();
      
      doc.fillColor(COLORS.primary)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('PATIENT', 65, 200);
      
      doc.fillColor(COLORS.text)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text(`${invoice.patient?.first_name || ''} ${invoice.patient?.last_name || ''}`, 65, 215);
      
      doc.fillColor(COLORS.gray)
         .fontSize(9)
         .font('Helvetica');
      let patientInfo = [];
      if (invoice.patient?.phone_primary) patientInfo.push(`Tél: ${invoice.patient.phone_primary}`);
      if (invoice.patient?.email) patientInfo.push(invoice.patient.email);
      doc.text(patientInfo.join('  •  '), 65, 232);
      
      // ===== ITEMS TABLE =====
      const tableTop = 270;
      const tableLeft = 50;
      const colWidths = [60, 235, 40, 80, 80];
      
      // Table header
      doc.save()
         .rect(tableLeft, tableTop, 495, 25)
         .fillColor(COLORS.primary)
         .fill();
      
      doc.fillColor('white')
         .fontSize(9)
         .font('Helvetica-Bold');
      doc.text('CODE', tableLeft + 10, tableTop + 8);
      doc.text('DÉSIGNATION', tableLeft + colWidths[0] + 10, tableTop + 8);
      doc.text('QTÉ', tableLeft + colWidths[0] + colWidths[1] + 10, tableTop + 8);
      doc.text('P.U. (Ar)', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 10, tableTop + 8);
      doc.text('TOTAL (Ar)', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 10, tableTop + 8);
      doc.restore();
      
      // Table rows
      let rowY = tableTop + 25;
      invoice.items.forEach((item, i) => {
        const rowHeight = 22;
        if (i % 2 === 0) {
          doc.save().rect(tableLeft, rowY, 495, rowHeight).fillColor('#f8fafc').fill();
          doc.restore();
        }
        doc.fillColor(COLORS.primary).fontSize(9).font('Helvetica-Bold')
           .text(item.procedure_code || `#${i + 1}`, tableLeft + 10, rowY + 6);
        doc.fillColor(COLORS.text).font('Helvetica')
           .text(item.description.substring(0, 40), tableLeft + colWidths[0] + 10, rowY + 6);
        doc.text(String(item.quantity), tableLeft + colWidths[0] + colWidths[1] + 15, rowY + 6);
        doc.text(formatCurrency(item.unit_price_mga), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 5, rowY + 6);
        doc.font('Helvetica-Bold')
           .text(formatCurrency(item.total_price_mga), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, rowY + 6);
        rowY += rowHeight;
      });
      
      doc.rect(tableLeft, tableTop, 495, rowY - tableTop).strokeColor('#e5e7eb').stroke();
      
      // ===== TOTALS BOX =====
      const totalsTop = rowY + 20;
      const totalsLeft = 330;
      const totalsWidth = 215;
      
      doc.save()
         .roundedRect(totalsLeft, totalsTop, totalsWidth, 100, 8)
         .fillColor('#f8fafc')
         .fill()
         .strokeColor('#e2e8f0')
         .stroke();
      doc.restore();
      
      let totalsY = totalsTop + 10;
      
      doc.fillColor(COLORS.gray).fontSize(10).font('Helvetica')
         .text('Sous-total', totalsLeft + 15, totalsY)
         .text(formatCurrency(invoice.subtotal_mga), totalsLeft + totalsWidth - 100, totalsY, { width: 85, align: 'right' });
      totalsY += 18;
      
      if (parseFloat(invoice.discount_percentage || 0) > 0) {
        doc.fillColor(COLORS.danger)
           .text(`Remise (${invoice.discount_percentage}%)`, totalsLeft + 15, totalsY)
           .text(`-${formatCurrency(invoice.discount_amount_mga)}`, totalsLeft + totalsWidth - 100, totalsY, { width: 85, align: 'right' });
        totalsY += 18;
      }
      
      doc.save()
         .rect(totalsLeft, totalsY - 2, totalsWidth, 24)
         .fillColor(COLORS.primary)
         .fill();
      doc.fillColor('white').fontSize(12).font('Helvetica-Bold')
         .text('TOTAL', totalsLeft + 15, totalsY + 4)
         .text(formatCurrency(invoice.total_mga), totalsLeft + totalsWidth - 100, totalsY + 4, { width: 85, align: 'right' });
      doc.restore();
      totalsY += 28;
      
      doc.fillColor(COLORS.success).fontSize(10).font('Helvetica')
         .text('Payé', totalsLeft + 15, totalsY)
         .text(formatCurrency(paidTotal), totalsLeft + totalsWidth - 100, totalsY, { width: 85, align: 'right' });
      totalsY += 18;
      
      doc.save()
         .rect(totalsLeft, totalsY - 2, totalsWidth, 20)
         .fillColor(balance > 0 ? '#fef3c7' : '#dcfce7')
         .fill();
      doc.fillColor(balance > 0 ? COLORS.warning : COLORS.success).font('Helvetica-Bold')
         .text('Reste à payer', totalsLeft + 15, totalsY + 2)
         .text(formatCurrency(balance), totalsLeft + totalsWidth - 100, totalsY + 2, { width: 85, align: 'right' });
      doc.restore();
      
      // ===== QR CODE PAYMENT (if balance > 0) =====
      if (balance > 0) {
        const qrData = [
          `FACTURE: ${invoice.invoice_number}`,
          `MONTANT: ${formatCurrency(balance)}`,
          `PATIENT: ${invoice.patient?.first_name || ''} ${invoice.patient?.last_name || ''}`,
          `CONTACT: ${clinic?.phone || ''}`,
          `PAIEMENT: MVola, Orange Money, Airtel Money, Espèces`
        ].join('\n');
        
        const qrBuffer = await generateQRBuffer(qrData);
        
        if (qrBuffer) {
          const qrTop = totalsTop;
          const qrLeft = 50;
          
          doc.save()
             .roundedRect(qrLeft, qrTop, 120, 100, 8)
             .fillColor('#f8fafc')
             .fill()
             .strokeColor('#e2e8f0')
             .stroke();
          doc.restore();
          
          doc.fillColor(COLORS.primary).fontSize(8).font('Helvetica-Bold')
             .text('QR PAIEMENT', qrLeft + 5, qrTop + 5, { width: 110, align: 'center' });
          
          try {
            doc.image(qrBuffer, qrLeft + 20, qrTop + 18, { width: 80, height: 80 });
          } catch (e) {}
        }
      }
      
      // ===== PAYMENTS SECTION =====
      if (payments.length > 0) {
        let paymentsY = totalsTop + 120;
        
        doc.fillColor(COLORS.primary).fontSize(10).font('Helvetica-Bold')
           .text('HISTORIQUE DES PAIEMENTS', 50, paymentsY);
        paymentsY += 20;
        
        payments.slice(0, 3).forEach(p => {
          doc.save()
             .roundedRect(50, paymentsY, 260, 25, 5)
             .fillColor('#f8fafc')
             .fill()
             .strokeColor('#e5e7eb')
             .stroke();
          doc.restore();
          
          doc.fillColor(COLORS.text).fontSize(9).font('Helvetica-Bold')
             .text(paymentMethodLabels[p.payment_method] || p.payment_method, 60, paymentsY + 5);
          
          doc.fillColor(COLORS.gray).font('Helvetica')
             .text(formatDate(p.payment_date), 60, paymentsY + 15);
          
          doc.fillColor(COLORS.success).font('Helvetica-Bold')
             .text(`+${formatCurrency(p.amount_mga)}`, 220, paymentsY + 8, { width: 80, align: 'right' });
          
          paymentsY += 30;
        });
      }
      
      // ===== FOOTER =====
      doc.save()
         .roundedRect(50, 680, 495, 50, 5)
         .fillColor('#f1f5f9')
         .fill();
      doc.restore();
      
      doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9)
         .text('Conditions de paiement', 60, 690);
      doc.font('Helvetica').fillColor(COLORS.gray).fontSize(8)
         .text(invoice.payment_terms || 'Paiement dû à réception de la facture.', 60, 703)
         .text('Modes acceptés: Espèces, Chèque, Carte, MVola, Orange Money, Airtel Money', 60, 715);
      
      doc.moveTo(60, 765).lineTo(180, 765).strokeColor(COLORS.gray).lineWidth(0.5).stroke();
      doc.fontSize(8).text('Signature patient', 60, 770, { width: 120, align: 'center' });
      
      doc.moveTo(380, 765).lineTo(530, 765).stroke();
      doc.text('Cachet et signature', 380, 770, { width: 150, align: 'center' });
      
      doc.fillColor(COLORS.primary).fontSize(11).font('Helvetica-Bold')
         .text('Merci pour votre confiance !', 50, 790, { width: 495, align: 'center' });
      
      doc.fillColor('#9ca3af').fontSize(8).font('Helvetica')
         .text(`${clinic?.name || ''} - ${clinic?.address || ''} - ${clinic?.phone || ''}`, 50, 805, { width: 495, align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate premium quote PDF with logo
 */
async function generateQuotePDF(quote, clinic) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Devis ${quote.invoice_number}`,
          Author: clinic?.name || 'Cabinet Dentaire'
        }
      });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      
      const formatCurrency = (amount) => new Intl.NumberFormat('fr-MG').format(amount) + ' Ar';
      const formatDate = (date) => date ? new Date(date).toLocaleDateString('fr-FR') : '-';
      
      const expiryDate = new Date(quote.invoice_date);
      expiryDate.setDate(expiryDate.getDate() + (quote.validity_days || 30));
      
      // Fetch logo
      let logoBuffer = null;
      if (clinic?.logo_url) {
        logoBuffer = await fetchImageBuffer(clinic.logo_url);
      }
      
      // Watermark
      doc.save()
         .fillColor('rgba(5, 150, 105, 0.05)')
         .fontSize(100)
         .rotate(-30, { origin: [300, 400] })
         .text('DEVIS', 100, 350)
         .restore();
      
      // ===== HEADER =====
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, 45, { width: 55, height: 55 });
        } catch (e) {
          doc.save()
             .roundedRect(50, 50, 50, 50, 10)
             .fillColor(COLORS.success)
             .fill();
          doc.fillColor('white')
             .fontSize(20)
             .font('Helvetica-Bold')
             .text((clinic?.name || 'CD').substring(0, 2).toUpperCase(), 50, 65, { width: 50, align: 'center' });
          doc.restore();
        }
      } else {
        doc.save()
           .roundedRect(50, 50, 50, 50, 10)
           .fillColor(COLORS.success)
           .fill();
        doc.fillColor('white')
           .fontSize(20)
           .font('Helvetica-Bold')
           .text((clinic?.name || 'CD').substring(0, 2).toUpperCase(), 50, 65, { width: 50, align: 'center' });
        doc.restore();
      }
      
      doc.fillColor(COLORS.successDark)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text(clinic?.name || 'Cabinet Dentaire', 110, 55);
      
      doc.fillColor(COLORS.gray).fontSize(9).font('Helvetica');
      let yPos = 75;
      if (clinic?.address) { doc.text(clinic.address, 110, yPos); yPos += 12; }
      if (clinic?.phone) { doc.text(`Tél: ${clinic.phone}`, 110, yPos); yPos += 12; }
      if (clinic?.email) { doc.text(clinic.email, 110, yPos); }
      
      // Document badge
      doc.save()
         .roundedRect(400, 50, 145, 35, 5)
         .fillColor(COLORS.success)
         .fill();
      doc.fillColor('white')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('DEVIS', 400, 60, { width: 145, align: 'center' });
      doc.restore();
      
      doc.fillColor(COLORS.successDark)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(quote.invoice_number, 400, 95, { width: 145, align: 'center' });
      
      doc.fillColor(COLORS.gray).fontSize(9).font('Helvetica')
         .text(`Date: ${formatDate(quote.invoice_date)}`, 400, 115, { width: 145, align: 'center' })
         .text(`Valide jusqu'au: ${formatDate(expiryDate)}`, 400, 127, { width: 145, align: 'center' });
      
      const statusColors = {
        'DRAFT': { bg: '#f3f4f6', text: '#374151', label: 'BROUILLON' },
        'SENT': { bg: '#dbeafe', text: '#1e40af', label: 'ENVOYÉ' },
        'ACCEPTED': { bg: '#dcfce7', text: '#166534', label: 'ACCEPTÉ' },
        'REJECTED': { bg: '#fee2e2', text: '#991b1b', label: 'REFUSÉ' },
        'CONVERTED': { bg: '#e0e7ff', text: '#4338ca', label: 'CONVERTI' }
      };
      const status = statusColors[quote.status] || statusColors['DRAFT'];
      
      doc.save()
         .roundedRect(435, 145, 75, 18, 9)
         .fillColor(status.bg)
         .fill();
      doc.fillColor(status.text).fontSize(8).font('Helvetica-Bold')
         .text(status.label, 435, 150, { width: 75, align: 'center' });
      doc.restore();
      
      doc.moveTo(50, 180).lineTo(545, 180).strokeColor(COLORS.success).lineWidth(2).stroke();
      
      // ===== PATIENT =====
      doc.save()
         .roundedRect(50, 195, 495, 50, 8)
         .fillColor('#f0fdf4')
         .fill()
         .strokeColor('#bbf7d0')
         .stroke();
      doc.restore();
      
      doc.fillColor(COLORS.success).fontSize(10).font('Helvetica-Bold').text('PATIENT', 65, 205);
      doc.fillColor(COLORS.text).fontSize(12).font('Helvetica-Bold')
         .text(`${quote.patient?.first_name || ''} ${quote.patient?.last_name || ''}`, 65, 220);
      doc.fillColor(COLORS.gray).fontSize(9).font('Helvetica')
         .text(`Tél: ${quote.patient?.phone_primary || '-'}`, 65, 235);
      
      // ===== ITEMS TABLE =====
      const tableTop = 260;
      const tableLeft = 50;
      const colWidths = [60, 235, 40, 80, 80];
      
      doc.save().rect(tableLeft, tableTop, 495, 25).fillColor(COLORS.success).fill();
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      doc.text('CODE', tableLeft + 10, tableTop + 8);
      doc.text('DÉSIGNATION', tableLeft + colWidths[0] + 10, tableTop + 8);
      doc.text('QTÉ', tableLeft + colWidths[0] + colWidths[1] + 10, tableTop + 8);
      doc.text('P.U. (Ar)', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 10, tableTop + 8);
      doc.text('TOTAL (Ar)', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 10, tableTop + 8);
      doc.restore();
      
      let rowY = tableTop + 25;
      quote.items.forEach((item, i) => {
        const rowHeight = 22;
        if (i % 2 === 0) {
          doc.save().rect(tableLeft, rowY, 495, rowHeight).fillColor('#f0fdf4').fill();
          doc.restore();
        }
        doc.fillColor(COLORS.success).fontSize(9).font('Helvetica-Bold')
           .text(item.procedure_code || `#${i + 1}`, tableLeft + 10, rowY + 6);
        doc.fillColor(COLORS.text).font('Helvetica')
           .text(item.description.substring(0, 40), tableLeft + colWidths[0] + 10, rowY + 6);
        doc.text(String(item.quantity), tableLeft + colWidths[0] + colWidths[1] + 15, rowY + 6);
        doc.text(formatCurrency(item.unit_price_mga), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 5, rowY + 6);
        doc.font('Helvetica-Bold')
           .text(formatCurrency(item.total_price_mga), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, rowY + 6);
        rowY += rowHeight;
      });
      
      doc.rect(tableLeft, tableTop, 495, rowY - tableTop).strokeColor('#d1fae5').stroke();
      
      // ===== TOTALS =====
      const totalsTop = rowY + 20;
      const totalsLeft = 330;
      const totalsWidth = 215;
      
      doc.save()
         .roundedRect(totalsLeft, totalsTop, totalsWidth, 60, 8)
         .fillColor('#f0fdf4')
         .fill()
         .strokeColor('#bbf7d0')
         .stroke();
      doc.restore();
      
      let totalsY = totalsTop + 10;
      doc.fillColor(COLORS.gray).fontSize(10).font('Helvetica')
         .text('Sous-total', totalsLeft + 15, totalsY)
         .text(formatCurrency(quote.subtotal_mga), totalsLeft + totalsWidth - 100, totalsY, { width: 85, align: 'right' });
      totalsY += 20;
      
      doc.save().rect(totalsLeft, totalsY - 2, totalsWidth, 24).fillColor(COLORS.success).fill();
      doc.fillColor('white').fontSize(12).font('Helvetica-Bold')
         .text('TOTAL', totalsLeft + 15, totalsY + 4)
         .text(formatCurrency(quote.total_mga), totalsLeft + totalsWidth - 100, totalsY + 4, { width: 85, align: 'right' });
      doc.restore();
      
      // ===== FOOTER =====
      doc.save()
         .roundedRect(50, 620, 495, 55, 5)
         .fillColor('#f0fdf4')
         .fill()
         .strokeColor('#bbf7d0')
         .stroke();
      doc.restore();
      
      doc.fillColor(COLORS.successDark).font('Helvetica-Bold').fontSize(9)
         .text('Conditions du devis', 60, 630);
      doc.font('Helvetica').fillColor(COLORS.gray).fontSize(8)
         .text(`Ce devis est valable ${quote.validity_days || 30} jours à compter de sa date d'émission.`, 60, 643)
         .text('Les prix sont en Ariary malgache (MGA). Ce document ne constitue pas une facture.', 60, 655)
         .text('Un accord écrit est nécessaire pour valider les soins proposés.', 60, 667);
      
      doc.moveTo(60, 730).lineTo(200, 730).strokeColor(COLORS.gray).lineWidth(0.5).stroke();
      doc.fontSize(8).text('Signature patient (Bon pour accord)', 60, 735, { width: 140, align: 'center' });
      
      doc.moveTo(360, 730).lineTo(530, 730).stroke();
      doc.text('Cachet et signature du praticien', 360, 735, { width: 170, align: 'center' });
      
      doc.fillColor(COLORS.success).fontSize(11).font('Helvetica-Bold')
         .text('Merci pour votre confiance !', 50, 760, { width: 495, align: 'center' });
      
      doc.fillColor('#9ca3af').fontSize(8).font('Helvetica')
         .text(`${clinic?.name || ''} - ${clinic?.address || ''} - ${clinic?.phone || ''}`, 50, 778, { width: 495, align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateInvoicePDF,
  generateQuotePDF
};
