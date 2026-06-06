import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PurchaseOrderDto } from '@/types/PurchaseOrderDto';

export interface CompanyDetails {
  name?: string;
  legalName?: string;
  gstNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export const generatePurchaseOrderPdf = (
  order: PurchaseOrderDto,
  company?: CompanyDetails,
  action: 'open' | 'return' = 'open'
) => {
  // A4 size: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [79, 70, 229]; // Indigo hex #4f46e5
  const darkTextColor = [31, 41, 55]; // Charcoal #1f2937
  const grayTextColor = [107, 114, 128]; // Gray #6b7280

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
  doc.text(company?.legalName || company?.name || 'Enterprise ERP', 15, y);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  setGrayText();
  y += 5;
  if (company?.address) {
    // Split long address into lines
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

  // Reset y for right-aligned PO details
  let rightY = 15;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(20);
  setPrimaryText();
  doc.text('PURCHASE ORDER', 195, rightY, { align: 'right' });

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  setDarkText();
  rightY += 8;
  doc.text(`PO Number: ${order.poNumber}`, 195, rightY, { align: 'right' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  setGrayText();
  rightY += 5;
  const poDateFormatted = order.poDate ? new Date(order.poDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';
  doc.text(`PO Date: ${poDateFormatted}`, 195, rightY, { align: 'right' });

  rightY += 5;
  const getStatusString = (status?: number) => {
    switch (status) {
      case 1: return 'PENDING';
      case 2: return 'RECEIVED';
      case 3: return 'CANCELLED';
      default: return 'UNKNOWN';
    }
  };
  doc.text(`Status: ${getStatusString(order.status)}`, 195, rightY, { align: 'right' });

  // Draw separator line below header
  y = Math.max(y, rightY) + 8;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);
  y += 8;

  // ==========================================
  // SUPPLIER & WAREHOUSE SECTION (2 Columns)
  // ==========================================
  const col1X = 15;
  const col2X = 110;

  // Column 1: Supplier
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  setPrimaryText();
  doc.text('SUPPLIER', col1X, y);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  setDarkText();
  doc.text(order.supplierName || '—', col1X, y + 5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  setGrayText();
  doc.text('Apex Certified Supplier Partner', col1X, y + 9);

  // Column 2: Deliver To (Warehouse)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  setPrimaryText();
  doc.text('DELIVER TO / SHIP TO', col2X, y);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  setDarkText();
  doc.text(order.warehouseName || '—', col2X, y + 5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  setGrayText();
  doc.text('Main Receiving Warehouse', col2X, y + 9);

  y += 18;

  // ==========================================
  // ITEMS TABLE SECTION
  // ==========================================
  const tableHeaders = [['Sr.', 'Item Code', 'Product Description', 'Quantity', 'Rate', 'Amount']];
  
  const tableRows = (order.items || []).map((item, index) => [
    (index + 1).toString(),
    item.productCode || '—',
    item.productName || '—',
    item.orderedQty.toString(),
    `INR ${item.rate.toFixed(2)}`,
    `INR ${item.amount.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHeaders,
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229] as any, // Indigo
      textColor: [255, 255, 255] as any,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 72 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' }
    },
    bodyStyles: {
      fontSize: 8.5,
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
  doc.text('Gross Amount:', 145, y, { align: 'right' });
  doc.setFont('Helvetica', 'bold');
  setDarkText();
  doc.text(`INR ${order.grossAmount.toFixed(2)}`, 195, y, { align: 'right' });

  y += 5;
  doc.setFont('Helvetica', 'normal');
  setGrayText();
  doc.text('Net Amount:', 145, y, { align: 'right' });
  doc.setFont('Helvetica', 'bold');
  setPrimaryText();
  doc.setFontSize(11);
  doc.text(`INR ${order.netAmount.toFixed(2)}`, 195, y, { align: 'right' });

  y += 12;

  // ==========================================
  // PAYMENT HISTORY (Splits) SECTION - if status is RECEIVED
  // ==========================================
  if (order.status === 2 && order.paymentDetails && order.paymentDetails.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    setPrimaryText();
    doc.text('PAYMENT DETAILS / SPLITS', 15, y);
    y += 5;

    const payHeaders = [['Payment Date', 'Payment Method', 'Amount Paid']];
    const payRows = order.paymentDetails.map(pay => {
      const getMethodName = (mode: number) => {
        switch (mode) {
          case 1: return 'Cash';
          case 2: return 'Bank Transfer';
          case 3: return 'Credit Card';
          case 4: return 'UPI / Mobile';
          case 5: return 'Unpaid (Credit)';
          default: return 'Unknown';
        }
      };

      const dateStr = pay.createdAt ? new Date(pay.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
      return [
        dateStr,
        getMethodName(pay.paymentMode),
        `INR ${pay.paidAmount.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: y,
      head: payHeaders,
      body: payRows,
      theme: 'grid',
      headStyles: {
        fillColor: [243, 244, 246] as any, // Light Gray
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

  // ==========================================
  // SIGNATURE SECTION
  // ==========================================
  // Check if we need a new page for signature
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
  doc.text('Authorized Signature', 165, y, { align: 'center' });

  if (action === 'return') {
    return doc;
  }

  // Open PDF in a new tab
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const newWindow = window.open(blobUrl, '_blank');
    if (!newWindow) {
      // Fallback if popup blocked
      doc.save(`PO-${order.poNumber}.pdf`);
    }
  } catch (e) {
    console.error('Failed to open PDF in new tab, downloading instead', e);
    doc.save(`PO-${order.poNumber}.pdf`);
  }

  return doc;
};
