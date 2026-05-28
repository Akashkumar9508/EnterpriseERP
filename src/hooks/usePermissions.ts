import { useAppSelector } from '../store/hooks';

export const usePermissions = (pageRouteOrName: string) => {
  const permissions = useAppSelector((state) => state.auth.permissions);
  const user = useAppSelector((state) => state.auth.user);

  const isSuperAdmin = 
    user?.roleName?.toLowerCase() === 'super admin' || 
    user?.roleId?.toLowerCase() === 'b77a760c-2df5-4d7a-8f55-b461413a1ad1';

  if (isSuperAdmin) {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
    };
  }

  // Find permission matching the specific page route or name (case-insensitive)
  const permission = permissions.find(
    (p) => 
      p.route?.toLowerCase() === pageRouteOrName.toLowerCase() || 
      p.pageName?.toLowerCase() === pageRouteOrName.toLowerCase()
  );

  return {
    canView: permission?.canView ?? false,
    canCreate: permission?.canCreate ?? false,
    canEdit: permission?.canEdit ?? false,
    canDelete: permission?.canDelete ?? false,
  };
};
