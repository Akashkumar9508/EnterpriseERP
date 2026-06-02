import { useEffect, useState, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Percent,
  FileText,
  DollarSign,
  Package,
  Calendar,
  Layers,
  ShieldCheck,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import axiosClient from "@/Services/axiosClient"
import { usePermissions } from "@/hooks/usePermissions"
import { useAppSelector } from "@/store/hooks"
import { toast } from "sonner"

import type { PurchaseOrderDto } from "@/types/PurchaseOrderDto"
import type { PurchaseInvoiceDto } from "@/types/PurchaseInvoiceDto"
import type { ProductDto } from "@/types/ProductDto"
import type { GstDto } from "@/types/GstDto"

interface ReceiveItem {
  productId: string
  productName: string
  productCode: string
  orderedQty: number
  receivedQty: number
  freeQty: number
  purchaseRate: number
  mrp: number
  salesRate: number
  discountPercent: number
  discountAmount: number
  taxPercent: number
  taxAmount: number
  totalAmount: number
  batchNumber: string
  expiryDate: string
}

export default function ReceivePurchaseOrder() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { canCreate } = usePermissions("/purchaseorder")
  const user = useAppSelector((state) => state.auth.user)

  // States
  const [po, setPo] = useState<PurchaseOrderDto | null>(null)
  const [products, setProducts] = useState<ProductDto[]>([])
  const [taxProfiles, setTaxProfiles] = useState<GstDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form Fields
  const [invoiceNo, setInvoiceNo] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [referenceNo, setReferenceNo] = useState("")
  const [remarks, setRemarks] = useState("")
  const [paymentMode, setPaymentMode] = useState<number>(1) // 1 = Cash
  const [paidAmount, setPaidAmount] = useState<number>(0)

  // Split Payment States
  const [paymentSplits, setPaymentSplits] = useState<
    { id: string; paidAmount: number; paymentMode: number }[]
  >([])
  const [currentSplitAmount, setCurrentSplitAmount] = useState<string>("")
  const [currentSplitMode, setCurrentSplitMode] = useState<number>(1)

  const totalPaidAmount = useMemo(() => {
    if (paymentSplits.length > 0) {
      return paymentSplits.reduce((sum, sp) => sum + sp.paidAmount, 0)
    }
    return paidAmount
  }, [paymentSplits, paidAmount])

  // Table Items
  const [items, setItems] = useState<ReceiveItem[]>([])

  // Fetch PO and other dependencies
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [resPo, resProd, resTax] = (await Promise.all([
          axiosClient.get(`/PurchaseOrder/${id}`),
          axiosClient.get("/Product", {
            params: { pageNumber: 1, pageSize: 10000 },
          }),
          axiosClient.get("/TaxProfile", {
            params: { pageNumber: 1, pageSize: 10000 },
          }),
        ])) as any[]

        let activePo: PurchaseOrderDto | null = null
        let productList: ProductDto[] = []
        let taxProfilesList: GstDto[] = []

        if (resPo?.success) {
          activePo = resPo.data
          setPo(activePo)
          setInvoiceNo(`REC-${activePo?.poNumber || ""}`)
          setReferenceNo(activePo?.poNumber || "")
        }

        if (resProd?.success) {
          productList = resProd.data?.items || resProd.data || []
          setProducts(productList)
        }

        if (resTax?.success) {
          taxProfilesList = resTax.data?.items || resTax.data || []
          setTaxProfiles(taxProfilesList)
        }

        // Map PO Items to Receive items, fetching default tax rates, MRPs, and sales rates from product dependencies
        if (activePo && activePo.items) {
          const mappedItems = activePo.items.map((poItem) => {
            const product = productList.find((p) => p.id === poItem.productId)

            // lookup tax rate
            let taxPct = 0
            if (product && product.taxProfileId) {
              const taxProfile = taxProfilesList.find(
                (tp) => tp.id === product.taxProfileId
              )
              if (taxProfile) taxPct = taxProfile.igst
            }

            const qty = poItem.orderedQty || 0
            const rate = poItem.rate || 0
            const amt = qty * rate

            // Simple line calculations
            const discountPct = 0
            const discountAmt = 0
            const taxableAmt = amt - discountAmt
            const taxAmt = taxableAmt * (taxPct / 100)
            const totalAmt = taxableAmt + taxAmt

            return {
              productId: poItem.productId,
              productName:
                poItem.productName || product?.name || "Unknown Product",
              productCode: poItem.productCode || product?.productCode || "",
              orderedQty: qty,
              receivedQty: qty, // Default to ordered qty
              freeQty: 0,
              purchaseRate: rate,
              mrp: product?.mrp || rate * 1.5,
              salesRate: product?.salesRate || rate * 1.25,
              discountPercent: discountPct,
              discountAmount: Number(discountAmt.toFixed(2)),
              taxPercent: taxPct,
              taxAmount: Number(taxAmt.toFixed(2)),
              totalAmount: Number(totalAmt.toFixed(2)),
              batchNumber: "",
              expiryDate: "",
            }
          })
          setItems(mappedItems)
        }
      } catch (e) {
        console.error("Failed to load receive PO screen data", e)
        toast.error("Failed to load Purchase Order details.")
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])

  // Handle line updates
  const handleLineChange = (
    index: number,
    field: keyof ReceiveItem,
    value: any
  ) => {
    const updated = [...items]
    const item = { ...updated[index], [field]: value } as ReceiveItem

    // Recalculate line totals
    const qty = Number(item.receivedQty) || 0
    const rate = Number(item.purchaseRate) || 0
    const discPct = Number(item.discountPercent) || 0
    const taxPct = Number(item.taxPercent) || 0

    const amount = qty * rate
    const discountAmount = amount * (discPct / 100)
    const taxableAmount = amount - discountAmount
    const taxAmount = taxableAmount * (taxPct / 100)
    const totalAmount = taxableAmount + taxAmount

    item.discountAmount = Number(discountAmount.toFixed(2))
    item.taxAmount = Number(taxAmount.toFixed(2))
    item.totalAmount = Number(totalAmount.toFixed(2))

    updated[index] = item
    setItems(updated)
  }

  // Summaries
  const summaries = useMemo(() => {
    let subTotal = 0
    let discountAmount = 0
    let taxAmount = 0
    let netAmount = 0

    items.forEach((item) => {
      const qty = Number(item.receivedQty) || 0
      const rate = Number(item.purchaseRate) || 0
      subTotal += qty * rate
      discountAmount += Number(item.discountAmount) || 0
      taxAmount += Number(item.taxAmount) || 0
    })

    netAmount = subTotal - discountAmount + taxAmount

    return {
      subTotal: Number(subTotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
    }
  }, [items])

  const balanceDue = useMemo(() => {
    return Number((summaries.netAmount - totalPaidAmount).toFixed(2))
  }, [summaries.netAmount, totalPaidAmount])

  // Submit Receipt
  const handleConfirmReceipt = async () => {
    if (!po) return
    if (!invoiceNo.trim()) {
      toast.error("Please enter an Invoice Number.")
      return
    }

    // Validation
    const invalidItem = items.some(
      (item) =>
        Number(item.receivedQty) <= 0 ||
        Number(item.purchaseRate) < 0 ||
        Number(item.mrp) < 0 ||
        Number(item.salesRate) < 0
    )

    if (invalidItem) {
      toast.error(
        "Please ensure all items have a Received Quantity > 0 and Rates >= 0."
      )
      return
    }

    const finalPaidAmount =
      paymentSplits.length > 0
        ? paymentSplits.reduce((sum, sp) => sum + sp.paidAmount, 0)
        : paidAmount

    if (finalPaidAmount < 0) {
      toast.error("Paid amount cannot be negative.")
      return
    }

    if (finalPaidAmount > summaries.netAmount) {
      toast.error("Paid amount cannot exceed the net invoice amount.")
      return
    }

    setIsSubmitting(true)
    try {
      const finalPayments =
        paymentSplits.length > 0
          ? paymentSplits.map((sp) => ({
              paidAmount: sp.paidAmount,
              paymentMode: sp.paymentMode,
            }))
          : finalPaidAmount > 0
            ? [{ paidAmount: finalPaidAmount, paymentMode: paymentMode }]
            : []

      const payload: PurchaseInvoiceDto = {
        companyId: po.companyId,
        branchId: po.branchId,
        supplierId: po.supplierId,
        warehouseId: po.warehouseId,
        invoiceNo: invoiceNo,
        invoiceDate: new Date(invoiceDate).toISOString(),
        referenceNo: referenceNo,
        purchaseOrderId: po.id,
        poNumber: po.poNumber,
        subTotal: summaries.subTotal,
        discountAmount: summaries.discountAmount,
        taxAmount: summaries.taxAmount,
        netAmount: summaries.netAmount,
        remarks: remarks,
        paidAmount: finalPaidAmount,
        paymentMode:
          finalPaidAmount > 0
            ? paymentSplits.length > 0
              ? paymentSplits[0].paymentMode
              : paymentMode
            : undefined,
        paymentDetails: finalPayments,
        status: 2, // Always created as 2: Posted (updates stock!)
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.receivedQty),
          freeQuantity: Number(item.freeQty) || 0,
          purchaseRate: Number(item.purchaseRate),
          salesRate: Number(item.salesRate) || 0,
          mrp: Number(item.mrp) || 0,
          discountPercent: Number(item.discountPercent) || 0,
          discountAmount: Number(item.discountAmount) || 0,
          taxPercent: Number(item.taxPercent) || 0,
          taxAmount: Number(item.taxAmount) || 0,
          totalAmount: Number(item.totalAmount) || 0,
          batchNumber: item.batchNumber || undefined,
          expiryDate: item.expiryDate
            ? new Date(item.expiryDate).toISOString()
            : undefined,
        })),
      }

      const response: any = await axiosClient.post(
        `/PurchaseOrder/receive/${po.id}`,
        payload
      )
      if (response?.success) {
        toast.success(
          "Purchase Order successfully received! Stock has been incremented."
        )
        navigate("/purchaseorder")
      } else {
        toast.error(response?.message || "Failed to receive Purchase Order.")
      }
    } catch (e: any) {
      console.error(e)
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "An error occurred during submission."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canCreate) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="mb-2 text-2xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to receive orders.
          </p>
        </div>
      </Page>
    )
  }

  if (isLoading) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-zinc-500" />
          <p className="text-sm text-muted-foreground">
            Loading order details...
          </p>
        </div>
      </Page>
    )
  }

  if (!po) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="mb-2 h-10 w-10 text-red-500" />
          <h2 className="mb-2 text-2xl font-semibold">Order Not Found</h2>
          <p className="text-muted-foreground">
            The Purchase Order you are trying to receive does not exist or has
            been deleted.
          </p>
          <Button onClick={() => navigate("/purchaseorder")} className="mt-4">
            Back to Orders
          </Button>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/purchaseorder")}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Receive Order</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Verify received items for PO:{" "}
              <span className="font-mono font-bold">{po.poNumber}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/purchaseorder")}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReceipt}
            disabled={isSubmitting}
            className="shrink-0 gap-1.5 border-none bg-green-600 text-white hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Confirm Receipt (Stock In)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Invoice Header Details */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section
          title="Receipt & Billing Details"
          className="p-5 lg:col-span-2"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500">
                Invoice Number *
              </label>
              <Input
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="h-9 border-border bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500">
                Invoice Date *
              </label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-9 border-border bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500">
                Reference No / PO
              </label>
              <Input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="h-9 border-border bg-card font-mono"
              />
            </div>

            {paymentSplits.length === 0 ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500">
                    Payment Mode
                  </label>
                  <Select
                    value={paymentMode.toString()}
                    onValueChange={(val) => setPaymentMode(parseInt(val))}
                  >
                    <SelectTrigger className="h-9 border-border bg-card">
                      <SelectValue placeholder="Select Payment Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Cash</SelectItem>
                      <SelectItem value="2">Bank Transfer</SelectItem>
                      <SelectItem value="3">Credit Card</SelectItem>
                      <SelectItem value="4">UPI / Mobile</SelectItem>
                      <SelectItem value="5">Unpaid (Credit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-500">
                      Paid Amount (₹)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const baseDue = summaries.netAmount
                        const val = paidAmount || 0
                        if (val > 0 && val <= baseDue) {
                          setPaymentSplits([
                            {
                              id: `pay-${Date.now()}`,
                              paidAmount: val,
                              paymentMode: paymentMode,
                            },
                          ])
                          const remaining = baseDue - val
                          setCurrentSplitAmount(
                            remaining > 0 ? remaining.toFixed(2) : "0.00"
                          )
                          setCurrentSplitMode(1)
                        } else {
                          // Start with net amount as initial split
                          setPaymentSplits([
                            {
                              id: `pay-${Date.now()}`,
                              paidAmount: baseDue,
                              paymentMode: paymentMode,
                            },
                          ])
                          setCurrentSplitAmount("0.00")
                          setCurrentSplitMode(1)
                        }
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      + Split Payment
                    </button>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount || ""}
                    onChange={(e) =>
                      setPaidAmount(
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="h-9 border-border bg-card font-mono"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2 rounded-xl border border-border bg-muted/15 p-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Payment Splits
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentSplits([])
                      setPaidAmount(totalPaidAmount)
                    }}
                    className="text-[10px] text-zinc-400 transition-colors hover:text-red-500"
                  >
                    Reset to Single Payment
                  </button>
                </div>

                {/* Splits list */}
                <div className="max-h-[120px] space-y-1 overflow-y-auto pr-1">
                  {paymentSplits.map((p) => {
                    const getModeLabel = (mode: number) => {
                      switch (mode) {
                        case 1:
                          return "Cash"
                        case 2:
                          return "Bank Transfer"
                        case 3:
                          return "Credit Card"
                        case 4:
                          return "UPI / Mobile"
                        case 5:
                          return "Unpaid (Credit)"
                        default:
                          return "Unknown"
                      }
                    }
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-1.5 px-3 font-mono text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            ₹{p.paidAmount.toFixed(2)}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground uppercase">
                            {getModeLabel(p.paymentMode)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = paymentSplits.filter(
                              (item) => item.id !== p.id
                            )
                            setPaymentSplits(updated)
                            const remaining =
                              summaries.netAmount -
                              updated.reduce(
                                (sum, sp) => sum + sp.paidAmount,
                                0
                              )
                            setCurrentSplitAmount(
                              remaining > 0 ? remaining.toFixed(2) : "0.00"
                            )
                          }}
                          className="text-[11px] font-semibold text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Add Split Form */}
                {summaries.netAmount - totalPaidAmount > 0.01 && (
                  <div className="grid grid-cols-3 gap-2 border-t border-dashed border-border pt-2">
                    <div className="col-span-1">
                      <Input
                        type="number"
                        step="any"
                        min="0.01"
                        value={currentSplitAmount}
                        onChange={(e) => setCurrentSplitAmount(e.target.value)}
                        placeholder="Amount"
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                    <div className="col-span-1">
                      <select
                        value={currentSplitMode}
                        onChange={(e) =>
                          setCurrentSplitMode(Number(e.target.value))
                        }
                        className="h-8 w-full cursor-pointer rounded-md border border-input bg-zinc-950 px-2 text-xs text-zinc-100 outline-none"
                      >
                        <option value={1}>Cash</option>
                        <option value={2}>Bank Transfer</option>
                        <option value={3}>Credit Card</option>
                        <option value={4}>UPI / Mobile</option>
                        <option value={5}>Unpaid (Credit)</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        onClick={() => {
                          const val = parseFloat(currentSplitAmount) || 0
                          const remaining =
                            summaries.netAmount - totalPaidAmount
                          if (val <= 0) {
                            toast.error("Please enter a valid paid amount.")
                            return
                          }
                          if (val > remaining + 0.01) {
                            toast.error(
                              "Paid amount cannot exceed the remaining due amount."
                            )
                            return
                          }
                          const newSplit = {
                            id: `pay-${Date.now()}-${Math.random()}`,
                            paidAmount: val,
                            paymentMode: currentSplitMode,
                          }
                          const updated = [...paymentSplits, newSplit]
                          setPaymentSplits(updated)

                          const nextRemaining =
                            summaries.netAmount -
                            updated.reduce((sum, sp) => sum + sp.paidAmount, 0)
                          setCurrentSplitAmount(
                            nextRemaining > 0
                              ? nextRemaining.toFixed(2)
                              : "0.00"
                          )
                        }}
                        className="h-8 w-full bg-zinc-900 text-xs text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950"
                      >
                        Add Split
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500">
                Remarks
              </label>
              <Input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="h-9 border-border bg-card"
                placeholder="e.g. Received in good condition"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
            <div>
              Supplier:{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {po.supplierName}
              </span>
            </div>
            <div>
              Receiving Warehouse:{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {po.warehouseName}
              </span>
            </div>
          </div>
        </Section>

        {/* Totals Summary */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wider text-zinc-700 uppercase dark:text-zinc-300">
              Billing Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Amount</span>
                <span className="font-mono">
                  ₹{summaries.subTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Discount</span>
                <span className="font-mono text-green-600">
                  -₹{summaries.discountAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST Tax Amount</span>
                <span className="font-mono">
                  ₹{summaries.taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="my-2 h-px bg-border"></div>
              <div className="flex justify-between text-base font-bold">
                <span>Net Payable</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  ₹{summaries.netAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Amount Paid</span>
                <span className="font-mono">₹{totalPaidAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-lg border-t border-border bg-zinc-50 p-3 pt-4 dark:bg-zinc-900/50">
            <div className="text-xs font-semibold text-zinc-500 uppercase">
              Balance Due
            </div>
            <div
              className={`font-mono text-lg font-extrabold ${balanceDue > 0 ? "text-red-500" : "text-green-600"}`}
            >
              ₹{balanceDue.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <Section
        title="Verify Items & Batch Details"
        className="overflow-visible p-5"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">Sr.</TableHead>
                <TableHead className="min-w-44">Product</TableHead>
                <TableHead className="w-24 text-center">Ordered</TableHead>
                <TableHead className="w-28 text-center">Received *</TableHead>
                <TableHead className="w-36">Batch No</TableHead>
                <TableHead className="w-36">Expiry Date</TableHead>
                <TableHead className="w-28">P. Rate (₹) *</TableHead>
                <TableHead className="w-28">MRP (₹) *</TableHead>
                <TableHead className="w-28">S. Rate (₹) *</TableHead>
                <TableHead className="w-20">Disc %</TableHead>
                <TableHead className="w-20">Tax %</TableHead>
                <TableHead className="w-28 text-right">Total (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-center font-medium text-zinc-500">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      {item.productName}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {item.productCode}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-550 text-center font-mono font-bold">
                    {item.orderedQty}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.receivedQty || ""}
                      onChange={(e) =>
                        handleLineChange(
                          idx,
                          "receivedQty",
                          Math.max(1, parseInt(e.target.value) || 0)
                        )
                      }
                      className="mx-auto h-9 w-20 text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="BATCH-123"
                      value={item.batchNumber}
                      onChange={(e) =>
                        handleLineChange(idx, "batchNumber", e.target.value)
                      }
                      className="h-9 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) =>
                        handleLineChange(idx, "expiryDate", e.target.value)
                      }
                      className="h-9 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.purchaseRate || ""}
                      onChange={(e) =>
                        handleLineChange(
                          idx,
                          "purchaseRate",
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      }
                      className="h-9 font-mono"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.mrp || ""}
                      onChange={(e) =>
                        handleLineChange(
                          idx,
                          "mrp",
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      }
                      className="h-9 font-mono"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.salesRate || ""}
                      onChange={(e) =>
                        handleLineChange(
                          idx,
                          "salesRate",
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      }
                      className="h-9 font-mono"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discountPercent || ""}
                      onChange={(e) =>
                        handleLineChange(
                          idx,
                          "discountPercent",
                          Math.max(
                            0,
                            Math.min(100, parseFloat(e.target.value) || 0)
                          )
                        )
                      }
                      className="h-9 text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.taxPercent || ""}
                      onChange={(e) =>
                        handleLineChange(
                          idx,
                          "taxPercent",
                          Math.max(
                            0,
                            Math.min(100, parseFloat(e.target.value) || 0)
                          )
                        )
                      }
                      className="h-9 text-center"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    ₹{item.totalAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>
    </Page>
  )
}
