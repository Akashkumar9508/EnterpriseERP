import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Printer, 
  Search, 
  Package, 
  QrCode, 
  Loader2, 
  Plus, 
  Minus, 
  RefreshCw, 
  ArrowLeft,
  Settings2,
  Trash2
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { Page } from '@/components/ui/page';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import type { ProductDto } from '@/types/ProductDto';
import type { CategoryDto } from '@/types/CategoryDto';

interface SelectedProduct {
  product: ProductDto;
  quantity: number;
}

export default function GenerateBarcode() {
  const navigate = useNavigate();
  const { canView } = usePermissions('/generate-barcode');
  const user = useAppSelector((state) => state.auth.user);

  // Data states
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Selection and search states
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedProduct>>({});
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Barcode configuration states
  const [showName, setShowName] = useState(true);
  const [showCode, setShowCode] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [priceType, setPriceType] = useState<'mrp' | 'salesRate' | 'both'>('salesRate');
  const [showText, setShowText] = useState(true);
  const [barcodeHeight, setBarcodeHeight] = useState(60);
  const [barcodeWidth, setBarcodeWidth] = useState(2);
  const [gridColumns, setGridColumns] = useState(3);
  const [bulkQty, setBulkQty] = useState<number>(5);

  // Load products and categories
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resProducts, resCategories] = await Promise.all([
        axiosClient.get('/Product'),
        axiosClient.get('/Category'),
      ]) as any[];

      if (resProducts?.success) {
        setProducts(resProducts.data || []);
      }
      if (resCategories?.success) {
        setCategories(resCategories.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
      toast.error('Failed to load products and categories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchData();
    }
  }, [canView]);

  // Handle Quick Barcode Generation for a single product
  const handleGenerateBarcodeDirectly = async (p: ProductDto) => {
    const barcodeVal = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    const payload = {
      ...p,
      barcode: barcodeVal,
      companyId: user?.companyId || p.companyId,
      branchId: user?.branchId || p.branchId,
      productType: p.productType ? Number(p.productType) : 1,
      minStock: p.minStock ? Number(p.minStock) : 0,
      reorderLevel: p.reorderLevel ? Number(p.reorderLevel) : 0,
      purchaseRate: p.purchaseRate ? Number(p.purchaseRate) : 0,
      salesRate: p.salesRate ? Number(p.salesRate) : 0,
      mrp: p.mrp ? Number(p.mrp) : 0,
    };
    try {
      const response: any = await axiosClient.put('/Product', payload);
      if (response?.success) {
        toast.success(`Barcode generated successfully for ${p.name}!`);
        // Refresh products list
        const resProducts: any = await axiosClient.get('/Product');
        if (resProducts?.success) {
          const updatedProducts = resProducts.data || [];
          setProducts(updatedProducts);
          
          // If this product was selected, update its product reference in state
          const updatedProduct = updatedProducts.find((item: ProductDto) => item.id === p.id);
          if (updatedProduct && selectedItems[p.id!]) {
            setSelectedItems(prev => ({
              ...prev,
              [p.id!]: {
                ...prev[p.id!],
                product: updatedProduct
              }
            }));
          }
        }
      } else {
        toast.error(response?.message || 'Failed to update barcode');
      }
    } catch (error: any) {
      console.error('Failed to generate barcode', error);
      toast.error('An error occurred while generating barcode.');
    }
  };

  // Filter products client-side
  const filteredProducts = products.filter((p) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(searchLower) ||
      p.productCode.toLowerCase().includes(searchLower) ||
      (p.sku && p.sku.toLowerCase().includes(searchLower)) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchLower));

    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Client-side pagination
  const totalCount = filteredProducts.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedProducts = filteredProducts.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

  useEffect(() => {
    setPageNumber(1);
  }, [search, selectedCategory, pageSize]);

  // Handle individual selection toggle
  const handleToggleSelect = (p: ProductDto) => {
    if (!p.id) return;
    setSelectedItems((prev) => {
      const newItems = { ...prev };
      if (newItems[p.id!]) {
        delete newItems[p.id!];
      } else {
        newItems[p.id!] = {
          product: p,
          quantity: 1, // default quantity
        };
      }
      return newItems;
    });
  };

  // Handle quantity change
  const handleQuantityChange = (productId: string, qty: number) => {
    if (qty <= 0) {
      setSelectedItems((prev) => {
        const newItems = { ...prev };
        delete newItems[productId];
        return newItems;
      });
      return;
    }
    
    setSelectedItems((prev) => {
      if (!prev[productId]) {
        // If not selected, find product and select it
        const prod = products.find((p) => p.id === productId);
        if (!prod) return prev;
        return {
          ...prev,
          [productId]: { product: prod, quantity: qty }
        };
      }
      return {
        ...prev,
        [productId]: { ...prev[productId], quantity: qty }
      };
    });
  };

  // Select all visible products
  const handleSelectAll = (checked: boolean) => {
    setSelectedItems((prev) => {
      const newItems = { ...prev };
      paginatedProducts.forEach((p) => {
        if (!p.id) return;
        if (checked) {
          // Only add if not already selected to avoid overwriting quantity
          if (!newItems[p.id]) {
            newItems[p.id] = { product: p, quantity: 1 };
          }
        } else {
          delete newItems[p.id];
        }
      });
      return newItems;
    });
  };

  // Bulk set quantities for all selected
  const handleBulkSetQty = () => {
    if (bulkQty <= 0) {
      toast.error('Please enter a valid quantity.');
      return;
    }
    setSelectedItems((prev) => {
      const newItems = { ...prev };
      Object.keys(newItems).forEach((id) => {
        newItems[id].quantity = bulkQty;
      });
      return newItems;
    });
    toast.success(`Set quantity to ${bulkQty} for all selected items.`);
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedItems({});
    toast.success('Cleared all selections.');
  };

  // Generate helper to create dynamic Canvas data URLs for print window
  const getBarcodeDataUrl = (barcode: string) => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, barcode, {
        format: 'CODE128',
        lineColor: '#000',
        width: barcodeWidth,
        height: barcodeHeight,
        displayValue: showText,
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to generate preview image', err);
      return '';
    }
  };

  // Custom preview rendering hooks
  const PreviewLabel = ({ p, quantity }: { p: ProductDto; quantity: number }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      if (canvasRef.current && p.barcode) {
        try {
          JsBarcode(canvasRef.current, p.barcode, {
            format: 'CODE128',
            lineColor: '#000',
            width: barcodeWidth,
            height: barcodeHeight,
            displayValue: showText,
          });
        } catch (err) {
          console.error("Barcode preview fail", err);
        }
      }
    }, [p.barcode, barcodeHeight, barcodeWidth, showText]);

    let priceLabel = '';
    if (showPrice) {
      const mrpText = p.mrp && p.mrp > 0 ? `MRP: ₹${p.mrp.toFixed(2)}` : '';
      const rateText = p.salesRate && p.salesRate > 0 ? `Rate: ₹${p.salesRate.toFixed(2)}` : '';
      if (priceType === 'mrp') priceLabel = mrpText;
      else if (priceType === 'salesRate') priceLabel = rateText;
      else priceLabel = `${mrpText} ${rateText}`.trim();
    }

    return (
      <div className="border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded p-3 flex flex-col items-center justify-center text-center shadow-xs min-h-[130px] transition-colors relative">
        <span className="absolute top-1 right-1 text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-sm">
          {quantity}x
        </span>
        {showName && (
          <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate w-full px-1">
            {p.name}
          </div>
        )}
        {showCode && (
          <div className="text-[9px] text-zinc-500 font-mono mt-0.5 truncate w-full px-1">
            {p.productCode} {p.sku ? `(${p.sku})` : ''}
          </div>
        )}
        
        {p.barcode ? (
          <div className="my-1.5 flex justify-center max-w-full overflow-hidden">
            <canvas ref={canvasRef} className="max-h-[70px] max-w-full" />
          </div>
        ) : (
          <div className="text-[10px] text-red-500 font-semibold my-2">
            No Barcode Generated
          </div>
        )}

        {showPrice && priceLabel && (
          <div className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
            {priceLabel}
          </div>
        )}
      </div>
    );
  };

  // Perform layout print
  const handlePrintBarcodes = () => {
    const selectedList = Object.values(selectedItems).filter(item => item.product.barcode);
    
    if (selectedList.length === 0) {
      toast.error('No products with valid barcodes selected.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked! Please allow pop-ups to print barcodes.');
      return;
    }

    const title = 'Print Barcodes';
    
    // Generate barcodes and build cards
    let labelsHtml = '';
    selectedList.forEach(({ product, quantity }) => {
      const barcodeImgData = getBarcodeDataUrl(product.barcode!);
      
      const nameHtml = showName ? `<div class="label-name">${product.name}</div>` : '';
      const codeHtml = showCode ? `<div class="label-code">${product.productCode} ${product.sku ? `(${product.sku})` : ''}</div>` : '';
      
      let priceText = '';
      if (showPrice) {
        const mrpText = product.mrp && product.mrp > 0 ? `MRP: ₹${product.mrp.toFixed(2)}` : '';
        const rateText = product.salesRate && product.salesRate > 0 ? `Rate: ₹${product.salesRate.toFixed(2)}` : '';
        if (priceType === 'mrp') priceText = mrpText;
        else if (priceType === 'salesRate') priceText = rateText;
        else priceText = `${mrpText} ${rateText}`.trim();
      }
      const priceHtml = (showPrice && priceText) ? `<div class="label-price">${priceText}</div>` : '';

      for (let i = 0; i < quantity; i++) {
        labelsHtml += `
          <div class="barcode-card">
            ${nameHtml}
            ${codeHtml}
            <img src="${barcodeImgData}" class="barcode-img" />
            ${priceHtml}
          </div>
        `;
      }
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #fff;
              color: #000;
            }
            .grid-container {
              display: grid;
              grid-template-columns: repeat(${gridColumns}, 1fr);
              gap: 12px;
              width: 100%;
            }
            .barcode-card {
              border: 1px dashed #ccc;
              border-radius: 4px;
              padding: 8px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              box-sizing: border-box;
              background: #fff;
              page-break-inside: avoid;
              min-height: 120px;
            }
            .label-name {
              font-size: 10px;
              font-weight: bold;
              margin-bottom: 2px;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .label-code {
              font-size: 8px;
              color: #555;
              font-family: monospace;
              margin-bottom: 3px;
            }
            .barcode-img {
              max-width: 100%;
              height: auto;
              max-height: ${barcodeHeight}px;
              margin: 3px 0;
            }
            .label-price {
              font-size: 9px;
              font-weight: bold;
              margin-top: 2px;
            }
            @media print {
              .barcode-card {
                border: 1px solid #ddd;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="grid-container">
            ${labelsHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const selectedList = Object.values(selectedItems);
  const totalLabelsToPrint = selectedList.reduce((acc, curr) => acc + curr.quantity, 0);

  if (!canView) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view product catalog data.</p>
        </div>
      </Page>
    );
  }

  // Check if all visible paginated products are selected
  const areAllVisibleSelected = paginatedProducts.length > 0 && paginatedProducts.every((p) => p.id && selectedItems[p.id]);

  return (
    <Page>
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/product')}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-sm font-medium transition-colors mb-1 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </button>
          <h1 className="text-3xl font-bold tracking-tight">Barcode Generator</h1>
          <p className="text-muted-foreground mt-1">Select products, set layout configurations, and print labels in bulk.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Column: Product Selection & Settings (Spans 2 columns) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Filters Section */}
          <Section className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
              <Input
                type="search"
                placeholder="Search name, code, barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">Category</span>
                <Select
                  value={selectedCategory}
                  onValueChange={(val) => setSelectedCategory(val)}
                >
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id || ''}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="outline" 
                size="icon" 
                onClick={fetchData} 
                className="h-9 w-9" 
                title="Refresh Product List"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </Section>

          {/* Product Listing Table */}
          <Section className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <input
                        type="checkbox"
                        checked={areAllVisibleSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead className="w-[240px]">Product Details</TableHead>
                    <TableHead className="w-[160px]">Identifiers</TableHead>
                    <TableHead className="w-[120px] text-right">Pricing (₹)</TableHead>
                    <TableHead className="w-[150px] text-center">Print Qty</TableHead>
                    <TableHead className="w-[110px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-2 block">Loading catalog data...</span>
                      </TableCell>
                    </TableRow>
                  ) : paginatedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                        No matching products found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProducts.map((p) => {
                      const isSelected = !!p.id && !!selectedItems[p.id];
                      const currentQty = isSelected ? selectedItems[p.id!].quantity : 0;
                      return (
                        <TableRow key={p.id} className={isSelected ? 'bg-zinc-50/50 dark:bg-zinc-900/20' : ''}>
                          <TableCell className="text-center align-middle">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(p)}
                              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-2.5">
                              <Package className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-sm" title={p.name}>
                                  {p.name}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 flex gap-2">
                                  <span>Code: {p.productCode}</span>
                                  {p.sku && <span>• SKU: {p.sku}</span>}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {p.barcode ? (
                              <div className="flex items-center gap-1.5">
                                <QrCode className="h-4 w-4 text-zinc-500 shrink-0" />
                                <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300 font-semibold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                  {p.barcode}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-red-500 font-medium">No Barcode</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            <div className="font-semibold text-zinc-800 dark:text-zinc-200">Rate: ₹{p.salesRate?.toFixed(2) || '0.00'}</div>
                            {p.mrp && p.mrp > 0 ? (
                              <div className="text-[10px] text-muted-foreground mt-0.5">MRP: ₹{p.mrp.toFixed(2)}</div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-center align-middle">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 rounded-md"
                                onClick={() => handleQuantityChange(p.id!, currentQty - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <input
                                type="number"
                                min="0"
                                max="500"
                                value={currentQty || ''}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  handleQuantityChange(p.id!, isNaN(val) ? 0 : val);
                                }}
                                className="w-12 h-7 text-center rounded-md border border-zinc-200 bg-white text-zinc-900 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 font-mono"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 rounded-md"
                                onClick={() => handleQuantityChange(p.id!, currentQty + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {!p.barcode && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-950/10 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                onClick={() => handleGenerateBarcodeDirectly(p)}
                              >
                                + Barcode
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Selection Pagination */}
            {totalCount > 0 && (
              <div className="py-4 px-6 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
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

          {/* Bulk Selection Actions Panel */}
          {selectedList.length > 0 && (
            <Section className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/30 dark:border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Selected {selectedList.length} product(s) ({totalLabelsToPrint} labels)
                </span>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">Set Qty for selected:</span>
                  <input
                    type="number"
                    min="1"
                    value={bulkQty}
                    onChange={(e) => setBulkQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-14 h-8 text-center rounded border border-zinc-200 bg-white text-zinc-900 text-xs font-semibold focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                  <Button size="sm" onClick={handleBulkSetQty}>
                    Apply
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearAll} className="gap-1 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50/50">
                  <Trash2 className="h-4 w-4" /> Clear All
                </Button>
              </div>
            </Section>
          )}
        </div>

        {/* Right Column: Settings & Live Preview */}
        <div className="space-y-6">
          {/* Settings Panel */}
          <Section className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Settings2 className="h-5 w-5 text-zinc-500" />
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">Print Layout Settings</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Grid Columns</label>
                <Select
                  value={gridColumns.toString()}
                  onValueChange={(val) => setGridColumns(Number(val))}
                >
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue placeholder={gridColumns} />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((col) => (
                      <SelectItem key={col} value={col.toString()}>
                        {col} {col === 1 ? 'Column' : 'Cols'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Barcode Height (px)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="30"
                    max="120"
                    value={barcodeHeight}
                    onChange={(e) => setBarcodeHeight(Number(e.target.value))}
                    className="w-[100px] h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                  />
                  <span className="text-xs font-mono font-semibold w-8 text-right">{barcodeHeight}px</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Barcode Density</label>
                <Select
                  value={barcodeWidth.toString()}
                  onValueChange={(val) => setBarcodeWidth(Number(val))}
                >
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue placeholder={barcodeWidth} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Thin</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">Thick</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Label Contents</h3>
                
                <div className="flex items-center justify-between">
                  <label htmlFor="showName" className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">Show Product Name</label>
                  <Switch id="showName" checked={showName} onCheckedChange={setShowName} />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="showCode" className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">Show Product Code/SKU</label>
                  <Switch id="showCode" checked={showCode} onCheckedChange={setShowCode} />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="showText" className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">Show Barcode Value Text</label>
                  <Switch id="showText" checked={showText} onCheckedChange={setShowText} />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="showPrice" className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">Show Price Tags</label>
                  <Switch id="showPrice" checked={showPrice} onCheckedChange={setShowPrice} />
                </div>

                {showPrice && (
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-md border border-border">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Price Source</label>
                    <Select
                      value={priceType}
                      onValueChange={(val: any) => setPriceType(val)}
                    >
                      <SelectTrigger className="w-full h-7 text-xs">
                        <SelectValue placeholder="Price Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salesRate">Sales Rate only</SelectItem>
                        <SelectItem value="mrp">MRP only</SelectItem>
                        <SelectItem value="both">Both (MRP & Sales Rate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-2">
              <Button 
                onClick={handlePrintBarcodes} 
                className="w-full gap-2 text-sm h-11"
                disabled={selectedList.length === 0}
              >
                <Printer className="h-5 w-5" />
                Print Labels ({totalLabelsToPrint})
              </Button>
            </div>
          </Section>

          {/* Live Preview Panel */}
          <Section className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between pb-2 border-b border-border mb-4">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">Live Preview (A4 Sheet layout)</h2>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                Scale: 75%
              </span>
            </div>

            {selectedList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-zinc-50/50 dark:bg-zinc-950/20">
                <QrCode className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2 stroke-[1.5]" />
                <p className="text-sm font-semibold">No Labels Selected</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Check products and add quantities to generate a print layout preview.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[380px] p-1 border border-border bg-zinc-100/50 dark:bg-zinc-950/50 rounded-lg">
                <div 
                  className="grid gap-2 transform origin-top scale-[0.80] sm:scale-100"
                  style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
                >
                  {selectedList.map(({ product, quantity }) => (
                    <PreviewLabel key={product.id} p={product} quantity={quantity} />
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </Page>
  );
}
