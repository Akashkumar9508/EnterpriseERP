import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SalesInvoiceDto } from '@/types/SalesInvoiceDto';

export interface CompanyDetails {
  name?: string;
  legalName?: string;
  gstNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export const generateSalesInvoicePdf = (
  invoice: SalesInvoiceDto,
  company?: CompanyDetails,
  action: 'open' | 'return' = 'open'
) => {
  // A4 size: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [139, 92, 246]; // Violet hex #8b5cf6 (Sales theme)
  const darkTextColor = [31, 41, 55]; // Charcoal #1f2937
  const grayTextColor = [107, 114, 128]; // Gray #6b7280
  const lightGrayColor = [243, 244, 246]; // Light gray #f3f4f6

  // Helper for text formatting
  const setDarkText = () => doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  const setGrayText = () => doc.setTextColor(grayTextColor[0], grayTextColor[1], grayTextColor[2]);
  const setPrimaryText = () => doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

  let y = 15;

  // ==========================================
  // HEADER SECTION
  // ==========================================

  // Company Information (Left side)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  setPrimaryText();
  doc.text(company?.legalName || company?.name || 'Enterprise ERP System', 15, y);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  setGrayText();
  y += 5;
  if (company?.address) {
    const addressLines = doc.splitTextToSize(company.address, 95);
    addressLines.forEach((line: string) => {
      doc.text(line, 15, y);
      y += 4;
    });
  }
  if (company?.gstNumber) {
    doc.text(`GSTIN: ${company.gstNumber}`, 15, y);
    y += 4;
  }
  if (company?.phone || company?.email) {
    const contactInfo = [
      company.phone ? `Phone: ${company.phone}` : null,
      company.email ? `Email: ${company.email}` : null
    ].filter(Boolean).join(' | ');
    doc.text(contactInfo, 15, y);
  }

  // Reset y for right-aligned invoice details
  let rightY = 15;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  setPrimaryText();
  doc.text('TAX INVOICE / RECEIPT', 195, rightY, { align: 'right' });

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  setDarkText();
  rightY += 8;
  doc.text(`Invoice No: ${invoice.invoiceNo}`, 195, rightY, { align: 'right' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  setGrayText();
  rightY += 5;
  const invoiceDateFormatted = invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';
  doc.text(`Invoice Date: ${invoiceDateFormatted}`, 195, rightY, { align: 'right' });

  rightY += 5;
  const getStatusString = (status?: number) => {
    switch (status) {
      case 1: return 'DRAFT';
      case 2: return 'POSTED';
      case 3: return 'CANCELLED';
      case 4: return 'PARTIALLY PAID';
      case 5: return 'RETURNED';
      case 6: return 'PARTIALLY RETURNED';
      default: return 'UNKNOWN';
    }
  };
  doc.text(`Status: ${getStatusString(invoice.status)}`, 195, rightY, { align: 'right' });

  // Draw separator line below header
  y = Math.max(y, rightY) + 8;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);
  y += 8;

  // ==========================================
  // CUSTOMER & WAREHOUSE SECTION (2 Columns)
  // ==========================================
  const col1X = 15;
  const col2X = 110;

  // Column 1: Customer
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  setPrimaryText();
  doc.text('BILLED TO (CUSTOMER)', col1X, y);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  setDarkText();
  doc.text(invoice.customerName || '—', col1X, y + 5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  setGrayText();
  doc.text('Valued Enterprise Client', col1X, y + 9);

  // Column 2: Dispatch From (Warehouse)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  setPrimaryText();
  doc.text('DISPATCH FROM (WAREHOUSE)', col2X, y);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  setDarkText();
  doc.text(invoice.warehouseName || '—', col2X, y + 5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  setGrayText();
  doc.text('Fulfillment Location', col2X, y + 9);

  y += 18;

  // ==========================================
  // ITEMS TABLE SECTION
  // ==========================================
  const tableHeaders = [['Sr.', 'Code', 'Product Description', 'Qty', 'Rate', 'GST', 'Disc', 'Amount']];
  
  const tableRows = (invoice.items || []).map((item, index) => {
    const descText = [
      item.productName || '—',
      item.variantName ? `Variant: ${item.variantName}` : null,
      item.batchNumber ? `Batch: ${item.batchNumber}` : null
    ].filter(Boolean).join(' | ');

    return [
      (index + 1).toString(),
      item.productCode || '—',
      descText,
      item.qty.toString(),
      `₹${item.rate.toFixed(2)}`,
      `${item.taxPercentage || 0}%`,
      `${item.discountPercentage || 0}%`,
      `₹${(item.amount || 0).toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: y,
    head: tableHeaders,
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [139, 92, 246] as any, // Violet
      textColor: [255, 255, 255] as any,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 70 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 25, halign: 'right' }
    },
    bodyStyles: {
      fontSize: 8,
      textColor: darkTextColor as any,
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      y = data.cursor?.y || y;
    }
  });

  y += 8;

  // ==========================================
  // TOTALS SECTION
  // ==========================================
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  setGrayText();
  doc.text('SubTotal:', 145, y, { align: 'right' });
  doc.setFont('Helvetica', 'bold');
  setDarkText();
  doc.text(`₹${invoice.subTotal.toFixed(2)}`, 195, y, { align: 'right' });

  y += 5;
  doc.setFont('Helvetica', 'normal');
  setGrayText();
  doc.text('Discount:', 145, y, { align: 'right' });
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(239, 68, 68); // Red
  doc.text(`-₹${invoice.discountAmount.toFixed(2)}`, 195, y, { align: 'right' });

  y += 5;
  doc.setFont('Helvetica', 'normal');
  setGrayText();
  doc.text('Tax (GST):', 145, y, { align: 'right' });
  doc.setFont('Helvetica', 'bold');
  setDarkText();
  doc.text(`+₹${invoice.taxAmount.toFixed(2)}`, 195, y, { align: 'right' });

  y += 6;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  setPrimaryText();
  doc.text('Net Total:', 145, y, { align: 'right' });
  doc.text(`₹${invoice.netAmount.toFixed(2)}`, 195, y, { align: 'right' });

  y += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129); // Green
  doc.text('Paid Upfront:', 145, y, { align: 'right' });
  doc.setFont('Helvetica', 'bold');
  doc.text(`₹${(invoice.paidAmount || 0).toFixed(2)}`, 195, y, { align: 'right' });

  y += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(239, 68, 68); // Red
  doc.text('Balance Due:', 145, y, { align: 'right' });
  doc.setFont('Helvetica', 'bold');
  const balanceDue = Math.max(0, invoice.netAmount - (invoice.paidAmount || 0));
  doc.text(`₹${balanceDue.toFixed(2)}`, 195, y, { align: 'right' });

  y += 12;

  // ==========================================
  // PAYMENT DETAILS SECTION
  // ==========================================
  if (invoice.paymentDetails && invoice.paymentDetails.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    setPrimaryText();
    doc.text('PAYMENT DETAILS HISTORY', 15, y);
    y += 5;

    const payHeaders = [['Payment Date', 'Payment Mode', 'Amount Paid']];
    const payRows = invoice.paymentDetails.map(pay => {
      const getMethodName = (mode: number) => {
        switch (mode) {
          case 1: return 'Cash';
          case 2: return 'Bank Transfer';
          case 3: return 'Card';
          case 4: return 'UPI';
          case 5: return 'Cheque';
          default: return 'Other';
        }
      };

      const dateStr = pay.createdAt ? new Date(pay.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
      return [
        dateStr,
        getMethodName(pay.paymentMode),
        `₹${pay.paidAmount.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: y,
      head: payHeaders,
      body: payRows,
      theme: 'grid',
      headStyles: {
        fillColor: [243, 244, 246] as any,
        textColor: darkTextColor as any,
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 55 },
        2: { cellWidth: 55, halign: 'right' }
      },
      bodyStyles: {
        fontSize: 8,
        textColor: darkTextColor as any,
      },
      margin: { left: 15, right: 15 },
      didDrawPage: (data) => {
        y = data.cursor?.y || y;
      }
    });

    y += 12;
  }

  if (invoice.remarks) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    setGrayText();
    doc.text(`Remarks: ${invoice.remarks}`, 15, y);
    y += 8;
  }

  // ==========================================
  // SIGNATURE SECTION
  // ==========================================
  if (y > 250) {
    doc.addPage();
    y = 30;
  }

  y += 15;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(135, y, 195, y);
  
  y += 4;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  setGrayText();
  doc.text('Authorized Seal & Signature', 165, y, { align: 'center' });

  if (action === 'return') {
    return doc;
  }

  // Open PDF in a new tab
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const newWindow = window.open(blobUrl, '_blank');
    if (!newWindow) {
      doc.save(`Invoice-${invoice.invoiceNo}.pdf`);
    }
  } catch (e) {
    console.error('Failed to open PDF in new tab, downloading instead', e);
    doc.save(`Invoice-${invoice.invoiceNo}.pdf`);
  }

  return doc;
};
