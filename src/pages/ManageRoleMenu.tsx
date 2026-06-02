import { useEffect, useState } from 'react';
import { Loader2, Search, Shield, Save } from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axiosClient from '@/Services/axiosClient';
import { usePermissions } from '@/hooks/usePermissions';
import type { RoleDto } from '@/types/RoleDto';
import type { MenuDto } from '@/types/MenuDto';
import type { PageDto } from '@/types/PageDto';
import type { RolePagePermissionDto } from '@/types/RolePagePermissionDto';
import { toast } from 'sonner';

export default function ManageRoleMenu() {
  const { canView, canEdit } = usePermissions('/manage-role-menu');
  
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [menus, setMenus] = useState<MenuDto[]>([]);
  const [pages, setPages] = useState<PageDto[]>([]);
  
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [permissions, setPermissions] = useState<Record<string, Omit<RolePagePermissionDto, 'roleId' | 'pageId'>>>({});
  const [search, setSearch] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch initial data: Roles, Menus, Pages
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [rolesRes, menusRes, pagesRes] = await Promise.all([
          axiosClient.get('/Role', { params: { pageSize: 1000 } }),
          axiosClient.get('/Menu'),
          axiosClient.get('/Page', { params: { pageSize: 1000 } })
        ]) as [any, any, any];

        if (rolesRes?.success) {
          const rolesList = rolesRes.data?.items || rolesRes.data || [];
          setRoles(rolesList.filter((r: RoleDto) => r.isActive));
          if (rolesList.length > 0) {
            setSelectedRoleId(rolesList[0].id || '');
          }
        }
        if (menusRes?.success) {
          setMenus(menusRes.data || []);
        }
        if (pagesRes?.success) {
          setPages(pagesRes.data?.items || pagesRes.data || []);
        }
      } catch (error) {
        console.error('Failed to load initial data', error);
        toast.error('Failed to load roles, menus, or pages.');
      } finally {
        setIsLoading(false);
      }
    };

    if (canView) {
      fetchInitialData();
    }
  }, [canView]);

  // Fetch permissions when selected role changes
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!selectedRoleId) return;
      setIsLoading(true);
      try {
        const response: any = await axiosClient.get(`/RolePagePermission/${selectedRoleId}`);
        if (response?.success) {
          const fetchedPerms = response.data || [];
          const permMap: Record<string, Omit<RolePagePermissionDto, 'roleId' | 'pageId'>> = {};
          
          fetchedPerms.forEach((p: any) => {
            const pageId = p.pageId || p.PageId;
            if (pageId) {
              permMap[pageId] = {
                id: p.id || p.Id,
                canView: p.canView !== undefined ? p.canView : p.CanView,
                canCreate: p.canCreate !== undefined ? p.canCreate : p.CanCreate,
                canEdit: p.canEdit !== undefined ? p.canEdit : p.CanEdit,
                canDelete: p.canDelete !== undefined ? p.canDelete : p.CanDelete,
                menuId: p.menuId !== undefined ? p.menuId : p.MenuId
              };
            }
          });
          
          setPermissions(permMap);
        }
      } catch (error) {
        console.error('Failed to fetch role permissions', error);
        toast.error('Failed to load permissions for the selected role.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [selectedRoleId]);

  // Toggle single permission checkbox
  const handleCheckboxChange = (pageId: string, menuId: string | null, field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete', val: boolean) => {
    setPermissions(prev => {
      const current = prev[pageId] || {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        menuId: menuId
      };

      const updated = { ...current, [field]: val, menuId };

      // UX Rules:
      // 1. If checking canCreate/canEdit/canDelete, we must check canView
      if (val && (field === 'canCreate' || field === 'canEdit' || field === 'canDelete')) {
        updated.canView = true;
      }
      // 2. If unchecking canView, we must uncheck canCreate/canEdit/canDelete
      if (!val && field === 'canView') {
        updated.canCreate = false;
        updated.canEdit = false;
        updated.canDelete = false;
      }

      return {
        ...prev,
        [pageId]: updated
      };
    });
  };

  // Toggle select-all for a specific menu group
  const handleGroupToggle = (groupPageIds: { pageId: string; menuId: string }[], checked: boolean) => {
    setPermissions(prev => {
      const updated = { ...prev };
      groupPageIds.forEach(({ pageId, menuId }) => {
        updated[pageId] = {
          ...updated[pageId],
          canView: checked,
          canCreate: checked,
          canEdit: checked,
          canDelete: checked,
          menuId: menuId
        };
      });
      return updated;
    });
  };

  // Check if all permissions in a group are selected
  const isGroupAllChecked = (groupPageIds: { pageId: string; menuId: string }[]) => {
    if (groupPageIds.length === 0) return false;
    return groupPageIds.every(({ pageId }) => {
      const p = permissions[pageId];
      return p && p.canView && p.canCreate && p.canEdit && p.canDelete;
    });
  };

  // Save all permissions to the backend using the bulk save endpoint
  const handleSave = async () => {
    if (!selectedRoleId) return;
    setIsSaving(true);
    try {
      const payload: RolePagePermissionDto[] = pages.map(page => {
        const perm = permissions[page.id!] || {
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          menuId: null
        };

        // Find if this page is linked to a menu to determine menuId
        const linkedMenu = menus.find(m => m.pageId === page.id);
        const menuId = perm.menuId || linkedMenu?.id || null;

        return {
          id: perm.id,
          roleId: selectedRoleId,
          pageId: page.id!,
          canView: perm.canView,
          canCreate: perm.canCreate,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
          menuId: menuId
        };
      });

      const response: any = await axiosClient.post('/RolePagePermission/bulk', payload);
      if (response?.success) {
        toast.success('Permissions saved successfully!');
        
        // Refresh permissions map
        const refreshResponse: any = await axiosClient.get(`/RolePagePermission/${selectedRoleId}`);
        if (refreshResponse?.success) {
          const fetchedPerms = refreshResponse.data || [];
          const permMap: Record<string, Omit<RolePagePermissionDto, 'roleId' | 'pageId'>> = {};
          fetchedPerms.forEach((p: any) => {
            const pageId = p.pageId || p.PageId;
            if (pageId) {
              permMap[pageId] = {
                id: p.id || p.Id,
                canView: p.canView !== undefined ? p.canView : p.CanView,
                canCreate: p.canCreate !== undefined ? p.canCreate : p.CanCreate,
                canEdit: p.canEdit !== undefined ? p.canEdit : p.CanEdit,
                canDelete: p.canDelete !== undefined ? p.canDelete : p.CanDelete,
                menuId: p.menuId !== undefined ? p.menuId : p.MenuId
              };
            }
          });
          setPermissions(permMap);
        }
      } else {
        toast.error(response?.message || 'Failed to save permissions');
      }
    } catch (error: any) {
      console.error('Failed to save permissions', error);
      toast.error(error?.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Build the grouping structure for pages by parent menu
  const parentMenus = menus.filter(m => !m.parentId);
  const groups: { parentMenuName: string; pages: { pageId: string; pageName: string; menuId: string }[] }[] = [];

  parentMenus.forEach(parent => {
    // Find child menus under this parent that are linked to pages
    const children = menus.filter(m => m.parentId === parent.id && m.pageId);
    if (children.length > 0) {
      const groupPages = children.map(c => {
        const page = pages.find(p => p.id === c.pageId);
        return {
          pageId: c.pageId!,
          pageName: page?.name || c.name,
          menuId: c.id!
        };
      });

      groups.push({
        parentMenuName: parent.name,
        pages: groupPages
      });
    }
  });

  // Pages directly linked to root menus (no parent)
  const rootMenuPages = menus.filter(m => !m.parentId && m.pageId).map(m => {
    const page = pages.find(p => p.id === m.pageId);
    return {
      pageId: m.pageId!,
      pageName: page?.name || m.name,
      menuId: m.id!
    };
  });

  if (rootMenuPages.length > 0) {
    groups.push({
      parentMenuName: 'General Menus',
      pages: rootMenuPages
    });
  }

  // Find pages that are not linked to any menu
  const linkedPageIds = new Set(menus.filter(m => m.pageId).map(m => m.pageId!));
  const unlinkedPages = pages.filter(p => !linkedPageIds.has(p.id!)).map(p => ({
    pageId: p.id!,
    pageName: p.name,
    menuId: '' // No menuId linked
  }));

  if (unlinkedPages.length > 0) {
    groups.push({
      parentMenuName: 'Other/Standalone Pages',
      pages: unlinkedPages
    });
  }

  // Filter groups and pages based on search text
  const filteredGroups = groups.map(group => {
    const filteredPages = group.pages.filter(p => 
      p.pageName.toLowerCase().includes(search.toLowerCase())
    );
    return {
      ...group,
      pages: filteredPages
    };
  }).filter(group => group.pages.length > 0);

  if (!canView) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view this module.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <Section className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Role Permissions</h1>
          <p className="text-muted-foreground mt-1">Configure feature access rights and action permissions by user role.</p>
        </div>
        <div className="flex items-center gap-3 self-end shrink-0">
          {canEdit && (
            <Button onClick={handleSave} disabled={isSaving || !selectedRoleId} className="gap-2 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition duration-150">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Permissions
            </Button>
          )}
        </div>
      </Section>

      <Section className="bg-card border border-border rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-[300px] space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Select Role</label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="w-full border-zinc-200 dark:border-white/10">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id!}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:flex-1 space-y-1.5 mt-0.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Search Page</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search by page name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-zinc-200 dark:border-white/10"
              />
            </div>
          </div>
        </div>
      </Section>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <Section className="text-center py-20 text-muted-foreground border border-dashed rounded-xl bg-muted/20">
          <Shield className="h-10 w-10 mx-auto text-zinc-400 mb-3" />
          <p className="text-lg font-medium">No pages or permissions found.</p>
          <p className="text-sm mt-1">Try clearing your search filters or select a different role.</p>
        </Section>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group) => {
            const isAllChecked = isGroupAllChecked(group.pages);
            
            return (
              <Section key={group.parentMenuName} className="bg-white border border-zinc-100 rounded-xl shadow-sm dark:bg-zinc-950 dark:border-white/5 overflow-hidden">
                {/* Group Header */}
                <div className="bg-zinc-50 border-b border-zinc-100 px-6 py-4 flex items-center justify-between dark:bg-zinc-900/50 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`group-chk-${group.parentMenuName}`}
                      checked={isAllChecked}
                      onChange={(e) => handleGroupToggle(group.pages, e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                    <label 
                      htmlFor={`group-chk-${group.parentMenuName}`}
                      className="text-lg font-bold text-zinc-800 dark:text-zinc-100 cursor-pointer hover:text-zinc-900 select-none"
                    >
                      {group.parentMenuName}
                    </label>
                  </div>
                </div>

                {/* Group Content */}
                <div className="divide-y divide-zinc-100 dark:divide-white/5 px-6">
                  {group.pages.map((p) => {
                    const perm = permissions[p.pageId] || {
                      canView: false,
                      canCreate: false,
                      canEdit: false,
                      canDelete: false
                    };

                    const uniqueKey = `${p.pageId}-${p.menuId || 'standalone'}`;

                    return (
                      <div key={uniqueKey} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition duration-150 px-2 rounded-lg">
                        {/* Page Name on the Left */}
                        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          {p.pageName}
                        </div>

                        {/* Inline Actions Grid */}
                        <div className="flex flex-wrap items-center gap-6 pl-7 md:pl-0">
                          {/* View */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`chk-view-${uniqueKey}`}
                              checked={perm.canView}
                              onChange={(e) => handleCheckboxChange(p.pageId, p.menuId || null, 'canView', e.target.checked)}
                              className="h-4.5 w-4.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            />
                            <label
                              htmlFor={`chk-view-${uniqueKey}`}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700 select-none"
                            >
                              View
                            </label>
                          </div>

                          {/* Create */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`chk-create-${uniqueKey}`}
                              checked={perm.canCreate}
                              onChange={(e) => handleCheckboxChange(p.pageId, p.menuId || null, 'canCreate', e.target.checked)}
                              className="h-4.5 w-4.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                            />
                            <label
                              htmlFor={`chk-create-${uniqueKey}`}
                              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer hover:text-emerald-700 select-none"
                            >
                              Create
                            </label>
                          </div>

                          {/* Edit */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`chk-edit-${uniqueKey}`}
                              checked={perm.canEdit}
                              onChange={(e) => handleCheckboxChange(p.pageId, p.menuId || null, 'canEdit', e.target.checked)}
                              className="h-4.5 w-4.5 rounded border-zinc-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                            />
                            <label
                              htmlFor={`chk-edit-${uniqueKey}`}
                              className="text-xs font-bold text-amber-500 dark:text-amber-400 cursor-pointer hover:text-amber-600 select-none"
                            >
                              Edit
                            </label>
                          </div>

                          {/* Delete */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`chk-delete-${uniqueKey}`}
                              checked={perm.canDelete}
                              onChange={(e) => handleCheckboxChange(p.pageId, p.menuId || null, 'canDelete', e.target.checked)}
                              className="h-4.5 w-4.5 rounded border-zinc-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                            />
                            <label
                              htmlFor={`chk-delete-${uniqueKey}`}
                              className="text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer hover:text-rose-700 select-none"
                            >
                              Delete
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            );
          })}
        </div>
      )}
    </Page>
  );
}
