import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PermissionCatalogItem = {
  id: string;
  key: string;
  label: string;
  category: string;
};

/** Catálogo global de permissões — mesma tabela consultada por has_permission() no banco. */
export async function listPermissionsCatalog(): Promise<PermissionCatalogItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permissions")
    .select("id, key, label, category")
    .order("category")
    .order("label");

  if (error) {
    console.error("[listPermissionsCatalog]", error.message);
    return [];
  }

  return data ?? [];
}

export type RoleOption = { id: string; key: string; label: string };

export async function listRoles(): Promise<RoleOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").select("id, key, label").order("label");

  if (error) {
    console.error("[listRoles]", error.message);
    return [];
  }

  return data ?? [];
}

/** roleId -> Set de permission keys concedidas por padrão (role_permissions) — visão read-only do catálogo. */
export async function getRolePermissionKeysByRole(): Promise<Record<string, Set<string>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_permissions")
    .select("role_id, permissions(key)");

  if (error) {
    console.error("[getRolePermissionKeysByRole]", error.message);
    return {};
  }

  const map: Record<string, Set<string>> = {};
  for (const row of data ?? []) {
    const key = Array.isArray(row.permissions) ? row.permissions[0]?.key : row.permissions?.key;
    if (!key) continue;
    (map[row.role_id] ??= new Set()).add(key);
  }
  return map;
}

/** permission key -> granted, só para os overrides explícitos do usuário-alvo (linhas ausentes = "default"). */
export async function getUserPermissionOverrides(userId: string): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_permissions")
    .select("granted, permissions(key)")
    .eq("user_id", userId);

  if (error) {
    console.error("[getUserPermissionOverrides]", error.message);
    return {};
  }

  const overrides: Record<string, boolean> = {};
  for (const row of data ?? []) {
    const key = Array.isArray(row.permissions) ? row.permissions[0]?.key : row.permissions?.key;
    if (key) overrides[key] = row.granted;
  }
  return overrides;
}
