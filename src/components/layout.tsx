import React, { useState } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { logout, setLicenseExpired } from "@/store/slices/authSlice"
import axiosClient from "@/Services/axiosClient"
import { toast } from "sonner"
import { ShieldAlert, Mail, Phone, Building, Key, Loader2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Layout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const isLicenseExpired = useAppSelector((state) => state.auth.isLicenseExpired)
  const licenseDetails = useAppSelector((state) => state.auth.licenseDetails)
  
  const [licenseKey, setLicenseKey] = useState("")
  const [isActivating, setIsActivating] = useState(false)
  const [showInput, setShowInput] = useState(false)

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseKey.trim()) {
      toast.error("Please enter a license key.")
      return
    }

    setIsActivating(true)
    try {
      const response: any = await axiosClient.post("/License/activate", {
        licenseKey: licenseKey.trim()
      })
      if (response && response.success) {
        toast.success(response.message || "License successfully activated!")
        // Update state to unlock the system
        dispatch(setLicenseExpired({ isExpired: false, details: response.data }))
        setLicenseKey("")
        setShowInput(false)
      } else {
        toast.error(response?.message || "Activation failed.")
      }
    } catch (error: any) {
      console.error("Activation error:", error)
      toast.error(error?.message || "Invalid license key or communication failure.")
    } finally {
      setIsActivating(false)
    }
  }

  const handleLogout = () => {
    dispatch(logout())
  }

  if (isLicenseExpired) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-lg p-4 select-none">
        <div className="max-w-md w-full border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 transform scale-100 flex flex-col justify-between">
          
          {/* Header Warning Bar */}
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center animate-pulse">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">License Expired</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Action Required</p>
            </div>
          </div>

          <div className="p-6 space-y-5 flex-1">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              Your Apex ERP license has expired or is invalid. Please contact Codestrix Tech to renew your license and continue using the software.
            </p>

            {/* Support Details Box */}
            <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800/80 space-y-3">
              <span className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Support Contact</span>
              
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-sm">
                  <Building className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Codestrix Tech</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-zinc-400 shrink-0" />
                  <a href="mailto:support@codestrix.com" className="text-primary hover:underline font-medium">
                    support@codestrix.com
                  </a>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">+91 XXXXX XXXXX</span>
                </div>
              </div>
            </div>

            {/* Expired License Metadata */}
            {licenseDetails && (
              <div className="text-[11px] text-zinc-400 space-y-1 bg-zinc-50/50 dark:bg-zinc-850/10 p-2.5 rounded border border-dashed border-zinc-200 dark:border-zinc-800">
                <div><span className="font-semibold">Current Key:</span> <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">{licenseDetails.licenseKey}</code></div>
                <div><span className="font-semibold">Package:</span> {licenseDetails.packageType}</div>
                <div><span className="font-semibold">Expired On:</span> {new Date(licenseDetails.validTo).toLocaleDateString()}</div>
              </div>
            )}

            {/* Activation Section */}
            {showInput ? (
              <form onSubmit={handleActivate} className="space-y-3 pt-2">
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter License Key (e.g. APEX-GOLD-2026-123456)"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    disabled={isActivating}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isActivating}
                    className="flex-1 py-2 font-medium"
                  >
                    {isActivating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Activating...
                      </>
                    ) : (
                      "Activate License"
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInput(false)}
                    disabled={isActivating}
                    className="px-4 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setShowInput(true)}
                  className="flex-1 py-2.5 font-medium shadow-md shadow-primary/10 hover:shadow-lg transition-all"
                >
                  Renew License
                </Button>
                
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="px-4 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-1.5"
                >
                  <LogOut className="h-4 w-4" />
                  Exit
                </Button>
              </div>
            )}
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/40 px-6 py-3 border-t border-zinc-100 dark:border-zinc-800/80 text-center text-[10px] text-zinc-400">
            © 2026 Apex ERP · System Blocked
          </div>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <main className="w-full flex-1 flex flex-col min-h-screen bg-background text-foreground min-w-0">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
            <div className="w-px h-4 bg-border mx-2" />
            <h1 className="font-medium text-sm text-foreground">Enterprise Workspace</h1>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex-1 p-6 min-w-0">
          {children}
        </div>
        <footer className="py-6 px-6 border-t border-border/60 bg-muted/10 text-center text-xs text-muted-foreground space-y-1 shrink-0">
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">© 2026 Apex ERP</p>
          <p className="font-medium text-zinc-500 dark:text-zinc-400">Powered by Codestrix Tech</p>
          <p className="text-zinc-400 dark:text-zinc-500 text-[11px]">Version 1.0.0</p>
        </footer>
      </main>
    </SidebarProvider>
  )
}
