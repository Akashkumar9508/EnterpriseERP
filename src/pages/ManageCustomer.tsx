import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Plus, Loader2, Users } from 'lucide-react';
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
import type { CustomerDto } from '@/types/CustomerDto';

export default function ManageCustomer() {
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/customer');
  const user = useAppSelector((state) => state.auth.user);

  const [customers, setCustomers] = useState<CustomerDto[]>([]);
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
    formState: { errors, isSubmitting },
  } = useForm<CustomerDto>();

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/Customer', {
        params: { pageNumber, pageSize, search }
      });
      if (response?.success) {
        if (response.data && response.data.items) {
          setCustomers(response.data.items || []);
          setTotalCount(response.data.totalCount || 0);
        } else {
          setCustomers(response.data || []);
          setTotalCount((response.data || []).length);
        }
      }
    } catch (error) {
      console.error('Failed to fetch customers', error);
      toast.error('Failed to load customers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchCustomers();
    }
  }, [canView, pageNumber, pageSize]);

  useEffect(() => {
    if (canView) {
      const delayDebounceFn = setTimeout(() => {
        if (pageNumber === 1) {
          fetchCustomers();
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
      gstNumber: '',
      phone: '',
      email: '',
      address: '',
      openingBalance: 0,
      creditLimit: 0,
    });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (cust: CustomerDto) => {
    reset({
      name: cust.name,
      code: cust.code || '',
      gstNumber: cust.gstNumber || '',
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      openingBalance: cust.openingBalance ?? 0,
      creditLimit: cust.creditLimit ?? 0,
    });
    setEditingId(cust.id || null);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: CustomerDto) => {
    try {
      const payload = {
        ...data,
        companyId: user?.companyId,
        branchId: user?.branchId,
        openingBalance: data.openingBalance ? Number(data.openingBalance) : 0,
        creditLimit: data.creditLimit ? Number(data.creditLimit) : 0,
      };

      let response: any;
      if (editingId) {
        response = await axiosClient.put('/Customer', { ...payload, id: editingId });
      } else {
        response = await axiosClient.post('/Customer', payload);
      }

      if (response?.success) {
        setIsDialogOpen(false);
        toast.success(editingId ? 'Customer updated successfully!' : 'Customer created successfully!');
        fetchCustomers();
      } else {
        toast.error(response?.message || 'Failed to save customer');
      }
    } catch (error: any) {
      console.error('Save error', error);
      toast.error(error?.message || 'An error occurred while saving.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const response: any = await axiosClient.delete(`/Customer/${id}`);
      if (response?.success) {
        toast.success('Customer deleted successfully!');
        fetchCustomers();
      } else {
        toast.error(response?.message || 'Failed to delete customer');
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
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground mt-1">Configure and manage company customers and retail clients.</p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Input
            type="search"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[300px]"
          />
          {canCreate && (
            <Button onClick={openCreateDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Customer
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
                <TableHead className="w-[200px]">Customer Name</TableHead>
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead className="w-[150px]">GST Number</TableHead>
                <TableHead className="w-[120px]">Phone</TableHead>
                <TableHead className="w-[150px]">Email</TableHead>
                <TableHead className="w-[120px] text-right">Opening Bal.</TableHead>
                <TableHead className="w-[120px] text-right">Credit Limit</TableHead>
                {(canEdit || canDelete) && <TableHead className="text-right w-[120px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((cust, index) => (
                  <TableRow key={cust.id}>
                    <TableCell className="font-medium">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-400" />
                      {cust.name}
                    </TableCell>
                    <TableCell>
                      {cust.code ? (
                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                          {cust.code}
                        </code>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{cust.gstNumber || '-'}</TableCell>
                    <TableCell>{cust.phone || '-'}</TableCell>
                    <TableCell>{cust.email || '-'}</TableCell>
                    <TableCell className="text-right font-mono">${(cust.openingBalance ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">${(cust.creditLimit ?? 0).toFixed(2)}</TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(cust)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          {canDelete && cust.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(cust.id!)}
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Customer' : 'Create Customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[75vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormField
                  label="Customer Name"
                  placeholder="e.g. John Doe"
                  {...register('name', { required: 'Customer name is required' })}
                />
                {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
              </div>
              <FormField
                label="Customer Code"
                placeholder="e.g. CUST001"
                {...register('code')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Phone"
                placeholder="e.g. +1234567890"
                {...register('phone')}
              />
              <FormField
                label="Email"
                type="email"
                placeholder="e.g. customer@domain.com"
                {...register('email')}
              />
            </div>

            <FormField
              label="GST Number"
              placeholder="e.g. 22AAAAA0000A1Z5"
              {...register('gstNumber')}
            />

            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium text-foreground">
                Address
              </label>
              <Input
                id="address"
                placeholder="e.g. 456 Elm St, Cityville"
                {...register('address')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Opening Balance ($)"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('openingBalance')}
              />
              <FormField
                label="Credit Limit ($)"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('creditLimit')}
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
                Save Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
