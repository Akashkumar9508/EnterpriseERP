import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Plus, Loader2, Briefcase } from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Switch } from '@/components/ui/switch';
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
import type { DesignationDto } from '@/types/DesignationDto';
import type { DepartmentDto } from '@/types/DepartmentDto';

export default function ManageDesignation() {
  const isMounted = useRef(false);
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/manage-designation');
  const user = useAppSelector((state) => state.auth.user);

  const [designations, setDesignations] = useState<DesignationDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
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
  } = useForm<DesignationDto>();

  const fetchDesignations = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/Designation', {
        params: { pageNumber, pageSize, search }
      });
      if (response?.success) {
        if (response.data && response.data.items) {
          setDesignations(response.data.items || []);
          setTotalCount(response.data.totalCount || 0);
        } else {
          setDesignations(response.data || []);
          setTotalCount((response.data || []).length);
        }
      }
    } catch (error) {
      console.error('Failed to fetch designations', error);
      toast.error('Failed to load designations.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response: any = await axiosClient.get('/Department', {
        params: { pageNumber: 1, pageSize: 10000 }
      });
      if (response?.success) {
        if (response.data && response.data.items) {
          setDepartments(response.data.items || []);
        } else {
          setDepartments(response.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch departments', error);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchDesignations();
    }
  }, [canView, pageNumber, pageSize]);

  useEffect(() => {
    if (canView) {
      fetchDepartments();
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
          fetchDesignations();
        } else {
          setPageNumber(1);
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [search]);

  const openCreateDialog = () => {
    reset({ name: '', description: '', departmentId: '', isActive: true });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (des: DesignationDto) => {
    reset({
      name: des.name,
      description: des.description || '',
      departmentId: des.departmentId,
      isActive: des.isActive,
    });
    setEditingId(des.id || null);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: DesignationDto) => {
    try {
      const payload = {
        ...data,
        companyId: user?.companyId,
      };

      let response: any;
      if (editingId) {
        response = await axiosClient.put('/Designation', { ...payload, id: editingId });
      } else {
        response = await axiosClient.post('/Designation', payload);
      }

      if (response?.success) {
        setIsDialogOpen(false);
        toast.success(editingId ? 'Designation updated successfully!' : 'Designation created successfully!');
        fetchDesignations();
      } else {
        toast.error(response?.message || 'Failed to save designation');
      }
    } catch (error: any) {
      console.error('Save error', error);
      toast.error(error?.message || 'An error occurred while saving.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this designation?')) return;

    try {
      const response: any = await axiosClient.delete(`/Designation/${id}`);
      if (response?.success) {
        toast.success('Designation deleted successfully!');
        fetchDesignations();
      } else {
        toast.error(response?.message || 'Failed to delete designation');
      }
    } catch (error: any) {
      console.error('Delete error', error);
      toast.error(error?.message || 'An error occurred while deleting.');
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
          <h1 className="text-3xl font-bold tracking-tight">Designation Management</h1>
          <p className="text-muted-foreground mt-1">Configure and manage corporate job designations.</p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Input
            type="search"
            placeholder="Search designations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[300px]"
          />
          {canCreate && (
            <Button onClick={openCreateDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Designation
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
                <TableHead className="w-[250px]">Designation Name</TableHead>
                <TableHead className="w-[200px]">Department</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
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
              ) : designations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No designations found.
                  </TableCell>
                </TableRow>
              ) : (
                designations.map((des, index) => (
                  <TableRow key={des.id}>
                    <TableCell className="font-medium">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-zinc-400" />
                      {des.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{des.departmentName || '-'}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {des.description || '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          des.isActive
                            ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                            : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {des.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(des)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          {canDelete && des.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(des.id!)}
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
            <DialogTitle>{editingId ? 'Edit Designation' : 'Create Designation'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              label="Designation Name"
              placeholder="e.g. Senior Software Engineer"
              {...register('name', { required: 'Designation name is required' })}
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}

            <div className="space-y-2">
              <label htmlFor="departmentId" className="text-sm font-medium text-foreground">
                Department
              </label>
              <Select
                value={watch('departmentId') || ''}
                onValueChange={(val) => setValue('departmentId', val)}
              >
                <SelectTrigger id="departmentId">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent side="bottom">
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id || ''}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && <span className="text-xs text-red-500">{errors.departmentId.message}</span>}
            </div>

            <FormField
              label="Description"
              placeholder="Designation description (optional)"
              {...register('description')}
            />

            <div className="flex items-center justify-between py-2">
              <label htmlFor="isActive" className="text-sm font-medium text-foreground">
                Status (Active)
              </label>
              <Switch
                id="isActive"
                checked={watch('isActive')}
                onCheckedChange={(checked) => setValue('isActive', checked)}
              />
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
              <Button type="submit" disabled={isSubmitting || !watch('departmentId')}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Designation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
