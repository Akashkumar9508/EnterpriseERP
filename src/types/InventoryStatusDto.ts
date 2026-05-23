export interface InventoryStatusDto {
  productId: string;
  productName: string;
  productCode: string;
  sku?: string;
  minStock: number;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
}
