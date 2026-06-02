import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Loader2, 
  Search, 
  Calendar, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Trash2,
  X,
  ArrowLeft,
  Save,
  Package,
  User,
  Hash,
  AlertTriangle,
  ArrowRight,
  Wallet,
  Printer,
  Share2
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { generatePurchaseOrderPdf } from '@/utils/purchaseOrderPdf';

import type { PurchaseOrderDto, PurchaseOrderItemDto, LowStockProductDto } from '@/types/PurchaseOrderDto';
import type { WarehouseDto } from '@/types/WarehouseDto';
import type { SupplierDto } from '@/types/SupplierDto';
import type { ProductDto } from '@/types/ProductDto';

export default function ManagePurchaseOrder() {
  const navigate = useNavigate();
  const { canView, canCreate, canEdit, canDelete } = usePermissions('/purchaseorder');
  const user = useAppSelector((state) => state.auth.user);

  // View List States
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLowStock, setIsLoadingLowStock] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(user?.warehouseId || 'all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Create Form FormState
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formWarehouseId, setFormWarehouseId] = useState(user?.warehouseId || '');
  const [formPONumber, setFormPONumber] = useState('');
  const [formPODate, setFormPODate] = useState(new Date().toISOString().split('T')[0]);
  const [formItems, setFormItems] = useState<PurchaseOrderItemDto[]>([]);

  // Detailed Modal view state
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrderDto | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [sharingOrder, setSharingOrder] = useState<PurchaseOrderDto | null>(null);

  // Product Selection Modal
  const [selectingProductForIndex, setSelectingProductForIndex] = useState<number | null>(null);
  const [productSearchText, setProductSearchText] = useState('');

  const fetchOrders = async () => {
    if (!user?.companyId) return;
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/PurchaseOrder', {
        params: { companyId: user.companyId }
      });
      if (response?.success) {
        setOrders(response.data || []);
      }
    } catch (e) {
      console.error('Failed to load purchase orders', e);
      toast.error('Failed to load purchase orders.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [resWh, resSup, resProd] = await Promise.all([
        axiosClient.get('/Warehouse', { params: { pageNumber: 1, pageSize: 10000 } }),
        axiosClient.get('/Supplier', { params: { pageNumber: 1, pageSize: 10000 } }),
        axiosClient.get('/Product', { params: { pageNumber: 1, pageSize: 10000 } })
      ]) as any[];

      if (resWh?.success) {
        const whList = resWh.data?.items || resWh.data || [];
        setWarehouses(whList);
        if (whList.length > 0 && !formWarehouseId) {
          setFormWarehouseId(whList[0].id || '');
        }
      }
      if (resSup?.success) {
        setSuppliers(resSup.data?.items || resSup.data || []);
      }
      if (resProd?.success) {
        setProducts(resProd.data?.items || resProd.data || []);
      }
    } catch (e) {
      console.error('Failed to load dependencies', e);
    }
  };

  const fetchLowStock = async (whId?: string) => {
    if (!user?.companyId) return;
    setIsLoadingLowStock(true);
    try {
      const params: any = { companyId: user.companyId };
      if (whId && whId !== 'all') {
        params.warehouseId = whId;
      }
      const response: any = await axiosClient.get('/PurchaseOrder/low-stock', { params });
      if (response?.success) {
        setLowStockProducts(response.data || []);
      }
    } catch (e) {
      console.error('Failed to load low stock products', e);
    } finally {
      setIsLoadingLowStock(false);
    }
  };

  // Initial Fetch
  useEffect(() => {
    if (canView) {
      fetchOrders();
      fetchDependencies();
    }
  }, [canView, user?.companyId]);

  // Fetch low stock when creating form opens or warehouse selection changes
  useEffect(() => {
    if (isCreating) {
      fetchLowStock(formWarehouseId);
    }
  }, [isCreating, formWarehouseId]);

  // Fetch low stock when the view changes or filter warehouse changes (if desired)
  useEffect(() => {
    if (!isCreating && canView) {
      fetchLowStock(selectedWarehouseId);
    }
  }, [selectedWarehouseId, isCreating]);

  // Client-side filtering of PO list
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      const supplierName = ord.supplierName || '';
      const poNum = ord.poNumber || '';

      const matchesSearch = 
        supplierName.toLowerCase().includes(search.toLowerCase()) ||
        poNum.toLowerCase().includes(search.toLowerCase());

      const matchesWarehouse = selectedWarehouseId === 'all' || ord.warehouseId === selectedWarehouseId;
      const matchesStatus = selectedStatus === 'all' || ord.status?.toString() === selectedStatus;

      let matchesDate = true;
      if (ord.poDate) {
        const orderDateStr = ord.poDate.split('T')[0];
        if (fromDate && orderDateStr < fromDate) {
          matchesDate = false;
        }
        if (toDate && orderDateStr > toDate) {
          matchesDate = false;
        }
      } else if (fromDate || toDate) {
        matchesDate = false;
      }

      return matchesSearch && matchesWarehouse && matchesStatus && matchesDate;
    });
  }, [orders, search, selectedWarehouseId, selectedStatus, fromDate, toDate]);

  // Pagination calculations
  const totalCount = filteredOrders.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedOrders = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, pageNumber, pageSize]);

  useEffect(() => {
    setPageNumber(1);
  }, [search, selectedWarehouseId, selectedStatus, fromDate, toDate, pageSize]);

  // Initialize PO Number and items on create open
  const handleOpenCreate = async () => {
    setFormSupplierId('');
    setFormWarehouseId(user?.warehouseId || (warehouses[0]?.id || ''));
    
    // Set fallback PO number immediately so the form opens instantly
    const fallbackPO = `PO-${Date.now().toString().slice(-8)}`;
    setFormPONumber(fallbackPO);
    
    setFormPODate(new Date().toISOString().split('T')[0]);
    setFormItems([]);
    setIsCreating(true);

    try {
      if (user?.companyId) {
        const response: any = await axiosClient.get('/PurchaseOrder/next-number', {
          params: { companyId: user.companyId }
        });
        if (response?.success && response.data) {
          setFormPONumber(response.data);
        }
      }
    } catch (e) {
      console.error("Failed to fetch next PO number, using fallback", e);
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
  };

  const handleAddBlankItem = () => {
    setFormItems([
      ...formItems,
      {
        productId: '',
        orderedQty: 1,
        rate: 0,
        amount: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...formItems];
    updated.splice(index, 1);
    setFormItems(updated);
  };

  const handleProductSelect = (index: number, product: ProductDto) => {
    const updated = [...formItems];
    updated[index] = {
      ...updated[index],
      productId: product.id || '',
      productName: product.name,
      productCode: product.productCode,
      rate: product.purchaseRate || 0,
      amount: (updated[index].orderedQty || 1) * (product.purchaseRate || 0)
    };
    setFormItems(updated);
    setSelectingProductForIndex(null);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...formItems];
    updated[index] = {
      ...updated[index],
      orderedQty: qty,
      amount: qty * (updated[index].rate || 0)
    };
    setFormItems(updated);
  };

  const handleRateChange = (index: number, rate: number) => {
    const updated = [...formItems];
    updated[index] = {
      ...updated[index],
      rate: rate,
      amount: (updated[index].orderedQty || 0) * rate
    };
    setFormItems(updated);
  };

  // Add individual low stock item to PO
  const handleAddLowStockItem = (item: LowStockProductDto) => {
    const exists = formItems.some(i => i.productId === item.productId);
    if (exists) {
      toast.warning(`${item.productName} is already added.`);
      return;
    }
    const neededQty = Math.max(1, item.minStock - item.currentStock);
    setFormItems([
      ...formItems,
      {
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        orderedQty: neededQty,
        rate: item.defaultRate || 0,
        amount: neededQty * (item.defaultRate || 0)
      }
    ]);
    toast.success(`Added ${item.productName} (Qty: ${neededQty})`);
  };

  // Auto-add all low stock items
  const handleAutoAddAllLowStock = () => {
    if (lowStockProducts.length === 0) {
      toast.info("No low stock products to add.");
      return;
    }

    let addedCount = 0;
    const newItems = [...formItems];

    lowStockProducts.forEach(item => {
      const exists = newItems.some(i => i.productId === item.productId);
      if (!exists) {
        const neededQty = Math.max(1, item.minStock - item.currentStock);
        newItems.push({
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          orderedQty: neededQty,
          rate: item.defaultRate || 0,
          amount: neededQty * (item.defaultRate || 0)
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setFormItems(newItems);
      toast.success(`Automatically added ${addedCount} low stock items.`);
    } else {
      toast.info("All low stock products are already in the list.");
    }
  };

  // Calculate PO Totals
  const totals = useMemo(() => {
    const subTotal = formItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    // Assume simple PO mapping where net amount is the sum of items (tax handled at receipt/invoice level)
    return {
      grossAmount: subTotal,
      netAmount: subTotal
    };
  }, [formItems]);

  // Submit PO
  const handleSavePO = async () => {
    if (!formSupplierId) {
      toast.error("Please select a Supplier.");
      return;
    }
    if (!formWarehouseId) {
      toast.error("Please select a Warehouse.");
      return;
    }
    if (!formPONumber.trim()) {
      toast.error("Please enter a PO Number.");
      return;
    }
    if (formItems.length === 0) {
      toast.error("Please add at least one item to the Purchase Order.");
      return;
    }

    const invalidItem = formItems.some(item => !item.productId || (item.orderedQty || 0) <= 0 || (item.rate || 0) < 0);
    if (invalidItem) {
      toast.error("Please ensure all items have a valid Product, Quantity > 0, and Rate >= 0.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: PurchaseOrderDto = {
        companyId: user?.companyId || '00000000-0000-0000-0000-000000000000',
        branchId: user?.branchId || '00000000-0000-0000-0000-000000000000',
        supplierId: formSupplierId,
        warehouseId: formWarehouseId,
        poNumber: formPONumber,
        poDate: new Date(formPODate).toISOString(),
        grossAmount: totals.grossAmount,
        netAmount: totals.netAmount,
        items: formItems.map(item => ({
          productId: item.productId,
          orderedQty: Number(item.orderedQty),
          rate: Number(item.rate),
          amount: Number(item.amount)
        }))
      };

      const response: any = await axiosClient.post('/PurchaseOrder', payload);
      if (response?.success) {
        toast.success("Purchase Order created successfully in Pending status!");
        setIsCreating(false);
        fetchOrders();
      } else {
        toast.error(response?.message || "Failed to create Purchase Order.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || "An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // View PO Details
  const handleViewOrder = async (id: string) => {
    setIsLoadingView(true);
    setViewingOrder(null);
    try {
      const response: any = await axiosClient.get(`/PurchaseOrder/${id}`);
      if (response?.success) {
        setViewingOrder(response.data);
      } else {
        toast.error("Failed to load Purchase Order details.");
      }
    } catch (e) {
      console.error("Failed to load PO", e);
      toast.error("Error loading Purchase Order details.");
    } finally {
      setIsLoadingView(false);
    }
  };

  // Cancel PO
  const handleCancelOrder = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this Purchase Order?")) return;

    try {
      const response: any = await axiosClient.post(`/PurchaseOrder/${id}/cancel`);
      if (response?.success) {
        toast.success("Purchase Order cancelled successfully!");
        fetchOrders();
        if (viewingOrder?.id === id) {
          setViewingOrder(null);
        }
      } else {
        toast.error(response?.message || "Failed to cancel Purchase Order.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || "An error occurred.");
    }
  };

  const handleDownloadPdf = async (order: PurchaseOrderDto) => {
    try {
      let companyInfo = undefined;
      const response: any = await axiosClient.get('/Company');
      if (response?.success) {
        const companies = response.data || [];
        // Resolve target company ID by looking up the warehouse's company first
        const warehouseObj = warehouses.find(w => w.id === order.warehouseId);
        const targetCompanyId = warehouseObj?.companyId || order.companyId || user?.companyId;
        companyInfo = companies.find((c: any) => c.id === targetCompanyId);
      }
      generatePurchaseOrderPdf(order, companyInfo);
    } catch (e) {
      console.error('Failed to fetch company details for PDF', e);
      generatePurchaseOrderPdf(order);
    }
  };

  const handleDownloadPdfById = async (id: string) => {
    try {
      const response: any = await axiosClient.get(`/PurchaseOrder/${id}`);
      if (response?.success && response.data) {
        await handleDownloadPdf(response.data);
      } else {
        toast.error("Failed to load details for PDF receipt.");
      }
    } catch (e) {
      console.error("Failed to download PDF", e);
      toast.error("Error loading details for PDF receipt.");
    }
  };

  const handleShareWhatsApp = (order: PurchaseOrderDto) => {
    const message = `Hello, please find the details of our Purchase Order:
*PO Number*: ${order.poNumber}
*Date*: ${order.poDate ? new Date(order.poDate).toLocaleDateString() : '—'}
*Supplier*: ${order.supplierName || '—'}
*Warehouse*: ${order.warehouseName || '—'}
*Net Amount*: INR ${order.netAmount?.toFixed(2)}

Thank you!`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encodedMessage}`, '_blank');
  };

  const handleShareEmail = (order: PurchaseOrderDto) => {
    const subject = encodeURIComponent(`Purchase Order: ${order.poNumber}`);
    const body = encodeURIComponent(`Hello,

Please find the details of our Purchase Order:

PO Number: ${order.poNumber}
Date: ${order.poDate ? new Date(order.poDate).toLocaleDateString() : '—'}
Supplier: ${order.supplierName || '—'}
Warehouse: ${order.warehouseName || '—'}
Net Amount: INR ${order.netAmount?.toFixed(2)}

Thank you!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleSharePdfFile = async (order: PurchaseOrderDto) => {
    try {
      let companyInfo = undefined;
      const response: any = await axiosClient.get('/Company');
      if (response?.success) {
        const companies = response.data || [];
        const warehouseObj = warehouses.find(w => w.id === order.warehouseId);
        const targetCompanyId = warehouseObj?.companyId || order.companyId || user?.companyId;
        companyInfo = companies.find((c: any) => c.id === targetCompanyId);
      }

      const doc = generatePurchaseOrderPdf(order, companyInfo, 'return');
      const blob = doc.output('blob');
      const file = new File([blob], `PO-${order.poNumber}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Purchase Order: ${order.poNumber}`,
          text: `Please find attached the Purchase Order: ${order.poNumber}`,
        });
      } else {
        toast.info("Native PDF sharing is not supported by your browser. Please open the PDF and save/attach it manually.");
      }
    } catch (e: any) {
      console.error("Failed to share PDF file", e);
      toast.error("Failed to share PDF: " + (e?.message || e));
    }
  };

  const getStatusBadge = (status: number | undefined, large = false) => {
    const size = large ? 'px-3 py-1 text-sm gap-1.5' : 'px-2.5 py-0.5 text-xs gap-1';
    switch (status) {
      case 1:
        return (
          <span className={`inline-flex items-center ${size} rounded-full font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400`}>
            <Clock className={large ? 'h-4 w-4' : 'h-3 w-3'} /> Pending
          </span>
        );
      case 2:
        return (
          <span className={`inline-flex items-center ${size} rounded-full font-semibold bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400`}>
            <CheckCircle2 className={large ? 'h-4 w-4' : 'h-3 w-3'} /> Received
          </span>
        );
      case 3:
        return (
          <span className={`inline-flex items-center ${size} rounded-full font-semibold bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400`}>
            <AlertCircle className={large ? 'h-4 w-4' : 'h-3 w-3'} /> Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  // Filtered Products for Autocomplete
  const dialogFilteredProducts = useMemo(() => {
    if (!productSearchText.trim()) return products;
    const lower = productSearchText.toLowerCase();
    return products.filter(
      p => 
        p.name.toLowerCase().includes(lower) || 
        p.productCode.toLowerCase().includes(lower) ||
        (p.sku && p.sku.toLowerCase().includes(lower))
    );
  }, [products, productSearchText]);

  if (!canView) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view Purchase Orders.</p>
        </div>
      </Page>
    );
  }

  // ----------------------------------------------------
  // RENDER: CREATE PO VIEW
  // ----------------------------------------------------
  if (isCreating) {
    return (
      <Page>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={handleCancelCreate} className="h-9 w-9">
              <ArrowLeft className="h-4.5 w-4.5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">New Purchase Order</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Generate a pending purchase request for suppliers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancelCreate}>
              Cancel
            </Button>
            <Button onClick={handleSavePO} disabled={isSaving} className="gap-1.5">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Purchase Order
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main PO Details & Items */}
          <div className="lg:col-span-2 space-y-6">
            <Section title="Order Details" className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500">Supplier *</label>
                  <Select value={formSupplierId} onValueChange={setFormSupplierId}>
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id || ''}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500">Warehouse *</label>
                  <Select value={formWarehouseId} onValueChange={setFormWarehouseId} disabled={!!user?.warehouseId}>
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue placeholder="Select Warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(w => (
                        <SelectItem key={w.id} value={w.id || ''}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500">PO Number *</label>
                  <Input 
                    value={formPONumber} 
                    onChange={e => setFormPONumber(e.target.value)} 
                    className="bg-card border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500">PO Date *</label>
                  <Input 
                    type="date" 
                    value={formPODate} 
                    onChange={e => setFormPODate(e.target.value)} 
                    className="bg-card border-border"
                  />
                </div>
              </div>
            </Section>

            <Section title="Items Details" className="p-5">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">Sr.</TableHead>
                      <TableHead>Product *</TableHead>
                      <TableHead className="w-32">Qty *</TableHead>
                      <TableHead className="w-36">Rate (₹) *</TableHead>
                      <TableHead className="w-36 text-right">Amount (₹)</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-center font-medium text-zinc-500">{idx + 1}</TableCell>
                        <TableCell>
                          {item.productId ? (
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-sm">{item.productName}</span>
                                <span className="block text-xs text-muted-foreground font-mono mt-0.5">{item.productCode}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setSelectingProductForIndex(idx)} 
                                className="text-xs text-indigo-600 hover:text-indigo-700 h-8"
                              >
                                Change
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              onClick={() => setSelectingProductForIndex(idx)}
                              className="w-full justify-start text-muted-foreground font-normal border-dashed border-2 hover:border-indigo-400"
                            >
                              <Search className="mr-2 h-4 w-4" /> Select Product
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.orderedQty || ''}
                            onChange={e => handleQtyChange(idx, Math.max(1, parseInt(e.target.value) || 0))}
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate || ''}
                            onChange={e => handleRateChange(idx, Math.max(0, parseFloat(e.target.value) || 0))}
                            className="h-9 font-mono"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          ₹{((item.amount || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {formItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No items added yet. Click "Add Item" or use the "Low Stock Alerts" panel.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center mt-4">
                <Button variant="outline" onClick={handleAddBlankItem} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
                
                <div className="text-right space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-semibold">Net Total</div>
                  <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    ₹{totals.netAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* Low Stock Side Panel */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                    Low Stock Alerts
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Below threshold (Current &lt;= Min)</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAutoAddAllLowStock}
                  className="text-xs gap-1 h-8 bg-background"
                >
                  <Plus className="h-3 w-3" /> Auto-Add All
                </Button>
              </div>
              <div className="p-4 max-h-[500px] overflow-y-auto space-y-3">
                {isLoadingLowStock ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : lowStockProducts.length === 0 ? (
                  <div className="text-center py-10 text-zinc-400 dark:text-zinc-600">
                    <CheckCircle2 className="h-10 w-10 mx-auto text-green-500/50 mb-2" />
                    <p className="text-sm">All products are well stocked!</p>
                  </div>
                ) : (
                  lowStockProducts.map((item) => {
                    const recommended = Math.max(1, item.minStock - item.currentStock);
                    return (
                      <div 
                        key={item.productId}
                        className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-lg flex items-center justify-between gap-3 hover:border-amber-400 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 truncate">
                            {item.productName}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {item.productCode}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                            <div>
                              Min: <span className="font-semibold">{item.minStock}</span>
                            </div>
                            <div className="h-2 w-px bg-zinc-300 dark:bg-zinc-700"></div>
                            <div>
                              Stock: <span className="font-semibold text-red-500">{item.currentStock}</span>
                            </div>
                            <div className="h-2 w-px bg-zinc-300 dark:bg-zinc-700"></div>
                            <div>
                              Reorder: <span className="font-bold text-amber-600">{recommended}</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="secondary" 
                          size="icon" 
                          onClick={() => handleAddLowStockItem(item)}
                          className="h-8 w-8 shrink-0 hover:bg-amber-500 hover:text-white"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Searchable Product Dialog */}
        <Dialog open={selectingProductForIndex !== null} onOpenChange={() => setSelectingProductForIndex(null)}>
          <DialogContent className="max-w-md bg-popover border border-border">
            <DialogHeader>
              <DialogTitle>Search Product</DialogTitle>
            </DialogHeader>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
              <Input
                placeholder="Type code, name, SKU..."
                value={productSearchText}
                onChange={e => setProductSearchText(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto mt-4 divide-y divide-border">
              {dialogFilteredProducts.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => handleProductSelect(selectingProductForIndex!, p)}
                  className="p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer flex justify-between items-center transition-colors"
                >
                  <div>
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{p.productCode}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-semibold">₹{p.purchaseRate?.toFixed(2)}</span>
                    <span className="block text-[10px] text-zinc-400">Stock: {p.liveStock || 0}</span>
                  </div>
                </div>
              ))}
              {dialogFilteredProducts.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No products found.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </Page>
    );
  }

  // ----------------------------------------------------
  // RENDER: LIST VIEW
  // ----------------------------------------------------
  return (
    <Page>
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">Manage pending purchase requests, reorder low stock products, and track receipts.</p>
        </div>
        {canCreate && (
          <Button onClick={handleOpenCreate} className="gap-1.5 shrink-0 h-10">
            <Plus className="h-4.5 w-4.5" /> New Purchase Order
          </Button>
        )}
      </div>

      {/* Widget Cards for Quick Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold uppercase">Pending Orders</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {orders.filter(o => o.status === 1).length}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold uppercase">Received Orders</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {orders.filter(o => o.status === 2).length}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold uppercase">Cancelled Orders</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {orders.filter(o => o.status === 3).length}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold uppercase">Low Stock Alerts</div>
            <div className="text-2xl font-bold text-red-500">
              {lowStockProducts.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <Section className="mb-6 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
            <Input
              placeholder="Search PO no, Supplier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9.5"
            />
          </div>

          <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId} disabled={!!user?.warehouseId}>
            <SelectTrigger className="h-9.5">
              <SelectValue placeholder={user?.warehouseId ? (user.warehouseName || "Warehouse") : "All Warehouses"} />
            </SelectTrigger>
            <SelectContent>
              {!user?.warehouseId && <SelectItem value="all">All Warehouses</SelectItem>}
              {warehouses.map(w => (
                <SelectItem key={w.id} value={w.id || ''}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-9.5">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="1">Pending</SelectItem>
              <SelectItem value="2">Received</SelectItem>
              <SelectItem value="3">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="h-9.5 text-xs"
              placeholder="From Date"
            />
            <Input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="h-9.5 text-xs"
              placeholder="To Date"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setSearch('');
                setSelectedWarehouseId('all');
                setSelectedStatus('all');
                setFromDate('');
                setToDate('');
              }}
              className="h-9.5 text-xs w-full sm:w-auto"
            >
              Clear Filters
            </Button>
            <Button 
              variant="secondary" 
              onClick={fetchOrders}
              className="h-9.5 size-icon shrink-0"
              tooltip="Refresh List"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Section>

      {/* PO List Table */}
      <Section className="overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-2" />
            <p className="text-muted-foreground text-sm">Loading purchase orders...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Sr.</TableHead>
                  <TableHead>PO Date</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead className="w-32 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((ord, idx) => (
                  <TableRow key={ord.id}>
                    <TableCell className="text-center font-medium text-zinc-500">
                      {(pageNumber - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {ord.poDate ? new Date(ord.poDate).toLocaleDateString() : ''}
                    </TableCell>
                    <TableCell className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      {ord.poNumber}
                    </TableCell>
                    <TableCell>{ord.supplierName}</TableCell>
                    <TableCell>{ord.warehouseName}</TableCell>
                    <TableCell>{getStatusBadge(ord.status)}</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      ₹{ord.netAmount?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleViewOrder(ord.id!)}
                          className="h-8 w-8 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          tooltip="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDownloadPdfById(ord.id!)}
                          className="h-8 w-8 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          tooltip="Print / View PDF"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setSharingOrder(ord)}
                          className="h-8 w-8 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          tooltip="Share Order"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        {ord.status === 1 && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => navigate(`/purchaseorder/receive/${ord.id}`)}
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
                              tooltip="Receive order"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleCancelOrder(ord.id!)}
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              tooltip="Cancel order"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 text-muted-foreground">
                      No Purchase Orders found matching current criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    {/* PO Detail View Dialog */}
    <Dialog open={viewingOrder !== null} onOpenChange={() => setViewingOrder(null)}>
      <DialogContent className="sm:max-w-3xl bg-popover border border-border">
        {isLoadingView ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        ) : viewingOrder ? (
          <>
            <DialogHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Purchase Order: {viewingOrder.poNumber}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Created Date: {viewingOrder.createdAt ? new Date(viewingOrder.createdAt).toLocaleString() : ''}
                  </p>
                </div>
                {getStatusBadge(viewingOrder.status, true)}
              </div>
            </DialogHeader>

            <div className={`grid grid-cols-2 ${viewingOrder.status === 2 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-4 py-4 border-b border-border`}>
              <div className="bg-muted/30 rounded-xl p-3 border border-border/60">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  <User className="h-3.5 w-3.5" /> Supplier
                </span>
                <span className="text-sm font-semibold text-foreground leading-tight block">{viewingOrder.supplierName}</span>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 border border-border/60">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  <Package className="h-3.5 w-3.5" /> Warehouse
                </span>
                <span className="text-sm font-semibold text-foreground leading-tight block">{viewingOrder.warehouseName}</span>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 border border-border/60">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  <Calendar className="h-3.5 w-3.5" /> PO Date
                </span>
                <span className="text-sm font-semibold text-foreground leading-tight block">
                  {viewingOrder.poDate ? new Date(viewingOrder.poDate).toLocaleDateString() : ''}
                </span>
              </div>
              {viewingOrder.status === 2 && (
                <div className="bg-muted/30 rounded-xl p-3 border border-border/60">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                    <FileText className="h-3.5 w-3.5" /> Invoice No
                  </span>
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 font-mono leading-tight block truncate" title={viewingOrder.invoiceNo}>
                    {viewingOrder.invoiceNo || '—'}
                  </span>
                </div>
              )}
              <div className="bg-muted/30 rounded-xl p-3 border border-border/60">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  <Hash className="h-3.5 w-3.5" /> Net Amount
                </span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono leading-tight block">
                  ₹{viewingOrder.netAmount?.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="py-2">
              <h4 className="font-bold text-sm mb-2 text-zinc-800 dark:text-zinc-200">Ordered Items</h4>
              <div className="max-h-[250px] overflow-y-auto border border-border rounded-lg">
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider">Sr.</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Product Name</TableHead>
                      <TableHead className="w-24 text-right text-xs font-bold uppercase tracking-wider">Quantity</TableHead>
                      <TableHead className="w-28 text-right text-xs font-bold uppercase tracking-wider">Rate</TableHead>
                      <TableHead className="w-28 text-right text-xs font-bold uppercase tracking-wider">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingOrder.items?.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-center text-zinc-550 dark:text-zinc-400 font-medium">{idx + 1}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-zinc-850 dark:text-zinc-100">{item.productName}</span>
                          <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">{item.productCode}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">{item.orderedQty}</TableCell>
                        <TableCell className="text-right font-mono">₹{item.rate?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-bold">₹{item.amount?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {viewingOrder.status === 2 && (
              <div className="py-2 space-y-2">
                <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Wallet className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                  Payment History / Splits
                </h4>
                <div className="border border-border rounded-lg overflow-hidden max-h-[150px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Method</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Amount Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!viewingOrder.paymentDetails || viewingOrder.paymentDetails.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-muted-foreground italic">
                            No payments recorded.
                          </TableCell>
                        </TableRow>
                      ) : (
                        viewingOrder.paymentDetails.map((pay, pidx) => {
                          const getModeLabel = (mode: number) => {
                            switch (mode) {
                              case 1: return "Cash";
                              case 2: return "Bank Transfer";
                              case 3: return "Credit Card";
                              case 4: return "UPI / Mobile";
                              case 5: return "Unpaid (Credit)";
                              default: return "Unknown";
                            }
                          };
                          return (
                            <TableRow key={pidx}>
                              <TableCell className="text-xs font-mono text-zinc-650 dark:text-zinc-400">
                                {pay.createdAt ? new Date(pay.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                              </TableCell>
                              <TableCell className="text-xs">
                                <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] uppercase font-bold">
                                  {getModeLabel(pay.paymentMode)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                ₹{pay.paidAmount.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <DialogFooter className="border-t border-border pt-4">
              <div className="flex gap-2 w-full justify-end">
                {viewingOrder.status === 1 && (
                  <>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleCancelOrder(viewingOrder.id!)}
                      className="gap-1.5"
                    >
                      <X className="h-4 w-4" /> Cancel Order
                    </Button>
                    <Button 
                      onClick={() => {
                        setViewingOrder(null);
                        navigate(`/purchaseorder/receive/${viewingOrder.id}`);
                      }}
                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white border-none"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Receive Order
                    </Button>
                  </>
                )}
                <Button 
                  onClick={() => handleDownloadPdf(viewingOrder)}
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                >
                  <Printer className="h-4 w-4" /> Print / View PDF
                </Button>
                <Button 
                  onClick={() => setSharingOrder(viewingOrder)}
                  className="gap-1.5 bg-zinc-800 hover:bg-zinc-900 text-white border-none dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  <Share2 className="h-4 w-4" /> Share Order
                </Button>
                <Button variant="outline" onClick={() => setViewingOrder(null)}>
                  Close
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>

    {/* Share PO Dialog */}
    <Dialog open={sharingOrder !== null} onOpenChange={() => setSharingOrder(null)}>
      <DialogContent className="sm:max-w-md bg-popover border border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Share2 className="h-5 w-5 text-indigo-600" />
            Share Purchase Order
          </DialogTitle>
        </DialogHeader>
        {sharingOrder && (
          <div className="space-y-4 py-4">
            <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-1.5 text-sm">
              <div><span className="font-semibold text-zinc-500 font-sans">PO Number:</span> <span className="font-mono font-semibold">{sharingOrder.poNumber}</span></div>
              <div><span className="font-semibold text-zinc-500 font-sans">Supplier:</span> <span>{sharingOrder.supplierName}</span></div>
              <div><span className="font-semibold text-zinc-500 font-sans">Net Amount:</span> <span className="font-bold text-indigo-600 dark:text-indigo-400">INR {sharingOrder.netAmount?.toFixed(2)}</span></div>
            </div>
            
            <div className="space-y-3 pt-2">
              <Button 
                onClick={() => {
                  handleSharePdfFile(sharingOrder);
                  setSharingOrder(null);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 border-none"
              >
                <Share2 className="h-4 w-4" />
                Share PDF File (WhatsApp / Email)
              </Button>
              
              <div className="text-center text-[10px] text-muted-foreground font-semibold my-1">— OR SHARE TEXT DETAILS —</div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => {
                    handleShareWhatsApp(sharingOrder);
                    setSharingOrder(null);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 border-none"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963-1.864-1.864-4.346-2.89-6.974-2.891-5.438 0-9.866 4.372-9.87 9.802-.001 1.76.471 3.479 1.365 5.011l-.974 3.559 3.654-.97zm8.814-6.315c-.328-.164-1.942-.958-2.242-1.069-.3-.111-.519-.166-.738.163-.219.329-.85 1.069-1.041 1.29-.192.221-.383.247-.712.083-.328-.164-1.387-.511-2.643-1.632-.977-.872-1.637-1.95-1.829-2.28-.192-.329-.02-.507.144-.671.148-.147.328-.383.493-.575.164-.192.219-.329.328-.549.11-.22.055-.411-.027-.575-.083-.164-.738-1.782-1.012-2.44-.267-.641-.539-.553-.738-.563-.192-.01-.41-.012-.629-.012-.218 0-.575.083-.876.411-.3.329-1.15 1.124-1.15 2.741 0 1.617 1.177 3.18 1.341 3.4.164.22 2.313 3.532 5.6 4.951.782.338 1.39.54 1.865.69.786.25 1.5.215 2.066.13.63-.095 1.942-.795 2.215-1.563.272-.767.272-1.423.191-1.562-.081-.14-.295-.222-.624-.386z"/>
                  </svg>
                  WhatsApp
                </Button>
                <Button 
                  onClick={() => {
                    handleShareEmail(sharingOrder);
                    setSharingOrder(null);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 border-none"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M0 3v18h24v-18h-24zm21.518 2l-9.518 7.713-9.518-7.713h19.036zm-19.518 14v-11.817l10 8.104 10-8.104v11.817h-20z"/>
                  </svg>
                  Email
                </Button>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setSharingOrder(null)} className="w-full">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Page>
);
}
