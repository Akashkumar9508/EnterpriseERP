export interface PurchaseInvoiceItemDto {
  id?: string;
  purchaseInvoiceId?: string;
  productId: string;
  productName?: string;
  productCode?: string;
  productVariantId?: string;
  variantName?: string;
  productBatchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  freeQuantity?: number;
  purchaseRate: number;
  salesRate?: number;
  mrp?: number;
  discountPercent?: number;
  discountAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  totalAmount?: number;
}
