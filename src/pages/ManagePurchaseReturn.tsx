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
  Eye,
  X,
  Package,
  User,
  Hash,
  StickyNote,
  ArrowLeftRight
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
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';

interface PurchaseReturnItemDto {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  productVariantId?: string;
  variantName?: string;
  productBatchId?: string;
  batchNumber?: string;
  quantity: number;
  purchaseRate: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
}

interface PurchaseReturnDto {
  id: string;
  companyId: string;
  branchId: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  purchaseInvoiceId?: string;
  invoiceNo?: string;
  returnNo: string;
  returnDate: string;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  remarks?: string;
  createdAt: string;
  items: PurchaseReturnItemDto[];
}

interface WarehouseDto {
  id: string;
  name: string;
}

export default function ManagePurchaseReturn() {
  const navigate = useNavigate();
  const { canView, canCreate, canDelete } = usePermissions('/purchase-return');
  const user = useAppSelector((state) => state.auth.user);

  // Core States
  const [returns, setReturns] = useState<PurchaseReturnDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const filteredWarehouses = useMemo(() => {
    if (user?.warehouseId) {
      return warehouses.filter(w => w.id === user.warehouseId);
    }
    return warehouses;
  }, [warehouses, user?.warehouseId]);

  // Filter/Search States
  const [search, setSearch] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(user?.warehouseId || 'all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination States
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Modal State
  const [viewingReturn, setViewingReturn] = useState<PurchaseReturnDto | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(false);

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const response: any = await axiosClient.get('/PurchaseReturn');
      if (response?.success) {
        setReturns(response.data || []);
      }
    } catch (e) {
      console.error('Failed to load purchase returns', e);
      toast.error('Failed to load purchase returns.');
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
      fetchReturns();
      fetchWarehouses();
    }
  }, [canView]);

  // Client-side filtering
  const filteredReturns = useMemo(() => {
    return returns.filter(ret => {
      const supplierName = ret.supplierName || '';
      const returnNo = ret.returnNo || '';
      const invoiceNo = ret.invoiceNo || '';
      const remarks = ret.remarks || '';

      const matchesSearch = 
        supplierName.toLowerCase().includes(search.toLowerCase()) ||
        returnNo.toLowerCase().includes(search.toLowerCase()) ||
        invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
        remarks.toLowerCase().includes(search.toLowerCase());

      const matchesWarehouse = selectedWarehouseId === 'all' || ret.warehouseId === selectedWarehouseId;

      // Date filtering
      let matchesDate = true;
      if (ret.returnDate) {
        const retDateString = ret.returnDate.split('T')[0];
        if (fromDate && retDateString < fromDate) {
          matchesDate = false;
        }
        if (toDate && retDateString > toDate) {
          matchesDate = false;
        }
      } else if (fromDate || toDate) {
        matchesDate = false;
      }

      return matchesSearch && matchesWarehouse && matchesDate;
    });
  }, [returns, search, selectedWarehouseId, fromDate, toDate]);

  // Paginated Returns
  const totalCount = filteredReturns.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedReturns = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, pageNumber, pageSize]);

  useEffect(() => {
    setPageNumber(1);
  }, [search, selectedWarehouseId, fromDate, toDate, pageSize]);

  // Dashboard Stats Calculations
  const stats = useMemo(() => {
    let totalReturnsCount = 0;
    let totalReturnedValue = 0;

    filteredReturns.forEach(ret => {
      totalReturnsCount++;
      totalReturnedValue += ret.netAmount;
    });

    return { totalReturnsCount, totalReturnedValue };
  }, [filteredReturns]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase return? Deducted inventory quantities will be restored back to stock.')) return;

    try {
      const response: any = await axiosClient.delete(`/PurchaseReturn/${id}`);
      if (response?.success) {
        toast.success('Purchase return deleted and stock deductions restored successfully!');
        fetchReturns();
      } else {
        toast.error(response?.message || 'Failed to delete purchase return.');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || 'An error occurred during deletion.');
    }
  };

  const handleView = async (id: string) => {
    setIsLoadingView(true);
    setViewingReturn(null);
    try {
      const response: any = await axiosClient.get(`/PurchaseReturn/${id}`);
      if (response?.success) {
        setViewingReturn(response.data);
      } else {
        toast.error('Failed to load purchase return details.');
      }
    } catch (e) {
      console.error('Failed to load purchase return', e);
      toast.error('Failed to load purchase return details.');
    } finally {
      setIsLoadingView(false);
    }
  };

  if (!canView) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view purchase returns.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Returns</h1>
          <p className="text-muted-foreground mt-1">Manage invoice-wise product returns to suppliers and adjust stock levels.</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/purchase-return/create')} className="gap-1.5 shrink-0 h-10">
            <Plus className="h-4.5 w-4.5" /> New Purchase Return
          </Button>
        )}
      </div>

      {/* Widget Cards for Quick Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.totalReturnsCount}</div>
            <div className="text-xs text-muted-foreground">Total Returns</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-red-600 dark:text-red-400">
            <span className="font-semibold text-lg">₹</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-650 dark:text-red-400">₹{stats.totalReturnedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">Total Returned Value</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-650 dark:text-zinc-400">
            <Warehouse className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{filteredWarehouses.length}</div>
            <div className="text-xs text-muted-foreground">Active Warehouses</div>
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
              placeholder="Search Return No / Supplier / Invoice..."
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
              <SelectValue placeholder={user?.warehouseId ? (user.warehouseName || "Warehouse") : "All Warehouses"} />
            </SelectTrigger>
            <SelectContent>
              {!user?.warehouseId && <SelectItem value="all">All Warehouses</SelectItem>}
              {filteredWarehouses.map((w) => (
                <SelectItem key={w.id} value={w.id || ''}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchReturns} className="h-9 w-9 shrink-0" title="Refresh List">
            <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

        </div>
      </Section>

      {/* Returns Table */}
      <Section className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[60px]">Sr.</TableHead>
                <TableHead className="w-[130px]">Return Date</TableHead>
                <TableHead className="w-[160px]">Return No.</TableHead>
                <TableHead className="w-[200px]">Supplier</TableHead>
                <TableHead className="w-[160px]">Warehouse</TableHead>
                <TableHead className="w-[160px]">Linked Invoice</TableHead>
                <TableHead className="w-[130px] text-right font-semibold text-zinc-900 dark:text-zinc-50">Returned Value</TableHead>
                <TableHead className="text-center w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginatedReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No purchase returns found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReturns.map((ret, index) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-mono text-xs">{(pageNumber - 1) * pageSize + index + 1}</TableCell>
                    <TableCell className="text-xs font-medium">
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {ret.returnDate ? new Date(ret.returnDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{ret.returnNo}</div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{ret.supplierName || 'Unknown Supplier'}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                        <Warehouse className="h-3.5 w-3.5 opacity-60" />
                        {ret.warehouseName || 'Unknown Warehouse'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-semibold font-mono">
                      {ret.invoiceNo ? (
                        <div className="text-indigo-650 dark:text-indigo-400">{ret.invoiceNo}</div>
                      ) : (
                        <span className="text-zinc-400 italic font-normal text-xs">Ad-hoc Return</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-red-600 dark:text-red-400">
                      ₹{ret.netAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/20 dark:hover:text-violet-400"
                          onClick={() => handleView(ret.id)}
                          title="View Return Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                            onClick={() => handleDelete(ret.id)}
                            title="Delete & Revert Stock"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* ── Return Detail View Modal (custom overlay) ── */}
      {(isLoadingView || viewingReturn !== null) && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setViewingReturn(null); setIsLoadingView(false); } }}
        >
          <div
            className="relative bg-popover text-popover-foreground rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: 'min(92vw, 1050px)', height: 'min(88vh, 800px)' }}
          >

            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-border bg-muted/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-red-100 dark:bg-red-950/30 rounded-xl text-red-650">
                  <ArrowLeftRight className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {viewingReturn ? `Purchase Return: ${viewingReturn.returnNo}` : 'Loading...'}
                  </h2>
                  {viewingReturn && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {new Date(viewingReturn.returnDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setViewingReturn(null); setIsLoadingView(false); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingView && !viewingReturn ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-red-500" />
                  <span className="text-sm text-muted-foreground">Loading purchase return details...</span>
                </div>
              ) : viewingReturn ? (
                <div className="p-7 space-y-7">

                  {/* Meta Info Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/60">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        <User className="h-3.5 w-3.5" /> Supplier
                      </div>
                      <div className="text-base font-bold text-foreground leading-tight">{viewingReturn.supplierName || '—'}</div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 border border-border/60">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        <Warehouse className="h-3.5 w-3.5" /> Warehouse
                      </div>
                      <div className="text-base font-bold text-foreground leading-tight">{viewingReturn.warehouseName || '—'}</div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 border border-border/60">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        <Hash className="h-3.5 w-3.5" /> Return No.
                      </div>
                      <div className="text-base font-bold font-mono text-foreground leading-tight">{viewingReturn.returnNo}</div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 border border-border/60">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        <FileText className="h-3.5 w-3.5" /> Linked Invoice
                      </div>
                      <div className="text-base font-bold font-mono text-foreground leading-tight">{viewingReturn.invoiceNo || 'Ad-hoc'}</div>
                    </div>

                    {viewingReturn.remarks && (
                      <div className="bg-muted/30 rounded-xl p-4 border border-border/60 col-span-2 lg:col-span-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                          <StickyNote className="h-3.5 w-3.5" /> Remarks / Reason
                        </div>
                        <div className="text-sm text-foreground">{viewingReturn.remarks}</div>
                      </div>
                    )}
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <Package className="h-4.5 w-4.5 text-muted-foreground" />
                      <h3 className="text-base font-bold text-foreground">
                        Returned Line Items
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/30 text-red-755 dark:text-red-400 text-xs font-semibold">
                        {viewingReturn.items?.length || 0} items
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
                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-20">Returned Qty</th>
                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-28">Rate</th>
                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-20">Tax%</th>
                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-28">Total Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {viewingReturn.items?.map((item, idx) => (
                              <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{idx + 1}</td>
                                <td className="px-4 py-3.5">
                                  <div className="font-semibold text-foreground">{item.productName}</div>
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
                                <td className="px-4 py-3.5 text-right font-mono font-bold text-red-650 dark:text-red-400">{item.quantity}</td>
                                <td className="px-4 py-3.5 text-right font-mono text-foreground">₹{Number(item.purchaseRate).toFixed(2)}</td>
                                <td className="px-4 py-3.5 text-right font-mono text-blue-600 dark:text-blue-400">{Number(item.taxPercent || 0).toFixed(1)}%</td>
                                <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">₹{Number(item.totalAmount || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-80 bg-muted/30 border border-border rounded-xl overflow-hidden">
                      <div className="px-5 py-3 bg-muted/40 border-b border-border">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Summary</span>
                      </div>
                      <div className="px-5 py-4 space-y-3 font-mono text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-semibold text-foreground">₹{Number(viewingReturn.totalAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Returned GST</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">+ ₹{Number(viewingReturn.taxAmount).toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-border" />
                        <div className="flex justify-between text-base font-bold pt-1">
                          <span className="text-foreground">Net Returned</span>
                          <span className="text-red-650 dark:text-red-400">₹{Number(viewingReturn.netAmount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : null}
            </div>

          </div>
        </div>,
        document.body
      )}
    </Page>
  );
}
