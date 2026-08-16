import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CompanyUser = {
  id: string;
  fullName: string;
  email: string;
  roleKey: string;
  status: "active" | "inactive";
};

export async function listCompanyUsers(): Promise<CompanyUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, status, role:roles(key)")
    .order("full_name");

  if (error) {
    console.error("[listCompanyUsers]", error.message);
    return [];
  }

  return (data ?? []).map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    status: u.status,
    roleKey: Array.isArray(u.role) ? (u.role[0]?.key ?? "") : (u.role?.key ?? ""),
  }));
}
