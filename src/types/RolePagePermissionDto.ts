export interface RolePagePermissionDto {
  id?: string;
  roleId: string;
  pageId: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  menuId?: string | null;
  pageName?: string;
  route?: string;
}
