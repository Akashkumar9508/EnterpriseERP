import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Coins,
  Users,
  AlertTriangle,
  Clock,
  RefreshCw,
  Warehouse as WarehouseIcon,
  Percent,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  Truck,
  Building
} from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart,
  Area,
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
import { usePermissions } from '@/hooks/usePermissions';
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';

// Interfaces mapping to backend DTOs
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

interface ProductWiseReport {
  productId: string;
  productName: string;
  productCode: string;
  sku?: string;
  quantityPurchased: number;
  averagePurchasePrice: number;
  latestPurchaseRate: number;
  unitName?: string;
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
  unitName?: string;
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
}

// Sales interfaces mapping to backend DTOs
interface CustomerSummary {
  customerId: string;
  customerName: string;
  totalAmount: number;
  totalTax: number;
  dueAmount: number;
}

interface SalesMonthlySummary {
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
  monthlySummaries: SalesMonthlySummary[];
}

interface SalesProductWiseReport {
  productId: string;
  productName: string;
  productCode: string;
  sku?: string;
  quantitySold: number;
  averageSalesPrice: number;
  latestSalesRate: number;
  unitName?: string;
}

interface SalesInvoiceWiseReport {
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
}

interface PurchaseReturnReport {
  id: string;
  returnNo: string;
  returnDate: string;
  supplierName: string;
  invoiceNo?: string;
  totalAmount: number;
}

interface SalesReturnReport {
  id: string;
  returnNo: string;
  returnDate: string;
  customerName: string;
  invoiceNo?: string;
  totalAmount: number;
}

interface LowStockProduct {
  productId: string;
  productName: string;
  productCode: string;
  sku?: string;
  minStock: number;
  currentStock: number;
  defaultRate: number;
  unitName?: string;
}

interface LookupItem {
  id: string;
  name: string;
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
  taxProfileSummaries?: TaxProfileSummary[];
}


export default function PurchaseDashboard() {
  usePermissions('Manage PurchaseDashboard');
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();

  // Active Tab state
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Sub-tab state for Recent Invoices / Returns
  const [recentInvoiceTab, setRecentInvoiceTab] = useState<'purchases' | 'sales' | 'purchase-returns' | 'sales-returns'>('purchases');

  // Filters State
  const [warehouseId, setWarehouseId] = useState<string>(user?.warehouseId || 'all');

  useEffect(() => {
    if (user?.warehouseId) {
      setWarehouseId(user.warehouseId);
    }
  }, [user?.warehouseId]);

  // Dropdown data
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

  // Main reports & counts data
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<PurchaseSummaryReport | null>(null);
  const [productData, setProductData] = useState<ProductWiseReport[]>([]);
  const [expiryData, setExpiryData] = useState<ExpiryReport[]>([]);
  const [lowMarginData, setLowMarginData] = useState<LowMarginReport[]>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceWiseReport[]>([]);

  // Sales reports & counts data
  const [salesSummary, setSalesSummary] = useState<SalesSummaryReport | null>(null);
  const [salesProductData, setSalesProductData] = useState<SalesProductWiseReport[]>([]);
  const [salesInvoiceData, setSalesInvoiceData] = useState<SalesInvoiceWiseReport[]>([]);
  const [customerCount, setCustomerCount] = useState<number>(0);

  // Returns & Low Stock states
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturnReport[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturnReport[]>([]);
  const [lowStockData, setLowStockData] = useState<LowStockProduct[]>([]);

  // Tax reports states
  const [purchaseTax, setPurchaseTax] = useState<TaxReport | null>(null);
  const [salesTax, setSalesTax] = useState<TaxReport | null>(null);


  // Global ERP Counts
  const [productCount, setProductCount] = useState<number>(0);
  const [supplierCount, setSupplierCount] = useState<number>(0);
  const [warehouseCount, setWarehouseCount] = useState<number>(0);

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
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
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

  // Load warehouses lookup
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res: any = await axiosClient.get('/Warehouse', { params: { pageNumber: 1, pageSize: 10000 } });
        if (res?.success) {
          setWarehouses(res.data?.items || res.data || []);
        }
      } catch (err) {
        console.error('Failed to load warehouses', err);
      }
    };
    fetchWarehouses();
  }, []);

  // Main fetch function
  const fetchDashboardData = async () => {
    setIsLoading(true);
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (warehouseId && warehouseId !== 'all') queryParams.append('warehouseId', warehouseId);

    const queryStr = `?${queryParams.toString()}`;

    try {
      const [
        resSummary,
        resProducts,
        resExpiry,
        resLowMargin,
        resAllProducts,
        resAllSuppliers,
        resAllWarehouses,
        resInvoices,
        resSalesSummary,
        resSalesProducts,
        resSalesInvoices,
        resAllCustomers,
        resPurchaseReturns,
        resSalesReturns,
        resLowStock,
        resPurchaseTax,
        resSalesTax
      ] = await Promise.all([
        axiosClient.get(`/PurchaseReport/Summary${queryStr}`),
        axiosClient.get(`/PurchaseReport/ProductWise${queryStr}`),
        axiosClient.get(`/PurchaseReport/Expiry${warehouseId !== 'all' ? `?warehouseId=${warehouseId}` : ''}`),
        axiosClient.get(`/PurchaseReport/LowMargin`),
        axiosClient.get('/Product', { params: { pageNumber: 1, pageSize: 1 } }),
        axiosClient.get('/Supplier', { params: { pageNumber: 1, pageSize: 1 } }),
        axiosClient.get('/Warehouse', { params: { pageNumber: 1, pageSize: 1 } }),
        axiosClient.get(`/PurchaseReport/InvoiceWise${queryStr}`),
        axiosClient.get(`/SalesReport/Summary${queryStr}`),
        axiosClient.get(`/SalesReport/ProductWise${queryStr}`),
        axiosClient.get(`/SalesReport/InvoiceWise${queryStr}`),
        axiosClient.get('/Customer', { params: { pageNumber: 1, pageSize: 1 } }),
        axiosClient.get(`/PurchaseReport/Returns${queryStr}`),
        axiosClient.get(`/SalesReport/Returns${queryStr}`),
        axiosClient.get('/PurchaseOrder/low-stock', { params: { companyId: user?.companyId || 'F6579BDB-C05B-4AF0-9404-7EBC3C15B0D8', warehouseId: warehouseId !== 'all' ? warehouseId : undefined } }),
        axiosClient.get(`/PurchaseReport/Tax${queryStr}`),
        axiosClient.get(`/SalesReport/Tax${queryStr}`)
      ]) as [any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any];

      if (resSummary?.success) setSummaryData(resSummary.data);
      if (resProducts?.success) setProductData(resProducts.data || []);
      if (resExpiry?.success) setExpiryData(resExpiry.data || []);
      if (resLowMargin?.success) setLowMarginData(resLowMargin.data || []);
      if (resAllProducts?.success) setProductCount(resAllProducts.data?.totalCount ?? resAllProducts.data?.items?.length ?? resAllProducts.data?.length ?? 0);
      if (resAllSuppliers?.success) setSupplierCount(resAllSuppliers.data?.totalCount ?? resAllSuppliers.data?.items?.length ?? resAllSuppliers.data?.length ?? 0);
      if (resAllWarehouses?.success) setWarehouseCount(resAllWarehouses.data?.totalCount ?? resAllWarehouses.data?.items?.length ?? resAllWarehouses.data?.length ?? 0);
      if (resInvoices?.success) setInvoiceData(resInvoices.data || []);

      if (resSalesSummary?.success) setSalesSummary(resSalesSummary.data);
      if (resSalesProducts?.success) setSalesProductData(resSalesProducts.data || []);
      if (resSalesInvoices?.success) setSalesInvoiceData(resSalesInvoices.data || []);
      if (resAllCustomers?.success) setCustomerCount(resAllCustomers.data?.totalCount ?? resAllCustomers.data?.items?.length ?? resAllCustomers.data?.length ?? 0);

      if (resPurchaseReturns?.success) setPurchaseReturns(resPurchaseReturns.data || []);
      if (resSalesReturns?.success) setSalesReturns(resSalesReturns.data || []);
      if (resLowStock?.success) setLowStockData(resLowStock.data || []);
      if (resPurchaseTax?.success) setPurchaseTax(resPurchaseTax.data);
      if (resSalesTax?.success) setSalesTax(resSalesTax.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      toast.error('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch on filter changes
  useEffect(() => {
    if (startDate && endDate) {
      fetchDashboardData();
    }
  }, [startDate, endDate, warehouseId]);

  // Formatting helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Chart preparation
  const monthlyTrendData = useMemo(() => {
    if (!summaryData?.monthlySummaries) return [];
    return [...summaryData.monthlySummaries].reverse().map(m => ({
      Month: m.monthName,
      Amount: m.totalAmount,
      Invoices: m.invoiceCount
    }));
  }, [summaryData]);

  const supplierBreakdownData = useMemo(() => {
    if (!summaryData?.supplierWiseTotals) return [];
    return summaryData.supplierWiseTotals.slice(0, 5).map(s => ({
      name: s.supplierName,
      value: s.totalAmount
    }));
  }, [summaryData]);

  const topProductsData = useMemo(() => {
    return productData.slice(0, 5).map(p => ({
      Product: p.productName.length > 16 ? `${p.productName.substring(0, 16)}...` : p.productName,
      Quantity: p.quantityPurchased
    }));
  }, [productData]);

  const chartPaymentStatusData = useMemo(() => {
    if (!summaryData) return [];
    const total = summaryData.totalAmount;
    const unpaid = summaryData.pendingPayments;
    const paid = Math.max(0, total - unpaid);
    return [
      { name: 'Paid Amount', value: paid, color: '#10b981' },
      { name: 'Unpaid Amount', value: unpaid, color: '#ef4444' }
    ];
  }, [summaryData]);

  // Sales Chart preparation
  const salesMonthlyTrendData = useMemo(() => {
    if (!salesSummary?.monthlySummaries) return [];
    return [...salesSummary.monthlySummaries].reverse().map(m => ({
      Month: m.monthName,
      Amount: m.totalAmount,
      Invoices: m.invoiceCount
    }));
  }, [salesSummary]);

  const customerBreakdownData = useMemo(() => {
    if (!salesSummary?.customerWiseTotals) return [];
    return salesSummary.customerWiseTotals.slice(0, 5).map(s => ({
      name: s.customerName,
      value: s.totalAmount
    }));
  }, [salesSummary]);

  const salesTopProductsData = useMemo(() => {
    if (!salesProductData) return [];
    return salesProductData.slice(0, 5).map(p => ({
      Product: p.productName.length > 16 ? `${p.productName.substring(0, 16)}...` : p.productName,
      Quantity: p.quantitySold
    }));
  }, [salesProductData]);

  const salesPaymentStatusData = useMemo(() => {
    if (!salesSummary) return [];
    const total = salesSummary.totalAmount;
    const unpaid = salesSummary.pendingPayments;
    const paid = Math.max(0, total - unpaid);
    return [
      { name: 'Paid Amount', value: paid, color: '#10b981' },
      { name: 'Unpaid Amount', value: unpaid, color: '#ef4444' }
    ];
  }, [salesSummary]);

  const combinedMonthlyTrendData = useMemo(() => {
    const purchaseSummaries = summaryData?.monthlySummaries || [];
    const salesSummaries = salesSummary?.monthlySummaries || [];
    const map = new Map<string, { Month: string; Purchases: number; Sales: number }>();
    purchaseSummaries.forEach(p => {
      const key = `${p.year}-${p.month}`;
      map.set(key, { Month: p.monthName, Purchases: p.totalAmount, Sales: 0 });
    });
    salesSummaries.forEach(s => {
      const key = `${s.year}-${s.month}`;
      if (map.has(key)) {
        map.get(key)!.Sales = s.totalAmount;
      } else {
        map.set(key, { Month: s.monthName, Purchases: 0, Sales: s.totalAmount });
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => {
        const [yearA, monthA] = a[0].split('-').map(Number);
        const [yearB, monthB] = b[0].split('-').map(Number);
        return yearA !== yearB ? yearA - yearB : monthA - monthB;
      })
      .map(([_, val]) => val);
  }, [summaryData, salesSummary]);

  const topSuppliersDues = useMemo(() => {
    if (!summaryData?.supplierWiseTotals) return [];
    return [...summaryData.supplierWiseTotals]
      .filter(s => s.dueAmount > 0)
      .sort((a, b) => b.dueAmount - a.dueAmount)
      .slice(0, 5);
  }, [summaryData]);

  const topCustomersDues = useMemo(() => {
    if (!salesSummary?.customerWiseTotals) return [];
    return [...salesSummary.customerWiseTotals]
      .filter(c => c.dueAmount > 0)
      .sort((a, b) => b.dueAmount - a.dueAmount)
      .slice(0, 5);
  }, [salesSummary]);

  const topPurchasedProducts = useMemo(() => {
    return [...productData]
      .sort((a, b) => b.quantityPurchased - a.quantityPurchased)
      .slice(0, 5);
  }, [productData]);

  const topSoldProducts = useMemo(() => {
    return [...salesProductData]
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);
  }, [salesProductData]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

  return (
    <Page className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 rounded-2xl border border-zinc-700/30 text-white shadow-xl dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl">
            <LayoutDashboard className="h-7 w-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Enterprise Dashboard</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Real-time system overview, business KPIs, billing trends, and alerts.</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Warehouse */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm">
            <WarehouseIcon className="h-4 w-4 text-indigo-400" />
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="bg-transparent border-none text-white outline-none cursor-pointer pr-1 text-xs"
              disabled={!!user?.warehouseId}
            >
              {!user?.warehouseId && <option value="all" className="bg-zinc-800 text-white">All Warehouses</option>}
              {filteredWarehouses.map(w => (
                <option key={w.id} value={w.id} className="bg-zinc-800 text-white">{w.name}</option>
              ))}
            </select>
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/10 text-xs">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this-week', label: 'Week' },
              { id: 'this-month', label: 'Month' },
              { id: 'this-year', label: 'Year' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer font-medium ${datePreset === p.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-white cursor-pointer"
            onClick={fetchDashboardData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs list */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <TabsList className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 p-1 rounded-lg w-fit mb-0">
            <TabsTrigger value="overview" className="cursor-pointer font-bold px-4 py-2 text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="purchases" className="cursor-pointer font-bold px-4 py-2 text-xs">
              Purchase Analytics
            </TabsTrigger>
            <TabsTrigger value="sales" className="cursor-pointer font-bold px-4 py-2 text-xs">
              Sales Analytics
            </TabsTrigger>
            <TabsTrigger value="alerts" className="cursor-pointer font-bold px-4 py-2 text-xs">
              Inventory & Alerts
            </TabsTrigger>
          </TabsList>

          {/* Quick Actions Shortcuts in one line */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => navigate('/sales-invoice/create')}
              size="sm"
              variant="outline"
              className="border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
              <span>New Sale</span>
            </Button>
            <Button
              onClick={() => navigate('/purchase-invoice/create')}
              size="sm"
              variant="outline"
              className="border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Coins className="h-3.5 w-3.5 text-indigo-500" />
              <span>New Purchase</span>
            </Button>
            <Button
              onClick={() => navigate('/stock-adjustment')}
              size="sm"
              variant="outline"
              className="border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Boxes className="h-3.5 w-3.5 text-emerald-500" />
              <span>Stock Adjust</span>
            </Button>
            <Button
              onClick={() => navigate('/sales-reports')}
              size="sm"
              variant="outline"
              className="border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileText className="h-3.5 w-3.5 text-amber-500" />
              <span>Sales Reports</span>
            </Button>
          </div>
        </div>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 outline-hidden">
          {/* General Overview Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
            {/* Card 1: Total Purchases */}
            <Card className="relative overflow-hidden border border-zinc-200/60 shadow-xs hover:shadow-md hover:scale-[1.01] transition-all duration-300 dark:border-white/5 bg-white dark:bg-zinc-900">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Total Purchases</span>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg">
                  <Coins className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{formatCurrency(summaryData?.totalAmount || 0)}</div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-md">
                    {summaryData?.totalPurchases || 0} Invoices
                  </span>
                  <span className="text-muted-foreground">received</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Total Sales */}
            <Card className="relative overflow-hidden border border-zinc-200/60 shadow-xs hover:shadow-md hover:scale-[1.01] transition-all duration-300 dark:border-white/5 bg-white dark:bg-zinc-900">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Total Sales</span>
                <div className="p-2 bg-violet-50 dark:bg-violet-950/40 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{formatCurrency(salesSummary?.totalAmount || 0)}</div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <span className="bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300 font-semibold px-2 py-0.5 rounded-md">
                    {salesSummary?.totalSales || 0} Invoices
                  </span>
                  <span className="text-muted-foreground">sold</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Total Products */}
            <Card className="relative overflow-hidden border border-zinc-200/60 shadow-xs hover:shadow-md hover:scale-[1.01] transition-all duration-300 dark:border-white/5 bg-white dark:bg-zinc-900">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Total Products</span>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                  <Boxes className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{productCount}</div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-md">
                    Active Catalog
                  </span>
                  <span className="text-muted-foreground">items</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Active Suppliers */}
            <Card className="relative overflow-hidden border border-zinc-200/60 shadow-xs hover:shadow-md hover:scale-[1.01] transition-all duration-300 dark:border-white/5 bg-white dark:bg-zinc-900">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Active Suppliers</span>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
                  <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{supplierCount}</div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <span className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-md">
                    Vendors
                  </span>
                  <span className="text-muted-foreground">active</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: Active Customers */}
            <Card className="relative overflow-hidden border border-zinc-200/60 shadow-xs hover:shadow-md hover:scale-[1.01] transition-all duration-300 dark:border-white/5 bg-white dark:bg-zinc-900">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Active Customers</span>
                <div className="p-2 bg-sky-50 dark:bg-sky-950/40 rounded-lg">
                  <Users className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{customerCount}</div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <span className="bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-semibold px-2 py-0.5 rounded-md">
                    Clients
                  </span>
                  <span className="text-muted-foreground">active</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 6: Total Warehouses */}
            <Card className="relative overflow-hidden border border-zinc-200/60 shadow-xs hover:shadow-md hover:scale-[1.01] transition-all duration-300 dark:border-white/5 bg-white dark:bg-zinc-900">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Total Warehouses</span>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg">
                  <Building className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{warehouseCount}</div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <span className="bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold px-2 py-0.5 rounded-md">
                    Depots
                  </span>
                  <span className="text-muted-foreground">active store locations</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Combined Trend Area Chart & GST Tax Overview Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Combined Trend Area Chart (Spans 2 cols) */}
            <Card className="lg:col-span-2 border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                    <TrendingUp className="h-4.5 w-4.5 text-indigo-500" /> Cash Flow Monthly Trend
                  </CardTitle>
                  <CardDescription className="text-xs">Compare monthly total Sales vs Purchases.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  {combinedMonthlyTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={combinedMonthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCombinedSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorCombinedPurchases" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-white/5" />
                        <XAxis dataKey="Month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                        <ChartTooltip
                          contentStyle={{ background: '#18181b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                          formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                        <Area type="monotone" dataKey="Sales" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCombinedSales)" name="Sales" />
                        <Area type="monotone" dataKey="Purchases" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCombinedPurchases)" name="Purchases" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No trend data available for this range.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* GST / Tax Overview Card (Spans 1 col) */}
            <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                  <Percent className="h-4 w-4 text-violet-500" /> GST / Tax Summary
                </CardTitle>
                <CardDescription className="text-xs">GST collected on Sales vs paid on Purchases.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2.5">
                  {/* CGST */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>CGST</span>
                      <span className="text-[10px] text-muted-foreground">
                        Sales: {formatCurrency(salesTax?.cgst || 0)} | Purch: {formatCurrency(purchaseTax?.cgst || 0)}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden flex">
                      <div className="bg-violet-500 h-full" style={{ width: `${Math.min(100, ((salesTax?.cgst || 0) / (Math.max(1, (salesTax?.cgst || 0) + (purchaseTax?.cgst || 0)))) * 100)}%` }} />
                      <div className="bg-indigo-400 h-full" style={{ width: `${Math.min(100, ((purchaseTax?.cgst || 0) / (Math.max(1, (salesTax?.cgst || 0) + (purchaseTax?.cgst || 0)))) * 100)}%` }} />
                    </div>
                  </div>

                  {/* SGST */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>SGST</span>
                      <span className="text-[10px] text-muted-foreground">
                        Sales: {formatCurrency(salesTax?.sgst || 0)} | Purch: {formatCurrency(purchaseTax?.sgst || 0)}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden flex">
                      <div className="bg-violet-500 h-full" style={{ width: `${Math.min(100, ((salesTax?.sgst || 0) / (Math.max(1, (salesTax?.sgst || 0) + (purchaseTax?.sgst || 0)))) * 100)}%` }} />
                      <div className="bg-indigo-400 h-full" style={{ width: `${Math.min(100, ((purchaseTax?.sgst || 0) / (Math.max(1, (salesTax?.sgst || 0) + (purchaseTax?.sgst || 0)))) * 100)}%` }} />
                    </div>
                  </div>

                  {/* IGST */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>IGST</span>
                      <span className="text-[10px] text-muted-foreground">
                        Sales: {formatCurrency(salesTax?.igst || 0)} | Purch: {formatCurrency(purchaseTax?.igst || 0)}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden flex">
                      <div className="bg-violet-500 h-full" style={{ width: `${Math.min(100, ((salesTax?.igst || 0) / (Math.max(1, (salesTax?.igst || 0) + (purchaseTax?.igst || 0)))) * 100)}%` }} />
                      <div className="bg-indigo-400 h-full" style={{ width: `${Math.min(100, ((purchaseTax?.igst || 0) / (Math.max(1, (salesTax?.igst || 0) + (purchaseTax?.igst || 0)))) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Total Summary Block */}
                <div className="border-t border-zinc-100 dark:border-white/5 pt-3 space-y-2 mt-auto">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Output Tax (Sales):</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatCurrency(salesTax?.totalTax || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Input Tax (Purchases):</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatCurrency(purchaseTax?.totalTax || 0)}</span>
                  </div>
                  {(() => {
                    const netLiability = (salesTax?.totalTax || 0) - (purchaseTax?.totalTax || 0);
                    return (
                      <div className="flex justify-between items-center text-xs font-bold pt-1">
                        <span>Net Tax Liability:</span>
                        <span className={netLiability >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {formatCurrency(netLiability)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Performance Leaderboard & Outstanding Dues & Payments Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Leaderboard */}
            <Card className="lg:col-span-2 border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                    <Boxes className="h-4.5 w-4.5 text-emerald-500" /> Performance Leaderboard
                  </CardTitle>
                  <CardDescription className="text-xs">Top 5 sold products vs top 5 purchased products side-by-side.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top 5 Sold */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-violet-500" /> Top Sold Items
                    </h4>
                    {topSoldProducts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Qty Sold</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {topSoldProducts.map((p, index) => (
                              <TableRow key={p.productId} className="hover:bg-zinc-50 dark:hover:bg-white/5 border-zinc-100 dark:border-white/5">
                                <TableCell className="font-semibold py-2">
                                  <span className="text-muted-foreground mr-1.5">#{index + 1}</span>
                                  {p.productName}
                                </TableCell>
                                <TableCell className="text-right font-bold py-2">{p.quantitySold} {p.unitName || 'Units'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center text-muted-foreground text-xs">No sales volume data.</div>
                    )}
                  </div>

                  {/* Top 5 Purchased */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" /> Top Purchased Items
                    </h4>
                    {topPurchasedProducts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Qty Purchased</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {topPurchasedProducts.map((p, index) => (
                              <TableRow key={p.productId} className="hover:bg-zinc-50 dark:hover:bg-white/5 border-zinc-100 dark:border-white/5">
                                <TableCell className="font-semibold py-2">
                                  <span className="text-muted-foreground mr-1.5">#{index + 1}</span>
                                  {p.productName}
                                </TableCell>
                                <TableCell className="text-right font-bold py-2">{p.quantityPurchased} {p.unitName || 'Units'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center text-muted-foreground text-xs">No purchase volume data.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outstanding Dues & Payments Ledger Widget */}
            <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-500" /> Dues & Payments Ledger
                </CardTitle>
                <CardDescription className="text-xs">Critical collections due vs procurement payables.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 overflow-y-auto max-h-72">
                {/* Customer Dues (Inflows) */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Top Customer Dues (Receivable)
                  </h4>
                  {topCustomersDues.length > 0 ? (
                    <div className="space-y-1.5">
                      {topCustomersDues.map((c) => (
                        <div key={c.customerId} className="flex justify-between items-center text-xs p-1.5 bg-zinc-50 dark:bg-white/5 rounded-md">
                          <span className="truncate max-w-[140px] font-semibold text-zinc-700 dark:text-zinc-300">{c.customerName}</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(c.dueAmount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground py-1">No outstanding client receivables.</div>
                  )}
                </div>

                {/* Supplier Pending (Outflows) */}
                <div className="space-y-2 border-t border-zinc-100 dark:border-white/5 pt-3">
                  <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <Coins className="h-3 w-3" /> Top Vendor Payments (Payable)
                  </h4>
                  {topSuppliersDues.length > 0 ? (
                    <div className="space-y-1.5">
                      {topSuppliersDues.map((s) => (
                        <div key={s.supplierId} className="flex justify-between items-center text-xs p-1.5 bg-zinc-50 dark:bg-white/5 rounded-md">
                          <span className="truncate max-w-[140px] font-semibold text-zinc-700 dark:text-zinc-300">{s.supplierName}</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(s.dueAmount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground py-1">No outstanding supplier payables.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Invoices & Sidebar Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Invoices Tabbed Component (Spans 2 cols) */}
            <Card className="lg:col-span-2 border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-indigo-500" /> Recent Invoices & Returns
                  </CardTitle>
                  <CardDescription className="text-xs">Latest billing and return documents issued in the selected range.</CardDescription>
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 p-1 rounded-lg flex flex-wrap gap-1">
                  <button
                    onClick={() => setRecentInvoiceTab('purchases')}
                    className={`cursor-pointer font-semibold px-3 py-1.5 text-xs rounded-md transition-all ${
                      recentInvoiceTab === 'purchases'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                  >
                    Purchases
                  </button>
                  <button
                    onClick={() => setRecentInvoiceTab('sales')}
                    className={`cursor-pointer font-semibold px-3 py-1.5 text-xs rounded-md transition-all ${
                      recentInvoiceTab === 'sales'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                  >
                    Sales
                  </button>
                  <button
                    onClick={() => setRecentInvoiceTab('purchase-returns')}
                    className={`cursor-pointer font-semibold px-3 py-1.5 text-xs rounded-md transition-all ${
                      recentInvoiceTab === 'purchase-returns'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                  >
                    Purch. Returns
                  </button>
                  <button
                    onClick={() => setRecentInvoiceTab('sales-returns')}
                    className={`cursor-pointer font-semibold px-3 py-1.5 text-xs rounded-md transition-all ${
                      recentInvoiceTab === 'sales-returns'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                  >
                    Sales Returns
                  </button>
                </div>
              </CardHeader>

              <CardContent>
                {recentInvoiceTab === 'purchases' ? (
                  <div className="mt-0 outline-hidden">
                    {invoiceData.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Invoice No</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Supplier</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoiceData.slice(0, 5).map((inv) => (
                              <TableRow key={inv.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 border-zinc-100 dark:border-white/5">
                                <TableCell className="font-semibold text-indigo-600 dark:text-indigo-400">{inv.invoiceNo}</TableCell>
                                <TableCell>{new Date(inv.invoiceDate).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium text-zinc-700 dark:text-zinc-300">{inv.supplierName}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(inv.invoiceAmount)}</TableCell>
                                <TableCell className="text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    inv.paymentStatus?.toLowerCase() === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : inv.paymentStatus?.toLowerCase() === 'partially paid'
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                  }`}>
                                    {inv.paymentStatus || 'Unpaid'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center text-muted-foreground text-xs">No recent purchase invoices found.</div>
                    )}
                  </div>
                ) : recentInvoiceTab === 'sales' ? (
                  <div className="mt-0 outline-hidden">
                    {salesInvoiceData.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Invoice No</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {salesInvoiceData.slice(0, 5).map((inv) => (
                              <TableRow key={inv.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 border-zinc-100 dark:border-white/5">
                                <TableCell className="font-semibold text-violet-600 dark:text-violet-400">{inv.invoiceNo}</TableCell>
                                <TableCell>{new Date(inv.invoiceDate).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium text-zinc-700 dark:text-zinc-300">{inv.customerName}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(inv.invoiceAmount)}</TableCell>
                                <TableCell className="text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    inv.paymentStatus?.toLowerCase() === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : inv.paymentStatus?.toLowerCase() === 'partially paid'
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                  }`}>
                                    {inv.paymentStatus || 'Unpaid'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center text-muted-foreground text-xs">No recent sales invoices found.</div>
                    )}
                  </div>
                ) : recentInvoiceTab === 'purchase-returns' ? (
                  <div className="mt-0 outline-hidden">
                    {purchaseReturns.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Return No</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Supplier</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Orig Invoice</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchaseReturns.slice(0, 5).map((ret) => (
                              <TableRow key={ret.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 border-zinc-100 dark:border-white/5">
                                <TableCell className="font-semibold text-rose-600 dark:text-rose-400">{ret.returnNo}</TableCell>
                                <TableCell>{new Date(ret.returnDate).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium text-zinc-700 dark:text-zinc-300">{ret.supplierName}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(ret.totalAmount)}</TableCell>
                                <TableCell className="font-semibold text-indigo-600 dark:text-indigo-400">{ret.invoiceNo || 'N/A'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center text-muted-foreground text-xs">No recent purchase returns found.</div>
                    )}
                  </div>
                ) : (
                  <div className="mt-0 outline-hidden">
                    {salesReturns.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Return No</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Orig Invoice</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {salesReturns.slice(0, 5).map((ret) => (
                              <TableRow key={ret.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 border-zinc-100 dark:border-white/5">
                                <TableCell className="font-semibold text-violet-600 dark:text-violet-400">{ret.returnNo}</TableCell>
                                <TableCell>{new Date(ret.returnDate).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium text-zinc-700 dark:text-zinc-300">{ret.customerName}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(ret.totalAmount)}</TableCell>
                                <TableCell className="font-semibold text-violet-600 dark:text-violet-400">{ret.invoiceNo || 'N/A'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center text-muted-foreground text-xs">No recent sales returns found.</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sidebar Column: Profitability, Quick Actions, Warnings */}
            <div className="flex flex-col gap-6">
              {/* Card 1: Profitability Estimator */}
              <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                    <Percent className="h-4 w-4 text-emerald-500" /> Profitability Estimate
                  </CardTitle>
                  <CardDescription className="text-xs">Gross margin based on sales vs procurement amounts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Est. Sales Revenue:</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatCurrency(salesSummary?.totalAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Est. Purchase Cost:</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatCurrency(summaryData?.totalAmount || 0)}</span>
                  </div>
                  {(() => {
                    const estRev = salesSummary?.totalAmount || 0;
                    const estCos = summaryData?.totalAmount || 0;
                    const estProf = estRev - estCos;
                    const estMarg = estRev > 0 ? (estProf / estRev) * 100 : 0;
                    return (
                      <>
                        <div className="border-t border-zinc-100 dark:border-white/5 pt-2 flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Est. Gross Profit:</span>
                          <span className={`font-extrabold text-sm ${estProf >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatCurrency(estProf)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <span>Gross Margin</span>
                            <span className={estProf >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {estMarg.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${estProf >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, Math.max(0, estMarg))}%` }}
                            />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Card 3: Critical Warnings Alerts */}
              <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500" /> Critical Warnings
                  </CardTitle>
                  <CardDescription className="text-xs">Stocks and profit margin alerts needing attention.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Expiry Warning Count */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/30">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <div>
                        <div className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">Near Expiry Stocks</div>
                        <div className="text-[10px] text-muted-foreground">Expiring soon in inventory</div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{expiryData.length}</span>
                  </div>

                  {/* Low Margin Warning Count */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200/30">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      <div>
                        <div className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">Low Margin Warnings</div>
                        <div className="text-[10px] text-muted-foreground font-medium">Items with low profit margin</div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {lowMarginData.filter(i => i.alertStatus !== 'Healthy').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </TabsContent>

        {/* 2. PURCHASE ANALYTICS TAB */}
        <TabsContent value="purchases" className="space-y-6 outline-hidden">
          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend Area Chart (Spans 2 cols) */}
            <Card className="lg:col-span-2 border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">Monthly Purchase Trend</CardTitle>
                <CardDescription className="text-xs">Visual analytics of invoice amount vs count across billing months.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  {monthlyTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-white/5" />
                        <XAxis dataKey="Month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                        <ChartTooltip
                          contentStyle={{ background: '#18181b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                          formatter={(value: any) => [formatCurrency(Number(value)), 'Total Purchase']}
                        />
                        <Area type="monotone" dataKey="Amount" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAmount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No monthly trends data available for this range.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Balance Status (Spans 1 col) */}
            <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">Outstanding Balance</CardTitle>
                <CardDescription className="text-xs">Outstanding vs paid amounts for transactions.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <div className="h-56 w-full relative">
                  {summaryData?.totalAmount ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartPaymentStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartPaymentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          contentStyle={{ background: '#18181b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                          formatter={(v: any) => formatCurrency(Number(v))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No payment status data available.</div>
                  )}

                  {/* Central Text inside Pie */}
                  {summaryData?.totalAmount ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Unpaid</span>
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        {((summaryData.pendingPayments / summaryData.totalAmount) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Legend indicators */}
                <div className="w-full flex items-center justify-around mt-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-zinc-600 dark:text-zinc-400">Paid</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500" />
                    <span className="text-zinc-600 dark:text-zinc-400">Outstanding</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products & Suppliers breakdown charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Suppliers (Bar Chart) */}
            <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">Top 5 Suppliers</CardTitle>
                <CardDescription className="text-xs">Procurement volume breakdown by vendor.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  {supplierBreakdownData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={supplierBreakdownData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-white/5" horizontal={false} />
                        <XAxis type="number" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                        <YAxis dataKey="name" type="category" stroke="#888888" fontSize={10} width={80} tickLine={false} axisLine={false} />
                        <ChartTooltip
                          contentStyle={{ background: '#18181b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                          formatter={(v: any) => formatCurrency(Number(v))}
                        />
                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}>
                          {supplierBreakdownData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No vendor data available.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Products (Bar Chart) */}
            <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">Top 5 Products Purchased</CardTitle>
                <CardDescription className="text-xs">Volume statistics based on units purchased.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  {topProductsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProductsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-white/5" vertical={false} />
                        <XAxis dataKey="Product" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                        <ChartTooltip
                          contentStyle={{ background: '#18181b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                        />
                        <Bar dataKey="Quantity" fill="#10b981" radius={[4, 4, 0, 0]}>
                          {topProductsData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No product data available.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. SALES ANALYTICS TAB */}
        <TabsContent value="sales" className="space-y-6 outline-hidden">
          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend Area Chart (Spans 2 cols) */}
            <Card className="lg:col-span-2 border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">Monthly Sales Trend</CardTitle>
                <CardDescription className="text-xs">Visual analytics of invoice amount vs count across billing months.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  {salesMonthlyTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesMonthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSalesAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-white/5" />
                        <XAxis dataKey="Month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                        <ChartTooltip
                          contentStyle={{ background: '#18181b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                          formatter={(value: any) => [formatCurrency(Number(value)), 'Total Sales']}
                        />
                        <Area type="monotone" dataKey="Amount" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSalesAmount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No monthly trends data available for this range.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Balance Status (Spans 1 col) */}
            <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">Collection vs Dues Balance</CardTitle>
                <CardDescription className="text-xs">Outstanding vs collected amounts for transactions.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <div className="h-56 w-full relative">
                  {salesSummary?.totalAmount ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={salesPaymentStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {salesPaymentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          contentStyle={{ background: '#18181b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                          formatter={(v: any) => formatCurrency(Number(v))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No collection status data available.</div>
                  )}

                  {/* Central Text inside Pie */}
                  {salesSummary?.totalAmount ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Unpaid</span>
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        {((salesSummary.pendingPayments / salesSummary.totalAmount) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Legend indicators */}
                <div className="w-full flex items-center justify-around mt-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-zinc-600 dark:text-zinc-400">Collected</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500" />
                    <span className="text-zinc-600 dark:text-zinc-400">Outstanding</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products & Customers breakdown charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Customers (Bar Chart) */}
            <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">Top 5 Customers</CardTitle>
                <CardDescription className="text-xs">Sales volume breakdown by client.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  {customerBreakdownData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={customerBreakdownData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-white/5" horizontal={false} />
                        <XAxis type="number" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                        <YAxis dataKey="name" type="category" stroke="#888888" fontSize={10} width={80} tickLine={false} axisLine={false} />
                        <ChartTooltip
                          contentStyle={{ background: '#18181b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                          formatter={(v: any) => formatCurrency(Number(v))}
                        />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                          {customerBreakdownData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No customer data available.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Products Sold (Bar Chart) */}
            <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">Top 5 Products Sold</CardTitle>
                <CardDescription className="text-xs">Volume statistics based on units sold.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  {salesTopProductsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesTopProductsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-white/5" vertical={false} />
                        <XAxis dataKey="Product" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                        <ChartTooltip
                          contentStyle={{ background: '#18181b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                        />
                        <Bar dataKey="Quantity" fill="#10b981" radius={[4, 4, 0, 0]}>
                          {salesTopProductsData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No product data available.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. INVENTORY & ALERTS TAB */}
        <TabsContent value="alerts" className="space-y-6 outline-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Near Expiry Items Panel */}
            <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500 animate-pulse" /> Near Expiry / Expired Stocks
                  </CardTitle>
                  <CardDescription className="text-xs">Stocks needing immediate attention.</CardDescription>
                </div>
                {expiryData.length > 0 && (
                  <span className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-bold px-2 py-0.5 rounded-md text-xs">
                    {expiryData.length} Alerts
                  </span>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                {expiryData.length > 0 ? (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Product</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expiryData.map((e, idx) => (
                          <TableRow key={idx} className="hover:bg-zinc-50 dark:hover:bg-white/5 border-zinc-100 dark:border-white/5">
                            <TableCell className="font-medium">
                              <div>{e.productName}</div>
                              <div className="text-[10px] text-muted-foreground">{e.productCode}</div>
                            </TableCell>
                            <TableCell>{e.batchNumber}</TableCell>
                            <TableCell className="font-semibold text-rose-600 dark:text-rose-400">
                              {new Date(e.expiryDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right font-medium">{e.currentStock} {e.unitName || 'Units'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center text-muted-foreground text-xs">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                    No inventory near expiry or expired!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Low Margin Alerts Panel */}
            <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500" /> Low Margin Analysis
                  </CardTitle>
                  <CardDescription className="text-xs">Alerts on negative or low sales margins compared to procurement.</CardDescription>
                </div>
                {lowMarginData.filter(item => item.alertStatus !== 'Healthy').length > 0 && (
                  <span className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-bold px-2 py-0.5 rounded-md text-xs">
                    {lowMarginData.filter(item => item.alertStatus !== 'Healthy').length} Critical
                  </span>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                {lowMarginData.length > 0 ? (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Purchase Rate</TableHead>
                          <TableHead className="text-right">Sales Rate</TableHead>
                          <TableHead className="text-right">Margin (%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowMarginData.map((l, idx) => (
                          <TableRow key={idx} className="hover:bg-zinc-50 dark:hover:bg-white/5 border-zinc-100 dark:border-white/5">
                            <TableCell className="font-medium">
                              <div>{l.productName}</div>
                              <div className="text-[10px] text-muted-foreground">{l.productCode}</div>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(l.purchaseRate)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(l.salesRate)}</TableCell>
                            <TableCell className={`text-right font-bold ${l.marginPercent <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                              {l.marginPercent.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center text-muted-foreground text-xs">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                    All product sales margins are healthy!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Low Stock Reorder Alerts Panel */}
            <Card className="border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-xs flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" /> Low Stock Reorder Alerts
                  </CardTitle>
                  <CardDescription className="text-xs">Products that have fallen below safety/minimum stock levels.</CardDescription>
                </div>
                {lowStockData.length > 0 && (
                  <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-bold px-2 py-0.5 rounded-md text-xs">
                    {lowStockData.length} Reorder
                  </span>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                {lowStockData.length > 0 ? (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Min Stock</TableHead>
                          <TableHead className="text-right">Current Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStockData.map((s, idx) => (
                          <TableRow key={idx} className="hover:bg-zinc-50 dark:hover:bg-white/5 border-zinc-100 dark:border-white/5">
                            <TableCell className="font-medium">
                              <div>{s.productName}</div>
                              <div className="text-[10px] text-muted-foreground">{s.productCode}</div>
                            </TableCell>
                            <TableCell className="text-right">{s.minStock} {s.unitName || 'Units'}</TableCell>
                            <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400">
                              {s.currentStock} {s.unitName || 'Units'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center text-muted-foreground text-xs">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                    All catalog stocks are healthy!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </Page>
  );
}
