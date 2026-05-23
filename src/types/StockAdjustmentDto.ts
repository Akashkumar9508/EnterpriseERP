export interface StockAdjustmentDto {
  id?: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  adjustmentType: string; // 'Addition' or 'Subtraction'
  adjustmentDate: string;
  remarks?: string;
  createdAt?: string;

  // UI helper fields
  productName?: string;
  warehouseName?: string;
}
