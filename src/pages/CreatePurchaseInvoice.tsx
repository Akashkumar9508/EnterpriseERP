import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Search, 
  Save, 
  ArrowLeft, 
  CheckCircle2
} from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
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
import axiosClient from '@/Services/axiosClient';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';

import type { ProductDto } from '@/types/ProductDto';
import type { WarehouseDto } from '@/types/WarehouseDto';
import type { SupplierDto } from '@/types/SupplierDto';
import type { ProductVariantDto } from '@/types/ProductVariantDto';
import type { ProductBatchDto } from '@/types/ProductBatchDto';
import type { GstDto } from '@/types/GstDto';
import type { PurchaseInvoiceDto } from '@/types/PurchaseInvoiceDto';
import type { PurchaseInvoiceItemDto } from '@/types/PurchaseInvoiceItemDto';



export default function CreatePurchaseInvoice() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const { canCreate } = usePermissions('/product');
  const user = useAppSelector((state) => state.auth.user);

  // Edit-mode loading
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  // dependencies lists
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [allVariants, setAllVariants] = useState<ProductVariantDto[]>([]);
  const [allBatches, setAllBatches] = useState<ProductBatchDto[]>([]);
  const [taxProfiles, setTaxProfiles] = useState<GstDto[]>([]);
  
  const [isLoadingDeps, setIsLoadingDeps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // invoice master form state
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [flatDiscountAmount, setFlatDiscountAmount] = useState(0);

  // invoice details items state
  const [items, setItems] = useState<PurchaseInvoiceItemDto[]>([]);

  // dialog product selection state
  const [selectingProductForIndex, setSelectingProductForIndex] = useState<number | null>(null);
  const [dialogSearch, setDialogSearch] = useState('');

  const dialogFilteredProducts = useMemo(() => {
    if (!dialogSearch.trim()) return products;
    const lower = dialogSearch.toLowerCase();
    return products.filter(
      p => p.name.toLowerCase().includes(lower) ||
           p.productCode.toLowerCase().includes(lower) ||
           (p.sku && p.sku.toLowerCase().includes(lower)) ||
           (p.barcode && p.barcode.toLowerCase().includes(lower))
    );
  }, [products, dialogSearch]);

  useEffect(() => {
    if (selectingProductForIndex !== null) {
      setDialogSearch('');
    }
  }, [selectingProductForIndex]);

  // load dependencies
  useEffect(() => {
    const fetchDeps = async () => {
      setIsLoadingDeps(true);
      try {
        const [resSup, resWh, resProd, resVar, resBatch, resTax] = await Promise.all([
          axiosClient.get('/Supplier'),
          axiosClient.get('/Warehouse'),
          axiosClient.get('/Product'),
          axiosClient.get('/ProductVariant'),
          axiosClient.get('/ProductBatch'),
          axiosClient.get('/TaxProfile'),
        ]) as any[];

        if (resSup?.success) setSuppliers(resSup.data || []);
        if (resWh?.success) {
          const whData = resWh.data || [];
          setWarehouses(whData);
          if (whData.length > 0) setWarehouseId(whData[0].id || '');
        }
        if (resProd?.success) setProducts(resProd.data || []);
        if (resVar?.success) setAllVariants(resVar.data || []);
        if (resBatch?.success) setAllBatches(resBatch.data || []);
        if (resTax?.success) setTaxProfiles(resTax.data || []);
      } catch (e) {
        console.error('Failed to load dependencies', e);
        toast.error('Failed to load dependecy lists.');
      } finally {
        setIsLoadingDeps(false);
      }
    };

    if (canCreate) {
      fetchDeps();
    }
  }, [canCreate]);

  // Load existing invoice in edit mode
  useEffect(() => {
    if (!isEditMode || !editId) return;

    const loadInvoice = async () => {
      setIsLoadingEdit(true);
      try {
        const response: any = await axiosClient.get(`/PurchaseInvoice/${editId}`);
        if (response?.success && response.data) {
          const inv = response.data;
          setSupplierId(inv.supplierId || '');
          setWarehouseId(inv.warehouseId || '');
          setInvoiceNo(inv.invoiceNo || '');
          setReferenceNo(inv.referenceNo || '');
          setInvoiceDate(inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
          setRemarks(inv.remarks || '');
          if (inv.items && inv.items.length > 0) {
            setItems(inv.items.map((item: any) => ({
              id: item.id,
              productId: item.productId || '',
              productVariantId: item.productVariantId || '',
              productBatchId: item.productBatchId || '',
              quantity: item.quantity || 1,
              freeQuantity: item.freeQuantity || 0,
              purchaseRate: item.purchaseRate || 0,
              salesRate: item.salesRate || 0,
              mrp: item.mrp || 0,
              discountPercent: item.discountPercent || 0,
              discountAmount: item.discountAmount || 0,
              taxPercent: item.taxPercent || 0,
              taxAmount: item.taxAmount || 0,
              totalAmount: item.totalAmount || 0
            })));
          }
          // Restore flat discount: existing discountAmount minus sum of line discounts
          const lineDiscountsSum = (inv.items || []).reduce((s: number, i: any) => s + (i.discountAmount || 0), 0);
          const flatDisc = (inv.discountAmount || 0) - lineDiscountsSum;
          setFlatDiscountAmount(flatDisc > 0 ? flatDisc : 0);
        } else {
          toast.error('Failed to load invoice for editing.');
          navigate('/purchase-invoice');
        }
      } catch (e) {
        console.error('Failed to load invoice', e);
        toast.error('Failed to load invoice for editing.');
        navigate('/purchase-invoice');
      } finally {
        setIsLoadingEdit(false);
      }
    };

    loadInvoice();
  }, [isEditMode, editId]);

  // add blank line item row
  const addLineItem = () => {
    setItems([
      ...items,
      {
        productId: '',
        quantity: 1,
        freeQuantity: 0,
        purchaseRate: 0,
        salesRate: 0,
        mrp: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        totalAmount: 0
      }
    ]);
  };

  // remove line item row
  const removeLineItem = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  // handle product selection change
  const handleProductChange = (index: number, prodId: string) => {
    const product = products.find(p => p.id === prodId);
    if (!product) return;

    // lookup default tax rate
    let defaultTaxRate = 0;
    if (product.taxProfileId) {
      const taxProfile = taxProfiles.find(tp => tp.id === product.taxProfileId);
      if (taxProfile) defaultTaxRate = taxProfile.igst;
    }

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: prodId,
      productVariantId: '', // reset variant
      productBatchId: '',   // reset batch
      purchaseRate: product.purchaseRate || 0,
      salesRate: product.salesRate || 0,
      mrp: product.mrp || 0,
      taxPercent: defaultTaxRate,
      quantity: 1,
      freeQuantity: 0,
      discountPercent: 0,
      discountAmount: 0
    };

    // Calculate line totals
    calculateLineTotals(updated, index);
  };

  // handle variant selection change
  const handleVariantChange = (index: number, variantId: string) => {
    const updated = [...items];
    updated[index].productVariantId = variantId;

    const variant = allVariants.find(v => v.id === variantId);
    if (variant) {
      updated[index].purchaseRate = variant.purchaseRate || updated[index].purchaseRate;
      updated[index].salesRate = variant.salesRate || updated[index].salesRate;
      updated[index].mrp = variant.mrp || updated[index].mrp;
    }

    calculateLineTotals(updated, index);
  };

  // handle batch selection change
  const handleBatchChange = (index: number, batchId: string) => {
    const updated = [...items];
    updated[index].productBatchId = batchId;

    const batch = allBatches.find(b => b.id === batchId);
    if (batch) {
      updated[index].mrp = batch.mrp || updated[index].mrp;
    }

    calculateLineTotals(updated, index);
  };

  // handle generic numeric field update on line item
  const handleNumericFieldChange = (index: number, field: keyof PurchaseInvoiceItemDto, value: number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value
    };

    calculateLineTotals(updated, index);
  };

  // perform line totals calculations
  const calculateLineTotals = (list: PurchaseInvoiceItemDto[], index: number) => {
    const item = list[index];
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.purchaseRate) || 0;
    const discPct = Number(item.discountPercent) || 0;
    const taxPct = Number(item.taxPercent) || 0;

    const amount = qty * rate;
    const discountAmount = amount * (discPct / 100);
    const taxableAmount = amount - discountAmount;
    const taxAmount = taxableAmount * (taxPct / 100);
    const totalAmount = taxableAmount + taxAmount;

    list[index] = {
      ...item,
      discountAmount: Number(discountAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2))
    };

    setItems(list);
  };

  // global summaries
  const summaries = useMemo(() => {
    let subTotal = 0;
    let totalDiscount = flatDiscountAmount;
    let totalTax = 0;
    let netAmount = 0;

    items.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.purchaseRate) || 0;
      subTotal += qty * rate;
      totalDiscount += Number(item.discountAmount) || 0;
      totalTax += Number(item.taxAmount) || 0;
    });

    netAmount = subTotal - totalDiscount + totalTax;

    return {
      subTotal: Number(subTotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2))
    };
  }, [items, flatDiscountAmount]);

  // submit handler
  const handleSave = async (status: number) => {
    if (!supplierId) {
      toast.error('Please select a supplier.');
      return;
    }
    if (!warehouseId) {
      toast.error('Please select a warehouse.');
      return;
    }
    if (!invoiceNo.trim()) {
      toast.error('Please enter an invoice number.');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item to the invoice.');
      return;
    }

    const invalidItem = items.some(item => !item.productId || Number(item.quantity) <= 0 || Number(item.purchaseRate) < 0);
    if (invalidItem) {
      toast.error('Please ensure all items have a product, quantity greater than 0, and rate greater than or equal to 0.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: PurchaseInvoiceDto = {
        companyId: user?.companyId || 'F6579BDB-C05B-4AF0-9404-7EBC3C15B0D8',
        branchId: user?.branchId || 'F6579BDB-C05B-4AF0-9404-7EBC3C15B0D8',
        supplierId,
        warehouseId,
        invoiceNo,
        referenceNo,
        invoiceDate: new Date(invoiceDate).toISOString(),
        remarks,
        subTotal: summaries.subTotal,
        discountAmount: summaries.totalDiscount,
        taxAmount: summaries.totalTax,
        netAmount: summaries.netAmount,
        status, // 1 = Draft, 2 = Posted
        items: items.map(i => ({
          productId: i.productId,
          productVariantId: i.productVariantId || null as any,
          productBatchId: i.productBatchId || null as any,
          quantity: Number(i.quantity),
          freeQuantity: Number(i.freeQuantity) || 0,
          purchaseRate: Number(i.purchaseRate),
          salesRate: Number(i.salesRate) || 0,
          mrp: Number(i.mrp) || 0,
          discountPercent: Number(i.discountPercent) || 0,
          discountAmount: Number(i.discountAmount) || 0,
          taxPercent: Number(i.taxPercent) || 0,
          taxAmount: Number(i.taxAmount) || 0,
          totalAmount: Number(i.totalAmount) || 0
        }))
      };

      let response: any;
      if (isEditMode && editId) {
        response = await axiosClient.put(`/PurchaseInvoice/${editId}`, payload);
      } else {
        response = await axiosClient.post('/PurchaseInvoice', payload);
      }

      if (response?.success) {
        toast.success(
          status === 2
            ? 'Purchase Invoice posted and stock updated!'
            : isEditMode
              ? 'Purchase Invoice draft updated successfully!'
              : 'Purchase Invoice saved as draft!'
        );
        navigate('/purchase-invoice');
      } else {
        toast.error(response?.message || 'Failed to save purchase invoice.');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // filter variants & batches for a specific product
  const getVariantsForProduct = (productId: string) => {
    return allVariants.filter(v => v.productId === productId);
  };

  const getBatchesForProduct = (productId: string) => {
    return allBatches.filter(b => b.productId === productId);
  };

  if (!canCreate) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view purchase modules.</p>
        </div>
      </Page>
    );
  }

  if (isLoadingEdit) {
    return (
      <Page>
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading invoice for editing...</span>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      {/* Top action header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchase-invoice')} className="h-9 w-9">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditMode ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEditMode
                ? 'Update the draft invoice details. Only draft invoices can be edited.'
                : 'Record new purchase billing details from a supplier.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => handleSave(1)} 
            disabled={isSaving || isLoadingDeps}
            className="h-9 text-xs"
          >
            {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save as Draft
          </Button>
          <Button 
            onClick={() => handleSave(2)} 
            disabled={isSaving || isLoadingDeps}
            className="h-9 text-xs bg-green-600 hover:bg-green-700 text-white"
          >
            {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
            Post Invoice (Receive Stock)
          </Button>
        </div>
      </div>

      {isLoadingDeps ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading configurations and catalogues...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Metadata Section */}
          <Section className="bg-card border border-border rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider block">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-zinc-200 bg-white text-zinc-900 text-xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">Select Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider block">Destination Warehouse</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-zinc-200 bg-white text-zinc-900 text-xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">Supplier Invoice No.</label>
              <Input
                type="text"
                placeholder="e.g. INV-2026-001"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">Invoice Date</label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">Reference No / PO Number</label>
              <Input
                type="text"
                placeholder="e.g. PO-887766 (optional)"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">Remarks / Notes</label>
              <Input
                type="text"
                placeholder="Optional billing details or terms description..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </Section>

          {/* Grid Item Table Details */}
          <Section className="bg-card border border-border rounded-xl shadow-xs overflow-hidden p-0">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Invoice Line Items</h2>
              <Button type="button" onClick={addLineItem} className="h-8 text-xs gap-1 py-1">
                <Plus className="h-3.5 w-3.5" /> Add Line Item
              </Button>
            </div>            <div className="w-full overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="w-[40px] px-1 text-center">Sr.</TableHead>
                    <TableHead className="w-[200px] px-1.5">Product Selection</TableHead>
                    <TableHead className="w-[120px] px-1.5">Variant</TableHead>
                    <TableHead className="w-[100px] px-1.5">Batch No.</TableHead>
                    <TableHead className="w-[70px] px-1.5 text-right">Qty</TableHead>
                    <TableHead className="w-[75px] px-1.5 text-right">Free Qty</TableHead>
                    <TableHead className="w-[85px] px-1.5 text-right">Purchase Rate</TableHead>
                    <TableHead className="w-[85px] px-1.5 text-right">MRP</TableHead>
                    <TableHead className="w-[85px] px-1.5 text-right">Sales Rate</TableHead>
                    <TableHead className="w-[70px] px-1.5 text-right">Disc %</TableHead>
                    <TableHead className="w-[70px] px-1.5 text-right">Tax %</TableHead>
                    <TableHead className="w-[95px] px-1.5 text-right">Total Amount</TableHead>
                    <TableHead className="w-[40px] px-1 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="py-8 text-center text-xs text-muted-foreground">
                        No items added yet. Click "Add Line Item" to start adding products.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => {
                      const prodVariants = getVariantsForProduct(item.productId);
                      const prodBatches = getBatchesForProduct(item.productId);
                      
                      return (
                        <TableRow key={index} className="align-middle">
                          <TableCell className="font-mono text-[10px] py-2 px-1 text-center">{index + 1}</TableCell>
                          <TableCell className="py-2 px-1.5">
                            {(() => {
                              const selectedProduct = products.find(p => p.id === item.productId);
                              return (
                                <button
                                  type="button"
                                  onClick={() => setSelectingProductForIndex(index)}
                                  className="flex h-8 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 hover:bg-zinc-50 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 text-left cursor-pointer transition-colors duration-150"
                                >
                                  {selectedProduct ? (
                                    <div className="truncate pr-1">
                                      <div className="font-medium truncate">{selectedProduct.name}</div>
                                      <div className="text-[9px] text-zinc-400 font-mono leading-none truncate mt-0.5">{selectedProduct.productCode}</div>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-400 dark:text-zinc-500">Select Product...</span>
                                  )}
                                  <Search className="h-3 w-3 shrink-0 text-zinc-400 ml-1.5" />
                                </button>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="py-2 px-1.5">
                            <select
                              value={item.productVariantId || ''}
                              onChange={(e) => handleVariantChange(index, e.target.value)}
                              disabled={!item.productId || prodVariants.length === 0}
                              className="w-full h-8 px-1.5 rounded-md border border-zinc-200 bg-white text-zinc-900 text-xs focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <option value="">Base Product</option>
                              {prodVariants.map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.variantCombination || v.sku}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="py-2 px-1.5">
                            <select
                              value={item.productBatchId || ''}
                              onChange={(e) => handleBatchChange(index, e.target.value)}
                              disabled={!item.productId || prodBatches.length === 0}
                              className="w-full h-8 px-1.5 rounded-md border border-zinc-200 bg-white text-zinc-900 text-xs focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <option value="">No Batch</option>
                              {prodBatches.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.batchNo}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="py-2 px-1.5">
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => handleNumericFieldChange(index, 'quantity', Number(e.target.value))}
                              disabled={!item.productId}
                              className="h-8 text-xs text-right font-mono px-1.5 py-1"
                            />
                          </TableCell>
                          <TableCell className="py-2 px-1.5">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={item.freeQuantity}
                              onChange={(e) => handleNumericFieldChange(index, 'freeQuantity', Number(e.target.value))}
                              disabled={!item.productId}
                              className="h-8 text-xs text-right font-mono px-1.5 py-1"
                            />
                          </TableCell>
                          <TableCell className="py-2 px-1.5">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.purchaseRate}
                              onChange={(e) => handleNumericFieldChange(index, 'purchaseRate', Number(e.target.value))}
                              disabled={!item.productId}
                              className="h-8 text-xs text-right font-mono px-1.5 py-1"
                            />
                          </TableCell>
                          <TableCell className="py-2 px-1.5">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.mrp}
                              onChange={(e) => handleNumericFieldChange(index, 'mrp', Number(e.target.value))}
                              disabled={!item.productId}
                              className="h-8 text-xs text-right font-mono px-1.5 py-1"
                            />
                          </TableCell>
                          <TableCell className="py-2 px-1.5">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.salesRate}
                              onChange={(e) => handleNumericFieldChange(index, 'salesRate', Number(e.target.value))}
                              disabled={!item.productId}
                              className="h-8 text-xs text-right font-mono px-1.5 py-1"
                            />
                          </TableCell>
                          <TableCell className="py-2 px-1.5">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.discountPercent}
                              onChange={(e) => handleNumericFieldChange(index, 'discountPercent', Number(e.target.value))}
                              disabled={!item.productId}
                              className="h-8 text-xs text-right font-mono px-1.5 py-1"
                            />
                          </TableCell>
                          <TableCell className="py-2 px-1.5">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.taxPercent}
                              onChange={(e) => handleNumericFieldChange(index, 'taxPercent', Number(e.target.value))}
                              disabled={!item.productId}
                              className="h-8 text-xs text-right font-mono px-1.5 py-1"
                            />
                          </TableCell>
                          <TableCell className="py-2 px-1.5 text-right font-mono text-xs font-semibold">
                            ₹{item.totalAmount?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell className="py-2 px-1 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLineItem(index)}
                              className="h-7 w-7 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>

          {/* Pricing Summary Layout */}
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
            <div className="w-full md:max-w-md bg-card border border-border p-4 rounded-xl shadow-2xs space-y-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Invoice Terms & Notes</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Saving as a **Draft** stores the invoice details for future edits without affecting your inventory stock levels.
                **Posting the Invoice** locks the values and immediately performs a stock-in transaction, increasing inventory status across the selected warehouse.
              </p>
            </div>

            <div className="w-full md:max-w-xs bg-card border border-border p-5 rounded-xl shadow-xs space-y-3 font-mono text-xs">
              <div className="flex justify-between text-zinc-550 dark:text-zinc-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">₹{summaries.subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-550 dark:text-zinc-400">
                <span>Flat Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={flatDiscountAmount}
                  onChange={(e) => setFlatDiscountAmount(Number(e.target.value) || 0)}
                  className="w-[100px] h-7 px-2 rounded-md border border-zinc-200 bg-white text-zinc-900 text-xs text-right font-mono focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>
              <div className="flex justify-between text-zinc-550 dark:text-zinc-400">
                <span>Line Discounts:</span>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">₹{(summaries.totalDiscount - flatDiscountAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-550 dark:text-zinc-400">
                <span>Total Tax (GST):</span>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">₹{summaries.totalTax.toFixed(2)}</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-sm font-bold">
                <span>Net Payable:</span>
                <span className="text-green-600 dark:text-green-450">₹{summaries.netAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Selection Dialog Modal */}
      <Dialog 
        open={selectingProductForIndex !== null} 
        onOpenChange={(open) => {
          if (!open) setSelectingProductForIndex(null);
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-5 gap-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Select Product</DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search product by name, code, SKU, or barcode..."
              value={dialogSearch}
              onChange={(e) => setDialogSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
              autoFocus
            />
          </div>

          {/* Product Grid Table */}
          <div className="overflow-y-auto flex-1 border border-zinc-200 dark:border-zinc-800 rounded-md min-h-[300px] max-h-[450px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  <th className="p-2.5 pl-3">Product Details</th>
                  <th className="p-2.5 text-right w-[110px]">Purchase Rate</th>
                  <th className="p-2.5 text-right w-[110px] pr-3">MRP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {dialogFilteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => {
                      if (selectingProductForIndex !== null) {
                        handleProductChange(selectingProductForIndex, p.id || '');
                        setSelectingProductForIndex(null);
                      }
                    }}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60 cursor-pointer transition-colors"
                  >
                    <td className="p-2.5 pl-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</div>
                      <div className="flex gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
                        <span>Code: {p.productCode}</span>
                        {p.sku && <span>• SKU: {p.sku}</span>}
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-mono text-zinc-700 dark:text-zinc-350">
                      ₹{p.purchaseRate?.toFixed(2) || '0.00'}
                    </td>
                    <td className="p-2.5 text-right font-mono text-zinc-400 pr-3">
                      ₹{p.mrp?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}

                {dialogFilteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-zinc-400">
                      No products match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <Button
              variant="outline"
              type="button"
              className="h-8 text-xs px-3"
              onClick={() => setSelectingProductForIndex(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
