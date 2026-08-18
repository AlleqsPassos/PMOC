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
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { UserMenu } from "@/components/layout/user-menu";
import { isDispatcherFromKeys } from "@/lib/auth/is-dispatcher";
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
  // O técnico navega pela barra inferior no celular; o menu lateral continua
  // existindo para ele no desktop, mas o botão de abrir a gaveta seria um
  // segundo caminho para as mesmas três telas.
  const showMobileTabBar = !isDispatcherFromKeys(permissionKeys);

  return (
    <SidebarProvider>
      <AppSidebar permissionKeys={permissionKeys} />
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger className={showMobileTabBar ? "hidden md:flex" : undefined} />
          <Separator
            orientation="vertical"
            className={showMobileTabBar ? "hidden h-5 md:block" : "h-5"}
          />
          <div className="flex-1" />
          <InstallAppButton />
          <SyncStatusBadge />
          <UserMenu
            fullName={user.fullName}
            email={user.email}
            roleLabel={ROLE_LABELS[user.roleKey] ?? user.roleKey}
          />
        </header>
        <main
          className={
            showMobileTabBar
              ? "min-w-0 flex-1 p-4 pb-24 sm:p-6 md:pb-6"
              : "min-w-0 flex-1 p-4 sm:p-6"
          }
        >
          {children}
        </main>
      </SidebarInset>
      {showMobileTabBar && <MobileTabBar permissionKeys={permissionKeys} />}
    </SidebarProvider>
  );
}
