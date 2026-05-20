export interface CategoryDto {
  id?: string;
  companyId?: string;
  branchId?: string;
  parentCategoryId?: string | null;
  name: string;
  code?: string;
  levelNo: number;
  createdAt?: string;
  isDeleted?: boolean;
}
