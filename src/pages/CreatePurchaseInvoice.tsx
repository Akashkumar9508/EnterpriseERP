import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Search, 
  Save, 
  ArrowLeft, 
  CheckCircle2,
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  PlusCircle,
  Check
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
import * as XLSX from 'xlsx';

import type { ProductDto } from '@/types/ProductDto';
import type { WarehouseDto } from '@/types/WarehouseDto';
import type { SupplierDto } from '@/types/SupplierDto';
import type { ProductVariantDto } from '@/types/ProductVariantDto';
import type { ProductBatchDto } from '@/types/ProductBatchDto';
import type { GstDto } from '@/types/GstDto';
import type { PurchaseInvoiceDto } from '@/types/PurchaseInvoiceDto';
import type { PurchaseInvoiceItemDto } from '@/types/PurchaseInvoiceItemDto';

interface PreviewHeader {
  supplierSearch: string;
  supplierId: string;
  warehouseSearch: string;
  warehouseId: string;
  invoiceNo: string;
  invoiceDate: string;
  referenceNo: string;
  remarks: string;
  errors: {
    supplier?: string;
    warehouse?: string;
    invoiceNo?: string;
    invoiceDate?: string;
  };
}

interface PreviewItem {
  id: string;
  productSearch: string;
  productId: string;
  productName: string;
  productCode: string;
  variantSearch: string;
  productVariantId: string;
  batchSearch: string;
  productBatchId: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  freeQuantity: number;
  purchaseRate: number;
  mrp: number;
  salesRate: number;
  discountPercent: number;
  taxPercent: number;
  errors: {
    product?: string;
    quantity?: string;
    freeQuantity?: string;
    purchaseRate?: string;
    mrp?: string;
    salesRate?: string;
    discountPercent?: string;
    taxPercent?: string;
    variant?: string;
    batch?: string;
    duplicate?: string;
    expiryDate?: string;
  };
}

interface PaymentDetailItem {
  id: string;
  paidAmount: number;
  paymentMode: number;
}

export default function CreatePurchaseInvoice() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const { canCreate } = usePermissions('/purchase-invoice/create');
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
  const [upfrontPayments, setUpfrontPayments] = useState<PaymentDetailItem[]>([]);
  const [currentPaidAmount, setCurrentPaidAmount] = useState<number>(0);
  const [currentPaymentMode, setCurrentPaymentMode] = useState<number>(1);

  // invoice details items state
  const [items, setItems] = useState<PurchaseInvoiceItemDto[]>([]);

  // dialog product selection state
  const [selectingProductForIndex, setSelectingProductForIndex] = useState<number | null>(null);
  const [dialogSearch, setDialogSearch] = useState('');

  // Excel import state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewHeader, setPreviewHeader] = useState<PreviewHeader | null>(null);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUpfrontPayments, setPreviewUpfrontPayments] = useState<PaymentDetailItem[]>([]);
  const [previewCurrentPaidAmount, setPreviewCurrentPaidAmount] = useState<number>(0);
  const [previewCurrentPaymentMode, setPreviewCurrentPaymentMode] = useState<number>(1);

  // Excel import preview summary
  const previewSummary = useMemo(() => {
    let subTotal = 0;
    let lineDiscountsSum = 0;
    let totalTax = 0;

    previewItems.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.purchaseRate) || 0;
      const discPct = Number(item.discountPercent) || 0;
      const taxPct = Number(item.taxPercent) || 0;

      const amount = qty * rate;
      const discountAmount = Number((amount * (discPct / 100)).toFixed(2));
      const taxableAmount = amount - discountAmount;
      const taxAmount = Number((taxableAmount * (taxPct / 100)).toFixed(2));

      subTotal += amount;
      lineDiscountsSum += discountAmount;
      totalTax += taxAmount;
    });

    const netAmount = Number((subTotal - lineDiscountsSum + totalTax).toFixed(2));
    return {
      subTotal,
      discountAmount: lineDiscountsSum,
      taxAmount: totalTax,
      netAmount,
    };
  }, [previewItems]);

  const previewTotalPaidUpfront = useMemo(() => {
    return previewUpfrontPayments.reduce((sum, p) => sum + p.paidAmount, 0);
  }, [previewUpfrontPayments]);

  const previewRemainingPayable = useMemo(() => {
    return Number((previewSummary.netAmount - previewTotalPaidUpfront).toFixed(2));
  }, [previewSummary.netAmount, previewTotalPaidUpfront]);

  const previewTotalPaidAmount = useMemo(() => {
    if (previewUpfrontPayments.length > 0) {
      return previewTotalPaidUpfront;
    }
    return previewCurrentPaidAmount;
  }, [previewUpfrontPayments, previewTotalPaidUpfront, previewCurrentPaidAmount]);

  const previewBalanceDue = useMemo(() => {
    return Number((previewSummary.netAmount - previewTotalPaidAmount).toFixed(2));
  }, [previewSummary.netAmount, previewTotalPaidAmount]);

  // Keep previewCurrentPaidAmount in sync with previewRemainingPayable
  useEffect(() => {
    setPreviewCurrentPaidAmount(previewRemainingPayable > 0 ? previewRemainingPayable : 0);
  }, [previewRemainingPayable]);

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

  const filteredWarehouses = useMemo(() => {
    if (user?.warehouseId) {
      return warehouses.filter(w => w.id === user.warehouseId);
    }
    return warehouses;
  }, [warehouses, user?.warehouseId]);

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
          if (user?.warehouseId) {
            setWarehouseId(user.warehouseId);
          } else if (whData.length > 0) {
            setWarehouseId(whData[0].id || '');
          }
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
          const dbPaidAmount = inv.paidAmount || 0;
          const dbPaymentMode = inv.paymentMode || 1;
          if (dbPaidAmount > 0) {
            setUpfrontPayments([
              {
                id: `loaded-${Date.now()}`,
                paidAmount: dbPaidAmount,
                paymentMode: dbPaymentMode
              }
            ]);
          }
          if (inv.items && inv.items.length > 0) {
            setItems(inv.items.map((item: any) => ({
              id: item.id,
              productId: item.productId || '',
              productVariantId: item.productVariantId || '',
              productBatchId: item.productBatchId || '',
              batchNumber: item.batchNumber || '',
              expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
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
        totalAmount: 0,
        batchNumber: '',
        expiryDate: ''
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
      batchNumber: '',      // reset batch number
      expiryDate: '',       // reset expiry date
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

  const totalPaidUpfront = useMemo(() => {
    return upfrontPayments.reduce((sum, p) => sum + p.paidAmount, 0);
  }, [upfrontPayments]);

  const remainingPayable = useMemo(() => {
    return Number((summaries.netAmount - totalPaidUpfront).toFixed(2));
  }, [summaries.netAmount, totalPaidUpfront]);

  const totalPaidAmount = useMemo(() => {
    if (upfrontPayments.length > 0) {
      return totalPaidUpfront;
    }
    return currentPaidAmount;
  }, [upfrontPayments, totalPaidUpfront, currentPaidAmount]);

  const balanceDue = useMemo(() => {
    return Number((summaries.netAmount - totalPaidAmount).toFixed(2));
  }, [summaries.netAmount, totalPaidAmount]);

  // Keep currentPaidAmount in sync with remainingPayable
  useEffect(() => {
    setCurrentPaidAmount(remainingPayable > 0 ? remainingPayable : 0);
  }, [remainingPayable]);

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

    const finalPayments = upfrontPayments.length > 0 
      ? upfrontPayments 
      : (currentPaidAmount > 0 
          ? [{ id: 'default', paidAmount: currentPaidAmount, paymentMode: currentPaymentMode }] 
          : []);

    const finalPaidAmount = finalPayments.reduce((sum, p) => sum + p.paidAmount, 0);

    if (finalPaidAmount < 0) {
      toast.error('Paid amount cannot be negative.');
      return;
    }
    if (finalPaidAmount > summaries.netAmount) {
      toast.error('Paid amount cannot exceed the net invoice amount.');
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
        paidAmount: finalPaidAmount,
        paymentMode: finalPayments.length > 0 ? finalPayments[0].paymentMode : undefined,
        paymentDetails: finalPayments.map(p => ({
          paidAmount: p.paidAmount,
          paymentMode: p.paymentMode
        })),
        status, // 1 = Draft, 2 = Posted
        items: items.map(i => ({
          productId: i.productId,
          productVariantId: i.productVariantId || null as any,
          productBatchId: i.productBatchId || null as any,
          batchNumber: i.batchNumber || null as any,
          expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString() : null as any,
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

  const getRowValue = (row: any, searchTerms: string[]) => {
    if (!row) return undefined;
    const foundKey = Object.keys(row).find(k => 
      searchTerms.some(term => k.toLowerCase().trim() === term.toLowerCase().trim() || k.toLowerCase().includes(term.toLowerCase()))
    );
    return foundKey ? row[foundKey] : undefined;
  };

  const parseExcelDate = (val: any) => {
    if (!val) return '';
    if (typeof val === 'number') {
      const date = new Date((val - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    const dateStr = String(val).trim();
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split('T')[0];
    }
    return dateStr;
  };

  const downloadTemplate = () => {
    const sampleSupplier = suppliers[0]?.name || 'Sample Supplier';
    const sampleWarehouse = warehouses[0]?.name || 'Main Warehouse';
    const sampleProductCode = products[0]?.productCode || 'PROD-001';
    
    const data = [
      {
        'Supplier Name': sampleSupplier,
        'Warehouse Name': sampleWarehouse,
        'Invoice No': 'INV-2026-0001',
        'Invoice Date': new Date().toISOString().split('T')[0],
        'Reference No': 'PO-12345',
        'Remarks': 'Sample purchase invoice upload',
        'Product Code / SKU / Barcode': sampleProductCode,
        'Variant Name': '',
        'Batch No': 'BATCH-001',
        'Quantity': 10,
        'Free Quantity': 1,
        'Purchase Rate': products[0]?.purchaseRate || 100,
        'MRP': products[0]?.mrp || 150,
        'Sales Rate': products[0]?.salesRate || 130,
        'Discount %': 5,
        'Tax %': products[0]?.taxProfileId ? (taxProfiles.find(tp => tp.id === products[0].taxProfileId)?.igst || 18) : 18,
      },
      {
        'Supplier Name': '',
        'Warehouse Name': '',
        'Invoice No': '',
        'Invoice Date': '',
        'Reference No': '',
        'Remarks': '',
        'Product Code / SKU / Barcode': products[1]?.productCode || 'PROD-002',
        'Variant Name': '',
        'Batch No': 'BATCH-001',
        'Quantity': 5,
        'Free Quantity': 0,
        'Purchase Rate': products[1]?.purchaseRate || 200,
        'MRP': products[1]?.mrp || 300,
        'Sales Rate': products[1]?.salesRate || 260,
        'Discount %': 0,
        'Tax %': products[1]?.taxProfileId ? (taxProfiles.find(tp => tp.id === products[1].taxProfileId)?.igst || 12) : 12,
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    
    worksheet['!cols'] = [
      { wch: 25 }, // Supplier Name
      { wch: 20 }, // Warehouse Name
      { wch: 15 }, // Invoice No
      { wch: 12 }, // Invoice Date
      { wch: 15 }, // Reference No
      { wch: 30 }, // Remarks
      { wch: 25 }, // Product Code / SKU / Barcode
      { wch: 15 }, // Variant Name
      { wch: 12 }, // Batch No
      { wch: 8 },  // Quantity
      { wch: 10 }, // Free Quantity
      { wch: 12 }, // Purchase Rate
      { wch: 10 }, // MRP
      { wch: 12 }, // Sales Rate
      { wch: 10 }, // Discount %
      { wch: 8 },  // Tax %
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Invoice');
    XLSX.writeFile(workbook, 'PurchaseInvoice_Template.xlsx');
    toast.success('Excel Template downloaded successfully!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    parseFile(file);
  };

  const parseFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      toast.error('Unsupported file format. Please upload a .xlsx, .xls or .csv file.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    
    const reader = new FileReader();
    reader.onprogress = (data) => {
      if (data.lengthComputable) {
        const progress = Math.round((data.loaded / data.total) * 50);
        setUploadProgress(progress);
      }
    };
    
    reader.onload = (e) => {
      setUploadProgress(60);
      try {
        setTimeout(() => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          setUploadProgress(80);
          
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          setUploadProgress(95);

          if (rawRows.length < 2) {
            toast.error('The file does not contain any data rows.');
            setIsUploading(false);
            return;
          }

          const headers = rawRows[0].map(h => String(h).trim());
          const parsedData = rawRows.slice(1).map(row => {
            const rowObj: any = {};
            headers.forEach((header, index) => {
              rowObj[header] = row[index] !== undefined ? row[index] : '';
            });
            return rowObj;
          });

          const validRows = parsedData.filter(row => {
            const val = getRowValue(row, ['product', 'code', 'barcode', 'sku']);
            return val !== undefined && String(val).trim() !== '';
          });

          if (validRows.length === 0) {
            toast.error('No valid items found in the file. Ensure the "Product Code / SKU / Barcode" column is filled.');
            setIsUploading(false);
            return;
          }

          setTimeout(() => {
            setUploadProgress(100);
            setTimeout(() => {
              setIsUploading(false);
              processImportedData(validRows);
            }, 200);
          }, 100);
        }, 50);
      } catch (err) {
        console.error(err);
        toast.error('Error parsing Excel data. Please make sure the structure is correct.');
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      toast.error('Failed to read the file.');
      setIsUploading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };

  const validatePreviewData = (header: PreviewHeader, itemsList: PreviewItem[]): { header: PreviewHeader; items: PreviewItem[]; isValid: boolean } => {
    let isAllValid = true;

    const headerErrors: typeof header.errors = {};
    
    if (!header.supplierId) {
      headerErrors.supplier = 'Supplier is required.';
      isAllValid = false;
    } else {
      const matchedSup = suppliers.find(s => s.id === header.supplierId);
      if (!matchedSup) {
        headerErrors.supplier = 'Invalid supplier selected.';
        isAllValid = false;
      }
    }

    if (!header.warehouseId) {
      headerErrors.warehouse = 'Warehouse is required.';
      isAllValid = false;
    } else {
      const matchedWh = warehouses.find(w => w.id === header.warehouseId);
      if (!matchedWh) {
        headerErrors.warehouse = 'Invalid warehouse selected.';
        isAllValid = false;
      }
    }

    if (!header.invoiceNo.trim()) {
      headerErrors.invoiceNo = 'Invoice number is required.';
      isAllValid = false;
    }

    if (!header.invoiceDate) {
      headerErrors.invoiceDate = 'Invoice date is required.';
      isAllValid = false;
    } else {
      const parsedDate = Date.parse(header.invoiceDate);
      if (isNaN(parsedDate)) {
        headerErrors.invoiceDate = 'Invalid date format.';
        isAllValid = false;
      }
    }

    const validatedHeader = {
      ...header,
      errors: headerErrors
    };

    const validatedItems = itemsList.map((item, idx) => {
      const itemErrors: typeof item.errors = {};

      if (!item.productId) {
        itemErrors.product = item.productSearch 
          ? `Product "${item.productSearch}" not found in catalogue.` 
          : 'Product selection is required.';
        isAllValid = false;
      }

      if (item.productVariantId) {
        const prodVariants = allVariants.filter(v => v.productId === item.productId);
        const matchedVar = prodVariants.find(v => v.id === item.productVariantId);
        if (!matchedVar) {
          itemErrors.variant = 'Selected variant is invalid.';
          isAllValid = false;
        }
      } else if (item.variantSearch) {
        itemErrors.variant = `Variant "${item.variantSearch}" not found.`;
        isAllValid = false;
      }

      if (item.productBatchId) {
        const prodBatches = allBatches.filter(b => b.productId === item.productId);
        const matchedB = prodBatches.find(b => b.id === item.productBatchId);
        if (!matchedB) {
          itemErrors.batch = 'Selected batch is invalid.';
          isAllValid = false;
        }
      }

      if (item.quantity === undefined || item.quantity === null || isNaN(item.quantity)) {
        itemErrors.quantity = 'Quantity is required.';
        isAllValid = false;
      } else if (item.quantity <= 0) {
        itemErrors.quantity = 'Quantity must be greater than 0.';
        isAllValid = false;
      }

      if (item.freeQuantity < 0 || isNaN(item.freeQuantity)) {
        itemErrors.freeQuantity = 'Free quantity cannot be negative.';
        isAllValid = false;
      }

      if (item.purchaseRate < 0 || isNaN(item.purchaseRate)) {
        itemErrors.purchaseRate = 'Purchase rate cannot be negative.';
        isAllValid = false;
      }
      if (item.mrp < 0 || isNaN(item.mrp)) {
        itemErrors.mrp = 'MRP cannot be negative.';
        isAllValid = false;
      }
      if (item.salesRate < 0 || isNaN(item.salesRate)) {
        itemErrors.salesRate = 'Sales rate cannot be negative.';
        isAllValid = false;
      }

      if (item.discountPercent < 0 || item.discountPercent > 100 || isNaN(item.discountPercent)) {
        itemErrors.discountPercent = 'Discount % must be between 0 and 100.';
        isAllValid = false;
      }
      if (item.taxPercent < 0 || item.taxPercent > 100 || isNaN(item.taxPercent)) {
        itemErrors.taxPercent = 'Tax % must be between 0 and 100.';
        isAllValid = false;
      }

      const isDuplicate = itemsList.some((otherItem, otherIdx) => {
        if (otherIdx === idx) return false;
        return (
          otherItem.productId &&
          otherItem.productId === item.productId &&
          otherItem.productVariantId === item.productVariantId &&
          otherItem.productBatchId === item.productBatchId
        );
      });
      if (isDuplicate) {
        itemErrors.duplicate = 'Duplicate product/variant/batch line.';
        isAllValid = false;
      }

      return {
        ...item,
        errors: itemErrors
      };
    });

    return {
      header: validatedHeader,
      items: validatedItems,
      isValid: isAllValid
    };
  };

  const processImportedData = (rows: any[]) => {
    const firstRow = rows[0];

    const supplierSearch = String(getRowValue(firstRow, ['supplier']) || '').trim();
    const warehouseSearch = String(getRowValue(firstRow, ['warehouse']) || '').trim();
    const invoiceNo = String(getRowValue(firstRow, ['invoice no', 'invoice_no']) || '').trim();
    const invoiceDateRaw = getRowValue(firstRow, ['invoice date', 'invoice_date']);
    const invoiceDate = parseExcelDate(invoiceDateRaw);
    const referenceNo = String(getRowValue(firstRow, ['reference', 'po']) || '').trim();
    const remarks = String(getRowValue(firstRow, ['remarks', 'remark', 'note']) || '').trim();

    const matchedSupplier = suppliers.find(s => 
      s.name.toLowerCase() === supplierSearch.toLowerCase()
    );
    const matchedWarehouse = warehouses.find(w => 
      w.name.toLowerCase() === warehouseSearch.toLowerCase()
    ) || warehouses[0];

    const initialHeader: PreviewHeader = {
      supplierSearch,
      supplierId: matchedSupplier ? (matchedSupplier.id || '') : '',
      warehouseSearch,
      warehouseId: matchedWarehouse ? (matchedWarehouse.id || '') : '',
      invoiceNo,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      referenceNo,
      remarks,
      errors: {}
    };

    const parsedItems: PreviewItem[] = rows.map((row, idx) => {
      const productSearch = String(getRowValue(row, ['product', 'code', 'barcode', 'sku']) || '').trim();
      const variantSearch = String(getRowValue(row, ['variant']) || '').trim();
      const batchSearch = String(getRowValue(row, ['batch']) || '').trim();
      
      const quantity = Number(getRowValue(row, ['qty', 'quantity'])) || 1;
      const freeQuantity = Number(getRowValue(row, ['free'])) || 0;
      
      const matchedProduct = products.find(p => 
        (p.productCode && p.productCode.toLowerCase() === productSearch.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === productSearch.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase() === productSearch.toLowerCase()) ||
        (p.name && p.name.toLowerCase() === productSearch.toLowerCase())
      );

      let productId = '';
      let productName = '';
      let productCode = '';
      let purchaseRate = Number(getRowValue(row, ['purchase rate', 'purchase_rate', 'rate'])) || 0;
      let mrp = Number(getRowValue(row, ['mrp'])) || 0;
      let salesRate = Number(getRowValue(row, ['sales rate', 'sales_rate'])) || 0;
      let discountPercent = Number(getRowValue(row, ['discount', 'disc'])) || 0;
      let taxPercent = Number(getRowValue(row, ['tax', 'gst', 'vat'])) || 0;

      if (matchedProduct) {
        productId = matchedProduct.id || '';
        productName = matchedProduct.name || '';
        productCode = matchedProduct.productCode || '';
        
        if (purchaseRate === 0) purchaseRate = matchedProduct.purchaseRate || 0;
        if (mrp === 0) mrp = matchedProduct.mrp || 0;
        if (salesRate === 0) salesRate = matchedProduct.salesRate || 0;
        
        if (taxPercent === 0 && matchedProduct.taxProfileId) {
          const taxProfile = taxProfiles.find(tp => tp.id === matchedProduct.taxProfileId);
          if (taxProfile) taxPercent = taxProfile.igst;
        }
      }

      let productVariantId = '';
      if (matchedProduct && variantSearch) {
        const prodVariants = allVariants.filter(v => v.productId === matchedProduct.id);
        const matchedVar = prodVariants.find(v => 
          (v.variantCombination && v.variantCombination.toLowerCase() === variantSearch.toLowerCase()) ||
          (v.sku && v.sku.toLowerCase() === variantSearch.toLowerCase())
        );
        if (matchedVar) {
          productVariantId = matchedVar.id || '';
          if (purchaseRate === (matchedProduct.purchaseRate || 0)) purchaseRate = matchedVar.purchaseRate || purchaseRate;
          if (mrp === (matchedProduct.mrp || 0)) mrp = matchedVar.mrp || mrp;
          if (salesRate === (matchedProduct.salesRate || 0)) salesRate = matchedVar.salesRate || salesRate;
        }
      }

      let productBatchId = '';
      if (matchedProduct && batchSearch) {
        const prodBatches = allBatches.filter(b => b.productId === matchedProduct.id);
        const matchedB = prodBatches.find(b => 
          b.batchNo && b.batchNo.toLowerCase() === batchSearch.toLowerCase()
        );
        if (matchedB) {
          productBatchId = matchedB.id || '';
          if (mrp === (matchedProduct.mrp || 0)) mrp = matchedB.mrp || mrp;
        }
      }

      const expiryDateRaw = getRowValue(row, ['expiry', 'expire', 'exp date', 'expiry date', 'expiry_date', 'expire_date']);
      const expiryDate = parseExcelDate(expiryDateRaw);

      return {
        id: `imported-${idx}-${Math.random()}`,
        productSearch,
        productId,
        productName,
        productCode,
        variantSearch,
        productVariantId,
        batchSearch,
        productBatchId,
        batchNumber: batchSearch,
        expiryDate: expiryDate || '',
        quantity,
        freeQuantity,
        purchaseRate,
        mrp,
        salesRate,
        discountPercent,
        taxPercent,
        errors: {}
      };
    });

    const validationResult = validatePreviewData(initialHeader, parsedItems);
    setPreviewHeader(validationResult.header);
    setPreviewItems(validationResult.items);
    setPreviewUpfrontPayments([]);
    setIsPreviewOpen(true);
    toast.info('File parsed successfully! Please review items and errors.');
  };

  const handlePreviewHeaderChange = (field: keyof PreviewHeader, value: any) => {
    if (!previewHeader) return;
    const updatedHeader = {
      ...previewHeader,
      [field]: value
    };
    
    if (field === 'supplierId') {
      const matched = suppliers.find(s => s.id === value);
      updatedHeader.supplierSearch = matched ? matched.name : '';
    }
    if (field === 'warehouseId') {
      const matched = warehouses.find(w => w.id === value);
      updatedHeader.warehouseSearch = matched ? matched.name : '';
    }

    const validation = validatePreviewData(updatedHeader, previewItems);
    setPreviewHeader(validation.header);
    setPreviewItems(validation.items);
  };

  const handlePreviewItemChange = (index: number, field: keyof PreviewItem, value: any) => {
    const updatedItems = [...previewItems];
    
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        let defaultTaxRate = 0;
        if (prod.taxProfileId) {
          const taxProfile = taxProfiles.find(tp => tp.id === prod.taxProfileId);
          if (taxProfile) defaultTaxRate = taxProfile.igst;
        }
        updatedItems[index] = {
          ...updatedItems[index],
          productId: prod.id || '',
          productName: prod.name || '',
          productCode: prod.productCode || '',
          productVariantId: '',
          productBatchId: '',
          purchaseRate: prod.purchaseRate || 0,
          salesRate: prod.salesRate || 0,
          mrp: prod.mrp || 0,
          taxPercent: defaultTaxRate
        };
      } else {
        updatedItems[index] = {
          ...updatedItems[index],
          productId: '',
          productName: '',
          productCode: '',
          productVariantId: '',
          productBatchId: '',
        };
      }
    } else if (field === 'productVariantId') {
      updatedItems[index].productVariantId = value;
      const variant = allVariants.find(v => v.id === value);
      if (variant) {
        updatedItems[index].purchaseRate = variant.purchaseRate || updatedItems[index].purchaseRate;
        updatedItems[index].salesRate = variant.salesRate || updatedItems[index].salesRate;
        updatedItems[index].mrp = variant.mrp || updatedItems[index].mrp;
      }
    } else if (field === 'productBatchId') {
      updatedItems[index].productBatchId = value;
      const batch = allBatches.find(b => b.id === value);
      if (batch) {
        updatedItems[index].batchNumber = batch.batchNo || '';
        updatedItems[index].expiryDate = batch.expiryDate ? batch.expiryDate.split('T')[0] : '';
        updatedItems[index].mrp = batch.mrp || updatedItems[index].mrp;
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
      if (field === 'batchNumber') {
        const typedBatchNo = String(value).trim();
        const matched = allBatches.find(b => b.productId === updatedItems[index].productId && b.batchNo?.toLowerCase() === typedBatchNo.toLowerCase());
        if (matched) {
          updatedItems[index].productBatchId = matched.id;
          updatedItems[index].expiryDate = matched.expiryDate ? matched.expiryDate.split('T')[0] : '';
          updatedItems[index].mrp = matched.mrp || updatedItems[index].mrp;
        } else {
          updatedItems[index].productBatchId = '';
        }
      }
    }

    if (previewHeader) {
      const validation = validatePreviewData(previewHeader, updatedItems);
      setPreviewHeader(validation.header);
      setPreviewItems(validation.items);
    }
  };

  const handleAddPreviewItem = () => {
    const newItem: PreviewItem = {
      id: `imported-new-${Math.random()}`,
      productSearch: '',
      productId: '',
      productName: '',
      productCode: '',
      variantSearch: '',
      productVariantId: '',
      batchSearch: '',
      productBatchId: '',
      batchNumber: '',
      expiryDate: '',
      quantity: 1,
      freeQuantity: 0,
      purchaseRate: 0,
      mrp: 0,
      salesRate: 0,
      discountPercent: 0,
      taxPercent: 0,
      errors: {}
    };
    const updatedItems = [...previewItems, newItem];
    if (previewHeader) {
      const validation = validatePreviewData(previewHeader, updatedItems);
      setPreviewHeader(validation.header);
      setPreviewItems(validation.items);
    }
  };

  const handleRemovePreviewItem = (index: number) => {
    const updatedItems = [...previewItems];
    updatedItems.splice(index, 1);
    if (previewHeader) {
      const validation = validatePreviewData(previewHeader, updatedItems);
      setPreviewHeader(validation.header);
      setPreviewItems(validation.items);
    }
  };

  const handleConfirmSubmit = async (status: number) => {
    if (!previewHeader) return;
    const validation = validatePreviewData(previewHeader, previewItems);
    setPreviewHeader(validation.header);
    setPreviewItems(validation.items);

    if (!validation.isValid) {
      toast.error('Please fix all validation errors before submitting.');
      return;
    }

    setIsSaving(true);
    try {
      let subTotal = 0;
      let lineDiscountsSum = 0;
      let totalTax = 0;
      
      const formattedItems = previewItems.map(item => {
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.purchaseRate) || 0;
        const discPct = Number(item.discountPercent) || 0;
        const taxPct = Number(item.taxPercent) || 0;

        const amount = qty * rate;
        const discountAmount = Number((amount * (discPct / 100)).toFixed(2));
        const taxableAmount = amount - discountAmount;
        const taxAmount = Number((taxableAmount * (taxPct / 100)).toFixed(2));
        const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));

        subTotal += amount;
        lineDiscountsSum += discountAmount;
        totalTax += taxAmount;

        return {
          productId: item.productId,
          productVariantId: item.productVariantId || null as any,
          productBatchId: item.productBatchId || null as any,
          batchNumber: item.batchNumber || null as any,
          expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : null as any,
          quantity: qty,
          freeQuantity: Number(item.freeQuantity) || 0,
          purchaseRate: rate,
          salesRate: Number(item.salesRate) || 0,
          mrp: Number(item.mrp) || 0,
          discountPercent: discPct,
          discountAmount: discountAmount,
          taxPercent: taxPct,
          taxAmount: taxAmount,
          totalAmount: totalAmount
        };
      });

      const netAmount = Number((subTotal - lineDiscountsSum + totalTax).toFixed(2));

      const finalPayments = previewUpfrontPayments.length > 0 
        ? previewUpfrontPayments 
        : (previewCurrentPaidAmount > 0 
            ? [{ id: 'default', paidAmount: previewCurrentPaidAmount, paymentMode: previewCurrentPaymentMode }] 
            : []);

      const finalPaidAmount = finalPayments.reduce((sum, p) => sum + p.paidAmount, 0);

      if (finalPaidAmount < 0) {
        toast.error('Paid amount cannot be negative.');
        return;
      }
      if (finalPaidAmount > netAmount) {
        toast.error('Paid amount cannot exceed the net invoice amount.');
        return;
      }

      const payload: PurchaseInvoiceDto = {
        companyId: user?.companyId || 'F6579BDB-C05B-4AF0-9404-7EBC3C15B0D8',
        branchId: user?.branchId || 'F6579BDB-C05B-4AF0-9404-7EBC3C15B0D8',
        supplierId: previewHeader.supplierId,
        warehouseId: previewHeader.warehouseId,
        invoiceNo: previewHeader.invoiceNo,
        referenceNo: previewHeader.referenceNo,
        invoiceDate: new Date(previewHeader.invoiceDate).toISOString(),
        remarks: previewHeader.remarks,
        subTotal: Number(subTotal.toFixed(2)),
        discountAmount: Number(lineDiscountsSum.toFixed(2)),
        taxAmount: Number(totalTax.toFixed(2)),
        netAmount: netAmount,
        paidAmount: finalPaidAmount,
        paymentMode: finalPayments.length > 0 ? finalPayments[0].paymentMode : undefined,
        paymentDetails: finalPayments.map(p => ({
          paidAmount: p.paidAmount,
          paymentMode: p.paymentMode
        })),
        status,
        items: formattedItems
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
        setIsPreviewOpen(false);
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
          {/* Quick Excel Import Section */}
          <Section className="bg-card/50 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Quick Excel Import</h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quickly import invoice headers and items from an Excel or CSV file. 
                Download our pre-structured template, populate your purchase data, and drop the file here to import instantly.
              </p>
              <Button
                variant="outline"
                type="button"
                onClick={downloadTemplate}
                className="h-8.5 text-xs gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900 dark:hover:bg-indigo-950/20"
              >
                <Download className="h-3.5 w-3.5" />
                Download Excel Template
              </Button>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="relative border-2 border-dashed border-zinc-200 hover:border-indigo-400 dark:border-zinc-800 dark:hover:border-indigo-600 rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-muted/10 hover:bg-muted/20 transition-all duration-200 cursor-pointer text-center group"
              onClick={() => document.getElementById('excel-file-input')?.click()}
            >
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {isUploading ? (
                <div className="space-y-2 w-full max-w-[200px] flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  <span className="text-xs text-muted-foreground font-medium">Parsing Excel Data...</span>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-300 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-zinc-400 group-hover:text-indigo-500 transition-colors duration-200" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 block">
                      Drag & drop file here
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">
                      Supports .xlsx, .xls, .csv up to 10MB
                    </span>
                  </div>
                </>
              )}
            </div>
          </Section>

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
                {filteredWarehouses.map((w) => (
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
                    <TableHead className="w-[110px] px-1.5">Batch No.</TableHead>
                    <TableHead className="w-[110px] px-1.5">Expiry Date</TableHead>
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
                      <TableCell colSpan={14} className="py-8 text-center text-xs text-muted-foreground">
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
                            <input
                              type="text"
                              list={`batch-list-${index}`}
                              placeholder="Batch No..."
                              value={item.batchNumber || ''}
                              onChange={(e) => {
                                const batchNo = e.target.value;
                                const updated = [...items];
                                updated[index].batchNumber = batchNo;
                                const matchedBatch = prodBatches.find(b => b.batchNo?.toLowerCase() === batchNo.toLowerCase());
                                if (matchedBatch) {
                                  updated[index].productBatchId = matchedBatch.id;
                                  updated[index].expiryDate = matchedBatch.expiryDate ? matchedBatch.expiryDate.split('T')[0] : '';
                                  updated[index].mrp = matchedBatch.mrp || updated[index].mrp;
                                } else {
                                  updated[index].productBatchId = undefined;
                                }
                                setItems(updated);
                              }}
                              disabled={!item.productId}
                              className="w-full h-8 px-2 rounded-md border border-zinc-200 bg-white text-zinc-900 text-xs focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 disabled:opacity-50 font-mono"
                            />
                            <datalist id={`batch-list-${index}`}>
                              {prodBatches.map(b => (
                                <option key={b.id} value={b.batchNo} />
                              ))}
                            </datalist>
                          </TableCell>
                          <TableCell className="py-2 px-1.5">
                            <Input
                              type="date"
                              value={item.expiryDate ? item.expiryDate.split('T')[0] : ''}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[index].expiryDate = e.target.value;
                                setItems(updated);
                              }}
                              disabled={!item.productId}
                              className="h-8 text-xs px-1.5 py-1"
                            />
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
            <div className="w-full md:flex-1 space-y-4">
              {/* Payment Details Card */}
              <div className="bg-card border border-border p-5 rounded-xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Payment Details</h3>
                  {remainingPayable > 0 && (
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-full font-sans">
                      Remaining: ₹{remainingPayable.toFixed(2)}
                    </span>
                  )}
                  {remainingPayable === 0 && summaries.netAmount > 0 && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full font-sans">
                      Fully Paid
                    </span>
                  )}
                </div>

                {remainingPayable > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-muted/10 p-3 rounded-lg border border-border/50">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400 block">
                        Amount to Pay (₹)
                      </label>
                      <Input
                        type="number"
                        min="0.01"
                        max={remainingPayable}
                        step="0.01"
                        value={currentPaidAmount || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val >= 0) {
                            setCurrentPaidAmount(Math.min(val, remainingPayable));
                          } else if (e.target.value === '') {
                            setCurrentPaidAmount(0);
                          }
                        }}
                        className="h-9 text-xs font-mono"
                        placeholder="Enter amount..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400 block">
                        Payment Mode
                      </label>
                      <select
                        value={currentPaymentMode}
                        onChange={(e) => setCurrentPaymentMode(Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-md border border-zinc-200 bg-white text-zinc-900 text-xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 cursor-pointer"
                      >
                        <option value={1}>Cash</option>
                        <option value={2}>Bank Transfer</option>
                        <option value={3}>Card</option>
                        <option value={4}>UPI</option>
                        <option value={5}>Cheque</option>
                      </select>
                    </div>

                    <Button
                      type="button"
                      onClick={() => {
                        if (currentPaidAmount <= 0) {
                          toast.error("Please enter a valid paid amount.");
                          return;
                        }
                        if (currentPaidAmount > remainingPayable) {
                          toast.error("Paid amount cannot exceed the remaining due amount.");
                          return;
                        }
                        const newPayment: PaymentDetailItem = {
                          id: `pay-${Date.now()}-${Math.random()}`,
                          paidAmount: currentPaidAmount,
                          paymentMode: currentPaymentMode
                        };
                        setUpfrontPayments([...upfrontPayments, newPayment]);
                      }}
                      className="h-9 text-xs gap-1.5 w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950 font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Payment
                    </Button>
                  </div>
                )}

                {/* Added Payments List */}
                {upfrontPayments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Added Splits</h4>
                    <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                      {upfrontPayments.map((p) => {
                        const getModeLabel = (mode: number) => {
                          switch (mode) {
                            case 1: return "Cash";
                            case 2: return "Bank Transfer";
                            case 3: return "Card";
                            case 4: return "UPI";
                            case 5: return "Cheque";
                            default: return "Unknown";
                          }
                        };
                        return (
                          <div key={p.id} className="flex items-center justify-between p-2 px-3 bg-card hover:bg-muted/10 transition-colors duration-150 text-xs font-mono">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-zinc-950 dark:text-zinc-50">₹{p.paidAmount.toFixed(2)}</span>
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold font-sans bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                {getModeLabel(p.paymentMode)}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setUpfrontPayments(upfrontPayments.filter(item => item.id !== p.id));
                              }}
                              className="h-7 w-7 text-zinc-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {totalPaidAmount > 0 && (
                  <div className="pt-3 border-t border-dashed border-border flex items-center justify-between text-xs font-semibold font-mono">
                    <span className="text-zinc-500 font-sans">Total Paid:</span>
                    <span className="text-zinc-950 dark:text-zinc-50">₹{totalPaidAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Invoice Terms & Notes */}
              <div className="bg-card border border-border p-4 rounded-xl shadow-2xs space-y-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Invoice Terms & Notes</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Saving as a **Draft** stores the invoice details for future edits without affecting your inventory stock levels.
                  **Posting the Invoice** locks the values and immediately performs a stock-in transaction, increasing inventory status across the selected warehouse.
                </p>
              </div>
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
              {totalPaidAmount > 0 && (
                <>
                  <div className="flex justify-between text-zinc-550 dark:text-zinc-400 pt-1">
                    <span>Total Paid:</span>
                    <span className="font-semibold text-zinc-950 dark:text-zinc-50">₹{totalPaidAmount.toFixed(2)}</span>
                  </div>
                  <hr className="border-border border-dashed" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Balance Due:</span>
                    <span className="text-red-500">₹{balanceDue.toFixed(2)}</span>
                  </div>
                </>
              )}
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

      {/* Import Preview Dialog Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none sm:max-w-none sm:w-screen sm:h-screen sm:max-h-none fixed top-0 left-0 translate-x-0 translate-y-0 sm:top-0 sm:left-0 sm:translate-x-0 sm:translate-y-0 flex flex-col p-6 gap-4 bg-popover rounded-none border-0 shadow-none ring-0">
          <DialogHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                Preview & Validate Purchase Import
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review parsed values and resolve any highlighted validation errors before final submission.
              </p>
            </div>
            
            <div className="flex gap-4 text-xs font-mono pr-6">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 px-3 py-1.5 rounded-lg flex flex-col items-center">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-450 uppercase font-semibold">Total Rows</span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{previewItems.length}</span>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-3 py-1.5 rounded-lg flex flex-col items-center">
                <span className="text-[10px] text-red-600 dark:text-red-450 uppercase font-semibold">Errors</span>
                <span className="text-sm font-bold text-red-700 dark:text-red-450 font-mono">
                  {previewItems.reduce((acc, item) => acc + Object.keys(item.errors).length, 0) + 
                   (previewHeader ? Object.keys(previewHeader.errors).length : 0)}
                </span>
              </div>
            </div>
          </DialogHeader>

          {previewHeader && (
            <div className="space-y-4 flex-1 overflow-y-auto min-h-0 pr-1">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Left Card: Metadata Fields */}
                <div className="lg:col-span-3 bg-muted/20 p-4 rounded-xl border border-border grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">
                      Supplier {previewHeader.supplierSearch && `(${previewHeader.supplierSearch})`}
                    </label>
                    <select
                      value={previewHeader.supplierId}
                      onChange={(e) => handlePreviewHeaderChange('supplierId', e.target.value)}
                      className={`w-full h-8.5 px-3 rounded-md border text-xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900 bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50 ${
                        previewHeader.errors.supplier ? 'border-red-500 focus:ring-red-500' : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <option value="">Select Supplier...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {previewHeader.errors.supplier && (
                      <span className="text-[10px] text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {previewHeader.errors.supplier}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">
                      Warehouse {previewHeader.warehouseSearch && `(${previewHeader.warehouseSearch})`}
                    </label>
                    <select
                      value={previewHeader.warehouseId}
                      onChange={(e) => handlePreviewHeaderChange('warehouseId', e.target.value)}
                      className={`w-full h-8.5 px-3 rounded-md border text-xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900 bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50 ${
                        previewHeader.errors.warehouse ? 'border-red-500 focus:ring-red-500' : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <option value="">Select Warehouse...</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                    {previewHeader.errors.warehouse && (
                      <span className="text-[10px] text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {previewHeader.errors.warehouse}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">
                      Supplier Invoice No.
                    </label>
                    <Input
                      type="text"
                      value={previewHeader.invoiceNo}
                      onChange={(e) => handlePreviewHeaderChange('invoiceNo', e.target.value)}
                      className={`h-8.5 text-xs ${previewHeader.errors.invoiceNo ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {previewHeader.errors.invoiceNo && (
                      <span className="text-[10px] text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {previewHeader.errors.invoiceNo}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">
                      Invoice Date
                    </label>
                    <Input
                      type="date"
                      value={previewHeader.invoiceDate}
                      onChange={(e) => handlePreviewHeaderChange('invoiceDate', e.target.value)}
                      className={`h-8.5 text-xs ${previewHeader.errors.invoiceDate ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {previewHeader.errors.invoiceDate && (
                      <span className="text-[10px] text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {previewHeader.errors.invoiceDate}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">
                      Reference / PO Number
                    </label>
                    <Input
                      type="text"
                      value={previewHeader.referenceNo}
                      onChange={(e) => handlePreviewHeaderChange('referenceNo', e.target.value)}
                      className="h-8.5 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">
                      Remarks
                    </label>
                    <Input
                      type="text"
                      value={previewHeader.remarks}
                      onChange={(e) => handlePreviewHeaderChange('remarks', e.target.value)}
                      className="h-8.5 text-xs"
                    />
                  </div>
                </div>

                {/* Right Card: Payment details in Excel Import Preview */}
                <div className="lg:col-span-1 bg-card border border-border p-4 rounded-xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="text-xs font-bold text-zinc-550 uppercase tracking-wider">Payment Details</h3>
                    {previewRemainingPayable > 0 && (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full font-sans">
                        Due: ₹{previewRemainingPayable.toFixed(2)}
                      </span>
                    )}
                    {previewRemainingPayable === 0 && previewSummary.netAmount > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full font-sans">
                        Fully Paid
                      </span>
                    )}
                  </div>

                  {/* Net Payable and Balance Due Side-by-Side */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-zinc-450 font-sans block">Net Payable</span>
                      <span className="font-bold text-zinc-950 dark:text-zinc-50 block">₹{previewSummary.netAmount.toFixed(2)}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-zinc-450 font-sans block">Balance Due</span>
                      <span className={`font-bold block ${
                        previewSummary.netAmount - previewTotalPaidAmount > 0 
                          ? 'text-red-500' 
                          : 'text-green-600 dark:text-green-450'
                      }`}>
                        ₹{(previewSummary.netAmount - previewTotalPaidAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {previewRemainingPayable > 0 && (
                    <div className="space-y-2 bg-muted/10 p-2.5 rounded-lg border border-border/50">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-555 dark:text-zinc-405 block">Amount (₹)</label>
                          <Input
                            type="number"
                            min="0.01"
                            max={previewRemainingPayable}
                            step="0.01"
                            value={previewCurrentPaidAmount || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (val >= 0) {
                                setPreviewCurrentPaidAmount(Math.min(val, previewRemainingPayable));
                              } else if (e.target.value === '') {
                                setPreviewCurrentPaidAmount(0);
                              }
                            }}
                            className="h-8 text-xs font-mono px-2 py-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-555 dark:text-zinc-405 block">Mode</label>
                          <select
                            value={previewCurrentPaymentMode}
                            onChange={(e) => setPreviewCurrentPaymentMode(Number(e.target.value))}
                            className="w-full h-8 px-2 rounded-md border border-zinc-200 bg-white text-zinc-900 text-xs focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 cursor-pointer"
                          >
                            <option value={1}>Cash</option>
                            <option value={2}>Bank Transfer</option>
                            <option value={3}>Card</option>
                            <option value={4}>UPI</option>
                            <option value={5}>Cheque</option>
                          </select>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          if (previewCurrentPaidAmount <= 0) {
                            toast.error("Please enter a valid paid amount.");
                            return;
                          }
                          if (previewCurrentPaidAmount > previewRemainingPayable) {
                            toast.error("Paid amount cannot exceed the remaining due amount.");
                            return;
                          }
                          const newPayment: PaymentDetailItem = {
                            id: `pay-preview-${Date.now()}-${Math.random()}`,
                            paidAmount: previewCurrentPaidAmount,
                            paymentMode: previewCurrentPaymentMode
                          };
                          setPreviewUpfrontPayments([...previewUpfrontPayments, newPayment]);
                        }}
                        className="h-8 text-xs w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950 font-medium"
                      >
                        Add Payment
                      </Button>
                    </div>
                  )}

                  {/* Added splits inside preview */}
                  {previewUpfrontPayments.length > 0 && (
                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                        {previewUpfrontPayments.map((p) => {
                          const getModeLabel = (mode: number) => {
                            switch (mode) {
                              case 1: return "Cash";
                              case 2: return "Bank";
                              case 3: return "Card";
                              case 4: return "UPI";
                              case 5: return "Cheque";
                              default: return "Unknown";
                            }
                          };
                          return (
                            <div key={p.id} className="flex items-center justify-between p-1.5 px-2 bg-card hover:bg-muted/10 transition-colors duration-150 text-[10px] font-mono">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-950 dark:text-zinc-50">₹{p.paidAmount.toFixed(2)}</span>
                                <span className="text-[9px] text-muted-foreground uppercase font-semibold font-sans bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                                  {getModeLabel(p.paymentMode)}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPreviewUpfrontPayments(previewUpfrontPayments.filter(item => item.id !== p.id));
                                }}
                                className="h-5 w-5 text-zinc-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-border rounded-xl shadow-xs overflow-hidden bg-card">
                <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Line Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPreviewItem}
                    className="h-7 text-[10px] gap-1 px-2.5 py-1 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Add Row
                  </Button>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-xs text-left min-w-[1300px]">
                    <thead className="bg-muted/10 font-bold border-b border-border">
                      <tr>
                        <th className="w-[45px] p-2 text-center">Status</th>
                        <th className="w-[180px] p-2">Excel Input</th>
                        <th className="w-[200px] p-2">Product Match</th>
                        <th className="w-[110px] p-2">Variant</th>
                        <th className="w-[110px] p-2">Batch</th>
                        <th className="w-[110px] p-2">Expiry Date</th>
                        <th className="w-[70px] p-2 text-right">Qty</th>
                        <th className="w-[75px] p-2 text-right">Free Qty</th>
                        <th className="w-[85px] p-2 text-right">Rate</th>
                        <th className="w-[85px] p-2 text-right">MRP</th>
                        <th className="w-[85px] p-2 text-right">Sales Rate</th>
                        <th className="w-[65px] p-2 text-right">Disc %</th>
                        <th className="w-[65px] p-2 text-right">Tax %</th>
                        <th className="w-[95px] p-2 text-right">Total</th>
                        <th className="w-[40px] p-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewItems.length === 0 ? (
                        <tr>
                          <td colSpan={15} className="py-8 text-center text-xs text-muted-foreground">
                            No items to preview. Add a row to get started.
                          </td>
                        </tr>
                      ) : (
                        previewItems.map((item, idx) => {
                          const rowHasErrors = Object.keys(item.errors).length > 0;
                          const itemVariants = getVariantsForProduct(item.productId);
                          const itemBatches = getBatchesForProduct(item.productId);
                          const rowTotal = (Number(item.quantity) || 0) * (Number(item.purchaseRate) || 0);
                          const rowDisc = rowTotal * ((Number(item.discountPercent) || 0) / 100);
                          const rowTax = (rowTotal - rowDisc) * ((Number(item.taxPercent) || 0) / 100);
                          const rowNet = rowTotal - rowDisc + rowTax;

                          return (
                            <tr 
                              key={item.id} 
                              className={`align-middle transition-colors duration-150 ${
                                rowHasErrors 
                                  ? 'bg-red-500/5 hover:bg-red-500/10 dark:bg-red-950/10 dark:hover:bg-red-950/20' 
                                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                              }`}
                            >
                              <td className="p-2 text-center">
                                {rowHasErrors ? (
                                  <div className="inline-flex items-center justify-center p-1 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 group relative cursor-help">
                                    <AlertTriangle className="h-4 w-4" />
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block z-50 bg-popover border border-border p-2.5 rounded-lg shadow-md w-72 text-left text-zinc-900 dark:text-zinc-50 font-normal">
                                      <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5">Validation Errors (Row {idx+1})</h4>
                                      <ul className="list-disc pl-3.5 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                                        {Object.entries(item.errors).map(([key, msg]) => (
                                          <li key={key} className="text-zinc-800 dark:text-zinc-200">
                                            <span className="font-semibold capitalize">{key}:</span> {msg}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center justify-center p-1 rounded-full bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400">
                                    <Check className="h-4 w-4" />
                                  </span>
                                )}
                              </td>

                              <td className="p-2 text-zinc-550 dark:text-zinc-400 font-mono text-[10px] truncate max-w-[180px]">
                                {item.productSearch || <span className="italic text-zinc-450 font-sans">Added Row</span>}
                              </td>

                              <td className="p-2">
                                <select
                                  value={item.productId}
                                  onChange={(e) => handlePreviewItemChange(idx, 'productId', e.target.value)}
                                  className={`w-full h-8 px-2 rounded-md border text-xs focus:outline-hidden bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50 ${
                                    item.errors.product ? 'border-red-500 focus:ring-red-500' : 'border-zinc-200 dark:border-zinc-800'
                                  }`}
                                >
                                  <option value="">Select Product...</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.productCode})</option>
                                  ))}
                                </select>
                              </td>

                              <td className="p-2">
                                <select
                                  value={item.productVariantId}
                                  onChange={(e) => handlePreviewItemChange(idx, 'productVariantId', e.target.value)}
                                  disabled={!item.productId || itemVariants.length === 0}
                                  className={`w-full h-8 px-1.5 rounded-md border text-xs focus:outline-hidden bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed ${
                                    item.errors.variant ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'
                                  }`}
                                >
                                  <option value="">Base Product</option>
                                  {itemVariants.map(v => (
                                    <option key={v.id} value={v.id}>{v.variantCombination || v.sku}</option>
                                  ))}
                                </select>
                              </td>

                              <td className="p-2">
                                <input
                                  type="text"
                                  list={`preview-batch-list-${idx}`}
                                  placeholder="Batch No..."
                                  value={item.batchNumber || ''}
                                  onChange={(e) => {
                                    const batchNo = e.target.value;
                                    const matchedBatch = itemBatches.find(b => b.batchNo?.toLowerCase() === batchNo.toLowerCase());
                                    if (matchedBatch) {
                                      handlePreviewItemChange(idx, 'productBatchId', matchedBatch.id);
                                      handlePreviewItemChange(idx, 'batchNumber', matchedBatch.batchNo);
                                      handlePreviewItemChange(idx, 'expiryDate', matchedBatch.expiryDate ? matchedBatch.expiryDate.split('T')[0] : '');
                                      handlePreviewItemChange(idx, 'mrp', matchedBatch.mrp || item.mrp);
                                    } else {
                                      handlePreviewItemChange(idx, 'productBatchId', '');
                                      handlePreviewItemChange(idx, 'batchNumber', batchNo);
                                    }
                                  }}
                                  disabled={!item.productId}
                                  className={`w-full h-8 px-2 rounded-md border text-xs focus:outline-hidden bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50 disabled:opacity-40 font-mono ${
                                    item.errors.batch ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'
                                  }`}
                                />
                                <datalist id={`preview-batch-list-${idx}`}>
                                  {itemBatches.map(b => (
                                    <option key={b.id} value={b.batchNo} />
                                  ))}
                                </datalist>
                              </td>
                              <td className="p-2">
                                <Input
                                  type="date"
                                  value={item.expiryDate ? item.expiryDate.split('T')[0] : ''}
                                  onChange={(e) => handlePreviewItemChange(idx, 'expiryDate', e.target.value)}
                                  disabled={!item.productId}
                                  className="h-8 text-xs px-1.5 py-1"
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handlePreviewItemChange(idx, 'quantity', Number(e.target.value))}
                                  className={`h-8 text-right font-mono px-1.5 py-1 text-xs ${item.errors.quantity ? 'border-red-500' : ''}`}
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.freeQuantity}
                                  onChange={(e) => handlePreviewItemChange(idx, 'freeQuantity', Number(e.target.value))}
                                  className={`h-8 text-right font-mono px-1.5 py-1 text-xs ${item.errors.freeQuantity ? 'border-red-500' : ''}`}
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.purchaseRate}
                                  onChange={(e) => handlePreviewItemChange(idx, 'purchaseRate', Number(e.target.value))}
                                  className={`h-8 text-right font-mono px-1.5 py-1 text-xs ${item.errors.purchaseRate ? 'border-red-500' : ''}`}
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.mrp}
                                  onChange={(e) => handlePreviewItemChange(idx, 'mrp', Number(e.target.value))}
                                  className={`h-8 text-right font-mono px-1.5 py-1 text-xs ${item.errors.mrp ? 'border-red-500' : ''}`}
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.salesRate}
                                  onChange={(e) => handlePreviewItemChange(idx, 'salesRate', Number(e.target.value))}
                                  className={`h-8 text-right font-mono px-1.5 py-1 text-xs ${item.errors.salesRate ? 'border-red-500' : ''}`}
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.discountPercent}
                                  onChange={(e) => handlePreviewItemChange(idx, 'discountPercent', Number(e.target.value))}
                                  className={`h-8 text-right font-mono px-1.5 py-1 text-xs ${item.errors.discountPercent ? 'border-red-500' : ''}`}
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.taxPercent}
                                  onChange={(e) => handlePreviewItemChange(idx, 'taxPercent', Number(e.target.value))}
                                  className={`h-8 text-right font-mono px-1.5 py-1 text-xs ${item.errors.taxPercent ? 'border-red-500' : ''}`}
                                />
                              </td>

                              <td className="p-2 text-right font-mono text-xs font-semibold pr-3">
                                ₹{rowNet.toFixed(2)}
                              </td>

                              <td className="p-2 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemovePreviewItem(idx)}
                                  className="h-7 w-7 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-border pt-3 flex items-center justify-between sm:justify-between w-full">
            <div className="flex gap-4 items-center">
              <span className="text-[11px] text-muted-foreground font-medium">
                * Hover over the status icon to see specific cell validation errors.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                type="button"
                className="h-9 text-xs px-4"
                onClick={() => setIsPreviewOpen(false)}
              >
                Cancel & Exit
              </Button>
              <Button
                type="button"
                onClick={() => handleConfirmSubmit(1)}
                disabled={isSaving}
                className="h-9 text-xs px-4"
              >
                {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save as Draft
              </Button>
              <Button
                type="button"
                onClick={() => handleConfirmSubmit(2)}
                disabled={isSaving}
                className="h-9 text-xs px-4 bg-green-600 hover:bg-green-700 text-white"
              >
                {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Confirm & Post Invoice
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
