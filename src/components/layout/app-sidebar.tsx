"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  primaryNavItems,
  settingsNavItems,
  type NavItem,
} from "@/components/layout/nav-items";
import { isDispatcherFromKeys } from "@/lib/auth/is-dispatcher";

function visibleItems(
  items: NavItem[],
  permissionKeys: Set<string>,
  isDispatcher: boolean,
) {
  return items.filter((item) => {
    if (item.dispatcherOnly && !isDispatcher) return false;
    return !item.requiredPermission || permissionKeys.has(item.requiredPermission);
  });
}

function NavList({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <SidebarMenuItem key={item.href}>
            {item.comingSoon ? (
              <SidebarMenuButton
                disabled
                className="cursor-not-allowed opacity-50"
              >
                <item.icon />
                <span>{item.label}</span>
                <Badge
                  variant="outline"
                  className="text-sidebar-foreground/60 border-sidebar-border ml-auto text-[10px] font-normal"
                >
                  Em breve
                </Badge>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton asChild isActive={isActive}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar({ permissionKeys }: { permissionKeys: string[] }) {
  const pathname = usePathname();

  const keys = new Set(permissionKeys);
  const isDispatcher = isDispatcherFromKeys(keys);

  const primaryVisible = visibleItems(primaryNavItems, keys, isDispatcher);
  const settingsVisible = visibleItems(settingsNavItems, keys, isDispatcher);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/minhas-atividades"
          className="flex items-center gap-2 px-2 py-1.5"
        >
          <span className="text-sidebar-primary-foreground text-lg font-semibold tracking-tight">
            PMOC+
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {primaryVisible.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Operação</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavList items={primaryVisible} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {settingsVisible.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavList items={settingsVisible} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
