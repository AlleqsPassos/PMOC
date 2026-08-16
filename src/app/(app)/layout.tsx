import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/session";
import { getUserPermissionKeys } from "@/lib/auth/permissions";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { SyncStatusBadge } from "@/components/layout/sync-status-badge";
import { InstallAppButton } from "@/components/layout/install-app-button";

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  RESPONSAVEL_TECNICO: "Responsável Técnico",
};

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const permissionKeys = Array.from(await getUserPermissionKeys());

  return (
    <SidebarProvider>
      <AppSidebar permissionKeys={permissionKeys} />
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex-1" />
          <InstallAppButton />
          <SyncStatusBadge />
          <UserMenu
            fullName={user.fullName}
            email={user.email}
            roleLabel={ROLE_LABELS[user.roleKey] ?? user.roleKey}
          />
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
