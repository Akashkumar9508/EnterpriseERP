import { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Search, 
  Calendar, 
  Warehouse as WarehouseIcon, 
  User as UserIcon,
  Download, 
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
import { Section } from '@/components/ui/section';
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
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// DTO Interfaces
interface SupplierSummary {
  supplierId: string;
  supplierName: string;
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

interface PurchaseSummaryReport {
  totalPurchases: number;
  totalAmount: number;
  totalGST: number;
  pendingPayments: number;
  supplierWiseTotals: SupplierSummary[];
  monthlySummaries: MonthlySummary[];
}

interface SupplierRate {
  supplierId: string;
  supplierName: string;
  purchaseRate: number;
  purchaseDate: string;
}

interface ProductWiseReport {
  productId: string;
  productName: string;
  productCode: string;
  sku?: string;
  quantityPurchased: number;
  averagePurchasePrice: number;
  latestPurchaseRate: number;
  supplierRates: SupplierRate[];
}

interface SupplierWiseReport {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  totalInvoices: number;
  totalAmount: number;
  dueAmount: number;
  lastPurchaseDate?: string;
}

interface InvoiceWiseReport {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  supplierId: string;
  supplierName: string;
  warehouseName: string;
  itemCount: number;
  invoiceAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  expanded?: boolean;
}

interface PurchaseReturnItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  purchaseRate: number;
  taxAmount: number;
  totalAmount: number;
}

interface PurchaseReturnReport {
  id: string;
  returnNo: string;
  returnDate: string;
  supplierName: string;
  invoiceNo?: string;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  remarks?: string;
  items: PurchaseReturnItem[];
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

interface ExpiryReport {
  productId: string;
  productName: string;
  productCode: string;
  batchNumber: string;
  expiryDate: string;
  warehouseName: string;
  currentStock: number;
  status: string;
}

interface BatchWiseReport {
  batchNumber: string;
  productId: string;
  productName: string;
  productCode: string;
  expiryDate?: string;
  supplierName: string;
  purchaseQuantity: number;
  currentStock: number;
}

interface LowMarginReport {
  productId: string;
  productName: string;
  productCode: string;
  purchaseRate: number;
  salesRate: number;
  mrp: number;
  marginAmount: number;
  marginPercent: number;
  alertStatus: string;
}

interface AuditLogReport {
  id: number;
  actionType: string;
  changedByUsername: string;
  changedAt: string;
  oldValues?: string;
  newValues?: string;
  referenceNo: string;
}

interface LookupItem {
  id: string;
  name: string;
}

type ReportType = 
  | 'summary' 
  | 'product-wise' 
  | 'supplier-wise' 
  | 'invoice-wise' 
  | 'returns' 
  | 'tax' 
  | 'expiry' 
  | 'batch-wise' 
  | 'low-margin' 
  | 'audit-log';

export default function PurchaseReports() {
  // Filter States
  const [supplierId, setSupplierId] = useState<string>('all');
  const [warehouseId, setWarehouseId] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('this-month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Lookup Lists
  const [suppliers, setSuppliers] = useState<LookupItem[]>([]);
  const [warehouses, setWarehouses] = useState<LookupItem[]>([]);

  // Main navigation tab
  const [activeMainTab, setActiveMainTab] = useState<string>('analytics');
  // Selected detailed report type
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('summary');

  // Loading & Data States
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [summaryReport, setSummaryReport] = useState<PurchaseSummaryReport | null>(null);
  const [productWiseReport, setProductWiseReport] = useState<ProductWiseReport[]>([]);
  const [supplierWiseReport, setSupplierWiseReport] = useState<SupplierWiseReport[]>([]);
  const [invoiceWiseReport, setInvoiceWiseReport] = useState<InvoiceWiseReport[]>([]);
  const [returnsReport, setReturnsReport] = useState<PurchaseReturnReport[]>([]);
  const [taxReport, setTaxReport] = useState<TaxReport | null>(null);
  const [expiryReport, setExpiryReport] = useState<ExpiryReport[]>([]);
  const [batchWiseReport, setBatchWiseReport] = useState<BatchWiseReport[]>([]);
  const [lowMarginReport, setLowMarginReport] = useState<LowMarginReport[]>([]);
  const [auditLogReport, setAuditLogReport] = useState<AuditLogReport[]>([]);

  // Search & Expandable details inside grid
  const [searchText, setSearchText] = useState<string>('');
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<string, boolean>>({});
  const [expandedReturnIds, setExpandedReturnIds] = useState<Record<string, boolean>>({});

  // Column Visibility States
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    // Summary
    summarySupplier: true, summaryAmount: true, summaryTax: true, summaryDue: true,
    // Product
    prodName: true, prodCode: true, prodQty: true, prodAvg: true, prodLatest: true,
    // Supplier
    suppName: true, suppCode: true, suppInvoices: true, suppAmount: true, suppDue: true, suppLastDate: true,
    // Invoice
    invNo: true, invDate: true, invSupplier: true, invWarehouse: true, invItems: true, invAmount: true, invPaid: true, invDue: true, invStatus: true,
    // Expiry
    expProd: true, expBatch: true, expDate: true, expWh: true, expStock: true, expStatus: true,
    // Margin
    margProd: true, margPurch: true, margSales: true, margMrp: true, margAmount: true, margPercent: true, margAlert: true
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
        const [resSuppliers, resWarehouses] = await Promise.all([
          axiosClient.get('/Supplier'),
          axiosClient.get('/Warehouse')
        ]) as [any, any];
        if (resSuppliers?.success) setSuppliers(resSuppliers.data || []);
        if (resWarehouses?.success) setWarehouses(resWarehouses.data || []);
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
    if (supplierId && supplierId !== 'all') queryParams.append('supplierId', supplierId);
    if (warehouseId && warehouseId !== 'all') queryParams.append('warehouseId', warehouseId);

    const queryStr = `?${queryParams.toString()}`;

    try {
      if (activeMainTab === 'analytics') {
        const res: any = await axiosClient.get(`/PurchaseReport/Summary${queryStr}`);
        if (res?.success) setSummaryReport(res.data);
      } else {
        // Detailed Report fetch
        switch (selectedReportType) {
          case 'summary':
            const resSum: any = await axiosClient.get(`/PurchaseReport/Summary${queryStr}`);
            if (resSum?.success) setSummaryReport(resSum.data);
            break;
          case 'product-wise':
            const resProd: any = await axiosClient.get(`/PurchaseReport/ProductWise${queryStr}`);
            if (resProd?.success) setProductWiseReport(resProd.data || []);
            break;
          case 'supplier-wise':
            const resSupp: any = await axiosClient.get(`/PurchaseReport/SupplierWise?startDate=${startDate}&endDate=${endDate}${supplierId !== 'all' ? `&supplierId=${supplierId}` : ''}`);
            if (resSupp?.success) setSupplierWiseReport(resSupp.data || []);
            break;
          case 'invoice-wise':
            const resInv: any = await axiosClient.get(`/PurchaseReport/InvoiceWise${queryStr}`);
            if (resInv?.success) setInvoiceWiseReport(resInv.data || []);
            break;
          case 'returns':
            const resRet: any = await axiosClient.get(`/PurchaseReport/Returns?startDate=${startDate}&endDate=${endDate}${supplierId !== 'all' ? `&supplierId=${supplierId}` : ''}`);
            if (resRet?.success) setReturnsReport(resRet.data || []);
            break;
          case 'tax':
            const resTax: any = await axiosClient.get(`/PurchaseReport/Tax${queryStr}`);
            if (resTax?.success) setTaxReport(resTax.data);
            break;
          case 'expiry':
            const resExp: any = await axiosClient.get(`/PurchaseReport/Expiry${warehouseId !== 'all' ? `?warehouseId=${warehouseId}` : ''}`);
            if (resExp?.success) setExpiryReport(resExp.data || []);
            break;
          case 'batch-wise':
            const resBatch: any = await axiosClient.get(`/PurchaseReport/BatchWise${queryStr}`);
            if (resBatch?.success) setBatchWiseReport(resBatch.data || []);
            break;
          case 'low-margin':
            const resMarg: any = await axiosClient.get('/PurchaseReport/LowMargin');
            if (resMarg?.success) setLowMarginReport(resMarg.data || []);
            break;
          case 'audit-log':
            const resAudit: any = await axiosClient.get('/PurchaseReport/AuditLog');
            if (resAudit?.success) setAuditLogReport(resAudit.data || []);
            break;
        }
      }
    } catch (err) {
      console.error('Error loading purchase report data', err);
      toast.error('Error occurred while fetching report data.');
    } finally {
      setIsDataLoading(false);
    }
  };

  // Re-trigger fetch on filters change
  useEffect(() => {
    fetchReportData();
  }, [activeMainTab, selectedReportType, startDate, endDate, supplierId, warehouseId]);

  // Expandable invoice toggler
  const toggleInvoiceExpand = (id: string) => {
    setExpandedInvoiceIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Expandable return toggler
  const toggleReturnExpand = (id: string) => {
    setExpandedReturnIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Export to Excel
  const exportToExcel = () => {
    let dataToExport: any[] = [];
    let filename = 'Purchase_Report';

    if (selectedReportType === 'summary' && summaryReport) {
      dataToExport = summaryReport.supplierWiseTotals.map(s => ({
        'Supplier Name': s.supplierName,
        'Total Purchased Amount': s.totalAmount,
        'Total GST paid': s.totalTax,
        'Outstanding Due': s.dueAmount
      }));
      filename = 'Purchase_Summary_Report';
    } else if (selectedReportType === 'product-wise') {
      dataToExport = productWiseReport.map(p => ({
        'Product Code': p.productCode,
        'Product Name': p.productName,
        'SKU': p.sku || '',
        'Qty Purchased': p.quantityPurchased,
        'Average Price': p.averagePurchasePrice,
        'Latest Rate': p.latestPurchaseRate
      }));
      filename = 'Product_Wise_Purchase_Report';
    } else if (selectedReportType === 'supplier-wise') {
      dataToExport = supplierWiseReport.map(s => ({
        'Supplier Code': s.supplierCode,
        'Supplier Name': s.supplierName,
        'Total Invoices': s.totalInvoices,
        'Total Amount': s.totalAmount,
        'Dues': s.dueAmount,
        'Last Purchase Date': s.lastPurchaseDate ? new Date(s.lastPurchaseDate).toLocaleDateString() : ''
      }));
      filename = 'Supplier_Wise_Purchase_Report';
    } else if (selectedReportType === 'invoice-wise') {
      dataToExport = invoiceWiseReport.map(i => ({
        'Invoice No': i.invoiceNo,
        'Invoice Date': new Date(i.invoiceDate).toLocaleDateString(),
        'Supplier Name': i.supplierName,
        'Warehouse': i.warehouseName,
        'Items Count': i.itemCount,
        'Invoice Net Amount': i.invoiceAmount,
        'Paid Amount': i.paidAmount,
        'Due Amount': i.dueAmount,
        'Payment Status': i.paymentStatus
      }));
      filename = 'Invoice_Wise_Purchase_Report';
    } else if (selectedReportType === 'returns') {
      dataToExport = returnsReport.map(r => ({
        'Return No': r.returnNo,
        'Return Date': new Date(r.returnDate).toLocaleDateString(),
        'Supplier': r.supplierName,
        'Ref Invoice': r.invoiceNo || '',
        'Sub Total': r.totalAmount,
        'GST Amount': r.taxAmount,
        'Net Amount': r.netAmount,
        'Remarks': r.remarks || ''
      }));
      filename = 'Purchase_Returns_Report';
    } else if (selectedReportType === 'tax' && taxReport) {
      dataToExport = taxReport.taxProfileSummaries.map(t => ({
        'Tax Profile': t.taxProfileName,
        'GST Percent': `${t.taxPercent}%`,
        'Taxable Amount': t.taxableAmount,
        'CGST/SGST/IGST Paid': t.taxAmount
      }));
      filename = 'GST_Tax_Purchase_Report';
    } else if (selectedReportType === 'expiry') {
      dataToExport = expiryReport.map(e => ({
        'Product': e.productName,
        'Product Code': e.productCode,
        'Batch No': e.batchNumber,
        'Expiry Date': new Date(e.expiryDate).toLocaleDateString(),
        'Warehouse': e.warehouseName,
        'Current Stock': e.currentStock,
        'Status': e.status
      }));
      filename = 'Expiry_Inventory_Report';
    } else if (selectedReportType === 'batch-wise') {
      dataToExport = batchWiseReport.map(b => ({
        'Batch Number': b.batchNumber,
        'Product Code': b.productCode,
        'Product Name': b.productName,
        'Expiry Date': b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'N/A',
        'Supplier Name': b.supplierName,
        'Purchase Qty': b.purchaseQuantity,
        'Current Stock': b.currentStock
      }));
      filename = 'Batch_Wise_Purchase_Report';
    } else if (selectedReportType === 'low-margin') {
      dataToExport = lowMarginReport.map(l => ({
        'Product Code': l.productCode,
        'Product Name': l.productName,
        'Purchase Rate': l.purchaseRate,
        'Sales Rate': l.salesRate,
        'MRP': l.mrp,
        'Profit Margin (Amt)': l.marginAmount,
        'Profit Margin (%)': `${l.marginPercent}%`,
        'Status': l.alertStatus
      }));
      filename = 'Low_Margin_Margin_Alert_Report';
    } else if (selectedReportType === 'audit-log') {
      dataToExport = auditLogReport.map(a => ({
        'Action': a.actionType,
        'Changed By': a.changedByUsername,
        'Date': new Date(a.changedAt).toLocaleString(),
        'Invoice Reference': a.referenceNo,
        'Original Values': a.oldValues || '',
        'New Values': a.newValues || ''
      }));
      filename = 'Purchase_Invoices_Audit_Log';
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
    let filename = 'Purchase_Report';

    if (selectedReportType === 'summary' && summaryReport) {
      dataToExport = summaryReport.supplierWiseTotals;
      filename = 'Purchase_Summary';
    } else if (selectedReportType === 'product-wise') {
      dataToExport = productWiseReport;
      filename = 'Product_Wise_Purchases';
    } else if (selectedReportType === 'supplier-wise') {
      dataToExport = supplierWiseReport;
      filename = 'Supplier_Wise_Purchases';
    } else if (selectedReportType === 'invoice-wise') {
      dataToExport = invoiceWiseReport;
      filename = 'Invoice_Wise_Purchases';
    } else if (selectedReportType === 'returns') {
      dataToExport = returnsReport;
      filename = 'Purchase_Returns';
    } else if (selectedReportType === 'tax' && taxReport) {
      dataToExport = taxReport.taxProfileSummaries;
      filename = 'Purchase_Tax_GST';
    } else if (selectedReportType === 'expiry') {
      dataToExport = expiryReport;
      filename = 'Expiry_Alerts';
    } else if (selectedReportType === 'batch-wise') {
      dataToExport = batchWiseReport;
      filename = 'Batch_Wise_Stocks';
    } else if (selectedReportType === 'low-margin') {
      dataToExport = lowMarginReport;
      filename = 'Low_Margin_Alerts';
    } else if (selectedReportType === 'audit-log') {
      dataToExport = auditLogReport;
      filename = 'Audit_Trail';
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

  const chartSupplierData = useMemo(() => {
    if (!summaryReport) return [];
    return summaryReport.supplierWiseTotals.slice(0, 5).map(s => ({
      Supplier: s.supplierName,
      Total: s.totalAmount
    }));
  }, [summaryReport]);

  const chartProductData = useMemo(() => {
    return productWiseReport.slice(0, 5).map(p => ({
      Product: p.productName.length > 15 ? `${p.productName.substring(0, 15)}...` : p.productName,
      Quantity: p.quantityPurchased
    }));
  }, [productWiseReport]);

  const chartPaymentStatusData = useMemo(() => {
    if (!summaryReport) return [];
    const totals = summaryReport.supplierWiseTotals;
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
      i.supplierName.toLowerCase().includes(searchText.toLowerCase()) ||
      i.warehouseName.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [invoiceWiseReport, searchText]);

  const filteredReturns = useMemo(() => {
    return returnsReport.filter(r => 
      r.returnNo.toLowerCase().includes(searchText.toLowerCase()) || 
      r.supplierName.toLowerCase().includes(searchText.toLowerCase()) ||
      (r.invoiceNo && r.invoiceNo.toLowerCase().includes(searchText.toLowerCase()))
    );
  }, [returnsReport, searchText]);

  const filteredExpiry = useMemo(() => {
    return expiryReport.filter(e => 
      e.productName.toLowerCase().includes(searchText.toLowerCase()) || 
      e.productCode.toLowerCase().includes(searchText.toLowerCase()) ||
      e.batchNumber.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [expiryReport, searchText]);

  const filteredBatchWise = useMemo(() => {
    return batchWiseReport.filter(b => 
      b.productName.toLowerCase().includes(searchText.toLowerCase()) || 
      b.productCode.toLowerCase().includes(searchText.toLowerCase()) ||
      b.batchNumber.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [batchWiseReport, searchText]);

  const filteredLowMargin = useMemo(() => {
    return lowMarginReport.filter(l => 
      l.productName.toLowerCase().includes(searchText.toLowerCase()) || 
      l.productCode.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [lowMarginReport, searchText]);

  const filteredAuditLog = useMemo(() => {
    return auditLogReport.filter(a => 
      a.changedByUsername.toLowerCase().includes(searchText.toLowerCase()) || 
      a.actionType.toLowerCase().includes(searchText.toLowerCase()) ||
      a.referenceNo.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [auditLogReport, searchText]);

  return (
    <Page title="Purchase Reports" className="print:bg-white print:p-0">
      
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
          {/* Supplier selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><UserIcon className="h-3 w-3" /> Supplier</label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="w-full h-9 border-zinc-200/80 dark:border-white/5">
                <SelectValue placeholder="Select Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warehouse selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><WarehouseIcon className="h-3 w-3" /> Warehouse</label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-full h-9 border-zinc-200/80 dark:border-white/5">
                <SelectValue placeholder="Select Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map(w => (
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
        <h1 className="text-3xl font-extrabold text-zinc-900">Purchase Report</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Period: {startDate ? new Date(startDate).toLocaleDateString() : 'Beginning'} to {endDate ? new Date(endDate).toLocaleDateString() : 'Today'}
        </p>
        <p className="text-xs text-zinc-500">
          Filters: Supplier: {supplierId !== 'all' ? suppliers.find(s => s.id === supplierId)?.name : 'All'}, Warehouse: {warehouseId !== 'all' ? warehouses.find(w => w.id === warehouseId)?.name : 'All'}
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
              <p className="text-sm text-zinc-500">Loading purchase analytics data...</p>
            </div>
          ) : (
            <>
              {/* KPI Cards row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: 'Total Purchases', value: summaryReport?.totalPurchases || 0, icon: BarChart3, desc: 'Count of active invoices', color: 'border-l-4 border-l-blue-500' },
                  { title: 'Total Purchase Amount', value: `₹${(summaryReport?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, desc: 'Net invoice transactions', color: 'border-l-4 border-l-emerald-500' },
                  { title: 'Total GST Paid', value: `₹${(summaryReport?.totalGST || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Coins, desc: 'Accumulated tax values', color: 'border-l-4 border-l-amber-500' },
                  { title: 'Pending Payments', value: `₹${(summaryReport?.pendingPayments || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Clock, desc: 'Unpaid accounts payable', color: 'border-l-4 border-l-rose-500' }
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

              {/* Analytics Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Monthly Purchase Trend */}
                <Card className="shadow-sm border-zinc-200/80 dark:border-white/5 bg-white dark:bg-zinc-950/20">
                  <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Monthly Purchase Trends</CardTitle></CardHeader>
                  <CardContent className="h-80">
                    {chartMonthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartMonthlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200,200,200,0.15)" />
                          <XAxis dataKey="Month" stroke="#888" fontSize={11} />
                          <YAxis stroke="#888" fontSize={11} />
                          <ChartTooltip formatter={(v: any) => `₹${v.toLocaleString()}`} />
                          <Legend />
                          <Line type="monotone" dataKey="Amount" name="Purchase Amount" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-zinc-400">No monthly summaries data available</div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Top Suppliers */}
                <Card className="shadow-sm border-zinc-200/80 dark:border-white/5 bg-white dark:bg-zinc-950/20">
                  <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><UserIcon className="h-4 w-4" /> Top 5 Suppliers by Amount</CardTitle></CardHeader>
                  <CardContent className="h-80">
                    {chartSupplierData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartSupplierData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200,200,200,0.15)" />
                          <XAxis dataKey="Supplier" stroke="#888" fontSize={11} />
                          <YAxis stroke="#888" fontSize={11} />
                          <ChartTooltip formatter={(v: any) => `₹${v.toLocaleString()}`} />
                          <Legend />
                          <Bar dataKey="Total" name="Total Purchased" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-zinc-400">No supplier totals data available</div>
                    )}
                  </CardContent>
                </Card>

                {/* 3. Most Purchased Products */}
                <Card className="shadow-sm border-zinc-200/80 dark:border-white/5 bg-white dark:bg-zinc-950/20">
                  <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Most Purchased Products (Qty)</CardTitle></CardHeader>
                  <CardContent className="h-80">
                    {chartProductData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartProductData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(200,200,200,0.15)" />
                          <XAxis type="number" stroke="#888" fontSize={11} />
                          <YAxis dataKey="Product" type="category" stroke="#888" fontSize={10} width={90} />
                          <ChartTooltip />
                          <Legend />
                          <Bar dataKey="Quantity" name="Quantity" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-zinc-400">No product purchase history found</div>
                    )}
                  </CardContent>
                </Card>

                {/* 4. Payment Outstanding Share */}
                <Card className="shadow-sm border-zinc-200/80 dark:border-white/5 bg-white dark:bg-zinc-950/20">
                  <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Coins className="h-4 w-4" /> Payment Outstanding Share</CardTitle></CardHeader>
                  <CardContent className="h-80 flex flex-col justify-center">
                    {summaryReport && summaryReport.totalAmount > 0 ? (
                      <div className="flex flex-col sm:flex-row items-center justify-around h-full gap-4">
                        <div className="w-48 h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartPaymentStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {chartPaymentStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <ChartTooltip formatter={(v: any) => `₹${v.toLocaleString()}`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-3">
                          {chartPaymentStatusData.map((item, idx) => {
                            const percent = ((item.value / summaryReport.totalAmount) * 100).toFixed(1);
                            return (
                              <div key={idx} className="flex items-center gap-3">
                                <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                                <div>
                                  <div className="text-xs font-semibold text-zinc-500">{item.name}</div>
                                  <div className="text-sm font-extrabold text-zinc-900 dark:text-white">
                                    ₹{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({percent}%)
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-zinc-400">No payment transaction records found</div>
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
        <TabsContent value="detailed" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Column: Report Type Selector sidebar (Hidden during printing) */}
          <div className="print:hidden lg:col-span-1 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 h-fit dark:bg-zinc-900/50 dark:border-white/5 transition-colors duration-300">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest px-3 mb-3">Reports Checklist</h3>
            <div className="flex flex-col gap-1">
              {[
                { id: 'summary', label: '1. Purchase Summary' },
                { id: 'product-wise', label: '2. Product-wise Purchases' },
                { id: 'supplier-wise', label: '3. Supplier-wise Purchases' },
                { id: 'invoice-wise', label: '4. Invoice-wise List' },
                { id: 'returns', label: '5. Purchase Returns' },
                { id: 'tax', label: '6. Tax / GST Summary' },
                { id: 'expiry', label: '7. Expiry Product Stock' },
                { id: 'batch-wise', label: '8. Batch-wise Purchases' },
                { id: 'low-margin', label: '9. Low Margin Alerts' },
                { id: 'audit-log', label: '10. Audit Logs' }
              ].map(r => (
                <button
                  key={r.id}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${selectedReportType === r.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5'}`}
                  onClick={() => {
                    setSelectedReportType(r.id as ReportType);
                    setSearchText('');
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Grid View */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Grid Utility Bar: Search, Custom Columns (Hidden during printing) */}
            <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 dark:bg-zinc-900/50 dark:border-white/5 transition-colors duration-300">
              
              {/* Search input (Disabled for Summary/Tax where it is not applicable) */}
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Search table rows..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  disabled={selectedReportType === 'summary' || selectedReportType === 'tax'}
                  className="pl-8 h-9 border-zinc-200/80 dark:border-white/5"
                />
              </div>

              {/* Column customizer dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5 border-zinc-200/80 dark:border-white/5 cursor-pointer">
                    <SlidersHorizontal className="h-4 w-4" /> Columns Customizer
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover text-popover-foreground border border-border rounded-lg shadow-md">
                  <div className="p-2 border-b border-border text-xs font-semibold text-muted-foreground">Toggle Column Visibility</div>
                  {selectedReportType === 'summary' && (
                    <>
                      <DropdownMenuCheckboxItem checked={visibleColumns.summarySupplier} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, summarySupplier: v }))}>Supplier</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.summaryAmount} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, summaryAmount: v }))}>Purchased Amount</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.summaryTax} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, summaryTax: v }))}>GST Amount</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.summaryDue} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, summaryDue: v }))}>Pending Payments</DropdownMenuCheckboxItem>
                    </>
                  )}
                  {selectedReportType === 'product-wise' && (
                    <>
                      <DropdownMenuCheckboxItem checked={visibleColumns.prodName} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, prodName: v }))}>Product Name</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.prodCode} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, prodCode: v }))}>Product Code</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.prodQty} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, prodQty: v }))}>Qty Purchased</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.prodAvg} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, prodAvg: v }))}>Avg Purchase Price</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.prodLatest} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, prodLatest: v }))}>Latest Rate</DropdownMenuCheckboxItem>
                    </>
                  )}
                  {selectedReportType === 'supplier-wise' && (
                    <>
                      <DropdownMenuCheckboxItem checked={visibleColumns.suppName} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, suppName: v }))}>Supplier Name</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.suppCode} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, suppCode: v }))}>Supplier Code</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.suppInvoices} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, suppInvoices: v }))}>Total Invoices</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.suppAmount} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, suppAmount: v }))}>Total Amount</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.suppDue} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, suppDue: v }))}>Dues Outstanding</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.suppLastDate} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, suppLastDate: v }))}>Last Purchase Date</DropdownMenuCheckboxItem>
                    </>
                  )}
                  {selectedReportType === 'invoice-wise' && (
                    <>
                      <DropdownMenuCheckboxItem checked={visibleColumns.invNo} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, invNo: v }))}>Invoice No</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.invDate} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, invDate: v }))}>Invoice Date</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.invSupplier} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, invSupplier: v }))}>Supplier</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.invWarehouse} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, invWarehouse: v }))}>Warehouse</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.invItems} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, invItems: v }))}>Items</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.invAmount} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, invAmount: v }))}>Net Amount</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.invPaid} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, invPaid: v }))}>Paid</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.invDue} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, invDue: v }))}>Due</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.invStatus} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, invStatus: v }))}>Payment Status</DropdownMenuCheckboxItem>
                    </>
                  )}
                  {selectedReportType === 'expiry' && (
                    <>
                      <DropdownMenuCheckboxItem checked={visibleColumns.expProd} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, expProd: v }))}>Product</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.expBatch} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, expBatch: v }))}>Batch Number</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.expDate} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, expDate: v }))}>Expiry Date</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.expWh} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, expWh: v }))}>Warehouse</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.expStock} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, expStock: v }))}>Current Stock</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.expStatus} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, expStatus: v }))}>Status</DropdownMenuCheckboxItem>
                    </>
                  )}
                  {selectedReportType === 'low-margin' && (
                    <>
                      <DropdownMenuCheckboxItem checked={visibleColumns.margProd} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, margProd: v }))}>Product</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.margPurch} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, margPurch: v }))}>Purchase Rate</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.margSales} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, margSales: v }))}>Sales Rate</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.margMrp} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, margMrp: v }))}>MRP</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.margAmount} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, margAmount: v }))}>Margin (₹)</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.margPercent} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, margPercent: v }))}>Margin (%)</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={visibleColumns.margAlert} onCheckedChange={(v) => setVisibleColumns(prev => ({ ...prev, margAlert: v }))}>Status Alert</DropdownMenuCheckboxItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

            </div>

            {/* Dynamic Grid / Table display */}
            <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden shadow-sm dark:bg-zinc-950/20 dark:border-white/5 transition-all duration-300">
              {isDataLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-zinc-500">Extracting report data...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  
                  {/* ------------------ Summary Report Table ------------------ */}
                  {selectedReportType === 'summary' && summaryReport && (
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60">
                        <TableRow>
                          {visibleColumns.summarySupplier && <TableHead>Supplier</TableHead>}
                          {visibleColumns.summaryAmount && <TableHead className="text-right">Purchased Amount</TableHead>}
                          {visibleColumns.summaryTax && <TableHead className="text-right">GST Amount</TableHead>}
                          {visibleColumns.summaryDue && <TableHead className="text-right">Pending Payments</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaryReport.supplierWiseTotals.length > 0 ? (
                          summaryReport.supplierWiseTotals.map((s, idx) => (
                            <TableRow key={idx}>
                              {visibleColumns.summarySupplier && <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">{s.supplierName}</TableCell>}
                              {visibleColumns.summaryAmount && <TableCell className="text-right font-medium">₹{s.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                              {visibleColumns.summaryTax && <TableCell className="text-right">₹{s.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                              {visibleColumns.summaryDue && (
                                <TableCell className={`text-right font-bold ${s.dueAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                                  ₹{s.dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={4} className="text-center py-10 text-zinc-400">No supplier records found</TableCell></TableRow>
                        )}
                        {summaryReport.supplierWiseTotals.length > 0 && (
                          <TableRow className="bg-zinc-100/50 dark:bg-zinc-800/30 font-bold border-t border-t-zinc-200">
                            {visibleColumns.summarySupplier && <TableCell>GRAND TOTAL</TableCell>}
                            {visibleColumns.summaryAmount && <TableCell className="text-right text-zinc-900 dark:text-white">₹{summaryReport.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                            {visibleColumns.summaryTax && <TableCell className="text-right text-zinc-900 dark:text-white">₹{summaryReport.totalGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                            {visibleColumns.summaryDue && <TableCell className="text-right text-rose-600 dark:text-rose-400">₹{summaryReport.pendingPayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}

                  {/* ------------------ Product-wise Report Table ------------------ */}
                  {selectedReportType === 'product-wise' && (
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60">
                        <TableRow>
                          {visibleColumns.prodName && <TableHead>Product</TableHead>}
                          {visibleColumns.prodCode && <TableHead>Product Code</TableHead>}
                          {visibleColumns.prodQty && <TableHead className="text-right">Qty Purchased</TableHead>}
                          {visibleColumns.prodAvg && <TableHead className="text-right">Avg Purchase Price</TableHead>}
                          {visibleColumns.prodLatest && <TableHead className="text-right">Latest Rate</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((p, idx) => (
                            <TableRow key={idx}>
                              {visibleColumns.prodName && <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">{p.productName}</TableCell>}
                              {visibleColumns.prodCode && <TableCell className="text-zinc-500 font-mono text-xs">{p.productCode}</TableCell>}
                              {visibleColumns.prodQty && <TableCell className="text-right font-medium">{p.quantityPurchased.toLocaleString()}</TableCell>}
                              {visibleColumns.prodAvg && <TableCell className="text-right">₹{p.averagePurchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                              {visibleColumns.prodLatest && <TableCell className="text-right">₹{p.latestPurchaseRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={5} className="text-center py-10 text-zinc-400">No product purchase matches found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}

                  {/* ------------------ Supplier-wise Report Table ------------------ */}
                  {selectedReportType === 'supplier-wise' && (
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60">
                        <TableRow>
                          {visibleColumns.suppName && <TableHead>Supplier Name</TableHead>}
                          {visibleColumns.suppCode && <TableHead>Code</TableHead>}
                          {visibleColumns.suppInvoices && <TableHead className="text-center">Total Invoices</TableHead>}
                          {visibleColumns.suppAmount && <TableHead className="text-right">Total Amount</TableHead>}
                          {visibleColumns.suppDue && <TableHead className="text-right">Dues Outstanding</TableHead>}
                          {visibleColumns.suppLastDate && <TableHead>Last Purchase Date</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplierWiseReport.length > 0 ? (
                          supplierWiseReport.map((s, idx) => (
                            <TableRow key={idx}>
                              {visibleColumns.suppName && <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">{s.supplierName}</TableCell>}
                              {visibleColumns.suppCode && <TableCell className="text-zinc-500 font-mono text-xs">{s.supplierCode}</TableCell>}
                              {visibleColumns.suppInvoices && <TableCell className="text-center font-medium">{s.totalInvoices}</TableCell>}
                              {visibleColumns.suppAmount && <TableCell className="text-right font-semibold">₹{s.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                              {visibleColumns.suppDue && (
                                <TableCell className={`text-right font-bold ${s.dueAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                                  ₹{s.dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                              )}
                              {visibleColumns.suppLastDate && (
                                <TableCell className="text-zinc-500 text-xs">
                                  {s.lastPurchaseDate ? new Date(s.lastPurchaseDate).toLocaleDateString() : 'N/A'}
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={6} className="text-center py-10 text-zinc-400">No supplier records found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}

                  {/* ------------------ Invoice-wise Report Table ------------------ */}
                  {selectedReportType === 'invoice-wise' && (
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60">
                        <TableRow>
                          <TableHead className="print:hidden w-[50px]"></TableHead>
                          {visibleColumns.invNo && <TableHead>Invoice No</TableHead>}
                          {visibleColumns.invDate && <TableHead>Invoice Date</TableHead>}
                          {visibleColumns.invSupplier && <TableHead>Supplier</TableHead>}
                          {visibleColumns.invWarehouse && <TableHead>Warehouse</TableHead>}
                          {visibleColumns.invItems && <TableHead className="text-center">Items</TableHead>}
                          {visibleColumns.invAmount && <TableHead className="text-right">Net Amount</TableHead>}
                          {visibleColumns.invPaid && <TableHead className="text-right">Paid</TableHead>}
                          {visibleColumns.invDue && <TableHead className="text-right">Due</TableHead>}
                          {visibleColumns.invStatus && <TableHead>Status</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.length > 0 ? (
                          filteredInvoices.map((i, idx) => {
                            const isExpanded = expandedInvoiceIds[i.id];
                            return (
                              <>
                                <TableRow key={i.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                                  <TableCell className="print:hidden text-center">
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-7 w-7 cursor-pointer" 
                                      onClick={() => toggleInvoiceExpand(i.id)}
                                    >
                                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                  </TableCell>
                                  {visibleColumns.invNo && <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">{i.invoiceNo}</TableCell>}
                                  {visibleColumns.invDate && <TableCell className="text-xs text-zinc-500">{new Date(i.invoiceDate).toLocaleDateString()}</TableCell>}
                                  {visibleColumns.invSupplier && <TableCell>{i.supplierName}</TableCell>}
                                  {visibleColumns.invWarehouse && <TableCell>{i.warehouseName}</TableCell>}
                                  {visibleColumns.invItems && <TableCell className="text-center font-medium">{i.itemCount}</TableCell>}
                                  {visibleColumns.invAmount && <TableCell className="text-right font-semibold">₹{i.invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                                  {visibleColumns.invPaid && <TableCell className="text-right text-emerald-600 font-medium">₹{i.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                                  {visibleColumns.invDue && (
                                    <TableCell className={`text-right font-bold ${i.dueAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                                      ₹{i.dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  )}
                                  {visibleColumns.invStatus && (
                                    <TableCell>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                                        i.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30' :
                                        i.paymentStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30' :
                                        'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30'
                                      }`}>
                                        {i.paymentStatus}
                                      </span>
                                    </TableCell>
                                  )}
                                </TableRow>
                                
                                {/* Expanded items panel */}
                                {isExpanded && (
                                  <TableRow className="bg-zinc-50/55 dark:bg-zinc-900/20 border-b border-zinc-200/50">
                                    <TableCell colSpan={10} className="p-4 pl-12">
                                      <div className="space-y-2 max-w-3xl">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5"><SlidersHorizontal className="h-3 w-3" /> Invoice Line Items Details</div>
                                        <div className="border border-zinc-200 rounded-lg overflow-hidden dark:border-white/5">
                                          <Table className="bg-white dark:bg-zinc-950/50">
                                            <TableHeader className="bg-zinc-100/50 dark:bg-zinc-900/30">
                                              <TableRow className="h-8">
                                                <TableHead className="text-xs">Product</TableHead>
                                                <TableHead className="text-xs text-right">Quantity</TableHead>
                                                <TableHead className="text-xs text-right">Purchase Rate</TableHead>
                                                <TableHead className="text-xs text-right">GST %</TableHead>
                                                <TableHead className="text-xs text-right">GST Amount</TableHead>
                                                <TableHead className="text-xs text-right">Total</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              <TableRow><TableCell colSpan={6} className="text-center text-xs py-4 text-zinc-400">Loading item breakdown...</TableCell></TableRow>
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })
                        ) : (
                          <TableRow><TableCell colSpan={10} className="text-center py-10 text-zinc-400">No invoices matching the search criteria</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}

                  {/* ------------------ Purchase Returns Table ------------------ */}
                  {selectedReportType === 'returns' && (
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60">
                        <TableRow>
                          <TableHead className="print:hidden w-[50px]"></TableHead>
                          <TableHead>Return No</TableHead>
                          <TableHead>Return Date</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Ref Invoice No</TableHead>
                          <TableHead className="text-right">Sub Total</TableHead>
                          <TableHead className="text-right">Tax Amount</TableHead>
                          <TableHead className="text-right">Net Amount</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReturns.length > 0 ? (
                          filteredReturns.map((r) => {
                            const isExpanded = expandedReturnIds[r.id];
                            return (
                              <>
                                <TableRow key={r.id}>
                                  <TableCell className="print:hidden text-center">
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-7 w-7 cursor-pointer" 
                                      onClick={() => toggleReturnExpand(r.id)}
                                    >
                                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                  </TableCell>
                                  <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">{r.returnNo}</TableCell>
                                  <TableCell className="text-xs text-zinc-500">{new Date(r.returnDate).toLocaleDateString()}</TableCell>
                                  <TableCell>{r.supplierName}</TableCell>
                                  <TableCell className="text-zinc-500 font-mono text-xs">{r.invoiceNo || 'N/A'}</TableCell>
                                  <TableCell className="text-right">₹{r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right">₹{r.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right font-semibold text-zinc-900 dark:text-white">₹{r.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-xs text-zinc-500 max-w-[150px] truncate">{r.remarks || ''}</TableCell>
                                </TableRow>

                                {/* Expanded Return Items */}
                                {isExpanded && (
                                  <TableRow className="bg-zinc-50/55 dark:bg-zinc-900/20 border-b border-zinc-200/50">
                                    <TableCell colSpan={9} className="p-4 pl-12">
                                      <div className="space-y-2 max-w-3xl">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Returned Items Details</div>
                                        <div className="border border-zinc-200 rounded-lg overflow-hidden dark:border-white/5">
                                          <Table className="bg-white dark:bg-zinc-950/50">
                                            <TableHeader className="bg-zinc-100/50 dark:bg-zinc-900/30">
                                              <TableRow className="h-8">
                                                <TableHead className="text-xs">Product</TableHead>
                                                <TableHead className="text-xs text-right">Return Qty</TableHead>
                                                <TableHead className="text-xs text-right">Purchase Rate</TableHead>
                                                <TableHead className="text-xs text-right">GST Paid</TableHead>
                                                <TableHead className="text-xs text-right">Total Refund</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {r.items.map((item, index) => (
                                                <TableRow key={index} className="h-8">
                                                  <TableCell className="text-xs font-medium">{item.productName}</TableCell>
                                                  <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                                                  <TableCell className="text-xs text-right">₹{item.purchaseRate.toLocaleString()}</TableCell>
                                                  <TableCell className="text-xs text-right">₹{item.taxAmount.toLocaleString()}</TableCell>
                                                  <TableCell className="text-xs text-right font-semibold text-zinc-900 dark:text-white">₹{item.totalAmount.toLocaleString()}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })
                        ) : (
                          <TableRow><TableCell colSpan={9} className="text-center py-10 text-zinc-400">No return logs found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}

                  {/* ------------------ Tax / GST Summary Table ------------------ */}
                  {selectedReportType === 'tax' && taxReport && (
                    <div className="p-4 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                          { title: 'Taxable Subtotal', value: taxReport.taxableAmount, color: 'text-zinc-900 dark:text-white' },
                          { title: 'CGST Paid', value: taxReport.cgst, color: 'text-zinc-600 dark:text-zinc-400' },
                          { title: 'SGST Paid', value: taxReport.sgst, color: 'text-zinc-600 dark:text-zinc-400' },
                          { title: 'IGST Paid', value: taxReport.igst, color: 'text-zinc-600 dark:text-zinc-400' },
                          { title: 'Total GST Paid', value: taxReport.totalTax, color: 'text-emerald-600 dark:text-emerald-400 font-bold' }
                        ].map((stat, idx) => (
                          <div key={idx} className="bg-zinc-50 p-3 rounded-lg border border-zinc-200/50 dark:bg-zinc-900/30 dark:border-white/5">
                            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wide">{stat.title}</div>
                            <div className={`text-sm md:text-base font-bold mt-1 ${stat.color}`}>₹{stat.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">GST Profile Breaks</div>
                        <Table className="border border-zinc-200 dark:border-white/5 rounded-lg overflow-hidden">
                          <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60">
                            <TableRow>
                              <TableHead>Tax Profile Name</TableHead>
                              <TableHead className="text-center">GST Rate (%)</TableHead>
                              <TableHead className="text-right">Taxable Amount</TableHead>
                              <TableHead className="text-right">Tax Amount Paid</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {taxReport.taxProfileSummaries.length > 0 ? (
                              taxReport.taxProfileSummaries.map((p, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">{p.taxProfileName}</TableCell>
                                  <TableCell className="text-center font-medium">{p.taxPercent}%</TableCell>
                                  <TableCell className="text-right">₹{p.taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right font-semibold">₹{p.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow><TableCell colSpan={4} className="text-center py-10 text-zinc-400">No GST transactions found</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* ------------------ Expiry Alert Report Table ------------------ */}
                  {selectedReportType === 'expiry' && (
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60">
                        <TableRow>
                          {visibleColumns.expProd && <TableHead>Product</TableHead>}
                          {visibleColumns.expBatch && <TableHead>Batch Number</TableHead>}
                          {visibleColumns.expDate && <TableHead>Expiry Date</TableHead>}
                          {visibleColumns.expWh && <TableHead>Warehouse</TableHead>}
                          {visibleColumns.expStock && <TableHead className="text-right">Current Stock</TableHead>}
                          {visibleColumns.expStatus && <TableHead>Status Alert</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpiry.length > 0 ? (
                          filteredExpiry.map((e, idx) => (
                            <TableRow key={idx}>
                              {visibleColumns.expProd && (
                                <TableCell>
                                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">{e.productName}</div>
                                  <div className="text-[10px] text-zinc-400 font-mono">{e.productCode}</div>
                                </TableCell>
                              )}
                              {visibleColumns.expBatch && <TableCell className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{e.batchNumber}</TableCell>}
                              {visibleColumns.expDate && <TableCell className="text-xs font-medium">{new Date(e.expiryDate).toLocaleDateString()}</TableCell>}
                              {visibleColumns.expWh && <TableCell>{e.warehouseName}</TableCell>}
                              {visibleColumns.expStock && <TableCell className="text-right font-semibold">{e.currentStock}</TableCell>}
                              {visibleColumns.expStatus && (
                                <TableCell>
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                                    e.status === 'Expired' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400' :
                                    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
                                  }`}>
                                    <AlertTriangle className="h-3 w-3" /> {e.status}
                                  </span>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={6} className="text-center py-10 text-zinc-400">All products have healthy expiry dates</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}

                  {/* ------------------ Batch-wise Stocks Table ------------------ */}
                  {selectedReportType === 'batch-wise' && (
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60">
                        <TableRow>
                          <TableHead>Batch Number</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead className="text-right">Purchase Quantity</TableHead>
                          <TableHead className="text-right">Current Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBatchWise.length > 0 ? (
                          filteredBatchWise.map((b, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-semibold font-mono text-zinc-900 dark:text-white">{b.batchNumber}</TableCell>
                              <TableCell>
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">{b.productName}</div>
                                <div className="text-[10px] text-zinc-400 font-mono">{b.productCode}</div>
                              </TableCell>
                              <TableCell className="text-xs text-zinc-500">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'N/A'}</TableCell>
                              <TableCell>{b.supplierName}</TableCell>
                              <TableCell className="text-right font-medium">{b.purchaseQuantity}</TableCell>
                              <TableCell className={`text-right font-bold ${b.currentStock <= 0 ? 'text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>{b.currentStock}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={6} className="text-center py-10 text-zinc-400">No batch details found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}

                  {/* ------------------ Low Margin Report Table ------------------ */}
                  {selectedReportType === 'low-margin' && (
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60">
                        <TableRow>
                          {visibleColumns.margProd && <TableHead>Product</TableHead>}
                          {visibleColumns.margPurch && <TableHead className="text-right">Purchase Rate</TableHead>}
                          {visibleColumns.margSales && <TableHead className="text-right">Sales Rate</TableHead>}
                          {visibleColumns.margMrp && <TableHead className="text-right">MRP</TableHead>}
                          {visibleColumns.margAmount && <TableHead className="text-right">Margin Amount</TableHead>}
                          {visibleColumns.margPercent && <TableHead className="text-right">Margin Percent</TableHead>}
                          {visibleColumns.margAlert && <TableHead>Status</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLowMargin.length > 0 ? (
                          filteredLowMargin.map((l, idx) => (
                            <TableRow key={idx}>
                              {visibleColumns.margProd && (
                                <TableCell>
                                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">{l.productName}</div>
                                  <div className="text-[10px] text-zinc-400 font-mono">{l.productCode}</div>
                                </TableCell>
                              )}
                              {visibleColumns.margPurch && <TableCell className="text-right">₹{l.purchaseRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                              {visibleColumns.margSales && <TableCell className="text-right">₹{l.salesRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                              {visibleColumns.margMrp && <TableCell className="text-right">₹{l.mrp.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                              {visibleColumns.margAmount && <TableCell className={`text-right font-medium ${l.marginAmount < 0 ? 'text-rose-600 font-bold' : ''}`}>₹{l.marginAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                              {visibleColumns.margPercent && <TableCell className={`text-right font-semibold ${l.marginPercent < 0 ? 'text-rose-600 font-bold' : ''}`}>{l.marginPercent}%</TableCell>}
                              {visibleColumns.margAlert && (
                                <TableCell>
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                    l.alertStatus === 'Negative Margin' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30' :
                                    l.alertStatus === 'Low Margin' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30' :
                                    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30'
                                  }`}>
                                    {l.alertStatus === 'Negative Margin' ? <XCircle className="h-3 w-3" /> :
                                     l.alertStatus === 'Low Margin' ? <AlertTriangle className="h-3 w-3" /> :
                                     <CheckCircle2 className="h-3 w-3" />}
                                    {l.alertStatus}
                                  </span>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={7} className="text-center py-10 text-zinc-400">No margins records found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}

                  {/* ------------------ Audit Trail Logs Table ------------------ */}
                  {selectedReportType === 'audit-log' && (
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60">
                        <TableRow>
                          <TableHead className="w-[100px]">Action</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Invoice Reference</TableHead>
                          <TableHead>Audit Values History</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAuditLog.length > 0 ? (
                          filteredAuditLog.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell>
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider ${
                                  a.actionType === 'INSERT' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30' :
                                  a.actionType === 'UPDATE' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30' :
                                  'bg-rose-50 text-rose-700 dark:bg-rose-950/30'
                                }`}>
                                  {a.actionType}
                                </span>
                              </TableCell>
                              <TableCell className="font-semibold">{a.changedByUsername}</TableCell>
                              <TableCell className="text-xs text-zinc-500">{new Date(a.changedAt).toLocaleString()}</TableCell>
                              <TableCell className="font-mono text-xs">{a.referenceNo}</TableCell>
                              <TableCell className="max-w-[300px]">
                                <div className="text-[10px] space-y-1">
                                  {a.oldValues && <div className="text-rose-600 truncate"><span className="font-semibold uppercase">Old:</span> {a.oldValues}</div>}
                                  {a.newValues && <div className="text-emerald-600 truncate"><span className="font-semibold uppercase">New:</span> {a.newValues}</div>}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={5} className="text-center py-10 text-zinc-400">No modification trail logs recorded yet</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
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
