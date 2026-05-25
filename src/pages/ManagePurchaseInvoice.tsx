import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  Trash2, 
  Plus, 
  Loader2, 
  Warehouse, 
  Search, 
  Calendar, 
  FileText,
  RefreshCw,
  CheckCircle2,
  FileEdit,
  AlertCircle,
  Pencil,
  Eye,
  X,
  Package,
  User,
  Hash,
  StickyNote,
  TrendingDown,
  Receipt,
  Ban
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

import type { PurchaseInvoiceDto } from '@/types/PurchaseInvoiceDto';
import type { WarehouseDto } from '@/types/WarehouseDto';

export default function ManagePurchaseInvoice() {
  const navigate = useNavigate();
  const { canView, canCreate, canDelete } = usePermissions('/product');

  // Core States
  const [invoices, setInvoices] = useState<PurchaseInvoiceDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter/Search States
  const [search, setSearch] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination States
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Invoice Modal State
  const [viewingInvoice, setViewingInvoice] = useState<PurchaseInvoiceDto | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(false);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/PurchaseInvoice');
      if (response?.success) {
        setInvoices(response.data || []);
      }
    } catch (e) {
      console.error('Failed to load purchase invoices', e);
      toast.error('Failed to load purchase invoices.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response: any = await axiosClient.get('/Warehouse');
      if (response?.success) {
        setWarehouses(response.data || []);
      }
    } catch (e) {
      console.error('Failed to load warehouses', e);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchInvoices();
      fetchWarehouses();
    }
  }, [canView]);

  // Client-side filtering
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const supplierName = inv.supplierName || '';
      const invoiceNo = inv.invoiceNo || '';
      const refNo = inv.referenceNo || '';
      const remarks = inv.remarks || '';

      const matchesSearch = 
        supplierName.toLowerCase().includes(search.toLowerCase()) ||
        invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
        refNo.toLowerCase().includes(search.toLowerCase()) ||
        remarks.toLowerCase().includes(search.toLowerCase());

      const matchesWarehouse = selectedWarehouseId === 'all' || inv.warehouseId === selectedWarehouseId;
      const matchesStatus = selectedStatus === 'all' || inv.status.toString() === selectedStatus;

      // Date filtering (comparison by date string YYYY-MM-DD)
      let matchesDate = true;
      if (inv.invoiceDate) {
        const invDateString = inv.invoiceDate.split('T')[0];
        if (fromDate && invDateString < fromDate) {
          matchesDate = false;
        }
        if (toDate && invDateString > toDate) {
          matchesDate = false;
        }
      } else if (fromDate || toDate) {
        matchesDate = false;
      }

      return matchesSearch && matchesWarehouse && matchesStatus && matchesDate;
    });
  }, [invoices, search, selectedWarehouseId, selectedStatus, fromDate, toDate]);

  // Paginated Invoices
  const totalCount = filteredInvoices.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedInvoices = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, pageNumber, pageSize]);

  useEffect(() => {
    setPageNumber(1);
  }, [search, selectedWarehouseId, selectedStatus, fromDate, toDate, pageSize]);

  // Dashboard Stats Calculations
  const stats = useMemo(() => {
    let totalPurchases = 0;
    let postedCount = 0;
    let draftCount = 0;
    let totalSpend = 0;

    invoices.forEach(inv => {
      totalPurchases++;
      if (inv.status === 2) {
        postedCount++;
        totalSpend += inv.netAmount;
      } else if (inv.status === 1) {
        draftCount++;
      }
    });

    return { totalPurchases, postedCount, draftCount, totalSpend };
  }, [invoices]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase invoice? Any inventory additions will be rolled back from the stock ledger.')) return;

    try {
      const response: any = await axiosClient.delete(`/PurchaseInvoice/${id}`);
      if (response?.success) {
        toast.success('Purchase invoice and stock additions rolled back successfully!');
        fetchInvoices();
      } else {
        toast.error(response?.message || 'Failed to rollback purchase invoice.');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'An error occurred during rollback.');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this purchase invoice? Any inventory additions will be rolled back from the stock ledger, and the invoice status will be updated to Cancelled.')) return;

    try {
      const response: any = await axiosClient.post(`/PurchaseInvoice/${id}/cancel`);
      if (response?.success) {
        toast.success('Purchase invoice cancelled and stock additions rolled back successfully!');
        fetchInvoices();
        if (viewingInvoice) {
          setViewingInvoice(null);
        }
      } else {
        toast.error(response?.message || 'Failed to cancel purchase invoice.');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || 'An error occurred during cancellation.');
    }
  };

  // Open invoice detail view
  const handleView = async (id: string) => {
    setIsLoadingView(true);
    setViewingInvoice(null); // open the dialog immediately with loading state
    try {
      const response: any = await axiosClient.get(`/PurchaseInvoice/${id}`);
      if (response?.success) {
        setViewingInvoice(response.data);
      } else {
        toast.error('Failed to load invoice details.');
      }
    } catch (e) {
      console.error('Failed to load invoice', e);
      toast.error('Failed to load invoice details.');
    } finally {
      setIsLoadingView(false);
    }
  };

  const getStatusBadge = (status: number, large = false) => {
    const size = large ? 'px-3 py-1 text-sm gap-1.5' : 'px-2.5 py-0.5 text-xs gap-1';
    switch (status) {
      case 1:
        return (
          <span className={`inline-flex items-center ${size} rounded-full font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300`}>
            <FileEdit className={large ? 'h-4 w-4' : 'h-3 w-3'} /> Draft
          </span>
        );
      case 2:
        return (
          <span className={`inline-flex items-center ${size} rounded-full font-semibold bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400`}>
            <CheckCircle2 className={large ? 'h-4 w-4' : 'h-3 w-3'} /> Posted (Stock In)
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

  if (!canView) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view purchase modules.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Invoices</h1>
          <p className="text-muted-foreground mt-1">Record supplier billing, receive items into warehouses, and track accounts payable.</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/purchase-invoice/create')} className="gap-1.5 shrink-0 h-10">
            <Plus className="h-4.5 w-4.5" /> New Purchase Invoice
          </Button>
        )}
      </div>

      {/* Widget Cards for Quick Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.totalPurchases}</div>
            <div className="text-xs text-muted-foreground">Total Invoices</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-green-600 dark:text-green-400">
            <span className="font-semibold text-lg">₹</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">₹{stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">Total Posted Purchase Value</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-450">{stats.postedCount}</div>
            <div className="text-xs text-muted-foreground">Posted (Ledger Active)</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-600 dark:text-amber-400">
            <FileEdit className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">{stats.draftCount}</div>
            <div className="text-xs text-muted-foreground">Draft Records</div>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <Section className="bg-card border border-border rounded-xl p-4 shadow-xs mb-6 overflow-x-auto">
        <div className="flex items-center gap-3 min-w-max">
          
          <div className="relative w-[280px] shrink-0">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
            <Input
              type="search"
              placeholder="Search Supplier / Invoice No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 w-full"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline-block">From</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 w-[130px] text-xs px-2"
              title="From Date"
            />
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline-block">To</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 w-[130px] text-xs px-2"
              title="To Date"
            />
          </div>
          
          {(fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
              className="h-9 px-2 text-xs text-red-650 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20 shrink-0"
            >
              Clear
            </Button>
          )}

          <div className="h-5 w-px bg-border mx-1 shrink-0"></div>

          <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
            <SelectTrigger className="w-[160px] h-9 shrink-0">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id || ''}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[130px] h-9 shrink-0">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="1">Draft</SelectItem>
              <SelectItem value="2">Posted</SelectItem>
              <SelectItem value="3">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchInvoices} className="h-9 w-9 shrink-0" title="Refresh List">
            <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

        </div>
      </Section>

      {/* Invoices Table */}
      <Section className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[60px]">Sr.</TableHead>
                <TableHead className="w-[120px]">Invoice Date</TableHead>
                <TableHead className="w-[160px]">Invoice No.</TableHead>
                <TableHead className="w-[200px]">Supplier</TableHead>
                <TableHead className="w-[160px]">Warehouse</TableHead>
                <TableHead className="w-[100px] text-center">Status</TableHead>
                <TableHead className="w-[130px] text-right font-semibold text-zinc-900 dark:text-zinc-50">Net Amount</TableHead>
                <TableHead className="text-center w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No purchase invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((inv, index) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{(pageNumber - 1) * pageSize + index + 1}</TableCell>
                    <TableCell className="text-xs font-medium">
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{inv.invoiceNo}</div>
                      {inv.referenceNo && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">Ref: {inv.referenceNo}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{inv.supplierName || 'Unknown Supplier'}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                        <Warehouse className="h-3.5 w-3.5 opacity-60" />
                        {inv.warehouseName || 'Unknown Warehouse'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center align-middle">{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">
                      ₹{inv.netAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* View button — always visible */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/20 dark:hover:text-violet-400"
                          onClick={() => handleView(inv.id!)}
                          title="View Invoice Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Edit — only for Drafts */}
                        {inv.status === 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20 dark:hover:text-blue-400"
                            onClick={() => navigate(`/purchase-invoice/edit/${inv.id}`)}
                            title="Edit Draft Invoice"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Delete */}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                            onClick={() => handleDelete(inv.id!)}
                            title="Delete & Rollback Stock"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Cancel */}
                        {canDelete && inv.status !== 3 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-amber-50 hover:text-amber-650 dark:hover:bg-amber-950/20 dark:hover:text-amber-400"
                            onClick={() => handleCancel(inv.id!)}
                            title="Cancel & Rollback Stock"
                          >
                            <Ban className="h-4.5 w-4.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Pagination */}
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

      {/* ─── Invoice Detail View Modal (custom overlay) ─── */}
      {(isLoadingView || viewingInvoice !== null) && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setViewingInvoice(null); setIsLoadingView(false); } }}
        >
          <div
            className="relative bg-popover text-popover-foreground rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: 'min(92vw, 1100px)', height: 'min(88vh, 860px)' }}
          >

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-border bg-muted/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-violet-100 dark:bg-violet-950/30 rounded-xl">
                  <Receipt className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {viewingInvoice ? `Invoice: ${viewingInvoice.invoiceNo}` : 'Loading...'}
                  </h2>
                  {viewingInvoice && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {new Date(viewingInvoice.invoiceDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {viewingInvoice && getStatusBadge(viewingInvoice.status, true)}
                <button
                  onClick={() => { setViewingInvoice(null); setIsLoadingView(false); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingView && !viewingInvoice ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
                  <span className="text-sm text-muted-foreground">Loading invoice details...</span>
                </div>
              ) : viewingInvoice ? (
                <div className="p-7 space-y-7">

                  {/* ── Meta Info Cards ── */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/60">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        <User className="h-3.5 w-3.5" /> Supplier
                      </div>
                      <div className="text-base font-bold text-foreground leading-tight">{viewingInvoice.supplierName || '—'}</div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 border border-border/60">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        <Warehouse className="h-3.5 w-3.5" /> Warehouse
                      </div>
                      <div className="text-base font-bold text-foreground leading-tight">{viewingInvoice.warehouseName || '—'}</div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 border border-border/60">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        <Hash className="h-3.5 w-3.5" /> Invoice No.
                      </div>
                      <div className="text-base font-bold font-mono text-foreground leading-tight">{viewingInvoice.invoiceNo}</div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 border border-border/60">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        <Calendar className="h-3.5 w-3.5" /> Invoice Date
                      </div>
                      <div className="text-base font-bold text-foreground leading-tight">
                        {new Date(viewingInvoice.invoiceDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    {viewingInvoice.referenceNo && (
                      <div className="bg-muted/30 rounded-xl p-4 border border-border/60">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                          <Hash className="h-3.5 w-3.5" /> Reference No.
                        </div>
                        <div className="text-base font-bold font-mono text-foreground leading-tight">{viewingInvoice.referenceNo}</div>
                      </div>
                    )}

                    {viewingInvoice.remarks && (
                      <div className="bg-muted/30 rounded-xl p-4 border border-border/60 col-span-2 lg:col-span-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                          <StickyNote className="h-3.5 w-3.5" /> Remarks
                        </div>
                        <div className="text-sm text-foreground">{viewingInvoice.remarks}</div>
                      </div>
                    )}
                  </div>

                  {/* ── Line Items Table ── */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <Package className="h-4.5 w-4.5 text-muted-foreground" />
                      <h3 className="text-base font-bold text-foreground">
                        Invoice Line Items
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 text-xs font-semibold">
                        {viewingInvoice.items?.length || 0} items
                      </span>
                    </div>

                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border">
                              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground w-10">#</th>
                              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Product</th>
                              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground w-32">Variant</th>
                              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground w-28">Batch</th>
                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-16">Qty</th>
                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-16">Free</th>
                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-28">Rate</th>
                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-24">MRP</th>
                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-20">Disc%</th>
                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-20">Tax%</th>
                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-28">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {(viewingInvoice.items || []).length === 0 ? (
                              <tr>
                                <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                                  No line items found.
                                </td>
                              </tr>
                            ) : (
                              (viewingInvoice.items || []).map((item, idx) => (
                                <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{idx + 1}</td>
                                  <td className="px-4 py-3.5">
                                    <div className="font-semibold text-foreground">{item.productName || item.productId}</div>
                                    {item.productCode && (
                                      <div className="text-xs font-mono text-muted-foreground mt-0.5">{item.productCode}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                                    {item.variantName || <span className="italic text-muted-foreground/50">Base</span>}
                                  </td>
                                  <td className="px-4 py-3.5 font-mono text-sm text-muted-foreground">
                                    {item.batchNumber || <span className="italic text-muted-foreground/50">—</span>}
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">{item.quantity}</td>
                                  <td className="px-4 py-3.5 text-right font-mono text-muted-foreground">{item.freeQuantity || 0}</td>
                                  <td className="px-4 py-3.5 text-right font-mono text-foreground">₹{Number(item.purchaseRate).toFixed(2)}</td>
                                  <td className="px-4 py-3.5 text-right font-mono text-muted-foreground">₹{Number(item.mrp || 0).toFixed(2)}</td>
                                  <td className="px-4 py-3.5 text-right font-mono text-orange-600 dark:text-orange-400">{Number(item.discountPercent || 0).toFixed(1)}%</td>
                                  <td className="px-4 py-3.5 text-right font-mono text-blue-600 dark:text-blue-400">{Number(item.taxPercent || 0).toFixed(1)}%</td>
                                  <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">₹{Number(item.totalAmount || 0).toFixed(2)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* ── Totals ── */}
                  <div className="flex justify-end">
                    <div className="w-80 bg-muted/30 border border-border rounded-xl overflow-hidden">
                      <div className="px-5 py-3 bg-muted/40 border-b border-border">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Invoice Summary</span>
                      </div>
                      <div className="px-5 py-4 space-y-3 font-mono text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-semibold text-foreground">₹{Number(viewingInvoice.subTotal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <TrendingDown className="h-3.5 w-3.5" /> Discount
                          </div>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">− ₹{Number(viewingInvoice.discountAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax (GST)</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">+ ₹{Number(viewingInvoice.taxAmount).toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-border" />
                        <div className="flex justify-between text-base font-bold pt-1">
                          <span>Net Payable</span>
                          <span className="text-green-600 dark:text-green-400">₹{Number(viewingInvoice.netAmount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : null}
            </div>

            {/* ── Footer ── */}
            {viewingInvoice && (
              <div className="px-7 py-4 border-t border-border bg-muted/10 shrink-0 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Created: {viewingInvoice.createdAt ? new Date(viewingInvoice.createdAt).toLocaleString() : '—'}
                </p>
                <div className="flex items-center gap-2.5">
                  {viewingInvoice.status === 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 px-4 text-sm gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/20"
                      onClick={() => {
                        setViewingInvoice(null);
                        navigate(`/purchase-invoice/edit/${viewingInvoice.id}`);
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Edit Invoice
                    </Button>
                  )}
                  {canDelete && viewingInvoice.status !== 3 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 px-4 text-sm gap-2 text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/20"
                      onClick={() => handleCancel(viewingInvoice.id!)}
                    >
                      <Ban className="h-4 w-4" /> Cancel Invoice
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-4 text-sm gap-2"
                    onClick={() => { setViewingInvoice(null); setIsLoadingView(false); }}
                  >
                    <X className="h-4 w-4" /> Close
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

    </Page>
  );
}
