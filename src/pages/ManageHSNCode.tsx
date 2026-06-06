import { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Pencil, Trash2, Plus, Loader2, Binary } from 'lucide-react';
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
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import type { HSNCodeDto } from '@/types/HSNCodeDto';
import type { TaxProfileDto } from '@/types/TaxProfileDto';

export default function ManageHSNCode() {
  const isMounted = useRef(false);
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/hsncode');

  const [hsnCodes, setHsnCodes] = useState<HSNCodeDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [taxProfiles, setTaxProfiles] = useState<TaxProfileDto[]>([]);
  const [isTaxProfileLoading, setIsTaxProfileLoading] = useState(false);

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
    control,
    formState: { errors, isSubmitting },
  } = useForm<HSNCodeDto>();

  const fetchHsnCodes = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/HSNCode', {
        params: { pageNumber, pageSize, search }
      });
      if (response?.success) {
        if (response.data && response.data.items) {
          setHsnCodes(response.data.items || []);
          setTotalCount(response.data.totalCount || 0);
        } else {
          setHsnCodes(response.data || []);
          setTotalCount((response.data || []).length);
        }
      }
    } catch (error) {
      console.error('Failed to fetch HSN codes', error);
      toast.error('Failed to load HSN codes.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTaxProfiles = async () => {
    setIsTaxProfileLoading(true);
    try {
      const response: any = await axiosClient.get('/TaxProfile', {
        params: { pageNumber: 1, pageSize: 10000 }
      });
      if (response?.success) {
        if (response.data && response.data.items) {
          setTaxProfiles(response.data.items || []);
        } else {
          setTaxProfiles(response.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tax profiles', error);
      toast.error('Failed to load tax profiles.');
    } finally {
      setIsTaxProfileLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchHsnCodes();
    }
  }, [canView, pageNumber, pageSize]);

  useEffect(() => {
    if (canView) {
      fetchTaxProfiles();
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
          fetchHsnCodes();
        } else {
          setPageNumber(1);
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [search]);

  const openCreateDialog = () => {
    reset({ code: '', description: '', taxProfileId: undefined });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (hsn: HSNCodeDto) => {
    reset({
      code: hsn.code,
      description: hsn.description || '',
      taxProfileId: hsn.taxProfileId || undefined,
    });
    setEditingId(hsn.id || null);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: HSNCodeDto) => {
    try {
      const payload = {
        code: data.code,
        description: data.description,
        taxProfileId: data.taxProfileId || null,
      };

      let response: any;
      if (editingId) {
        response = await axiosClient.put('/HSNCode', { ...payload, id: editingId });
      } else {
        response = await axiosClient.post('/HSNCode', payload);
      }

      if (response?.success) {
        setIsDialogOpen(false);
        toast.success(editingId ? 'HSN Code updated successfully!' : 'HSN Code created successfully!');
        fetchHsnCodes();
      } else {
        toast.error(response?.message || 'Failed to save HSN Code');
      }
    } catch (error: any) {
      console.error('Save error', error);
      toast.error(error?.message || 'An error occurred while saving.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this HSN Code?')) return;

    try {
      const response: any = await axiosClient.delete(`/HSNCode/${id}`);
      if (response?.success) {
        toast.success('HSN Code deleted successfully!');
        fetchHsnCodes();
      } else {
        toast.error(response?.message || 'Failed to delete HSN Code');
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
          <h1 className="text-3xl font-bold tracking-tight">HSN Code Management</h1>
          <p className="text-muted-foreground mt-1">Configure and manage HSN codes and their corresponding GST percentages.</p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Input
            type="search"
            placeholder="Search HSN codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[300px]"
          />
          {canCreate && (
            <Button onClick={openCreateDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add HSN Code
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
                <TableHead className="w-[200px]">HSN Code</TableHead>
                <TableHead className="w-[220px]">GST Slab</TableHead>
                <TableHead>Description</TableHead>
                {(canEdit || canDelete) && <TableHead className="text-right w-[120px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : hsnCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No HSN codes found.
                  </TableCell>
                </TableRow>
              ) : (
                hsnCodes.map((hsn, index) => (
                  <TableRow key={hsn.id}>
                    <TableCell className="font-medium">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-mono font-medium flex items-center gap-2">
                      <Binary className="h-4 w-4 text-zinc-400" />
                      {hsn.code}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {hsn.taxProfileName
                        ? `${hsn.taxProfileName} (${hsn.gstPercentage}%)`
                        : hsn.gstPercentage > 0
                        ? `${hsn.gstPercentage}%`
                        : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[300px]" title={hsn.description}>
                      {hsn.description || '-'}
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(hsn)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          {canDelete && hsn.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(hsn.id!)}
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
            <DialogTitle>{editingId ? 'Edit HSN Code' : 'Create HSN Code'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              label="HSN Code"
              placeholder="e.g. 84713010"
              {...register('code', { required: 'HSN code is required' })}
            />
            {errors.code && <span className="text-xs text-red-500">{errors.code.message}</span>}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                GST Percentage (%)
              </label>
              <Controller
                name="taxProfileId"
                control={control}
                rules={{ required: 'GST slab is required' }}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(val) => field.onChange(val)}
                    disabled={isTaxProfileLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isTaxProfileLoading ? 'Loading...' : 'Select GST slab'} />
                    </SelectTrigger>
                    <SelectContent>
                      {taxProfiles.map((tp) => {
                        const total = (tp.cgst ?? 0) + (tp.sgst ?? 0) + (tp.cess ?? 0);
                        return (
                          <SelectItem key={tp.id} value={tp.id}>
                            {tp.name} — {total}%
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.taxProfileId && (
                <span className="text-xs text-red-500">{errors.taxProfileId.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-foreground">
                Description
              </label>
              <Input
                id="description"
                placeholder="e.g. Personal computers, laptops"
                {...register('description')}
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
                Save HSN Code
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
