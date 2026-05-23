import { useEffect, useState, useMemo } from 'react';
import { 
  Warehouse, 
  Search, 
  RefreshCw, 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle
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

import type { InventoryStatusDto } from '@/types/InventoryStatusDto';

interface GroupedProductStock {
  productId: string;
  productName: string;
  productCode: string;
  sku?: string;
  minStock: number;
  stocks: Record<string, number>; // Maps warehouseId -> currentStock
  totalStock: number;
}

export default function InventoryStatus() {
  const { canView } = usePermissions('/product');

  // Core Data States
  const [statusData, setStatusData] = useState<InventoryStatusDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all'); // 'all', 'low', 'out', 'ok'

  // Search & Pagination States
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const resStatus: any = await axiosClient.get('/Inventory/Status');
      if (resStatus?.success) {
        setStatusData(resStatus.data || []);
      }
    } catch (e) {
      console.error('Failed to load inventory status', e);
      toast.error('Failed to load real-time stock ledger.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchData();
    }
  }, [canView]);

  // Extract all unique warehouses represented in the data
  const warehouses = useMemo(() => {
    const map = new Map<string, string>();
    statusData.forEach(item => {
      map.set(item.warehouseId, item.warehouseName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [statusData]);

  // Group raw rows (product-warehouse pairs) into product-centric rows with warehouse stocks mapping
  const groupedStocks = useMemo(() => {
    const map = new Map<string, GroupedProductStock>();
    
    statusData.forEach(item => {
      if (!map.has(item.productId)) {
        map.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          sku: item.sku,
          minStock: item.minStock,
          stocks: {},
          totalStock: 0
        });
      }
      
      const entry = map.get(item.productId)!;
      entry.stocks[item.warehouseId] = item.currentStock;
      entry.totalStock += item.currentStock;
    });

    return Array.from(map.values());
  }, [statusData]);

  // Filter products client-side
  const filteredStocks = useMemo(() => {
    return groupedStocks.filter(item => {
      // 1. Search term match
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        item.productName.toLowerCase().includes(searchLower) ||
        item.productCode.toLowerCase().includes(searchLower) ||
        (item.sku && item.sku.toLowerCase().includes(searchLower));

      // 2. Category match (Note: requires matching product category, we can add a check if needed, but since we filter primarily on stock status and search, we filter on those)
      
      // 3. Stock Alert level filter
      let matchesStatus = true;
      if (stockStatusFilter === 'out') {
        matchesStatus = item.totalStock <= 0;
      } else if (stockStatusFilter === 'low') {
        matchesStatus = item.totalStock > 0 && item.totalStock < item.minStock;
      } else if (stockStatusFilter === 'ok') {
        matchesStatus = item.totalStock >= item.minStock;
      }

      return matchesSearch && matchesStatus;
    });
  }, [groupedStocks, search, stockStatusFilter]);

  // Pagination
  const totalCount = filteredStocks.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedStocks = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredStocks.slice(start, start + pageSize);
  }, [filteredStocks, pageNumber, pageSize]);

  useEffect(() => {
    setPageNumber(1);
  }, [search, stockStatusFilter, pageSize]);

  // Highlight widgets details
  const widgets = useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let healthyStock = 0;

    groupedStocks.forEach(item => {
      if (item.totalStock <= 0) outOfStock++;
      else if (item.totalStock < item.minStock) lowStock++;
      else healthyStock++;
    });

    return { outOfStock, lowStock, healthyStock, totalProducts: groupedStocks.length };
  }, [groupedStocks]);

  if (!canView) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view inventory modules.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Ledger</h1>
          <p className="text-muted-foreground mt-1">Real-time stock status matrix across all active warehouses.</p>
        </div>
      </div>

      {/* Widget Cards for Quick Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
            <Warehouse className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{widgets.totalProducts}</div>
            <div className="text-xs text-muted-foreground">Total SKU Catalogued</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{widgets.healthyStock}</div>
            <div className="text-xs text-muted-foreground">Sufficient Stock Items</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">{widgets.lowStock}</div>
            <div className="text-xs text-muted-foreground">Below Safety Stock Limit</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-red-600 dark:text-red-400">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{widgets.outOfStock}</div>
            <div className="text-xs text-muted-foreground">Out of Stock Items</div>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <Section className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs mb-6">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search product code/SKU/name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Stock Level Alert</span>
            <Select
              value={stockStatusFilter}
              onValueChange={setStockStatusFilter}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="ok">Sufficient Stock</SelectItem>
                <SelectItem value="low">Low Stock Alert</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="icon" onClick={fetchData} className="h-9 w-9" title="Refresh data">
            <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </Section>

      {/* Grid Stock Status Table */}
      <Section className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[60px]">Sr.</TableHead>
                <TableHead className="w-[220px]">Product Information</TableHead>
                <TableHead className="w-[100px] text-right">Min Stock</TableHead>
                
                {/* Dynamically render header columns for each warehouse */}
                {warehouses.map(wh => (
                  <TableHead key={wh.id} className="text-right w-[130px] font-medium text-zinc-800 dark:text-zinc-200">
                    {wh.name}
                  </TableHead>
                ))}
                
                <TableHead className="w-[120px] text-right font-bold text-zinc-900 dark:text-zinc-50">Total Stock</TableHead>
                <TableHead className="w-[120px] text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5 + warehouses.length} className="h-48 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-2 block">Calculating real-time ledger records...</span>
                  </TableCell>
                </TableRow>
              ) : paginatedStocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5 + warehouses.length} className="h-28 text-center text-muted-foreground">
                    No products matching your search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStocks.map((item, index) => {
                  const isOut = item.totalStock <= 0;
                  const isLow = !isOut && item.totalStock < item.minStock;
                  return (
                    <TableRow key={item.productId} className={isOut ? 'bg-red-500/5' : isLow ? 'bg-amber-500/5' : ''}>
                      <TableCell className="font-mono text-xs">{(pageNumber - 1) * pageSize + index + 1}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm">{item.productName}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                          <span>Code: {item.productCode}</span>
                          {item.sku && <span>• SKU: {item.sku}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {item.minStock?.toFixed(2) || '0.00'}
                      </TableCell>

                      {/* Render stock in each warehouse column */}
                      {warehouses.map(wh => {
                        const stock = item.stocks[wh.id] || 0;
                        return (
                          <TableCell key={wh.id} className="text-right font-mono text-xs">
                            <span className={stock <= 0 ? 'text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}>
                              {stock.toFixed(2)}
                            </span>
                          </TableCell>
                        );
                      })}

                      <TableCell className="text-right font-mono text-sm font-bold">
                        <span className={isOut ? 'text-red-500' : isLow ? 'text-amber-550 dark:text-amber-400' : 'text-zinc-900 dark:text-zinc-50'}>
                          {item.totalStock.toFixed(2)}
                        </span>
                      </TableCell>
                      
                      <TableCell className="text-center align-middle">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isOut 
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400' 
                            : isLow 
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-955/20 dark:text-amber-400' 
                              : 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                        }`}>
                          {isOut ? (
                            <>
                              <XCircle className="h-3 w-3" /> Out of Stock
                            </>
                          ) : isLow ? (
                            <>
                              <AlertTriangle className="h-3 w-3 animate-pulse" /> Low Stock
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3" /> Healthy
                            </>
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
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
    </Page>
  );
}
