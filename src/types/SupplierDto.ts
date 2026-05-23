export interface SupplierDto {
  id?: string;
  companyId: string;
  branchId: string;
  code?: string;
  name: string;
  gstNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  openingBalance?: number;
  creditLimit?: number;
  createdAt?: string;
  isDeleted?: boolean;
}
