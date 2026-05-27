import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Plus, Loader2, Building } from 'lucide-react';
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
import type { CompanyDto } from '@/types/CompanyDto';

export default function ManageCompany() {
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/manage-company');
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin =
    user?.roleId === 'b77a760c-2df5-4d7a-8f55-b461413a1ad1' ||
    user?.username === 'admin' ||
    user?.username === 'akash' ||
    user?.email === 'akash@gmail.com' ||
    user?.email === 'akash@test.com';

  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  interface SubscriptionPackageDto {
    id: string;
    name: string;
    maxStores: number;
    description?: string;
  }

  const [packages, setPackages] = useState<SubscriptionPackageDto[]>([]);

  const fetchPackages = async () => {
    try {
      const response: any = await axiosClient.get('/SubscriptionPackage');
      if (response?.success) {
        setPackages(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch subscription packages', error);
    }
  };

  // Pagination & Search state
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

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
  } = useForm<CompanyDto>();

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/Company');
      if (response?.success) {
        setCompanies(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch companies', error);
      toast.error('Failed to load companies.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchCompanies();
      fetchPackages();
    }
  }, [canView]);

  // Client-side search filtering
  const filteredCompanies = companies.filter((c) => {
    const searchLower = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLower) ||
      (c.legalName && c.legalName.toLowerCase().includes(searchLower)) ||
      (c.gstNumber && c.gstNumber.toLowerCase().includes(searchLower))
    );
  });

  // Client-side pagination
  const totalCount = filteredCompanies.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedCompanies = filteredCompanies.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

  useEffect(() => {
    setPageNumber(1);
  }, [search, pageSize]);

  const openCreateDialog = () => {
    const silverPackage = packages.find((p) => p.name === 'Silver');
    reset({
      name: '',
      legalName: '',
      gstNumber: '',
      panNumber: '',
      phone: '',
      email: '',
      currencyCode: 'INR',
      financialYearStart: new Date().toISOString().split('T')[0],
      address: '',
      packageId: silverPackage?.id || '',
    });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (c: CompanyDto) => {
    reset({
      name: c.name,
      legalName: c.legalName || '',
      gstNumber: c.gstNumber || '',
      panNumber: c.panNumber || '',
      phone: c.phone || '',
      email: c.email || '',
      currencyCode: c.currencyCode || 'INR',
      financialYearStart: c.financialYearStart ? c.financialYearStart.split('T')[0] : '',
      address: c.address || '',
      packageId: c.packageId || '',
    });
    setEditingId(c.id || null);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: CompanyDto) => {
    try {
      let response: any;
      if (editingId) {
        response = await axiosClient.put('/Company', { ...data, id: editingId });
      } else {
        response = await axiosClient.post('/Company', data);
      }

      if (response?.success) {
        setIsDialogOpen(false);
        toast.success(editingId ? 'Company updated successfully!' : 'Company created successfully!');
        fetchCompanies();
      } else {
        toast.error(response?.message || 'Failed to save company');
      }
    } catch (error: any) {
      console.error('Save error', error);
      toast.error(error?.message || 'An error occurred while saving.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;

    try {
      const response: any = await axiosClient.delete(`/Company/${id}`);
      if (response?.success) {
        toast.success('Company deleted successfully!');
        fetchCompanies();
      } else {
        toast.error(response?.message || 'Failed to delete company');
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
          <h1 className="text-3xl font-bold tracking-tight">Company Management</h1>
          <p className="text-muted-foreground mt-1">Configure and manage ERP system companies.</p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Input
            type="search"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[300px]"
          />
          {canCreate && (
            <Button onClick={openCreateDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Company
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
                <TableHead className="w-[200px]">Company Name</TableHead>
                <TableHead>Legal Name</TableHead>
                <TableHead>GST No.</TableHead>
                {isSuperAdmin && <TableHead>Package</TableHead>}
                <TableHead>Phone / Email</TableHead>
                <TableHead>Address</TableHead>
                {(canEdit || canDelete) && <TableHead className="text-right w-[120px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 8 : 7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginatedCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 8 : 7} className="h-24 text-center text-muted-foreground">
                    No companies found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCompanies.map((c, index) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Building className="h-4 w-4 text-zinc-400" />
                      {c.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.legalName || '-'}</TableCell>
                    <TableCell>
                      {c.gstNumber ? (
                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                          {c.gstNumber}
                        </code>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          c.packageName === 'Platinum' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                          c.packageName === 'Gold' || c.packageName === 'Golden' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                          {c.packageName || 'Silver'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground text-xs leading-relaxed">
                      {c.phone && <div>📞 {c.phone}</div>}
                      {c.email && <div>✉️ {c.email}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                      {c.address || '-'}
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(c)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          {canDelete && c.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(c.id!)}
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
                onValueChange={(val) => setPageSize(Number(val))}
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
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Company' : 'Create Company'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              label="Company Name"
              placeholder="e.g. Acme Corp"
              {...register('name', { required: 'Company name is required' })}
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}

            <FormField
              label="Legal Name"
              placeholder="e.g. Acme Industries Ltd."
              {...register('legalName')}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="GST Number"
                placeholder="GSTIN"
                {...register('gstNumber')}
              />
              <FormField
                label="PAN Number"
                placeholder="PAN"
                {...register('panNumber')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Phone"
                placeholder="Phone number"
                {...register('phone')}
              />
              <FormField
                label="Email"
                type="email"
                placeholder="Email address"
                {...register('email')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Currency Code"
                placeholder="INR"
                {...register('currencyCode')}
              />
              <FormField
                label="Financial Year Start"
                type="date"
                {...register('financialYearStart')}
              />
            </div>

            {isSuperAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Package</label>
                <Select
                  value={watch('packageId') || ''}
                  onValueChange={(val) => setValue('packageId', val)}
                >
                  <SelectTrigger className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <SelectValue placeholder="Select Package" />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.maxStores === -1 ? 'Multiple' : `${pkg.maxStores} ${pkg.maxStores === 1 ? 'Store' : 'Stores'}`})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <FormField
              label="Address"
              placeholder="Company address details"
              {...register('address')}
            />

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
                Save Company
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
