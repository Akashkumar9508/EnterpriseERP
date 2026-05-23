import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import React from "react"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <main className="w-full flex-1 flex flex-col min-h-screen bg-background text-foreground min-w-0">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
            <div className="w-px h-4 bg-border mx-2" />
            <h1 className="font-medium text-sm text-foreground">Interprise Workspace</h1>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex-1 p-6 min-w-0">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
