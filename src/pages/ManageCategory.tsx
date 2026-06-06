import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Plus, Loader2, FolderTree } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import axiosClient from '@/Services/axiosClient';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import type { CategoryDto } from '@/types/CategoryDto';

export default function ManageCategory() {
  const isMounted = useRef(false);
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/category');
  const user = useAppSelector((state) => state.auth.user);

  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Search state
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / pageSize);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryDto>();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/Category', {
        params: { pageNumber, pageSize, search }
      });
      if (response?.success) {
        if (response.data && response.data.items) {
          setCategories(response.data.items || []);
          setTotalCount(response.data.totalCount || 0);
        } else {
          setCategories(response.data || []);
          setTotalCount((response.data || []).length);
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
      toast.error('Failed to load categories.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllCategories = async () => {
    try {
      const response: any = await axiosClient.get('/Category', {
        params: { pageNumber: 1, pageSize: 10000 }
      });
      if (response?.success) {
        if (response.data && response.data.items) {
          setAllCategories(response.data.items || []);
        } else {
          setAllCategories(response.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch all categories', error);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchCategories();
    }
  }, [canView, pageNumber, pageSize]);

  useEffect(() => {
    if (canView) {
      fetchAllCategories();
    }
  }, [canView]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (canView) {
      const delayDebounceFn = setTimeout(() => {
        if (pageNumber === 1) {
          fetchCategories();
        } else {
          setPageNumber(1);
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [search]);

  const openCreateDialog = () => {
    reset({ name: '', code: '', parentCategoryId: null });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (cat: CategoryDto) => {
    reset({
      name: cat.name,
      code: cat.code || '',
      parentCategoryId: cat.parentCategoryId || null,
    });
    setEditingId(cat.id || null);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: CategoryDto) => {
    try {
      // Calculate level number
      let levelNo = 1;
      if (data.parentCategoryId) {
        const parent = allCategories.find((c) => c.id === data.parentCategoryId);
        if (parent) {
          levelNo = parent.levelNo + 1;
        }
      }

      const payload = {
        ...data,
        companyId: user?.companyId,
        branchId: user?.branchId,
        levelNo,
      };

      let response: any;
      if (editingId) {
        response = await axiosClient.put('/Category', { ...payload, id: editingId });
      } else {
        response = await axiosClient.post('/Category', payload);
      }

      if (response?.success) {
        setIsDialogOpen(false);
        toast.success(editingId ? 'Category updated successfully!' : 'Category created successfully!');
        fetchCategories();
        fetchAllCategories();
      } else {
        toast.error(response?.message || 'Failed to save category');
      }
    } catch (error: any) {
      console.error('Save error', error);
      toast.error(error?.message || 'An error occurred while saving the category.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const response: any = await axiosClient.delete(`/Category/${id}`);
      if (response?.success) {
        toast.success('Category deleted successfully!');
        fetchCategories();
        fetchAllCategories();
      } else {
        toast.error(response?.message || 'Failed to delete category');
      }
    } catch (error: any) {
      console.error('Delete error', error);
      toast.error(error?.message || 'An error occurred while deleting the category.');
    }
  };

  const getParentName = (parentId: string | null | undefined) => {
    if (!parentId) return '-';
    const parent = allCategories.find((c) => c.id === parentId);
    return parent ? `${parent.name} (${parent.code || 'No Code'})` : '-';
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
          <h1 className="text-3xl font-bold tracking-tight">Category Management</h1>
          <p className="text-muted-foreground mt-1">Organize and structure system product categories.</p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Input
            type="search"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[300px]"
          />
          {canCreate && (
            <Button onClick={openCreateDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Category
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
                <TableHead className="w-[250px]">Category Name</TableHead>
                <TableHead className="w-[150px]">Category Code</TableHead>
                <TableHead className="w-[250px]">Parent Category</TableHead>
                <TableHead>Nesting Level</TableHead>
                {(canEdit || canDelete) && <TableHead className="text-right w-[120px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No categories found.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat, index) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-zinc-400" />
                      {cat.name}
                    </TableCell>
                    <TableCell>
                      {cat.code ? (
                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                          {cat.code}
                        </code>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{getParentName(cat.parentCategoryId)}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                        Level {cat.levelNo}
                      </span>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(cat)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          {canDelete && cat.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(cat.id!)}
                              title="Delete"
                            >
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

        {totalCount > 0 && (
          <div className="py-4 px-6 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <p>Rows per page</p>
              <Select
                value={pageSize.toString()}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPageNumber(1);
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
                    onClick={(e) => {
                      e.preventDefault();
                      if (pageNumber > 1) setPageNumber(pageNumber - 1);
                    }}
                    className={pageNumber === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === page}
                      onClick={(e) => {
                        e.preventDefault();
                        setPageNumber(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (pageNumber < totalPages) setPageNumber(pageNumber + 1);
                    }}
                    className={pageNumber >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
            <DialogTitle>{editingId ? 'Edit Category' : 'Create New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              label="Category Name"
              placeholder="e.g. Laptops"
              {...register('name', { required: 'Category name is required' })}
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}

            <FormField
              label="Category Code"
              placeholder="e.g. LPT"
              {...register('code', { required: 'Category code is required' })}
            />
            {errors.code && <span className="text-xs text-red-500">{errors.code.message}</span>}

            <div className="space-y-2">
              <label htmlFor="parentCategoryId" className="text-sm font-medium text-foreground">
                Parent Category (Optional)
              </label>
              <Select
                value={watch('parentCategoryId') || 'none'}
                onValueChange={(val) => setValue('parentCategoryId', val === 'none' ? null : val)}
              >
                <SelectTrigger id="parentCategoryId">
                  <SelectValue placeholder="Root Category" />
                </SelectTrigger>
                <SelectContent side="bottom">
                  <SelectItem value="none">Root (No Parent)</SelectItem>
                  {allCategories
                    .filter((c) => c.id !== editingId)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id || ''}>
                        {cat.name} {cat.code ? `(${cat.code})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
