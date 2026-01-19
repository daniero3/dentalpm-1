/**
 * PDF Generator Utility using PDFKit
 * Generates premium PDF documents without browser dependency
 */

const PDFDocument = require('pdfkit');

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
 * Generate premium invoice PDF
 */
function generateInvoicePDF(invoice, clinic, payments) {
  return new Promise((resolve, reject) => {
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
      
      // ===== HEADER =====
      // Logo placeholder (circle with initials)
      doc.save()
         .roundedRect(50, 50, 50, 50, 10)
         .fillColor(COLORS.primary)
         .fill();
      doc.fillColor('white')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text((clinic?.name || 'CD').substring(0, 2).toUpperCase(), 50, 65, { width: 50, align: 'center' });
      doc.restore();
      
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
      
      if (invoice.clinic_nif || invoice.clinic_stat) {
        doc.fontSize(8).fillColor('#9ca3af');
        if (invoice.clinic_nif) doc.text(`NIF: ${invoice.clinic_nif}`, 110, yPos);
        if (invoice.clinic_stat) doc.text(`STAT: ${invoice.clinic_stat}`, 200, yPos);
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
        
        // Alternate row color
        if (i % 2 === 0) {
          doc.save()
             .rect(tableLeft, rowY, 495, rowHeight)
             .fillColor('#f8fafc')
             .fill();
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
      
      // Table border
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
      
      // Subtotal
      doc.fillColor(COLORS.gray).fontSize(10).font('Helvetica')
         .text('Sous-total', totalsLeft + 15, totalsY)
         .text(formatCurrency(invoice.subtotal_mga), totalsLeft + totalsWidth - 100, totalsY, { width: 85, align: 'right' });
      totalsY += 18;
      
      // Discount
      if (parseFloat(invoice.discount_percentage || 0) > 0) {
        doc.fillColor(COLORS.danger)
           .text(`Remise (${invoice.discount_percentage}%)`, totalsLeft + 15, totalsY)
           .text(`-${formatCurrency(invoice.discount_amount_mga)}`, totalsLeft + totalsWidth - 100, totalsY, { width: 85, align: 'right' });
        totalsY += 18;
      }
      
      // Total (highlighted)
      doc.save()
         .rect(totalsLeft, totalsY - 2, totalsWidth, 24)
         .fillColor(COLORS.primary)
         .fill();
      doc.fillColor('white').fontSize(12).font('Helvetica-Bold')
         .text('TOTAL', totalsLeft + 15, totalsY + 4)
         .text(formatCurrency(invoice.total_mga), totalsLeft + totalsWidth - 100, totalsY + 4, { width: 85, align: 'right' });
      doc.restore();
      totalsY += 28;
      
      // Paid
      doc.fillColor(COLORS.success).fontSize(10).font('Helvetica')
         .text('Payé', totalsLeft + 15, totalsY)
         .text(formatCurrency(paidTotal), totalsLeft + totalsWidth - 100, totalsY, { width: 85, align: 'right' });
      totalsY += 18;
      
      // Balance
      doc.save()
         .rect(totalsLeft, totalsY - 2, totalsWidth, 20)
         .fillColor(balance > 0 ? '#fef3c7' : '#dcfce7')
         .fill();
      doc.fillColor(balance > 0 ? COLORS.warning : COLORS.success).font('Helvetica-Bold')
         .text('Reste à payer', totalsLeft + 15, totalsY + 2)
         .text(formatCurrency(balance), totalsLeft + totalsWidth - 100, totalsY + 2, { width: 85, align: 'right' });
      doc.restore();
      
      // ===== PAYMENTS SECTION =====
      if (payments.length > 0) {
        let paymentsY = totalsTop + 120;
        
        doc.fillColor(COLORS.primary).fontSize(10).font('Helvetica-Bold')
           .text('HISTORIQUE DES PAIEMENTS', 50, paymentsY);
        paymentsY += 20;
        
        payments.forEach(p => {
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
          
          if (p.reference_number) {
            doc.text(`Réf: ${p.reference_number}`, 140, paymentsY + 15);
          }
          
          doc.fillColor(COLORS.success).font('Helvetica-Bold')
             .text(`+${formatCurrency(p.amount_mga)}`, 220, paymentsY + 8, { width: 80, align: 'right' });
          
          paymentsY += 30;
        });
      }
      
      // ===== FOOTER =====
      doc.fontSize(9).fillColor(COLORS.gray).font('Helvetica');
      
      // Conditions box
      doc.save()
         .roundedRect(50, 680, 495, 50, 5)
         .fillColor('#f1f5f9')
         .fill();
      doc.restore();
      
      doc.fillColor(COLORS.text).font('Helvetica-Bold')
         .text('Conditions de paiement', 60, 690);
      doc.font('Helvetica').fillColor(COLORS.gray)
         .text(invoice.payment_terms || 'Paiement dû à réception de la facture.', 60, 703)
         .text('Modes acceptés: Espèces, Chèque, Carte, MVola, Orange Money, Airtel Money', 60, 715);
      
      // Signature lines
      doc.moveTo(60, 770).lineTo(180, 770).strokeColor(COLORS.gray).lineWidth(0.5).stroke();
      doc.text('Signature patient', 60, 775, { width: 120, align: 'center' });
      
      doc.moveTo(380, 770).lineTo(530, 770).stroke();
      doc.text('Cachet et signature', 380, 775, { width: 150, align: 'center' });
      
      // Thank you message
      doc.fillColor(COLORS.primary).fontSize(11).font('Helvetica-Bold')
         .text('Merci pour votre confiance !', 50, 800, { width: 495, align: 'center' });
      
      // Legal footer
      doc.fillColor('#9ca3af').fontSize(8).font('Helvetica')
         .text(`${clinic?.name || 'Cabinet Dentaire'} - ${clinic?.address || ''} - ${clinic?.phone || ''}`, 50, 815, { width: 495, align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate premium quote PDF
 */
function generateQuotePDF(quote, clinic) {
  return new Promise((resolve, reject) => {
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
      
      // Calculate expiry
      const expiryDate = new Date(quote.invoice_date);
      expiryDate.setDate(expiryDate.getDate() + (quote.validity_days || 30));
      const isExpired = new Date() > expiryDate && !['ACCEPTED', 'CONVERTED'].includes(quote.status);
      
      // Watermark
      doc.save()
         .fillColor('rgba(5, 150, 105, 0.05)')
         .fontSize(100)
         .rotate(-30, { origin: [300, 400] })
         .text('DEVIS', 100, 350)
         .restore();
      
      // ===== HEADER (Green theme) =====
      doc.save()
         .roundedRect(50, 50, 50, 50, 10)
         .fillColor(COLORS.success)
         .fill();
      doc.fillColor('white')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text((clinic?.name || 'CD').substring(0, 2).toUpperCase(), 50, 65, { width: 50, align: 'center' });
      doc.restore();
      
      // Clinic info
      doc.fillColor(COLORS.successDark)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text(clinic?.name || 'Cabinet Dentaire', 110, 55);
      
      doc.fillColor(COLORS.gray)
         .fontSize(9)
         .font('Helvetica');
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
      
      // Quote number & dates
      doc.fillColor(COLORS.successDark)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(quote.invoice_number, 400, 95, { width: 145, align: 'center' });
      
      doc.fillColor(COLORS.gray)
         .fontSize(9)
         .font('Helvetica')
         .text(`Date: ${formatDate(quote.invoice_date)}`, 400, 115, { width: 145, align: 'center' });
      
      // Status badge
      const statusColors = {
        'DRAFT': { bg: '#f3f4f6', text: '#374151', label: 'BROUILLON' },
        'SENT': { bg: '#dbeafe', text: '#1e40af', label: 'ENVOYÉ' },
        'ACCEPTED': { bg: '#dcfce7', text: '#166534', label: 'ACCEPTÉ' },
        'REJECTED': { bg: '#fee2e2', text: '#991b1b', label: 'REFUSÉ' },
        'EXPIRED': { bg: '#fef3c7', text: '#92400e', label: 'EXPIRÉ' },
        'CONVERTED': { bg: '#e0e7ff', text: '#4338ca', label: 'CONVERTI' }
      };
      const status = statusColors[quote.status] || statusColors['DRAFT'];
      
      doc.save()
         .roundedRect(435, 130, 75, 18, 9)
         .fillColor(status.bg)
         .fill();
      doc.fillColor(status.text)
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(status.label, 435, 135, { width: 75, align: 'center' });
      doc.restore();
      
      // Validity badge
      doc.save()
         .roundedRect(400, 155, 145, 35, 5)
         .fillColor(isExpired ? '#fee2e2' : '#dcfce7')
         .fill();
      doc.fillColor(isExpired ? COLORS.danger : COLORS.success)
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(`Validité: ${quote.validity_days || 30} jours`, 400, 162, { width: 145, align: 'center' })
         .text(`Expire le: ${formatDate(expiryDate)}`, 400, 175, { width: 145, align: 'center' });
      if (isExpired) {
        doc.fillColor(COLORS.danger).text('⚠ EXPIRÉ', 400, 175, { width: 145, align: 'center' });
      }
      doc.restore();
      
      // Separator
      doc.moveTo(50, 200).lineTo(545, 200).strokeColor(COLORS.success).lineWidth(2).stroke();
      
      // ===== PATIENT BLOCK =====
      doc.save()
         .roundedRect(50, 215, 495, 55, 8)
         .fillColor('#f0fdf4')
         .fill()
         .strokeColor('#bbf7d0')
         .stroke();
      doc.restore();
      
      doc.fillColor(COLORS.success)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('PATIENT', 65, 225);
      
      doc.fillColor(COLORS.text)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text(`${quote.patient?.first_name || ''} ${quote.patient?.last_name || ''}`, 65, 240);
      
      doc.fillColor(COLORS.gray)
         .fontSize(9)
         .font('Helvetica');
      let patientInfo = [];
      if (quote.patient?.phone_primary) patientInfo.push(`Tél: ${quote.patient.phone_primary}`);
      if (quote.patient?.email) patientInfo.push(quote.patient.email);
      doc.text(patientInfo.join('  •  '), 65, 255);
      
      // ===== ITEMS TABLE =====
      const tableTop = 290;
      const tableLeft = 50;
      const colWidths = [60, 235, 40, 80, 80];
      
      // Table header (green)
      doc.save()
         .rect(tableLeft, tableTop, 495, 25)
         .fillColor(COLORS.success)
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
      quote.items.forEach((item, i) => {
        const rowHeight = 22;
        
        if (i % 2 === 0) {
          doc.save()
             .rect(tableLeft, rowY, 495, rowHeight)
             .fillColor('#f0fdf4')
             .fill();
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
      
      // ===== TOTALS BOX =====
      const totalsTop = rowY + 20;
      const totalsLeft = 330;
      const totalsWidth = 215;
      
      doc.save()
         .roundedRect(totalsLeft, totalsTop, totalsWidth, 70, 8)
         .fillColor('#f0fdf4')
         .fill()
         .strokeColor('#bbf7d0')
         .stroke();
      doc.restore();
      
      let totalsY = totalsTop + 10;
      
      doc.fillColor(COLORS.gray).fontSize(10).font('Helvetica')
         .text('Sous-total', totalsLeft + 15, totalsY)
         .text(formatCurrency(quote.subtotal_mga), totalsLeft + totalsWidth - 100, totalsY, { width: 85, align: 'right' });
      totalsY += 18;
      
      if (parseFloat(quote.discount_percentage || 0) > 0) {
        doc.fillColor(COLORS.danger)
           .text(`Remise (${quote.discount_percentage}%)`, totalsLeft + 15, totalsY)
           .text(`-${formatCurrency(quote.discount_amount_mga)}`, totalsLeft + totalsWidth - 100, totalsY, { width: 85, align: 'right' });
        totalsY += 18;
      }
      
      doc.save()
         .rect(totalsLeft, totalsY - 2, totalsWidth, 24)
         .fillColor(COLORS.success)
         .fill();
      doc.fillColor('white').fontSize(12).font('Helvetica-Bold')
         .text('TOTAL', totalsLeft + 15, totalsY + 4)
         .text(formatCurrency(quote.total_mga), totalsLeft + totalsWidth - 100, totalsY + 4, { width: 85, align: 'right' });
      doc.restore();
      
      // ===== FOOTER =====
      doc.save()
         .roundedRect(50, 630, 495, 60, 5)
         .fillColor('#f0fdf4')
         .fill()
         .strokeColor('#bbf7d0')
         .stroke();
      doc.restore();
      
      doc.fillColor(COLORS.successDark).font('Helvetica-Bold').fontSize(10)
         .text('Conditions du devis', 60, 640);
      doc.font('Helvetica').fillColor(COLORS.gray).fontSize(9)
         .text(`Ce devis est valable ${quote.validity_days || 30} jours à compter de sa date d'émission.`, 60, 655)
         .text('Les prix sont en Ariary malgache (MGA). Ce document ne constitue pas une facture.', 60, 668)
         .text('Un accord écrit est nécessaire pour valider les soins proposés.', 60, 681);
      
      // Signatures
      doc.moveTo(60, 750).lineTo(200, 750).strokeColor(COLORS.gray).lineWidth(0.5).stroke();
      doc.text('Signature patient', 60, 755, { width: 140, align: 'center' });
      doc.text('(Bon pour accord)', 60, 767, { width: 140, align: 'center' });
      
      doc.moveTo(360, 750).lineTo(530, 750).stroke();
      doc.text('Cachet et signature', 360, 755, { width: 170, align: 'center' });
      doc.text('du praticien', 360, 767, { width: 170, align: 'center' });
      
      doc.fillColor(COLORS.success).fontSize(11).font('Helvetica-Bold')
         .text('Merci pour votre confiance !', 50, 795, { width: 495, align: 'center' });
      
      doc.fillColor('#9ca3af').fontSize(8).font('Helvetica')
         .text(`${clinic?.name || ''} - ${clinic?.address || ''} - ${clinic?.phone || ''}`, 50, 810, { width: 495, align: 'center' });
      
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
