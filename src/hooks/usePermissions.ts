import { useAppSelector } from '../store/hooks';

export const usePermissions = (pageRouteOrName: string) => {
  const permissions = useAppSelector((state) => state.auth.permissions);
  
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
