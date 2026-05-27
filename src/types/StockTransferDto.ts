export interface StockTransferItemDto {
  productId: string;
  qty: number;
}

export interface StockTransferDto {
  id?: string;
  fromWarehouseId: string;
  fromWarehouseName?: string;
  toWarehouseId: string;
  toWarehouseName?: string;
  transferDate: string;
  productNames?: string;
  totalQty?: number;
  items: StockTransferItemDto[];
}
