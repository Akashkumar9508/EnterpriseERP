import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import React from "react"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <main className="w-full flex-1 flex flex-col min-h-screen bg-[#0a0a0c] text-white">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-6 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <SidebarTrigger className="-ml-2 text-zinc-400 hover:text-white" />
          <div className="w-px h-4 bg-white/20 mx-2" />
          <h1 className="font-medium text-sm text-zinc-200">Interprise Workspace</h1>
        </header>
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
