import { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Search, 
  Calendar, 
  Warehouse as WarehouseIcon, 
  User as UserIcon,
  Printer, 
  FileSpreadsheet, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Coins
} from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axiosClient from '@/Services/axiosClient';
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// DTO Interfaces
interface CustomerSummary {
  customerId: string;
  customerName: string;
  totalAmount: number;
  totalTax: number;
  dueAmount: number;
}

interface MonthlySummary {
  monthName: string;
  year: number;
  month: number;
  totalAmount: number;
  invoiceCount: number;
}

interface SalesSummaryReport {
  totalSales: number;
  totalAmount: number;
  totalGST: number;
  pendingPayments: number;
  customerWiseTotals: CustomerSummary[];
  monthlySummaries: MonthlySummary[];
}

interface CustomerRate {
  customerId: string;
  customerName: string;
  salesRate: number;
  salesDate: string;
}

interface ProductWiseReport {
  productId: string;
  productName: string;
  productCode: string;
  sku?: string;
  quantitySold: number;
  averageSalesPrice: number;
  latestSalesRate: number;
  customerRates: CustomerRate[];
  unitName?: string;
}

interface CustomerWiseReport {
  customerId: string;
  customerName: string;
  customerCode: string;
  totalInvoices: number;
  totalAmount: number;
  dueAmount: number;
  lastSalesDate?: string;
}

interface InvoiceWiseReport {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  warehouseName: string;
  itemCount: number;
  invoiceAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  expanded?: boolean;
}

interface SalesReturnItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  rate: number;
  taxAmount: number;
  totalAmount: number;
  unitName?: string;
}

interface SalesReturnReport {
  id: string;
  returnNo: string;
  returnDate: string;
  customerName: string;
  invoiceNo?: string;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  remarks?: string;
  items: SalesReturnItem[];
  expanded?: boolean;
}

interface TaxProfileSummary {
  taxProfileName: string;
  taxPercent: number;
  taxableAmount: number;
  taxAmount: number;
}

interface TaxReport {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  taxProfileSummaries: TaxProfileSummary[];
}

interface LookupItem {
  id: string;
  name: string;
}

type ReportType = 
  | 'summary' 
  | 'product-wise' 
  | 'customer-wise' 
  | 'invoice-wise' 
  | 'returns' 
  | 'tax';

export default function SalesReports() {
  const user = useAppSelector((state) => state.auth.user);

  // Filter States
  const [customerId, setCustomerId] = useState<string>('all');
  const [warehouseId, setWarehouseId] = useState<string>(user?.warehouseId || 'all');

  useEffect(() => {
    if (user?.warehouseId) {
      setWarehouseId(user.warehouseId);
    }
  }, [user?.warehouseId]);

  // Lookup Lists
  const [customers, setCustomers] = useState<LookupItem[]>([]);
  const [warehouses, setWarehouses] = useState<LookupItem[]>([]);

  const filteredWarehouses = useMemo(() => {
    if (user?.warehouseId) {
      return warehouses.filter(w => w.id === user.warehouseId);
    }
    return warehouses;
  }, [warehouses, user?.warehouseId]);

  const [datePreset, setDatePreset] = useState<string>('this-month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Main navigation tab
  const [activeMainTab, setActiveMainTab] = useState<string>('analytics');
  // Selected detailed report type
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('summary');

  // Loading & Data States
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [summaryReport, setSummaryReport] = useState<SalesSummaryReport | null>(null);
  const [productWiseReport, setProductWiseReport] = useState<ProductWiseReport[]>([]);
  const [customerWiseReport, setCustomerWiseReport] = useState<CustomerWiseReport[]>([]);
  const [invoiceWiseReport, setInvoiceWiseReport] = useState<InvoiceWiseReport[]>([]);
  const [returnsReport, setReturnsReport] = useState<SalesReturnReport[]>([]);
  const [taxReport, setTaxReport] = useState<TaxReport | null>(null);

  // Search & Expandable details inside grid
  const [searchText, setSearchText] = useState<string>('');
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<string, boolean>>({});
  const [expandedReturnIds, setExpandedReturnIds] = useState<Record<string, boolean>>({});
  const [invoiceItemsMap, setInvoiceItemsMap] = useState<Record<string, any[]>>({});
  const [invoiceItemsLoading, setInvoiceItemsLoading] = useState<Record<string, boolean>>({});

  // Column Visibility States
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    // Summary
    summaryCustomer: true, summaryAmount: true, summaryTax: true, summaryDue: true,
    // Product
    prodName: true, prodCode: true, prodQty: true, prodAvg: true, prodLatest: true,
    // Customer
    custName: true, custCode: true, custInvoices: true, custAmount: true, custDue: true, custLastDate: true,
    // Invoice
    invNo: true, invDate: true, invCustomer: true, invWarehouse: true, invItems: true, invAmount: true, invPaid: true, invDue: true, invStatus: true,
  });

  // Calculate Dates based on preset
  useEffect(() => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    if (datePreset === 'today') {
      setStartDate(formatDate(today));
      setEndDate(formatDate(today));
    } else if (datePreset === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      setStartDate(formatDate(yesterday));
      setEndDate(formatDate(yesterday));
    } else if (datePreset === 'this-week') {
      const startOfWeek = new Date(today);
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      startOfWeek.setDate(diff);
      setStartDate(formatDate(startOfWeek));
      setEndDate(formatDate(today));
    } else if (datePreset === 'this-month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(startOfMonth));
      setEndDate(formatDate(today));
    } else if (datePreset === 'this-year') {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      setStartDate(formatDate(startOfYear));
      setEndDate(formatDate(today));
    }
  }, [datePreset]);

  // Load Filter Lookups
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [resCustomers, resWarehouses] = await Promise.all([
          axiosClient.get('/Customer', { params: { pageNumber: 1, pageSize: 10000 } }),
          axiosClient.get('/Warehouse', { params: { pageNumber: 1, pageSize: 10000 } })
        ]) as [any, any];
        if (resCustomers?.success) setCustomers(resCustomers.data?.items || resCustomers.data || []);
        if (resWarehouses?.success) setWarehouses(resWarehouses.data?.items || resWarehouses.data || []);
      } catch (err) {
        console.error('Failed to load filters lookup data', err);
      }
    };
    fetchLookups();
  }, []);

  // Fetch Report Data
  const fetchReportData = async () => {
    setIsDataLoading(true);
    const queryParams = new URLSearchParams();
    
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (customerId && customerId !== 'all') queryParams.append('customerId', customerId);
    if (warehouseId && warehouseId !== 'all') queryParams.append('warehouseId', warehouseId);

    const queryStr = `?${queryParams.toString()}`;

    try {
      if (activeMainTab === 'analytics') {
        const res: any = await axiosClient.get(`/SalesReport/Summary${queryStr}`);
        if (res?.success) setSummaryReport(res.data);
      } else {
        // Detailed Report fetch
        switch (selectedReportType) {
          case 'summary':
            const resSum: any = await axiosClient.get(`/SalesReport/Summary${queryStr}`);
            if (resSum?.success) setSummaryReport(resSum.data);
            break;
          case 'product-wise':
            const resProd: any = await axiosClient.get(`/SalesReport/ProductWise${queryStr}`);
            if (resProd?.success) setProductWiseReport(resProd.data || []);
            break;
          case 'customer-wise':
            const resCust: any = await axiosClient.get(`/SalesReport/CustomerWise?startDate=${startDate}&endDate=${endDate}${customerId !== 'all' ? `&customerId=${customerId}` : ''}`);
            if (resCust?.success) setCustomerWiseReport(resCust.data || []);
            break;
          case 'invoice-wise':
            const resInv: any = await axiosClient.get(`/SalesReport/InvoiceWise${queryStr}`);
            if (resInv?.success) setInvoiceWiseReport(resInv.data || []);
            break;
          case 'returns':
            const resRet: any = await axiosClient.get(`/SalesReport/Returns?startDate=${startDate}&endDate=${endDate}${customerId !== 'all' ? `&customerId=${customerId}` : ''}`);
            if (resRet?.success) setReturnsReport(resRet.data || []);
            break;
          case 'tax':
            const resTax: any = await axiosClient.get(`/SalesReport/Tax${queryStr}`);
            if (resTax?.success) setTaxReport(resTax.data);
            break;
        }
      }
    } catch (err) {
      console.error('Error loading sales report data', err);
      toast.error('Error occurred while fetching report data.');
    } finally {
      setIsDataLoading(false);
    }
  };

  // Re-trigger fetch on filters change
  useEffect(() => {
    fetchReportData();
  }, [activeMainTab, selectedReportType, startDate, endDate, customerId, warehouseId]);

  // Expandable invoice toggler
  const toggleInvoiceExpand = async (id: string) => {
    const isExpanding = !expandedInvoiceIds[id];
    setExpandedInvoiceIds(prev => ({ ...prev, [id]: isExpanding }));
    
    if (isExpanding && !invoiceItemsMap[id]) {
      setInvoiceItemsLoading(prev => ({ ...prev, [id]: true }));
      try {
        const response: any = await axiosClient.get(`/SalesInvoice/${id}`);
        if (response?.success && response.data?.items) {
          setInvoiceItemsMap(prev => ({ ...prev, [id]: response.data.items }));
        }
      } catch (err) {
        console.error('Failed to load invoice items details', err);
        toast.error('Failed to load invoice items details.');
      } finally {
        setInvoiceItemsLoading(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  // Expandable return toggler
  const toggleReturnExpand = (id: string) => {
    setExpandedReturnIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Export to Excel
  const exportToExcel = () => {
    let dataToExport: any[] = [];
    let filename = 'Sales_Report';

    if (selectedReportType === 'summary' && summaryReport) {
      dataToExport = summaryReport.customerWiseTotals.map(c => ({
        'Customer Name': c.customerName,
        'Total Sold Amount': c.totalAmount,
        'Total GST Collected': c.totalTax,
        'Outstanding Due': c.dueAmount
      }));
      filename = 'Sales_Summary_Report';
    } else if (selectedReportType === 'product-wise') {
      dataToExport = productWiseReport.map(p => ({
        'Product Code': p.productCode,
        'Product Name': p.productName,
        'SKU': p.sku || '',
        'Qty Sold': p.quantitySold,
        'Average Price': p.averageSalesPrice,
        'Latest Rate': p.latestSalesRate
      }));
      filename = 'Product_Wise_Sales_Report';
    } else if (selectedReportType === 'customer-wise') {
      dataToExport = customerWiseReport.map(c => ({
        'Customer Code': c.customerCode,
        'Customer Name': c.customerName,
        'Total Invoices': c.totalInvoices,
        'Total Amount': c.totalAmount,
        'Dues': c.dueAmount,
        'Last Sales Date': c.lastSalesDate ? new Date(c.lastSalesDate).toLocaleDateString() : ''
      }));
      filename = 'Customer_Wise_Sales_Report';
    } else if (selectedReportType === 'invoice-wise') {
      dataToExport = invoiceWiseReport.map(i => ({
        'Invoice No': i.invoiceNo,
        'Invoice Date': new Date(i.invoiceDate).toLocaleDateString(),
        'Customer Name': i.customerName,
        'Warehouse': i.warehouseName,
        'Items Count': i.itemCount,
        'Invoice Net Amount': i.invoiceAmount,
        'Paid Amount': i.paidAmount,
        'Due Amount': i.dueAmount,
        'Payment Status': i.paymentStatus
      }));
      filename = 'Invoice_Wise_Sales_Report';
    } else if (selectedReportType === 'returns') {
      dataToExport = returnsReport.map(r => ({
        'Return No': r.returnNo,
        'Return Date': new Date(r.returnDate).toLocaleDateString(),
        'Customer': r.customerName,
        'Ref Invoice': r.invoiceNo || '',
        'Sub Total': r.totalAmount,
        'GST Amount': r.taxAmount,
        'Net Amount': r.netAmount,
        'Remarks': r.remarks || ''
      }));
      filename = 'Sales_Returns_Report';
    } else if (selectedReportType === 'tax' && taxReport) {
      dataToExport = taxReport.taxProfileSummaries.map(t => ({
        'Tax Profile': t.taxProfileName,
        'GST Percent': `${t.taxPercent}%`,
        'Taxable Amount': t.taxableAmount,
        'CGST/SGST/IGST Collected': t.taxAmount
      }));
      filename = 'GST_Tax_Sales_Report';
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ReportData');
    XLSX.writeFile(workbook, `${filename}_${startDate}_to_${endDate}.xlsx`);
    toast.success('Excel file exported successfully.');
  };

  // Export to CSV
  const exportToCsv = () => {
    let dataToExport: any[] = [];
    let filename = 'Sales_Report';

    if (selectedReportType === 'summary' && summaryReport) {
      dataToExport = summaryReport.customerWiseTotals;
      filename = 'Sales_Summary';
    } else if (selectedReportType === 'product-wise') {
      dataToExport = productWiseReport;
      filename = 'Product_Wise_Sales';
    } else if (selectedReportType === 'customer-wise') {
      dataToExport = customerWiseReport;
      filename = 'Customer_Wise_Sales';
    } else if (selectedReportType === 'invoice-wise') {
      dataToExport = invoiceWiseReport;
      filename = 'Invoice_Wise_Sales';
    } else if (selectedReportType === 'returns') {
      dataToExport = returnsReport;
      filename = 'Sales_Returns';
    } else if (selectedReportType === 'tax' && taxReport) {
      dataToExport = taxReport.taxProfileSummaries;
      filename = 'Sales_Tax_GST';
    }

    if (!dataToExport.length) {
      toast.warning('No data available to export.');
      return;
    }

    const headers = Object.keys(dataToExport[0]).filter(k => typeof dataToExport[0][k] !== 'object');
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of dataToExport) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ('' + (val ?? '')).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV downloaded successfully.');
  };

  // Print Report Page
  const triggerPrint = () => {
    window.print();
  };

  // Recharts Helper Data
  const chartMonthlyData = useMemo(() => {
    if (!summaryReport) return [];
    return [...summaryReport.monthlySummaries].reverse().map(m => ({
      Month: m.monthName,
      Amount: m.totalAmount,
      Invoices: m.invoiceCount
    }));
  }, [summaryReport]);

  const chartCustomerData = useMemo(() => {
    if (!summaryReport) return [];
    return summaryReport.customerWiseTotals.slice(0, 5).map(c => ({
      Customer: c.customerName,
      Total: c.totalAmount
    }));
  }, [summaryReport]);

  const chartProductData = useMemo(() => {
    return productWiseReport.slice(0, 5).map(p => ({
      Product: p.productName.length > 15 ? `${p.productName.substring(0, 15)}...` : p.productName,
      Quantity: p.quantitySold
    }));
  }, [productWiseReport]);

  const chartPaymentStatusData = useMemo(() => {
    if (!summaryReport) return [];
    const totalAmount = summaryReport.totalAmount;
    const outstanding = summaryReport.pendingPayments;
    const paid = totalAmount - outstanding;
    return [
      { name: 'Paid Payments', value: paid },
      { name: 'Pending Payments', value: outstanding }
    ];
  }, [summaryReport]);

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

  // Client-Side Searching Filters
  const filteredProducts = useMemo(() => {
    return productWiseReport.filter(p => 
      p.productName.toLowerCase().includes(searchText.toLowerCase()) || 
      p.productCode.toLowerCase().includes(searchText.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchText.toLowerCase()))
    );
  }, [productWiseReport, searchText]);

  const filteredInvoices = useMemo(() => {
    return invoiceWiseReport.filter(i => 
      i.invoiceNo.toLowerCase().includes(searchText.toLowerCase()) || 
      i.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
      i.warehouseName.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [invoiceWiseReport, searchText]);

  const filteredReturns = useMemo(() => {
    return returnsReport.filter(r => 
      r.returnNo.toLowerCase().includes(searchText.toLowerCase()) || 
      r.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
      (r.invoiceNo && r.invoiceNo.toLowerCase().includes(searchText.toLowerCase()))
    );
  }, [returnsReport, searchText]);

  return (
    <Page title="Sales Reports" className="print:bg-white print:p-0">
      
      {/* 1. TOP UTILITY FILTERS PANEL (Hidden during printing) */}
      <div className="print:hidden mb-6 flex flex-col gap-4 bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 dark:bg-zinc-900/50 dark:border-white/5 transition-colors duration-300">
        
        {/* Preset Presets row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-200/50 p-1 rounded-lg dark:bg-zinc-800/40">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this-week', label: 'This Week' },
              { id: 'this-month', label: 'This Month' },
              { id: 'this-year', label: 'This Year' },
              { id: 'custom', label: 'Custom' }
            ].map(p => (
              <Button 
                key={p.id}
                variant={datePreset === p.id ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs h-7 rounded-md cursor-pointer ${datePreset === p.id ? 'shadow-sm font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                onClick={() => setDatePreset(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Export tools */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs flex items-center gap-1.5 cursor-pointer" onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export Excel
            </Button>
            <Button size="sm" variant="outline" className="text-xs flex items-center gap-1.5 cursor-pointer" onClick={exportToCsv}>
              <FileText className="h-4 w-4 text-blue-600" /> Export CSV
            </Button>
            <Button size="sm" variant="outline" className="text-xs flex items-center gap-1.5 cursor-pointer" onClick={triggerPrint}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        {/* Filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {/* Customer selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><UserIcon className="h-3 w-3" /> Customer</label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="w-full h-9 border-zinc-200/80 dark:border-white/5">
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warehouse selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><WarehouseIcon className="h-3 w-3" /> Warehouse</label>
            <Select value={warehouseId} onValueChange={setWarehouseId} disabled={!!user?.warehouseId}>
              <SelectTrigger className="w-full h-9 border-zinc-200/80 dark:border-white/5">
                <SelectValue placeholder={user?.warehouseId ? (user.warehouseName || "Warehouse") : "Select Warehouse"} />
              </SelectTrigger>
              <SelectContent>
                {!user?.warehouseId && <SelectItem value="all">All Warehouses</SelectItem>}
                {filteredWarehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Start Date</label>
            <Input 
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="h-9 border-zinc-200/80 dark:border-white/5"
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> End Date</label>
            <Input 
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="h-9 border-zinc-200/80 dark:border-white/5"
            />
          </div>
        </div>

      </div>

      {/* 2. PRINT HEADER (Visible only during printing) */}
      <div className="hidden print:block border-b-2 border-zinc-800 pb-4 mb-6">
        <h1 className="text-3xl font-extrabold text-zinc-900">Sales Report</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Period: {startDate ? new Date(startDate).toLocaleDateString() : 'Beginning'} to {endDate ? new Date(endDate).toLocaleDateString() : 'Today'}
        </p>
        <p className="text-xs text-zinc-500">
          Filters: Customer: {customerId !== 'all' ? customers.find(c => c.id === customerId)?.name : 'All'}, Warehouse: {warehouseId !== 'all' ? warehouses.find(w => w.id === warehouseId)?.name : 'All'}
        </p>
      </div>

      {/* 3. TABS WRAPPER */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsList className="print:hidden mb-6 bg-zinc-200/50 p-1 dark:bg-zinc-800/40 w-full max-w-sm flex">
          <TabsTrigger value="analytics" className="flex-1 font-medium cursor-pointer">Analytics Dashboard</TabsTrigger>
          <TabsTrigger value="detailed" className="flex-1 font-medium cursor-pointer">Detailed Reports</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------
            TAB: ANALYTICS DASHBOARD
            --------------------------------------------- */}
        <TabsContent value="analytics" className="space-y-6">
          {isDataLoading && !summaryReport ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-zinc-500">Loading sales analytics data...</p>
            </div>
          ) : (
            <>
              {/* KPI Cards row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: 'Total Sales Count', value: summaryReport?.totalSales || 0, icon: BarChart3, desc: 'Count of active invoices', color: 'border-l-4 border-l-blue-500' },
                  { title: 'Total Sales Amount', value: `₹${(summaryReport?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, desc: 'Net invoice sales', color: 'border-l-4 border-l-emerald-500' },
                  { title: 'Total GST Collected', value: `₹${(summaryReport?.totalGST || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Coins, desc: 'Accumulated tax values', color: 'border-l-4 border-l-amber-500' },
                  { title: 'Pending Dues', value: `₹${(summaryReport?.pendingPayments || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Clock, desc: 'Uncollected accounts receivable', color: 'border-l-4 border-l-rose-500' }
                ].map((kpi, idx) => {
                  const Icon = kpi.icon;
                  return (
                    <Card key={idx} className={`shadow-sm bg-white dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-white/5 transition-all duration-300 ${kpi.color}`}>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{kpi.title}</CardTitle>
                        <Icon className="h-5 w-5 text-zinc-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-white">{kpi.value}</div>
                        <p className="text-[10px] text-zinc-400 mt-1">{kpi.desc}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Analytics graphs row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Monthly sales trend */}
                <Card className="shadow-sm bg-white dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-white/5">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-800 dark:text-white"><TrendingUp className="h-4 w-4" /> Monthly Sales Trend</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {chartMonthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartMonthlyData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="Month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                          <ChartTooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="Amount" name="Sales (₹)" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="Invoices" name="Invoices" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-zinc-400">No monthly sales data found</div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Top Customers */}
                <Card className="shadow-sm bg-white dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-white/5">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-800 dark:text-white"><UserIcon className="h-4 w-4" /> Top 5 Customers contribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {chartCustomerData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartCustomerData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis type="number" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="Customer" stroke="#888888" fontSize={11} width={100} tickLine={false} axisLine={false} />
                          <ChartTooltip />
                          <Bar dataKey="Total" name="Sales (₹)" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16}>
                            {chartCustomerData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-zinc-400">No customer sales data found</div>
                    )}
                  </CardContent>
                </Card>

                {/* 3. Top selling products */}
                <Card className="shadow-sm bg-white dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-white/5">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-800 dark:text-white"><BarChart3 className="h-4 w-4" /> Top Selling Products (Qty)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {chartProductData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartProductData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="Product" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                          <ChartTooltip />
                          <Bar dataKey="Quantity" name="Units Sold" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-zinc-400">No products sales data found</div>
                    )}
                  </CardContent>
                </Card>

                {/* 4. Accounts Receivable Split */}
                <Card className="shadow-sm bg-white dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-white/5">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-800 dark:text-white"><Coins className="h-4 w-4" /> Collection Status Split</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[280px] flex items-center justify-center">
                    {summaryReport && summaryReport.totalAmount > 0 ? (
                      <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around">
                        <div className="w-[180px] h-[180px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartPaymentStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {chartPaymentStatusData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <ChartTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-3 mt-4 sm:mt-0">
                          {chartPaymentStatusData.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                              <div className="text-xs">
                                <span className="text-zinc-500 font-medium">{item.name}:</span>{' '}
                                <span className="font-extrabold text-zinc-800 dark:text-zinc-100">
                                  ₹{item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>{' '}
                                <span className="text-[10px] text-zinc-400">
                                  ({((item.value / summaryReport.totalAmount) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-400">No collection details available</div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </>
          )}
        </TabsContent>

        {/* ---------------------------------------------
            TAB: DETAILED REPORTS
            --------------------------------------------- */}
        <TabsContent value="detailed" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Sidebar list of reports */}
            <div className="print:hidden md:col-span-1 flex flex-col bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-white/5 p-2 rounded-xl h-fit">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 py-2">Select Report</span>
              {[
                { id: 'summary', label: 'Overall Summary' },
                { id: 'product-wise', label: 'Product-wise Sales' },
                { id: 'customer-wise', label: 'Customer-wise Sales' },
                { id: 'invoice-wise', label: 'Invoice-wise Sales' },
                { id: 'returns', label: 'Sales Returns' },
                { id: 'tax', label: 'GST Tax Report' }
              ].map(rep => (
                <Button
                  key={rep.id}
                  variant={selectedReportType === rep.id ? 'default' : 'ghost'}
                  className={`w-full justify-start text-xs font-semibold h-9 rounded-lg ${selectedReportType === rep.id ? 'shadow-sm' : 'text-zinc-600 dark:text-zinc-400'}`}
                  onClick={() => setSelectedReportType(rep.id as ReportType)}
                >
                  {rep.label}
                </Button>
              ))}
            </div>

            {/* Main grid / content panel */}
            <div className="col-span-1 md:col-span-3 space-y-4">
              
              {/* Toolbar utility within detailed reports */}
              <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/20 p-2.5 rounded-xl border border-zinc-200/80 dark:border-white/5">
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <Input
                    placeholder="Search records..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-8 h-8 w-full border-zinc-200/80 dark:border-white/5 text-xs rounded-lg bg-white dark:bg-zinc-950/40"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1.5 cursor-pointer">
                        <SlidersHorizontal className="h-3.5 w-3.5" /> Toggle Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-2.5 py-1.5 block">Select Columns</span>
                      
                      {selectedReportType === 'summary' && (
                        <>
                          <DropdownMenuCheckboxItem checked={visibleColumns.summaryCustomer} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, summaryCustomer: c }))}>Customer Name</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.summaryAmount} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, summaryAmount: c }))}>Sold Amt</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.summaryTax} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, summaryTax: c }))}>GST Collected</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.summaryDue} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, summaryDue: c }))}>Outstanding Dues</DropdownMenuCheckboxItem>
                        </>
                      )}

                      {selectedReportType === 'product-wise' && (
                        <>
                          <DropdownMenuCheckboxItem checked={visibleColumns.prodCode} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, prodCode: c }))}>Code</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.prodName} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, prodName: c }))}>Name</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.prodQty} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, prodQty: c }))}>Qty Sold</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.prodAvg} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, prodAvg: c }))}>Avg Price</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.prodLatest} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, prodLatest: c }))}>Latest Rate</DropdownMenuCheckboxItem>
                        </>
                      )}

                      {selectedReportType === 'customer-wise' && (
                        <>
                          <DropdownMenuCheckboxItem checked={visibleColumns.custCode} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, custCode: c }))}>Code</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.custName} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, custName: c }))}>Customer Name</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.custInvoices} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, custInvoices: c }))}>Total Invoices</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.custAmount} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, custAmount: c }))}>Net Sales</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.custDue} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, custDue: c }))}>Outstanding</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.custLastDate} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, custLastDate: c }))}>Last Sales Date</DropdownMenuCheckboxItem>
                        </>
                      )}

                      {selectedReportType === 'invoice-wise' && (
                        <>
                          <DropdownMenuCheckboxItem checked={visibleColumns.invNo} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, invNo: c }))}>Invoice No</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.invDate} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, invDate: c }))}>Invoice Date</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.invCustomer} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, invCustomer: c }))}>Customer Name</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.invWarehouse} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, invWarehouse: c }))}>Warehouse</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.invItems} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, invItems: c }))}>Items Count</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.invAmount} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, invAmount: c }))}>Total Net</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.invPaid} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, invPaid: c }))}>Total Paid</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.invDue} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, invDue: c }))}>Dues</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={visibleColumns.invStatus} onCheckedChange={(c) => setVisibleColumns(prev => ({ ...prev, invStatus: c }))}>Status</DropdownMenuCheckboxItem>
                        </>
                      )}

                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Loader */}
              {isDataLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-zinc-950/40 rounded-xl border border-zinc-200/80 dark:border-white/5">
                  <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-zinc-500">Fetching detailed sales report data...</p>
                </div>
              )}

              {/* Detailed Tables */}
              {!isDataLoading && (
                <div className="bg-white dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-white/5 rounded-xl shadow-sm overflow-hidden">
                  
                  {/* SUMMARY REPORT */}
                  {selectedReportType === 'summary' && summaryReport && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {visibleColumns.summaryCustomer && <TableHead>Customer Name</TableHead>}
                            {visibleColumns.summaryAmount && <TableHead className="text-right">Sold Amount</TableHead>}
                            {visibleColumns.summaryTax && <TableHead className="text-right">GST Collected</TableHead>}
                            {visibleColumns.summaryDue && <TableHead className="text-right">Outstanding Dues</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summaryReport.customerWiseTotals.length > 0 ? (
                            summaryReport.customerWiseTotals
                              .filter(s => s.customerName.toLowerCase().includes(searchText.toLowerCase()))
                              .map((item, idx) => (
                                <TableRow key={idx}>
                                  {visibleColumns.summaryCustomer && <TableCell className="font-semibold">{item.customerName}</TableCell>}
                                  {visibleColumns.summaryAmount && <TableCell className="text-right font-medium">₹{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>}
                                  {visibleColumns.summaryTax && <TableCell className="text-right text-zinc-500">₹{item.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>}
                                  {visibleColumns.summaryDue && (
                                    <TableCell className={`text-right font-semibold ${item.dueAmount > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>
                                      ₹{item.dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))
                          ) : (
                            <TableRow><TableCell colSpan={4} className="text-center py-10 text-zinc-500">No records found</TableCell></TableRow>
                          )}
                        </TableBody>
                        {summaryReport.customerWiseTotals.length > 0 && (
                          <TableFooter>
                            <TableRow>
                              {visibleColumns.summaryCustomer && <TableCell className="font-bold">Total</TableCell>}
                              {visibleColumns.summaryAmount && <TableCell className="text-right font-extrabold text-zinc-900 dark:text-zinc-50">₹{summaryReport.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>}
                              {visibleColumns.summaryTax && <TableCell className="text-right font-extrabold text-zinc-500">₹{summaryReport.totalGST.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>}
                              {visibleColumns.summaryDue && <TableCell className="text-right font-extrabold text-rose-500">₹{summaryReport.pendingPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>}
                            </TableRow>
                          </TableFooter>
                        )}
                      </Table>
                    </div>
                  )}

                  {/* PRODUCT-WISE SALES REPORT */}
                  {selectedReportType === 'product-wise' && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            {visibleColumns.prodCode && <TableHead>Product Code</TableHead>}
                            {visibleColumns.prodName && <TableHead>Product Name</TableHead>}
                            {visibleColumns.prodQty && <TableHead className="text-right">Qty Sold</TableHead>}
                            {visibleColumns.prodAvg && <TableHead className="text-right">Avg Price</TableHead>}
                            {visibleColumns.prodLatest && <TableHead className="text-right">Latest Sales Rate</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((item) => {
                              const isExpanded = !!expandedInvoiceIds[item.productId];
                              return (
                                <>
                                  <TableRow key={item.productId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/10">
                                    <TableCell>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={() => setExpandedInvoiceIds(prev => ({ ...prev, [item.productId]: !isExpanded }))}>
                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                      </Button>
                                    </TableCell>
                                    {visibleColumns.prodCode && <TableCell className="font-mono text-xs">{item.productCode}</TableCell>}
                                    {visibleColumns.prodName && (
                                      <TableCell>
                                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">{item.productName}</div>
                                        {item.sku && <span className="text-[10px] text-zinc-400 font-mono">SKU: {item.sku}</span>}
                                      </TableCell>
                                    )}
                                    {visibleColumns.prodQty && <TableCell className="text-right font-medium">{item.quantitySold.toLocaleString()} {item.unitName || 'Units'}</TableCell>}
                                    {visibleColumns.prodAvg && <TableCell className="text-right">₹{item.averageSalesPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                                    {visibleColumns.prodLatest && <TableCell className="text-right font-semibold">₹{item.latestSalesRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                                  </TableRow>
                                  {isExpanded && (
                                    <TableRow className="bg-zinc-100/30 dark:bg-zinc-900/20">
                                      <TableCell colSpan={6} className="py-3 px-8">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Customer Purchase History</span>
                                        {item.customerRates.length > 0 ? (
                                          <div className="border border-zinc-250/80 dark:border-white/5 rounded-lg overflow-hidden max-w-xl bg-white dark:bg-zinc-950">
                                            <Table>
                                              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/20">
                                                <TableRow>
                                                  <TableHead className="py-1.5 text-xs">Customer Name</TableHead>
                                                  <TableHead className="py-1.5 text-xs text-right">Sales Price</TableHead>
                                                  <TableHead className="py-1.5 text-xs text-right">Date</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {item.customerRates.map((h, hIdx) => (
                                                  <TableRow key={hIdx}>
                                                    <TableCell className="py-1.5 text-xs font-semibold">{h.customerName}</TableCell>
                                                    <TableCell className="py-1.5 text-xs text-right font-medium">₹{h.salesRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className="py-1.5 text-xs text-right text-zinc-400">{new Date(h.salesDate).toLocaleDateString()}</TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-zinc-400">No transaction logs available for this product</p>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </>
                              );
                            })
                          ) : (
                            <TableRow><TableCell colSpan={6} className="text-center py-10 text-zinc-500">No records found</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* CUSTOMER-WISE REPORT */}
                  {selectedReportType === 'customer-wise' && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {visibleColumns.custCode && <TableHead>Customer Code</TableHead>}
                            {visibleColumns.custName && <TableHead>Customer Name</TableHead>}
                            {visibleColumns.custInvoices && <TableHead className="text-center">Total Invoices</TableHead>}
                            {visibleColumns.custAmount && <TableHead className="text-right">Net Sales</TableHead>}
                            {visibleColumns.custDue && <TableHead className="text-right">Outstanding Dues</TableHead>}
                            {visibleColumns.custLastDate && <TableHead className="text-right">Last Sales Date</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerWiseReport.length > 0 ? (
                            customerWiseReport
                              .filter(c => c.customerName.toLowerCase().includes(searchText.toLowerCase()) || c.customerCode.toLowerCase().includes(searchText.toLowerCase()))
                              .map((item) => (
                                <TableRow key={item.customerId}>
                                  {visibleColumns.custCode && <TableCell className="font-mono text-xs">{item.customerCode}</TableCell>}
                                  {visibleColumns.custName && <TableCell className="font-semibold">{item.customerName}</TableCell>}
                                  {visibleColumns.custInvoices && <TableCell className="text-center font-medium">{item.totalInvoices}</TableCell>}
                                  {visibleColumns.custAmount && <TableCell className="text-right font-medium">₹{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>}
                                  {visibleColumns.custDue && (
                                    <TableCell className={`text-right font-semibold ${item.dueAmount > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>
                                      ₹{item.dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                  )}
                                  {visibleColumns.custLastDate && (
                                    <TableCell className="text-right text-zinc-400 text-xs">
                                      {item.lastSalesDate ? new Date(item.lastSalesDate).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))
                          ) : (
                            <TableRow><TableCell colSpan={6} className="text-center py-10 text-zinc-500">No records found</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* INVOICE-WISE SALES REPORT */}
                  {selectedReportType === 'invoice-wise' && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            {visibleColumns.invNo && <TableHead>Invoice No</TableHead>}
                            {visibleColumns.invDate && <TableHead>Invoice Date</TableHead>}
                            {visibleColumns.invCustomer && <TableHead>Customer Name</TableHead>}
                            {visibleColumns.invWarehouse && <TableHead>Warehouse</TableHead>}
                            {visibleColumns.invItems && <TableHead className="text-center">Items</TableHead>}
                            {visibleColumns.invAmount && <TableHead className="text-right">Total Net</TableHead>}
                            {visibleColumns.invPaid && <TableHead className="text-right">Paid Amount</TableHead>}
                            {visibleColumns.invDue && <TableHead className="text-right">Dues</TableHead>}
                            {visibleColumns.invStatus && <TableHead className="text-center">Status</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredInvoices.length > 0 ? (
                            filteredInvoices.map((item) => {
                              const isExpanded = !!expandedInvoiceIds[item.id];
                              const itemsList = invoiceItemsMap[item.id] || [];
                              const isLoadingItems = !!invoiceItemsLoading[item.id];
                              
                              return (
                                <>
                                  <TableRow key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/10">
                                    <TableCell>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={() => toggleInvoiceExpand(item.id)}>
                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                      </Button>
                                    </TableCell>
                                    {visibleColumns.invNo && <TableCell className="font-semibold font-mono text-xs">{item.invoiceNo}</TableCell>}
                                    {visibleColumns.invDate && <TableCell className="text-xs text-zinc-400">{new Date(item.invoiceDate).toLocaleDateString()}</TableCell>}
                                    {visibleColumns.invCustomer && <TableCell className="font-semibold">{item.customerName}</TableCell>}
                                    {visibleColumns.invWarehouse && <TableCell className="text-zinc-500">{item.warehouseName}</TableCell>}
                                    {visibleColumns.invItems && <TableCell className="text-center font-medium">{item.itemCount}</TableCell>}
                                    {visibleColumns.invAmount && <TableCell className="text-right font-bold">₹{item.invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>}
                                    {visibleColumns.invPaid && <TableCell className="text-right text-emerald-600 font-medium">₹{item.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>}
                                    {visibleColumns.invDue && (
                                      <TableCell className={`text-right font-bold ${item.dueAmount > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>
                                        ₹{item.dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </TableCell>
                                    )}
                                    {visibleColumns.invStatus && (
                                      <TableCell className="text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                          item.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                          item.paymentStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                                          'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                                        }`}>
                                          {item.paymentStatus === 'Paid' && <CheckCircle2 className="h-3 w-3" />}
                                          {item.paymentStatus === 'Partially Paid' && <Clock className="h-3 w-3" />}
                                          {item.paymentStatus === 'Unpaid' && <XCircle className="h-3 w-3" />}
                                          {item.paymentStatus}
                                        </span>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                  {isExpanded && (
                                    <TableRow className="bg-zinc-100/30 dark:bg-zinc-900/20">
                                      <TableCell colSpan={10} className="py-3 px-8">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Sales Line Items Detail</span>
                                        {isLoadingItems ? (
                                          <div className="flex items-center gap-2 py-3">
                                            <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />
                                            <span className="text-xs text-zinc-500">Loading itemized invoice details...</span>
                                          </div>
                                        ) : itemsList.length > 0 ? (
                                          <div className="border border-zinc-250/80 dark:border-white/5 rounded-lg overflow-hidden max-w-4xl bg-white dark:bg-zinc-950">
                                            <Table>
                                              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/20">
                                                <TableRow>
                                                  <TableHead className="py-2 text-xs">Product</TableHead>
                                                  <TableHead className="py-2 text-xs text-right">Qty</TableHead>
                                                  <TableHead className="py-2 text-xs text-right">Rate</TableHead>
                                                  <TableHead className="py-2 text-xs text-right">Discount</TableHead>
                                                  <TableHead className="py-2 text-xs text-right">Tax</TableHead>
                                                  <TableHead className="py-2 text-xs text-right">Subtotal</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {itemsList.map((itm, itmIdx) => (
                                                  <TableRow key={itmIdx}>
                                                    <TableCell className="py-2 text-xs">
                                                      <div className="font-semibold">{itm.productName}</div>
                                                      <div className="text-[9px] text-zinc-400 font-mono">{itm.productCode}</div>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs text-right font-medium">{itm.qty} {itm.unitName || 'Units'}</TableCell>
                                                    <TableCell className="py-2 text-xs text-right">₹{(itm.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className="py-2 text-xs text-right text-rose-500">-₹{(itm.discountAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className="py-2 text-xs text-right text-zinc-500">₹{(itm.taxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({itm.taxPercentage}%)</TableCell>
                                                    <TableCell className="py-2 text-xs text-right font-bold">₹{(itm.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-zinc-400">No line items records found</p>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </>
                              );
                            })
                          ) : (
                            <TableRow><TableCell colSpan={10} className="text-center py-10 text-zinc-500">No records found</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* SALES RETURNS REPORT */}
                  {selectedReportType === 'returns' && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Return No</TableHead>
                            <TableHead>Return Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Linked Invoice</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="text-right">GST Refund</TableHead>
                            <TableHead className="text-right">Net Return</TableHead>
                            <TableHead>Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredReturns.length > 0 ? (
                            filteredReturns.map((item) => {
                              const isExpanded = !!expandedReturnIds[item.id];
                              return (
                                <>
                                  <TableRow key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/10">
                                    <TableCell>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={() => toggleReturnExpand(item.id)}>
                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                      </Button>
                                    </TableCell>
                                    <TableCell className="font-semibold font-mono text-xs">{item.returnNo}</TableCell>
                                    <TableCell className="text-xs text-zinc-400">{new Date(item.returnDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-semibold">{item.customerName}</TableCell>
                                    <TableCell className="font-mono text-xs text-zinc-500">{item.invoiceNo || 'N/A'}</TableCell>
                                    <TableCell className="text-right font-medium">₹{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right text-zinc-500">₹{item.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right font-bold text-rose-500">₹{item.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-xs text-zinc-500 max-w-xs truncate">{item.remarks || '-'}</TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <TableRow className="bg-zinc-100/30 dark:bg-zinc-900/20">
                                      <TableCell colSpan={9} className="py-3 px-8">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Returned items list</span>
                                        <div className="border border-zinc-250/80 dark:border-white/5 rounded-lg overflow-hidden max-w-3xl bg-white dark:bg-zinc-950">
                                          <Table>
                                            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/20">
                                              <TableRow>
                                                <TableHead className="py-2 text-xs">Product</TableHead>
                                                <TableHead className="py-2 text-xs text-right">Returned Qty</TableHead>
                                                <TableHead className="py-2 text-xs text-right">Return Rate</TableHead>
                                                <TableHead className="py-2 text-xs text-right">GST Refund</TableHead>
                                                <TableHead className="py-2 text-xs text-right">Total Net</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {item.items.map((itm, itIdx) => (
                                                <TableRow key={itIdx}>
                                                  <TableCell className="py-2 text-xs">
                                                    <div className="font-semibold">{itm.productName}</div>
                                                    <div className="text-[9px] text-zinc-400 font-mono">{itm.productCode}</div>
                                                  </TableCell>
                                                  <TableCell className="py-2 text-xs text-right font-medium">{itm.quantity} {itm.unitName || 'Units'}</TableCell>
                                                  <TableCell className="py-2 text-xs text-right">₹{itm.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                                  <TableCell className="py-2 text-xs text-right text-zinc-500">₹{itm.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                                  <TableCell className="py-2 text-xs text-right font-bold text-rose-500">₹{itm.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </>
                              );
                            })
                          ) : (
                            <TableRow><TableCell colSpan={9} className="text-center py-10 text-zinc-500">No returns found</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* TAX / GST REPORT */}
                  {selectedReportType === 'tax' && taxReport && (
                    <div className="p-6 space-y-8">
                      {/* Grid cards breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { title: 'Taxable Subtotal', value: `₹${taxReport.taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'border-l-4 border-l-blue-500' },
                          { title: 'CGST Collected (Intrastate)', value: `₹${taxReport.cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'border-l-4 border-l-emerald-500' },
                          { title: 'SGST Collected (Intrastate)', value: `₹${taxReport.sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'border-l-4 border-l-teal-500' },
                          { title: 'IGST Collected (Interstate)', value: `₹${taxReport.igst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'border-l-4 border-l-violet-500' }
                        ].map((card, idx) => (
                          <Card key={idx} className={`shadow-sm bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/80 dark:border-white/5 ${card.color}`}>
                            <CardHeader className="py-2 flex flex-row items-center justify-between">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase">{card.title}</span>
                            </CardHeader>
                            <CardContent>
                              <div className="text-lg font-extrabold text-zinc-800 dark:text-white">{card.value}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Cumulative Box */}
                      <div className="border border-emerald-550/20 bg-emerald-500/5 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-zinc-400">Total GST Liability Collected</span>
                          <h4 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">₹{taxReport.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-emerald-500 opacity-60" />
                      </div>

                      {/* Tax profiles summary table */}
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Collection by Tax Slab</span>
                        <div className="border border-zinc-250/80 dark:border-white/5 rounded-xl overflow-hidden max-w-2xl bg-white dark:bg-zinc-950">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tax Profile / Slab</TableHead>
                                <TableHead className="text-right">GST Rate</TableHead>
                                <TableHead className="text-right">Taxable Amount</TableHead>
                                <TableHead className="text-right">GST Collected</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {taxReport.taxProfileSummaries.length > 0 ? (
                                taxReport.taxProfileSummaries.map((slab, sIdx) => (
                                  <TableRow key={sIdx}>
                                    <TableCell className="font-semibold">{slab.taxProfileName}</TableCell>
                                    <TableCell className="text-right font-mono font-medium">{slab.taxPercent}%</TableCell>
                                    <TableCell className="text-right">₹{slab.taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right font-bold text-zinc-800 dark:text-zinc-200">₹{slab.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow><TableCell colSpan={4} className="text-center py-6 text-zinc-500">No GST collections logged</TableCell></TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Page>
  );
}
