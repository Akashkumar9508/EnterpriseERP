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
} from "@/components/ui/sidebar"
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
    <Sidebar variant="inset" className="dark bg-zinc-950 border-r border-white/10">
      <SidebarContent>
        <SidebarGroup>
          <div className="px-2 py-4">
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
                        className={`hover:bg-white/5 ${isActive ? 'bg-white/10 text-white' : 'text-zinc-400'}`}
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
                          className={`hover:bg-white/5 ${isActive ? 'text-white' : 'text-zinc-400'}`}
                        >
                          <div className="flex w-full items-center gap-3">
                            <item.icon className="h-5 w-5" />
                            <span className="font-medium">{item.title}</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-zinc-500" />
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="border-white/10 mr-0 pr-0 mt-1">
                          {item.items.map((subItem) => {
                            const isSubActive = location.pathname === subItem.url;
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                  className={`hover:bg-white/5 hover:text-white ${isSubActive ? 'bg-white/10 text-white' : 'text-zinc-400'}`}
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
    </Sidebar>
  );
}
