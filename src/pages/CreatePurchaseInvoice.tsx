import { useEffect, useState, useMemo, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
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
  Check,
  X,
} from "lucide-react"
import { Page } from "@/components/ui/page"
import { Section } from "@/components/ui/section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import axiosClient from "@/Services/axiosClient"
import { usePermissions } from "@/hooks/usePermissions"
import { useAppSelector } from "@/store/hooks"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import QuickAddProductDialog from "@/components/QuickAddProductDialog"

import type { ProductDto } from "@/types/ProductDto"
import type { WarehouseDto } from "@/types/WarehouseDto"
import type { SupplierDto } from "@/types/SupplierDto"
import type { ProductVariantDto } from "@/types/ProductVariantDto"
import type { ProductBatchDto } from "@/types/ProductBatchDto"
import type { GstDto } from "@/types/GstDto"
import type { PurchaseInvoiceDto } from "@/types/PurchaseInvoiceDto"
import type { PurchaseInvoiceItemDto } from "@/types/PurchaseInvoiceItemDto"

interface PreviewHeader {
  supplierSearch: string
  supplierId: string
  warehouseSearch: string
  warehouseId: string
  invoiceNo: string
  invoiceDate: string
  referenceNo: string
  remarks: string
  errors: { 
    supplier?: string
    warehouse?: string
    invoiceNo?: string
    invoiceDate?: string
  }
}

interface PreviewItem {
  id: string
  productSearch: string
  productId: string
  productName: string
  productCode: string
  variantSearch: string
  productVariantId: string
  batchSearch: string
  productBatchId: string
  batchNumber?: string
  expiryDate?: string
  quantity: number
  freeQuantity: number
  purchaseRate: number
  mrp: number
  salesRate: number
  discountPercent: number
  taxPercent: number
  unitId?: string
  unitName?: string
  unitSymbol?: string
  conversionFactor?: number
  errors: {
    product?: string
    quantity?: string
    freeQuantity?: string
    purchaseRate?: string
    mrp?: string
    salesRate?: string
    discountPercent?: string
    taxPercent?: string
    variant?: string
    batch?: string
    duplicate?: string
    expiryDate?: string
  }
}

interface PaymentDetailItem {
  id: string
  paidAmount: number
  paymentMode: number
}

export default function CreatePurchaseInvoice() {
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id: string }>()
  const isEditMode = !!editId
  const { canCreate } = usePermissions("/purchase-invoice/create")
  const user = useAppSelector((state) => state.auth.user)

  // Edit-mode loading
  const [isLoadingEdit, setIsLoadingEdit] = useState(false)

  // dependencies lists
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([])
  const [products, setProducts] = useState<ProductDto[]>([])
  const [allVariants, setAllVariants] = useState<ProductVariantDto[]>([])
  const [allBatches, setAllBatches] = useState<ProductBatchDto[]>([])
  const [taxProfiles, setTaxProfiles] = useState<GstDto[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [inventoryStatus, setInventoryStatus] = useState<any[]>([])

  const [isLoadingDeps, setIsLoadingDeps] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // invoice master form state
  const [supplierId, setSupplierId] = useState("")
  const [supplierSearchText, setSupplierSearchText] = useState("")
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false)
  const [activeSupplierSearchIndex, setActiveSupplierSearchIndex] = useState(-1)
  const [warehouseId, setWarehouseId] = useState("")
  const [invoiceNo, setInvoiceNo] = useState("")
  const [referenceNo, setReferenceNo] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [remarks, setRemarks] = useState("")
  const [flatDiscountAmount, setFlatDiscountAmount] = useState(0)
  const [upfrontPayments, setUpfrontPayments] = useState<PaymentDetailItem[]>(
    []
  )
  const [currentPaidAmount, setCurrentPaidAmount] = useState<number>(0)
  const [currentPaymentMode, setCurrentPaymentMode] = useState<number>(1)

  // invoice details items state
  const [items, setItems] = useState<PurchaseInvoiceItemDto[]>([])

  // Quick product search state
  const [quickSearchText, setQuickSearchText] = useState("")
  const [quickSearchResults, setQuickSearchResults] = useState<ProductDto[]>([])
  const [isQuickSearching, setIsQuickSearching] = useState(false)
  const [activeQuickSearchIndex, setActiveQuickSearchIndex] = useState(-1)
  const quickSearchInputRef = useRef<HTMLInputElement>(null)

  // dialog product selection state
  const [selectingProductForIndex, setSelectingProductForIndex] = useState<
    number | null
  >(null)
  const [dialogSearch, setDialogSearch] = useState("")
  const [lookupProducts, setLookupProducts] = useState<ProductDto[]>([])
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)

  // Excel import state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewHeader, setPreviewHeader] = useState<PreviewHeader | null>(null)
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Quick product add state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [quickAddInitialName, setQuickAddInitialName] = useState("")
  const [quickAddTargetIndex, setQuickAddTargetIndex] = useState<number | null>(null)
  const [previewUpfrontPayments, setPreviewUpfrontPayments] = useState<
    PaymentDetailItem[]
  >([])
  const [previewCurrentPaidAmount, setPreviewCurrentPaidAmount] =
    useState<number>(0)
  const [previewCurrentPaymentMode, setPreviewCurrentPaymentMode] =
    useState<number>(1)

  // Excel import preview summary
  const previewSummary = useMemo(() => {
    let subTotal = 0
    let lineDiscountsSum = 0
    let totalTax = 0

    previewItems.forEach((item) => {
      const qty = Number(item.quantity) || 0
      const rate = Number(item.purchaseRate) || 0
      const discPct = Number(item.discountPercent) || 0
      const taxPct = Number(item.taxPercent) || 0

      const amount = qty * rate
      const discountAmount = Number((amount * (discPct / 100)).toFixed(2))
      const taxableAmount = amount - discountAmount
      const taxAmount = Number((taxableAmount * (taxPct / 100)).toFixed(2))

      subTotal += amount
      lineDiscountsSum += discountAmount
      totalTax += taxAmount
    })

    const netAmount = Number(
      (subTotal - lineDiscountsSum + totalTax).toFixed(2)
    )
    return {
      subTotal,
      discountAmount: lineDiscountsSum,
      taxAmount: totalTax,
      netAmount,
    }
  }, [previewItems])

  const previewTotalPaidUpfront = useMemo(() => {
    return previewUpfrontPayments.reduce((sum, p) => sum + p.paidAmount, 0)
  }, [previewUpfrontPayments])

  const previewRemainingPayable = useMemo(() => {
    return Number(
      (previewSummary.netAmount - previewTotalPaidUpfront).toFixed(2)
    )
  }, [previewSummary.netAmount, previewTotalPaidUpfront])

  const previewTotalPaidAmount = useMemo(() => {
    if (previewUpfrontPayments.length > 0) {
      return previewTotalPaidUpfront
    }
    return previewCurrentPaidAmount
  }, [
    previewUpfrontPayments,
    previewTotalPaidUpfront,
    previewCurrentPaidAmount,
  ])

  // Automatically adjust/clear preview paid amounts if the preview net amount decreases or is 0
  useEffect(() => {
    const net = previewSummary.netAmount
    if (net === 0) {
      if (previewCurrentPaidAmount !== 0) {
        setPreviewCurrentPaidAmount(0)
      }
      if (previewUpfrontPayments.length > 0) {
        setPreviewUpfrontPayments([])
      }
    } else {
      const totalSplit = previewUpfrontPayments.reduce((sum, p) => sum + p.paidAmount, 0)
      if (totalSplit > net) {
        if (previewUpfrontPayments.length > 0) {
          setPreviewUpfrontPayments([])
        }
        if (previewCurrentPaidAmount !== 0) {
          setPreviewCurrentPaidAmount(0)
        }
      } else {
        const targetPaid = Math.min(previewCurrentPaidAmount, net - totalSplit)
        if (previewCurrentPaidAmount !== targetPaid) {
          setPreviewCurrentPaidAmount(targetPaid)
        }
      }
    }
  }, [previewSummary.netAmount, previewUpfrontPayments, previewCurrentPaidAmount])

  // Keep previewCurrentPaidAmount in sync with previewRemainingPayable - Removed auto-sync to allow defaulting to unpaid (₹0)



  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchText.trim()) return suppliers
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(supplierSearchText.toLowerCase()) ||
        (s.phone && s.phone.includes(supplierSearchText))
    )
  }, [suppliers, supplierSearchText])

  const filteredWarehouses = useMemo(() => {
    if (user?.warehouseId) {
      return warehouses.filter((w) => w.id === user.warehouseId)
    }
    return warehouses
  }, [warehouses, user?.warehouseId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const container = document.getElementById("supplier-select-container")
      if (container && !container.contains(event.target as Node)) {
        setIsSupplierDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    // Focus on mount
    setTimeout(() => {
      quickSearchInputRef.current?.focus()
    }, 100)

    // Global keyboard listener to redirect typing to quick search
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.key === "Tab" ||
        e.key === "Enter" ||
        e.key === "Backspace" ||
        e.key === "Escape" ||
        e.key === "Shift"
      ) {
        return
      }

      const activeEl = document.activeElement
      const isInputActive =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "SELECT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")

      if (!isInputActive && quickSearchInputRef.current) {
        quickSearchInputRef.current.focus()
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [])

  useEffect(() => {
    setActiveSupplierSearchIndex(filteredSuppliers.length > 0 ? 0 : -1)
  }, [filteredSuppliers, isSupplierDropdownOpen])

  useEffect(() => {
    if (activeSupplierSearchIndex >= 0 && isSupplierDropdownOpen) {
      const container = document.querySelector("#supplier-select-container .overflow-y-auto")
      const activeEl = container?.children[activeSupplierSearchIndex] as HTMLElement
      if (activeEl && container) {
        const containerTop = container.scrollTop
        const containerBottom = containerTop + container.clientHeight
        const elemTop = activeEl.offsetTop
        const elemBottom = elemTop + activeEl.clientHeight

        if (elemTop < containerTop) {
          container.scrollTop = elemTop
        } else if (elemBottom > containerBottom) {
          container.scrollTop = elemBottom - container.clientHeight
        }
      }
    }
  }, [activeSupplierSearchIndex, isSupplierDropdownOpen])

  useEffect(() => {
    if (activeQuickSearchIndex >= 0 && quickSearchResults.length > 0) {
      const container = document.querySelector("#product-quick-search-container .overflow-y-auto")
      const activeEl = container?.children[activeQuickSearchIndex] as HTMLElement
      if (activeEl && container) {
        const containerTop = container.scrollTop
        const containerBottom = containerTop + container.clientHeight
        const elemTop = activeEl.offsetTop
        const elemBottom = elemTop + activeEl.clientHeight

        if (elemTop < containerTop) {
          container.scrollTop = elemTop
        } else if (elemBottom > containerBottom) {
          container.scrollTop = elemBottom - container.clientHeight
        }
      }
    }
  }, [activeQuickSearchIndex, quickSearchResults])

  const handleSupplierSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSupplierDropdownOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsSupplierDropdownOpen(true)
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveSupplierSearchIndex((prev) =>
        prev < filteredSuppliers.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveSupplierSearchIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeSupplierSearchIndex >= 0 && activeSupplierSearchIndex < filteredSuppliers.length) {
        const s = filteredSuppliers[activeSupplierSearchIndex]
        setSupplierId(s.id || "")
        setSupplierSearchText(s.name)
        setIsSupplierDropdownOpen(false)
      }
    } else if (e.key === "Escape") {
      setIsSupplierDropdownOpen(false)
    }
  }

  useEffect(() => {
    if (selectingProductForIndex !== null) {
      setDialogSearch("")
    }
  }, [selectingProductForIndex])

  // Debounced search for product selection dialog
  useEffect(() => {
    if (selectingProductForIndex === null) return

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingProducts(true)
      try {
        const res: any = await axiosClient.get("/Product", {
          params: { pageNumber: 1, pageSize: 30, search: dialogSearch }
        })
        if (res?.success) {
          setLookupProducts(res.data?.items || res.data || [])
        }
      } catch (e) {
        console.error("Failed to search products", e)
      } finally {
        setIsSearchingProducts(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [dialogSearch, selectingProductForIndex])

  // Debounced search for Supplier selection
  useEffect(() => {
    const selectedSupplier = suppliers.find(s => s.id === supplierId)
    if (!isSupplierDropdownOpen && selectedSupplier && selectedSupplier.name === supplierSearchText) {
      return
    }

    const delayDebounceFn = setTimeout(() => {
      const fetchSupplierSearch = async () => {
        try {
          const res: any = await axiosClient.get("/Supplier", {
            params: { search: supplierSearchText, pageNumber: 1, pageSize: 30 }
          })
          if (res?.success) {
            const results = res.data?.items || res.data || []
            setSuppliers(prev => {
              const currentSelected = prev.find(s => s.id === supplierId)
              const merged = [...results]
              if (currentSelected && !merged.some(s => s.id === supplierId)) {
                merged.push(currentSelected)
              }
              return merged
            })
          }
        } catch (error) {
          console.error("Failed to search suppliers", error)
        }
      }
      fetchSupplierSearch()
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [supplierSearchText, isSupplierDropdownOpen, supplierId])

  // load dependencies
  useEffect(() => {
    const fetchDeps = async () => {
      setIsLoadingDeps(true)
      try {
        const [resSup, resWh, resProd, resVar, resBatch, resTax, resUnit, resStock] =
          (await Promise.all([
            axiosClient.get("/Supplier", {
              params: { pageNumber: 1, pageSize: 30 },
            }),
            axiosClient.get("/Warehouse", {
              params: { pageNumber: 1, pageSize: 10000 },
            }),
            axiosClient.get("/Product", {
              params: { pageNumber: 1, pageSize: 30 },
            }),
            axiosClient.get("/ProductVariant"),
            axiosClient.get("/ProductBatch"),
            axiosClient.get("/TaxProfile", {
              params: { pageNumber: 1, pageSize: 10000 },
            }),
            axiosClient.get("/Unit", {
              params: { pageNumber: 1, pageSize: 10000 },
            }),
            axiosClient.get("/Inventory/Status"),
          ])) as any[]

        if (resSup?.success)
          setSuppliers(resSup.data?.items || resSup.data || [])
        if (resWh?.success) {
          const whData = resWh.data?.items || resWh.data || []
          setWarehouses(whData)
          if (user?.warehouseId) {
            setWarehouseId(user.warehouseId)
          } else if (whData.length > 0) {
            setWarehouseId(whData[0].id || "")
          }
        }
        if (resProd?.success) {
          const initialProds = resProd.data?.items || resProd.data || []
          setProducts(initialProds)
          setLookupProducts(initialProds)
        }
        if (resVar?.success) setAllVariants(resVar.data || [])
        if (resBatch?.success) setAllBatches(resBatch.data || [])
        if (resTax?.success)
          setTaxProfiles(resTax.data?.items || resTax.data || [])
        if (resUnit?.success)
          setUnits(resUnit.data?.items || resUnit.data || [])
        if (resStock?.success)
          setInventoryStatus(resStock.data || [])
      } catch (e) {
        console.error("Failed to load dependencies", e)
        toast.error("Failed to load dependecy lists.")
      } finally {
        setIsLoadingDeps(false)
      }
    }

    if (canCreate) {
      fetchDeps()
    }
  }, [canCreate])

  // Load existing invoice in edit mode
  useEffect(() => {
    if (!isEditMode || !editId) return

    const loadInvoice = async () => {
      setIsLoadingEdit(true)
      try {
        const response: any = await axiosClient.get(
          `/PurchaseInvoice/${editId}`
        )
        if (response?.success && response.data) {
          const inv = response.data
          setSupplierId(inv.supplierId || "")
          if (inv.supplierId) {
            setSuppliers((prev) => {
              if (prev.some((s) => s.id === inv.supplierId)) return prev
              return [
                ...prev,
                { id: inv.supplierId, name: inv.supplierName || "Selected Supplier" },
              ]
            })
          }
          setWarehouseId(inv.warehouseId || "")
          setInvoiceNo(inv.invoiceNo || "")
          setReferenceNo(inv.referenceNo || "")
          setInvoiceDate(
            inv.invoiceDate
              ? new Date(inv.invoiceDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0]
          )
          setRemarks(inv.remarks || "")
          const dbPaidAmount = inv.paidAmount || 0
          const dbPaymentMode = inv.paymentMode || 1
          if (dbPaidAmount > 0) {
            setUpfrontPayments([
              {
                id: `loaded-${Date.now()}`,
                paidAmount: dbPaidAmount,
                paymentMode: dbPaymentMode,
              },
            ])
          }
          if (inv.items && inv.items.length > 0) {
            setItems(
              inv.items.map((item: any) => ({
                id: item.id,
                productId: item.productId || "",
                productName: item.productName || "",
                productCode: item.productCode || "",
                productVariantId: item.productVariantId || "",
                productBatchId: item.productBatchId || "",
                batchNumber: item.batchNumber || "",
                expiryDate: item.expiryDate
                  ? item.expiryDate.split("T")[0]
                  : "",
                quantity: item.quantity || 1,
                freeQuantity: item.freeQuantity || 0,
                purchaseRate: item.purchaseRate || 0,
                salesRate: item.salesRate || 0,
                mrp: item.mrp || 0,
                discountPercent: item.discountPercent || 0,
                discountAmount: item.discountAmount || 0,
                taxPercent: item.taxPercent || 0,
                taxAmount: item.taxAmount || 0,
                totalAmount: item.totalAmount || 0,
              }))
            )

            // Resolve details for products already present in the invoice
            const uniqueProductCodes = Array.from(
              new Set(inv.items.map((item: any) => item.productCode).filter(Boolean))
            ) as string[]

            if (uniqueProductCodes.length > 0) {
              const fetchedProds = await Promise.all(
                uniqueProductCodes.map((code) =>
                  axiosClient
                    .get("/Product", { params: { pageNumber: 1, pageSize: 1, search: code } })
                    .then((res: any) =>
                      res?.success && res.data?.items?.[0] ? res.data.items[0] : null
                    )
                    .catch(() => null)
                )
              )
              const validFetchedProds = fetchedProds.filter(Boolean) as ProductDto[]
              setProducts((prev) => {
                const prevMap = new Map(prev.map((p) => [p.id, p]))
                validFetchedProds.forEach((p) => prevMap.set(p.id, p))
                return Array.from(prevMap.values())
              })
            }
          }
          // Restore flat discount: existing discountAmount minus sum of line discounts
          const lineDiscountsSum = (inv.items || []).reduce(
            (s: number, i: any) => s + (i.discountAmount || 0),
            0
          )
          const flatDisc = (inv.discountAmount || 0) - lineDiscountsSum
          setFlatDiscountAmount(flatDisc > 0 ? flatDisc : 0)
        } else {
          toast.error("Failed to load invoice for editing.")
          navigate("/purchase-invoice")
        }
      } catch (e) {
        console.error("Failed to load invoice", e)
        toast.error("Failed to load invoice for editing.")
        navigate("/purchase-invoice")
      } finally {
        setIsLoadingEdit(false)
      }
    }

    loadInvoice()
  }, [isEditMode, editId])

  // add blank line item row
  const addLineItem = () => {
    setItems([
      ...items,
      {
        productId: "",
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
        batchNumber: "",
        expiryDate: "",
      },
    ])
  }

  // remove line item row
  const removeLineItem = (index: number) => {
    const updated = [...items]
    updated.splice(index, 1)
    setItems(updated)
  }

  // handle product selection change
  const handleProductChange = (index: number, prodId: string, productObj?: ProductDto) => {
    const product = productObj || products.find((p) => p.id === prodId)
    if (!product) return

    // lookup default tax rate
    let defaultTaxRate = 0
    if (product.taxProfileId) {
      const taxProfile = taxProfiles.find(
        (tp) => tp.id === product.taxProfileId
      )
      if (taxProfile) defaultTaxRate = taxProfile.igst
    }

    const updated = [...items]
    updated[index] = {
      ...updated[index],
      productId: prodId,
      productVariantId: "", // reset variant
      productBatchId: "", // reset batch
      batchNumber: "", // reset batch number
      expiryDate: "", // reset expiry date
      purchaseRate: product.purchaseRate || 0,
      salesRate: product.salesRate || 0,
      mrp: product.mrp || 0,
      taxPercent: defaultTaxRate,
      quantity: 1,
      freeQuantity: 0,
      discountPercent: 0,
      discountAmount: 0,
      unitId: product.unitId || "",
      unitName: product.unitName || "",
      conversionFactor: 1.0,
    }

    // Calculate line totals
    calculateLineTotals(updated, index)
  }

  // handle unit change
  const handleUnitChange = (index: number, unitId: string) => {
    const updated = [...items]
    const item = updated[index]
    const product = products.find(p => p.id === item.productId)
    if (!product) return

    let conversionFactor = 1.0
    let purchaseRate = product.purchaseRate || 0
    let salesRate = product.salesRate || 0
    let mrp = product.mrp || 0

    if (unitId === product.unitId) {
      conversionFactor = 1.0
      purchaseRate = product.purchaseRate || 0
      salesRate = product.salesRate || 0
      mrp = product.mrp || 0
    } else {
      const rule = product.alternativeUnits?.find(c => c.alternativeUnitId === unitId)
      if (rule) {
        conversionFactor = rule.conversionFactor
        purchaseRate = rule.purchaseRate !== undefined && rule.purchaseRate !== null ? rule.purchaseRate : (product.purchaseRate || 0) * conversionFactor
        salesRate = rule.salesRate !== undefined && rule.salesRate !== null ? rule.salesRate : (product.salesRate || 0) * conversionFactor
        mrp = rule.mrp !== undefined && rule.mrp !== null ? rule.mrp : (product.mrp || 0) * conversionFactor
      }
    }

    updated[index] = {
      ...item,
      unitId: unitId,
      unitName: units.find(u => u.id === unitId)?.name || "",
      unitSymbol: units.find(u => u.id === unitId)?.symbol || "",
      conversionFactor: conversionFactor,
      purchaseRate: purchaseRate,
      salesRate: salesRate,
      mrp: mrp
    }

    calculateLineTotals(updated, index)
  }

  // handle variant selection change
  const handleVariantChange = (index: number, variantId: string) => {
    const updated = [...items]
    updated[index].productVariantId = variantId

    const variant = allVariants.find((v) => v.id === variantId)
    if (variant) {
      updated[index].purchaseRate =
        variant.purchaseRate || updated[index].purchaseRate
      updated[index].salesRate = variant.salesRate || updated[index].salesRate
      updated[index].mrp = variant.mrp || updated[index].mrp
    }

    calculateLineTotals(updated, index)
  }

  // handle generic numeric field update on line item
  const handleNumericFieldChange = (
    index: number,
    field: keyof PurchaseInvoiceItemDto,
    value: number
  ) => {
    const updated = [...items]
    updated[index] = {
      ...updated[index],
      [field]: value,
    }

    if (field === "mrp") {
      updated[index].salesRate = value
    }

    calculateLineTotals(updated, index)
  }

  // perform line totals calculations
  const calculateLineTotals = (
    list: PurchaseInvoiceItemDto[],
    index: number
  ) => {
    const item = list[index]
    const qty = Number(item.quantity) || 0
    const rate = Number(item.purchaseRate) || 0
    const discPct = Number(item.discountPercent) || 0
    const taxPct = Number(item.taxPercent) || 0

    const amount = qty * rate
    const discountAmount = amount * (discPct / 100)
    const taxableAmount = amount - discountAmount
    const taxAmount = taxableAmount * (taxPct / 100)
    const totalAmount = taxableAmount + taxAmount

    list[index] = {
      ...item,
      discountAmount: Number(discountAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
    }

    setItems(list)
  }

  // Quick search and select product logic
  useEffect(() => {
    if (!quickSearchText.trim()) {
      setQuickSearchResults([])
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsQuickSearching(true)
      try {
        const res: any = await axiosClient.get("/Product", {
          params: { pageNumber: 1, pageSize: 10, search: quickSearchText }
        })
        if (res?.success) {
          const found = res.data?.items || res.data || []
          setQuickSearchResults(found)
          setActiveQuickSearchIndex(found.length > 0 ? 0 : -1)

          // Auto-select exact match for barcode scanner
          const exactMatch = found.find(
            (p: any) =>
              (p.barcode && p.barcode.toLowerCase() === quickSearchText.trim().toLowerCase()) ||
              (p.productCode && p.productCode.toLowerCase() === quickSearchText.trim().toLowerCase())
          )
          if (exactMatch) {
            handleSelectQuickAddProduct(exactMatch)
          }
        }
      } catch (e) {
        console.error("Quick search failed", e)
      } finally {
        setIsQuickSearching(false)
      }
    }, 200)

    return () => clearTimeout(delayDebounceFn)
  }, [quickSearchText])

  const handleQuickSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveQuickSearchIndex((prev) =>
        prev < quickSearchResults.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveQuickSearchIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeQuickSearchIndex >= 0 && activeQuickSearchIndex < quickSearchResults.length) {
        handleSelectQuickAddProduct(quickSearchResults[activeQuickSearchIndex])
      }
    } else if (e.key === "Escape") {
      setQuickSearchResults([])
    }
  }

  const handleSelectQuickAddProduct = (product: ProductDto) => {
    setProducts((prev) => {
      if (prev.some((item) => item.id === product.id)) return prev
      return [...prev, product]
    })

    let defaultTaxRate = 0
    if (product.taxProfileId) {
      const taxProfile = taxProfiles.find((tp) => tp.id === product.taxProfileId)
      if (taxProfile) defaultTaxRate = taxProfile.igst
    }

    const newItem: PurchaseInvoiceItemDto = {
      productId: product.id || "",
      productName: product.name || "",
      productCode: product.productCode || "",
      quantity: 1,
      freeQuantity: 0,
      purchaseRate: product.purchaseRate || 0,
      salesRate: product.salesRate || 0,
      mrp: product.mrp || 0,
      taxPercent: defaultTaxRate,
      discountPercent: 0,
      discountAmount: 0,
      unitId: product.unitId || "",
      unitName: product.unitName || "",
      conversionFactor: 1.0,
    }

    const updatedItems = [...items, newItem]
    setItems(updatedItems)
    calculateLineTotals(updatedItems, updatedItems.length - 1)

    setQuickSearchText("")
    setQuickSearchResults([])
    setActiveQuickSearchIndex(-1)

    const newIndex = updatedItems.length - 1
    setTimeout(() => {
      const element = document.getElementById(`qty-input-${newIndex}`)
      if (element) {
        ;(element as HTMLInputElement).focus()
        ;(element as HTMLInputElement).select()
      }
    }, 100)
  }

  const handleQuickAddSuccess = (newProduct: ProductDto) => {
    setProducts((prev) => {
      if (prev.some((item) => item.id === newProduct.id)) return prev
      return [...prev, newProduct]
    })

    if (quickAddTargetIndex !== null) {
      handleProductChange(quickAddTargetIndex, newProduct.id || "", newProduct)
      setSelectingProductForIndex(null)
    } else {
      handleSelectQuickAddProduct(newProduct)
    }
  }

  // global summaries
  const summaries = useMemo(() => {
    let subTotal = 0
    let totalDiscount = flatDiscountAmount
    let totalTax = 0
    let netAmount = 0

    items.forEach((item) => {
      const qty = Number(item.quantity) || 0
      const rate = Number(item.purchaseRate) || 0
      subTotal += qty * rate
      totalDiscount += Number(item.discountAmount) || 0
      totalTax += Number(item.taxAmount) || 0
    })

    netAmount = subTotal - totalDiscount + totalTax

    return {
      subTotal: Number(subTotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
    }
  }, [items, flatDiscountAmount])

  const totalPaidUpfront = useMemo(() => {
    return upfrontPayments.reduce((sum, p) => sum + p.paidAmount, 0)
  }, [upfrontPayments])

  const remainingPayable = useMemo(() => {
    return Number((summaries.netAmount - totalPaidUpfront).toFixed(2))
  }, [summaries.netAmount, totalPaidUpfront])

  const totalPaidAmount = useMemo(() => {
    if (upfrontPayments.length > 0) {
      return totalPaidUpfront
    }
    return currentPaidAmount
  }, [upfrontPayments, totalPaidUpfront, currentPaidAmount])

  const balanceDue = useMemo(() => {
    return Number((summaries.netAmount - totalPaidAmount).toFixed(2))
  }, [summaries.netAmount, totalPaidAmount])

  // Automatically adjust/clear paid amounts if the net amount decreases or is 0
  useEffect(() => {
    const net = summaries.netAmount
    if (net === 0) {
      if (currentPaidAmount !== 0) {
        setCurrentPaidAmount(0)
      }
      if (upfrontPayments.length > 0) {
        setUpfrontPayments([])
      }
    } else {
      const totalSplit = upfrontPayments.reduce((sum, p) => sum + p.paidAmount, 0)
      if (totalSplit > net) {
        if (upfrontPayments.length > 0) {
          setUpfrontPayments([])
        }
        if (currentPaidAmount !== 0) {
          setCurrentPaidAmount(0)
        }
      } else {
        const targetPaid = Math.min(currentPaidAmount, net - totalSplit)
        if (currentPaidAmount !== targetPaid) {
          setCurrentPaidAmount(targetPaid)
        }
      }
    }
  }, [summaries.netAmount, upfrontPayments, currentPaidAmount])

  // Keep currentPaidAmount in sync with remainingPayable - Removed auto-sync to allow defaulting to unpaid (₹0)

  // submit handler
  const handleSave = async (status: number) => {
    if (!supplierId) {
      toast.error("Please select a supplier.")
      return
    }
    if (!warehouseId) {
      toast.error("Please select a warehouse.")
      return
    }
    if (!invoiceNo.trim()) {
      toast.error("Please enter an invoice number.")
      return
    }
    if (items.length === 0) {
      toast.error("Please add at least one item to the invoice.")
      return
    }

    const invalidItem = items.some(
      (item) =>
        !item.productId ||
        Number(item.quantity) <= 0 ||
        Number(item.purchaseRate) < 0
    )
    if (invalidItem) {
      toast.error(
        "Please ensure all items have a product, quantity greater than 0, and rate greater than or equal to 0."
      )
      return
    }

    const finalPayments =
      upfrontPayments.length > 0
        ? upfrontPayments
        : currentPaidAmount > 0
          ? [
              {
                id: "default",
                paidAmount: currentPaidAmount,
                paymentMode: currentPaymentMode,
              },
            ]
          : []

    const finalPaidAmount = finalPayments.reduce(
      (sum, p) => sum + p.paidAmount,
      0
    )

    if (finalPaidAmount < 0) {
      toast.error("Paid amount cannot be negative.")
      return
    }
    if (finalPaidAmount > summaries.netAmount) {
      toast.error("Paid amount cannot exceed the net invoice amount.")
      return
    }

    setIsSaving(true)
    try {
      const payload: PurchaseInvoiceDto = {
        companyId: user?.companyId || "F6579BDB-C05B-4AF0-9404-7EBC3C15B0D8",
        branchId: user?.branchId || "F6579BDB-C05B-4AF0-9404-7EBC3C15B0D8",
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
        paymentMode:
          finalPayments.length > 0 ? finalPayments[0].paymentMode : undefined,
        paymentDetails: finalPayments.map((p) => ({
          paidAmount: p.paidAmount,
          paymentMode: p.paymentMode,
        })),
        status, // 1 = Draft, 2 = Posted
        items: items.map((i) => ({
          productId: i.productId,
          productVariantId: i.productVariantId || (null as any),
          productBatchId: i.productBatchId || (null as any),
          batchNumber: i.batchNumber || (null as any),
          expiryDate: i.expiryDate
            ? new Date(i.expiryDate).toISOString()
            : (null as any),
          quantity: Number(i.quantity),
          freeQuantity: Number(i.freeQuantity) || 0,
          purchaseRate: Number(i.purchaseRate),
          salesRate: Number(i.salesRate) || 0,
          mrp: Number(i.mrp) || 0,
          discountPercent: Number(i.discountPercent) || 0,
          discountAmount: Number(i.discountAmount) || 0,
          taxPercent: Number(i.taxPercent) || 0,
          taxAmount: Number(i.taxAmount) || 0,
          totalAmount: Number(i.totalAmount) || 0,
          unitId: i.unitId || undefined,
          conversionFactor: i.conversionFactor || 1.0,
        })),
      }

      let response: any
      if (isEditMode && editId) {
        response = await axiosClient.put(`/PurchaseInvoice/${editId}`, payload)
      } else {
        response = await axiosClient.post("/PurchaseInvoice", payload)
      }

      if (response?.success) {
        toast.success(
          status === 2
            ? "Purchase Invoice posted and stock updated!"
            : isEditMode
              ? "Purchase Invoice draft updated successfully!"
              : "Purchase Invoice saved as draft!"
        )
        const savedId = response.data?.id || response.data?.Id || editId
        navigate("/purchase-invoice", { state: { autoViewInvoiceId: savedId } })
      } else {
        toast.error(response?.message || "Failed to save purchase invoice.")
      }
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "An error occurred while saving.")
    } finally {
      setIsSaving(false)
    }
  }

  // filter variants & batches for a specific product
  const getVariantsForProduct = (productId: string) => {
    return allVariants.filter((v) => v.productId === productId)
  }

  const getBatchesForProduct = (productId: string) => {
    return allBatches.filter((b) => b.productId === productId)
  }

  const getBatchStock = (productId: string, batchId: string | null) => {
    if (!warehouseId) return 0
    const match = inventoryStatus.find(
      (inv: any) =>
        inv.productId === productId &&
        inv.warehouseId === warehouseId &&
        (batchId ? inv.productBatchId === batchId : !inv.productBatchId)
    )
    return match ? match.currentStock : 0
  }

  const getRowValue = (row: any, searchTerms: string[]) => {
    if (!row) return undefined
    const foundKey = Object.keys(row).find((k) =>
      searchTerms.some(
        (term) =>
          k.toLowerCase().trim() === term.toLowerCase().trim() ||
          k.toLowerCase().includes(term.toLowerCase())
      )
    )
    return foundKey ? row[foundKey] : undefined
  }

  const parseExcelDate = (val: any) => {
    if (!val) return ""
    if (typeof val === "number") {
      const date = new Date((val - 25569) * 86400 * 1000)
      return date.toISOString().split("T")[0]
    }
    const dateStr = String(val).trim()
    const parsed = Date.parse(dateStr)
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split("T")[0]
    }
    return dateStr
  }

  const downloadTemplate = () => {
    const sampleSupplier = suppliers[0]?.name || "Sample Supplier"
    const sampleWarehouse = warehouses[0]?.name || "Main Warehouse"
    const sampleProductCode = products[0]?.productCode || "PROD-001"

    const data = [
      {
        "Supplier Name": sampleSupplier,
        "Warehouse Name": sampleWarehouse,
        "Invoice No": "INV-2026-0001",
        "Invoice Date": new Date().toISOString().split("T")[0],
        "Reference No": "PO-12345",
        Remarks: "Sample purchase invoice upload",
        "Product Code / SKU / Barcode": sampleProductCode,
        "Variant Name": "",
        "Batch No": "BATCH-001",
        "Unit": products[0]?.unitName || "Piece",
        Quantity: 10,
        "Free Quantity": 1,
        "Purchase Rate": products[0]?.purchaseRate || 100,
        MRP: products[0]?.mrp || 150,
        "Sales Rate": products[0]?.salesRate || 130,
        "Discount %": 5,
        "Tax %": products[0]?.taxProfileId
          ? taxProfiles.find((tp) => tp.id === products[0].taxProfileId)
              ?.igst || 18
          : 18,
      },
      {
        "Supplier Name": "",
        "Warehouse Name": "",
        "Invoice No": "",
        "Invoice Date": "",
        "Reference No": "",
        Remarks: "",
        "Product Code / SKU / Barcode": products[1]?.productCode || "PROD-002",
        "Variant Name": "",
        "Batch No": "BATCH-001",
        "Unit": products[1]?.unitName || "Piece",
        Quantity: 5,
        "Free Quantity": 0,
        "Purchase Rate": products[1]?.purchaseRate || 200,
        MRP: products[1]?.mrp || 300,
        "Sales Rate": products[1]?.salesRate || 260,
        "Discount %": 0,
        "Tax %": products[1]?.taxProfileId
          ? taxProfiles.find((tp) => tp.id === products[1].taxProfileId)
              ?.igst || 12
          : 12,
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()

    worksheet["!cols"] = [
      { wch: 25 }, // Supplier Name
      { wch: 20 }, // Warehouse Name
      { wch: 15 }, // Invoice No
      { wch: 12 }, // Invoice Date
      { wch: 15 }, // Reference No
      { wch: 30 }, // Remarks
      { wch: 25 }, // Product Code / SKU / Barcode
      { wch: 15 }, // Variant Name
      { wch: 12 }, // Batch No
      { wch: 12 }, // Unit
      { wch: 8 }, // Quantity
      { wch: 10 }, // Free Quantity
      { wch: 12 }, // Purchase Rate
      { wch: 10 }, // MRP
      { wch: 12 }, // Sales Rate
      { wch: 10 }, // Discount %
      { wch: 8 }, // Tax %
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Invoice")
    XLSX.writeFile(workbook, "PurchaseInvoice_Template.xlsx")
    toast.success("Excel Template downloaded successfully!")
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    parseFile(file)
    e.target.value = ""
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    parseFile(file)
  }

  const parseFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      toast.error(
        "Unsupported file format. Please upload a .xlsx, .xls or .csv file."
      )
      return
    }

    setIsUploading(true)
    setUploadProgress(10)

    const reader = new FileReader()
    reader.onprogress = (data) => {
      if (data.lengthComputable) {
        const progress = Math.round((data.loaded / data.total) * 50)
        setUploadProgress(progress)
      }
    }

    reader.onload = (e) => {
      setUploadProgress(60)
      try {
        setTimeout(() => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          setUploadProgress(80)

          const workbook = XLSX.read(data, { type: "array" })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const rawRows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          }) as any[][]
          setUploadProgress(95)

          if (rawRows.length < 2) {
            toast.error("The file does not contain any data rows.")
            setIsUploading(false)
            return
          }

          const headers = rawRows[0].map((h) => String(h).trim())
          const parsedData = rawRows.slice(1).map((row) => {
            const rowObj: any = {}
            headers.forEach((header, index) => {
              rowObj[header] = row[index] !== undefined ? row[index] : ""
            })
            return rowObj
          })

          const validRows = parsedData.filter((row) => {
            const val = getRowValue(row, ["product", "code", "barcode", "sku"])
            return val !== undefined && String(val).trim() !== ""
          })

          if (validRows.length === 0) {
            toast.error(
              'No valid items found in the file. Ensure the "Product Code / SKU / Barcode" column is filled.'
            )
            setIsUploading(false)
            return
          }

          setTimeout(() => {
            setUploadProgress(100)
            setTimeout(() => {
              setIsUploading(false)
              resolveAndProcessImportedData(validRows)
            }, 200)
          }, 100)
        }, 50)
      } catch (err) {
        console.error(err)
        toast.error(
          "Error parsing Excel data. Please make sure the structure is correct."
        )
        setIsUploading(false)
      }
    }

    reader.onerror = () => {
      toast.error("Failed to read the file.")
      setIsUploading(false)
    }

    reader.readAsArrayBuffer(file)
  }

  const validatePreviewData = (
    header: PreviewHeader,
    itemsList: PreviewItem[]
  ): { header: PreviewHeader; items: PreviewItem[]; isValid: boolean } => {
    let isAllValid = true

    const headerErrors: typeof header.errors = {}

    if (!header.supplierId) {
      headerErrors.supplier = "Supplier is required."
      isAllValid = false
    } else {
      const matchedSup = suppliers.find((s) => s.id === header.supplierId)
      if (!matchedSup) {
        headerErrors.supplier = "Invalid supplier selected."
        isAllValid = false
      }
    }

    if (!header.warehouseId) {
      headerErrors.warehouse = "Warehouse is required."
      isAllValid = false
    } else {
      const matchedWh = warehouses.find((w) => w.id === header.warehouseId)
      if (!matchedWh) {
        headerErrors.warehouse = "Invalid warehouse selected."
        isAllValid = false
      }
    }

    if (!header.invoiceNo.trim()) {
      headerErrors.invoiceNo = "Invoice number is required."
      isAllValid = false
    }

    if (!header.invoiceDate) {
      headerErrors.invoiceDate = "Invoice date is required."
      isAllValid = false
    } else {
      const parsedDate = Date.parse(header.invoiceDate)
      if (isNaN(parsedDate)) {
        headerErrors.invoiceDate = "Invalid date format."
        isAllValid = false
      }
    }

    const validatedHeader = {
      ...header,
      errors: headerErrors,
    }

    const validatedItems = itemsList.map((item, idx) => {
      const itemErrors: typeof item.errors = {}

      if (!item.productId) {
        itemErrors.product = item.productSearch
          ? `Product "${item.productSearch}" not found in catalogue.`
          : "Product selection is required."
        isAllValid = false
      }

      if (item.productVariantId) {
        const prodVariants = allVariants.filter(
          (v) => v.productId === item.productId
        )
        const matchedVar = prodVariants.find(
          (v) => v.id === item.productVariantId
        )
        if (!matchedVar) {
          itemErrors.variant = "Selected variant is invalid."
          isAllValid = false
        }
      } else if (item.variantSearch) {
        itemErrors.variant = `Variant "${item.variantSearch}" not found.`
        isAllValid = false
      }

      if (item.productBatchId) {
        const prodBatches = allBatches.filter(
          (b) => b.productId === item.productId
        )
        const matchedB = prodBatches.find((b) => b.id === item.productBatchId)
        if (!matchedB) {
          itemErrors.batch = "Selected batch is invalid."
          isAllValid = false
        }
      }

      if (
        item.quantity === undefined ||
        item.quantity === null ||
        isNaN(item.quantity)
      ) {
        itemErrors.quantity = "Quantity is required."
        isAllValid = false
      } else if (item.quantity <= 0) {
        itemErrors.quantity = "Quantity must be greater than 0."
        isAllValid = false
      }

      if (item.freeQuantity < 0 || isNaN(item.freeQuantity)) {
        itemErrors.freeQuantity = "Free quantity cannot be negative."
        isAllValid = false
      }

      if (item.purchaseRate < 0 || isNaN(item.purchaseRate)) {
        itemErrors.purchaseRate = "Purchase rate cannot be negative."
        isAllValid = false
      }
      if (item.mrp < 0 || isNaN(item.mrp)) {
        itemErrors.mrp = "MRP cannot be negative."
        isAllValid = false
      }
      if (item.salesRate < 0 || isNaN(item.salesRate)) {
        itemErrors.salesRate = "Sales rate cannot be negative."
        isAllValid = false
      }

      if (
        item.discountPercent < 0 ||
        item.discountPercent > 100 ||
        isNaN(item.discountPercent)
      ) {
        itemErrors.discountPercent = "Discount % must be between 0 and 100."
        isAllValid = false
      }
      if (
        item.taxPercent < 0 ||
        item.taxPercent > 100 ||
        isNaN(item.taxPercent)
      ) {
        itemErrors.taxPercent = "Tax % must be between 0 and 100."
        isAllValid = false
      }

      const isDuplicate = itemsList.some((otherItem, otherIdx) => {
        if (otherIdx === idx) return false
        return (
          otherItem.productId &&
          otherItem.productId === item.productId &&
          otherItem.productVariantId === item.productVariantId &&
          otherItem.productBatchId === item.productBatchId
        )
      })
      if (isDuplicate) {
        itemErrors.duplicate = "Duplicate product/variant/batch line."
        isAllValid = false
      }

      return {
        ...item,
        errors: itemErrors,
      }
    })

    return {
      header: validatedHeader,
      items: validatedItems,
      isValid: isAllValid,
    }
  }

  const resolveAndProcessImportedData = async (validRows: any[]) => {
    setIsUploading(true)
    setUploadProgress(95)
    try {
      const searchTerms = Array.from(
        new Set(
          validRows
            .map((row) => getRowValue(row, ["product", "code", "barcode", "sku"]))
            .filter(Boolean)
            .map((term) => String(term).trim())
        )
      ) as string[]

      let updatedProducts = [...products]

      if (searchTerms.length > 0) {
        const fetchedResults = await Promise.all(
          searchTerms.map((term) =>
            axiosClient
              .get("/Product", { params: { pageNumber: 1, pageSize: 5, search: term } })
              .then((res: any) => (res?.success ? res.data?.items || res.data || [] : []))
              .catch(() => [])
          )
        )

        const allFetchedProducts = fetchedResults.flat() as ProductDto[]

        const prevMap = new Map(products.map((p) => [p.id, p]))
        allFetchedProducts.forEach((p) => {
          if (p && p.id) prevMap.set(p.id, p)
        })
        updatedProducts = Array.from(prevMap.values())
        setProducts(updatedProducts)
      }

      processImportedData(validRows, updatedProducts)
    } catch (err) {
      console.error("Failed to resolve products for import", err)
      toast.error("Failed to resolve product catalog matches for import.")
    } finally {
      setIsUploading(false)
    }
  }

  const processImportedData = (rows: any[], currentProductsList?: ProductDto[]) => {
    const activeProducts = currentProductsList || products
    const firstRow = rows[0]

    const supplierSearch = String(
      getRowValue(firstRow, ["supplier"]) || ""
    ).trim()
    const warehouseSearch = String(
      getRowValue(firstRow, ["warehouse"]) || ""
    ).trim()
    const invoiceNo = String(
      getRowValue(firstRow, ["invoice no", "invoice_no"]) || ""
    ).trim()
    const invoiceDateRaw = getRowValue(firstRow, [
      "invoice date",
      "invoice_date",
    ])
    const invoiceDate = parseExcelDate(invoiceDateRaw)
    const referenceNo = String(
      getRowValue(firstRow, ["reference", "po"]) || ""
    ).trim()
    const remarks = String(
      getRowValue(firstRow, ["remarks", "remark", "note"]) || ""
    ).trim()

    const matchedSupplier = suppliers.find(
      (s) => s.name.toLowerCase() === supplierSearch.toLowerCase()
    )
    const matchedWarehouse =
      warehouses.find(
        (w) => w.name.toLowerCase() === warehouseSearch.toLowerCase()
      ) || warehouses[0]

    const initialHeader: PreviewHeader = {
      supplierSearch,
      supplierId: matchedSupplier ? matchedSupplier.id || "" : "",
      warehouseSearch,
      warehouseId: matchedWarehouse ? matchedWarehouse.id || "" : "",
      invoiceNo,
      invoiceDate: invoiceDate || new Date().toISOString().split("T")[0],
      referenceNo,
      remarks,
      errors: {},
    }

        const parsedItems: PreviewItem[] = rows.map((row, idx) => {
      const productSearch = String(
        getRowValue(row, ["product", "code", "barcode", "sku"]) || ""
      ).trim()
      const variantSearch = String(getRowValue(row, ["variant"]) || "").trim()
      const batchSearch = String(getRowValue(row, ["batch"]) || "").trim()
      const unitSearch = String(
        getRowValue(row, ["unit", "uom", "packaging"]) || ""
      ).trim()

      const quantity = Number(getRowValue(row, ["qty", "quantity"])) || 1
      const freeQuantity = Number(getRowValue(row, ["free"])) || 0

      const matchedProduct = activeProducts.find(
        (p) =>
          (p.productCode &&
            p.productCode.toLowerCase() === productSearch.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase() === productSearch.toLowerCase()) ||
          (p.barcode &&
            p.barcode.toLowerCase() === productSearch.toLowerCase()) ||
          (p.name && p.name.toLowerCase() === productSearch.toLowerCase())
      )

      let productId = ""
      let productName = ""
      let productCode = ""
      let purchaseRate =
        Number(getRowValue(row, ["purchase rate", "purchase_rate", "rate"])) ||
        0
      let mrp = Number(getRowValue(row, ["mrp"])) || 0
      let salesRate =
        Number(getRowValue(row, ["sales rate", "sales_rate"])) || 0
      let discountPercent = Number(getRowValue(row, ["discount", "disc"])) || 0
      let taxPercent = Number(getRowValue(row, ["tax", "gst", "vat"])) || 0

      let unitId = ""
      let unitName = ""
      let unitSymbol = ""
      let conversionFactor = 1.0

      if (matchedProduct) {
        productId = matchedProduct.id || ""
        productName = matchedProduct.name || ""
        productCode = matchedProduct.productCode || ""

        let resolvedUnitId = matchedProduct.unitId || ""
        let resolvedUnitName = matchedProduct.unitName || ""
        const matchedProductUnitSymbol = units.find((u) => u.id === matchedProduct.unitId)?.symbol || ""
        let resolvedUnitSymbol = matchedProductUnitSymbol

        if (unitSearch) {
          if (
            matchedProduct.unitName?.toLowerCase() === unitSearch.toLowerCase() ||
            matchedProductUnitSymbol.toLowerCase() === unitSearch.toLowerCase()
          ) {
            resolvedUnitId = matchedProduct.unitId || ""
            resolvedUnitName = matchedProduct.unitName || ""
            resolvedUnitSymbol = matchedProductUnitSymbol
            conversionFactor = 1.0
          } else {
            const rule = matchedProduct.alternativeUnits?.find(
              (c) =>
                c.alternativeUnitName?.toLowerCase() === unitSearch.toLowerCase() ||
                c.alternativeUnitSymbol?.toLowerCase() === unitSearch.toLowerCase()
            )
            if (rule) {
              resolvedUnitId = rule.alternativeUnitId
              resolvedUnitName = rule.alternativeUnitName || ""
              resolvedUnitSymbol = rule.alternativeUnitSymbol || ""
              conversionFactor = rule.conversionFactor
            }
          }
        }

        unitId = resolvedUnitId
        unitName = resolvedUnitName
        unitSymbol = resolvedUnitSymbol

        let basePurchaseRate = matchedProduct.purchaseRate || 0
        let baseMrp = matchedProduct.mrp || 0
        let baseSalesRate = matchedProduct.salesRate || 0

        if (unitId && unitId !== matchedProduct.unitId) {
          const rule = matchedProduct.alternativeUnits?.find(
            (c) => c.alternativeUnitId === unitId
          )
          if (rule) {
            basePurchaseRate =
              rule.purchaseRate !== undefined && rule.purchaseRate !== null
                ? rule.purchaseRate
                : (matchedProduct.purchaseRate || 0) * conversionFactor
            baseSalesRate =
              rule.salesRate !== undefined && rule.salesRate !== null
                ? rule.salesRate
                : (matchedProduct.salesRate || 0) * conversionFactor
            baseMrp =
              rule.mrp !== undefined && rule.mrp !== null
                ? rule.mrp
                : (matchedProduct.mrp || 0) * conversionFactor
          }
        }

        if (purchaseRate === 0) purchaseRate = basePurchaseRate
        if (mrp === 0) mrp = baseMrp
        if (salesRate === 0) salesRate = baseSalesRate

        if (taxPercent === 0 && matchedProduct.taxProfileId) {
          const taxProfile = taxProfiles.find(
            (tp) => tp.id === matchedProduct.taxProfileId
          )
          if (taxProfile) taxPercent = taxProfile.igst
        }
      }

      let productVariantId = ""
      if (matchedProduct && variantSearch) {
        const prodVariants = allVariants.filter(
          (v) => v.productId === matchedProduct.id
        )
        const matchedVar = prodVariants.find(
          (v) =>
            (v.variantCombination &&
              v.variantCombination.toLowerCase() ===
                variantSearch.toLowerCase()) ||
            (v.sku && v.sku.toLowerCase() === variantSearch.toLowerCase())
        )
        if (matchedVar) {
          productVariantId = matchedVar.id || ""
          if (purchaseRate === (matchedProduct.purchaseRate || 0))
            purchaseRate = matchedVar.purchaseRate || purchaseRate
          if (mrp === (matchedProduct.mrp || 0)) mrp = matchedVar.mrp || mrp
          if (salesRate === (matchedProduct.salesRate || 0))
            salesRate = matchedVar.salesRate || salesRate
        }
      }

      let productBatchId = ""
      if (matchedProduct && batchSearch) {
        const prodBatches = allBatches.filter(
          (b) => b.productId === matchedProduct.id
        )
        const matchedB = prodBatches.find(
          (b) =>
            b.batchNo && b.batchNo.toLowerCase() === batchSearch.toLowerCase()
        )
        if (matchedB) {
          productBatchId = matchedB.id || ""
          if (mrp === (matchedProduct.mrp || 0)) mrp = matchedB.mrp || mrp
        }
      }

      const expiryDateRaw = getRowValue(row, [
        "expiry",
        "expire",
        "exp date",
        "expiry date",
        "expiry_date",
        "expire_date",
      ])
      const expiryDate = parseExcelDate(expiryDateRaw)

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
        expiryDate: expiryDate || "",
        quantity,
        freeQuantity,
        purchaseRate,
        mrp,
        salesRate,
        discountPercent,
        taxPercent,
        unitId,
        unitName,
        unitSymbol,
        conversionFactor,
        errors: {},
      }
    })

    const validationResult = validatePreviewData(initialHeader, parsedItems)
    setPreviewHeader(validationResult.header)
    setPreviewItems(validationResult.items)
    setPreviewUpfrontPayments([])
    setIsPreviewOpen(true)
    toast.info("File parsed successfully! Please review items and errors.")
  }

  const handlePreviewHeaderChange = (
    field: keyof PreviewHeader,
    value: any
  ) => {
    if (!previewHeader) return
    const updatedHeader = {
      ...previewHeader,
      [field]: value,
    }

    if (field === "supplierId") {
      const matched = suppliers.find((s) => s.id === value)
      updatedHeader.supplierSearch = matched ? matched.name : ""
    }
    if (field === "warehouseId") {
      const matched = warehouses.find((w) => w.id === value)
      updatedHeader.warehouseSearch = matched ? matched.name : ""
    }

    const validation = validatePreviewData(updatedHeader, previewItems)
    setPreviewHeader(validation.header)
    setPreviewItems(validation.items)
  }

  const handlePreviewItemChange = (
    index: number,
    field: keyof PreviewItem,
    value: any
  ) => {
    const updatedItems = [...previewItems]

    if (field === "productId") {
      const prod = products.find((p) => p.id === value)
      if (prod) {
        let defaultTaxRate = 0
        if (prod.taxProfileId) {
          const taxProfile = taxProfiles.find(
            (tp) => tp.id === prod.taxProfileId
          )
          if (taxProfile) defaultTaxRate = taxProfile.igst
        }
        updatedItems[index] = {
          ...updatedItems[index],
          productId: prod.id || "",
          productName: prod.name || "",
          productCode: prod.productCode || "",
          productVariantId: "",
          productBatchId: "",
          purchaseRate: prod.purchaseRate || 0,
          salesRate: prod.salesRate || 0,
          mrp: prod.mrp || 0,
          taxPercent: defaultTaxRate,
          unitId: prod.unitId || "",
          unitName: prod.unitName || "",
          unitSymbol: units.find((u) => u.id === prod.unitId)?.symbol || "",
          conversionFactor: 1.0,
        }
      } else {
        updatedItems[index] = {
          ...updatedItems[index],
          productId: "",
          productName: "",
          productCode: "",
          productVariantId: "",
          productBatchId: "",
          unitId: "",
          unitName: "",
          unitSymbol: "",
          conversionFactor: 1.0,
        }
      }
    } else if (field === "unitId") {
      const item = updatedItems[index]
      const prod = products.find((p) => p.id === item.productId)
      if (prod) {
        let conversionFactor = 1.0
        let purchaseRate = prod.purchaseRate || 0
        let salesRate = prod.salesRate || 0
        let mrp = prod.mrp || 0

        if (value === prod.unitId) {
          conversionFactor = 1.0
          purchaseRate = prod.purchaseRate || 0
          salesRate = prod.salesRate || 0
          mrp = prod.mrp || 0
        } else {
          const rule = prod.alternativeUnits?.find(
            (c) => c.alternativeUnitId === value
          )
          if (rule) {
            conversionFactor = rule.conversionFactor
            purchaseRate =
              rule.purchaseRate !== undefined && rule.purchaseRate !== null
                ? rule.purchaseRate
                : (prod.purchaseRate || 0) * conversionFactor
            salesRate =
              rule.salesRate !== undefined && rule.salesRate !== null
                ? rule.salesRate
                : (prod.salesRate || 0) * conversionFactor
            mrp =
              rule.mrp !== undefined && rule.mrp !== null
                ? rule.mrp
                : (prod.mrp || 0) * conversionFactor
          }
        }

        updatedItems[index] = {
          ...item,
          unitId: value,
          unitName: units.find((u) => u.id === value)?.name || "",
          unitSymbol: units.find((u) => u.id === value)?.symbol || "",
          conversionFactor: conversionFactor,
          purchaseRate: purchaseRate,
          salesRate: salesRate,
          mrp: mrp,
        }
      }
    } else if (field === "productVariantId") {
      updatedItems[index].productVariantId = value
      const variant = allVariants.find((v) => v.id === value)
      if (variant) {
        updatedItems[index].purchaseRate =
          variant.purchaseRate || updatedItems[index].purchaseRate
        updatedItems[index].salesRate =
          variant.salesRate || updatedItems[index].salesRate
        updatedItems[index].mrp = variant.mrp || updatedItems[index].mrp
      }
    } else if (field === "productBatchId") {
      updatedItems[index].productBatchId = value
      const batch = allBatches.find((b) => b.id === value)
      const prod = products.find((p) => p.id === updatedItems[index].productId)
      if (batch) {
        updatedItems[index].batchNumber = batch.batchNo || ""
        updatedItems[index].expiryDate = batch.expiryDate
          ? batch.expiryDate.split("T")[0]
          : ""
        updatedItems[index].mrp = batch.mrp || prod?.mrp || updatedItems[index].mrp || 0
        updatedItems[index].salesRate = batch.salesRate || batch.mrp || prod?.salesRate || updatedItems[index].salesRate || 0
        updatedItems[index].purchaseRate = batch.purchaseRate || prod?.purchaseRate || updatedItems[index].purchaseRate || 0
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      }
      if (field === "batchNumber") {
        const typedBatchNo = String(value).trim()
        const matched = allBatches.find(
          (b) =>
            b.productId === updatedItems[index].productId &&
            b.batchNo?.toLowerCase() === typedBatchNo.toLowerCase()
        )
        const prod = products.find((p) => p.id === updatedItems[index].productId)
        if (matched) {
          updatedItems[index].productBatchId = matched.id || ""
          updatedItems[index].expiryDate = matched.expiryDate
            ? matched.expiryDate.split("T")[0]
            : ""
          updatedItems[index].mrp = matched.mrp || prod?.mrp || updatedItems[index].mrp || 0
          updatedItems[index].salesRate = matched.salesRate || matched.mrp || prod?.salesRate || updatedItems[index].salesRate || 0
          updatedItems[index].purchaseRate = matched.purchaseRate || prod?.purchaseRate || updatedItems[index].purchaseRate || 0
        } else {
          updatedItems[index].productBatchId = ""
        }
      } else if (field === "mrp") {
        updatedItems[index].salesRate = value
      }
    }

    if (previewHeader) {
      const validation = validatePreviewData(previewHeader, updatedItems)
      setPreviewHeader(validation.header)
      setPreviewItems(validation.items)
    }
  }

  const handleAddPreviewItem = () => {
    const newItem: PreviewItem = {
      id: `imported-new-${Math.random()}`,
      productSearch: "",
      productId: "",
      productName: "",
      productCode: "",
      variantSearch: "",
      productVariantId: "",
      batchSearch: "",
      productBatchId: "",
      batchNumber: "",
      expiryDate: "",
      quantity: 1,
      freeQuantity: 0,
      purchaseRate: 0,
      mrp: 0,
      salesRate: 0,
      discountPercent: 0,
      taxPercent: 0,
      unitId: "",
      unitName: "",
      unitSymbol: "",
      conversionFactor: 1.0,
      errors: {},
    }
    const updatedItems = [...previewItems, newItem]
    if (previewHeader) {
      const validation = validatePreviewData(previewHeader, updatedItems)
      setPreviewHeader(validation.header)
      setPreviewItems(validation.items)
    }
  }

  const handleRemovePreviewItem = (index: number) => {
    const updatedItems = [...previewItems]
    updatedItems.splice(index, 1)
    if (previewHeader) {
      const validation = validatePreviewData(previewHeader, updatedItems)
      setPreviewHeader(validation.header)
      setPreviewItems(validation.items)
    }
  }

  const handleConfirmSubmit = async (status: number) => {
    if (!previewHeader) return
    const validation = validatePreviewData(previewHeader, previewItems)
    setPreviewHeader(validation.header)
    setPreviewItems(validation.items)

    if (!validation.isValid) {
      toast.error("Please fix all validation errors before submitting.")
      return
    }

    setIsSaving(true)
    try {
      let subTotal = 0
      let lineDiscountsSum = 0
      let totalTax = 0

      const formattedItems = previewItems.map((item) => {
        const qty = Number(item.quantity) || 0
        const rate = Number(item.purchaseRate) || 0
        const discPct = Number(item.discountPercent) || 0
        const taxPct = Number(item.taxPercent) || 0

        const amount = qty * rate
        const discountAmount = Number((amount * (discPct / 100)).toFixed(2))
        const taxableAmount = amount - discountAmount
        const taxAmount = Number((taxableAmount * (taxPct / 100)).toFixed(2))
        const totalAmount = Number((taxableAmount + taxAmount).toFixed(2))

        subTotal += amount
        lineDiscountsSum += discountAmount
        totalTax += taxAmount

        return {
          productId: item.productId,
          productVariantId: item.productVariantId || (null as any),
          productBatchId: item.productBatchId || (null as any),
          batchNumber: item.batchNumber || (null as any),
          expiryDate: item.expiryDate
            ? new Date(item.expiryDate).toISOString()
            : (null as any),
          quantity: qty,
          freeQuantity: Number(item.freeQuantity) || 0,
          purchaseRate: rate,
          salesRate: Number(item.salesRate) || 0,
          mrp: Number(item.mrp) || 0,
          discountPercent: discPct,
          discountAmount: discountAmount,
          taxPercent: taxPct,
          taxAmount: taxAmount,
          totalAmount: totalAmount,
          unitId: item.unitId || undefined,
          conversionFactor: item.conversionFactor || 1.0,
        }
      })

      const netAmount = Number(
        (subTotal - lineDiscountsSum + totalTax).toFixed(2)
      )

      const finalPayments =
        previewUpfrontPayments.length > 0
          ? previewUpfrontPayments
          : previewCurrentPaidAmount > 0
            ? [
                {
                  id: "default",
                  paidAmount: previewCurrentPaidAmount,
                  paymentMode: previewCurrentPaymentMode,
                },
              ]
            : []

      const finalPaidAmount = finalPayments.reduce(
        (sum, p) => sum + p.paidAmount,
        0
      )

      if (finalPaidAmount < 0) {
        toast.error("Paid amount cannot be negative.")
        return
      }
      if (finalPaidAmount > netAmount) {
        toast.error("Paid amount cannot exceed the net invoice amount.")
        return
      }

      const payload: PurchaseInvoiceDto = {
        companyId: user?.companyId || "F6579BDB-C05B-4AF0-9404-7EBC3C15B0D8",
        branchId: user?.branchId || "F6579BDB-C05B-4AF0-9404-7EBC3C15B0D8",
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
        paymentMode:
          finalPayments.length > 0 ? finalPayments[0].paymentMode : undefined,
        paymentDetails: finalPayments.map((p) => ({
          paidAmount: p.paidAmount,
          paymentMode: p.paymentMode,
        })),
        status,
        items: formattedItems,
      }

      let response: any
      if (isEditMode && editId) {
        response = await axiosClient.put(`/PurchaseInvoice/${editId}`, payload)
      } else {
        response = await axiosClient.post("/PurchaseInvoice", payload)
      }

      if (response?.success) {
        toast.success(
          status === 2
            ? "Purchase Invoice posted and stock updated!"
            : isEditMode
              ? "Purchase Invoice draft updated successfully!"
              : "Purchase Invoice saved as draft!"
        )
        setIsPreviewOpen(false)
        const savedId = response.data?.id || response.data?.Id || editId
        navigate("/purchase-invoice", { state: { autoViewInvoiceId: savedId } })
      } else {
        toast.error(response?.message || "Failed to save purchase invoice.")
      }
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "An error occurred while saving.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!canCreate) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="mb-2 text-2xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to view purchase modules.
          </p>
        </div>
      </Page>
    )
  }

  if (isLoadingEdit) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Loading invoice for editing...
          </span>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      {/* Top action header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/purchase-invoice")}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditMode ? "Edit Purchase Invoice" : "New Purchase Invoice"}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isEditMode
                ? "Update the draft invoice details. Only draft invoices can be edited."
                : "Record new purchase billing details from a supplier."}
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
            {isSaving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSave(2)}
            disabled={isSaving || isLoadingDeps}
            className="h-9 bg-green-600 text-xs text-white hover:bg-green-700"
          >
            {isSaving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Post Invoice (Receive Stock)
          </Button>
        </div>
      </div>

      {isLoadingDeps ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Loading configurations and catalogues...
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Excel Import Section */}
          <Section className="grid grid-cols-1 items-center gap-4 rounded-xl border border-zinc-200 bg-card/50 p-3.5 shadow-xs md:grid-cols-12 dark:border-zinc-800">
            <div className="space-y-1.5 md:col-span-7">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-500" />
                <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                  Quick Excel Import
                </h2>
              </div>
              <p className="text-[11px] leading-normal text-muted-foreground">
                Import invoice headers and items instantly. Download our
                template, populate your purchase data, and upload.
              </p>
              <Button
                variant="outline"
                type="button"
                onClick={downloadTemplate}
                className="h-7 gap-1.5 border-indigo-200 px-2.5 text-[11px] text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
              >
                <Download className="h-3 w-3" />
                Download Excel Template
              </Button>
            </div>

            <div className="md:col-span-5">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="group relative flex cursor-pointer flex-row items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-200 bg-muted/10 px-4 py-3 text-center transition-all duration-200 hover:border-indigo-400 hover:bg-muted/20 dark:border-zinc-800 dark:hover:border-indigo-600"
                onClick={() =>
                  document.getElementById("excel-file-input")?.click()
                }
              >
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {isUploading ? (
                  <div className="flex w-full max-w-[200px] flex-col items-center space-y-1.5">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Parsing Excel Data...
                    </span>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 shrink-0 text-zinc-400 transition-colors duration-200 group-hover:text-indigo-500" />
                    <div className="text-left">
                      <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                        Drag & drop file here or click
                      </span>
                      <span className="block text-[10px] text-zinc-400">
                        Supports .xlsx, .xls, .csv up to 10MB
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Section>

          {/* Header Metadata Section */}
          <Section className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-5 shadow-xs md:grid-cols-4">
            <div className="space-y-1" id="supplier-select-container">
              <label className="text-zinc-550 block text-xs font-semibold tracking-wider uppercase dark:text-zinc-400">
                Supplier
              </label>
              <div className="relative w-full">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search & Select Supplier..."
                    value={
                      isSupplierDropdownOpen
                        ? supplierSearchText
                        : (suppliers.find((s) => s.id === supplierId)?.name || "")
                    }
                    onChange={(e) => {
                      setSupplierSearchText(e.target.value)
                      setIsSupplierDropdownOpen(true)
                    }}
                    onFocus={() => {
                      setIsSupplierDropdownOpen(true)
                      setSupplierSearchText("")
                    }}
                    onKeyDown={handleSupplierSearchKeyDown}
                    className="h-9 w-full pr-14 text-xs bg-white dark:bg-zinc-900"
                  />
                  {supplierId && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSupplierId("")
                        setSupplierSearchText("")
                      }}
                      className="absolute top-0 right-8 flex h-9 w-8 items-center justify-center text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                    className="absolute top-0 right-0 flex h-9 w-8 items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </div>
                {isSupplierDropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                    {filteredSuppliers.length === 0 ? (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        No suppliers found
                      </div>
                    ) : (
                      filteredSuppliers.map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSupplierId(s.id || "")
                            setSupplierSearchText(s.name)
                            setIsSupplierDropdownOpen(false)
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-md p-2 text-left text-xs text-zinc-900 transition-colors duration-100 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-900 ${
                            s.id === supplierId || idx === activeSupplierSearchIndex
                              ? "bg-zinc-100 dark:bg-zinc-900"
                              : ""
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{s.name}</div>
                            {s.phone && (
                              <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                Phone: {s.phone}
                              </div>
                            )}
                          </div>
                          {s.id === supplierId && (
                            <Check className="h-3.5 w-3.5 text-indigo-500" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-550 block text-xs font-semibold tracking-wider uppercase dark:text-zinc-400">
                Destination Warehouse
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-xs text-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {filteredWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-555 block text-xs font-semibold tracking-wider uppercase dark:text-zinc-400">
                Supplier Invoice No.
              </label>
              <Input
                type="text"
                placeholder="e.g. INV-2026-001"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-555 block text-xs font-semibold tracking-wider uppercase dark:text-zinc-400">
                Invoice Date
              </label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-zinc-555 block text-xs font-semibold tracking-wider uppercase dark:text-zinc-400">
                Reference No / PO Number
              </label>
              <Input
                type="text"
                placeholder="e.g. PO-887766 (optional)"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-zinc-555 block text-xs font-semibold tracking-wider uppercase dark:text-zinc-400">
                Remarks / Notes
              </label>
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
          <Section className="overflow-hidden rounded-xl border border-border bg-card p-0 shadow-xs">
            <div className="flex flex-col gap-4 border-b border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-center">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 shrink-0">
                  Invoice Line Items
                </h2>
                <div className="relative w-full max-w-md" id="product-quick-search-container">
                  <div className="relative">
                    <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                    <Input
                      ref={quickSearchInputRef}
                      autoFocus
                      type="text"
                      placeholder="Quick Search & Add Product (Name, Code, or scan Barcode)..."
                      value={quickSearchText}
                      onChange={(e) => setQuickSearchText(e.target.value)}
                      onKeyDown={handleQuickSearchKeyDown}
                      className="h-9 pl-9 text-xs w-full bg-white dark:bg-zinc-900"
                    />
                    {isQuickSearching && (
                      <Loader2 className="absolute top-2.5 right-3 h-4 w-4 animate-spin text-zinc-400" />
                    )}
                  </div>
                  {quickSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                      {quickSearchResults.map((prod, idx) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleSelectQuickAddProduct(prod)}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-md p-2 text-left text-xs text-zinc-900 transition-colors duration-100 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-900 ${
                            idx === activeQuickSearchIndex ? "bg-zinc-100 dark:bg-zinc-900" : ""
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{prod.name}</div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                              Code: {prod.productCode} {prod.sku ? `• SKU: ${prod.sku}` : ""}
                            </div>
                          </div>
                          <div className="text-right font-mono font-semibold">
                            ₹{(prod.purchaseRate || 0).toFixed(2)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {quickSearchText.trim() && quickSearchResults.length === 0 && !isQuickSearching && (
                    <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-zinc-200 bg-white p-2.5 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="text-xs text-muted-foreground mb-2">No products found for "{quickSearchText}"</div>
                      <Button
                        type="button"
                        onClick={() => {
                          setQuickAddInitialName(quickSearchText)
                          setQuickAddTargetIndex(null)
                          setIsQuickAddOpen(true)
                        }}
                        className="h-7 w-full text-[10px] bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        + Quick Add "{quickSearchText}"
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 self-end sm:self-auto">
                <Button
                  type="button"
                  onClick={addLineItem}
                  className="h-8 gap-1 py-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Blank Row
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setQuickAddInitialName("")
                    setQuickAddTargetIndex(null)
                    setIsQuickAddOpen(true)
                  }}
                  variant="outline"
                  className="h-8 gap-1 py-1 text-xs border-indigo-200 text-indigo-650 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
                >
                  <Plus className="h-3.5 w-3.5" /> Quick Add Product
                </Button>
              </div>
            </div>{" "}
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="w-[40px] px-1 text-center">
                      Sr.
                    </TableHead>
                    <TableHead className="w-[200px] px-1.5">
                      Product Selection
                    </TableHead>
                    <TableHead className="w-[120px] px-1.5">Variant</TableHead>
                    <TableHead className="w-[110px] px-1.5">
                      Batch No.
                    </TableHead>
                    <TableHead className="w-[110px] px-1.5">
                      Expiry Date
                    </TableHead>
                    <TableHead className="w-[110px] px-1.5">
                      Unit
                    </TableHead>
                    <TableHead className="w-[90px] px-1.5 text-right">
                      Qty
                    </TableHead>
                    <TableHead className="w-[115px] px-1.5 text-right">
                      Free Qty
                    </TableHead>
                    <TableHead className="w-[85px] px-1.5 text-right">
                      Purchase Rate
                    </TableHead>
                    <TableHead className="w-[85px] px-1.5 text-right">
                      MRP
                    </TableHead>
                    <TableHead className="w-[85px] px-1.5 text-right">
                      Sales Rate
                    </TableHead>
                    <TableHead className="w-[70px] px-1.5 text-right">
                      Disc %
                    </TableHead>
                    <TableHead className="w-[70px] px-1.5 text-right">
                      Tax %
                    </TableHead>
                    <TableHead className="w-[95px] px-1.5 text-right">
                      Total Amount
                    </TableHead>
                    <TableHead className="w-[40px] px-1 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={14}
                        className="py-8 text-center text-xs text-muted-foreground"
                      >
                        No items added yet. Click "Add Line Item" to start
                        adding products.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => {
                      const prodVariants = getVariantsForProduct(item.productId)
                      const prodBatches = getBatchesForProduct(item.productId)
                      const selectedProduct = products.find(
                        (p) => p.id === item.productId
                      )

                      return (
                        <TableRow key={index} className="align-middle">
                          <TableCell className="px-1 py-2 text-center font-mono text-[10px]">
                            {index + 1}
                          </TableCell>
                          <TableCell className="px-1.5 py-2">
                            {(() => {
                              return (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectingProductForIndex(index)
                                  }
                                  className="flex h-8 w-full cursor-pointer items-center justify-between rounded-md border border-zinc-200 bg-white px-2 py-1 text-left text-xs text-zinc-900 transition-colors duration-150 hover:bg-zinc-50 focus:ring-1 focus:ring-zinc-900 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                                >
                                  {selectedProduct ? (
                                    <div className="truncate pr-1">
                                      <div className="truncate font-medium">
                                        {selectedProduct.name}
                                      </div>
                                      <div className="mt-0.5 truncate font-mono text-[9px] leading-none text-zinc-400">
                                        {selectedProduct.productCode}{" "}
                                        {selectedProduct.unitName
                                          ? `• Unit: ${selectedProduct.unitName}`
                                          : ""}
                                      </div>
                                    </div>
                                  ) : item.productId ? (
                                    <div className="truncate pr-1">
                                      <div className="truncate font-medium">
                                        {item.productName || "Product Loaded"}
                                      </div>
                                      <div className="mt-0.5 truncate font-mono text-[9px] leading-none text-zinc-400">
                                        {item.productCode || ""}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-400 dark:text-zinc-500">
                                      Select Product...
                                    </span>
                                  )}
                                  <Search className="ml-1.5 h-3 w-3 shrink-0 text-zinc-400" />
                                </button>
                              )
                            })()}
                          </TableCell>
                          <TableCell className="px-1.5 py-2">
                            <select
                              value={item.productVariantId || ""}
                              onChange={(e) =>
                                handleVariantChange(index, e.target.value)
                              }
                              disabled={
                                !item.productId || prodVariants.length === 0
                              }
                              className="h-8 w-full cursor-pointer rounded-md border border-zinc-200 bg-white px-1.5 text-xs text-zinc-900 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                            >
                              <option value="">Base Product</option>
                              {prodVariants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.variantCombination || v.sku}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="px-1.5 py-2">
                            <div className="relative w-full flex items-center">
                              <input
                                type="text"
                                list={`batch-list-${index}`}
                                placeholder="Batch No..."
                                value={item.batchNumber || ""}
                                onChange={(e) => {
                                  const batchNo = e.target.value
                                  const updated = [...items]
                                  updated[index].batchNumber = batchNo
                                  const matchedBatch = prodBatches.find(
                                    (b) =>
                                      b.batchNo?.toLowerCase() ===
                                      batchNo.toLowerCase()
                                  )
                                  if (matchedBatch) {
                                    updated[index].productBatchId =
                                      matchedBatch.id
                                    updated[index].expiryDate =
                                      matchedBatch.expiryDate
                                        ? matchedBatch.expiryDate.split("T")[0]
                                        : ""
                                    updated[index].mrp =
                                      matchedBatch.mrp || selectedProduct?.mrp || updated[index].mrp || 0
                                    updated[index].salesRate =
                                      matchedBatch.salesRate || matchedBatch.mrp || selectedProduct?.salesRate || updated[index].salesRate || 0
                                    updated[index].purchaseRate =
                                      matchedBatch.purchaseRate || selectedProduct?.purchaseRate || updated[index].purchaseRate || 0
                                  } else {
                                    updated[index].productBatchId = undefined
                                  }
                                  calculateLineTotals(updated, index)
                                }}
                                onFocus={(e) => {
                                  e.target.select()
                                }}
                                onBlur={(e) => {
                                  setTimeout(() => {
                                    setItems((currentItems) => {
                                      const updated = [...currentItems]
                                      const currentItem = updated[index]
                                      if (!currentItem || !currentItem.productId) return currentItems
                                      if (!currentItem.batchNumber && currentItem.productBatchId) {
                                        const matched = prodBatches.find(b => b.id === currentItem.productBatchId)
                                        if (matched) {
                                          currentItem.batchNumber = matched.batchNo || ""
                                        }
                                      }
                                      return updated
                                    })
                                  }, 150)
                                }}
                                disabled={!item.productId}
                                className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-2 pr-7 font-mono text-xs text-zinc-900 focus:outline-hidden disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 appearance-none"
                              />
                              {item.batchNumber && (
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    const updated = [...items]
                                    updated[index].batchNumber = ""
                                    updated[index].productBatchId = undefined
                                    updated[index].expiryDate = ""
                                    updated[index].purchaseRate = selectedProduct?.purchaseRate || updated[index].purchaseRate || 0
                                    updated[index].mrp = selectedProduct?.mrp || updated[index].mrp || 0
                                    updated[index].salesRate = selectedProduct?.salesRate || selectedProduct?.mrp || updated[index].salesRate || 0
                                    calculateLineTotals(updated, index)
                                    setItems(updated)
                                  }}
                                  className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-650 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <datalist id={`batch-list-${index}`}>
                              {prodBatches.map((b) => {
                                const expStr = b.expiryDate
                                  ? new Date(b.expiryDate).toLocaleDateString()
                                  : "No Expiry"
                                const avlQty = getBatchStock(item.productId, b.id || null)
                                return (
                                  <option
                                    key={b.id}
                                    value={b.batchNo}
                                  >
                                    {`Avl: ${avlQty} • MRP: ₹${b.mrp || 0} • Exp: ${expStr}`}
                                  </option>
                                )
                              })}
                            </datalist>
                          </TableCell>
                          <TableCell className="px-1.5 py-2">
                            <Input
                              type="date"
                              value={
                                item.expiryDate
                                  ? item.expiryDate.split("T")[0]
                                  : ""
                              }
                              onChange={(e) => {
                                const updated = [...items]
                                updated[index].expiryDate = e.target.value
                                setItems(updated)
                              }}
                              disabled={!item.productId}
                              className="h-8 px-1.5 py-1 text-xs"
                            />
                          </TableCell>

                          {/* Unit Selector */}
                          <TableCell className="px-1.5 py-2">
                            <select
                              value={item.unitId || selectedProduct?.unitId || ""}
                              onChange={(e) => handleUnitChange(index, e.target.value)}
                              disabled={!item.productId}
                              className="h-8 w-full cursor-pointer rounded-md border border-zinc-200 bg-white px-1.5 text-xs text-zinc-900 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                            >
                              {selectedProduct && (
                                <option value={selectedProduct.unitId}>
                                  {selectedProduct.unitName} (Base)
                                </option>
                              )}
                              {selectedProduct?.alternativeUnits?.map((alt) => (
                                <option key={alt.alternativeUnitId} value={alt.alternativeUnitId}>
                                  {alt.alternativeUnitName} (x{alt.conversionFactor})
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="px-1.5 py-2">
                            <div className="flex items-center gap-1">
                              <Input
                                id={`qty-input-${index}`}
                                type="number"
                                min="1"
                                step="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleNumericFieldChange(
                                    index,
                                    "quantity",
                                    Number(e.target.value)
                                  )
                                }
                                disabled={!item.productId}
                                className="h-8 w-full px-1.5 py-1 text-right font-mono text-xs"
                              />
                              {/* {selectedProduct?.unitName && (
                                <span className="text-zinc-550 shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-zinc-800 dark:text-zinc-400">
                                  {selectedProduct.unitName}
                                </span>
                              )} */}
                            </div>
                          </TableCell>
                          <TableCell className="px-1.5 py-2">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={item.freeQuantity}
                                onChange={(e) =>
                                  handleNumericFieldChange(
                                    index,
                                    "freeQuantity",
                                    Number(e.target.value)
                                  )
                                }
                                disabled={!item.productId}
                                className="h-8 w-full px-1.5 py-1 text-right font-mono text-xs"
                              />
                              {/* {selectedProduct?.unitName && (
                                <span className="text-zinc-550 shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-zinc-800 dark:text-zinc-400">
                                  {selectedProduct.unitName}
                                </span>
                              )} */}
                            </div>
                          </TableCell>
                          <TableCell className="px-1.5 py-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.purchaseRate}
                              onChange={(e) =>
                                handleNumericFieldChange(
                                  index,
                                  "purchaseRate",
                                  Number(e.target.value)
                                )
                              }
                              disabled={!item.productId}
                              className="h-8 px-1.5 py-1 text-right font-mono text-xs"
                            />
                          </TableCell>
                          <TableCell className="px-1.5 py-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.mrp}
                              onChange={(e) =>
                                handleNumericFieldChange(
                                  index,
                                  "mrp",
                                  Number(e.target.value)
                                )
                              }
                              disabled={!item.productId}
                              className="h-8 px-1.5 py-1 text-right font-mono text-xs"
                            />
                          </TableCell>
                          <TableCell className="px-1.5 py-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.salesRate}
                              onChange={(e) =>
                                handleNumericFieldChange(
                                  index,
                                  "salesRate",
                                  Number(e.target.value)
                                )
                              }
                              disabled={!item.productId}
                              className="h-8 px-1.5 py-1 text-right font-mono text-xs"
                            />
                          </TableCell>
                          <TableCell className="px-1.5 py-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.discountPercent}
                              onChange={(e) =>
                                handleNumericFieldChange(
                                  index,
                                  "discountPercent",
                                  Number(e.target.value)
                                )
                              }
                              disabled={!item.productId}
                              className="h-8 px-1.5 py-1 text-right font-mono text-xs"
                            />
                          </TableCell>
                          <TableCell className="px-1.5 py-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.taxPercent}
                              onChange={(e) =>
                                handleNumericFieldChange(
                                  index,
                                  "taxPercent",
                                  Number(e.target.value)
                                )
                              }
                              disabled={!item.productId}
                              className="h-8 px-1.5 py-1 text-right font-mono text-xs"
                            />
                          </TableCell>
                          <TableCell className="px-1.5 py-2 text-right font-mono text-xs font-semibold">
                            ₹{item.totalAmount?.toFixed(2) || "0.00"}
                          </TableCell>
                          <TableCell className="px-1 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLineItem(index)}
                              className="h-7 w-7 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>

          {/* Pricing Summary Layout */}
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
            <div className="w-full space-y-4 md:flex-1">
              {/* Payment Details Card */}
              <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                    Payment Details
                  </h3>
                  {remainingPayable > 0 && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 font-sans text-xs font-semibold text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">
                      Remaining: ₹{remainingPayable.toFixed(2)}
                    </span>
                  )}
                  {remainingPayable === 0 && summaries.netAmount > 0 && (
                    <span className="dark:text-emerald-450 rounded-full bg-emerald-50 px-2.5 py-1 font-sans text-xs font-semibold text-emerald-600 dark:bg-emerald-950/20">
                      Fully Paid
                    </span>
                  )}
                </div>

                {remainingPayable > 0 && (
                  <div className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border/50 bg-muted/10 p-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <div className="mb-0.5 flex items-center justify-between">
                        <label className="text-zinc-555 block text-xs font-semibold dark:text-zinc-400">
                          Amount to Pay (₹)
                        </label>
                        <button
                          type="button"
                          onClick={() => setCurrentPaidAmount(remainingPayable)}
                          className="dark:text-blue-450 cursor-pointer text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:hover:text-blue-400"
                        >
                          Pay in Full
                        </button>
                      </div>
                      <Input
                        type="number"
                        min="0.01"
                        max={remainingPayable}
                        step="0.01"
                        value={currentPaidAmount || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          if (val >= 0) {
                            setCurrentPaidAmount(
                              Math.min(val, remainingPayable)
                            )
                          } else if (e.target.value === "") {
                            setCurrentPaidAmount(0)
                          }
                        }}
                        className="h-9 font-mono text-xs"
                        placeholder="Enter amount..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-555 block text-xs font-semibold dark:text-zinc-400">
                        Payment Mode
                      </label>
                      <select
                        value={currentPaymentMode}
                        onChange={(e) =>
                          setCurrentPaymentMode(Number(e.target.value))
                        }
                        className="h-9 w-full cursor-pointer rounded-md border border-zinc-200 bg-white px-3 text-xs text-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
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
                          toast.error("Please enter a valid paid amount.")
                          return
                        }
                        if (currentPaidAmount > remainingPayable) {
                          toast.error(
                            "Paid amount cannot exceed the remaining due amount."
                          )
                          return
                        }
                        const newPayment: PaymentDetailItem = {
                          id: `pay-${Date.now()}-${Math.random()}`,
                          paidAmount: currentPaidAmount,
                          paymentMode: currentPaymentMode,
                        }
                        setUpfrontPayments([...upfrontPayments, newPayment])
                      }}
                      className="h-9 w-full gap-1.5 bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Payment
                    </Button>
                  </div>
                )}

                {/* Added Payments List */}
                {upfrontPayments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                      Added Splits
                    </h4>
                    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                      {upfrontPayments.map((p) => {
                        const getModeLabel = (mode: number) => {
                          switch (mode) {
                            case 1:
                              return "Cash"
                            case 2:
                              return "Bank Transfer"
                            case 3:
                              return "Card"
                            case 4:
                              return "UPI"
                            case 5:
                              return "Cheque"
                            default:
                              return "Unknown"
                          }
                        }
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between bg-card p-2 px-3 font-mono text-xs transition-colors duration-150 hover:bg-muted/10"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                                ₹{p.paidAmount.toFixed(2)}
                              </span>
                              <span className="rounded bg-zinc-100 px-2 py-0.5 font-sans text-[10px] font-semibold text-muted-foreground uppercase dark:bg-zinc-800">
                                {getModeLabel(p.paymentMode)}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setUpfrontPayments(
                                  upfrontPayments.filter(
                                    (item) => item.id !== p.id
                                  )
                                )
                              }}
                              className="hover:text-red-650 h-7 w-7 text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {totalPaidAmount > 0 && (
                  <div className="flex items-center justify-between border-t border-dashed border-border pt-3 font-mono text-xs font-semibold">
                    <span className="font-sans text-zinc-500">Total Paid:</span>
                    <span className="text-zinc-950 dark:text-zinc-50">
                      ₹{totalPaidAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Invoice Terms & Notes */}
              <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-2xs">
                <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                  Invoice Terms & Notes
                </h3>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Saving as a **Draft** stores the invoice details for future
                  edits without affecting your inventory stock levels. **Posting
                  the Invoice** locks the values and immediately performs a
                  stock-in transaction, increasing inventory status across the
                  selected warehouse.
                </p>
              </div>
            </div>

            <div className="w-full space-y-3 rounded-xl border border-border bg-card p-5 font-mono text-xs shadow-xs md:max-w-xs">
              <div className="text-zinc-550 flex justify-between dark:text-zinc-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                  ₹{summaries.subTotal.toFixed(2)}
                </span>
              </div>
              <div className="text-zinc-550 flex items-center justify-between dark:text-zinc-400">
                <span>Flat Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={flatDiscountAmount}
                  onChange={(e) =>
                    setFlatDiscountAmount(Number(e.target.value) || 0)
                  }
                  className="h-7 w-[100px] rounded-md border border-zinc-200 bg-white px-2 text-right font-mono text-xs text-zinc-900 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>
              <div className="text-zinc-550 flex justify-between dark:text-zinc-400">
                <span>Line Discounts:</span>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                  ₹{(summaries.totalDiscount - flatDiscountAmount).toFixed(2)}
                </span>
              </div>
              <div className="text-zinc-550 flex justify-between dark:text-zinc-400">
                <span>Total Tax (GST):</span>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                  ₹{summaries.totalTax.toFixed(2)}
                </span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-sm font-bold">
                <span>Net Payable:</span>
                <span className="dark:text-green-450 text-green-600">
                  ₹{summaries.netAmount.toFixed(2)}
                </span>
              </div>
              {totalPaidAmount > 0 && (
                <>
                  <div className="text-zinc-550 flex justify-between pt-1 dark:text-zinc-400">
                    <span>Total Paid:</span>
                    <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                      ₹{totalPaidAmount.toFixed(2)}
                    </span>
                  </div>
                  <hr className="border-dashed border-border" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Balance Due:</span>
                    <span className="text-red-500">
                      ₹{balanceDue.toFixed(2)}
                    </span>
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
          if (!open) setSelectingProductForIndex(null)
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col gap-4 p-5 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Select Product
            </DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search product by name, code, SKU, or barcode..."
              value={dialogSearch}
              onChange={(e) => setDialogSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
              autoFocus
            />
          </div>

          {/* Product Grid Table */}
          <div className="max-h-[450px] min-h-[300px] flex-1 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold tracking-wider text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="p-2.5 pl-3">Product Details</th>
                  <th className="w-[110px] p-2.5 text-right">Purchase Rate</th>
                  <th className="w-[110px] p-2.5 pr-3 text-right">MRP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {isSearchingProducts ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-zinc-400">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin mb-1 text-muted-foreground" />
                      Searching products...
                    </td>
                  </tr>
                ) : (
                  lookupProducts.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => {
                        if (selectingProductForIndex !== null) {
                          // Merge into master products list so main table can resolve details
                          setProducts((prev) => {
                            if (prev.some((item) => item.id === p.id)) return prev;
                            return [...prev, p];
                          });
                          handleProductChange(
                            selectingProductForIndex,
                            p.id || "",
                            p
                          )
                          setSelectingProductForIndex(null)
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                    >
                      <td className="p-2.5 pl-3">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {p.name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-zinc-400">
                          <span>Code: {p.productCode}</span>
                          {p.sku && <span>• SKU: {p.sku}</span>}
                          {p.unitName && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-sans font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              Unit: {p.unitName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="dark:text-zinc-350 p-2.5 text-right font-mono text-zinc-700">
                        ₹{p.purchaseRate?.toFixed(2) || "0.00"}
                      </td>
                      <td className="p-2.5 pr-3 text-right font-mono text-zinc-400">
                        ₹{p.mrp?.toFixed(2) || "0.00"}
                      </td>
                    </tr>
                  ))
                )}

                {!isSearchingProducts && lookupProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-zinc-400">
                      <div>No products match your search.</div>
                      {dialogSearch.trim() && (
                        <div className="mt-3">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setQuickAddInitialName(dialogSearch)
                              setQuickAddTargetIndex(selectingProductForIndex)
                              setIsQuickAddOpen(true)
                            }}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 h-7 text-[11px]"
                          >
                            + Quick Add "{dialogSearch}"
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="border-t border-zinc-100 pt-3 dark:border-zinc-800 flex justify-between items-center w-full">
            <Button
              variant="outline"
              type="button"
              className="h-8 px-3 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
              onClick={() => {
                setQuickAddInitialName(dialogSearch)
                setQuickAddTargetIndex(selectingProductForIndex)
                setIsQuickAddOpen(true)
              }}
            >
              + Quick Add Product
            </Button>
            <Button
              variant="outline"
              type="button"
              className="h-8 px-3 text-xs"
              onClick={() => setSelectingProductForIndex(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="fixed top-0 left-0 flex h-screen max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-4 rounded-none border-0 bg-popover p-6 shadow-none ring-0 sm:top-0 sm:left-0 sm:h-screen sm:max-h-none sm:w-screen sm:max-w-none sm:translate-x-0 sm:translate-y-0">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                Preview & Validate Purchase Import
              </DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Review parsed values and resolve any highlighted validation
                errors before final submission.
              </p>
            </div>

            <div className="flex gap-4 pr-6 font-mono text-xs">
              <div className="flex flex-col items-center rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <span className="dark:text-emerald-450 text-[10px] font-semibold text-emerald-600 uppercase">
                  Total Rows
                </span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {previewItems.length}
                </span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 dark:border-red-900/50 dark:bg-red-950/20">
                <span className="dark:text-red-450 text-[10px] font-semibold text-red-600 uppercase">
                  Errors
                </span>
                <span className="dark:text-red-450 font-mono text-sm font-bold text-red-700">
                  {previewItems.reduce(
                    (acc, item) => acc + Object.keys(item.errors).length,
                    0
                  ) +
                    (previewHeader
                      ? Object.keys(previewHeader.errors).length
                      : 0)}
                </span>
              </div>
            </div>
          </DialogHeader>

          {previewHeader && (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                {/* Left Card: Metadata Fields */}
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/20 p-4 md:grid-cols-3 lg:col-span-3">
                  <div className="space-y-1">
                    <label className="text-zinc-555 block text-xs font-semibold tracking-wider uppercase dark:text-zinc-400">
                      Supplier{" "}
                      {previewHeader.supplierSearch &&
                        `(${previewHeader.supplierSearch})`}
                    </label>
                    <select
                      value={previewHeader.supplierId}
                      onChange={(e) =>
                        handlePreviewHeaderChange("supplierId", e.target.value)
                      }
                      className={`h-8.5 w-full rounded-md border bg-white px-3 text-xs text-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-hidden dark:bg-zinc-900 dark:text-zinc-50 ${
                        previewHeader.errors.supplier
                          ? "border-red-500 focus:ring-red-500"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <option value="">Select Supplier...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {previewHeader.errors.supplier && (
                      <span className="flex items-center gap-1 text-[10px] text-red-500">
                        <AlertTriangle className="h-3 w-3" />{" "}
                        {previewHeader.errors.supplier}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-555 block text-xs font-semibold tracking-wider uppercase dark:text-zinc-400">
                      Warehouse{" "}
                      {previewHeader.warehouseSearch &&
                        `(${previewHeader.warehouseSearch})`}
                    </label>
                    <select
                      value={previewHeader.warehouseId}
                      onChange={(e) =>
                        handlePreviewHeaderChange("warehouseId", e.target.value)
                      }
                      className={`h-8.5 w-full rounded-md border bg-white px-3 text-xs text-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-hidden dark:bg-zinc-900 dark:text-zinc-50 ${
                        previewHeader.errors.warehouse
                          ? "border-red-500 focus:ring-red-500"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <option value="">Select Warehouse...</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    {previewHeader.errors.warehouse && (
                      <span className="flex items-center gap-1 text-[10px] text-red-500">
                        <AlertTriangle className="h-3 w-3" />{" "}
                        {previewHeader.errors.warehouse}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-555 block text-xs font-semibold tracking-wider uppercase dark:text-zinc-400">
                      Supplier Invoice No.
                    </label>
                    <Input
                      type="text"
                      value={previewHeader.invoiceNo}
                      onChange={(e) =>
                        handlePreviewHeaderChange("invoiceNo", e.target.value)
                      }
                      className={`h-8.5 text-xs ${previewHeader.errors.invoiceNo ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {previewHeader.errors.invoiceNo && (
                      <span className="flex items-center gap-1 text-[10px] text-red-500">
                        <AlertTriangle className="h-3 w-3" />{" "}
                        {previewHeader.errors.invoiceNo}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-555 block text-xs font-semibold tracking-wider uppercase dark:text-zinc-400">
                      Invoice Date
                    </label>
                    <Input
                      type="date"
                      value={previewHeader.invoiceDate}
                      onChange={(e) =>
                        handlePreviewHeaderChange("invoiceDate", e.target.value)
                      }
                      className={`h-8.5 text-xs ${previewHeader.errors.invoiceDate ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {previewHeader.errors.invoiceDate && (
                      <span className="flex items-center gap-1 text-[10px] text-red-500">
                        <AlertTriangle className="h-3 w-3" />{" "}
                        {previewHeader.errors.invoiceDate}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-555 block text-xs font-semibold tracking-wider uppercase dark:text-zinc-400">
                      Reference / PO Number
                    </label>
                    <Input
                      type="text"
                      value={previewHeader.referenceNo}
                      onChange={(e) =>
                        handlePreviewHeaderChange("referenceNo", e.target.value)
                      }
                      className="h-8.5 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-555 block text-xs font-semibold tracking-wider uppercase dark:text-zinc-400">
                      Remarks
                    </label>
                    <Input
                      type="text"
                      value={previewHeader.remarks}
                      onChange={(e) =>
                        handlePreviewHeaderChange("remarks", e.target.value)
                      }
                      className="h-8.5 text-xs"
                    />
                  </div>
                </div>

                {/* Right Card: Payment details in Excel Import Preview */}
                <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs lg:col-span-1">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="text-zinc-550 text-xs font-bold tracking-wider uppercase">
                      Payment Details
                    </h3>
                    {previewRemainingPayable > 0 && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 font-sans text-[10px] font-semibold text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">
                        Due: ₹{previewRemainingPayable.toFixed(2)}
                      </span>
                    )}
                    {previewRemainingPayable === 0 &&
                      previewSummary.netAmount > 0 && (
                        <span className="dark:text-emerald-450 rounded-full bg-emerald-50 px-2 py-0.5 font-sans text-[10px] font-semibold text-emerald-600 dark:bg-emerald-950/20">
                          Fully Paid
                        </span>
                      )}
                  </div>

                  {/* Net Payable and Balance Due Side-by-Side */}
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div className="space-y-0.5">
                      <span className="text-zinc-450 block font-sans text-[10px]">
                        Net Payable
                      </span>
                      <span className="block font-bold text-zinc-950 dark:text-zinc-50">
                        ₹{previewSummary.netAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-zinc-450 block font-sans text-[10px]">
                        Balance Due
                      </span>
                      <span
                        className={`block font-bold ${
                          previewSummary.netAmount - previewTotalPaidAmount > 0
                            ? "text-red-500"
                            : "dark:text-green-450 text-green-600"
                        }`}
                      >
                        ₹
                        {(
                          previewSummary.netAmount - previewTotalPaidAmount
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {previewRemainingPayable > 0 && (
                    <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <div className="mb-0.5 flex items-center justify-between">
                            <label className="text-zinc-555 dark:text-zinc-405 block text-[10px] font-semibold">
                              Amount (₹)
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewCurrentPaidAmount(
                                  previewRemainingPayable
                                )
                              }
                              className="dark:text-blue-450 cursor-pointer text-[9px] font-semibold text-blue-600 hover:text-blue-700 dark:hover:text-blue-400"
                            >
                              Pay in Full
                            </button>
                          </div>
                          <Input
                            type="number"
                            min="0.01"
                            max={previewRemainingPayable}
                            step="0.01"
                            value={previewCurrentPaidAmount || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              if (val >= 0) {
                                setPreviewCurrentPaidAmount(
                                  Math.min(val, previewRemainingPayable)
                                )
                              } else if (e.target.value === "") {
                                setPreviewCurrentPaidAmount(0)
                              }
                            }}
                            className="h-8 px-2 py-1 font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-zinc-555 dark:text-zinc-405 block text-[10px] font-semibold">
                            Mode
                          </label>
                          <select
                            value={previewCurrentPaymentMode}
                            onChange={(e) =>
                              setPreviewCurrentPaymentMode(
                                Number(e.target.value)
                              )
                            }
                            className="h-8 w-full cursor-pointer rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
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
                            toast.error("Please enter a valid paid amount.")
                            return
                          }
                          if (
                            previewCurrentPaidAmount > previewRemainingPayable
                          ) {
                            toast.error(
                              "Paid amount cannot exceed the remaining due amount."
                            )
                            return
                          }
                          const newPayment: PaymentDetailItem = {
                            id: `pay-preview-${Date.now()}-${Math.random()}`,
                            paidAmount: previewCurrentPaidAmount,
                            paymentMode: previewCurrentPaymentMode,
                          }
                          setPreviewUpfrontPayments([
                            ...previewUpfrontPayments,
                            newPayment,
                          ])
                        }}
                        className="h-8 w-full bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                      >
                        Add Payment
                      </Button>
                    </div>
                  )}

                  {/* Added splits inside preview */}
                  {previewUpfrontPayments.length > 0 && (
                    <div className="max-h-[100px] space-y-1.5 overflow-y-auto pr-1">
                      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                        {previewUpfrontPayments.map((p) => {
                          const getModeLabel = (mode: number) => {
                            switch (mode) {
                              case 1:
                                return "Cash"
                              case 2:
                                return "Bank"
                              case 3:
                                return "Card"
                              case 4:
                                return "UPI"
                              case 5:
                                return "Cheque"
                              default:
                                return "Unknown"
                            }
                          }
                          return (
                            <div
                              key={p.id}
                              className="flex items-center justify-between bg-card p-1.5 px-2 font-mono text-[10px] transition-colors duration-150 hover:bg-muted/10"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                                  ₹{p.paidAmount.toFixed(2)}
                                </span>
                                <span className="rounded bg-zinc-100 px-1 font-sans text-[9px] font-semibold text-muted-foreground uppercase dark:bg-zinc-800">
                                  {getModeLabel(p.paymentMode)}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPreviewUpfrontPayments(
                                    previewUpfrontPayments.filter(
                                      (item) => item.id !== p.id
                                    )
                                  )
                                }}
                                className="hover:text-red-650 h-5 w-5 text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                <div className="flex items-center justify-between border-b border-border bg-muted/20 p-3">
                  <h3 className="text-xs font-bold tracking-wider text-zinc-900 uppercase dark:text-zinc-50">
                    Line Items
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPreviewItem}
                    className="h-7 gap-1 px-2.5 py-1 text-[10px] text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Add Row
                  </Button>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[1300px] border-collapse text-left text-xs">
                    <thead className="border-b border-border bg-muted/10 font-bold">
                      <tr>
                        <th className="w-[45px] p-2 text-center">Status</th>
                        <th className="w-[180px] p-2">Excel Input</th>
                        <th className="w-[200px] p-2">Product Match</th>
                        <th className="w-[110px] p-2">Variant</th>
                        <th className="w-[110px] p-2">Unit</th>
                        <th className="w-[220px] p-2">Batch & Expiry Date</th>
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
                          <td
                            colSpan={15}
                            className="py-8 text-center text-xs text-muted-foreground"
                          >
                            No items to preview. Add a row to get started.
                          </td>
                        </tr>
                      ) : (
                        previewItems.map((item, idx) => {
                          const rowHasErrors =
                            Object.keys(item.errors).length > 0
                          const itemVariants = getVariantsForProduct(
                            item.productId
                          )
                          const itemBatches = getBatchesForProduct(
                            item.productId
                          )
                          const rowTotal =
                            (Number(item.quantity) || 0) *
                            (Number(item.purchaseRate) || 0)
                          const rowDisc =
                            rowTotal *
                            ((Number(item.discountPercent) || 0) / 100)
                          const rowTax =
                            (rowTotal - rowDisc) *
                            ((Number(item.taxPercent) || 0) / 100)
                          const rowNet = rowTotal - rowDisc + rowTax

                          return (
                            <tr
                              key={item.id}
                              className={`align-middle transition-colors duration-150 ${
                                rowHasErrors
                                  ? "bg-red-500/5 hover:bg-red-500/10 dark:bg-red-950/10 dark:hover:bg-red-950/20"
                                  : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                              }`}
                            >
                              <td className="p-2 text-center">
                                {rowHasErrors ? (
                                  <div className="group relative inline-flex cursor-help items-center justify-center rounded-full bg-red-100 p-1 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                                    <AlertTriangle className="h-4 w-4" />
                                    <div className="absolute top-1/2 left-6 z-50 hidden w-72 -translate-y-1/2 rounded-lg border border-border bg-popover p-2.5 text-left font-normal text-zinc-900 shadow-md group-hover:block dark:text-zinc-50">
                                      <h4 className="mb-1.5 text-[10px] font-bold tracking-wider text-red-500 uppercase">
                                        Validation Errors (Row {idx + 1})
                                      </h4>
                                      <ul className="list-disc space-y-1 pl-3.5 text-[11px] leading-relaxed text-muted-foreground">
                                        {Object.entries(item.errors).map(
                                          ([key, msg]) => (
                                            <li
                                              key={key}
                                              className="text-zinc-800 dark:text-zinc-200"
                                            >
                                              <span className="font-semibold capitalize">
                                                {key}:
                                              </span>{" "}
                                              {msg}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center justify-center rounded-full bg-green-100 p-1 text-green-600 dark:bg-green-950/40 dark:text-green-400">
                                    <Check className="h-4 w-4" />
                                  </span>
                                )}
                              </td>

                              <td className="text-zinc-550 max-w-[180px] truncate p-2 font-mono text-[10px] dark:text-zinc-400">
                                {item.productSearch || (
                                  <span className="text-zinc-450 font-sans italic">
                                    Added Row
                                  </span>
                                )}
                              </td>

                              <td className="p-2">
                                <select
                                  value={item.productId}
                                  onChange={(e) =>
                                    handlePreviewItemChange(
                                      idx,
                                      "productId",
                                      e.target.value
                                    )
                                  }
                                  className={`h-8 w-full rounded-md border bg-white px-2 text-xs text-zinc-900 focus:outline-hidden dark:bg-zinc-900 dark:text-zinc-50 ${
                                    item.errors.product
                                      ? "border-red-500 focus:ring-red-500"
                                      : "border-zinc-200 dark:border-zinc-800"
                                  }`}
                                >
                                  <option value="">Select Product...</option>
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.productCode})
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td className="p-2">
                                <select
                                  value={item.productVariantId}
                                  onChange={(e) =>
                                    handlePreviewItemChange(
                                      idx,
                                      "productVariantId",
                                      e.target.value
                                    )
                                  }
                                  disabled={
                                    !item.productId || itemVariants.length === 0
                                  }
                                  className={`h-8 w-full rounded-md border bg-white px-1.5 text-xs text-zinc-900 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-900 dark:text-zinc-50 ${
                                    item.errors.variant
                                      ? "border-red-500"
                                      : "border-zinc-200 dark:border-zinc-800"
                                  }`}
                                >
                                  <option value="">Base Product</option>
                                  {itemVariants.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.variantCombination || v.sku}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td className="p-2">
                                <select
                                  value={item.unitId || ""}
                                  onChange={(e) =>
                                    handlePreviewItemChange(idx, "unitId", e.target.value)
                                  }
                                  disabled={!item.productId}
                                  className="h-8 w-full cursor-pointer rounded-md border border-zinc-200 bg-white px-1.5 text-xs text-zinc-900 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                                >
                                  {(() => {
                                    const matchedProduct = products.find((p) => p.id === item.productId)
                                    return (
                                      <>
                                        {matchedProduct && (
                                          <option value={matchedProduct.unitId}>
                                            {matchedProduct.unitName} (Base)
                                          </option>
                                        )}
                                        {matchedProduct?.alternativeUnits?.map((alt) => (
                                          <option key={alt.alternativeUnitId} value={alt.alternativeUnitId}>
                                            {alt.alternativeUnitName} (x{alt.conversionFactor})
                                          </option>
                                        ))}
                                      </>
                                    )
                                  })()}
                                </select>
                              </td>

                              <td className="p-2">
                                <div className="flex items-center gap-1.5">
                                  <div className="relative w-1/2">
                                    <input
                                      type="text"
                                      list={`preview-batch-list-${idx}`}
                                      placeholder="Batch No..."
                                      value={item.batchNumber || ""}
                                      onChange={(e) => {
                                        const batchNo = e.target.value
                                        const matchedBatch = itemBatches.find(
                                          (b) =>
                                            b.batchNo?.toLowerCase() ===
                                            batchNo.toLowerCase()
                                        )
                                        if (matchedBatch) {
                                          handlePreviewItemChange(
                                            idx,
                                            "productBatchId",
                                            matchedBatch.id
                                          )
                                          handlePreviewItemChange(
                                            idx,
                                            "batchNumber",
                                            matchedBatch.batchNo
                                          )
                                          handlePreviewItemChange(
                                            idx,
                                            "expiryDate",
                                            matchedBatch.expiryDate
                                              ? matchedBatch.expiryDate.split(
                                                  "T"
                                                )[0]
                                              : ""
                                          )
                                          handlePreviewItemChange(
                                            idx,
                                            "mrp",
                                            matchedBatch.mrp || item.mrp
                                          )
                                        } else {
                                          handlePreviewItemChange(
                                            idx,
                                            "productBatchId",
                                            ""
                                          )
                                          handlePreviewItemChange(
                                            idx,
                                            "batchNumber",
                                            batchNo
                                          )
                                        }
                                      }}
                                      disabled={!item.productId}
                                      className={`h-8 w-full rounded-md border bg-white px-2 font-mono text-xs text-zinc-900 focus:outline-hidden disabled:opacity-40 dark:bg-zinc-900 dark:text-zinc-50 ${
                                        item.errors.batch
                                          ? "border-red-500"
                                          : "border-zinc-200 dark:border-zinc-800"
                                      }`}
                                    />
                                    <datalist id={`preview-batch-list-${idx}`}>
                                      {itemBatches.map((b) => {
                                        const expStr = b.expiryDate
                                          ? new Date(b.expiryDate).toLocaleDateString()
                                          : "No Expiry"
                                        const avlQty = getBatchStock(item.productId, b.id || null)
                                        return (
                                          <option
                                            key={b.id}
                                            value={b.batchNo}
                                          >
                                            {`Avl: ${avlQty} • MRP: ₹${b.mrp || 0} • Exp: ${expStr}`}
                                          </option>
                                        )
                                      })}
                                    </datalist>
                                  </div>
                                  <input
                                    type="date"
                                    value={
                                      item.expiryDate
                                        ? item.expiryDate.split("T")[0]
                                        : ""
                                    }
                                    onChange={(e) =>
                                      handlePreviewItemChange(
                                        idx,
                                        "expiryDate",
                                        e.target.value
                                      )
                                    }
                                    disabled={!item.productId}
                                    className="h-8 w-1/2 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  />
                                </div>
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handlePreviewItemChange(
                                      idx,
                                      "quantity",
                                      Number(e.target.value)
                                    )
                                  }
                                  className={`h-8 px-1.5 py-1 text-right font-mono text-xs ${item.errors.quantity ? "border-red-500" : ""}`}
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.freeQuantity}
                                  onChange={(e) =>
                                    handlePreviewItemChange(
                                      idx,
                                      "freeQuantity",
                                      Number(e.target.value)
                                    )
                                  }
                                  className={`h-8 px-1.5 py-1 text-right font-mono text-xs ${item.errors.freeQuantity ? "border-red-500" : ""}`}
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.purchaseRate}
                                  onChange={(e) =>
                                    handlePreviewItemChange(
                                      idx,
                                      "purchaseRate",
                                      Number(e.target.value)
                                    )
                                  }
                                  className={`h-8 px-1.5 py-1 text-right font-mono text-xs ${item.errors.purchaseRate ? "border-red-500" : ""}`}
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.mrp}
                                  onChange={(e) =>
                                    handlePreviewItemChange(
                                      idx,
                                      "mrp",
                                      Number(e.target.value)
                                    )
                                  }
                                  className={`h-8 px-1.5 py-1 text-right font-mono text-xs ${item.errors.mrp ? "border-red-500" : ""}`}
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.salesRate}
                                  onChange={(e) =>
                                    handlePreviewItemChange(
                                      idx,
                                      "salesRate",
                                      Number(e.target.value)
                                    )
                                  }
                                  className={`h-8 px-1.5 py-1 text-right font-mono text-xs ${item.errors.salesRate ? "border-red-500" : ""}`}
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.discountPercent}
                                  onChange={(e) =>
                                    handlePreviewItemChange(
                                      idx,
                                      "discountPercent",
                                      Number(e.target.value)
                                    )
                                  }
                                  className={`h-8 px-1.5 py-1 text-right font-mono text-xs ${item.errors.discountPercent ? "border-red-500" : ""}`}
                                />
                              </td>

                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.taxPercent}
                                  onChange={(e) =>
                                    handlePreviewItemChange(
                                      idx,
                                      "taxPercent",
                                      Number(e.target.value)
                                    )
                                  }
                                  className={`h-8 px-1.5 py-1 text-right font-mono text-xs ${item.errors.taxPercent ? "border-red-500" : ""}`}
                                />
                              </td>

                              <td className="p-2 pr-3 text-right font-mono text-xs font-semibold">
                                ₹{rowNet.toFixed(2)}
                              </td>

                              <td className="p-2 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemovePreviewItem(idx)}
                                  className="h-7 w-7 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex w-full items-center justify-between border-t border-border pt-3 sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-medium text-muted-foreground">
                * Hover over the status icon to see specific cell validation
                errors.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                type="button"
                className="h-9 px-4 text-xs"
                onClick={() => setIsPreviewOpen(false)}
              >
                Cancel & Exit
              </Button>
              <Button
                type="button"
                onClick={() => handleConfirmSubmit(1)}
                disabled={isSaving}
                className="h-9 px-4 text-xs"
              >
                {isSaving && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Save as Draft
              </Button>
              <Button
                type="button"
                onClick={() => handleConfirmSubmit(2)}
                disabled={isSaving}
                className="h-9 bg-green-600 px-4 text-xs text-white hover:bg-green-700"
              >
                {isSaving && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Confirm & Post Invoice
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <QuickAddProductDialog
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={handleQuickAddSuccess}
        initialName={quickAddInitialName}
      />
    </Page>
  )
}
