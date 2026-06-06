import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Plus, Loader2, Home } from 'lucide-react';
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
import type { WarehouseDto } from '@/types/WarehouseDto';
import type { CompanyDto } from '@/types/CompanyDto';
import type { BranchDto } from '@/types/BranchDto';

export default function ManageWarehouse() {
  const isMounted = useRef(false);
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/warehouse');
  const user = useAppSelector((state) => state.auth.user);

  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
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
  } = useForm<WarehouseDto>();

  const fetchWarehouses = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/Warehouse', {
        params: { pageNumber, pageSize, search }
      });
      if (response?.success) {
        if (response.data && response.data.items) {
          setWarehouses(response.data.items || []);
          setTotalCount(response.data.totalCount || 0);
        } else {
          setWarehouses(response.data || []);
          setTotalCount((response.data || []).length);
        }
      }
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
      toast.error('Failed to load warehouses.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response: any = await axiosClient.get('/Company');
      if (response?.success) {
        setCompanies(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch companies', error);
    }
  };

  const fetchBranchesForCompany = async (compId: string) => {
    if (!compId) {
      setBranches([]);
      return;
    }
    try {
      const response: any = await axiosClient.get('/Branch', {
        params: { pageNumber: 1, pageSize: 1000, companyId: compId }
      });
      if (response?.success) {
        setBranches(response.data?.items || response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch branches', error);
      setBranches([]);
    }
  };

  const companyIdWatch = watch('companyId');
  useEffect(() => {
    if (companyIdWatch) {
      fetchBranchesForCompany(companyIdWatch);
    } else {
      setBranches([]);
    }
  }, [companyIdWatch]);

  useEffect(() => {
    if (canView) {
      fetchWarehouses();
      fetchCompanies();
    }
  }, [canView, pageNumber, pageSize]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (canView) {
      const delayDebounceFn = setTimeout(() => {
        if (pageNumber === 1) {
          fetchWarehouses();
        } else {
          setPageNumber(1);
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [search]);

  const openCreateDialog = () => {
    reset({
      name: '',
      code: '',
      phone: '',
      address: '',
      companyId: user?.companyId || '',
      branchId: user?.branchId || '',
    });
    if (user?.companyId) {
      fetchBranchesForCompany(user.companyId);
    } else {
      setBranches([]);
    }
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (wh: WarehouseDto) => {
    reset({
      name: wh.name,
      code: wh.code || '',
      phone: wh.phone || '',
      address: wh.address || '',
      companyId: wh.companyId,
      branchId: wh.branchId,
    });
    if (wh.companyId) {
      fetchBranchesForCompany(wh.companyId);
    } else {
      setBranches([]);
    }
    setEditingId(wh.id || null);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: WarehouseDto) => {
    try {
      const payload = {
        ...data,
        companyId: data.companyId,
        branchId: data.branchId,
      };

      let response: any;
      if (editingId) {
        response = await axiosClient.put('/Warehouse', { ...payload, id: editingId });
      } else {
        response = await axiosClient.post('/Warehouse', payload);
      }

      if (response?.success) {
        setIsDialogOpen(false);
        toast.success(editingId ? 'Warehouse updated successfully!' : 'Warehouse created successfully!');
        fetchWarehouses();
      } else {
        toast.error(response?.message || 'Failed to save warehouse');
      }
    } catch (error: any) {
      console.error('Save error', error);
      toast.error(error?.message || 'An error occurred while saving.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;

    try {
      const response: any = await axiosClient.delete(`/Warehouse/${id}`);
      if (response?.success) {
        toast.success('Warehouse deleted successfully!');
        fetchWarehouses();
      } else {
        toast.error(response?.message || 'Failed to delete warehouse');
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
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Management</h1>
          <p className="text-muted-foreground mt-1">Configure and manage company warehouses / store locations.</p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Input
            type="search"
            placeholder="Search warehouses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[300px]"
          />
          {canCreate &&  (
            <Button onClick={openCreateDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Warehouse
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
                <TableHead className="w-[200px]">Warehouse Name</TableHead>
                <TableHead className="w-[150px]">Code</TableHead>
                <TableHead className="w-[150px]">Company</TableHead>
                <TableHead className="w-[150px]">Branch</TableHead>
                <TableHead className="w-[150px]">Phone</TableHead>
                <TableHead>Address</TableHead>
                {(canEdit || canDelete) && <TableHead className="text-right w-[120px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : warehouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No warehouses found.
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map((wh, index) => (
                  <TableRow key={wh.id}>
                    <TableCell className="font-medium">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Home className="h-4 w-4 text-zinc-400" />
                      {wh.name}
                    </TableCell>
                    <TableCell>
                      {wh.code ? (
                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                          {wh.code}
                        </code>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground">{wh.companyName || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span>{wh.branchName || '-'}</span>
                    </TableCell>
                    <TableCell>{wh.phone || '-'}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px]" title={wh.address}>
                      {wh.address || '-'}
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(wh)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          {canDelete && wh.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(wh.id!)}
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
            <DialogTitle>{editingId ? 'Edit Warehouse' : 'Create Warehouse'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="companyId" className="text-sm font-medium text-foreground">
                Company
              </label>
              <Select
                value={watch('companyId') || ''}
                onValueChange={(val) => {
                  setValue('companyId', val, { shouldValidate: true });
                  setValue('branchId', ''); // Reset branch on company change
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Company" />
                </SelectTrigger>
                <SelectContent side="top">
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id || ''}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="branchId" className="text-sm font-medium text-foreground">
                Branch
              </label>
              <Select
                value={watch('branchId') || ''}
                onValueChange={(val) => setValue('branchId', val, { shouldValidate: true })}
                disabled={!watch('companyId')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={watch('companyId') ? "Select Branch" : "Select a company first"} />
                </SelectTrigger>
                <SelectContent side="top">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id || ''}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <FormField
              label="Warehouse Name"
              placeholder="e.g. Central Warehouse"
              {...register('name', { required: 'Warehouse name is required' })}
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}

            <FormField
              label="Warehouse Code"
              placeholder="e.g. WH01"
              {...register('code')}
            />

            <FormField
              label="Phone"
              placeholder="e.g. +1234567890"
              {...register('phone')}
            />

            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium text-foreground">
                Address
              </label>
              <Input
                id="address"
                placeholder="e.g. 789 Storage Rd"
                {...register('address')}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Warehouse
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
