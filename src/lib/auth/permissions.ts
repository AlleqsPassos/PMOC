import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Checagem server-side de permissão efetiva, via a função has_permission()
 * do banco (mesma função consultada pelas policies de RLS — única fonte de
 * verdade, sem duplicar a lógica de precedência role/override no app).
 *
 * Uso: nav/UI consulta isto só para exibir/esconder itens (UX). A
 * autorização real de cada mutação é sempre reverificada dentro da própria
 * Server Action antes de qualquer escrita — nunca confiar só nesta checagem.
 */
export async function hasPermission(permissionKey: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_permission", {
    p_user_id: user.id,
    p_permission_key: permissionKey,
  });

  if (error) {
    console.error(`[hasPermission] falha ao checar '${permissionKey}':`, error.message);
    return false;
  }

  return data ?? false;
}

/**
 * Lança se a permissão não estiver presente — usar no início de uma Server
 * Action logo após requireUser(), antes de qualquer mutação.
 */
export async function assertPermission(permissionKey: string): Promise<void> {
  const allowed = await hasPermission(permissionKey);
  if (!allowed) {
    throw new Error(`Permissão negada: ${permissionKey}`);
  }
}

type PermissionJoinRow = {
  granted?: boolean;
  permissions: { key: string } | { key: string }[] | null;
};

function extractKey(permissions: PermissionJoinRow["permissions"]): string | null {
  if (!permissions) return null;
  return Array.isArray(permissions) ? (permissions[0]?.key ?? null) : permissions.key;
}

/**
 * Conjunto de permissões efetivas do usuário atual, calculado em duas
 * queries (default do papel + overrides) em vez de N chamadas a
 * has_permission() — usado para decidir quais itens de navegação mostrar.
 * Reproduz a mesma precedência de has_permission() (override > papel > deny).
 */
export async function getUserPermissionKeys(): Promise<Set<string>> {
  const user = await getCurrentUser();
  if (!user) return new Set();

  const supabase = await createClient();

  const [{ data: roleDefaults }, { data: overrides }] = await Promise.all([
    supabase
      .from("role_permissions")
      .select("permissions(key)")
      .eq("role_id", user.roleId),
    supabase
      .from("user_permissions")
      .select("granted, permissions(key)")
      .eq("user_id", user.id),
  ]);

  const keys = new Set<string>();

  for (const row of (roleDefaults ?? []) as PermissionJoinRow[]) {
    const key = extractKey(row.permissions);
    if (key) keys.add(key);
  }

  for (const row of (overrides ?? []) as PermissionJoinRow[]) {
    const key = extractKey(row.permissions);
    if (!key) continue;
    if (row.granted) keys.add(key);
    else keys.delete(key);
  }

  return keys;
}
