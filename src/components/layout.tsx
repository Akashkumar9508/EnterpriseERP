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
