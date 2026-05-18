import {
  Home,
  Settings,
  Users,
  Briefcase,
  FileText,
  ChevronRight,
  PieChart,
  FolderKanban,
  UserPlus,
  UserCheck,
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Link, useLocation } from "react-router-dom"
import { BrandLogo } from "./ui/brand-logo"

// Menu items with submenus
const items = [
  {
    title: "Dashboard",
    url: "/home",
    icon: Home,
  },
  {
    title: "Employees",
    url: "/employees",
    icon: Users,
    items: [
      { title: "Directory", url: "/employees/directory", icon: UserCheck },
      { title: "Onboarding", url: "/employees/onboarding", icon: UserPlus },
    ],
  },
  {
    title: "Projects",
    url: "/projects",
    icon: Briefcase,
    items: [
      { title: "Active Projects", url: "/projects/active", icon: FolderKanban },
      { title: "Archived", url: "/projects/archived", icon: FolderKanban },
    ],
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
    items: [
      { title: "Analytics", url: "/reports/analytics", icon: PieChart },
      { title: "Financials", url: "/reports/financials", icon: PieChart },
    ],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="bg-zinc-50 border-r border-zinc-200 dark:bg-zinc-950 dark:border-white/10 transition-colors duration-300">
      <SidebarContent>
        <SidebarGroup>
          <div className="py-4 px-2 flex items-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
            <BrandLogo size="sm" />
          </div>
          <SidebarGroupLabel className="text-zinc-500 font-semibold tracking-widest text-[10px] uppercase mb-1">Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const isActive = location.pathname.startsWith(item.url);
                const hasSubmenu = item.items && item.items.length > 0;

                if (!hasSubmenu) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={`hover:bg-black/5 dark:hover:bg-white/5 ${isActive ? 'bg-black/5 text-black font-semibold dark:bg-white/10 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}
                      >
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Submenu items
                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          className={`hover:bg-black/5 dark:hover:bg-white/5 ${isActive ? 'text-black font-semibold dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}
                        >
                          <div className="flex w-full items-center gap-3">
                            <item.icon className="h-5 w-5" />
                            <span className="font-medium">{item.title}</span>
                            <ChevronRight className={`ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 ${isActive ? 'text-black dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`} />
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="border-black/10 dark:border-white/10 mr-0 pr-0 mt-1">
                          {item.items.map((subItem) => {
                            const isSubActive = location.pathname === subItem.url;
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                  className={`hover:bg-black/5 hover:text-black dark:hover:bg-white/5 dark:hover:text-white ${isSubActive ? 'bg-black/5 text-black font-semibold dark:bg-white/10 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}
                                >
                                  <Link to={subItem.url} className="flex items-center gap-2">
                                    <span className="font-medium">{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-black/5 dark:data-[state=open]:bg-white/5 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <img src="https://github.com/shadcn.png" alt="shadcn" className="h-8 w-8 rounded-md" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-black dark:text-white">Admin User</span>
                    <span className="truncate text-xs text-zinc-500">admin@interprise.com</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-zinc-500" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
                side="right"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <img src="https://github.com/shadcn.png" alt="shadcn" className="h-8 w-8 rounded-md" />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-black dark:text-white">Admin User</span>
                      <span className="truncate text-xs text-zinc-500">admin@interprise.com</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-foreground">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Upgrade to Pro
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-foreground">
                    <BadgeCheck className="mr-2 h-4 w-4" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-foreground">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-foreground">
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-foreground">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
