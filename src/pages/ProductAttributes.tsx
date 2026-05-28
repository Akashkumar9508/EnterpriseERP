import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Loader2, 
  ArrowLeft, 
  Layers, 
  Calendar, 
  Hash, 
  Search, 
  CheckCircle2
} from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

import type { ProductDto } from '@/types/ProductDto';
import type { ProductVariantDto } from '@/types/ProductVariantDto';
import type { ProductBatchDto } from '@/types/ProductBatchDto';
import type { ProductSerialDto } from '@/types/ProductSerialDto';

interface SearchableProductDropdownProps {
  products: ProductDto[];
  selectedId: string;
  onChange: (id: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
}

function SearchableProductDropdown({
  products,
  selectedId,
  onChange,
  isLoading = false,
  placeholder = 'Select Product...',
  showAllOption = false,
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
          {selectedId === 'all' && showAllOption
            ? 'All Products'
            : selectedProduct 
              ? `${selectedProduct.name} (${selectedProduct.productCode})` 
              : placeholder}
        </span>
        <span className="text-zinc-400 text-xs ml-2 shrink-0">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 z-50 w-full rounded-md border border-zinc-200 bg-white p-2 shadow-md dark:border-zinc-800 dark:bg-zinc-950 max-h-[300px] flex flex-col">
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
            {showAllOption && (
              <button
                type="button"
                onClick={() => {
                  onChange('all');
                  setIsOpen(false);
                }}
                className={`flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left cursor-pointer ${
                  selectedId === 'all' ? 'bg-zinc-100 dark:bg-zinc-900 font-semibold' : ''
                }`}
              >
                All Products
              </button>
            )}

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

export default function ProductAttributes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/product-attributes');

  // Determine active tab from state or query parameters, default to variants
  const initialTab = (location.state as any)?.activeTab || 'variants';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Core Data States
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    (location.state as any)?.productId || 'all'
  );

  // Variants, Batches, Serials States
  const [variants, setVariants] = useState<ProductVariantDto[]>([]);
  const [batches, setBatches] = useState<ProductBatchDto[]>([]);
  const [serials, setSerials] = useState<ProductSerialDto[]>([]);

  // Loading States
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Search & Pagination States
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Bulk Serials Toggle
  const [isBulkSerials, setIsBulkSerials] = useState(false);

  // Form hooks
  const { register: registerVariant, handleSubmit: handleSubmitVariant, reset: resetVariant, setValue: setValueVariant, watch: watchVariant, formState: { errors: errorsVariant, isSubmitting: isSubmittingVariant } } = useForm<ProductVariantDto>();
  const { register: registerBatch, handleSubmit: handleSubmitBatch, reset: resetBatch, setValue: setValueBatch, watch: watchBatch, formState: { errors: errorsBatch, isSubmitting: isSubmittingBatch } } = useForm<ProductBatchDto>();
  const { register: registerSerial, handleSubmit: handleSubmitSerial, reset: resetSerial, setValue: setValueSerial, watch: watchSerial, formState: { errors: errorsSerial, isSubmitting: isSubmittingSerial } } = useForm<any>();

  // Fetch Parent Products list
  const fetchProducts = async () => {
    setIsProductsLoading(true);
    try {
      const response: any = await axiosClient.get('/Product');
      if (response?.success) {
        setProducts(response.data || []);
      }
    } catch (e) {
      console.error('Failed to load parent products', e);
      toast.error('Failed to load products list.');
    } finally {
      setIsProductsLoading(false);
    }
  };

  // Fetch target list depending on active tab
  const fetchTabDetails = async () => {
    setIsDataLoading(true);
    try {
      if (activeTab === 'variants') {
        const response: any = await axiosClient.get('/ProductVariant');
        if (response?.success) setVariants(response.data || []);
      } else if (activeTab === 'batches') {
        const response: any = await axiosClient.get('/ProductBatch');
        if (response?.success) setBatches(response.data || []);
      } else if (activeTab === 'serials') {
        const response: any = await axiosClient.get('/ProductSerial');
        if (response?.success) setSerials(response.data || []);
      }
    } catch (e) {
      console.error(`Failed to load details for ${activeTab}`, e);
      toast.error(`Failed to load ${activeTab} records.`);
    } finally {
      setIsDataLoading(false);
    }
  };

  // Initialize
  useEffect(() => {
    if (canView) {
      fetchProducts();
    }
  }, [canView]);

  // Load active tab data
  useEffect(() => {
    if (canView) {
      fetchTabDetails();
    }
    setPageNumber(1);
    setSearch('');
  }, [canView, activeTab]);

  // Helpers for mapping Product Names
  const productMap = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      if (p.id) map.set(p.id, p.name);
    });
    return map;
  }, [products]);

  // Filtered variants
  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      const pName = productMap.get(v.productId) || '';
      const matchesSearch = 
        pName.toLowerCase().includes(search.toLowerCase()) ||
        (v.sku && v.sku.toLowerCase().includes(search.toLowerCase())) ||
        (v.barcode && v.barcode.toLowerCase().includes(search.toLowerCase())) ||
        (v.variantCombination && v.variantCombination.toLowerCase().includes(search.toLowerCase()));
      const matchesProduct = selectedProductId === 'all' || v.productId === selectedProductId;
      return matchesSearch && matchesProduct;
    });
  }, [variants, search, selectedProductId, productMap]);

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const pName = productMap.get(b.productId) || '';
      const matchesSearch = 
        pName.toLowerCase().includes(search.toLowerCase()) ||
        (b.batchNo && b.batchNo.toLowerCase().includes(search.toLowerCase()));
      const matchesProduct = selectedProductId === 'all' || b.productId === selectedProductId;
      return matchesSearch && matchesProduct;
    });
  }, [batches, search, selectedProductId, productMap]);

  // Filtered serials
  const filteredSerials = useMemo(() => {
    return serials.filter((s) => {
      const pName = productMap.get(s.productId) || '';
      const matchesSearch = 
        pName.toLowerCase().includes(search.toLowerCase()) ||
        (s.serialNo && s.serialNo.toLowerCase().includes(search.toLowerCase()));
      const matchesProduct = selectedProductId === 'all' || s.productId === selectedProductId;
      return matchesSearch && matchesProduct;
    });
  }, [serials, search, selectedProductId, productMap]);

  // Active items based on tab selection
  const activeItemsCount = useMemo(() => {
    if (activeTab === 'variants') return filteredVariants.length;
    if (activeTab === 'batches') return filteredBatches.length;
    return filteredSerials.length;
  }, [activeTab, filteredVariants, filteredBatches, filteredSerials]);

  const paginatedItems = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    const end = pageNumber * pageSize;
    if (activeTab === 'variants') return filteredVariants.slice(start, end);
    if (activeTab === 'batches') return filteredBatches.slice(start, end);
    return filteredSerials.slice(start, end);
  }, [activeTab, filteredVariants, filteredBatches, filteredSerials, pageNumber, pageSize]);

  const totalPages = Math.ceil(activeItemsCount / pageSize);

  useEffect(() => {
    setPageNumber(1);
  }, [search, selectedProductId, pageSize]);

  // Open Dialogs
  const handleOpenCreateDialog = () => {
    setEditingId(null);
    setIsBulkSerials(false);
    
    const prodId = selectedProductId !== 'all' ? selectedProductId : '';

    if (activeTab === 'variants') {
      resetVariant({
        productId: prodId,
        sku: '',
        barcode: '',
        variantCombination: '',
        purchaseRate: 0,
        salesRate: 0,
        mrp: 0,
        isDefault: false
      });
    } else if (activeTab === 'batches') {
      resetBatch({
        productId: prodId,
        batchNo: '',
        expiryDate: '',
        mrp: 0
      });
    } else if (activeTab === 'serials') {
      resetSerial({
        productId: prodId,
        serialNo: '', // For single serial
        bulkSerialsText: '' // For textarea bulk addition
      });
    }
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (item: any) => {
    setEditingId(item.id);
    setIsBulkSerials(false);

    if (activeTab === 'variants') {
      const v = item as ProductVariantDto;
      resetVariant({
        productId: v.productId,
        sku: v.sku || '',
        barcode: v.barcode || '',
        variantCombination: v.variantCombination || '',
        purchaseRate: v.purchaseRate || 0,
        salesRate: v.salesRate || 0,
        mrp: v.mrp || 0,
        isDefault: v.isDefault || false
      });
    } else if (activeTab === 'batches') {
      const b = item as ProductBatchDto;
      // Expiry dates are returned as ISO strings. Truncate to YYYY-MM-DD for date inputs
      const dateString = b.expiryDate ? b.expiryDate.split('T')[0] : '';
      resetBatch({
        productId: b.productId,
        batchNo: b.batchNo || '',
        expiryDate: dateString,
        mrp: b.mrp || 0
      });
    } else if (activeTab === 'serials') {
      const s = item as ProductSerialDto;
      resetSerial({
        productId: s.productId,
        serialNo: s.serialNo || '',
        bulkSerialsText: ''
      });
    }
    setIsDialogOpen(true);
  };

  // Submit variant form
  const onSubmitVariant = async (data: ProductVariantDto) => {
    try {
      const payload = {
        ...data,
        purchaseRate: Number(data.purchaseRate || 0),
        salesRate: Number(data.salesRate || 0),
        mrp: Number(data.mrp || 0)
      };

      let response: any;
      if (editingId) {
        response = await axiosClient.put('/ProductVariant', { ...payload, id: editingId });
      } else {
        response = await axiosClient.post('/ProductVariant', payload);
      }

      if (response?.success) {
        toast.success(editingId ? 'Variant updated successfully!' : 'Variant created successfully!');
        setIsDialogOpen(false);
        fetchTabDetails();
      } else {
        toast.error(response?.message || 'Failed to save variant.');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'An error occurred while saving.');
    }
  };

  // Submit batch form
  const onSubmitBatch = async (data: ProductBatchDto) => {
    try {
      const payload = {
        ...data,
        expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : undefined,
        mrp: Number(data.mrp || 0)
      };

      let response: any;
      if (editingId) {
        response = await axiosClient.put('/ProductBatch', { ...payload, id: editingId });
      } else {
        response = await axiosClient.post('/ProductBatch', payload);
      }

      if (response?.success) {
        toast.success(editingId ? 'Batch updated successfully!' : 'Batch created successfully!');
        setIsDialogOpen(false);
        fetchTabDetails();
      } else {
        toast.error(response?.message || 'Failed to save batch.');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'An error occurred while saving.');
    }
  };

  // Submit serial form (includes Single & Bulk logic)
  const onSubmitSerial = async (data: any) => {
    try {
      if (editingId) {
        // Edit flow (single item only)
        const payload = {
          productId: data.productId,
          serialNo: data.serialNo
        };
        const response: any = await axiosClient.put('/ProductSerial', { ...payload, id: editingId });
        if (response?.success) {
          toast.success('Serial updated successfully!');
          setIsDialogOpen(false);
          fetchTabDetails();
        } else {
          toast.error(response?.message || 'Failed to update serial.');
        }
      } else {
        // Create flow
        if (isBulkSerials) {
          // Bulk import logic
          const snList = data.bulkSerialsText
            .split(/[\n,]+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);

          if (snList.length === 0) {
            toast.error('Please input at least one serial number.');
            return;
          }

          let successCount = 0;
          let failCount = 0;

          // Request sequentially
          for (const sn of snList) {
            try {
              const res: any = await axiosClient.post('/ProductSerial', {
                productId: data.productId,
                serialNo: sn
              });
              if (res?.success) successCount++;
              else failCount++;
            } catch (err) {
              failCount++;
            }
          }

          toast.success(`Bulk import completed: ${successCount} imported successfully, ${failCount} failed.`);
          setIsDialogOpen(false);
          fetchTabDetails();
        } else {
          // Single import
          const response: any = await axiosClient.post('/ProductSerial', {
            productId: data.productId,
            serialNo: data.serialNo
          });
          if (response?.success) {
            toast.success('Serial registered successfully!');
            setIsDialogOpen(false);
            fetchTabDetails();
          } else {
            toast.error(response?.message || 'Failed to save serial.');
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'An error occurred while saving.');
    }
  };

  // Delete Action
  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this ${activeTab.slice(0, -1)}?`)) return;

    try {
      let endpoint = '';
      if (activeTab === 'variants') endpoint = `/ProductVariant/${id}`;
      else if (activeTab === 'batches') endpoint = `/ProductBatch/${id}`;
      else if (activeTab === 'serials') endpoint = `/ProductSerial/${id}`;

      const response: any = await axiosClient.delete(endpoint);
      if (response?.success) {
        toast.success('Record deleted successfully!');
        fetchTabDetails();
      } else {
        toast.error(response?.message || 'Failed to delete record.');
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
          <p className="text-muted-foreground">You do not have permission to view product configuration modules.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      {/* Header section */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/product')}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-sm font-medium transition-colors mb-1 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </button>
          <h1 className="text-3xl font-bold tracking-tight">Product Attributes</h1>
          <p className="text-muted-foreground mt-1">Manage variations, lot batches, and serial IDs for inventory tracking.</p>
        </div>
      </div>

      {/* Main filter toolbar */}
      <Section className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs mb-6">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
          <Input
            type="search"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Filter Product:</span>
            <SearchableProductDropdown
              products={products}
              selectedId={selectedProductId}
              onChange={setSelectedProductId}
              isLoading={isProductsLoading}
              showAllOption={true}
              className="w-[220px]"
            />
          </div>

          {canCreate && (
            <Button onClick={handleOpenCreateDialog} className="gap-1.5 shrink-0 h-9">
              <Plus className="h-4 w-4" /> Add {activeTab === 'variants' ? 'Variant' : activeTab === 'batches' ? 'Batch' : 'Serial'}
            </Button>
          )}
        </div>
      </Section>

      {/* Attributes Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 max-w-[450px] mb-6">
          <TabsTrigger value="variants" className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" /> Variants
          </TabsTrigger>
          <TabsTrigger value="batches" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> Batches
          </TabsTrigger>
          <TabsTrigger value="serials" className="flex items-center gap-1.5">
            <Hash className="h-4 w-4" /> Serials
          </TabsTrigger>
        </TabsList>

        {/* Tab Content: Variants */}
        <TabsContent value="variants" className="outline-none">
          <Section className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[80px]">Sr. No.</TableHead>
                    <TableHead className="w-[180px]">Product Name</TableHead>
                    <TableHead className="w-[160px]">Combination</TableHead>
                    <TableHead className="w-[150px]">SKU / Barcode</TableHead>
                    <TableHead className="w-[110px] text-right">Purchase (₹)</TableHead>
                    <TableHead className="w-[110px] text-right">Sales (₹)</TableHead>
                    <TableHead className="w-[100px] text-center">Default</TableHead>
                    {(canEdit || canDelete) && <TableHead className="text-right w-[110px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isDataLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No product variants found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item, index) => {
                      const v = item as ProductVariantDto;
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs">{(pageNumber - 1) * pageSize + index + 1}</TableCell>
                          <TableCell className="font-semibold">{productMap.get(v.productId) || 'Unknown Product'}</TableCell>
                          <TableCell>
                            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded font-medium">
                              {v.variantCombination || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs space-y-0.5">
                            {v.sku && <div>SKU: <span className="font-mono">{v.sku}</span></div>}
                            {v.barcode && <div>Barcode: <span className="font-mono text-muted-foreground">{v.barcode}</span></div>}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{v.purchaseRate?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-150">{v.salesRate?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell className="text-center">
                            {v.isDefault ? (
                              <CheckCircle2 className="h-4.5 w-4.5 text-green-500 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          {(canEdit || canDelete) && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {canEdit && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(v)} title="Edit">
                                    <Pencil className="h-4 w-4 text-blue-500" />
                                  </Button>
                                )}
                                {canDelete && v.id && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(v.id!)} title="Delete">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>
        </TabsContent>

        {/* Tab Content: Batches */}
        <TabsContent value="batches" className="outline-none">
          <Section className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[80px]">Sr. No.</TableHead>
                    <TableHead className="w-[200px]">Product Name</TableHead>
                    <TableHead className="w-[180px]">Batch Number</TableHead>
                    <TableHead className="w-[150px]">Expiry Date</TableHead>
                    <TableHead className="w-[120px] text-right">MRP (₹)</TableHead>
                    {(canEdit || canDelete) && <TableHead className="text-right w-[110px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isDataLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No product batches found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item, index) => {
                      const b = item as ProductBatchDto;
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{(pageNumber - 1) * pageSize + index + 1}</TableCell>
                          <TableCell className="font-semibold">{productMap.get(b.productId) || 'Unknown Product'}</TableCell>
                          <TableCell>
                            <span className="font-mono font-bold text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200/50 dark:border-amber-900/30">
                              {b.batchNo || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">{b.mrp?.toFixed(2) || '0.00'}</TableCell>
                          {(canEdit || canDelete) && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {canEdit && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(b)} title="Edit">
                                    <Pencil className="h-4 w-4 text-blue-500" />
                                  </Button>
                                )}
                                {canDelete && b.id && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(b.id!)} title="Delete">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>
        </TabsContent>

        {/* Tab Content: Serials */}
        <TabsContent value="serials" className="outline-none">
          <Section className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[80px]">Sr. No.</TableHead>
                    <TableHead className="w-[240px]">Product Name</TableHead>
                    <TableHead className="w-[200px]">Serial Number</TableHead>
                    {(canEdit || canDelete) && <TableHead className="text-right w-[110px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isDataLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No product serial numbers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item, index) => {
                      const s = item as ProductSerialDto;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">{(pageNumber - 1) * pageSize + index + 1}</TableCell>
                          <TableCell className="font-semibold">{productMap.get(s.productId) || 'Unknown Product'}</TableCell>
                          <TableCell className="font-mono text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">
                            {s.serialNo || '-'}
                          </TableCell>
                          {(canEdit || canDelete) && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {canEdit && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(s)} title="Edit">
                                    <Pencil className="h-4 w-4 text-blue-500" />
                                  </Button>
                                )}
                                {canDelete && s.id && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(s.id!)} title="Delete">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>
        </TabsContent>

        {/* Dynamic Pagination Footer */}
        {activeItemsCount > 0 && (
          <div className="py-4 px-6 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4 mt-1 rounded-xl border border-border bg-card">
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
      </Tabs>

      {/* Unified Attributes CRUD Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit' : 'Add New'} {activeTab === 'variants' ? 'Product Variant' : activeTab === 'batches' ? 'Product Batch' : 'Serial Number'}
            </DialogTitle>
          </DialogHeader>

          {/* Form Content: Variants */}
          {activeTab === 'variants' && (
            <form onSubmit={handleSubmitVariant(onSubmitVariant)} className="space-y-4 py-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Select Product</label>
                <SearchableProductDropdown
                  products={products}
                  selectedId={watchVariant('productId') || ''}
                  onChange={(val) => setValueVariant('productId', val)}
                  placeholder="-- Choose Product --"
                />
                {errorsVariant.productId && <span className="text-xs text-red-500">Product is required.</span>}
              </div>

              <FormField
                label="Variant Combination (e.g. Size: L, Color: Black)"
                placeholder="Size: XL, Color: Grey"
                {...registerVariant('variantCombination', { required: 'Variant combination is required' })}
              />
              {errorsVariant.variantCombination && <span className="text-xs text-red-500">{errorsVariant.variantCombination.message}</span>}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="SKU"
                  placeholder="SKU-CODE"
                  {...registerVariant('sku')}
                />
                <FormField
                  label="Barcode"
                  placeholder="Barcode number"
                  {...registerVariant('barcode')}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  label="Purchase Rate (₹)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...registerVariant('purchaseRate')}
                />
                <FormField
                  label="Sales Rate (₹)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...registerVariant('salesRate')}
                />
                <FormField
                  label="MRP (₹)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...registerVariant('mrp')}
                />
              </div>

              <div className="flex items-center space-x-2 pt-2 pb-1">
                <Switch
                  id="isDefault"
                  checked={watchVariant('isDefault') || false}
                  onCheckedChange={(val) => setValueVariant('isDefault', val)}
                />
                <label htmlFor="isDefault" className="text-sm font-semibold leading-none cursor-pointer">
                  Set as Default Variant
                </label>
              </div>

              <DialogFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmittingVariant}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingVariant}>
                  {isSubmittingVariant ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Variant
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Form Content: Batches */}
          {activeTab === 'batches' && (
            <form onSubmit={handleSubmitBatch(onSubmitBatch)} className="space-y-4 py-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Select Product</label>
                <SearchableProductDropdown
                  products={products}
                  selectedId={watchBatch('productId') || ''}
                  onChange={(val) => setValueBatch('productId', val)}
                  placeholder="-- Choose Product --"
                />
                {errorsBatch.productId && <span className="text-xs text-red-500">Product is required.</span>}
              </div>

              <FormField
                label="Batch Number / Code"
                placeholder="e.g. BATCH-2026-05"
                {...registerBatch('batchNo', { required: 'Batch number is required' })}
              />
              {errorsBatch.batchNo && <span className="text-xs text-red-500">{errorsBatch.batchNo.message}</span>}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Expiry Date"
                  type="date"
                  {...registerBatch('expiryDate', { required: 'Expiry date is required' })}
                />
                <FormField
                  label="MRP (₹)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...registerBatch('mrp')}
                />
              </div>

              {errorsBatch.expiryDate && <span className="text-xs text-red-500">{errorsBatch.expiryDate.message}</span>}

              <DialogFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmittingBatch}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingBatch}>
                  {isSubmittingBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Batch
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Form Content: Serials (Single & Bulk) */}
          {activeTab === 'serials' && (
            <form onSubmit={handleSubmitSerial(onSubmitSerial)} className="space-y-4 py-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Select Product</label>
                <SearchableProductDropdown
                  products={products}
                  selectedId={watchSerial('productId') || ''}
                  onChange={(val) => setValueSerial('productId', val)}
                  placeholder="-- Choose Product --"
                />
                {errorsSerial.productId && <span className="text-xs text-red-500">Product is required.</span>}
              </div>

              {/* Single vs Bulk Toggle only for creation */}
              {!editingId && (
                <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-border">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Import Mode</span>
                  <div className="flex items-center gap-6 ml-auto">
                    <label className="flex items-center gap-1.5 text-sm font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={!isBulkSerials}
                        onChange={() => setIsBulkSerials(false)}
                        className="h-4 w-4"
                      />
                      Single Serial
                    </label>
                    <label className="flex items-center gap-1.5 text-sm font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={isBulkSerials}
                        onChange={() => setIsBulkSerials(true)}
                        className="h-4 w-4"
                      />
                      Bulk Import
                    </label>
                  </div>
                </div>
              )}

              {isBulkSerials && !editingId ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Serial Numbers (Separated by line breaks or commas)</label>
                  <textarea
                    rows={6}
                    placeholder="e.g.&#10;SN987234981&#10;SN987234982&#10;SN987234983"
                    {...registerSerial('bulkSerialsText', { required: isBulkSerials })}
                    className="w-full p-3 rounded-md border border-zinc-200 bg-white text-zinc-900 text-sm font-mono focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                  {errorsSerial.bulkSerialsText && <span className="text-xs text-red-500">Bulk text is required.</span>}
                </div>
              ) : (
                <FormField
                  label="Serial Number"
                  placeholder="e.g. SN10293847"
                  {...registerSerial('serialNo', { required: !isBulkSerials })}
                />
              )}
              {errorsSerial.serialNo && !isBulkSerials && <span className="text-xs text-red-500">Serial number is required.</span>}

              <DialogFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmittingSerial}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingSerial}>
                  {isSubmittingSerial ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isBulkSerials && !editingId ? 'Import Serials' : 'Save Serial'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
