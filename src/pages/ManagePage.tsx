import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import axiosClient from '@/Services/axiosClient';
import { usePermissions } from '@/hooks/usePermissions';
import type { PageDto } from '@/types/PageDto';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function ManagePage() {
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/manage-page');
  const [pages, setPages] = useState<PageDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination & Search state
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<PageDto>();

  const fetchPages = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/Page', {
        params: { pageNumber, pageSize, search }
      });
      if (response?.success) {
        // Handle both paginated object and simple array responses
        if (response.data && response.data.items) {
          setPages(response.data.items);
          setTotalCount(response.data.totalCount || 0);
        } else {
          setPages(response.data || []);
          setTotalCount((response.data || []).length);
        }
      }
    } catch (error) {
      console.error('Failed to fetch pages', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchPages();
    }
  }, [canView, pageNumber, pageSize]); // Add dependencies so it refetches when pagination changes

  // Add a debounced search effect
  useEffect(() => {
    if (canView) {
      const delayDebounceFn = setTimeout(() => {
        if (pageNumber === 1) {
          fetchPages();
        } else {
          setPageNumber(1); // Reset to page 1 on search
        }
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [search]);

  const openCreateDialog = () => {
    reset({ name: '', route: '', icon: '', component: '', sortOrder: 0, isActive: true });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (page: PageDto) => {
    reset({ 
      name: page.name, 
      route: page.route, 
      icon: page.icon || '', 
      component: page.component || '', 
      sortOrder: page.sortOrder || 0, 
      isActive: page.isActive ?? true 
    });
    setEditingId(page.id || null);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: PageDto) => {
    try {
      const payload = { ...data, id: editingId };
      let response: any;
      
      if (editingId) {

        console.log(editingId);
        
        response = await axiosClient.put('/Page', payload);
      } else {
        response = await axiosClient.post('/Page', payload);
      }
      
      if (response?.success) {
        setIsDialogOpen(false);
        toast.success(editingId ? 'Page updated successfully!' : 'Page created successfully!');
        fetchPages();
      } else {
        toast.error(response?.message || 'Failed to save page');
      }
    } catch (error: any) {
      console.error('Save error', error);
      toast.error(error?.message || 'An error occurred while saving the page.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    
    try {
      const response: any = await axiosClient.delete(`/Page/${id}`);
      if (response?.success) {
        toast.success('Page deleted successfully!');
        fetchPages();
      } else {
        toast.error(response?.message || 'Failed to delete page');
      }
    } catch (error: any) {
      console.error('Delete error', error);
      toast.error(error?.message || 'An error occurred while deleting the page.');
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Manage Pages</h1>
          <p className="text-muted-foreground mt-1">Create and configure dynamic pages and routes.</p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Input 
            type="search" 
            placeholder="Search pages..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[300px]"
          />
          {canCreate && (
            <Button onClick={openCreateDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Page
            </Button>
          )}
        </div>
      </Section>

      <Section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[80px]">Sr. No.</TableHead>
                <TableHead className="w-[200px]">Page Name</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                {(canEdit || canDelete) && <TableHead className="text-right w-[150px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No pages found.
                  </TableCell>
                </TableRow>
              ) : (
                pages.map((page, index) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{page.name}</TableCell>
                    <TableCell>
                      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                        {page.route}
                      </code>
                    </TableCell>
                    <TableCell>{page.sortOrder}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${page.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {page.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(page)} title="Edit">
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          {canDelete && page.id && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(page.id!)} title="Delete">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="py-4 px-6 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <p>Rows per page</p>
              <Select 
                value={pageSize.toString()} 
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPageNumber(1); // Reset to page 1 when changing page size
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); if(pageNumber > 1) setPageNumber(pageNumber - 1); }} 
                    className={pageNumber === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {/* Generate page links */}
                {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink 
                      href="#" 
                      isActive={pageNumber === page}
                      onClick={(e) => { e.preventDefault(); setPageNumber(page); }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); if(pageNumber < Math.ceil(totalCount / pageSize)) setPageNumber(pageNumber + 1); }} 
                    className={pageNumber >= Math.ceil(totalCount / pageSize) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Page' : 'Create New Page'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              label="Page Name"
              placeholder="e.g. Manage Product"
              {...register('name', { required: 'Page name is required' })}
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
            
            <FormField
              label="Route"
              placeholder="e.g. /product"
              {...register('route', { required: 'Route is required' })}
            />
            {errors.route && <span className="text-xs text-red-500">{errors.route.message}</span>}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Icon (Lucide name)"
                placeholder="e.g. LayoutGrid"
                {...register('icon')}
              />
              <FormField
                label="Sort Order"
                type="number"
                {...register('sortOrder', { valueAsNumber: true })}
              />
            </div>

            <FormField
              label="Component Path"
              placeholder="e.g. /pages/Dashboard"
              {...register('component')}
            />

            <div className="flex items-center space-x-2 pt-2 pb-2">
              <Switch
                id="isActive"
                checked={watch('isActive')}
                onCheckedChange={(val) => setValue('isActive', val)}
              />
              <label htmlFor="isActive" className="text-sm font-medium leading-none cursor-pointer">
                Is Active
              </label>
            </div>
            
            <DialogFooter className="mt-6 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Page
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
