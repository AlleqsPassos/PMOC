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
  ListTodo,
  Package,
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
  /**
   * Tela de despachante — escondida do técnico mesmo que ele tenha a
   * permissão. Necessário porque `view_equipment`/`view_tickets`/
   * `view_work_orders` são legitimamente dele (precisa delas para executar),
   * mas as listagens globais que essas chaves liberam são ferramenta de
   * coordenação, não de campo: o técnico chega no trabalho pelo que foi
   * atribuído a ele, nunca navegando catálogo (Fase 9).
   *
   * Só afeta navegação. As rotas seguem acessíveis — `/ordens-servico/[id]/
   * atender/[registroId]` é o fluxo de atendimento e precisa continuar
   * alcançável, e o dado dessas telas já é escopado por RLS.
   */
  dispatcherOnly?: boolean;
  /** Rota ainda não implementada (Fase 2+) — aparece esmaecida, "Em breve". */
  comingSoon?: boolean;
};

export const primaryNavItems: NavItem[] = [
  // "Início" é a home desde a Fase 8 — para o admin é a fila de trabalho,
  // para o técnico é o "meu dia" offline. O Dashboard virou consulta
  // opcional de panorama e por isso desceu para o fim da lista.
  {
    href: "/minhas-atividades",
    label: "Início",
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
    // Voltou para o menu do técnico na Fase 10 (era `dispatcherOnly` na 9): o
    // usuário descreveu o dia de atualização de cadastro, em que ele não tem OS
    // atribuída e precisa alcançar a planta inteira. A rota serve as duas
    // visões, ramificadas por público.
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
    dispatcherOnly: true,
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
    dispatcherOnly: true,
  },
  {
    href: "/pmoc",
    label: "PMOC",
    icon: FileCheck2,
    requiredPermission: "generate_pmoc",
  },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export const settingsNavItems: NavItem[] = [
  {
    href: "/configuracoes/usuarios",
    label: "Usuários",
    icon: Users,
    requiredPermission: "manage_users",
  },
  {
    href: "/configuracoes/checklist-templates",
    label: "Templates de checklist",
    icon: ListTodo,
    requiredPermission: "manage_checklist_templates",
  },
  {
    href: "/configuracoes/pecas",
    label: "Catálogo de peças",
    icon: Package,
    requiredPermission: "manage_parts_catalog",
  },
  {
    href: "/configuracoes/permissoes",
    label: "Permissões",
    icon: ShieldCheck,
    requiredPermission: "manage_permissions",
  },
  {
    href: "/auditoria",
    label: "Auditoria",
    icon: History,
    requiredPermission: "view_audit_log",
  },
];
