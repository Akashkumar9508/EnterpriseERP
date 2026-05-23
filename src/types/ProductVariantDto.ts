export interface ProductVariantDto {
  id?: string;
  productId: string;
  sku?: string;
  barcode?: string;
  variantCombination?: string; // e.g. "Color: Red, Size: L"
  purchaseRate?: number;
  salesRate?: number;
  mrp?: number;
  isDefault?: boolean;
  
  // UI Helper fields
  productName?: string;
}
