import {
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
  BadgeCheck,
  Bell,
  Circle,
  Key
} from "lucide-react"
import * as Icons from "lucide-react"
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
import { Link, useLocation, useNavigate } from "react-router-dom"
import { BrandLogo } from "./ui/brand-logo"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { logout } from "@/store/slices/authSlice"

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sidebar, user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  // Helper to map string names to Lucide icons dynamically
  const getIcon = (iconName: string | undefined | null) => {
    if (!iconName) return Circle;
    
    // Capitalize the first letter just in case (e.g. 'dashboard' -> 'Dashboard', 'LayoutGrid' -> 'LayoutGrid')
    const capitalizedName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
    
    // Check if icon exists in Lucide, fallback to Circle if not found
    const IconComponent = (Icons as any)[capitalizedName] || (Icons as any)[iconName] || Circle;
    return IconComponent;
  };

  return (
    <Sidebar collapsible="icon" className="bg-zinc-50 border-r border-zinc-200 dark:bg-zinc-950 dark:border-white/10 transition-colors duration-300">
      <SidebarContent>
        <SidebarGroup>
          <div className="py-4 px-2 flex items-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
            <BrandLogo size="sm" />
          </div>
          <SidebarGroupLabel className="text-zinc-500 font-semibold tracking-widest text-[10px] uppercase mb-1">Menus</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {[...sidebar].sort((a, b) => a.sortOrder - b.sortOrder).map((item) => {
                // If the item doesn't have a specific route but has children, it's a collapsible
                const hasSubmenu = item.children && item.children.length > 0;
                // For active state, we can check if current path starts with item route (if not null) or if any child is active
                const isActive = item.route ? location.pathname.startsWith(item.route) : 
                  (hasSubmenu && item.children.some(child => child.route && location.pathname.startsWith(child.route)));
                
                const Icon = getIcon(item.icon);

                if (!hasSubmenu) {
                  return (
                    <SidebarMenuItem key={item.menuId}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive || false}
                        tooltip={item.name}
                        className={`hover:bg-black/5 dark:hover:bg-white/5 ${isActive ? 'bg-black/5 text-black font-semibold dark:bg-white/10 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}
                      >
                        <Link to={item.route || "#"} className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Submenu items
                return (
                  <Collapsible
                    key={item.menuId}
                    asChild
                    defaultOpen={isActive || false}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.name}
                          className={`hover:bg-black/5 dark:hover:bg-white/5 ${isActive ? 'text-black font-semibold dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}
                        >
                          <div className="flex w-full items-center gap-3">
                            <Icon className="h-5 w-5" />
                            <span className="font-medium">{item.name}</span>
                            <ChevronRight className={`ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 ${isActive ? 'text-black dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`} />
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="border-black/10 dark:border-white/10 mr-0 pr-0 mt-1">
                          {[...item.children].sort((a, b) => a.sortOrder - b.sortOrder).map((subItem) => {
                            const isSubActive = location.pathname === subItem.route;
                            
                            // Specific check if the menu item is "Logout" to wire up handleLogout directly
                            if (subItem.name.toLowerCase() === "logout") {
                              return (
                                <SidebarMenuSubItem key={subItem.menuId}>
                                  <SidebarMenuSubButton
                                    onClick={handleLogout}
                                    className="cursor-pointer hover:bg-black/5 hover:text-black dark:hover:bg-white/5 dark:hover:text-white text-zinc-600 dark:text-zinc-400"
                                  >
                                    <span className="font-medium">{subItem.name}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            }

                            return (
                              <SidebarMenuSubItem key={subItem.menuId}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                  className={`hover:bg-black/5 hover:text-black dark:hover:bg-white/5 dark:hover:text-white ${isSubActive ? 'bg-black/5 text-black font-semibold dark:bg-white/10 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}
                                >
                                  <Link to={subItem.route || "#"} className="flex items-center gap-2">
                                    <span className="font-medium">{subItem.name}</span>
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
                  <img src="https://github.com/shadcn.png" alt="User Profile" className="h-8 w-8 rounded-md" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-black dark:text-white">{user?.fullName || "Admin User"}</span>
                    <span className="truncate text-xs text-zinc-500">{user?.roleName || "Administrator"}</span>
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
                    <img src="https://github.com/shadcn.png" alt="User Profile" className="h-8 w-8 rounded-md" />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-black dark:text-white">{user?.fullName || "Admin User"}</span>
                      <span className="truncate text-xs text-zinc-500">{user?.email || "admin@interprise.com"}</span>
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
                  <DropdownMenuItem onClick={() => navigate("/change-password")} className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-foreground">
                    <Key className="mr-2 h-4 w-4" />
                    Change Password
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-foreground">
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
