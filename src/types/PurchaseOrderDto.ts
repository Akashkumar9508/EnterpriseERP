export interface PurchaseOrderItemDto {
  id?: string
  purchaseOrderId?: string
  productId: string
  productName?: string
  productCode?: string
  orderedQty: number
  rate: number
  amount: number
  unitName?: string
}

export interface POPaymentDetailDto {
  paidAmount: number;
  paymentMode: number;
  createdAt: string;
}

export interface PurchaseOrderDto {
  id?: string
  companyId: string
  branchId: string
  supplierId: string
  supplierName?: string
  warehouseId: string
  warehouseName?: string
  poNumber: string
  poDate: string
  grossAmount: number
  netAmount: number
  status?: number // 1: Pending, 2: Received, 3: Cancelled
  createdAt?: string
  invoiceNo?: string;
  items: PurchaseOrderItemDto[]
  paymentDetails?: POPaymentDetailDto[]
}

export interface LowStockProductDto {
  productId: string
  productName: string
  productCode: string
  sku: string
  minStock: number
  currentStock: number
  defaultRate: number
  unitName: string
}
