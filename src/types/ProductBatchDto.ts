export interface ProductBatchDto {
  id?: string;
  productId: string;
  batchNo?: string;
  expiryDate?: string;
  mrp?: number;
  
  // UI Helper fields
  productName?: string;
}
