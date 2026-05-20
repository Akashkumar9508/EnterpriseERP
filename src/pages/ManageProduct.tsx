import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Plus, Loader2, Package, Tag, Layers, Percent, Settings2 } from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
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
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import type { ProductDto } from '@/types/ProductDto';
import type { CategoryDto } from '@/types/CategoryDto';
import type { BrandDto } from '@/types/BrandDto';
import type { ManufacturerDto } from '@/types/ManufacturerDto';
import type { HSNCodeDto } from '@/types/HSNCodeDto';
import type { GstDto } from '@/types/GstDto';

export default function ManageProduct() {
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/product');
  const user = useAppSelector((state) => state.auth.user);

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [manufacturers, setManufacturers] = useState<ManufacturerDto[]>([]);
  const [hsnCodes, setHsnCodes] = useState<HSNCodeDto[]>([]);
  const [taxProfiles, setTaxProfiles] = useState<GstDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Search state
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductDto>();

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/Product');
      if (response?.success) {
        setProducts(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch products', error);
      toast.error('Failed to load products.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [resCats, resBrands, resMfrs, resHsn, resTax] = (await Promise.all([
        axiosClient.get('/Category'),
        axiosClient.get('/Brand'),
        axiosClient.get('/Manufacturer'),
        axiosClient.get('/HSNCode'),
        axiosClient.get('/TaxProfile'),
      ])) as any[];

      if (resCats?.success) setCategories(resCats.data || []);
      if (resBrands?.success) setBrands(resBrands.data || []);
      if (resMfrs?.success) setManufacturers(resMfrs.data || []);
      if (resHsn?.success) setHsnCodes(resHsn.data || []);
      if (resTax?.success) setTaxProfiles(resTax.data || []);
    } catch (error) {
      console.error('Failed to fetch product dependencies', error);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchProducts();
      fetchDropdownData();
    }
  }, [canView]);

  // Client-side search filtering
  const filteredProducts = products.filter((p) => {
    const searchLower = search.toLowerCase();
    const catName = categories.find((c) => c.id === p.categoryId)?.name || '';
    const brandName = brands.find((b) => b.id === p.brandId)?.name || '';
    return (
      p.name.toLowerCase().includes(searchLower) ||
      p.productCode.toLowerCase().includes(searchLower) ||
      (p.sku && p.sku.toLowerCase().includes(searchLower)) ||
      catName.toLowerCase().includes(searchLower) ||
      brandName.toLowerCase().includes(searchLower)
    );
  });

  // Client-side pagination
  const totalCount = filteredProducts.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedProducts = filteredProducts.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

  useEffect(() => {
    setPageNumber(1);
  }, [search, pageSize]);

  const openCreateDialog = () => {
    reset({
      productCode: '',
      sku: '',
      barcode: '',
      name: '',
      shortName: '',
      description: '',
      categoryId: '',
      brandId: '',
      manufacturerId: '',
      hsnCodeId: '',
      taxProfileId: '',
      productType: 1, // Default Physical
      trackInventory: true,
      trackBatch: false,
      trackExpiry: false,
      trackSerial: false,
      minStock: 0,
      reorderLevel: 0,
      purchaseRate: 0,
      salesRate: 0,
      mrp: 0,
      isActive: true,
    });
    setEditingId(null);
    setActiveTab('general');
    setIsDialogOpen(true);
  };

  const openEditDialog = (p: ProductDto) => {
    reset({
      productCode: p.productCode,
      sku: p.sku || '',
      barcode: p.barcode || '',
      name: p.name,
      shortName: p.shortName || '',
      description: p.description || '',
      categoryId: p.categoryId || '',
      brandId: p.brandId || '',
      manufacturerId: p.manufacturerId || '',
      hsnCodeId: p.hsnCodeId || '',
      taxProfileId: p.taxProfileId || '',
      productType: p.productType || 1,
      trackInventory: p.trackInventory ?? true,
      trackBatch: p.trackBatch ?? false,
      trackExpiry: p.trackExpiry ?? false,
      trackSerial: p.trackSerial ?? false,
      minStock: p.minStock || 0,
      reorderLevel: p.reorderLevel || 0,
      purchaseRate: p.purchaseRate || 0,
      salesRate: p.salesRate || 0,
      mrp: p.mrp || 0,
      isActive: p.isActive,
    });
    setEditingId(p.id || null);
    setActiveTab('general');
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ProductDto) => {
    try {
      const payload = {
        ...data,
        companyId: user?.companyId,
        branchId: user?.branchId,
        // Enforce numeric conversions
        productType: Number(data.productType),
        minStock: Number(data.minStock),
        reorderLevel: Number(data.reorderLevel),
        purchaseRate: Number(data.purchaseRate),
        salesRate: Number(data.salesRate),
        mrp: Number(data.mrp),
      };

      let response: any;
      if (editingId) {
        response = await axiosClient.put('/Product', { ...payload, id: editingId });
      } else {
        response = await axiosClient.post('/Product', payload);
      }

      if (response?.success) {
        setIsDialogOpen(false);
        toast.success(editingId ? 'Product updated successfully!' : 'Product created successfully!');
        fetchProducts();
      } else {
        toast.error(response?.message || 'Failed to save product');
      }
    } catch (error: any) {
      console.error('Save error', error);
      toast.error(error?.message || 'An error occurred while saving.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response: any = await axiosClient.delete(`/Product/${id}`);
      if (response?.success) {
        toast.success('Product deleted successfully!');
        fetchProducts();
      } else {
        toast.error(response?.message || 'Failed to delete product');
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
          <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
          <p className="text-muted-foreground mt-1">Manage physical goods, services, rates, and inventory controls.</p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Input
            type="search"
            placeholder="Search products, codes, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[300px]"
          />
          {canCreate && (
            <Button onClick={openCreateDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Product
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
                <TableHead className="w-[200px]">Product Name</TableHead>
                <TableHead className="w-[120px]">Code / SKU</TableHead>
                <TableHead className="w-[180px]">Category & Brand</TableHead>
                <TableHead className="text-right w-[110px]">Purchase Rate</TableHead>
                <TableHead className="text-right w-[110px]">Sales Rate</TableHead>
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
              ) : paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((p, index) => {
                  const catName = categories.find((c) => c.id === p.categoryId)?.name || '-';
                  const brandName = brands.find((b) => b.id === p.brandId)?.name || '-';
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {(pageNumber - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Package className="h-4 w-4 text-zinc-400 shrink-0" />
                        <div>
                          <div>{p.name}</div>
                          {p.shortName && <div className="text-xs text-muted-foreground">{p.shortName}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold">{p.productCode}</div>
                        {p.sku && <div className="text-xs text-muted-foreground font-mono">SKU: {p.sku}</div>}
                      </TableCell>
                      <TableCell className="text-xs leading-relaxed text-muted-foreground">
                        <div>📁 {catName}</div>
                        <div>🏷️ {brandName}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {p.purchaseRate !== undefined ? `₹${p.purchaseRate.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {p.salesRate !== undefined ? `₹${p.salesRate.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            p.isActive
                              ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                              : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(p)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4 text-blue-500" />
                              </Button>
                            )}
                            {canDelete && p.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(p.id!)}
                                title="Delete"
                              >
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
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Product' : 'Create Product'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="py-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-6">
                <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Tag className="h-3.5 w-3.5" /> General
                </TabsTrigger>
                <TabsTrigger value="categorization" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Layers className="h-3.5 w-3.5" /> Categorize
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Percent className="h-3.5 w-3.5" /> Price & Tax
                </TabsTrigger>
                <TabsTrigger value="inventory" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Settings2 className="h-3.5 w-3.5" /> Inventory
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: General */}
              <TabsContent value="general" className="space-y-4 outline-none">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Product Name"
                    placeholder="e.g. Wireless Mouse"
                    {...register('name', { required: 'Product name is required' })}
                  />
                  <FormField
                    label="Product Code"
                    placeholder="e.g. PROD-100"
                    {...register('productCode', { required: 'Product code is required' })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                  {errors.productCode && <span className="text-xs text-red-500">{errors.productCode.message}</span>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="SKU"
                    placeholder="Stock Keeping Unit"
                    {...register('sku')}
                  />
                  <FormField
                    label="Barcode"
                    placeholder="EAN/UPC Barcode"
                    {...register('barcode')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Short Name"
                    placeholder="Display alias"
                    {...register('shortName')}
                  />
                  <div className="space-y-2">
                    <label htmlFor="productType" className="text-sm font-medium text-foreground">
                      Product Type
                    </label>
                    <Select
                      value={watch('productType')?.toString() || '1'}
                      onValueChange={(val) => setValue('productType', Number(val))}
                    >
                      <SelectTrigger id="productType">
                        <SelectValue placeholder="Product Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Physical / Goods</SelectItem>
                        <SelectItem value="2">Service / Intangible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <FormField
                  label="Description"
                  placeholder="Product description and specs..."
                  {...register('description')}
                />
              </TabsContent>

              {/* Tab 2: Categorization */}
              <TabsContent value="categorization" className="space-y-4 outline-none">
                <div className="space-y-2">
                  <label htmlFor="categoryId" className="text-sm font-medium text-foreground">
                    Category
                  </label>
                  <Select
                    value={watch('categoryId') || ''}
                    onValueChange={(val) => setValue('categoryId', val)}
                  >
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id || ''}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="brandId" className="text-sm font-medium text-foreground">
                    Brand
                  </label>
                  <Select
                    value={watch('brandId') || ''}
                    onValueChange={(val) => setValue('brandId', val)}
                  >
                    <SelectTrigger id="brandId">
                      <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id || ''}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="manufacturerId" className="text-sm font-medium text-foreground">
                    Manufacturer
                  </label>
                  <Select
                    value={watch('manufacturerId') || ''}
                    onValueChange={(val) => setValue('manufacturerId', val)}
                  >
                    <SelectTrigger id="manufacturerId">
                      <SelectValue placeholder="Select Manufacturer" />
                    </SelectTrigger>
                    <SelectContent>
                      {manufacturers.map((m) => (
                        <SelectItem key={m.id} value={m.id || ''}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Tab 3: Pricing & Tax */}
              <TabsContent value="pricing" className="space-y-4 outline-none">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    label="Purchase Rate (₹)"
                    type="number"
                    step="0.01"
                    {...register('purchaseRate', { min: { value: 0, message: 'Rate cannot be negative' } })}
                  />
                  <FormField
                    label="Sales Rate (₹)"
                    type="number"
                    step="0.01"
                    {...register('salesRate', { min: { value: 0, message: 'Rate cannot be negative' } })}
                  />
                  <FormField
                    label="MRP (₹)"
                    type="number"
                    step="0.01"
                    {...register('mrp', { min: { value: 0, message: 'MRP cannot be negative' } })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {errors.purchaseRate && <span className="text-xs text-red-500">{errors.purchaseRate.message}</span>}
                  {errors.salesRate && <span className="text-xs text-red-500">{errors.salesRate.message}</span>}
                  {errors.mrp && <span className="text-xs text-red-500">{errors.mrp.message}</span>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="taxProfileId" className="text-sm font-medium text-foreground">
                    GST Profile (Tax Profile)
                  </label>
                  <Select
                    value={watch('taxProfileId') || ''}
                    onValueChange={(val) => setValue('taxProfileId', val)}
                  >
                    <SelectTrigger id="taxProfileId">
                      <SelectValue placeholder="Select Tax Slab" />
                    </SelectTrigger>
                    <SelectContent>
                      {taxProfiles.map((tp) => (
                        <SelectItem key={tp.id} value={tp.id || ''}>
                          {tp.name} ({tp.cgst + tp.sgst}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="hsnCodeId" className="text-sm font-medium text-foreground">
                    HSN Code
                  </label>
                  <Select
                    value={watch('hsnCodeId') || ''}
                    onValueChange={(val) => setValue('hsnCodeId', val)}
                  >
                    <SelectTrigger id="hsnCodeId">
                      <SelectValue placeholder="Select HSN Code" />
                    </SelectTrigger>
                    <SelectContent>
                      {hsnCodes.map((hsn) => (
                        <SelectItem key={hsn.id} value={hsn.id || ''}>
                          {hsn.code} - {hsn.gstPercentage}% ({hsn.description || 'No Description'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Tab 4: Inventory Settings */}
              <TabsContent value="inventory" className="space-y-4 outline-none">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-muted/20 p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <label htmlFor="trackInventory" className="text-sm font-medium text-foreground">
                      Track Inventory
                    </label>
                    <Switch
                      id="trackInventory"
                      checked={watch('trackInventory')}
                      onCheckedChange={(checked) => setValue('trackInventory', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="trackBatch" className="text-sm font-medium text-foreground">
                      Track Batch
                    </label>
                    <Switch
                      id="trackBatch"
                      checked={watch('trackBatch')}
                      onCheckedChange={(checked) => setValue('trackBatch', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="trackExpiry" className="text-sm font-medium text-foreground">
                      Track Expiry
                    </label>
                    <Switch
                      id="trackExpiry"
                      checked={watch('trackExpiry')}
                      onCheckedChange={(checked) => setValue('trackExpiry', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="trackSerial" className="text-sm font-medium text-foreground">
                      Track Serial Number
                    </label>
                    <Switch
                      id="trackSerial"
                      checked={watch('trackSerial')}
                      onCheckedChange={(checked) => setValue('trackSerial', checked)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Minimum Stock"
                    type="number"
                    {...register('minStock', { min: 0 })}
                  />
                  <FormField
                    label="Reorder Level"
                    type="number"
                    {...register('reorderLevel', { min: 0 })}
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-border mt-4">
                  <label htmlFor="isActive" className="text-sm font-medium text-foreground">
                    Product Status (Active)
                  </label>
                  <Switch
                    id="isActive"
                    checked={watch('isActive')}
                    onCheckedChange={(checked) => setValue('isActive', checked)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-8 pt-4 border-t border-border">
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
                Save Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
