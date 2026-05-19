import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Plus, Loader2, ArrowUp, ArrowDown, MinusCircle, PlusCircle, Circle } from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import axiosClient from '@/Services/axiosClient';
import { usePermissions } from '@/hooks/usePermissions';
import type { MenuDto } from '@/types/MenuDto';
import type { PageDto } from '@/types/PageDto';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MenuNode extends MenuDto {
  children: MenuNode[];
}

export default function ManageMenu() {
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/manage-menu');
  const [flatMenus, setFlatMenus] = useState<MenuDto[]>([]);
  const [treeData, setTreeData] = useState<MenuNode[]>([]);
  const [pages, setPages] = useState<PageDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<MenuDto>();

  const fetchMenus = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/Menu');
      if (response?.success) {
        const menus = response.data || [];
        setFlatMenus(menus);
        buildTree(menus);
      }
    } catch (error) {
      console.error('Failed to fetch menus', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPages = async () => {
    try {
      // Fetch all pages (large page size) for the dropdown
      const response: any = await axiosClient.get('/Page', { params: { pageSize: 1000 } });
      if (response?.success) {
        if (response.data && response.data.items) {
          setPages(response.data.items);
        } else {
          setPages(response.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch pages', error);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchMenus();
      fetchPages();
    }
  }, [canView]);

  const buildTree = (menus: MenuDto[]) => {
    const map = new Map<string, MenuNode>();
    menus.forEach(m => map.set(m.id!, { ...m, children: [] }));
    
    const tree: MenuNode[] = [];
    map.forEach(m => {
      if (m.parentId && map.has(m.parentId)) {
        map.get(m.parentId)!.children.push(m);
      } else {
        tree.push(m);
      }
    });
    
    // Sort
    const sortFunc = (a: MenuNode, b: MenuNode) => a.sortOrder - b.sortOrder;
    tree.sort(sortFunc);
    map.forEach(m => m.children.sort(sortFunc));
    
    setTreeData(tree);
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openCreateDialog = (parentId: string | null = null) => {
    reset({ 
      name: '', 
      parentId: parentId, 
      pageId: null, 
      icon: '', 
      sortOrder: 0, 
      isVisible: true, 
      isActive: true 
    });
    setEditingId(null);
    setIsDialogOpen(true);
    
    // If we're adding a child, make sure parent is expanded
    if (parentId) {
        setExpandedNodes(prev => new Set(prev).add(parentId));
    }
  };

  const openEditDialog = (menu: MenuDto) => {
    reset({ 
      name: menu.name, 
      parentId: menu.parentId, 
      pageId: menu.pageId, 
      icon: menu.icon || '', 
      sortOrder: menu.sortOrder || 0, 
      isVisible: menu.isVisible ?? true,
      isActive: menu.isActive ?? true 
    });
    setEditingId(menu.id || null);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: MenuDto) => {
    try {
      // Clean up empty string IDs to null for API
      const payload = { 
        ...data, 
        id: editingId,
        parentId: data.parentId === "" ? null : data.parentId,
        pageId: data.pageId === "" ? null : data.pageId,
      };
      
      let response: any;
      if (editingId) {
        response = await axiosClient.put('/Menu', payload);
      } else {
        response = await axiosClient.post('/Menu', payload);
      }
      
      if (response?.success) {
        setIsDialogOpen(false);
        toast.success(editingId ? 'Menu updated successfully!' : 'Menu created successfully!');
        fetchMenus();
      } else {
        toast.error(response?.message || 'Failed to save menu');
      }
    } catch (error: any) {
      console.error('Save error', error);
      toast.error(error?.message || 'An error occurred while saving the menu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu? This might also delete its children.')) return;
    
    try {
      const response: any = await axiosClient.delete(`/Menu/${id}`);
      if (response?.success) {
        toast.success('Menu deleted successfully!');
        fetchMenus();
      } else {
        toast.error(response?.message || 'Failed to delete menu');
      }
    } catch (error: any) {
      console.error('Delete error', error);
      toast.error(error?.message || 'An error occurred while deleting the menu.');
    }
  };

  const handleMove = async (menu: MenuDto, direction: 'up' | 'down') => {
    // Find siblings
    const siblings = flatMenus
      .filter(m => m.parentId === menu.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
      
    const index = siblings.findIndex(m => m.id === menu.id);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      const swapMenu = siblings[index - 1];
      // Swap sort orders
      const tempOrder = menu.sortOrder;
      menu.sortOrder = swapMenu.sortOrder;
      swapMenu.sortOrder = tempOrder;
      
      await updateSortOrders([menu, swapMenu]);
    } else if (direction === 'down' && index < siblings.length - 1) {
      const swapMenu = siblings[index + 1];
      // Swap sort orders
      const tempOrder = menu.sortOrder;
      menu.sortOrder = swapMenu.sortOrder;
      swapMenu.sortOrder = tempOrder;
      
      await updateSortOrders([menu, swapMenu]);
    }
  };

  const updateSortOrders = async (menusToUpdate: MenuDto[]) => {
    setIsLoading(true);
    try {
      // Execute PUT sequentially to avoid issues
      for (const menu of menusToUpdate) {
        await axiosClient.put('/Menu', menu);
      }
      fetchMenus();
    } catch (error) {
      console.error('Failed to update order', error);
      toast.error('Failed to reorder menus');
      fetchMenus(); // refresh state to original
    } finally {
      setIsLoading(false);
    }
  };

  const getVisibleRows = (nodes: MenuNode[], level = 0): { node: MenuNode; level: number; isFirst: boolean; isLast: boolean }[] => {
    let rows: { node: MenuNode; level: number; isFirst: boolean; isLast: boolean }[] = [];
    nodes.forEach((node, index) => {
      rows.push({ 
        node, 
        level, 
        isFirst: index === 0, 
        isLast: index === nodes.length - 1 
      });
      if (expandedNodes.has(node.id!) && node.children.length > 0) {
        rows = rows.concat(getVisibleRows(node.children, level + 1));
      }
    });
    return rows;
  };

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
      <Section className="mb-4 flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Menus</h1>
          <p className="text-muted-foreground mt-1">Configure sidebar navigation hierarchy.</p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          {canCreate && (
            <Button onClick={() => openCreateDialog(null)} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Root Menu
            </Button>
          )}
        </div>
      </Section>

      <Section className="bg-card border border-border rounded-xl shadow-sm p-6 overflow-hidden min-h-[400px]">
        {isLoading && flatMenus.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : treeData.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No menus found. Create a root menu to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[300px]">Menu Name</TableHead>
                  <TableHead>Linked Page</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  {(canEdit || canDelete || canCreate) && <TableHead className="text-right w-[200px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {getVisibleRows(treeData).map(({ node, level, isFirst, isLast }) => {
                  const isExpanded = expandedNodes.has(node.id!);
                  const hasChildren = node.children.length > 0;
                  
                  return (
                    <TableRow key={node.id} className="group">
                      <TableCell style={{ paddingLeft: `${level * 1.5 + 1}rem` }}>
                        <div className="flex items-center">
                          {level > 0 && (
                            <div className="text-muted-foreground mr-2 opacity-50">↳</div>
                          )}
                          <div 
                            className="mr-2 cursor-pointer text-muted-foreground flex items-center justify-center bg-transparent z-10"
                            onClick={() => hasChildren && toggleExpand(node.id!)}
                          >
                            {hasChildren ? (
                              isExpanded ? (
                                <MinusCircle className="h-4 w-4 text-primary" />
                              ) : (
                                <PlusCircle className="h-4 w-4 text-primary" />
                              )
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground opacity-30" />
                            )}
                          </div>
                          <span className="font-medium">{node.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {node.pageId ? (
                          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                            {pages.find(p => p.id === node.pageId)?.name || 'Linked'}
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Folder</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${node.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {node.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>{node.sortOrder}</TableCell>
                      
                      {(canEdit || canDelete || canCreate) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {canCreate && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" 
                                onClick={() => openCreateDialog(node.id)}
                                title="Add Sub-Menu"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            {canEdit && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={() => handleMove(node, 'up')}
                                  disabled={isFirst}
                                  title="Move Up"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={() => handleMove(node, 'down')}
                                  disabled={isLast}
                                  title="Move Down"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" 
                                  onClick={() => openEditDialog(node)}
                                  title="Edit Menu"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {canDelete && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" 
                                onClick={() => handleDelete(node.id!)}
                                title="Delete Menu"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Menu' : 'Create New Menu'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              label="Menu Name"
              placeholder="e.g. Master Entry"
              {...register('name', { required: 'Menu name is required' })}
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Parent Menu</label>
              <Select 
                value={watch('parentId') || "none"} 
                onValueChange={(val) => setValue('parentId', val === "none" ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent menu (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- No Parent (Root) --</SelectItem>
                  {flatMenus.filter(m => m.id !== editingId).map((menu) => (
                    <SelectItem key={menu.id} value={menu.id!}>
                      {menu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Linked Page</label>
              <Select 
                value={watch('pageId') || "none"} 
                onValueChange={(val) => setValue('pageId', val === "none" ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a page to route to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- No Link (Folder) --</SelectItem>
                  {pages.map((page) => (
                    <SelectItem key={page.id} value={page.id!}>
                      {page.name} ({page.route})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Icon (Lucide name)"
                placeholder="e.g. Users"
                {...register('icon')}
              />
              <FormField
                label="Sort Order"
                type="number"
                {...register('sortOrder', { valueAsNumber: true })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 pb-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isVisible"
                  checked={watch('isVisible')}
                  onCheckedChange={(val) => setValue('isVisible', val)}
                />
                <label htmlFor="isVisible" className="text-sm font-medium leading-none cursor-pointer">
                  Is Visible
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={watch('isActive')}
                  onCheckedChange={(val) => setValue('isActive', val)}
                />
                <label htmlFor="isActive" className="text-sm font-medium leading-none cursor-pointer">
                  Is Active
                </label>
              </div>
            </div>
            
            <DialogFooter className="mt-6 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Menu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
