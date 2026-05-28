import type { PurchaseInvoiceItemDto } from './PurchaseInvoiceItemDto';

export interface PurchaseInvoiceDto {
  id?: string;
  companyId: string;
  branchId: string;
  supplierId: string;
  supplierName?: string;
  warehouseId: string;
  warehouseName?: string;
  invoiceNo: string;
  invoiceDate: string;
  referenceNo?: string;
  purchaseOrderId?: string;
  poNumber?: string;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  status: number; // 1: Draft, 2: Posted, 3: Cancelled
  remarks?: string;
  createdAt?: string;
  paidAmount?: number;
  items: PurchaseInvoiceItemDto[];
}
