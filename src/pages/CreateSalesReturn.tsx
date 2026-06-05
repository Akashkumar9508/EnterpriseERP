import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Warehouse, 
  FileText,
  AlertTriangle,
  Coins,
  ArrowLeftRight,
  User,
  Package,
  Search
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
} from '@/components/ui/dialog';
import axiosClient from '@/Services/axiosClient';
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';

interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  productVariantId?: string;
  variantName?: string;
  productBatchId?: string;
  batchNumber?: string;
  qty: number;
  rate: number;
  taxPercentage?: number;
  taxAmount?: number;
  amount?: number;
  unitName?: string;
}

interface Invoice {
  id: string;
  companyId: string;
  branchId: string;
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  invoiceNo: string;
  invoiceDate: string;
  subTotal: number;
  taxAmount: number;
  netAmount: number;
  status: number;
  items?: InvoiceItem[];
}

interface ReturnItem {
  productId: string;
  productName: string;
  productCode: string;
  productVariantId?: string;
  variantName?: string;
  productBatchId?: string;
  batchNumber?: string;
  invoiceQty: number;
  previouslyReturnedQty: number;
  maxReturnableQty: number;
  returnQty: number; // User input
  rate: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  unitName?: string;
}

export default function CreateSalesReturn() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  // Loading States
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Invoice
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [invoiceDetail, setInvoiceDetail] = useState<Invoice | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Sales Invoice Selection Dialog states
  const [selectingInvoice, setSelectingInvoice] = useState(false);
  const [invoiceSearchText, setInvoiceSearchText] = useState('');
  const [activeInvoiceSearchIndex, setActiveInvoiceSearchIndex] = useState(-1);

  // Filter invoices client-side inside the search dialog
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const term = invoiceSearchText.toLowerCase().trim();
      if (!term) return true;
      return (
        inv.invoiceNo.toLowerCase().includes(term) ||
        inv.customerName.toLowerCase().includes(term)
      );
    });
  }, [invoices, invoiceSearchText]);

  useEffect(() => {
    setActiveInvoiceSearchIndex(filteredInvoices.length > 0 ? 0 : -1);
  }, [filteredInvoices, selectingInvoice]);

  useEffect(() => {
    if (activeInvoiceSearchIndex >= 0 && selectingInvoice) {
      const container = document.querySelector("#invoice-dialog-scroll-container");
      const activeEl = container?.children[activeInvoiceSearchIndex] as HTMLElement;
      if (activeEl && container) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elemTop = activeEl.offsetTop;
        const elemBottom = elemTop + activeEl.clientHeight;

        if (elemTop < containerTop) {
          container.scrollTop = elemTop;
        } else if (elemBottom > containerBottom) {
          container.scrollTop = elemBottom - container.clientHeight;
        }
      }
    }
  }, [activeInvoiceSearchIndex, selectingInvoice]);

  const handleInvoiceSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveInvoiceSearchIndex((prev) =>
        prev < filteredInvoices.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveInvoiceSearchIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeInvoiceSearchIndex >= 0 && activeInvoiceSearchIndex < filteredInvoices.length) {
        const inv = filteredInvoices[activeInvoiceSearchIndex];
        handleInvoiceChange(inv.id);
        setSelectingInvoice(false);
      }
    } else if (e.key === "Escape") {
      setSelectingInvoice(false);
    }
  };

  // Return Document Details
  const [returnNo, setReturnNo] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  // Items to return
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  // Fetch posted sales invoices to calculate quantities
  useEffect(() => {
    const loadInitData = async () => {
      if (!user?.companyId) return;
      setIsLoadingInvoices(true);
      try {
        const resInvoices: any = await axiosClient.get('/SalesInvoice', {
          params: { companyId: user.companyId }
        });

        if (resInvoices?.success) {
          // Keep only POSTED/Partially Paid/Partially Returned invoices (status = 2, 4, or 6)
          const postedInvoices = (resInvoices.data || []).filter((inv: Invoice) => inv.status === 2 || inv.status === 4 || inv.status === 6);
          setInvoices(postedInvoices);
        }
      } catch (err) {
        console.error('Failed to load initial data', err);
        toast.error('Failed to load sales invoices.');
      } finally {
        setIsLoadingInvoices(false);
      }
    };
    loadInitData();
  }, [user?.companyId]);

  // Generate unique Return Number
  useEffect(() => {
    if (selectedInvoiceId && invoiceDetail) {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const dateStr = returnDate.replace(/-/g, '');
      setReturnNo(`SR-${dateStr}-${randomId}`);
    } else {
      setReturnNo('');
    }
  }, [selectedInvoiceId, invoiceDetail, returnDate]);

  // Load details of selected Invoice
  const handleInvoiceChange = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setInvoiceDetail(null);
    setReturnItems([]);
    if (!invoiceId) return;

    setIsLoadingDetail(true);
    try {
      const [res, qtyRes] = await Promise.all([
        axiosClient.get(`/SalesInvoice/${invoiceId}`),
        axiosClient.get(`/SalesReturn/returned-qty/${invoiceId}`)
      ]) as [any, any];

      if (res?.success && res.data) {
        const invoice: Invoice = res.data;
        setInvoiceDetail(invoice);

        const returnedQuantities = qtyRes?.success ? qtyRes.data : [];

        // Build product lines
        const items = invoice.items || [];
        const mappedItems = items.map((invItem) => {
          // Find matching returned quantity
          const returnedItem = (returnedQuantities || []).find((rq: any) => 
            rq.productId === invItem.productId &&
            (rq.productVariantId === invItem.productVariantId || (!rq.productVariantId && !invItem.productVariantId)) &&
            (rq.productBatchId === invItem.productBatchId || (!rq.productBatchId && !invItem.productBatchId))
          );
          const previouslyReturnedQty = returnedItem ? returnedItem.returnedQuantity : 0;
          const maxReturnableQty = Math.max(0, invItem.qty - previouslyReturnedQty);

          return {
            productId: invItem.productId,
            productName: invItem.productName || '',
            productCode: invItem.productCode || '',
            productVariantId: invItem.productVariantId,
            variantName: invItem.variantName,
            productBatchId: invItem.productBatchId,
            batchNumber: invItem.batchNumber,
            invoiceQty: invItem.qty,
            previouslyReturnedQty,
            maxReturnableQty,
            returnQty: 0, // start at 0
            rate: invItem.rate,
            taxPercent: invItem.taxPercentage || 0,
            taxAmount: 0,
            totalAmount: 0,
            unitName: invItem.unitName
          };
        });

        setReturnItems(mappedItems);
      }
    } catch (err) {
      console.error('Failed to load invoice details', err);
      toast.error('Failed to load invoice details.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Handle Return Quantity edit
  const handleQtyChange = (index: number, val: string) => {
    const qty = parseFloat(val) || 0;
    const updated = [...returnItems];
    const item = updated[index];

    // Enforce limits
    if (qty < 0) {
      toast.warning('Return quantity cannot be negative.');
      item.returnQty = 0;
    } else if (qty > item.maxReturnableQty) {
      toast.warning(`Cannot return more than the remaining quantity (${item.maxReturnableQty}).`);
      item.returnQty = item.maxReturnableQty;
    } else {
      item.returnQty = qty;
    }

    // Recalculate totals for this line
    const subtotal = item.returnQty * item.rate;
    item.taxAmount = (subtotal * item.taxPercent) / 100;
    item.totalAmount = subtotal + item.taxAmount;

    setReturnItems(updated);
  };

  // Grand Totals Calculations
  const grandTotals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let net = 0;
    let activeReturnLinesCount = 0;

    returnItems.forEach((item) => {
      if (item.returnQty > 0) {
        subtotal += item.returnQty * item.rate;
        tax += item.taxAmount;
        net += item.totalAmount;
        activeReturnLinesCount++;
      }
    });

    return { subtotal, tax, net, activeReturnLinesCount };
  }, [returnItems]);

  const handleSubmit = async () => {
    if (!selectedInvoiceId || !invoiceDetail) {
      toast.error('Please select a sales invoice to return items from.');
      return;
    }

    if (!returnNo.trim()) {
      toast.error('Please enter a return number.');
      return;
    }

    if (grandTotals.activeReturnLinesCount === 0) {
      toast.error('Please return at least one product with quantity greater than zero.');
      return;
    }

    // Build items payload
    const itemsPayload = returnItems
      .filter((item) => item.returnQty > 0)
      .map((item) => ({
        productId: item.productId,
        productVariantId: item.productVariantId,
        productBatchId: item.productBatchId,
        quantity: item.returnQty,
        rate: item.rate,
        taxPercent: item.taxPercent,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount
      }));

    const payload = {
      companyId: invoiceDetail.companyId,
      branchId: invoiceDetail.branchId,
      customerId: invoiceDetail.customerId,
      warehouseId: invoiceDetail.warehouseId,
      salesInvoiceId: selectedInvoiceId,
      returnNo: returnNo,
      returnDate: returnDate,
      remarks: remarks,
      totalAmount: grandTotals.subtotal,
      taxAmount: grandTotals.tax,
      netAmount: grandTotals.net,
      items: itemsPayload
    };

    setIsSubmitting(true);
    try {
      const response: any = await axiosClient.post('/SalesReturn', payload);
      if (response?.success) {
        toast.success(response.message || 'Sales return recorded and stock incremented successfully!');
        navigate('/sales-return');
      } else {
        toast.error(response?.message || 'Failed to record sales return.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Page>
      {/* Top Navigation */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 shrink-0" 
            onClick={() => navigate('/sales-return')}
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Record Sales Return</h1>
            <p className="text-muted-foreground text-xs mt-0.5">Return items back to warehouse stock and adjust outstanding customer balances.</p>
          </div>
        </div>
        
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || isLoadingDetail}
          className="gap-1.5 shrink-0 h-10 shadow-sm"
        >
          {isSubmitting ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <Save className="h-4.5 w-4.5" />
          )}
          Post Return
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form (Header details) */}
        <div className="lg:col-span-1 space-y-6">
          <Section className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-zinc-500" /> Return Details
            </h2>

            <div className="space-y-4">
              
              {/* Select Sales Invoice */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500">Select Sales Invoice</label>
                {invoiceDetail ? (
                  <div className="flex items-center justify-between border border-border bg-card rounded-md p-3">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-bold text-sm text-foreground block font-mono truncate">
                        {invoiceDetail.invoiceNo}
                      </span>
                      <span className="text-xs text-muted-foreground block truncate">
                        {invoiceDetail.customerName} • ₹{invoiceDetail.netAmount.toFixed(2)}
                      </span>
                    </div>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setInvoiceSearchText('');
                        setSelectingInvoice(true);
                      }} 
                      className="text-xs shrink-0 h-8 gap-1.5"
                    >
                      <Search className="h-3.5 w-3.5" /> Change
                    </Button>
                  </div>
                ) : (
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => {
                      setInvoiceSearchText('');
                      setSelectingInvoice(true);
                    }}
                    className="w-full justify-start text-muted-foreground font-normal border-dashed border-2 hover:border-indigo-400 h-10"
                    disabled={isLoadingInvoices}
                  >
                    {isLoadingInvoices ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading Invoices...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" /> Select Invoice...
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Return Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500">Return Document No.</label>
                <Input 
                  type="text" 
                  value={returnNo}
                  onChange={(e) => setReturnNo(e.target.value)}
                  placeholder="Auto-generated SR No."
                  className="h-10 font-mono font-semibold"
                />
              </div>

              {/* Return Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500">Return Date</label>
                <Input 
                  type="date" 
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Warehouse (Read-Only) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><Warehouse className="h-3 w-3" /> Target Warehouse (Read-Only)</label>
                <Input 
                  type="text" 
                  value={invoiceDetail?.warehouseName || '—'} 
                  readOnly 
                  className="h-10 bg-zinc-50 dark:bg-zinc-900/30 text-zinc-650"
                />
              </div>

              {/* Customer (Read-Only) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><User className="h-3 w-3" /> Customer (Read-Only)</label>
                <Input 
                  type="text" 
                  value={invoiceDetail?.customerName || '—'} 
                  readOnly 
                  className="h-10 bg-zinc-50 dark:bg-zinc-900/30 text-zinc-650"
                />
              </div>

              {/* Remarks */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500">Remarks / Reason for Return</label>
                <textarea 
                  value={remarks}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRemarks(e.target.value)}
                  placeholder="E.g. Customer returned items, damaged on arrival, incorrect product"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-800"
                />
              </div>

            </div>
          </Section>
        </div>

        {/* Right Form (Items List & Totals) */}
        <div className="lg:col-span-2 space-y-6">
          <Section className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col min-h-[480px]">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <Package className="h-4.5 w-4.5 text-zinc-500" /> Invoice Line Items
            </h2>

            {isLoadingDetail ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
                <span className="text-sm text-muted-foreground">Loading invoice products...</span>
              </div>
            ) : !selectedInvoiceId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border border-dashed border-zinc-200/80 rounded-xl dark:border-white/5 bg-zinc-50/30 dark:bg-zinc-900/5">
                <ArrowLeftRight className="h-10 w-10 text-zinc-400 mb-3" />
                <h3 className="font-semibold text-sm mb-1">No Invoice Selected</h3>
                <p className="text-xs text-muted-foreground max-w-xs">Please select a sales invoice on the left to load its products for returns.</p>
              </div>
            ) : returnItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
                <h3 className="font-semibold text-sm">No items found</h3>
                <p className="text-xs text-muted-foreground">This invoice does not contain any product lines.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="overflow-x-auto border border-border rounded-xl mb-6">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[50px]">Sr.</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-[120px]">Variant/Batch</TableHead>
                        <TableHead className="w-[90px] text-right">Invoiced Qty</TableHead>
                        <TableHead className="w-[90px] text-right">Already Ret.</TableHead>
                        <TableHead className="w-[100px] text-right font-semibold text-red-650">Return Qty</TableHead>
                        <TableHead className="w-[90px] text-right">Rate</TableHead>
                        <TableHead className="w-[110px] text-right">Line Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-semibold text-sm leading-tight">{item.productName}</div>
                            {item.productCode && (
                              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{item.productCode}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {item.variantName && <div>V: {item.variantName}</div>}
                            {item.batchNumber && <div className="text-[10px] text-amber-600 dark:text-amber-450 mt-0.5">B: {item.batchNumber}</div>}
                            {!item.variantName && !item.batchNumber && <span className="text-zinc-400 italic font-sans">Base</span>}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium whitespace-nowrap">
                            {item.invoiceQty} <span className="text-[10px] text-muted-foreground font-sans font-medium">{item.unitName}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-amber-650 whitespace-nowrap">
                            {item.previouslyReturnedQty} <span className="text-[10px] text-amber-650/70 font-sans font-medium">{item.unitName}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Input
                                type="number"
                                min="0"
                                max={item.maxReturnableQty}
                                step="any"
                                value={item.returnQty === 0 ? '' : item.returnQty}
                                onChange={(e) => handleQtyChange(idx, e.target.value)}
                                placeholder={`max ${item.maxReturnableQty}`}
                                className="h-8 text-right font-mono font-bold text-red-650 dark:text-red-400 w-full text-xs px-2 border-red-200 focus-visible:ring-red-400 dark:border-red-950/40"
                                disabled={item.maxReturnableQty === 0}
                              />
                              {item.unitName && (
                                <span className="text-[10px] text-zinc-550 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 px-1.5 py-0.5 rounded font-medium shrink-0">
                                  {item.unitName}
                                </span>
                              )}
                            </div>
                            {item.maxReturnableQty === 0 && (
                              <span className="text-[9px] text-red-550 block mt-0.5 text-right font-semibold">Fully Returned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">₹{item.rate.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-zinc-900 dark:text-zinc-50">
                            ₹{item.totalAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals Section */}
                <div className="flex flex-col sm:flex-row justify-between items-end sm:items-start gap-4 border-t border-border pt-4">
                  <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200/80 rounded-lg px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900/5 dark:border-white/5">
                    <Coins className="h-4.5 w-4.5 text-zinc-400" />
                    <span>Calculations include original GST profile rates.</span>
                  </div>

                  <div className="w-72 bg-zinc-50/50 border border-border rounded-xl overflow-hidden dark:bg-zinc-900/10 shrink-0">
                    <div className="px-4 py-3 space-y-2.5 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Return Subtotal</span>
                        <span className="font-semibold text-foreground">₹{grandTotals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Returned GST</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">+ ₹{grandTotals.tax.toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex justify-between text-sm font-bold pt-0.5">
                        <span className="text-foreground">Total Refund Credit</span>
                        <span className="text-red-650 dark:text-red-400">₹{grandTotals.net.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </Section>
        </div>

      </div>

      {/* Searchable Sales Invoice Dialog */}
      <Dialog open={selectingInvoice} onOpenChange={setSelectingInvoice}>
        <DialogContent className="max-w-md bg-popover border border-border">
          <DialogHeader>
            <DialogTitle>Search Sales Invoice</DialogTitle>
          </DialogHeader>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
            <Input
              placeholder="Search by invoice no or customer name..."
              value={invoiceSearchText}
              onChange={(e) => setInvoiceSearchText(e.target.value)}
              onKeyDown={handleInvoiceSearchKeyDown}
              className="pl-9"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto mt-4 divide-y divide-border" id="invoice-dialog-scroll-container">
            {isLoadingInvoices ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading invoices...</span>
              </div>
            ) : (
              filteredInvoices.map((inv, idx) => (
                <div 
                  key={inv.id}
                  onClick={() => {
                    handleInvoiceChange(inv.id);
                    setSelectingInvoice(false);
                  }}
                  className={`p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer flex justify-between items-center transition-colors ${selectedInvoiceId === inv.id || idx === activeInvoiceSearchIndex ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-bold text-sm font-mono text-zinc-900 dark:text-zinc-100 truncate">{inv.invoiceNo}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{inv.customerName}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Date: {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">₹{inv.netAmount.toFixed(2)}</span>
                    <span className="block text-[10px] text-muted-foreground">{inv.warehouseName}</span>
                  </div>
                </div>
              ))
            )}
            {!isLoadingInvoices && filteredInvoices.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                No matching invoices found.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
