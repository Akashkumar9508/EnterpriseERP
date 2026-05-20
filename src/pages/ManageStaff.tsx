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
import axiosClient from '@/Services/axiosClient';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

interface StaffDto {
  id?: string;
  companyId: string;
  branchId: string;
  departmentId?: string;
  designationId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  salary?: number;
  joiningDate?: string;
  isActive: boolean;
  departmentName?: string;
  designationName?: string;
}

interface DepartmentDto {
  id: string;
  name: string;
}

interface DesignationDto {
  id: string;
  name: string;
  departmentId?: string;
}

export default function ManageStaff() {
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/manage-staff');
  const user = useAppSelector((state) => state.auth.user);

  const [staffList, setStaffList] = useState<StaffDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [designations, setDesignations] = useState<DesignationDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Search state
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<StaffDto>();

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/Staff');
      if (response?.success) {
        const items = response.data || [];
        // Apply client side search filtering
        const filtered = items.filter((s: StaffDto) => 
          s.fullName.toLowerCase().includes(search.toLowerCase()) ||
          (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
          (s.phone && s.phone.includes(search)) ||
          (s.departmentName && s.departmentName.toLowerCase().includes(search.toLowerCase())) ||
          (s.designationName && s.designationName.toLowerCase().includes(search.toLowerCase()))
        );
        setTotalCount(filtered.length);
        
        // Paginate client-side
        const start = (pageNumber - 1) * pageSize;
        const paginated = filtered.slice(start, start + pageSize);
        setStaffList(paginated);
      }
    } catch (error) {
      console.error('Failed to fetch staff', error);
      toast.error('Failed to fetch staff list');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [deptRes, desRes]: any[] = await Promise.all([
        axiosClient.get('/Department'),
        axiosClient.get('/Designation')
      ]);

      if (deptRes?.success) {
        setDepartments(deptRes.data || []);
      }
      if (desRes?.success) {
        setDesignations(desRes.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch metadata', error);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchStaff();
      fetchMetadata();
    }
  }, [canView, pageNumber, pageSize]);

  useEffect(() => {
    if (canView) {
      const delayDebounceFn = setTimeout(() => {
        if (pageNumber === 1) {
          fetchStaff();
        } else {
          setPageNumber(1);
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [search]);

  const openCreateDialog = () => {
    reset({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      salary: undefined,
      joiningDate: new Date().toISOString().split('T')[0],
      departmentId: '',
      designationId: '',
      isActive: true
    });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (staff: StaffDto) => {
    reset({
      fullName: staff.fullName,
      email: staff.email || '',
      phone: staff.phone || '',
      address: staff.address || '',
      salary: staff.salary,
      joiningDate: staff.joiningDate ? staff.joiningDate.split('T')[0] : '',
      departmentId: staff.departmentId || '',
      designationId: staff.designationId || '',
      isActive: staff.isActive ?? true
    });
    setEditingId(staff.id || null);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: StaffDto) => {
    try {
      const payload = {
        ...data,
        companyId: user?.companyId,
        branchId: user?.branchId,
        departmentId: data.departmentId === '' ? null : data.departmentId,
        designationId: data.designationId === '' ? null : data.designationId,
        salary: data.salary ? Number(data.salary) : null
      };
      
      let response: any;
      if (editingId) {
        payload.id = editingId;
        response = await axiosClient.put('/Staff', payload);
      } else {
        response = await axiosClient.post('/Staff', payload);
      }

      if (response?.success) {
        setIsDialogOpen(false);
        toast.success(editingId ? 'Staff updated successfully!' : 'Staff created successfully!');
        fetchStaff();
      } else {
        toast.error(response?.message || 'Failed to save staff');
      }
    } catch (error: any) {
      console.error('Save error', error);
      toast.error(error?.message || 'An error occurred while saving.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      const response: any = await axiosClient.delete(`/Staff/${id}`);
      if (response?.success) {
        toast.success('Staff member deleted successfully!');
        fetchStaff();
      } else {
        toast.error(response?.message || 'Failed to delete staff member');
      }
    } catch (error: any) {
      console.error('Delete error', error);
      toast.error(error?.message || 'An error occurred.');
    }
  };

  // Filter designations by selected department if needed
  const selectedDeptId = watch('departmentId');
  const filteredDesignations = designations.filter(d => 
    !selectedDeptId || !d.departmentId || d.departmentId === selectedDeptId
  );

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
          <h1 className="text-3xl font-bold tracking-tight">Manage Staff</h1>
          <p className="text-muted-foreground mt-1">Manage physical employees, details, designations, and departments.</p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Input 
            type="search" 
            placeholder="Search staff..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[300px]"
          />
          {canCreate && (
            <Button onClick={openCreateDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Staff
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
                <TableHead>Full Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Phone / Email</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
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
              ) : staffList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No staff members found.
                  </TableCell>
                </TableRow>
              ) : (
                staffList.map((staff, index) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <div>{staff.fullName}</div>
                        {staff.salary && <div className="text-xs text-muted-foreground">Salary: ₹{staff.salary}</div>}
                      </div>
                    </TableCell>
                    <TableCell>{staff.departmentName || '-'}</TableCell>
                    <TableCell>{staff.designationName || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{staff.phone || '-'}</div>
                        <div className="text-xs text-muted-foreground">{staff.email || ''}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${staff.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(staff)} title="Edit">
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          {canDelete && staff.id && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(staff.id!)} title="Delete">
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
                    onClick={(e) => { e.preventDefault(); if(pageNumber > 1) setPageNumber(pageNumber - 1); }} 
                    className={pageNumber === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Staff Details' : 'Add New Staff member'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              label="Full Name"
              placeholder="e.g. Akash Kumar"
              {...register('fullName', { required: 'Full name is required' })}
            />
            {errors.fullName && <span className="text-xs text-red-500">{errors.fullName.message}</span>}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Email Address"
                type="email"
                placeholder="e.g. akash@example.com"
                {...register('email')}
              />
              <FormField
                label="Phone Number"
                placeholder="e.g. 9876543210"
                {...register('phone')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-base text-zinc-200">Department</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-800"
                  {...register('departmentId')}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-base text-zinc-200">Designation</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-800"
                  {...register('designationId')}
                >
                  <option value="">Select Designation</option>
                  {filteredDesignations.map((desg) => (
                    <option key={desg.id} value={desg.id}>{desg.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Joining Date"
                type="date"
                {...register('joiningDate')}
              />
              <FormField
                label="Monthly Salary (₹)"
                type="number"
                step="0.01"
                placeholder="e.g. 35000"
                {...register('salary')}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-base text-zinc-200">Residential Address</label>
              <textarea 
                placeholder="e.g. Flat 101, Shanti Enclave, Delhi"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-800"
                {...register('address')}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2 pb-2">
              <Switch
                id="isActive"
                checked={watch('isActive')}
                onCheckedChange={(val) => setValue('isActive', val)}
              />
              <label htmlFor="isActive" className="text-sm font-medium leading-none cursor-pointer">
                Is Active Staff member
              </label>
            </div>
            
            <DialogFooter className="mt-6 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Details
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
