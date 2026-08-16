import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Wrench,
  Headset,
  CalendarClock,
  ClipboardList,
  FileCheck2,
  ListChecks,
  Users,
  ShieldCheck,
  History,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Se ausente, o item aparece para qualquer usuário autenticado. */
  requiredPermission?: string;
  /** Rota ainda não implementada (Fase 2+) — aparece esmaecida, "Em breve". */
  comingSoon?: boolean;
};

export const primaryNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/minhas-atividades",
    label: "Minhas atividades",
    icon: ListChecks,
    requiredPermission: "view_tickets",
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: Building2,
    requiredPermission: "view_clients",
  },
  {
    href: "/unidades",
    label: "Unidades",
    icon: MapPin,
    requiredPermission: "view_units",
  },
  {
    href: "/equipamentos",
    label: "Equipamentos",
    icon: Wrench,
    requiredPermission: "view_equipment",
  },
  {
    href: "/chamados",
    label: "Chamados",
    icon: Headset,
    requiredPermission: "view_tickets",
  },
  {
    href: "/preventivas",
    label: "Preventivas",
    icon: CalendarClock,
    requiredPermission: "manage_preventive_plans",
  },
  {
    href: "/ordens-servico",
    label: "Ordens de serviço",
    icon: ClipboardList,
    requiredPermission: "view_work_orders",
  },
  {
    href: "/pmoc",
    label: "PMOC",
    icon: FileCheck2,
    requiredPermission: "generate_pmoc",
    comingSoon: true,
  },
];

export const settingsNavItems: NavItem[] = [
  {
    href: "/configuracoes/usuarios",
    label: "Usuários",
    icon: Users,
    requiredPermission: "manage_users",
  },
  {
    href: "/configuracoes/permissoes",
    label: "Permissões",
    icon: ShieldCheck,
    requiredPermission: "manage_permissions",
    comingSoon: true,
  },
  {
    href: "/auditoria",
    label: "Auditoria",
    icon: History,
    requiredPermission: "view_audit_log",
    comingSoon: true,
  },
];
