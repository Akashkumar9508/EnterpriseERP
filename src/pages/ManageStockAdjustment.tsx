import { useEffect, useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Trash2, 
  Plus, 
  Loader2, 
  Warehouse, 
  Search, 
  Calendar, 
  FileText,
  RefreshCw,
  PlusCircle,
  MinusCircle
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
import type { StockAdjustmentDto } from '@/types/StockAdjustmentDto';

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
        <div className="absolute left-0 mt-1 z-50 w-full rounded-md border border-zinc-200 bg-white p-2 shadow-md dark:border-zinc-800 dark:bg-zinc-950 max-h-[250px] flex flex-col">
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
              <div className="py-6 text-center text-xs text-zinc-400">No products found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManageStockAdjustment() {
  const { canView, canCreate, canDelete } = usePermissions('/stock-adjustment');
  const user = useAppSelector((state) => state.auth.user);

  // Core Data States
  const [adjustments, setAdjustments] = useState<StockAdjustmentDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);

  const filteredWarehouses = useMemo(() => {
    if (user?.warehouseId) {
      return warehouses.filter(w => w.id === user.warehouseId);
    }
    return warehouses;
  }, [warehouses, user?.warehouseId]);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isProductsLoading, setIsProductsLoading] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(user?.warehouseId || 'all');

  // Pagination States
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form setup
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<StockAdjustmentDto>();

  const fetchAdjustments = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/StockAdjustment');
      if (response?.success) {
        setAdjustments(response.data || []);
      }
    } catch (e) {
      console.error('Failed to load adjustments', e);
      toast.error('Failed to load stock adjustments.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDependencies = async () => {
    setIsProductsLoading(true);
    try {
      const [resProducts, resWarehouses] = await Promise.all([
        axiosClient.get('/Product'),
        axiosClient.get('/Warehouse'),
      ]) as any[];

      if (resProducts?.success) setProducts(resProducts.data || []);
      if (resWarehouses?.success) setWarehouses(resWarehouses.data || []);
    } catch (e) {
      console.error('Failed to load dependencies', e);
      toast.error('Failed to load products and warehouses.');
    } finally {
      setIsProductsLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchAdjustments();
      fetchDependencies();
    }
  }, [canView]);

  // Create lookups
  const productMap = useMemo(() => {
    const map = new Map<string, ProductDto>();
    products.forEach(p => { if (p.id) map.set(p.id, p); });
    return map;
  }, [products]);

  const warehouseMap = useMemo(() => {
    const map = new Map<string, string>();
    warehouses.forEach(w => { if (w.id) map.set(w.id, w.name); });
    return map;
  }, [warehouses]);

  // Filter client-side
  const filteredAdjustments = useMemo(() => {
    return adjustments.filter(adj => {
      const prod = productMap.get(adj.productId);
      const prodName = prod ? prod.name : '';
      const prodCode = prod ? prod.productCode : '';
      
      const matchesSearch = 
        prodName.toLowerCase().includes(search.toLowerCase()) ||
        prodCode.toLowerCase().includes(search.toLowerCase()) ||
        (adj.remarks && adj.remarks.toLowerCase().includes(search.toLowerCase()));

      const matchesWarehouse = selectedWarehouseId === 'all' || adj.warehouseId === selectedWarehouseId;

      return matchesSearch && matchesWarehouse;
    });
  }, [adjustments, search, selectedWarehouseId, productMap]);

  // Paginated Adjustments
  const totalCount = filteredAdjustments.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedAdjustments = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredAdjustments.slice(start, start + pageSize);
  }, [filteredAdjustments, pageNumber, pageSize]);

  useEffect(() => {
    setPageNumber(1);
  }, [search, selectedWarehouseId, pageSize]);

  // Open Create Modal
  const openCreateDialog = () => {
    reset({
      productId: '',
      warehouseId: user?.warehouseId || warehouses[0]?.id || '',
      quantity: 1,
      adjustmentType: 'Addition',
      adjustmentDate: new Date().toISOString().split('T')[0],
      remarks: ''
    });
    setIsDialogOpen(true);
  };

  // Submit new adjustment
  const onSubmit = async (data: StockAdjustmentDto) => {
    try {
      const payload = {
        ...data,
        quantity: Number(data.quantity),
        adjustmentDate: new Date(data.adjustmentDate).toISOString()
      };

      const response: any = await axiosClient.post('/StockAdjustment', payload);
      if (response?.success) {
        toast.success('Stock adjusted successfully!');
        setIsDialogOpen(false);
        fetchAdjustments();
      } else {
        toast.error(response?.message || 'Failed to submit stock adjustment.');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'An error occurred while saving.');
    }
  };

  // Delete/Rollback stock adjustment
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this adjustment? This will rollback the stock level changes.')) return;

    try {
      const response: any = await axiosClient.delete(`/StockAdjustment/${id}`);
      if (response?.success) {
        toast.success('Stock adjustment rolled back successfully!');
        fetchAdjustments();
      } else {
        toast.error(response?.message || 'Failed to delete adjustment.');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'An error occurred while deleting.');
    }
  };

  if (!canView) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view inventory modules.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Adjustments</h1>
          <p className="text-muted-foreground mt-1">Audit and log manual additions or subtractions of stock levels.</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <Section className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs mb-6">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search product code/remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Warehouse</span>
            <Select
              value={selectedWarehouseId}
              onValueChange={setSelectedWarehouseId}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder={user?.warehouseId ? (user.warehouseName || "Warehouse") : "All Warehouses"} />
              </SelectTrigger>
              <SelectContent>
                {!user?.warehouseId && <SelectItem value="all">All Warehouses</SelectItem>}
                {filteredWarehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id || ''}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="icon" onClick={fetchAdjustments} className="h-9 w-9" title="Refresh list">
            <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {canCreate && (
            <Button onClick={openCreateDialog} className="gap-1.5 shrink-0 h-9">
              <Plus className="h-4 w-4" /> New Adjustment
            </Button>
          )}
        </div>
      </Section>

      {/* Adjustments Table */}
      <Section className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[80px]">Sr. No.</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[200px]">Product Name</TableHead>
                <TableHead className="w-[160px]">Warehouse</TableHead>
                <TableHead className="w-[120px] text-center">Type</TableHead>
                <TableHead className="w-[110px] text-right">Adjusted Qty</TableHead>
                <TableHead>Remarks</TableHead>
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
              ) : paginatedAdjustments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No stock adjustments recorded.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAdjustments.map((adj, index) => {
                  const prod = productMap.get(adj.productId);
                  const isAddition = adj.adjustmentType === 'Addition' || adj.adjustmentType === 'Addition';
                  return (
                    <TableRow key={adj.id}>
                      <TableCell className="font-mono text-xs">{(pageNumber - 1) * pageSize + index + 1}</TableCell>
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <Calendar className="h-3.5 w-3.5" />
                          {adj.adjustmentDate ? new Date(adj.adjustmentDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm">{prod?.name || 'Unknown Product'}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2 items-center">
                          <span>Code: {prod?.productCode}</span>
                          {prod?.unitName && <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-sm text-zinc-650 dark:text-zinc-400 font-medium font-sans">Unit: {prod.unitName}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1 text-zinc-700 dark:text-zinc-355">
                          <Warehouse className="h-3.5 w-3.5 opacity-60" />
                          {warehouseMap.get(adj.warehouseId) || 'Unknown Warehouse'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isAddition 
                            ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' 
                            : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                        }`}>
                          {isAddition ? (
                            <>
                              <PlusCircle className="h-3 w-3" /> Addition
                            </>
                          ) : (
                            <>
                              <MinusCircle className="h-3 w-3" /> Subtraction
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold whitespace-nowrap">
                        {isAddition ? '+' : '-'}{adj.quantity?.toFixed(2)} <span className="text-[10px] text-zinc-400 font-sans font-medium">{prod?.unitName}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground leading-relaxed max-w-[200px] truncate" title={adj.remarks}>
                        <div className="flex items-start gap-1">
                          <FileText className="h-3.5 w-3.5 opacity-50 shrink-0 mt-0.5" />
                          <span className="truncate">{adj.remarks || '-'}</span>
                        </div>
                      </TableCell>
                      {canDelete && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400" onClick={() => handleDelete(adj.id!)} title="Delete / Rollback">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
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

      {/* Create Stock Adjustment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>New Stock Adjustment</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Select Product</label>
              <SearchableProductDropdown
                products={products}
                selectedId={watch('productId') || ''}
                onChange={(val) => setValue('productId', val)}
                isLoading={isProductsLoading}
              />
              {errors.productId && <span className="text-xs text-red-500">Product selection is required.</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Warehouse</label>
                <select
                  {...register('warehouseId', { required: true })}
                  className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-zinc-900 text-sm focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {filteredWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {errors.warehouseId && <span className="text-xs text-red-500">Warehouse is required.</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Adjustment Type</label>
                <select
                  {...register('adjustmentType', { required: true })}
                  className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-zinc-900 text-sm focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value="Addition">+ Addition (Stock In)</option>
                  <option value="Subtraction">- Subtraction (Stock Out)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(() => {
                const watchProductId = watch('productId');
                const selectedProduct = products.find(p => p.id === watchProductId);
                return (
                  <FormField
                    label={selectedProduct?.unitName ? `Quantity (${selectedProduct.unitName})` : "Quantity"}
                    type="number"
                    step="0.001"
                    placeholder="1.000"
                    {...register('quantity', { required: 'Quantity is required', min: { value: 0.001, message: 'Quantity must be positive' } })}
                  />
                );
              })()}
              <FormField
                label="Adjustment Date"
                type="date"
                {...register('adjustmentDate', { required: 'Date is required' })}
              />
            </div>
            {errors.quantity && <span className="text-xs text-red-500 block">{errors.quantity.message}</span>}
            {errors.adjustmentDate && <span className="text-xs text-red-500 block">{errors.adjustmentDate.message}</span>}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Remarks / Reason</label>
              <textarea
                rows={3}
                placeholder="e.g. Annual stock audit correction, damaged item disposal..."
                {...register('remarks', { required: 'Please enter a remarks reason' })}
                className="w-full p-3 rounded-md border border-zinc-200 bg-white text-zinc-900 text-sm focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
              {errors.remarks && <span className="text-xs text-red-500">{errors.remarks.message}</span>}
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Adjust Stock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
