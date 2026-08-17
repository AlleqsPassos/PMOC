/**
 * "Despachante" = quem distribui trabalho (admin/coordenação), em oposição ao
 * técnico que executa. Não é um papel no banco: é derivado das permissões de
 * atribuição, que só o ADMINISTRADOR recebe por default.
 *
 * Existe como helper único porque a distinção decide **duas** coisas que
 * precisam concordar entre si — qual visão a home renderiza
 * (`minhas-atividades/page.tsx`) e quais itens aparecem no menu
 * (`app-sidebar.tsx`). Duas cópias da expressão sairiam de sincronia na
 * primeira permissão nova.
 */
export const DISPATCHER_PERMISSIONS = [
  "assign_tickets",
  "manage_work_orders",
] as const;

export function isDispatcherFromKeys(
  permissionKeys: Iterable<string>,
): boolean {
  const keys = permissionKeys instanceof Set ? permissionKeys : new Set(permissionKeys);
  return DISPATCHER_PERMISSIONS.some((p) => keys.has(p));
}
