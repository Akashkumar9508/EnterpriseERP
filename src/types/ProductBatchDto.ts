export interface ProductBatchDto {
  id?: string;
  productId: string;
  batchNo?: string;
  expiryDate?: string;
  mrp?: number;
  salesRate?: number;
  purchaseRate?: number;
  
  // UI Helper fields
  productName?: string;
}
