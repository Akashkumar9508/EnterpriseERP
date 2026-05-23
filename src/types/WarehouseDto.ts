export interface WarehouseDto {
  id?: string;
  companyId: string;
  branchId: string;
  name: string;
  code?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  isDeleted?: boolean;
}
