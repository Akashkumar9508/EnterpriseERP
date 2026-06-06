import { useEffect, useState, useRef } from 'react';
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

interface StaffLoginDto {
  userId?: string;
  companyId: string;
  branchId: string;
  staffId?: string;
  staffName: string;
  username: string;
  password?: string;
  email?: string;
  phone?: string;
  roleId: string;
  roleName?: string;
  isActive: boolean;
}

interface StaffDto {
  id: string;
  fullName: string;
  departmentName?: string;
  designationName?: string;
  isActive: boolean;
}

interface RoleDto {
  id: string;
  name: string;
}

export default function ManageStaffLogin() {
  const isMounted = useRef(false);
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/manage-staff-login');
  const user = useAppSelector((state) => state.auth.user);

  const [loginsList, setLoginsList] = useState<StaffLoginDto[]>([]);
  const [staffList, setStaffList] = useState<StaffDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Search state
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<StaffLoginDto>();

  const fetchLogins = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/StaffLogin');
      if (response?.success) {
        const items = response.data || [];
        // Apply client side search filtering
        const filtered = items.filter((l: StaffLoginDto) => 
          l.username.toLowerCase().includes(search.toLowerCase()) ||
          l.staffName.toLowerCase().includes(search.toLowerCase()) ||
          (l.roleName && l.roleName.toLowerCase().includes(search.toLowerCase())) ||
          (l.email && l.email.toLowerCase().includes(search.toLowerCase()))
        );
        setTotalCount(filtered.length);
        
        // Paginate client-side
        const start = (pageNumber - 1) * pageSize;
        const paginated = filtered.slice(start, start + pageSize);
        setLoginsList(paginated);
      }
    } catch (error) {
      console.error('Failed to fetch logins', error);
      toast.error('Failed to fetch staff logins list');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [staffRes, roleRes]: any[] = await Promise.all([
        axiosClient.get('/Staff', { params: { pageNumber: 1, pageSize: 10000 } }),
        axiosClient.get('/Role', { params: { pageNumber: 1, pageSize: 10000 } })
      ]);

      if (staffRes?.success) {
        if (staffRes.data && staffRes.data.items) {
          setStaffList(staffRes.data.items);
        } else {
          setStaffList(staffRes.data || []);
        }
      }
      if (roleRes?.success) {
        if (roleRes.data && roleRes.data.items) {
          setRoles(roleRes.data.items);
        } else {
          setRoles(roleRes.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch metadata', error);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchLogins();
      fetchMetadata();
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
          fetchLogins();
        } else {
          setPageNumber(1);
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [search]);

  const openCreateDialog = () => {
    reset({
      staffId: '',
      username: '',
      password: '',
      email: '',
      phone: '',
      roleId: '',
      isActive: true
    });
    setEditingUserId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (login: StaffLoginDto) => {
    reset({
      staffId: login.staffId || '',
      username: login.username,
      password: '', // leave empty to not change
      email: login.email || '',
      phone: login.phone || '',
      roleId: login.roleId,
      isActive: login.isActive ?? true
    });
    setEditingUserId(login.userId || null);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: StaffLoginDto) => {
    try {
      const selectedStaff = staffList.find(s => s.id === data.staffId);
      const payload = {
        ...data,
        companyId: user?.companyId,
        branchId: user?.branchId,
        fullName: selectedStaff ? selectedStaff.fullName : (data.username || ''),
        staffId: data.staffId === '' ? null : data.staffId,
        password: data.password === '' ? null : data.password
      };
      
      let response: any;
      if (editingUserId) {
        // Update
        const updatePayload = {
          userId: editingUserId,
          roleId: data.roleId,
          isActive: data.isActive,
          password: data.password || null
        };
        response = await axiosClient.put('/StaffLogin', updatePayload);
      } else {
        // Create
        response = await axiosClient.post('/StaffLogin', payload);
      }

      if (response?.success) {
        setIsDialogOpen(false);
        toast.success(editingUserId ? 'Login credentials updated successfully!' : 'Login credentials created successfully!');
        fetchLogins();
      } else {
        toast.error(response?.message || 'Failed to save login');
      }
    } catch (error: any) {
      console.error('Save error', error);
      toast.error(error?.message || 'An error occurred while saving.');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to disable/delete login permissions for this user?')) return;
    
    try {
      const response: any = await axiosClient.delete(`/StaffLogin/${userId}`);
      if (response?.success) {
        toast.success('Login credentials deleted successfully!');
        fetchLogins();
      } else {
        toast.error(response?.message || 'Failed to delete login credentials');
      }
    } catch (error: any) {
      console.error('Delete error', error);
      toast.error(error?.message || 'An error occurred.');
    }
  };

  // Filter staff who don't have logins yet (excluding the currently edited staff member)
  const availableStaff = staffList.filter(s => 
    s.isActive && 
    (!loginsList.some(l => l.staffId === s.id) || (editingUserId && loginsList.find(l => l.userId === editingUserId)?.staffId === s.id))
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
          <h1 className="text-3xl font-bold tracking-tight">Manage Staff Login</h1>
          <p className="text-muted-foreground mt-1">Create and manage portal login credentials and security roles for staff.</p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Input 
            type="search" 
            placeholder="Search credentials..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[300px]"
          />
          {canCreate && (
            <Button onClick={openCreateDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Login Access
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
                <TableHead>Employee Name</TableHead>
                <TableHead>Login Username</TableHead>
                <TableHead>Email / Phone</TableHead>
                <TableHead>Security Role</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                {(canEdit || canDelete) && <TableHead className="text-right w-[120px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : loginsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No login credentials configured.
                  </TableCell>
                </TableRow>
              ) : (
                loginsList.map((login, index) => (
                  <TableRow key={login.userId}>
                    <TableCell className="font-medium">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {login.staffName}
                    </TableCell>
                    <TableCell>
                      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                        {login.username}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{login.email || '-'}</div>
                        <div className="text-xs text-muted-foreground">{login.phone || ''}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-100 ring-1 ring-inset ring-zinc-700/30">
                        {login.roleName || 'No Role Assigned'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${login.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {login.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(login)} title="Edit">
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          {canDelete && login.userId && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(login.userId!)} title="Disable/Delete">
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
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingUserId ? 'Edit Credentials' : 'Configure Login Credentials'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            
            <div className="flex flex-col gap-2">
              <label className="text-base text-zinc-200">Link Employee (Staff)</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-800 disabled:opacity-50"
                disabled={!!editingUserId}
                {...register('staffId', { required: !editingUserId ? 'Linking an employee is required' : false })}
              >
                <option value="">-- Choose Employee --</option>
                {availableStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.fullName} {staff.departmentName ? `[${staff.departmentName} - ${staff.designationName || ''}]` : ''}
                  </option>
                ))}
              </select>
              {errors.staffId && <span className="text-xs text-red-500">{errors.staffId.message}</span>}
            </div>

            <FormField
              label="Login Username"
              placeholder="e.g. akash.kumar"
              disabled={!!editingUserId}
              {...register('username', { required: !editingUserId ? 'Username is required' : false })}
            />
            {errors.username && <span className="text-xs text-red-500">{errors.username.message}</span>}

            <FormField
              label={editingUserId ? "Change Password (Leave blank to keep unchanged)" : "Password"}
              type="password"
              placeholder="••••••••"
              {...register('password', { required: !editingUserId ? 'Password is required' : false })}
            />
            {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}

            <div className="flex flex-col gap-2">
              <label className="text-base text-zinc-200">Security Access Role</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-800"
                {...register('roleId', { required: 'Security Role is required' })}
              >
                <option value="">-- Select Role --</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              {errors.roleId && <span className="text-xs text-red-500">{errors.roleId.message}</span>}
            </div>

            {!editingUserId && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Email (Optional)"
                  placeholder="e.g. akash@example.com"
                  {...register('email')}
                />
                <FormField
                  label="Phone (Optional)"
                  placeholder="e.g. 9876543210"
                  {...register('phone')}
                />
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2 pb-2">
              <Switch
                id="isActive"
                checked={watch('isActive')}
                onCheckedChange={(val) => setValue('isActive', val)}
              />
              <label htmlFor="isActive" className="text-sm font-medium leading-none cursor-pointer">
                Login Enabled
              </label>
            </div>
            
            <DialogFooter className="mt-6 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Credentials
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
