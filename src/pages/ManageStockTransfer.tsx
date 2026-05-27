// Dummy using to make the C# compiler happy or ignore this, this is a TypeScript/TSX file, so we write TypeScript code:
import { useEffect, useState, useMemo, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { 
  Trash2, 
  Plus, 
  Loader2, 
  Warehouse, 
  Search, 
  Calendar, 
  RefreshCw,
  ArrowRightLeft,
  X,
  AlertTriangle
} from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
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

import type { ProductDto } from '@/types/ProductDto';
import type { WarehouseDto } from '@/types/WarehouseDto';
import type { StockTransferDto } from '@/types/StockTransferDto';

// Local Searchable Product Dropdown Component
interface SearchableProductDropdownProps {
  products: ProductDto[];
  selectedId: string;
  onChange: (id: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

function SearchableProductDropdown({
  products,
  selectedId,
  onChange,
  isLoading = false,
  placeholder = 'Select Product...',
  className = 'w-full'
}: SearchableProductDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedProduct = products.find(p => p.id === selectedId);

  const filtered = useMemo(() => {
    return products.filter(
      p => p.name.toLowerCase().includes(search.toLowerCase()) || 
           p.productCode.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 text-left cursor-pointer"
      >
        <span className="truncate">
          {selectedProduct 
            ? `${selectedProduct.name} (${selectedProduct.productCode})` 
            : placeholder}
        </span>
        <span className="text-zinc-400 text-xs ml-2 shrink-0">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 z-50 w-full rounded-md border border-zinc-200 bg-white p-2 shadow-md dark:border-zinc-800 dark:bg-zinc-950 max-h-[200px] flex flex-col">
          <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-zinc-400" />
            <input
              type="text"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-8 w-full rounded-md bg-transparent py-1 text-sm outline-hidden placeholder:text-zinc-400 dark:text-zinc-50"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 space-y-1">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(p.id || '');
                  setIsOpen(false);
                }}
                className={`flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left cursor-pointer ${
                  selectedId === p.id ? 'bg-zinc-100 dark:bg-zinc-900 font-semibold' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-zinc-900 dark:text-zinc-50">{p.name}</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{p.productCode}</div>
                </div>
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="py-4 text-center text-xs text-zinc-400">No products found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManageStockTransfer() {
  const { canView, canCreate, canDelete } = usePermissions('/product');
  const user = useAppSelector((state) => state.auth.user);

  // Core Data States
  const [transfers, setTransfers] = useState<StockTransferDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [companyPackage, setCompanyPackage] = useState<string>('Silver');
  
  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isProductsLoading, setIsProductsLoading] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedFromWarehouseId, setSelectedFromWarehouseId] = useState('all');

  // Pagination States
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form setup
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<StockTransferDto>({
    defaultValues: {
      items: [{ productId: '', qty: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const fetchTransfers = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/StockTransfer');
      if (response?.success) {
        setTransfers(response.data || []);
      }
    } catch (e) {
      console.error('Failed to load transfers', e);
      toast.error('Failed to load stock transfers.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDependencies = async () => {
    setIsProductsLoading(true);
    try {
      const [resProducts, resWarehouses, resCompany] = await Promise.all([
        axiosClient.get('/Product'),
        axiosClient.get('/Warehouse'),
        axiosClient.get('/Company')
      ]) as any[];

      if (resProducts?.success) setProducts(resProducts.data || []);
      if (resWarehouses?.success) setWarehouses(resWarehouses.data || []);
      
      if (resCompany?.success && user?.companyId) {
        const matchingCompany = (resCompany.data || []).find((c: any) => c.id === user.companyId);
        if (matchingCompany) {
          setCompanyPackage(matchingCompany.packageName || 'Silver');
        }
      }
    } catch (e) {
      console.error('Failed to load dependencies', e);
      toast.error('Failed to load dependencies.');
    } finally {
      setIsProductsLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchTransfers();
      fetchDependencies();
    }
  }, [canView]);

  const isSilver = companyPackage.toLowerCase() === 'silver';

  // Filter client-side
  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      const matchesSearch = 
        (t.productNames && t.productNames.toLowerCase().includes(search.toLowerCase())) ||
        (t.fromWarehouseName && t.fromWarehouseName.toLowerCase().includes(search.toLowerCase())) ||
        (t.toWarehouseName && t.toWarehouseName.toLowerCase().includes(search.toLowerCase()));

      const matchesWarehouse = selectedFromWarehouseId === 'all' || t.fromWarehouseId === selectedFromWarehouseId;

      return matchesSearch && matchesWarehouse;
    });
  }, [transfers, search, selectedFromWarehouseId]);

  // Paginated Transfers
  const totalCount = filteredTransfers.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedTransfers = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredTransfers.slice(start, start + pageSize);
  }, [filteredTransfers, pageNumber, pageSize]);

  useEffect(() => {
    setPageNumber(1);
  }, [search, selectedFromWarehouseId, pageSize]);

  // Open Create Modal
  const openCreateDialog = () => {
    if (isSilver) {
      toast.error('Silver package does not support stock transfers. Please upgrade your package.');
      return;
    }
    if (warehouses.length < 2) {
      toast.warning('You need at least 2 warehouses/stores to perform a stock transfer.');
      return;
    }
    reset({
      fromWarehouseId: warehouses[0]?.id || '',
      toWarehouseId: warehouses[1]?.id || '',
      transferDate: new Date().toISOString().split('T')[0],
      items: [{ productId: '', qty: 1 }]
    });
    setIsDialogOpen(true);
  };

  // Submit new transfer
  const onSubmit = async (data: StockTransferDto) => {
    if (isSilver) {
      toast.error('Silver package does not support stock transfers. Please upgrade your package.');
      return;
    }
    if (data.fromWarehouseId === data.toWarehouseId) {
      toast.error('Source and destination warehouses cannot be the same.');
      return;
    }

    const invalidItems = data.items.filter(item => !item.productId || Number(item.qty) <= 0);
    if (invalidItems.length > 0) {
      toast.error('Please select products and input positive quantities for all items.');
      return;
    }

    try {
      const payload = {
        ...data,
        transferDate: new Date(data.transferDate).toISOString(),
        items: data.items.map(item => ({
          productId: item.productId,
          qty: Number(item.qty)
        }))
      };

      const response: any = await axiosClient.post('/StockTransfer', payload);
      if (response?.success) {
        toast.success('Stock transferred successfully!');
        setIsDialogOpen(false);
        fetchTransfers();
      } else {
        toast.error(response?.message || 'Failed to submit stock transfer.');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'An error occurred while saving.');
    }
  };

  // Delete/Rollback stock transfer
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stock transfer? This will rollback the stock level changes.')) return;

    try {
      const response: any = await axiosClient.delete(`/StockTransfer/${id}`);
      if (response?.success) {
        toast.success('Stock transfer rolled back successfully!');
        fetchTransfers();
      } else {
        toast.error(response?.message || 'Failed to delete stock transfer.');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'An error occurred while deleting.');
    }
  };

  if (!canView || isSilver) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            {isSilver 
              ? "Stock Transfer is not available in the Silver subscription plan. Please upgrade your package."
              : "You do not have permission to view inventory modules."}
          </p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="h-8 w-8 text-indigo-500" /> Stock Transfers
          </h1>
          <p className="text-muted-foreground mt-1">Move products between warehouses and track inventory transactions.</p>
        </div>
      </div>

      {isSilver && (
        <div className="mb-6 p-4 border border-amber-250 bg-amber-50/50 rounded-xl dark:border-amber-500/30 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <div className="font-semibold text-sm">Silver Package Limitation</div>
            <div className="text-xs mt-1">
              Your company is on the <strong>Silver subscription plan</strong>, which is limited to 1 store and does not support stock transfers. 
              Please contact the Super Admin to upgrade to a <strong>Gold</strong> or <strong>Platinum</strong> package to transfer stock between warehouses.
            </div>
          </div>
        </div>
      )}

      {/* Filter toolbar */}
      <Section className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs mb-6">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search warehouse/products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Source Warehouse</span>
            <Select
              value={selectedFromWarehouseId}
              onValueChange={setSelectedFromWarehouseId}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id || ''}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="icon" onClick={fetchTransfers} className="h-9 w-9" title="Refresh list">
            <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {canCreate && (
            <Button 
              onClick={openCreateDialog} 
              disabled={isSilver} 
              className="gap-1.5 shrink-0 h-9 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4" /> New Stock Transfer
            </Button>
          )}
        </div>
      </Section>

      {/* Transfers Table */}
      <Section className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[80px]">Sr. No.</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[180px]">From Warehouse</TableHead>
                <TableHead className="w-[40px] text-center"></TableHead>
                <TableHead className="w-[180px]">To Warehouse</TableHead>
                <TableHead className="w-[260px]">Product Names</TableHead>
                <TableHead className="w-[120px] text-right font-semibold">Total Qty</TableHead>
                {canDelete && <TableHead className="text-right w-[100px]">Rollback</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginatedTransfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No stock transfers recorded.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransfers.map((t, index) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{(pageNumber - 1) * pageSize + index + 1}</TableCell>
                    <TableCell className="text-xs font-medium">
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {t.transferDate ? new Date(t.transferDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Warehouse className="h-4 w-4 text-zinc-400 shrink-0" />
                        <span>{t.fromWarehouseName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-zinc-400 font-bold">➔</TableCell>
                    <TableCell className="text-sm font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Warehouse className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span>{t.toWarehouseName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground leading-relaxed max-w-[260px] truncate" title={t.productNames}>
                      {t.productNames || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      {t.totalQty?.toFixed(2)}
                    </TableCell>
                    {canDelete && (
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400" 
                          onClick={() => handleDelete(t.id!)} 
                          title="Delete / Rollback"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      {/* Create Stock Transfer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <ArrowRightLeft className="h-5 w-5" /> New Stock Transfer
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">From Warehouse (Source)</label>
                <select
                  {...register('fromWarehouseId', { required: true })}
                  className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-zinc-900 text-sm focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {errors.fromWarehouseId && <span className="text-xs text-red-500">Source warehouse is required.</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">To Warehouse (Destination)</label>
                <select
                  {...register('toWarehouseId', { required: true })}
                  className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-zinc-900 text-sm focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {errors.toWarehouseId && <span className="text-xs text-red-500">Destination warehouse is required.</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Transfer Date"
                type="date"
                {...register('transferDate', { required: 'Date is required' })}
              />
              {errors.transferDate && <span className="text-xs text-red-500 block">{errors.transferDate.message}</span>}
            </div>

            {/* Transfer Items list */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-zinc-150 pb-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Transfer Items List</span>
                <Button 
                  type="button" 
                  onClick={() => append({ productId: '', qty: 1 })}
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Row
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const watchProdId = watch(`items.${index}.productId`);
                  return (
                    <div key={field.id} className="flex gap-4 items-end bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60 relative group">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Product</label>
                        <SearchableProductDropdown
                          products={products}
                          selectedId={watchProdId || ''}
                          onChange={(val) => setValue(`items.${index}.productId`, val)}
                          isLoading={isProductsLoading}
                        />
                      </div>

                      <div className="w-[120px]">
                        <FormField
                          label="Qty"
                          type="number"
                          step="0.001"
                          placeholder="1.000"
                          {...register(`items.${index}.qty` as const, { required: true, min: 0.001 })}
                        />
                      </div>

                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="h-10 w-10 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 shrink-0"
                          title="Remove item"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Initiate Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
