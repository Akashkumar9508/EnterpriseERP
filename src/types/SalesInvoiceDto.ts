import type { SalesInvoiceItemDto } from './SalesInvoiceItemDto';

export interface SalesInvoiceDto {
  id?: string;
  companyId: string;
  branchId: string;
  customerId: string;
  customerName?: string;
  warehouseId: string;
  warehouseName?: string;
  invoiceNo: string;
  invoiceDate: string;
  referenceNo?: string;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  status: number; // 1: Unpaid/Draft, 2: Paid/Posted, 3: Cancelled, 4: Partially Paid
  remarks?: string;
  createdAt?: string;
  paidAmount?: number;
  paymentMode?: number;
  paymentDetails?: SalesPaymentDetailDto[];
  items: SalesInvoiceItemDto[];
}

export interface SalesPaymentDetailDto {
  paidAmount: number;
  paymentMode: number;
  createdAt?: string;
}
