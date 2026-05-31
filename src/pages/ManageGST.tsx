import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Plus, Loader2, Receipt } from 'lucide-react';
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
import type { GstDto } from '@/types/GstDto';

export default function ManageGST() {
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/manage-gst');

  const [gstProfiles, setGstProfiles] = useState<GstDto[]>([]);
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
  } = useForm<GstDto>();

  const fetchGstProfiles = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/TaxProfile', {
        params: { pageNumber, pageSize, search }
      });
      if (response?.success) {
        if (response.data && response.data.items) {
          setGstProfiles(response.data.items || []);
          setTotalCount(response.data.totalCount || 0);
        } else {
          setGstProfiles(response.data || []);
          setTotalCount((response.data || []).length);
        }
      }
    } catch (error) {
      console.error('Failed to fetch GST profiles', error);
      toast.error('Failed to load GST profiles.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchGstProfiles();
    }
  }, [canView, pageNumber, pageSize]);

  useEffect(() => {
    if (canView) {
      const delayDebounceFn = setTimeout(() => {
        if (pageNumber === 1) {
          fetchGstProfiles();
        } else {
          setPageNumber(1);
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [search]);

  const openCreateDialog = () => {
    reset({ name: '', cgst: 0, sgst: 0, igst: 0, cess: 0 });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (gst: GstDto) => {
    reset({
      name: gst.name,
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: gst.igst,
      cess: gst.cess,
    });
    setEditingId(gst.id || null);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: GstDto) => {
    try {
      const payload = {
        ...data,
        cgst: Number(data.cgst),
        sgst: Number(data.sgst),
        igst: Number(data.igst),
        cess: Number(data.cess),
      };

      let response: any;
      if (editingId) {
        response = await axiosClient.put('/TaxProfile', { ...payload, id: editingId });
      } else {
        response = await axiosClient.post('/TaxProfile', payload);
      }

      if (response?.success) {
        setIsDialogOpen(false);
        toast.success(editingId ? 'GST Profile updated successfully!' : 'GST Profile created successfully!');
        fetchGstProfiles();
      } else {
        toast.error(response?.message || 'Failed to save GST Profile');
      }
    } catch (error: any) {
      console.error('Save error', error);
      toast.error(error?.message || 'An error occurred while saving.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this GST Profile?')) return;

    try {
      const response: any = await axiosClient.delete(`/TaxProfile/${id}`);
      if (response?.success) {
        toast.success('GST Profile deleted successfully!');
        fetchGstProfiles();
      } else {
        toast.error(response?.message || 'Failed to delete GST Profile');
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
          <h1 className="text-3xl font-bold tracking-tight">GST Profile Management</h1>
          <p className="text-muted-foreground mt-1">Configure and manage GST tax slabs (Tax Profiles).</p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Input
            type="search"
            placeholder="Search tax profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[300px]"
          />
          {canCreate && (
            <Button onClick={openCreateDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add GST Slab
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
                <TableHead className="w-[200px]">Profile Name</TableHead>
                <TableHead>CGST (%)</TableHead>
                <TableHead>SGST (%)</TableHead>
                <TableHead>IGST (%)</TableHead>
                <TableHead>CESS (%)</TableHead>
                <TableHead>Total Tax (%)</TableHead>
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
              ) : gstProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No GST Profiles found.
                  </TableCell>
                </TableRow>
              ) : (
                gstProfiles.map((gst, index) => (
                  <TableRow key={gst.id}>
                    <TableCell className="font-medium">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-zinc-400" />
                      {gst.name}
                    </TableCell>
                    <TableCell>{gst.cgst}%</TableCell>
                    <TableCell>{gst.sgst}%</TableCell>
                    <TableCell>{gst.igst}%</TableCell>
                    <TableCell>{gst.cess}%</TableCell>
                    <TableCell className="font-semibold text-primary">
                      {gst.cgst + gst.sgst + gst.cess}%
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(gst)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          {canDelete && gst.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(gst.id!)}
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
            <DialogTitle>{editingId ? 'Edit GST Slab' : 'Create GST Slab'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              label="Profile Name"
              placeholder="e.g. GST 18%"
              {...register('name', { required: 'Profile name is required' })}
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="CGST (%)"
                type="number"
                step="0.01"
                placeholder="0"
                {...register('cgst', { required: 'CGST is required' })}
              />
              <FormField
                label="SGST (%)"
                type="number"
                step="0.01"
                placeholder="0"
                {...register('sgst', { required: 'SGST is required' })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="IGST (%)"
                type="number"
                step="0.01"
                placeholder="0"
                {...register('igst', { required: 'IGST is required' })}
              />
              <FormField
                label="CESS (%)"
                type="number"
                step="0.01"
                placeholder="0"
                {...register('cess', { required: 'CESS is required' })}
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
                Save Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
